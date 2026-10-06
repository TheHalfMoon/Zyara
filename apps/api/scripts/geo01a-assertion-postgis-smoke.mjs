// GEO-01A geo assertion persistence smoke: real PostgreSQL + PostGIS proof of SRID and range
// enforcement, mandatory provenance, precision rules, one append-only supersession chain per
// branch, branch FK integrity and tenant isolation.
// Requires DATABASE_URL pointing at PostgreSQL with the PostGIS extension available; skips
// otherwise.
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

for (const file of ["002_authz_primitives.sql", "006_provider_graph.sql", "038_workforce_graph.sql"]) {
  await client.query(readFileSync(new URL(file, migrations), "utf8"));
}
// The smoke owns its own table and rows.
await client.query(`DROP VIEW IF EXISTS geo_current_location_assertions`);
await client.query(`DROP TABLE IF EXISTS geo_location_assertions CASCADE`);
await client.query(readFileSync(new URL("047_geo_location_assertions.sql", migrations), "utf8"));
// Applying the migration twice must be a no-op.
await client.query(readFileSync(new URL("047_geo_location_assertions.sql", migrations), "utf8"));

await client.query(`INSERT INTO tenants(id,name) VALUES ('t1','Clinic One'),('t2','Clinic Two') ON CONFLICT DO NOTHING`);
await client.query(`INSERT INTO organizations(id,tenant_id) VALUES ('org-1','t1'),('org-2','t2') ON CONFLICT DO NOTHING`);
await client.query(
  `INSERT INTO branch_locations(id,tenant_id,organization_id)
   VALUES ('b1','t1','org-1'),('b1b','t1','org-1'),('b2','t2','org-2') ON CONFLICT DO NOTHING`,
);

function fail(message) {
  throw new Error(message);
}

async function expectDbError(run, sqlstate, label, messagePart = null) {
  try {
    await run();
  } catch (error) {
    if (error.code === sqlstate && (messagePart === null || error.message.includes(messagePart))) return;
    fail(`${label}: expected SQLSTATE ${sqlstate}${messagePart ? ` (${messagePart})` : ""}, got ${error.code}: ${error.message}`);
  }
  fail(`${label}: expected SQLSTATE ${sqlstate}, but the statement succeeded`);
}

const RIYADH = "ST_SetSRID(ST_MakePoint(46.6753, 24.7136), 4326)";
const A = (id, options = {}) => {
  const {
    tenant = "t1",
    branch = "b1",
    point = RIYADH,
    accuracy = "15",
    precision = "VERIFIED_ENTRANCE",
    state = "VERIFIED",
    method = "'site_visit'",
    evidence = "'evidence-1'",
    sourceKind = "ZYARA_VERIFICATION",
    sourceRef = "'verification-1'",
    sourceRevision = "'r1'",
    observed = "now() - interval '1 day'",
    expires = "now() + interval '1 year'",
    visibility = "PUBLIC_DIRECTORY",
    supersedes = "NULL",
  } = options;
  return `INSERT INTO geo_location_assertions(
     id,tenant_id,branch_id,point,accuracy_m,precision_class,verification_state,verification_method,
     evidence_ref,source_kind,source_ref,source_revision,observed_at,expires_at,visibility,supersedes_id)
   VALUES ('${id}','${tenant}','${branch}',${point},${accuracy},'${precision}','${state}',${method},
     ${evidence},'${sourceKind}',${sourceRef},${sourceRevision},${observed},${expires},'${visibility}',${supersedes})`;
};
const UNVERIFIED = { state: "UNVERIFIED", method: "NULL", evidence: "NULL" };

const version = await client.query(`SELECT postgis_lib_version() AS v`);
console.log(`PostGIS ${version.rows[0].v}`);

await client.query(`SET app.current_tenant='t1'`);
await client.query(A("geo-1"));

