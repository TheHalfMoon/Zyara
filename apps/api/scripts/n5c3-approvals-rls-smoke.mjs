// N5/C3 approvals + exception queue persistence smoke: real PostgreSQL proof for tenant
// isolation, the closed protected-action registry, digest-only parameter binding, the
// append-only decision/execution/event trails, the transition guards, the evidence rules
// and the exception queue's ownership and closure rules.
//
// The smoke owns only the C3 tables and the C2 registry constraints it extends: it drops
// and recreates its own tables from db/migrations/043 and 044 so the run is repeatable. It
// never touches W1-W4 or C1 state beyond one synthetic agent identity.
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
]) {
  await client.query(readFileSync(new URL(file, migrations), "utf8"));
}

// The smoke owns its own tables and its own synthetic rows.
await client.query(`
  DROP TABLE IF EXISTS exception_events, exception_cases, approval_events,
    approval_executions, approval_decisions, approval_requests CASCADE`);
await client.query("DROP TABLE IF EXISTS activity_events CASCADE");
await client.query(readFileSync(new URL("043_activity_events.sql", migrations), "utf8"));
await client.query(readFileSync(new URL("044_approvals_exceptions.sql", migrations), "utf8"));

await client.query(
  `INSERT INTO tenants(id,name) VALUES ('t1','Clinic One'),('t2','Clinic Two') ON CONFLICT DO NOTHING`,
);
await client.query(
  `INSERT INTO organizations(id,tenant_id) VALUES ('org-1','t1'),('org-2','t2') ON CONFLICT DO NOTHING`,
);
await client.query(
  `INSERT INTO branch_locations(id,tenant_id,organization_id)
   VALUES ('b1','t1','org-1'),('b1b','t1','org-1'),('b2','t2','org-2') ON CONFLICT DO NOTHING`,
);
await client.query(`DELETE FROM exception_events`);
await client.query(`DELETE FROM exception_cases`);
await client.query(`DELETE FROM approval_events`);
await client.query(`DELETE FROM approval_executions`);
await client.query(`DELETE FROM approval_decisions`);
await client.query(`DELETE FROM approval_requests`);
await client.query(`DELETE FROM activity_events`);
await client.query(`DELETE FROM agent_identity_events WHERE agent_id = 'c3-agent-1'`);
await client.query(`DELETE FROM agent_identities WHERE id = 'c3-agent-1'`);
await client.query(`DELETE FROM ops_task_events WHERE task_id LIKE 'task-c3%'`);
await client.query(`DELETE FROM ops_tasks WHERE id LIKE 'task-c3%'`);

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

const DIGEST = "params_" + "ab".repeat(32);

const AGENT_INSERT = (id) =>
  `INSERT INTO agent_identities(
     id,tenant_id,branch_id,display_name,kind,status,human_sponsor_account_id,
     effective_from,expires_at,credential_ref,source_ref,source_revision)
   VALUES ('${id}','t1','b1','Clinic Ops Assistant','clinic_ops_assistant','active',
     'account-sponsor',now(),now() + interval '30 days','secret://synthetic/agents/${id}',
     'n5c3-smoke','n5c3-smoke')`;

const TASK_INSERT = (id, branch = "b1", tenant = "t1") =>
  `INSERT INTO ops_tasks(
     id,tenant_id,branch_id,kind,status,priority,title,requester_account_id,origin_kind,origin_ref,
     source_ref,source_revision)
   VALUES ('${id}','${tenant}','${branch}','automation_handoff','open','normal',
     'Human exception case: unknown_external_outcome','account-system','automation','account-system',
     'n5c3-smoke','n5c3-smoke')`;

