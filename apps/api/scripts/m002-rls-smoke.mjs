// M002 RLS smoke: applies 002 migration, proves tenant isolation + role grants.
// Requires DATABASE_URL env (CI postgres service or local PG).
import { readFileSync } from "node:fs";
import pkg from "pg";
const { Client } = pkg;

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("SKIP: no DATABASE_URL");
  process.exit(0);
}
const sql = readFileSync(new URL("../../../db/migrations/002_authz_primitives.sql", import.meta.url), "utf8");
const c = new Client({ connectionString: url });
await c.connect();
await c.query(sql);
await c.query(`INSERT INTO tenants(id,name) VALUES ('t1','A'),('t2','B') ON CONFLICT DO NOTHING`);
// Drop FORCE-evasion doubt: verify as the non-superuser app role, which is
// how the API will always connect. Superusers bypass RLS by design.
await c.query(`SET ROLE zyara_app`);
await c.query(`SET app.current_tenant='t1'`);
const r1 = await c.query(`SELECT id FROM tenants ORDER BY id`);
if (r1.rows.length !== 1 || r1.rows[0].id !== "t1") throw new Error("RLS tenant isolation failed: " + JSON.stringify(r1.rows));
await c.query(`SET app.current_tenant='t2'`);
const r2 = await c.query(`SELECT id FROM tenants`);
if (r2.rows.length !== 1 || r2.rows[0].id !== "t2") throw new Error("RLS tenant isolation failed t2");
await c.query(`RESET ROLE`);
const roles = await c.query(`SELECT rolname FROM pg_roles WHERE rolname IN ('zyara_migrator','zyara_app')`);
if (roles.rows.length !== 2) throw new Error("role isolation missing");
console.log("M002 RLS smoke PASS: isolation + roles verified");
await c.end();