// Coordinates: SRID, range, type.
await expectDbError(() => client.query(A("geo-srid", { point: "ST_SetSRID(ST_MakePoint(46.6753, 24.7136), 3857)", branch: "b1b" })), "23514", "a point in another SRID must be refused");
await expectDbError(() => client.query(A("geo-nosrid", { point: "ST_MakePoint(46.6753, 24.7136)", branch: "b1b" })), "23514", "a point without SRID (SRID 0) must be refused, not coerced");
await expectDbError(() => client.query(A("geo-lat", { point: "ST_SetSRID(ST_MakePoint(46.6, 91), 4326)", branch: "b1b" })), "23514", "latitude above 90 must be refused");
await expectDbError(() => client.query(A("geo-lon", { point: "ST_SetSRID(ST_MakePoint(181, 24.7), 4326)", branch: "b1b" })), "23514", "longitude above 180 must be refused");
await expectDbError(
  () => client.query(A("geo-line", { point: "ST_SetSRID(ST_MakeLine(ST_MakePoint(46,24), ST_MakePoint(47,25)), 4326)", branch: "b1b" })),
  "23514",
  "a non-point geometry must be refused",
);

// Provenance and precision rules.
await expectDbError(() => client.query(A("geo-noref", { sourceRef: "NULL", branch: "b1b" })), "23502", "provenance source ref is mandatory");
await expectDbError(() => client.query(A("geo-norev", { sourceRevision: "''", branch: "b1b" })), "23514", "provenance revision is mandatory");
await expectDbError(() => client.query(A("geo-approx-entrance", { ...UNVERIFIED, branch: "b1b" })), "23514", "an unverified assertion cannot claim a verified entrance");
await expectDbError(() => client.query(A("geo-no-evidence", { evidence: "NULL", branch: "b1b" })), "23514", "a verified precision needs evidence");
await expectDbError(
  () => client.query(A("geo-external", { sourceKind: "EXTERNAL_DATASET", precision: "PROVIDER_ATTESTED_POINT", state: "PROVIDER_ATTESTED", method: "NULL", evidence: "NULL", branch: "b1b" })),
  "23514",
  "an external dataset cannot assert a provider-attested point",
);
await expectDbError(() => client.query(A("geo-unknown-point", { ...UNVERIFIED, precision: "UNKNOWN", branch: "b1b" })), "23514", "UNKNOWN has no point");
await expectDbError(() => client.query(A("geo-approx-noradius", { ...UNVERIFIED, precision: "APPROXIMATE_AREA", accuracy: "NULL", branch: "b1b" })), "23514", "an approximate area needs its radius");
await expectDbError(() => client.query(A("geo-radius", { ...UNVERIFIED, precision: "APPROXIMATE_AREA", accuracy: "50001", branch: "b1b" })), "23514", "an accuracy beyond 50 km is refused");
await expectDbError(() => client.query(A("geo-hidden-public", { ...UNVERIFIED, precision: "PRIVATE_HIDDEN", branch: "b1b" })), "23514", "a hidden point is never public");
await expectDbError(
  () => client.query(A("geo-disputed-public", { precision: "PROVIDER_ATTESTED_POINT", state: "DISPUTED", method: "NULL", evidence: "NULL", sourceKind: "PROVIDER_ATTESTATION", branch: "b1b" })),
  "23514",
  "a disputed point is never public",
);
await expectDbError(() => client.query(A("geo-time", { expires: "now() - interval '2 days'", branch: "b1b" })), "23514", "expires_at must be after observed_at");

// Branch integrity and the single chain.
await expectDbError(() => client.query(A("geo-x-branch", { branch: "b2" })), "23503", "a branch of another tenant must be refused");
await expectDbError(() => client.query(A("geo-second-root")), "23505", "a branch has exactly one root assertion");
await client.query(A("geo-2", { supersedes: "'geo-1'", accuracy: "8" }));
await expectDbError(() => client.query(A("geo-fork", { supersedes: "'geo-1'" })), "23505", "an assertion has at most one successor (no fork)");
await client.query(A("geo-b1b-root", { ...UNVERIFIED, precision: "APPROXIMATE_AREA", accuracy: "400", branch: "b1b", visibility: "TENANT_INTERNAL" }));
await expectDbError(() => client.query(A("geo-cross-branch", { branch: "b1b", supersedes: "'geo-2'" })), "23503", "supersession cannot cross into another branch");
await expectDbError(() => client.query(A("geo-self", { supersedes: "'geo-self'", branch: "b1b" })), "23514", "an assertion cannot supersede itself");
// A dispute removes verified status: the superseding row carries a lower precision.
await client.query(
  A("geo-3", { supersedes: "'geo-2'", precision: "PROVIDER_ATTESTED_POINT", state: "DISPUTED", method: "NULL", evidence: "NULL", sourceKind: "PROVIDER_ATTESTATION", visibility: "TENANT_INTERNAL" }),
);

