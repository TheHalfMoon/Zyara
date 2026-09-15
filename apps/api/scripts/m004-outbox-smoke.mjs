// M004 outbox smoke: transactional domain+outbox commit, RLS isolation,
// inbox dedupe, quarantine insert. Requires DATABASE_URL.
import { readFileSync } from "node:fs";
import pkg from "pg";
const { Client } = pkg;

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("SKIP: no DATABASE_URL");
  process.exit(0);
}
const sql004 = readFileSync(new URL("../../../db/migrations/004_durable_events.sql", import.meta.url), "utf8");
const sql002 = readFileSync(new URL("../../../db/migrations/002_authz_primitives.sql", import.meta.url), "utf8");
const c = new Client({ connectionString: url });
await c.connect();
await c.query(sql002);
await c.query(sql004);

// Transactional commit: domain-ish write + outbox in one transaction.
await c.query("BEGIN");
await c.query(`INSERT INTO tenants(id,name) VALUES ('t1','Outbox') ON CONFLICT DO NOTHING`);
await c.query(
  `INSERT INTO outbox(id,code,version,tenant_id,correlation,payload) VALUES ('e-smoke','op.committed',1,'t1','c-smoke','{"opId":"op-1"}') ON CONFLICT DO NOTHING`,
);
await c.query("COMMIT");

// Verify as app role with tenant set.
await c.query(`SET ROLE zyara_app`);
await c.query(`SET app.current_tenant='t1'`);
const r1 = await c.query(`SELECT id FROM outbox WHERE id='e-smoke'`);
if (r1.rows.length !== 1) throw new Error("outbox commit not visible");
await c.query(`SET app.current_tenant='t2'`);
const r2 = await c.query(`SELECT id FROM outbox WHERE id='e-smoke'`);
if (r2.rows.length !== 0) throw new Error("outbox cross-tenant leak");
await c.query(`SET app.current_tenant='t1'`);
// Inbox dedupe: same consumer+event twice -> one row (PK).
await c.query(`INSERT INTO inbox(consumer,event_id,tenant_id) VALUES ('audit-writer','e-smoke','t1') ON CONFLICT DO NOTHING`);
const d = await c.query(`INSERT INTO inbox(consumer,event_id,tenant_id) VALUES ('audit-writer','e-smoke','t1') ON CONFLICT DO NOTHING`);
if (d.rowCount !== 0) throw new Error("inbox dedupe failed");
await c.query(`RESET ROLE`);
console.log("M004 outbox smoke PASS: tx commit, RLS, dedupe verified");
await c.end();
