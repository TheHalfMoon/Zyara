// M006 graph smoke: migration applies, hierarchy + roles insert, RLS denies
// cross-tenant reads, external-id PK blocks identifier reuse.
import { readFileSync } from "node:fs";
import pkg from "pg";
const { Client } = pkg;

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("SKIP: no DATABASE_URL");
  process.exit(0);
}
const c = new Client({ connectionString: url });
await c.connect();
for (const f of ["002_authz_primitives.sql", "006_provider_graph.sql"]) {
  await c.query(readFileSync(new URL(`../../../db/migrations/${f}`, import.meta.url), "utf8"));
}
await c.query(`INSERT INTO organizations(id,tenant_id) VALUES ('o1','t1') ON CONFLICT DO NOTHING`);
await c.query(`INSERT INTO branch_locations(id,tenant_id,organization_id) VALUES ('b1','t1','o1') ON CONFLICT DO NOTHING`);
await c.query(`INSERT INTO practitioners(id,tenant_id,display_names) VALUES ('p1','t1','{"en":"Laila"}') ON CONFLICT DO NOTHING`);
await c.query(`INSERT INTO practitioner_roles(id,tenant_id,practitioner_id,branch_id,taxonomy,effective_from) VALUES ('r1','t1','p1','b1','derm','2026-01-01') ON CONFLICT DO NOTHING`);
await c.query(`INSERT INTO care_services(id,tenant_id,branch_id) VALUES ('s1','t1','b1') ON CONFLICT DO NOTHING`);
await c.query(`SET ROLE zyara_app`);
await c.query(`SET app.current_tenant='t1'`);
const ok = await c.query(`SELECT count(*)::int AS n FROM practitioner_roles`);
if (ok.rows[0].n !== 1) throw new Error("role not visible in own tenant");
await c.query(`SET app.current_tenant='t2'`);
const leak = await c.query(`SELECT count(*)::int AS n FROM practitioner_roles`);
if (leak.rows[0].n !== 0) throw new Error("cross-tenant graph leak");
await c.query(`RESET ROLE`);
let reused = false;
try {
  await c.query(`INSERT INTO external_identifiers(namespace,value,entity_id) VALUES ('sa-nhic','EXT-1','p1')`);
  await c.query(`INSERT INTO external_identifiers(namespace,value,entity_id) VALUES ('sa-nhic','EXT-1','p2')`);
} catch {
  reused = true;
}
if (!reused) throw new Error("identifier reuse not blocked");
console.log("M006 graph smoke PASS: hierarchy, RLS, identifier uniqueness verified");
await c.end();
