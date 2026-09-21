// N5/C2 derived-activity persistence smoke: real PostgreSQL proof for tenant
// isolation, branch integrity, the closed registries, the identifier-refusing
// reference shape, secret-free metadata, payload minimisation, deterministic
// deduplication and an append-only activity trail.
//
// The smoke owns only the C2 table: it drops and recreates `activity_events` from
// db/migrations/043 so the run is repeatable. It never touches W1-W4 or C1 state.
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
await client.query("DROP TABLE IF EXISTS activity_events");
await client.query(readFileSync(new URL("043_activity_events.sql", migrations), "utf8"));

await client.query(
  `INSERT INTO tenants(id,name) VALUES ('t1','Clinic One'),('t2','Clinic Two') ON CONFLICT DO NOTHING`,
);
await client.query(
  `INSERT INTO organizations(id,tenant_id) VALUES ('org-1','t1'),('org-2','t2') ON CONFLICT DO NOTHING`,
);
await client.query(
  `INSERT INTO branch_locations(id,tenant_id,organization_id)
   VALUES ('b1','t1','org-1'),('b1-alt','t1','org-1'),('b2','t2','org-2') ON CONFLICT DO NOTHING`,
);
await client.query(`DELETE FROM activity_events`);
// The smoke owns only its own synthetic agent row; C1 state is otherwise untouched.
await client.query(`DELETE FROM agent_identity_events WHERE agent_id = 'c2-agent-1'`);
await client.query(`DELETE FROM agent_identities WHERE id = 'c2-agent-1'`);

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

const AGENT_INSERT = (id, tenant = "t1", branch = "'b1'") =>
  `INSERT INTO agent_identities(
     id,tenant_id,branch_id,display_name,kind,status,human_sponsor_account_id,
     effective_from,expires_at,credential_ref,source_ref,source_revision)
   VALUES ('${id}','${tenant}',${branch},'Clinic Ops Assistant','clinic_ops_assistant','active',
     'account-sponsor',now(),now() + interval '30 days','secret://synthetic/agents/${id}',
     'n5c2-smoke','n5c2-smoke')`;

const ACTIVITY_INSERT = (id, options = {}) => {
  const {
    tenant = "t1",
    branch = "'b1'",
    actorKind = "human",
    actorAccount = "'account-reception'",
    actorAgent = "NULL",
    actorAuthority = "not_applicable",
    actorRef = "'human_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'",
    sourceDomain = "workforce.tasks",
    sourceEventId = `ops-task-event-${id}`,
    category = "task",
    action = "created",
    result = "observed",
    subjectType = "task",
    subjectRef = "'subject_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'",
    sensitivity = "operational",
    visibility = "branch",
    correlation = "NULL",
    payload = "'{}'::jsonb",
    supersedes = "NULL",
  } = options;
  return `INSERT INTO activity_events(
     id,tenant_id,branch_id,actor_kind,actor_account_id,actor_agent_id,actor_ref,actor_authority,
     source_domain,source_event_id,source_event_version,projection_version,category,action,result,
     subject_type,subject_ref,sensitivity,visibility_scope,correlation_id,occurred_at,payload,
     supersedes_activity_id,source_ref,source_revision)
   VALUES ('${id}','${tenant}',${branch},'${actorKind}',${actorAccount},${actorAgent},
     ${actorRef},'${actorAuthority}',
     '${sourceDomain}','${sourceEventId}',1,1,'${category}','${action}','${result}',
     '${subjectType}',${subjectRef},'${sensitivity}','${visibility}',${correlation},now(),${payload},
     ${supersedes},'n5c2-smoke','n5c2-smoke')`;
};

await client.query(`SET app.current_tenant='t1'`);

await client.query(ACTIVITY_INSERT("activity-1"));

await expectDbError(
  () => client.query(ACTIVITY_INSERT("activity-unknown-source", { sourceDomain: "clinical.encounters" })),
  "23514",
  "a source domain outside the closed registry must be impossible to persist",
);

await expectDbError(
  () => client.query(ACTIVITY_INSERT("activity-clinical-action", { action: "prescribe" })),
  "23514",
  "a clinical action must be impossible to persist",
);

await expectDbError(
  () => client.query(ACTIVITY_INSERT("activity-unknown-actor", { actorKind: "clinician" })),
  "23514",
  "an actor kind outside the closed enumeration must be refused",
);

await expectDbError(
  () => client.query(
    ACTIVITY_INSERT("activity-payload-prose", {
      payload: `'{"summary": "sensitive clinical narrative"}'::jsonb`,
    }),
  ),
  "23514",
  "a payload key outside the closed allow-list must be refused",
);