const REQUEST_INSERT = (id, options = {}) => {
  const {
    tenant = "t1",
    branch = "'b1'",
    actionType = "communications.outbound.broadcast",
    riskClass = "high",
    requiredAuthority = "branch_admin",
    selfApproval = "true",
    evidenceRequired = "true",
    digest = `'${DIGEST}'`,
    keys =
      "ARRAY['audienceType','channel','scheduledHour']",
    requesterKind = "human",
    requesterAccount = "'account-requester'",
    requesterAgent = "NULL",
    requesterRef = "NULL",
    status = "awaiting_approval",
    correlation = "NULL",
    idempotency = "NULL",
  } = options;
  return `INSERT INTO approval_requests(
     id,tenant_id,branch_id,action_type,risk_class,required_authority,self_approval_forbidden,
     evidence_required,parameters_digest,parameter_keys,requester_kind,requester_account_id,
     requester_agent_id,requester_ref,status,correlation_id,idempotency_key,source_ref,
     source_revision,observed_at,created_at,updated_at,expires_at)
   VALUES ('${id}','${tenant}',${branch},'${actionType}','${riskClass}','${requiredAuthority}',
     ${selfApproval},${evidenceRequired},${digest},${keys},'${requesterKind}',${requesterAccount},
     ${requesterAgent},${requesterRef},'${status}',${correlation},${idempotency},
     'n5c3-smoke','n5c3-smoke',now(),now(),now(),now() + interval '30 minutes')`;
};

const DECISION_INSERT = (id, request, options = {}) => {
  const {
    tenant = "t1",
    outcome = "approved",
    approverKind = "human",
    approver = "'account-branch-admin'",
    authority = "branch_admin",
    evidenceRef = "'evidence-1'",
  } = options;
  return `INSERT INTO approval_decisions(
     id,tenant_id,request_id,outcome,approver_kind,approver_account_id,authority,
     authority_branch_id,authority_source_ref,authority_resolved_at,evidence_ref,reason_code,
     decided_at)
   VALUES ('${id}','${tenant}','${request}','${outcome}','${approverKind}',${approver},
     '${authority}','b1','n5c3-smoke',now(),${evidenceRef},'authorized',now())`;
};

const EXECUTION_INSERT = (id, request, options = {}) => {
  const {
    tenant = "t1",
    attempt = 1,
    outcome = "attempted",
    executorKind = "human",
    executorAccount = "'account-branch-admin'",
    executorAgent = "NULL",
    executorRef = "NULL",
    receiptRef = "NULL",
    evidenceRef = "NULL",
  } = options;
  return `INSERT INTO approval_executions(
     id,tenant_id,request_id,attempt,outcome,executor_kind,executor_account_id,executor_agent_id,
     executor_ref,parameters_digest,receipt_ref,evidence_ref,occurred_at)
   VALUES ('${id}','${tenant}','${request}',${attempt},'${outcome}','${executorKind}',
     ${executorAccount},${executorAgent},${executorRef},'${DIGEST}',${receiptRef},${evidenceRef},now())`;
};

const APPROVAL_EVENT_INSERT = (id, request, from, to, options = {}) => {
  const {
    tenant = "t1",
    actorKind = "human",
    actorAccount = "'account-branch-admin'",
    actorAgent = "NULL",
    actorRef = "NULL",
  } = options;
  return `INSERT INTO approval_events(
     id,tenant_id,request_id,from_status,to_status,actor_kind,actor_account_id,actor_agent_id,
     actor_ref,reason_code,occurred_at)
   VALUES ('${id}','${tenant}','${request}',${from},'${to}','${actorKind}',${actorAccount},
     ${actorAgent},${actorRef},'smoke',now())`;
};

const EXCEPTION_INSERT = (id, options = {}) => {
  const {
    tenant = "t1",
    branch = "b1",
    kind = "unknown_external_outcome",
    severity = "high",
    status = "open",
    workItem = "task-c3-1",
    subjectRef = "NULL",
    evidenceRequired = "true",
    resolutionCode = "NULL",
    closureEvidence = "NULL",
    closedAt = "NULL",
  } = options;
  return `INSERT INTO exception_cases(
     id,tenant_id,branch_id,kind,severity,status,work_item_task_id,subject_ref,evidence_required,
     sla_due_at,resolution_code,closure_evidence_ref,correlation_id,idempotency_key,source_ref,
     source_revision,observed_at,opened_at,updated_at,closed_at)
   VALUES ('${id}','${tenant}','${branch}','${kind}','${severity}','${status}','${workItem}',
     ${subjectRef},${evidenceRequired},now() + interval '8 hours',${resolutionCode},${closureEvidence},
     NULL,NULL,'n5c3-smoke','n5c3-smoke',now(),now(),now(),${closedAt})`;
};

