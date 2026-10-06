// AIF-01B capability registry persistence smoke: real PostgreSQL proof that admitted
// definitions, grants, revocations, approval claims and resolution receipts are append-only,
// tenant-isolated by RLS, and that the database itself keeps A5 human-only, bounds agent and
// workflow grants, refuses cross-tenant branches and enforces one approval per invocation.
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
  "040_ops_tasks.sql",
  "042_agent_identities.sql",
  "043_activity_events.sql",
  "044_approvals_exceptions.sql",
]) {
  await client.query(readFileSync(new URL(file, migrations), "utf8"));
}

// The smoke owns its own tables and its own synthetic rows.
await client.query(`
  DROP TABLE IF EXISTS capability_resolution_receipts, capability_approval_claims,
    capability_grant_revocations, capability_grants, capability_definition_status_events,
    capability_definitions CASCADE`);
await client.query(readFileSync(new URL("046_capability_registry.sql", migrations), "utf8"));
// Applying the migration twice must be a no-op.
await client.query(readFileSync(new URL("046_capability_registry.sql", migrations), "utf8"));

await client.query(`INSERT INTO tenants(id,name) VALUES ('t1','Clinic One'),('t2','Clinic Two') ON CONFLICT DO NOTHING`);
await client.query(`INSERT INTO organizations(id,tenant_id) VALUES ('org-1','t1'),('org-2','t2') ON CONFLICT DO NOTHING`);
await client.query(
  `INSERT INTO branch_locations(id,tenant_id,organization_id)
   VALUES ('b1','t1','org-1'),('b2','t2','org-2') ON CONFLICT DO NOTHING`,
);
await client.query(`INSERT INTO accounts(id,display_name) VALUES ('acct-admin','Synthetic Admin') ON CONFLICT DO NOTHING`);
await client.query(`DELETE FROM approval_events WHERE request_id LIKE 'aif01b-%'`);
await client.query(`DELETE FROM approval_requests WHERE id LIKE 'aif01b-%'`);

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

const HEX = "a".repeat(64);
const DEF = (id, options = {}) => {
  const {
    rw = "write",
    authority = "A3_EXECUTE_LOW",
    risk = "elevated",
    digest = `cap_${id.length.toString(16).padStart(2, "0")}${HEX.slice(2)}`,
    adapterId = "NULL",
    adapterCap = "NULL",
  } = options;
  return `INSERT INTO capability_definitions(
     capability_id,version,definition_digest,owner_domain,read_or_write,authority_class,risk_class,
     definition,adapter_id,adapter_capability,registered_by_kind,registered_by_id)
   VALUES ('${id}','1.0.0','${digest}','${id.split(".")[0]}','${rw}','${authority}','${risk}',
     '{"synthetic":true}'::jsonb,${adapterId},${adapterCap},'release_pipeline','ci-release')`;
};

await client.query(DEF("communications.reminder.send", { digest: `cap_${"1".repeat(64)}` }));
await client.query(DEF("documentation.note.sign", { authority: "A5_HUMAN_ONLY", digest: `cap_${"2".repeat(64)}` }));
await client.query(
  DEF("booking.appointment.create", { digest: `cap_${"3".repeat(64)}`, adapterId: "'pms-1'", adapterCap: "'create'" }),
);

await expectDbError(() => client.query(DEF("communications.reminder.send", { digest: `cap_${"4".repeat(64)}` })), "23505", "an admitted (id, version) must be immutable: no second registration");
await expectDbError(() => client.query(DEF("communications.other.send", { digest: `cap_${"1".repeat(64)}` })), "23505", "a definition digest must be unique");
await expectDbError(() => client.query(DEF("communications.bad.send", { digest: "cap_short" })), "23514", "a malformed definition digest must be refused");
await expectDbError(() => client.query(DEF("Communications.*", { digest: `cap_${"5".repeat(64)}` })), "23514", "a wildcard or uppercase capability id must be refused");
await expectDbError(() => client.query(DEF("communications.draft.send", { authority: "A1_DRAFT", digest: `cap_${"6".repeat(64)}` })), "23514", "a write registered as A1 must be refused");
await expectDbError(() => client.query(DEF("booking.half.bound", { digest: `cap_${"7".repeat(64)}`, adapterId: "'pms-1'" })), "23514", "an adapter binding must name both adapter and capability");