await expectDbError(
  () => client.query(
    ACTIVITY_INSERT("activity-payload-nested", {
      payload: `'{"provider": {"name": "x"}}'::jsonb`,
    }),
  ),
  "23514",
  "a nested payload value must be refused",
);

await expectDbError(
  () => client.query(
    ACTIVITY_INSERT("activity-payload-free-text", {
      payload: `'{"channel": "whatsapp", "provider": "patient called about chest pain"}'::jsonb`,
    }),
  ),
  "23514",
  "free-text payload content must be refused",
);

await expectDbError(
  () => client.query(
    ACTIVITY_INSERT("activity-payload-enum", { payload: `'{"channel": "carrier-pigeon"}'::jsonb` }),
  ),
  "23514",
  "a payload value outside the closed vocabulary must be refused",
);

await expectDbError(
  () => client.query(
    ACTIVITY_INSERT("activity-payload-secret", { payload: `'{"provider": "app_secret_value"}'::jsonb` }),
  ),
  "23514",
  "credential-shaped payload content must be refused",
);

await expectDbError(
  () => client.query(
    ACTIVITY_INSERT("activity-actor-ref", {
      actorKind: "external",
      actorAccount: "NULL",
      actorAgent: "NULL",
      actorAuthority: "not_applicable",
      actorRef: "'unminted-actor-reference'",
    }),
  ),
  "23514",
  "an actor reference must satisfy the minted-reference shape",
);

await expectDbError(
  () => client.query(ACTIVITY_INSERT("activity-human-with-agent", { actorAgent: "'agent-1'" })),
  "23514",
  "a human actor must not carry an agent identity reference",
);

await expectDbError(
  () => client.query(ACTIVITY_INSERT("activity-metadata-mrn", { sourceEventId: "1052345678" })),
  "23514",
  "a long digit run must not be storable as source metadata",
);

await expectDbError(
  () => client.query(ACTIVITY_INSERT("activity-metadata-secret", { correlation: "'app_secret_value'" })),
  "23514",
  "credential-shaped correlation metadata must be refused",
);

await expectDbError(
  () => client.query(ACTIVITY_INSERT("activity-branch-visibility", { branch: "NULL" })),
  "23514",
  "branch visibility without a branch must be refused",
);

await expectDbError(
  () => client.query(ACTIVITY_INSERT("activity-tenant-visibility", { visibility: "tenant" })),
  "23514",
  "tenant-wide activity must not carry a branch",
);

await expectDbError(
  () => client.query(ACTIVITY_INSERT("activity-subject-orphan", { subjectRef: "NULL" })),
  "23514",
  "a subject type without a subject reference must be refused",
);

await expectDbError(
  () =>
    client.query(
      ACTIVITY_INSERT("activity-duplicate-source", { sourceEventId: "ops-task-event-activity-1" }),
    ),
  "23505",
  "a replayed canonical event must not create a second activity row",
);

// A real bounded C1 agent identity may author activity, and the authority state is
// recorded at projection time.
await client.query(AGENT_INSERT("c2-agent-1"));
await client.query(
  ACTIVITY_INSERT("activity-agent", {
    actorKind: "agent",
    actorAccount: "NULL",
    actorAgent: "'c2-agent-1'",
    actorAuthority: "active",
    actorRef: "'agent_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'",
    sourceEventId: "ops-task-event-agent-1",
  }),
);

await expectDbError(
  () =>
    client.query(
      ACTIVITY_INSERT("activity-orphan-agent", {
        actorKind: "agent",
        actorAccount: "NULL",
        actorAgent: "'agent-does-not-exist'",
        actorAuthority: "active",
        actorRef: "'agent_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'",
        sourceEventId: "ops-task-event-agent-2",
      }),
    ),
  "23503",
  "agent-authored activity must reference a real bounded agent identity",
);

await expectDbError(
  () =>
    client.query(
      ACTIVITY_INSERT("activity-agent-authority", {
        actorKind: "agent",
        actorAccount: "NULL",
        actorAgent: "'c2-agent-1'",
        actorAuthority: "not_applicable",
        actorRef: "'agent_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'",
        sourceEventId: "ops-task-event-agent-3",
      }),
    ),
  "23514",
  "an agent-authored record must carry a resolved authority state",
);

// Correction is an appended superseding record, never a rewrite.
await client.query(
  ACTIVITY_INSERT("activity-correction", {
    sourceEventId: "ops-task-event-correction",
    action: "transitioned",
    result: "succeeded",
    payload: `'{"previousValue": "open", "newValue": "resolved"}'::jsonb`,
    supersedes: "'activity-1'",
  }),
);

