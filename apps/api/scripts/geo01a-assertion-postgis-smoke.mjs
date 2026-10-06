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

await expectDbError(
  () => client.query(A("geo-3d", { point: "ST_SetSRID(ST_MakePoint(46.6753, 24.7136, 600), 4326)", branch: "b1b" })),
  "23514",
  "a 3D point must be refused (the contract is lon/lat only)",
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
await expectDbError(() => client.query(A("geo-no-branch", { branch: "b-missing" })), "23503", "a nonexistent branch must be refused");
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
// Proven as the migration owner. Under zyara_app RLS the planner may prefer the branch index,
// because st_dwithin is not leakproof; nothing leaks either way.
if (!plan.rows.some((row) => /geo_location_assertions_point_gix/.test(row["QUERY PLAN"]))) fail("the GIST index must be usable for proximity");
await expectDbError(() => client.query(`DELETE FROM branch_locations WHERE id = 'b1'`), "23503", "a branch with location history cannot be deleted");

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

// ---------------------------------------------------------------------------
// GEO-01B: entrances and service-area geometry (migration 048), same GEO-01 smoke.
// ---------------------------------------------------------------------------
await client.query(`RESET ROLE`);
await client.query(`DROP VIEW IF EXISTS geo_current_entrances`);
await client.query(`DROP TABLE IF EXISTS geo_service_areas, geo_entrances CASCADE`);
await client.query(readFileSync(new URL("048_geo_access_geometry.sql", migrations), "utf8"));
await client.query(readFileSync(new URL("048_geo_access_geometry.sql", migrations), "utf8"));
await client.query(
  `INSERT INTO care_services(id,tenant_id,branch_id) VALUES ('svc-1','t1','b1'),('svc-b1b','t1','b1b'),('svc-t2','t2','b2') ON CONFLICT DO NOTHING`,
);
await client.query(`SET app.current_tenant='t1'`);

const NEAR = "ST_SetSRID(ST_MakePoint(46.6755, 24.7138), 4326)";
const E = (id, options = {}) => {
  const {
    tenant = "t1", branch = "b1", kind = "MAIN", point = NEAR, labelEn = "'Main entrance'", instructions = "NULL",
    stepFree = "YES", lift = "UNKNOWN", toilet = "UNKNOWN", parking = "UNKNOWN", sourceKind = "PROVIDER_ATTESTATION",
    state = "PROVIDER_ATTESTED", status = "ACTIVE", supersedes = "NULL", expires = "now() + interval '1 year'",
  } = options;
  return `INSERT INTO geo_entrances(id,tenant_id,branch_id,kind,point,label_en,instructions_en,step_free,lift,accessible_toilet,
     accessible_parking,source_kind,source_ref,source_revision,verification_state,observed_at,expires_at,status,supersedes_id)
   VALUES ('${id}','${tenant}','${branch}','${kind}',${point},${labelEn},${instructions},'${stepFree}','${lift}','${toilet}',
     '${parking}','${sourceKind}','src-1','r1','${state}',now() - interval '1 day',${expires},'${status}',${supersedes})`;
};
const SQUARE = "ST_SetSRID(ST_GeomFromText('POLYGON((46.665 24.704,46.685 24.704,46.685 24.722,46.665 24.722,46.665 24.704))'), 4326)";
const SA = (id, options = {}) => {
  const { tenant = "t1", branch = "b1", service = "svc-1", area = SQUARE, supersedes = "NULL" } = options;
  return `INSERT INTO geo_service_areas(id,tenant_id,branch_id,service_id,area,source_kind,source_ref,source_revision,observed_at,expires_at,status,supersedes_id)
   VALUES ('${id}','${tenant}','${branch}','${service}',${area},'PROVIDER_ATTESTATION','src-2','r1',now() - interval '1 day',now() + interval '1 year','ACTIVE',${supersedes})`;
};

await client.query(E("ent-1"));
await expectDbError(() => client.query(E("ent-ext", { sourceKind: "EXTERNAL_DATASET", state: "UNVERIFIED" })), "23514", "an external dataset cannot assert accessibility");
await expectDbError(() => client.query(E("ent-unver", { state: "UNVERIFIED" })), "23514", "an accessibility YES needs an attested or verified source");
await expectDbError(() => client.query(E("ent-acc", { kind: "ACCESSIBLE", stepFree: "NO" })), "23514", "an ACCESSIBLE entrance needs step-free access");
await expectDbError(() => client.query(E("ent-phone", { labelEn: "'Call 050 123 4567'" })), "23514", "labels must not carry phone numbers");
await expectDbError(() => client.query(E("ent-mail", { instructions: "'ask ahmad@example.test'" })), "23514", "instructions must not carry e-mail addresses");
await expectDbError(() => client.query(E("ent-nolabel", { labelEn: "NULL" })), "23514", "an entrance needs a public label");
await expectDbError(() => client.query(E("ent-arphone", { labelEn: "'اتصل ٠٥٠١٢٣٤٥٦٧'" })), "23514", "Arabic-Indic digits must not carry a phone number");
await expectDbError(() => client.query(E("ent-blank", { labelEn: "'   '" })), "23514", "a blank label must be refused");
await expectDbError(() => client.query(E("ent-tabs", { labelEn: "E'\\t\\n'" })), "23514", "a whitespace-only label must be refused");
await expectDbError(() => client.query(E("ent-nbsp", { labelEn: "'Call 050' || chr(160) || '123' || chr(160) || '4567'" })), "23514", "no-break spaces must not hide a phone number");
await client.query(E("ent-floors", { labelEn: "'Gate 3'", instructions: "'Level 2, room 12345'", supersedes: "NULL", kind: "SERVICE", stepFree: "NO" }));
await expectDbError(() => client.query(E("ent-srid", { point: "ST_SetSRID(ST_MakePoint(46.6755, 24.7138), 3857)" })), "23514", "an entrance point must be SRID 4326");
await expectDbError(() => client.query(E("ent-xb", { branch: "b2" })), "23503", "an entrance cannot reference another tenant's branch");

// Inactive and superseded entrances are history, never current.
await client.query(E("ent-2", { supersedes: "'ent-1'" }));
await client.query(E("ent-3", { kind: "PARKING", stepFree: "NO" }));
await client.query(E("ent-4", { kind: "PARKING", stepFree: "NO", supersedes: "'ent-3'", status: "INACTIVE" }));
await expectDbError(() => client.query(E("ent-fork", { supersedes: "'ent-1'" })), "23505", "an entrance has at most one successor");
await expectDbError(() => client.query(E("ent-xbranch", { branch: "b1b", supersedes: "'ent-2'" })), "23503", "entrance supersession cannot cross branches");
const currentE = await client.query(`SELECT id FROM geo_current_entrances ORDER BY id`);
if (JSON.stringify(currentE.rows.map((r) => r.id)) !== JSON.stringify(["ent-2", "ent-floors"])) fail(`current entrances must be [ent-2, ent-floors], got ${JSON.stringify(currentE.rows)}`);
const allE = await client.query(`SELECT count(*)::int AS n FROM geo_entrances`);
if (allE.rows[0].n !== 5) fail("entrance history must be preserved");

// Service areas: validity and same-branch linkage.
await client.query(SA("area-1"));
const BOWTIE = "ST_SetSRID(ST_GeomFromText('POLYGON((46.66 24.70,46.68 24.72,46.68 24.70,46.66 24.72,46.66 24.70))'), 4326)";
await expectDbError(() => client.query(SA("area-bowtie", { area: BOWTIE })), "23514", "a self-intersecting polygon must be refused");
await expectDbError(() => client.query(SA("area-line", { area: "ST_SetSRID(ST_GeomFromText('LINESTRING(46.66 24.70,46.68 24.72)'), 4326)" })), "23514", "a non-polygon area must be refused");
await expectDbError(() => client.query(SA("area-srid", { area: "ST_SetSRID(ST_GeomFromText('POLYGON((46.665 24.704,46.685 24.704,46.685 24.722,46.665 24.704))'), 0)" })), "23514", "an area without SRID 4326 must be refused");
await expectDbError(() => client.query(SA("area-huge", { area: "ST_SetSRID(ST_MakeEnvelope(35, 17, 55, 32), 4326)" })), "23514", "an area over 50 000 km2 must be refused");
await expectDbError(() => client.query(SA("area-xbranch", { service: "svc-b1b" })), "23503", "a service of another branch must be refused");
await expectDbError(() => client.query(SA("area-xtenant", { service: "svc-t2" })), "23503", "a service of another tenant must be refused");

await client.query(`SET ROLE zyara_app`);
await client.query(`SET app.current_tenant='t1'`);
await client.query(E("ent-5", { kind: "EMERGENCY", stepFree: "NO" }));
await expectDbError(() => client.query(`UPDATE geo_entrances SET step_free='YES' WHERE id='ent-3'`), "42501", "entrances are append-only (no UPDATE)", "permission denied");
await expectDbError(() => client.query(`DELETE FROM geo_service_areas WHERE id='area-1'`), "42501", "service areas are append-only (no DELETE)", "permission denied");
await expectDbError(() => client.query(SA("area-t2", { tenant: "t2", branch: "b2", service: "svc-t2" })), "42501", "a cross-tenant service area must be refused by RLS", "row-level security");
await client.query(`SET app.current_tenant='t2'`);
const foreignAccess = await client.query(`SELECT (SELECT count(*) FROM geo_entrances) + (SELECT count(*) FROM geo_service_areas) + (SELECT count(*) FROM geo_current_entrances) AS n`);
if (Number(foreignAccess.rows[0].n) !== 0) fail("tenant read isolation failed for entrances or service areas");
await client.query(`RESET ROLE`);

console.log(
  "GEO-01B access geometry PostGIS smoke PASS: entrance kinds and accessibility never inferred, public-safe labels, current entrances exclude inactive and superseded, valid same-branch service areas, append-only, tenant isolation",
);
await client.end();