const ACTIVITY_INSERT = (id, options = {}) => {
  const {
    tenant = "t1",
    branch = "'b1'",
    sourceDomain = "collaboration.approvals",
    category = "approval",
    action = "approved",
    subjectType = "approval_request",
    subjectRef = "'subject_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'",
    payload = "'{}'::jsonb",
  } = options;
  return `INSERT INTO activity_events(
     id,tenant_id,branch_id,actor_kind,actor_account_id,actor_agent_id,actor_ref,actor_authority,
     source_domain,source_event_id,source_event_version,projection_version,category,action,result,
     subject_type,subject_ref,sensitivity,visibility_scope,correlation_id,occurred_at,payload,
     source_ref,source_revision)
   VALUES ('${id}','${tenant}',${branch},'human','account-branch-admin',NULL,
     'human_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef','not_applicable',
     '${sourceDomain}','approval-event-${id}',1,1,'${category}','${action}','succeeded',
     '${subjectType}',${subjectRef},'operational','branch',NULL,now(),${payload},
     'n5c3-smoke','n5c3-smoke')`;
};

// ---------------------------------------------------------------------------
// Owner-side contract
// ---------------------------------------------------------------------------

await client.query(`SET app.current_tenant='t1'`);

await client.query(AGENT_INSERT("c3-agent-1"));
await client.query(TASK_INSERT("task-c3-1"));
await client.query(REQUEST_INSERT("approval-1"));
await client.query(DECISION_INSERT("decision-1", "approval-1"));

await client.query(EXCEPTION_INSERT("exception-1"));
await client.query(
  EXCEPTION_INSERT("exception-low-evidence", {
    kind: "stale_schedule",
    severity: "low",
    evidenceRequired: "false",
  }),
);

// The closed protected-action registry.
await expectDbError(
  () => client.query(REQUEST_INSERT("approval-clinical", { actionType: "clinical.prescribe" })),
  "23514",
  "a protected action outside the closed registry must be impossible to persist",
);
await expectDbError(
  () => client.query(REQUEST_INSERT("approval-risk", { riskClass: "extreme" })),
  "23514",
  "a risk class outside the closed registry must be refused",
);
await expectDbError(
  () => client.query(REQUEST_INSERT("approval-authority", { requiredAuthority: "chief_doctor" })),
  "23514",
  "a required authority outside the closed registry must be refused",
);
await expectDbError(
  () => client.query(REQUEST_INSERT("approval-status", { status: "waiting" })),
  "23514",
  "an approval status outside the state machine must be refused",
);
await expectDbError(
  () => client.query(REQUEST_INSERT("approval-self", { selfApproval: "false" })),
  "23514",
  "a protected action must not be storable with self-approval permitted",
);
await expectDbError(
  () => client.query(REQUEST_INSERT("approval-raw-digest", { digest: "'audience=all'" })),
  "23514",
  "a parameter digest must be the minted digest, not a raw parameter string",
);
await expectDbError(
  () =>
    client.query(
      REQUEST_INSERT("approval-key-set", {
        keys: "ARRAY['audienceType','channel']",
      }),
    ),
  "23514",
  "a parameter key set that does not match the action type must be refused",
);
await expectDbError(
  () =>
    client.query(
      REQUEST_INSERT("approval-requester", {
        requesterKind: "agent",
        requesterAccount: "NULL",
        requesterAgent: "NULL",
      }),
    ),
  "23514",
  "an agent requester without a bounded agent identity must be refused",
);
await expectDbError(
  () =>
    client.query(
      REQUEST_INSERT("approval-orphan-agent", {
        requesterKind: "agent",
        requesterAccount: "NULL",
        requesterAgent: "'agent-does-not-exist'",
      }),
    ),
  "23503",
  "an agent requester must reference a real bounded agent identity",
);
await client.query(
  REQUEST_INSERT("approval-agent-ok", {
    requesterKind: "agent",
    requesterAccount: "NULL",
    requesterAgent: "'c3-agent-1'",
  }),
);
await expectDbError(
  () => client.query(REQUEST_INSERT("approval-secret", { idempotency: "'app_secret_value'" })),
  "23514",
  "credential-shaped metadata must be refused",
);
await expectDbError(
  () => client.query(REQUEST_INSERT("approval-branch-unknown", { branch: "'b-missing'" })),
  "23503",
  "a request must not reference a branch the tenant does not own",
);

