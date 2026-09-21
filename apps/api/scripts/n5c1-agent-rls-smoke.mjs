// N5/C1 agent-identity persistence smoke: real PostgreSQL proof for tenant
// isolation, branch integrity, bounded authority, closed capability set,
// secret-free descriptors and an append-only event trail.
// Requires DATABASE_URL (CI postgres service or local PG); skips otherwise.
import { readFileSync } from "node:fs";
import pkg from "pg";

const { Client } = pkg;
const url = process.env.DATABASE_URL;
if (!url) {
  console.log("SKIP: no DATABASE_URL");
  process.exit(0);
}

const migrations = new URL("../../../db/migrations/", import.meta.url);
const client = new Client({ connectionString: url });
await client.connect();

for (const file of [
  "002_authz_primitives.sql",
  "006_provider_graph.sql",
  "038_workforce_graph.sql",
  "042_agent_identities.sql",
]) {
  await client.query(readFileSync(new URL(file, migrations), "utf8"));
}

for (const table of ["agent_identity_events", "agent_identities"]) {
  await client.query(`DELETE FROM ${table}`);
}

await client.query(`INSERT INTO tenants(id,name) VALUES ('t1','Clinic One'),('t2','Clinic Two') ON CONFLICT DO NOTHING`);
await client.query(
  `INSERT INTO organizations(id,tenant_id) VALUES ('org-1','t1'),('org-2','t2') ON CONFLICT DO NOTHING`,
);
await client.query(
  `INSERT INTO branch_locations(id,tenant_id,organization_id)
   VALUES ('b1','t1','org-1'),('b1-alt','t1','org-1'),('b2','t2','org-2') ON CONFLICT DO NOTHING`,
);

function fail(message) {
  throw new Error(message);
}

async function expectDbError(run, sqlstate, label) {
  try {
    await run();
  } catch (error) {
    if (error.code === sqlstate) return;
    fail(`${label}: expected SQLSTATE ${sqlstate}, got ${error.code}: ${error.message}`);
  }
  fail(`${label}: expected SQLSTATE ${sqlstate}, but the statement succeeded`);
}

const AGENT_INSERT = (id, options = {}) => {
  const {
    tenant = "t1",
    branch = "'b1'",
    status = "active",
    effectiveFrom = "now()",
    expiresAt = "now() + interval '30 days'",
    credentialRef = "secret://synthetic/agents/agent-1",
    revokedAt = "NULL",
    revocationReason = "NULL",
    idempotencyKey = "NULL",
  } = options;
  return `INSERT INTO agent_identities(
     id,tenant_id,branch_id,display_name,kind,status,human_sponsor_account_id,
     effective_from,expires_at,credential_ref,revoked_at,revocation_reason,
     idempotency_key,source_ref,source_revision)
   VALUES ('${id}','${tenant}',${branch},'Clinic Ops Assistant','clinic_ops_assistant','${status}',
     'account-sponsor',${effectiveFrom},${expiresAt},'${credentialRef}',
     ${revokedAt},${revocationReason},${idempotencyKey},'n5c1-smoke','n5c1-smoke')`;
};

await client.query(`SET app.current_tenant='t1'`);

await client.query(AGENT_INSERT("agent-1", { idempotencyKey: "'idem-1'" }));

await expectDbError(
  () => client.query(AGENT_INSERT("agent-cross-branch", { branch: "'b2'" })),
  "23503",
  "cross-tenant branch reference must be refused",
);

await expectDbError(
  () => client.query(
    AGENT_INSERT("agent-long-ttl", {
      effectiveFrom: "now()",
      expiresAt: "now() + interval '91 days'",
    }),
  ),
  "23514",
  "agent lifetime beyond the maximum bounded TTL must be refused",
);

await expectDbError(
  () => client.query(
    AGENT_INSERT("agent-inverted", {
      effectiveFrom: "now()",
      expiresAt: "now() - interval '1 day'",
    }),
  ),
  "23514",
  "an inverted authority window must be refused",
);

await expectDbError(
  () => client.query(AGENT_INSERT("agent-raw-token", { credentialRef: "EAAGrawAccessToken" })),
  "23514",
  "a raw credential value must not satisfy the credential reference shape",
);

await expectDbError(
  () => client.query(AGENT_INSERT("agent-silent-revoke", { status: "revoked" })),
  "23514",
  "revocation must carry a timestamp and a reason",
);