const current = await client.query(`SELECT id FROM geo_current_location_assertions WHERE branch_id='b1'`);
if (current.rows.length !== 1 || current.rows[0].id !== "geo-3") fail(`current assertion for b1 must be geo-3, got ${JSON.stringify(current.rows)}`);
const history = await client.query(`SELECT count(*)::int AS n FROM geo_location_assertions WHERE branch_id='b1'`);
if (history.rows[0].n !== 3) fail(`supersession must preserve history, got ${history.rows[0].n} rows`);

// Spatial index use for proximity (planner sanity, not a performance claim).
await client.query(`SET enable_seqscan = off`);
const plan = await client.query(
  `EXPLAIN SELECT id FROM geo_location_assertions WHERE ST_DWithin(point, ST_SetSRID(ST_MakePoint(46.67, 24.71), 4326), 0.05)`,
);
await client.query(`RESET enable_seqscan`);
if (!plan.rows.some((row) => /geo_location_assertions_point_gix/.test(row["QUERY PLAN"]))) fail("the GIST index must be usable for proximity");

await client.query(`SET ROLE zyara_app`);
await client.query(`SET app.current_tenant='t1'`);
await client.query(A("geo-4", { supersedes: "'geo-3'" }));
for (const [statement, label] of [
  [`UPDATE geo_location_assertions SET precision_class='VERIFIED_ENTRANCE' WHERE id='geo-3'`, "update"],
  [`DELETE FROM geo_location_assertions WHERE id='geo-1'`, "delete"],
  [`INSERT INTO geo_location_assertions(id,tenant_id,branch_id,point,accuracy_m,precision_class,verification_state,verification_method,evidence_ref,source_kind,source_ref,source_revision,observed_at,expires_at,visibility,supersedes_id,recorded_at)
    VALUES ('geo-backdated','t1','b1b',${RIYADH},400,'APPROXIMATE_AREA','UNVERIFIED',NULL,NULL,'ZYARA_VERIFICATION','v','r',now(),now() + interval '1 day','TENANT_INTERNAL','geo-b1b-root','2020-01-01')`, "recorded_at"],
]) {
  await expectDbError(() => client.query(statement), "42501", `the application role must not ${label} history`, "permission denied");
}
await expectDbError(() => client.query(A("geo-t2", { tenant: "t2", branch: "b2" })), "42501", "a cross-tenant insert must be refused by RLS", "row-level security");

await client.query(`SET app.current_tenant='t2'`);
const foreign = await client.query(`SELECT count(*)::int AS n FROM geo_location_assertions`);
const foreignCurrent = await client.query(`SELECT count(*)::int AS n FROM geo_current_location_assertions`);
if (foreign.rows[0].n !== 0 || foreignCurrent.rows[0].n !== 0) fail("tenant read isolation failed for geo assertions");

await client.query(`RESET ROLE`);
const patientColumns = await client.query(
  `SELECT column_name FROM information_schema.columns
   WHERE table_name = 'geo_location_assertions'
     AND column_name ~ '(patient|account|session|user|device)'`,
);
if (patientColumns.rows.length !== 0) fail(`patient or user location columns must not exist: ${JSON.stringify(patientColumns.rows)}`);

console.log(
  "GEO-01A geo assertion PostGIS smoke PASS: SRID 4326 and range enforced, mandatory provenance, precision rules, one append-only chain per branch, branch FK integrity, GIST proximity index, tenant isolation, no patient location",
);
await client.end();