// Decisions are human-only and must be evidenced when the action requires it.
await expectDbError(
  () => client.query(DECISION_INSERT("decision-agent", "approval-1", { approverKind: "agent" })),
  "23514",
  "an agent decision must be impossible to persist",
);
await expectDbError(
  () =>
    client.query(
      DECISION_INSERT("decision-no-evidence", "approval-1", { evidenceRef: "NULL" }),
    ),
  "23514",
  "a protected action that requires evidence must not be decided without it",
);
await expectDbError(
  () => client.query(DECISION_INSERT("decision-duplicate", "approval-1")),
  "23505",
  "a request must not carry two decisions",
);
await expectDbError(
  () => client.query(DECISION_INSERT("decision-wrong-tenant", "approval-1", { tenant: "t2" })),
  "23503",
  "a decision must not reference a request in another tenant",
);
await expectDbError(
  () => client.query(EXCEPTION_INSERT("exception-unowned", { workItem: "task-missing" })),
  "23503",
  "an exception case must reference the work item that owns it",
);
await expectDbError(
  () => client.query(DECISION_INSERT("decision-unknown-request", "approval-missing", {})),
  "23503",
  "a decision must reference an existing request",
);

// Executions: a definitive outcome must be evidenced.
await client.query(EXECUTION_INSERT("execution-1", "approval-1"));
await expectDbError(
  () =>
    client.query(
      EXECUTION_INSERT("execution-unevidenced", "approval-1", {
        attempt: 1,
        outcome: "succeeded",
      }),
    ),
  "23514",
  "a definitive execution outcome must carry a receipt or evidence reference",
);
await client.query(
  EXECUTION_INSERT("execution-unknown", "approval-1", { outcome: "unknown" }),
);
await client.query(
  EXECUTION_INSERT("execution-succeeded", "approval-1", {
    outcome: "succeeded",
    receiptRef: "'receipt-1'",
  }),
);
await expectDbError(
  () =>
    client.query(
      EXECUTION_INSERT("execution-agent-orphan", "approval-1", {
        outcome: "attempted",
        executorKind: "agent",
        executorAccount: "NULL",
        executorAgent: "NULL",
      }),
    ),
  "23514",
  "an agent executor without a bounded identity must be refused",
);

// The transition guards.
await client.query(APPROVAL_EVENT_INSERT("event-1", "approval-1", "NULL", "proposed"));
await client.query(
  APPROVAL_EVENT_INSERT("event-2", "approval-1", "'proposed'", "awaiting_approval"),
);
await expectDbError(
  () => client.query(APPROVAL_EVENT_INSERT("event-illegal", "approval-1", "'proposed'", "succeeded")),
  "23514",
  "an illegal approval transition must be impossible to record",
);
await client.query(`UPDATE approval_requests SET status='approved' WHERE id='approval-1'`);
await expectDbError(
  () => client.query(`UPDATE approval_requests SET status='succeeded' WHERE id='approval-1'`),
  "23514",
  "an illegal status jump must be refused even for the table owner",
);
await expectDbError(
  () =>
    client.query(
      `UPDATE approval_requests SET parameters_digest='${DIGEST.replace("abab", "cdcd")}' WHERE id='approval-1'`,
    ),
  "23514",
  "a protected parameter digest must be immutable after the approval exists",
);
await expectDbError(
  () => client.query(`UPDATE approval_requests SET expires_at=now() + interval '10 days' WHERE id='approval-1'`),
  "23514",
  "an approval expiry must be immutable after it is written",
);

