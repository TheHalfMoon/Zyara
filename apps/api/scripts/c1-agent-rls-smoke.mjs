// C1 agent identity database smoke.
// Proves tenant/branch isolation, capability constraints, grant scope and
// append-only authority events using the non-superuser zyara_app role.
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

for (const table of ["agent_authority_events", "agent_grants", "agent_identities"]) {
  await client.query(`DELETE FROM ${table}`);
}

await client.query(
  `INSERT INTO tenants(id,name) VALUES ('t1','Clinic One'),('t2','Clinic Two') ON CONFLICT DO NOTHING`,
);
await client.query(
  `INSERT INTO accounts(id,display_name)
   VALUES ('admin-1','Admin One'),('admin-2','Admin Two') ON CONFLICT DO NOTHING`,
);
await client.query(
  `INSERT INTO organizations(id,tenant_id)
   VALUES ('org-1','t1'),('org-2','t2') ON CONFLICT DO NOTHING`,
);
await client.query(
  `INSERT INTO branch_locations(id,tenant_id,organization_id)
   VALUES ('b1','t1','org-1'),('b1-alt','t1','org-1'),('b2','t2','org-2')
   ON CONFLICT DO NOTHING`,
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
  fail(`${label}: expected SQLSTATE ${sqlstate}, but statement succeeded`);
}

await client.query(`SET ROLE zyara_app`);
await client.query(`SET app.current_tenant='t1'`);

await client.query(
  `INSERT INTO agent_identities(
     id,tenant_id,branch_id,kind,display_name,purpose,status,
     created_by_account_id,source_ref,source_revision)
   VALUES ('agt_frontdesk01','t1','b1','workflow_agent','Front Desk Automation',
     'Bounded administrative work','draft','admin-1','c1-smoke','c1-smoke')`,
);

await expectDbError(
  () => client.query(
    `INSERT INTO agent_identities(
       id,tenant_id,branch_id,kind,display_name,purpose,status,
       created_by_account_id,source_ref,source_revision)
     VALUES ('agt_foreign001','t2','b2','workflow_agent','Foreign Agent',
       'Should fail','draft','admin-2','c1-smoke','c1-smoke')`,
  ),
  "42501",
  "cross-tenant identity insert must be rejected by RLS",
);

await expectDbError(
  () => client.query(
    `INSERT INTO agent_identities(
       id,tenant_id,branch_id,kind,display_name,purpose,status,
       created_by_account_id,source_ref,source_revision)
     VALUES ('human-looking-id','t1','b1','workflow_agent','Bad Identity',
       'Should fail','draft','admin-1','c1-smoke','c1-smoke')`,
  ),
  "23514",
  "agent identity must use dedicated namespace",
);

await expectDbError(
  () => client.query(
    `INSERT INTO agent_identities(
       id,tenant_id,branch_id,kind,display_name,purpose,status,
       created_by_account_id,source_ref,source_revision)
     VALUES ('agt_activebad01','t1','b1','workflow_agent','Active Too Early',
       'Should fail','active','admin-1','c1-smoke','c1-smoke')`,
  ),
  "23514",
  "new agent identity must start as draft",
);

await client.query(
  `INSERT INTO agent_grants(
     id,tenant_id,agent_id,branch_id,capability,requires_human_approval,
     effective_from,granted_by_account_id,reason_code)
   VALUES ('grant-read','t1','agt_frontdesk01','b1','ops.tasks.read',false,
     '2026-09-21T00:00:00Z','admin-1','read_scope')`,
);

await expectDbError(
  () => client.query(
    `INSERT INTO agent_grants(
       id,tenant_id,agent_id,branch_id,capability,requires_human_approval,
       effective_from,granted_by_account_id,reason_code)
     VALUES ('grant-cross-branch','t1','agt_frontdesk01','b1-alt','ops.tasks.read',false,
       '2026-09-21T00:00:00Z','admin-1','invalid_scope')`,
  ),
  "23514",
  "branch-scoped identity grant cannot escape its branch",
);