const GRANT = (id, options = {}) => {
  const {
    tenant = "t1",
    branch = "'b1'",
    kind = "workflow",
    grantee = "wf-recall",
    capability = "communications.reminder.send",
    authority = "A3_EXECUTE_LOW",
    expires = "now() + interval '30 days'",
  } = options;
  return `INSERT INTO capability_grants(
     id,tenant_id,branch_id,grantee_kind,grantee_id,capability_id,version,authority_class,granted_by,expires_at)
   VALUES ('${id}','${tenant}',${branch},'${kind}','${grantee}','${capability}','1.0.0','${authority}','acct-admin',${expires})`;
};

await client.query(`SET app.current_tenant='t1'`);
await client.query(GRANT("g-1"));
await client.query(GRANT("g-sign", { kind: "human_role", grantee: "clinician", capability: "documentation.note.sign", authority: "A5_HUMAN_ONLY", expires: "NULL" }));

await expectDbError(
  () => client.query(GRANT("g-a5-agent", { kind: "agent", grantee: "agent-1", capability: "documentation.note.sign", authority: "A5_HUMAN_ONLY" })),
  "23514",
  "an A5 grant to an agent must be impossible to persist",
);
await expectDbError(
  () => client.query(GRANT("g-a5-forged", { kind: "agent", grantee: "agent-1", capability: "documentation.note.sign", authority: "A3_EXECUTE_LOW" })),
  "23503",
  "a grant cannot forge a lower authority class than the admitted definition",
);
await expectDbError(() => client.query(GRANT("g-forever", { expires: "NULL" })), "23514", "a workflow grant must expire");
await expectDbError(() => client.query(GRANT("g-long", { expires: "now() + interval '91 days'" })), "23514", "a grant beyond 90 days must be refused");
await expectDbError(() => client.query(GRANT("g-x-branch", { branch: "'b2'" })), "23503", "a grant cannot reference another tenant's branch");
await expectDbError(
  () => client.query(GRANT("g-unknown", { capability: "communications.unknown.send" })),
  "23503",
  "a grant for an unadmitted capability must be refused",
);

const APPROVAL = (id, status, created, expires) =>
  `INSERT INTO approval_requests(
     id,tenant_id,branch_id,action_type,risk_class,required_authority,self_approval_forbidden,
     evidence_required,parameters_digest,parameter_keys,requester_kind,requester_account_id,
     requester_agent_id,requester_ref,status,correlation_id,idempotency_key,source_ref,
     source_revision,observed_at,created_at,updated_at,expires_at)
   VALUES ('${id}','t1','b1','communications.outbound.broadcast','high','branch_admin',true,true,
     'params_${"ab".repeat(32)}',ARRAY['audienceType','channel','scheduledHour'],'human','account-requester',
     NULL,NULL,'${status}',NULL,NULL,'aif01b-smoke','aif01b-smoke',now(),${created},${created},${expires})`;
await client.query(APPROVAL("aif01b-appr-1", "approved", "now()", "now() + interval '30 minutes'"));
await client.query(APPROVAL("aif01b-appr-2", "awaiting_approval", "now()", "now() + interval '30 minutes'"));
await client.query(APPROVAL("aif01b-appr-3", "approved", "now() - interval '2 hours'", "now() - interval '1 hour'"));

const RES = `res_${"c".repeat(64)}`;
for (const [id, label] of [["aif01b-appr-2", "an approval still awaiting a decision"], ["aif01b-appr-3", "an expired approval"], ["aif01b-missing", "an unknown approval"]]) {
  await expectDbError(
    () => client.query(
      `INSERT INTO capability_approval_claims(tenant_id,approval_request_id,idempotency_key,receipt_digest)
       VALUES ('t1','${id}','idem-0001','${RES}')`,
    ),
    "23514",
    `${label} must not be claimable`,
  );
}
await client.query(
  `INSERT INTO capability_approval_claims(tenant_id,approval_request_id,idempotency_key,receipt_digest)
   VALUES ('t1','aif01b-appr-1','idem-0001','${RES}')`,
);
await expectDbError(
  () => client.query(
    `INSERT INTO capability_approval_claims(tenant_id,approval_request_id,idempotency_key,receipt_digest)
     VALUES ('t1','aif01b-appr-1','idem-0002','${RES}')`,
  ),
  "23505",
  "a second invocation must not claim the same approval",
);