// Exception rules.
await expectDbError(
  () => client.query(EXCEPTION_INSERT("exception-bad-kind", { kind: "patient_was_upset" })),
  "23514",
  "an exception kind outside the closed registry must be refused",
);
await expectDbError(
  () => client.query(EXCEPTION_INSERT("exception-bad-severity", { severity: "urgent" })),
  "23514",
  "an exception severity outside the closed registry must be refused",
);
await expectDbError(
  () =>
    client.query(
      EXCEPTION_INSERT("exception-evidence-mismatch", {
        kind: "stale_schedule",
        evidenceRequired: "true",
      }),
    ),
  "23514",
  "the evidence requirement must follow the exception kind, not the caller",
);
await expectDbError(
  () =>
    client.query(
      EXCEPTION_INSERT("exception-closed-unevidenced", {
        status: "closed",
        resolutionCode: "'resolved_with_evidence'",
        closedAt: "now()",
      }),
    ),
  "23514",
  "a case that requires evidence must not be closed without it",
);
await expectDbError(
  () =>
    client.query(
      EXCEPTION_INSERT("exception-closed-unknown", {
        status: "closed",
        resolutionCode: "'unknown_outcome'",
        closureEvidence: "'evidence-2'",
        closedAt: "now()",
      }),
    ),
  "23514",
  "a case resolved as unknown must not be closed",
);
await expectDbError(
  () =>
    client.query(`UPDATE exception_cases SET status='closed' WHERE id='exception-1'`),
  "23514",
  "a case cannot jump from open to closed",
);
await client.query(`UPDATE exception_cases SET status='in_review' WHERE id='exception-1'`);
await client.query(
  `UPDATE exception_cases SET status='resolved', resolution_code='unknown_outcome' WHERE id='exception-1'`,
);
await expectDbError(
  () =>
    client.query(
      `UPDATE exception_cases SET status='closed', closure_evidence_ref='evidence-3' WHERE id='exception-1'`,
    ),
  "23514",
  "a case whose resolution is unknown must not be closable",
);
await expectDbError(
  () => client.query(`UPDATE exception_cases SET kind='policy_refusal' WHERE id='exception-1'`),
  "23514",
  "an exception case kind must be immutable",
);
await expectDbError(
  () => client.query(`UPDATE exception_cases SET work_item_task_id='task-other' WHERE id='exception-1'`),
  "23514",
  "the owning work item of a case must be immutable",
);

// ---------------------------------------------------------------------------
// Application role: RLS, grants and the append-only posture
// ---------------------------------------------------------------------------

await client.query(`SET ROLE zyara_app`);
await client.query(`SET app.current_tenant='t1'`);

await expectDbError(
  () => client.query(REQUEST_INSERT("approval-cross-tenant", { tenant: "t2", branch: "'b2'" })),
  "42501",
  "a cross-tenant approval insert must be refused by the RLS WITH CHECK",
);
await expectDbError(
  () => client.query(EXCEPTION_INSERT("exception-cross-tenant", { tenant: "t2", branch: "b2", workItem: "task-c3-1" })),
  "42501",
  "a cross-tenant exception insert must be refused by the RLS WITH CHECK",
);
await expectDbError(
  () =>
    client.query(
      `INSERT INTO approval_decisions(
         id,tenant_id,request_id,outcome,approver_kind,approver_account_id,authority,
         authority_source_ref,authority_resolved_at,evidence_ref,reason_code,decided_at)
       VALUES ('decision-cross-tenant','t2','approval-1','approved','human','account-x','org_admin',
         'n5c3-smoke',now(),'evidence-x','authorized',now())`,
    ),
  // The BEFORE INSERT guard cannot see another tenant's request under RLS, so the refusal
  // surfaces as a missing parent rather than as the RLS WITH CHECK. Both are refusals.
  "23503",
  "a decision naming another tenant's request must be refused",
);

// The application role may append and may move the lifecycle columns only.
await client.query(REQUEST_INSERT("approval-app-1"));
await client.query(EXECUTION_INSERT("execution-app-1", "approval-app-1"));
await client.query(
  `UPDATE approval_requests SET status='approved', updated_at=now() WHERE id='approval-app-1'`,
);
await expectDbError(
  () => client.query(`UPDATE approval_requests SET action_type='workforce.coverage_override' WHERE id='approval-app-1'`),
  "42501",
  "the application role must not be able to repoint an approval at another action",
);
await expectDbError(
  () => client.query(`DELETE FROM approval_requests WHERE id='approval-app-1'`),
  "42501",
  "the application role must not be able to delete an approval",
);
await expectDbError(
  () => client.query(`UPDATE approval_decisions SET outcome='rejected' WHERE id='decision-1'`),
  "42501",
  "the decision trail must stay append-only",
);
await expectDbError(
  () => client.query(`DELETE FROM approval_decisions WHERE id='decision-1'`),
  "42501",
  "the decision trail must stay append-only (no DELETE grant)",
);
await expectDbError(
  () => client.query(`UPDATE approval_executions SET outcome='failed' WHERE id='execution-1'`),
  "42501",
  "the execution trail must stay append-only",
);
await expectDbError(
  () => client.query(`UPDATE exception_cases SET kind='policy_refusal' WHERE id='exception-1'`),
  "42501",
  "the application role must not be able to rewrite the exception kind",
);
await expectDbError(
  () => client.query(`DELETE FROM exception_cases WHERE id='exception-1'`),
  "42501",
  "the application role must not be able to delete a case",
);

