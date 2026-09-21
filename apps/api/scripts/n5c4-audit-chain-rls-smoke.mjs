// N5/C4 audit-chain persistence smoke: real PostgreSQL proof that the two join gaps are
// closed, that the reconstruction view reads the existing append-only trails, that it cannot
// be written, and that row-level security still applies through it.
//
// The smoke owns only its own synthetic rows. It applies the earlier migrations because the
// view reads their tables, and it cleans up after itself.
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
  "039_coverage_exceptions.sql",
  "040_ops_tasks.sql",
  "041_whatsapp_adapter.sql",
  "042_agent_identities.sql",
  "043_activity_events.sql",
  "044_approvals_exceptions.sql",
  "045_audit_chain.sql",
]) {
  await client.query(readFileSync(new URL(file, migrations), "utf8"));
}

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

const CORRELATION = "corr-c4-smoke-1";

await client.query(
  `INSERT INTO tenants(id,name) VALUES ('t1','Clinic One'),('t2','Clinic Two') ON CONFLICT DO NOTHING`,
);
await client.query(
  `INSERT INTO organizations(id,tenant_id) VALUES ('org-1','t1'),('org-2','t2') ON CONFLICT DO NOTHING`,
);
await client.query(
  `INSERT INTO branch_locations(id,tenant_id,organization_id)
   VALUES ('b1','t1','org-1'),('b2','t2','org-2') ON CONFLICT DO NOTHING`,
);

for (const statement of [
  `DELETE FROM activity_events WHERE correlation_id = '${CORRELATION}'`,
  `DELETE FROM exception_events WHERE case_id = 'case-c4-1'`,
  `DELETE FROM exception_cases WHERE id = 'case-c4-1'`,
  `DELETE FROM approval_events WHERE request_id = 'approval-c4-1'`,
  `DELETE FROM approval_executions WHERE request_id = 'approval-c4-1'`,
  `DELETE FROM approval_decisions WHERE request_id = 'approval-c4-1'`,
  `DELETE FROM approval_requests WHERE id = 'approval-c4-1'`,
  `DELETE FROM coverage_exceptions WHERE id = 'coverage-c4-1'`,
  `DELETE FROM agent_identity_events WHERE agent_id = 'agent-c4-1'`,
  `DELETE FROM agent_identities WHERE id = 'agent-c4-1'`,
  `DELETE FROM whatsapp_webhook_receipts WHERE id = 'receipt-c4-1'`,
  `DELETE FROM ops_task_events WHERE task_id = 'task-c4-1'`,
  `DELETE FROM ops_tasks WHERE id = 'task-c4-1'`,
]) {
  await client.query(statement).catch(() => undefined);
}

await client.query(`SET app.current_tenant='t1'`);

// One synthetic record per slice, all joined by the same correlation id.
await client.query(
  `INSERT INTO ops_tasks(
     id,tenant_id,branch_id,kind,status,priority,title,requester_account_id,origin_kind,origin_ref,
     correlation_id,source_ref,source_revision)
   VALUES ('task-c4-1','t1','b1','facility_helpdesk','open','normal','Chain smoke task',
     'account-reception','human','account-reception','${CORRELATION}','n5c4-smoke','n5c4-smoke')`,
);
await client.query(
  `INSERT INTO coverage_exceptions(
     id,tenant_id,branch_id,shift_id,kind,detail,status,correlation_id,source_ref,source_revision,
     observed_at)
   VALUES ('coverage-c4-1','t1','b1','shift-c4-1','coverage_gap','synthetic','open','${CORRELATION}',
     'n5c4-smoke','n5c4-smoke',now())`,
);
await client.query(
  `INSERT INTO agent_identities(
     id,tenant_id,branch_id,display_name,kind,status,human_sponsor_account_id,effective_from,
     expires_at,credential_ref,correlation_id,source_ref,source_revision)
   VALUES ('agent-c4-1','t1','b1','Clinic Ops Assistant','clinic_ops_assistant','active',
     'account-sponsor',now(),now() + interval '30 days','secret://synthetic/agents/agent-c4-1',
     '${CORRELATION}','n5c4-smoke','n5c4-smoke')`,
);
await client.query(
  `INSERT INTO whatsapp_accounts(
     id,tenant_id,branch_id,business_account_id,phone_number_id,app_secret_ref,verify_token_ref,
     enabled,source_ref,source_revision)
   VALUES ('wa-c4-1','t1','b1','business-1','phone-id-1','secret://synthetic/whatsapp/app-secret',
     'secret://synthetic/whatsapp/verify-token',true,'n5c4-smoke','n5c4-smoke')
   ON CONFLICT DO NOTHING`,
);
await client.query(
  `INSERT INTO whatsapp_webhook_receipts(
     id,tenant_id,account_id,provider_event_key,event_kind,provider_message_ref,provider_status,
     payload_digest,received_at,correlation_ref)
   VALUES ('receipt-c4-1','t1','wa-c4-1','evt-c4-1','message_received','wamid.c4.1','delivered',
     '${"c4".repeat(32)}',now(),'${CORRELATION}')`,
);
await client.query(
  `INSERT INTO approval_requests(
     id,tenant_id,branch_id,action_type,risk_class,required_authority,self_approval_forbidden,
     evidence_required,parameters_digest,parameter_keys,requester_kind,requester_account_id,
     status,correlation_id,source_ref,source_revision,observed_at,created_at,updated_at,expires_at)
   VALUES ('approval-c4-1','t1','b1','workforce.coverage_override','elevated','branch_admin',true,
     false,'params_${"ab".repeat(32)}',ARRAY['reasonCode','shiftRef','staffAssignmentRef'],'human',
     'account-reception','awaiting_approval','${CORRELATION}','n5c4-smoke','n5c4-smoke',
     now(),now(),now(),now() + interval '60 minutes')`,
);
await client.query(
  `INSERT INTO activity_events(
     id,tenant_id,branch_id,actor_kind,actor_account_id,actor_ref,actor_authority,source_domain,
     source_event_id,source_event_version,projection_version,category,action,result,subject_type,
     subject_ref,sensitivity,visibility_scope,correlation_id,occurred_at,payload,
     source_ref,source_revision)
   VALUES ('activity-c4-1','t1','b1','human','account-reception',
     'human_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef','not_applicable',
     'workforce.tasks','task-c4-1:created',1,1,'task','created','observed','task',
     'subject_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef','operational',
     'branch','${CORRELATION}',now(),'{"taskKind": "facility_helpdesk"}'::jsonb,
     'n5c4-smoke','n5c4-smoke')`,
);