await expectDbError(
  () => client.query(AGENT_INSERT("agent-dup-idem", { idempotencyKey: "'idem-1'" })),
  "23505",
  "duplicate agent idempotency key must be refused",
);

await expectDbError(
  () => client.query(
    `INSERT INTO agent_identity_events(
       id,tenant_id,agent_id,action,capability,actor_account_id,actor_kind,reason)
     VALUES ('event-clinical','t1','agent-1','capability_granted','clinical.sign','account-sponsor','human','x')`,
  ),
  "23514",
  "a clinical capability must be impossible to persist",
);

await expectDbError(
  () => client.query(
    `INSERT INTO agent_identity_events(
       id,tenant_id,agent_id,action,capability,actor_account_id,actor_kind,reason)
     VALUES ('event-orphan-cap','t1','agent-1','capability_granted',NULL,'account-sponsor','human','x')`,
  ),
  "23514",
  "a capability action must name a capability",
);

await client.query(
  `INSERT INTO agent_identity_events(
     id,tenant_id,agent_id,action,capability,actor_account_id,actor_kind,reason)
   VALUES ('event-1','t1','agent-1','capability_granted','workforce.tasks.raise',
     'account-sponsor','human','ops pilot')`,
);

await client.query(`SET ROLE zyara_app`);
await client.query(`SET app.current_tenant='t1'`);

// The application role may append authority events (this is the audited
// capability-grant path), but the closed capability set still applies to it.
await client.query(
  `INSERT INTO agent_identity_events(
     id,tenant_id,agent_id,action,capability,actor_account_id,actor_kind,reason)
   VALUES ('event-2','t1','agent-1','capability_granted','reporting.read',
     'account-sponsor','human','pilot')`,
);

await expectDbError(
  () => client.query(
    `INSERT INTO agent_identity_events(
       id,tenant_id,agent_id,action,capability,actor_account_id,actor_kind,reason)
     VALUES ('event-3','t1','agent-1','capability_granted','payment.capture',
       'account-sponsor','human','pilot')`,
  ),
  "23514",
  "the application role must not be able to persist a financial capability",
);

await expectDbError(
  () => client.query(`UPDATE agent_identity_events SET reason='rewritten' WHERE id='event-1'`),
  "42501",
  "the agent event trail must stay append-only (no UPDATE grant)",
);
await expectDbError(
  () => client.query(`DELETE FROM agent_identity_events WHERE id='event-1'`),
  "42501",
  "the agent event trail must stay append-only (no DELETE grant)",
);

await client.query(`UPDATE agent_identities SET status='suspended' WHERE id='agent-1'`);

await expectDbError(
  () => client.query(AGENT_INSERT("agent-cross-tenant", { tenant: "t2", branch: "'b2'" })),
  "42501",
  "cross-tenant agent insert must be refused by the RLS WITH CHECK",
);

const own = await client.query(`SELECT count(*)::int AS n FROM agent_identities`);
if (own.rows[0].n !== 1) fail(`expected one t1 agent identity, got ${own.rows[0].n}`);

await client.query(`SET app.current_tenant='t2'`);
const foreignIdentities = await client.query(`SELECT count(*)::int AS n FROM agent_identities`);
const foreignEvents = await client.query(`SELECT count(*)::int AS n FROM agent_identity_events`);
if (foreignIdentities.rows[0].n !== 0 || foreignEvents.rows[0].n !== 0) {
  fail("tenant read isolation failed for agent identity state");
}

await client.query(`RESET ROLE`);
const secretColumns = await client.query(
  `SELECT column_name FROM information_schema.columns
   WHERE table_name IN ('agent_identities','agent_identity_events')
     AND column_name IN ('app_secret','verify_token','access_token','password','private_key','api_key')`,
);
if (secretColumns.rows.length !== 0) {
  fail(`secret-bearing columns unexpectedly persisted: ${JSON.stringify(secretColumns.rows)}`);
}

const grants = await client.query(
  `SELECT privilege_type FROM information_schema.role_table_grants
   WHERE grantee='zyara_app' AND table_name='agent_identity_events'
   ORDER BY privilege_type`,
);
const privileges = grants.rows.map((row) => row.privilege_type).sort();
if (JSON.stringify(privileges) !== JSON.stringify(["INSERT", "SELECT"])) {
  fail(`agent event trail must be SELECT/INSERT only, got ${JSON.stringify(privileges)}`);
}

console.log(
  "N5/C1 agent identity DB smoke PASS: RLS, branch integrity, bounded authority, closed capability set, secret-free descriptors and append-only trail verified",
);
await client.end();