const RECEIPT = (digest, options = {}) => {
  const {
    tenant = "t1",
    decision = "ALLOW",
    decided = "now()",
    valid = "now() + interval '60 seconds'",
    grant = "'g-1'",
    correlation = "'corr-0001'",
    params = `'params_${"ab".repeat(32)}'`,
    idem = "'idem-0001'",
    approval = "NULL",
    claimKey = "NULL",
  } = options;
  return `INSERT INTO capability_resolution_receipts(
     receipt_digest,tenant_id,branch_id,decision,reason_codes,capability_id,version,definition_digest,
     actor_kind,actor_ref,parameters_digest,correlation_id,idempotency_key,grant_id,approval_request_id,
     claim_idempotency_key,decided_at,valid_until)
   VALUES ('${digest}','${tenant}','b1','${decision}',ARRAY['ALLOWED'],'communications.reminder.send','1.0.0',
     'cap_${"1".repeat(64)}','workflow','wf-recall',${params},${correlation},${idem},${grant},${approval},
     ${claimKey},${decided},${valid})`;
};

await client.query(RECEIPT(`res_${"d".repeat(64)}`));
await client.query(RECEIPT(`res_${"e".repeat(64)}`, { decision: "UNDECIDABLE", decided: "NULL", valid: "NULL", grant: "NULL" }));
await expectDbError(() => client.query(RECEIPT(`res_${"d".repeat(64)}`)), "23505", "the same receipt is recorded once");
await expectDbError(() => client.query(RECEIPT(`res_${"f".repeat(64)}`, { decided: "NULL" })), "23514", "only UNDECIDABLE may lack trusted time");
await expectDbError(() => client.query(RECEIPT(`res_${"0".repeat(64)}`, { grant: "NULL" })), "23514", "an ALLOW must name its grant");
await expectDbError(() => client.query(RECEIPT(`res_${"9".repeat(64)}`, { valid: "now() - interval '1 second'" })), "23514", "an ALLOW must be valid after it is decided");
await expectDbError(() => client.query(RECEIPT(`res_${"8".repeat(64)}`, { correlation: "'0501234567'" })), "23514", "a receipt correlation id must not be a direct identifier");
await expectDbError(() => client.query(RECEIPT(`res_${"7".repeat(64)}`, { params: "'send to +966500000000'" })), "23514", "a receipt never stores parameter values");

// An approval-backed ALLOW must match the claim won by the same invocation.
const APPROVED = { approval: "'aif01b-appr-1'" };
await client.query(RECEIPT(`res_${"6".repeat(64)}`, { ...APPROVED, claimKey: "'idem-0001'" }));
await expectDbError(
  () => client.query(RECEIPT(`res_${"5".repeat(64)}`, { ...APPROVED, idem: "'idem-0002'", claimKey: "'idem-0002'" })),
  "23503",
  "an ALLOW for an approval claimed by another invocation must be refused",
);
await expectDbError(
  () => client.query(RECEIPT(`res_${"4".repeat(64)}`, APPROVED)),
  "23514",
  "an approval-backed ALLOW must be bound to its claim",
);
await expectDbError(
  () => client.query(RECEIPT(`res_${"3".repeat(64)}`, { ...APPROVED, claimKey: "'idem-0009'" })),
  "23514",
  "the claim key must be the receipt's own invocation key",
);
await client.query(
  RECEIPT(`res_${"2".repeat(64)}`, { ...APPROVED, decision: "DENY", idem: "'idem-0002'", grant: "NULL", valid: "now()" }),
);

await client.query(`SET ROLE zyara_app`);
await client.query(`SET app.current_tenant='t1'`);