// Even a table owner cannot widen the closed registry or rewrite the outcome family
// of a stored record through an update.
await expectDbError(
  () => client.query(`UPDATE activity_events SET source_domain='clinical.encounters' WHERE id='activity-1'`),
  "23514",
  "the closed source registry must survive an update attempt",
);
await expectDbError(
  () => client.query(`UPDATE activity_events SET supersedes_activity_id=id WHERE id='activity-1'`),
  "23514",
  "a record must not supersede itself",
);

await client.query(`SET ROLE zyara_app`);
await client.query(`SET app.current_tenant='t1'`);

// RLS is enforced for the application role, so a foreign-tenant projection is
// refused by the INSERT policy rather than merely by convention.
await expectDbError(
  () => client.query(ACTIVITY_INSERT("activity-cross-tenant", { tenant: "t2", branch: "'b2'" })),
  "42501",
  "a cross-tenant activity insert must be refused by the RLS WITH CHECK",
);

await expectDbError(
  () => client.query(`UPDATE activity_events SET result='succeeded' WHERE id='activity-1'`),
  "42501",
  "the activity trail must stay append-only (no UPDATE grant)",
);
await expectDbError(
  () => client.query(`DELETE FROM activity_events WHERE id='activity-1'`),
  "42501",
  "the activity trail must stay append-only (no DELETE grant)",
);

// The application role may still append, and the closed registries still apply.
await client.query(ACTIVITY_INSERT("activity-app-1", { sourceEventId: "ops-task-event-app-1" }));
await expectDbError(
  () =>
    client.query(
      ACTIVITY_INSERT("activity-app-clinical", {
        sourceEventId: "ops-task-event-app-2",
        sourceDomain: "clinical.observations",
      }),
    ),
  "23514",
  "the application role must not be able to persist a clinical source domain",
);

const own = await client.query(`SELECT count(*)::int AS n FROM activity_events`);
if (own.rows[0].n < 3) fail(`expected several t1 activity rows, got ${own.rows[0].n}`);

await client.query(`SET app.current_tenant='t2'`);
const foreign = await client.query(`SELECT count(*)::int AS n FROM activity_events`);
if (foreign.rows[0].n !== 0) fail("tenant read isolation failed for activity records");

await client.query(`RESET ROLE`);
const grants = await client.query(
  `SELECT privilege_type FROM information_schema.role_table_grants
   WHERE grantee='zyara_app' AND table_name='activity_events'
   ORDER BY privilege_type`,
);
const privileges = grants.rows.map((row) => row.privilege_type).sort();
if (JSON.stringify(privileges) !== JSON.stringify(["INSERT", "SELECT"])) {
  fail(`activity_events must be SELECT/INSERT only, got ${JSON.stringify(privileges)}`);
}

const secretColumns = await client.query(
  `SELECT column_name FROM information_schema.columns
   WHERE table_name = 'activity_events'
     AND column_name IN ('access_token','app_secret','verify_token','password','private_key','api_key','credential_value')`,
);
if (secretColumns.rows.length !== 0) {
  fail(`secret-bearing columns unexpectedly persisted: ${JSON.stringify(secretColumns.rows)}`);
}

// No stored record may contain prose: every text value is a code, a reference or a
// timestamp. This is the property the read-time title derivation relies on.
const prose = await client.query(
  `SELECT count(*)::int AS n FROM activity_events
   WHERE subject_ref ~ ' '
      OR actor_ref ~ ' '
      OR source_event_id ~ ' '
      OR source_ref ~ ' '
      OR source_revision ~ ' '
      OR correlation_id ~ ' '`,
);
if (prose.rows[0].n !== 0) fail("activity records must not store prose values");

console.log(
  "N5/C2 activity DB smoke PASS: tenant isolation, closed registries, identifier-refusing references, " +
    "secret-free metadata, payload minimisation, deterministic deduplication, agent attribution and an " +
    "append-only trail verified",
);

// The smoke owns only its own synthetic rows. Activity history is append-only for the
// application role, so cleanup runs as the table owner and removes derived rows before
// the rows they reference (the same ordering C1 uses for its own event trail). This
// keeps a shared smoke database usable by the W1-W4 and C1 smokes.
await client.query(`DELETE FROM activity_events`);
await client.query(`DELETE FROM agent_identity_events WHERE agent_id = 'c2-agent-1'`);
await client.query(`DELETE FROM agent_identities WHERE id = 'c2-agent-1'`);
await client.end();