// The two join gaps are closed with a shape-checked reference.
await expectDbError(
  () =>
    client.query(
      `UPDATE coverage_exceptions SET correlation_id='app_secret_value' WHERE id='coverage-c4-1'`,
    ),
  "23514",
  "a credential-shaped coverage correlation must be refused",
);
await expectDbError(
  () =>
    client.query(
      `UPDATE coverage_exceptions SET correlation_id='1052345678' WHERE id='coverage-c4-1'`,
    ),
  "23514",
  "a long digit run must not become a coverage correlation",
);
await expectDbError(
  () =>
    client.query(
      `UPDATE whatsapp_webhook_receipts SET correlation_ref='bearer abc' WHERE id='receipt-c4-1'`,
    ),
  "23514",
  "a credential-shaped receipt correlation must be refused",
);
// A minted digest with a long digit run is legitimate for the receipt reference.
await client.query(
  `UPDATE whatsapp_webhook_receipts SET correlation_ref='whatsapp_${"1234567890".repeat(6)}1234'
   WHERE id='receipt-c4-1'`,
);
await client.query(
  `UPDATE whatsapp_webhook_receipts SET correlation_ref='${CORRELATION}' WHERE id='receipt-c4-1'`,
);

// The reconstruction view reads the trails in one query.
const chain = await client.query(
  `SELECT source_domain, record_ref FROM audit_chain_entries
   WHERE tenant_id='t1' AND correlation_id='${CORRELATION}'
   ORDER BY source_domain, record_ref`,
);
const domains = chain.rows.map((row) => row.source_domain);
for (const expected of [
  "activity.projection",
  "collaboration.approvals",
  "communications.whatsapp",
  "identity.agents",
  "workforce.coverage",
  "workforce.tasks",
]) {
  if (!domains.includes(expected)) fail(`the chain view must expose ${expected}`);
}
if (chain.rows.length !== 6) {
  fail(`expected six chain entries, got ${chain.rows.length}`);
}

// The view owns no data and cannot be written.
await expectDbError(
  () =>
    client.query(
      `INSERT INTO audit_chain_entries(source_domain,tenant_id,record_ref,correlation_id,occurred_at)
       VALUES ('workforce.tasks','t1','forged','${CORRELATION}',now())`,
    ),
  "55000",
  "the reconstruction surface must not be writable",
);
const viewGrants = await client.query(
  `SELECT privilege_type, grantee FROM information_schema.role_table_grants
   WHERE table_name='audit_chain_entries' ORDER BY grantee, privilege_type`,
);
for (const row of viewGrants.rows) {
  if (row.grantee === "zyara_app" && row.privilege_type !== "SELECT") {
    fail(`the application role must hold SELECT only on the chain view, got ${row.privilege_type}`);
  }
}

// Row-level security still applies through the view, because it is a security_invoker view.
await client.query(`SET ROLE zyara_app`);
await client.query(`SET app.current_tenant='t1'`);
const own = await client.query(
  `SELECT count(*)::int AS n FROM audit_chain_entries WHERE correlation_id='${CORRELATION}'`,
);
if (own.rows[0].n !== 6) fail(`the application role must see its own chain, got ${own.rows[0].n}`);
await client.query(`SET app.current_tenant='t2'`);
const foreign = await client.query(
  `SELECT count(*)::int AS n FROM audit_chain_entries WHERE correlation_id='${CORRELATION}'`,
);
if (foreign.rows[0].n !== 0) {
  fail("the chain view must not reveal another tenant's chain");
}
await client.query(`RESET ROLE`);

console.log(
  "N5/C4 audit-chain DB smoke PASS: the W2 and W4 join gaps are closed with shape-checked " +
    "references, the read-only reconstruction view projects the existing append-only trails " +
    "in one query, it cannot be written, and row-level security still applies through it",
);

for (const statement of [
  `DELETE FROM activity_events WHERE correlation_id = '${CORRELATION}'`,
  `DELETE FROM approval_requests WHERE id = 'approval-c4-1'`,
  `DELETE FROM coverage_exceptions WHERE id = 'coverage-c4-1'`,
  `DELETE FROM agent_identity_events WHERE agent_id = 'agent-c4-1'`,
  `DELETE FROM agent_identities WHERE id = 'agent-c4-1'`,
  `DELETE FROM whatsapp_webhook_receipts WHERE id = 'receipt-c4-1'`,
  `DELETE FROM ops_task_events WHERE task_id = 'task-c4-1'`,
  `DELETE FROM ops_tasks WHERE id = 'task-c4-1'`,
]) {
  await client.query(statement).catch(() => undefined);
}
await client.end();