// Tenant read isolation on every C3 table.
const ownRequests = await client.query(`SELECT count(*)::int AS n FROM approval_requests`);
if (ownRequests.rows[0].n < 2) fail(`expected t1 approvals, got ${ownRequests.rows[0].n}`);
const ownCases = await client.query(`SELECT count(*)::int AS n FROM exception_cases`);
if (ownCases.rows[0].n < 2) fail(`expected t1 exception cases, got ${ownCases.rows[0].n}`);
await client.query(`SET app.current_tenant='t2'`);
for (const table of [
  "approval_requests",
  "approval_decisions",
  "approval_executions",
  "approval_events",
  "exception_cases",
  "exception_events",
]) {
  const foreign = await client.query(`SELECT count(*)::int AS n FROM ${table}`);
  if (foreign.rows[0].n !== 0) fail(`tenant read isolation failed for ${table}`);
}
await client.query(`RESET ROLE`);

// ---------------------------------------------------------------------------
// Grant inventory
// ---------------------------------------------------------------------------

const tableGrants = await client.query(
  `SELECT table_name, privilege_type FROM information_schema.role_table_grants
   WHERE grantee='zyara_app'
     AND table_name IN ('approval_requests','approval_decisions','approval_executions',
                        'approval_events','exception_cases','exception_events')
   ORDER BY table_name, privilege_type`,
);
const byTable = {};
for (const row of tableGrants.rows) {
  byTable[row.table_name] = [...(byTable[row.table_name] ?? []), row.privilege_type];
}
const expected = {
  approval_requests: ["INSERT", "SELECT"],
  approval_decisions: ["INSERT", "SELECT"],
  approval_executions: ["INSERT", "SELECT"],
  approval_events: ["INSERT", "SELECT"],
  exception_cases: ["INSERT", "SELECT"],
  exception_events: ["INSERT", "SELECT"],
};
for (const [table, privileges] of Object.entries(expected)) {
  const actual = (byTable[table] ?? []).sort();
  if (JSON.stringify(actual) !== JSON.stringify(privileges)) {
    fail(`${table} must be ${privileges.join("/")}, got ${JSON.stringify(actual)}`);
  }
}

const updateColumns = await client.query(
  `SELECT table_name, column_name FROM information_schema.role_column_grants
   WHERE grantee='zyara_app' AND privilege_type='UPDATE'
     AND table_name IN ('approval_requests','exception_cases')
   ORDER BY table_name, column_name`,
);
const updatable = updateColumns.rows.map((row) => `${row.table_name}.${row.column_name}`);
const expectedUpdatable = [
  "approval_requests.status",
  "approval_requests.updated_at",
  "exception_cases.closed_at",
  "exception_cases.closure_evidence_ref",
  "exception_cases.resolution_code",
  "exception_cases.status",
  "exception_cases.updated_at",
];
if (JSON.stringify(updatable) !== JSON.stringify(expectedUpdatable)) {
  fail(`unexpected updatable columns: ${JSON.stringify(updatable)}`);
}

const secretColumns = await client.query(
  `SELECT table_name, column_name FROM information_schema.columns
   WHERE table_name IN ('approval_requests','approval_decisions','approval_executions',
                        'approval_events','exception_cases','exception_events')
     AND column_name IN ('access_token','app_secret','verify_token','password','private_key','api_key','credential_value')`,
);
if (secretColumns.rows.length !== 0) {
  fail(`secret-bearing columns unexpectedly persisted: ${JSON.stringify(secretColumns.rows)}`);
}