await expectDbError(
  () => client.query(
    `INSERT INTO agent_grants(
       id,tenant_id,agent_id,branch_id,capability,requires_human_approval,
       effective_from,granted_by_account_id,reason_code)
     VALUES ('grant-no-approval','t1','agt_frontdesk01','b1','ops.tasks.create',false,
       '2026-09-21T00:00:00Z','admin-1','unsafe')`,
  ),
  "23514",
  "mutating grant must require human approval",
);

await expectDbError(
  () => client.query(
    `INSERT INTO agent_grants(
       id,tenant_id,agent_id,branch_id,capability,requires_human_approval,
       effective_from,granted_by_account_id,reason_code)
     VALUES ('grant-shell','t1','agt_frontdesk01','b1','shell.exec',true,
       '2026-09-21T00:00:00Z','admin-1','unsafe')`,
  ),
  "23514",
  "generic shell capability must not exist",
);


await expectDbError(
  () => client.query(
    `UPDATE agent_grants SET capability='ops.tasks.create' WHERE id='grant-read'`,
  ),
  "42501",
  "grant capability must be immutable for the application role",
);

await client.query(
  `INSERT INTO agent_authority_events(
     id,tenant_id,agent_id,action,actor_account_id,grant_id,reason_code)
   VALUES ('event-1','t1','agt_frontdesk01','identity_created','admin-1',NULL,'admin_created')`,
);

await expectDbError(
  () => client.query(
    `UPDATE agent_authority_events SET reason_code='rewritten' WHERE id='event-1'`,
  ),
  "42501",
  "authority events must be append-only",
);
await expectDbError(
  () => client.query(`DELETE FROM agent_authority_events WHERE id='event-1'`),
  "42501",
  "authority events must not be deleted by application role",
);

await client.query(
  `UPDATE agent_identities SET status='active', updated_at=now()
   WHERE id='agt_frontdesk01'`,
);
await expectDbError(
  () => client.query(
    `UPDATE agent_identities SET status='draft', updated_at=now()
     WHERE id='agt_frontdesk01'`,
  ),
  "23514",
  "agent lifecycle must not move active back to draft",
);
await client.query(
  `UPDATE agent_identities SET status='revoked', updated_at=now()
   WHERE id='agt_frontdesk01'`,
);
await expectDbError(
  () => client.query(
    `INSERT INTO agent_grants(
       id,tenant_id,agent_id,branch_id,capability,requires_human_approval,
       effective_from,granted_by_account_id,reason_code)
     VALUES ('grant-after-revoke','t1','agt_frontdesk01','b1','ops.tasks.read',false,
       '2026-09-21T00:00:00Z','admin-1','invalid_after_revoke')`,
  ),
  "23514",
  "revoked agent must not receive a new grant",
);

const own = await client.query(`SELECT count(*)::int AS n FROM agent_identities`);
if (own.rows[0].n !== 1) fail(`expected one t1 agent, got ${own.rows[0].n}`);

await client.query(`SET app.current_tenant='t2'`);
const foreignIdentities = await client.query(`SELECT count(*)::int AS n FROM agent_identities`);
const foreignGrants = await client.query(`SELECT count(*)::int AS n FROM agent_grants`);
if (foreignIdentities.rows[0].n !== 0 || foreignGrants.rows[0].n !== 0) {
  fail("tenant read isolation failed for agent authority tables");
}

await client.query(`RESET ROLE`);
const secretColumns = await client.query(
  `SELECT column_name
   FROM information_schema.columns
   WHERE table_name IN ('agent_identities','agent_grants')
     AND column_name IN (
       'api_token','access_token','private_key','secret','credential','password'
     )`,
);
if (secretColumns.rows.length !== 0) {
  fail(`secret-bearing agent columns unexpectedly persisted: ${JSON.stringify(secretColumns.rows)}`);
}

console.log("C1 agent authority DB smoke PASS: isolation, scoped grants, approval floor and append-only audit verified");
await client.end();