// The application role can append, never rewrite or delete.
await client.query(
  `INSERT INTO capability_grant_revocations(grant_id,tenant_id,revoked_by,reason_code) VALUES ('g-1','t1','acct-admin','offboarded')`,
);
await expectDbError(
  () => client.query(`INSERT INTO capability_grant_revocations(grant_id,tenant_id,revoked_by,reason_code) VALUES ('g-1','t1','acct-admin','again')`),
  "23505",
  "a grant is revoked once",
);
for (const [statement, label] of [
  [`UPDATE capability_grants SET expires_at = now() + interval '80 days' WHERE id='g-1'`, "grants"],
  [`DELETE FROM capability_grants WHERE id='g-1'`, "grants"],
  [`DELETE FROM capability_grant_revocations WHERE grant_id='g-1'`, "revocations"],
  [`UPDATE capability_resolution_receipts SET decision='DENY'`, "receipts"],
  [`DELETE FROM capability_resolution_receipts`, "receipts"],
  [`DELETE FROM capability_approval_claims`, "approval claims"],
  [`UPDATE capability_definitions SET authority_class='A0_OBSERVE'`, "definitions"],
  [`INSERT INTO capability_definitions(capability_id,version,definition_digest,owner_domain,read_or_write,authority_class,risk_class,definition,registered_by_kind,registered_by_id)
    VALUES ('reporting.self.grant','1.0.0','cap_${"b".repeat(64)}','reporting','read','A0_OBSERVE','routine','{}'::jsonb,'release_pipeline','app')`, "definitions"],
  [`INSERT INTO capability_definition_status_events(id,capability_id,version,status,reason_code,actor_id)
    VALUES ('s-1','communications.reminder.send','1.0.0','active','self_reinstate','app')`, "definition status"],
]) {
  await expectDbError(() => client.query(statement), "42501", `the application role must not rewrite or self-admit ${label}`);
}

await expectDbError(() => client.query(GRANT("g-t2", { tenant: "t2", branch: "'b2'" })), "42501", "a cross-tenant grant insert must be refused by RLS");

const own = await client.query(`SELECT count(*)::int AS n FROM capability_grants`);
if (own.rows[0].n !== 2) fail(`expected two t1 grants, got ${own.rows[0].n}`);
const catalog = await client.query(`SELECT count(*)::int AS n FROM capability_definitions`);
if (catalog.rows[0].n !== 3) fail(`the application role must read the installation catalog, got ${catalog.rows[0].n}`);

await client.query(`SET app.current_tenant='t2'`);
for (const table of ["capability_grants", "capability_grant_revocations", "capability_approval_claims", "capability_resolution_receipts"]) {
  const rows = await client.query(`SELECT count(*)::int AS n FROM ${table}`);
  if (rows.rows[0].n !== 0) fail(`tenant read isolation failed for ${table}`);
}

await client.query(`RESET ROLE`);
const privileges = await client.query(
  `SELECT table_name, string_agg(privilege_type, ',' ORDER BY privilege_type) AS p
   FROM information_schema.role_table_grants
   WHERE grantee='zyara_app' AND table_name LIKE 'capability_%'
   GROUP BY table_name ORDER BY table_name`,
);
for (const row of privileges.rows) {
  const expected = row.table_name.startsWith("capability_definition") ? "SELECT" : "INSERT,SELECT";
  if (row.p !== expected) fail(`${row.table_name} must grant ${expected} only, got ${row.p}`);
}
if (privileges.rows.length !== 6) fail(`expected grants on six capability tables, got ${privileges.rows.length}`);

const secretColumns = await client.query(
  `SELECT column_name FROM information_schema.columns
   WHERE table_name LIKE 'capability_%'
     AND column_name IN ('secret','password','private_key','api_key','access_token','parameters','parameter_values')`,
);
if (secretColumns.rows.length !== 0) fail(`secret or parameter-value columns persisted: ${JSON.stringify(secretColumns.rows)}`);

console.log(
  "AIF-01B capability registry DB smoke PASS: immutable catalog, append-only grants/revocations/claims/receipts, RLS isolation, DB-enforced A5 human-only, bounded grants, one approval per invocation",
);
await client.end();