// No C3 row may carry prose: every text value is a code, a reference or a timestamp.
const prose = await client.query(
  `SELECT count(*)::int AS n FROM approval_requests
   WHERE source_ref ~ ' ' OR source_revision ~ ' ' OR id ~ ' ' OR coalesce(correlation_id, '') ~ ' '`,
);
if (prose.rows[0].n !== 0) fail("approval rows must not store prose values");
const exceptionProse = await client.query(
  `SELECT count(*)::int AS n FROM exception_cases WHERE source_ref ~ ' ' OR source_revision ~ ' '`,
);
if (exceptionProse.rows[0].n !== 0) fail("exception rows must not store prose values");

// ---------------------------------------------------------------------------
// C2 registry extension
// ---------------------------------------------------------------------------

const constraintNames = await client.query(
  `SELECT conname FROM pg_constraint
   WHERE conrelid = 'activity_events'::regclass AND contype = 'c'
     AND conname IN ('activity_events_source_domain_check','activity_events_category_check',
                     'activity_events_action_check','activity_events_subject_type_check',
                     'activity_events_payload_check')
   ORDER BY conname`,
);
if (constraintNames.rows.length !== 5) {
  fail(`the C2 registry constraints must be re-declared by name, got ${JSON.stringify(constraintNames.rows)}`);
}

await client.query(
  ACTIVITY_INSERT("activity-approval", {
    payload: `'{"riskClass": "high", "requiredAuthority": "branch_admin", "approvalStatus": "approved"}'::jsonb`,
  }),
);
await client.query(
  ACTIVITY_INSERT("activity-exception", {
    sourceDomain: "collaboration.exceptions",
    category: "exception",
    action: "opened",
    subjectType: "exception_case",
    payload: `'{"exceptionKind": "unknown_external_outcome", "exceptionSeverity": "high", "exceptionStatus": "open", "workItemStatus": "open"}'::jsonb`,
  }),
);
await client.query(
  ACTIVITY_INSERT("activity-approval-c2", {
    sourceDomain: "workforce.tasks",
    category: "task",
    action: "created",
    subjectType: "task",
    payload: `'{"taskKind": "facility_helpdesk", "originKind": "human"}'::jsonb`,
  }),
);
await expectDbError(
  () => client.query(ACTIVITY_INSERT("activity-clinical", { sourceDomain: "clinical.encounters" })),
  "23514",
  "the closed activity source registry must still refuse a clinical domain",
);
await expectDbError(
  () =>
    client.query(
      ACTIVITY_INSERT("activity-bad-exception-kind", {
        sourceDomain: "collaboration.exceptions",
        category: "exception",
        action: "opened",
        subjectType: "exception_case",
        payload: `'{"exceptionKind": "patient_was_upset"}'::jsonb`,
      }),
    ),
  "23514",
  "an exception kind outside the closed payload vocabulary must be refused",
);
await expectDbError(
  () =>
    client.query(
      ACTIVITY_INSERT("activity-unknown-approval-status", {
        payload: `'{"approvalStatus": "waiting"}'::jsonb`,
      }),
    ),
  "23514",
  "an approval status outside the closed payload vocabulary must be refused",
);

console.log(
  "N5/C3 approvals DB smoke PASS: tenant isolation, closed protected-action and exception " +
    "registries, digest-only parameter binding, human-only evidenced decisions, append-only " +
    "decision/execution trails, transition and immutability guards, exception ownership and " +
    "closure rules, and the forward-only C2 registry extension verified",
);

// The smoke owns only its own synthetic rows.
await client.query(`DELETE FROM activity_events`);
await client.query(`DELETE FROM exception_events`);
await client.query(`DELETE FROM exception_cases`);
await client.query(`DELETE FROM approval_events`);
await client.query(`DELETE FROM approval_executions`);
await client.query(`DELETE FROM approval_decisions`);
await client.query(`DELETE FROM approval_requests`);
await client.query(`DELETE FROM agent_identity_events WHERE agent_id = 'c3-agent-1'`);
await client.query(`DELETE FROM agent_identities WHERE id = 'c3-agent-1'`);
await client.query(`DELETE FROM ops_task_events WHERE task_id LIKE 'task-c3%'`);
await client.query(`DELETE FROM ops_tasks WHERE id LIKE 'task-c3%'`);
await client.end();
