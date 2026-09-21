// W3 task-queue smoke: applies 002/006/038/040, then proves tenant isolation,
// branch-scoped assignment integrity, append-only trail tables, closure evidence
// and idempotency at the real database boundary as the zyara_app role.
// Requires DATABASE_URL env (CI postgres service or local PG); skips otherwise.
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
]) {
  await client.query(readFileSync(new URL(file, migrations), "utf8"));
}

// Seed the tenant/organization/branch/staff graph as the owning role: the
// application always connects as zyara_app, which is what the checks below use.
// The reset makes the smoke re-runnable against an existing database; the graph
// inserts below are conflict-tolerant because only work-queue rows are cleared.
for (const table of ["ops_task_events", "ops_task_comments", "ops_tasks"]) {
  await client.query(`DELETE FROM ${table}`);
}
await client.query(`INSERT INTO tenants(id,name) VALUES ('t1','Clinic One'),('t2','Clinic Two') ON CONFLICT DO NOTHING`);
await client.query(
  `INSERT INTO organizations(id,tenant_id) VALUES ('org-1','t1'),('org-2','t2') ON CONFLICT DO NOTHING`,
);
await client.query(
  `INSERT INTO branch_locations(id,tenant_id,organization_id)
   VALUES ('b1','t1','org-1'),('b2','t1','org-1'),('b3','t2','org-2') ON CONFLICT DO NOTHING`,
);
await client.query(
  `INSERT INTO staff_assignments(id,tenant_id,account_id,organization_id,branch_id,operational_role,effective_from,source_ref,source_revision)
   VALUES ('assignment-b1','t1','account-1','org-1','b1','receptionist','2026-01-01','w3-smoke','w3-smoke'),
          ('assignment-b2','t1','account-2','org-1','b2','receptionist','2026-01-01','w3-smoke','w3-smoke')
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
  fail(`${label}: expected SQLSTATE ${sqlstate}, but the statement succeeded`);
}

const insertTask = (id, tenantId, branchId, assigneeAccount, assigneeAssignment, idempotencyKey) =>
  client.query(
    `INSERT INTO ops_tasks(
       id, tenant_id, branch_id, kind, status, priority, title, detail,
       requester_account_id, assignee_account_id, assignee_staff_assignment_id,
       subject_type, origin_kind, origin_ref, idempotency_key, source_ref, source_revision)
     VALUES ($1,$2,$3,'facility_helpdesk','open','normal','Room 2 AC','',
       'account-1',$4,$5,'none','human','account-1',$6,'w3-smoke','w3-smoke')`,
    [id, tenantId, branchId, assigneeAccount, assigneeAssignment, idempotencyKey],
  );

await client.query(`SET ROLE zyara_app`);
await client.query(`SET app.current_tenant='t1'`);

await insertTask("task-b1", "t1", "b1", "account-1", "assignment-b1", "wa-msg-1");

await expectDbError(
  () => insertTask("task-t2", "t2", "b3", null, null, null),
  "42501",
  "cross-tenant insert must be refused by RLS WITH CHECK",
);
await expectDbError(
  () => insertTask("task-cross-branch", "t1", "b1", "account-2", "assignment-b2", null),
  "23503",
  "assignee from another branch must be refused by the composite foreign key",
);
await expectDbError(
  () => insertTask("task-ghost-branch", "t1", "b-unknown", null, null, null),
  "23503",
  "unknown branch must be refused by the branch foreign key",
);
await expectDbError(
  () => insertTask("task-dup-key", "t1", "b1", null, null, "wa-msg-1"),
  "23505",
  "duplicate idempotency key for the tenant must be refused",
);
await expectDbError(
  () => client.query(`UPDATE ops_tasks SET status='resolved' WHERE id='task-b1'`),
  "23514",
  "resolving without recorded outcome evidence must be refused by the schema",
);

const ownRows = await client.query(`SELECT count(*)::int AS n FROM ops_tasks`);
if (ownRows.rows[0].n !== 1) fail(`tenant read isolation failed: expected 1 row, got ${ownRows.rows[0].n}`);

await client.query(
  `INSERT INTO ops_task_comments(id, tenant_id, task_id, author_account_id, author_kind, body)
   VALUES ('comment-1','t1','task-b1','account-1','human','vendor called')`,
);
await expectDbError(
  () => client.query(`UPDATE ops_task_comments SET body='edited' WHERE id='comment-1'`),
  "42501",
  "comments must stay append-only (no UPDATE grant)",
);
await expectDbError(
  () => client.query(`DELETE FROM ops_task_comments WHERE id='comment-1'`),
  "42501",
  "comments must stay append-only (no DELETE grant)",
);
await expectDbError(
  () => client.query(`UPDATE ops_task_events SET reason='rewritten'`),
  "42501",
  "lifecycle trail must stay append-only (no UPDATE grant)",
);

await client.query(`SET app.current_tenant='t2'`);
const foreignRows = await client.query(`SELECT count(*)::int AS n FROM ops_tasks`);
if (foreignRows.rows[0].n !== 0) fail(`tenant read isolation failed: t2 saw ${foreignRows.rows[0].n} t1 rows`);
const foreignUpdate = await client.query(`UPDATE ops_tasks SET title='hijacked' WHERE id='task-b1'`);
if (foreignUpdate.rowCount !== 0) fail(`tenant write isolation failed: t2 updated ${foreignUpdate.rowCount} t1 rows`);

await client.query(`SET app.current_tenant='t1'`);
await client.query(
  `UPDATE ops_tasks SET status='resolved', resolution_note='replaced filter', resolved_at=now() WHERE id='task-b1'`,
);
const closed = await client.query(`SELECT status, resolution_note FROM ops_tasks WHERE id='task-b1'`);
if (closed.rows[0].status !== "resolved" || closed.rows[0].resolution_note !== "replaced filter") {
  fail(`closure with recorded evidence failed: ${JSON.stringify(closed.rows[0])}`);
}

await client.query(`RESET ROLE`);
console.log("W3 task RLS smoke PASS: tenant isolation, branch integrity, closure evidence and append-only trail verified");
await client.end();
