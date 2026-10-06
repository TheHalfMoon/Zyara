// GEO-01A geo assertion persistence smoke: real PostgreSQL + PostGIS proof of SRID and range
// enforcement, mandatory provenance, precision rules, one append-only supersession chain per
// branch, branch FK integrity and tenant isolation; then GEO-01B access geometry (048) and
// GEO-01C conflation (049); then GEO-09 spatial insights (050).
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

// ---------------------------------------------------------------------------
// GEO-01C: external spatial identity and conflation (migration 049), same GEO-01 smoke.
// ---------------------------------------------------------------------------
await client.query(`RESET ROLE`);
await client.query(`DROP VIEW IF EXISTS geo_open_coordinate_conflicts, geo_active_external_links`);
await client.query(
  `DROP TABLE IF EXISTS geo_coordinate_conflict_resolutions, geo_coordinate_conflicts, geo_coordinate_corrections,
     geo_external_links, geo_external_observations, geo_external_namespaces CASCADE`,
);
await client.query(readFileSync(new URL("049_geo_conflation.sql", migrations), "utf8"));
await client.query(readFileSync(new URL("049_geo_conflation.sql", migrations), "utf8"));
await client.query(`INSERT INTO branch_locations(id,tenant_id,organization_id) VALUES ('b1c','t1','org-1') ON CONFLICT DO NOTHING`);

// Reference data: geocoder namespaces are never linkable; patterns are anchored.
await client.query(`INSERT INTO geo_external_namespaces VALUES ('geocoder-x', 'GEOCODER', '^[a-z0-9]{6,40}$', FALSE)`);
await expectDbError(() => client.query(`INSERT INTO geo_external_namespaces VALUES ('geocoder-y', 'GEOCODER', '^[a-z]+$', TRUE)`), "23514", "a geocoder namespace cannot be linkable");
await expectDbError(() => client.query(`INSERT INTO geo_external_namespaces VALUES ('loose-ns', 'OPEN_DATA', '[0-9]+', TRUE)`), "23514", "a namespace pattern must be anchored");

const FAR_PT = "ST_SetSRID(ST_MakePoint(46.725, 24.7136), 4326)";
const MOVE_81 = "ST_SetSRID(ST_MakePoint(46.6761, 24.7136), 4326)";
const OBS = (id, options = {}) => {
  const { tenant = "t1", ns = "osm-node", ext = "123456789", presence = "PRESENT", point = NEAR, name = "'Al Noor Clinic'" } = options;
  return `INSERT INTO geo_external_observations(id,tenant_id,namespace,external_id,presence,point,name,source_revision,observed_at)
   VALUES ('${id}','${tenant}','${ns}','${ext}','${presence}',${point},${name},'osm-r1',now())`;
};
const LINK = (id, options = {}) => {
  const {
    branch = "b1", ns = "osm-node", ext = "123456789", action = "LINK", unlinks = "NULL", basis = "REVIEWED_EVIDENCE",
    actorKind = "ZYARA_ADMIN", actor = "admin-1",
  } = options;
  return `INSERT INTO geo_external_links(id,tenant_id,branch_id,namespace,external_id,action,unlinks_id,basis,actor_kind,actor_ref,evidence_ref,reason_code)
   VALUES ('${id}','t1','${branch}','${ns}','${ext}','${action}',${unlinks},'${basis}','${actorKind}','${actor}','evidence-7','site_review')`;
};
const CORR = (id, from, to, options = {}) => {
  const { branch = "b1", actorKind = "ZYARA_ADMIN", actor = "admin-1", reviewer = "NULL" } = options;
  return `INSERT INTO geo_coordinate_corrections(id,tenant_id,branch_id,from_assertion_id,to_assertion_id,actor_kind,actor_ref,reviewer_ref,evidence_ref,reason_code)
   VALUES ('${id}','t1','${branch}','${from}','${to}','${actorKind}','${actor}',${reviewer},'evidence-8','site_visit_correction')`;
};
const CONFLICT = (id, assertionId, observationId, kind = "COORDINATE_MISMATCH") =>
  `INSERT INTO geo_coordinate_conflicts(id,tenant_id,branch_id,assertion_id,observation_id,kind) VALUES ('${id}','t1','b1','${assertionId}','${observationId}','${kind}')`;
const RESOLVE = (id, conflict, resolution, corrected = "NULL", actorKind = "ZYARA_ADMIN") =>
  `INSERT INTO geo_coordinate_conflict_resolutions(id,tenant_id,branch_id,resolves_id,resolution,corrected_assertion_id,actor_kind,actor_ref,evidence_ref,reason_code)
   VALUES ('${id}','t1','b1','${conflict}','${resolution}',${corrected},'${actorKind}','admin-1','evidence-9','conflict_review')`;
async function tx(...statements) {
  await client.query("BEGIN");
  try {
    for (const statement of statements) await client.query(statement);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

await client.query(`SET ROLE zyara_app`);
await client.query(`SET app.current_tenant='t1'`);
await expectDbError(() => client.query(`INSERT INTO geo_external_namespaces VALUES ('app-ns', 'OPEN_DATA', '^[0-9]+$', TRUE)`), "42501", "the application cannot add namespaces", "permission denied");

// Observations are evidence only, with namespace-bound ids and public names.
await client.query(OBS("obs-near"));
await client.query(OBS("obs-far", { point: FAR_PT }));
await client.query(OBS("obs-gone", { presence: "ABSENT", point: "NULL", name: "NULL" }));
await client.query(OBS("obs-other", { ext: "555", point: FAR_PT }));
await expectDbError(() => client.query(OBS("obs-badid", { ext: "0123" })), "23514", "an external id must match its namespace pattern");
await expectDbError(() => client.query(OBS("obs-unknown-ns", { ns: "google-place", ext: "abc" })), "23514", "an unknown namespace must be refused (guard trigger, before the foreign key)");
await expectDbError(() => client.query(OBS("obs-absent-pt", { presence: "ABSENT" })), "23514", "an absent observation has no point");
await expectDbError(() => client.query(OBS("obs-phone", { name: "'Call 0501234567'" })), "23514", "an external name must be public-safe");

// Canonical links: namespace-bound, one active link per id and per branch/namespace.
await expectDbError(() => client.query(LINK("link-geo", { ns: "geocoder-x", ext: "abc123def" })), "23514", "a geocoder id can never be linked");
await expectDbError(() => client.query(LINK("link-sys-review", { actorKind: "SYSTEM", actor: "conflation-service" })), "23514", "the automated actor cannot link on reviewed evidence");
await client.query(LINK("link-1"));
await expectDbError(() => client.query(LINK("link-dup-id", { branch: "b1b" })), "23514", "an external id has one active link", "already has an active link");
await expectDbError(() => client.query(LINK("link-dup-branch", { ext: "987654321" })), "23514", "a branch has one active link per namespace", "already has an active");
await client.query(LINK("link-sys", { branch: "b1b", ns: "osm-way", ext: "777", basis: "DETERMINISTIC_ID", actorKind: "SYSTEM", actor: "conflation-service" }));
await expectDbError(
  () => client.query(LINK("unlink-sys", { branch: "b1b", ns: "osm-way", ext: "777", action: "UNLINK", unlinks: "'link-sys'", basis: "DETERMINISTIC_ID", actorKind: "SYSTEM", actor: "conflation-service" })),
  "23514",
  "the automated actor never unlinks",
);

// Conflicts: measured by the database, never overwrite the assertion.
await client.query(CONFLICT("conflict-1", "geo-4", "obs-far"));
const conflictRow = await client.query(`SELECT distance_m FROM geo_open_coordinate_conflicts WHERE id='conflict-1'`);
if (!(conflictRow.rows[0]?.distance_m > 4000)) fail(`the conflict distance must be measured by the database, got ${JSON.stringify(conflictRow.rows)}`);
await expectDbError(() => client.query(CONFLICT("conflict-agree", "geo-4", "obs-near")), "23514", "agreement within tolerance is not a conflict");
await expectDbError(() => client.query(CONFLICT("conflict-old", "geo-3", "obs-far")), "23514", "a conflict is raised against the current assertion");
await expectDbError(() => client.query(CONFLICT("conflict-unlinked", "geo-4", "obs-other")), "23514", "an unlinked external id cannot raise a conflict");
await expectDbError(
  () => client.query(`INSERT INTO geo_coordinate_conflicts(id,tenant_id,branch_id,assertion_id,observation_id,kind,distance_m) VALUES ('conflict-forged','t1','b1','geo-4','obs-far','COORDINATE_MISMATCH',1)`),
  "42501",
  "a conflict distance cannot be supplied by the client",
  "permission denied",
);
await client.query(CONFLICT("conflict-2", "geo-4", "obs-gone", "EXTERNAL_ABSENT"));
const headAfterConflict = await client.query(`SELECT id, ST_X(point) AS x FROM geo_current_location_assertions WHERE branch_id='b1'`);
if (headAfterConflict.rows[0]?.id !== "geo-4" || Math.abs(headAfterConflict.rows[0].x - 46.6753) > 1e-9) fail("external data must not overwrite the assertion");
const activeAfterAbsent = await client.query(`SELECT count(*)::int AS n FROM geo_active_external_links WHERE branch_id='b1'`);
if (activeAfterAbsent.rows[0].n !== 1) fail("external disappearance must not delete the link");

// Unlink preserves history.
await client.query(LINK("unlink-1", { action: "UNLINK", unlinks: "'link-1'" }));
await expectDbError(() => client.query(LINK("unlink-again", { action: "UNLINK", unlinks: "'link-1'" })), "23505", "a link is ended once");
await expectDbError(() => client.query(LINK("unlink-mismatch", { action: "UNLINK", unlinks: "'link-sys'" })), "23503", "an unlink must match the link it ends");
const linkHistory = await client.query(`SELECT count(*)::int AS n FROM geo_external_links WHERE namespace='osm-node' AND external_id='123456789'`);
const linkActive = await client.query(`SELECT count(*)::int AS n FROM geo_active_external_links WHERE namespace='osm-node' AND external_id='123456789'`);
if (linkHistory.rows[0].n !== 2 || linkActive.rows[0].n !== 0) fail("unlink must end the link and keep its history");
await client.query(LINK("link-2"));

// Supersession authority: a low-authority external feed cannot overwrite verified truth.
const EXTERNAL_AREA = { ...UNVERIFIED, precision: "APPROXIMATE_AREA", accuracy: "500", sourceKind: "EXTERNAL_DATASET", sourceRef: "'osm-123456789'", visibility: "TENANT_INTERNAL" };
await expectDbError(() => client.query(A("geo-ext", { ...EXTERNAL_AREA, supersedes: "'geo-4'" })), "23514", "an external dataset cannot supersede a verified assertion");
await expectDbError(
  () => client.query(A("geo-prov", { supersedes: "'geo-4'", precision: "PROVIDER_ATTESTED_POINT", state: "PROVIDER_ATTESTED", method: "NULL", evidence: "NULL", sourceKind: "PROVIDER_ATTESTATION" })),
  "23514",
  "a provider point cannot replace a Zyara-verified point",
);

// A material move records evidence and actor; the database measures it.
await expectDbError(() => client.query(A("geo-5", { supersedes: "'geo-4'", point: MOVE_81 })), "23514", "a material move without a correction record must not commit", "correction record");
await expectDbError(() => tx(A("geo-5", { supersedes: "'geo-4'", point: MOVE_81 }), CORR("corr-sys", "geo-4", "geo-5", { actorKind: "SYSTEM" })), "23514", "the automated actor cannot correct coordinates");
await expectDbError(
  () => client.query(`INSERT INTO geo_coordinate_corrections(id,tenant_id,branch_id,from_assertion_id,to_assertion_id,actor_kind,actor_ref,evidence_ref,reason_code,moved_m) VALUES ('corr-forged','t1','b1','geo-4','geo-4','ZYARA_ADMIN','admin-1','e','x_y',0)`),
  "42501",
  "a moved distance cannot be supplied by the client",
  "permission denied",
);
await tx(A("geo-5", { supersedes: "'geo-4'", point: MOVE_81 }), CORR("corr-1", "geo-4", "geo-5"));
const corr1 = await client.query(`SELECT moved_m, actor_ref, evidence_ref FROM geo_coordinate_corrections WHERE id='corr-1'`);
if (!(corr1.rows[0]?.moved_m > 50 && corr1.rows[0].moved_m < 100) || corr1.rows[0].actor_ref !== "admin-1" || corr1.rows[0].evidence_ref !== "evidence-8") {
  fail(`the correction must record actor, evidence and the measured move, got ${JSON.stringify(corr1.rows)}`);
}

// A large move needs an independent reviewer.
await expectDbError(() => tx(A("geo-6", { supersedes: "'geo-5'", point: FAR_PT }), CORR("corr-2", "geo-5", "geo-6")), "23514", "a large move needs a reviewer", "independent reviewer");
await expectDbError(() => tx(A("geo-6", { supersedes: "'geo-5'", point: FAR_PT }), CORR("corr-2", "geo-5", "geo-6", { reviewer: "'admin-1'" })), "23514", "the reviewer must differ from the actor");
await tx(A("geo-6", { supersedes: "'geo-5'", point: FAR_PT }), CORR("corr-2", "geo-5", "geo-6", { reviewer: "'admin-2'" }));

// A detour through UNKNOWN is measured from the last known point.
await client.query(A("geo-7", { ...UNVERIFIED, supersedes: "'geo-6'", point: "NULL", accuracy: "NULL", precision: "UNKNOWN", visibility: "TENANT_INTERNAL" }));
await expectDbError(() => client.query(A("geo-8", { supersedes: "'geo-7'", point: RIYADH })), "23514", "a move after UNKNOWN still needs a correction", "correction record");
await expectDbError(() => tx(A("geo-8", { supersedes: "'geo-7'", point: RIYADH }), CORR("corr-3", "geo-7", "geo-8")), "23514", "a large move after UNKNOWN still needs a reviewer", "independent reviewer");
await tx(A("geo-8", { supersedes: "'geo-7'", point: RIYADH }), CORR("corr-3", "geo-7", "geo-8", { reviewer: "'admin-2'" }));

// A dispute flags without moving; a disputed head is resolved by Zyara verification only.
const PROVIDER_POINT = { precision: "PROVIDER_ATTESTED_POINT", method: "NULL", evidence: "NULL", sourceKind: "PROVIDER_ATTESTATION" };
await expectDbError(
  () => tx(A("geo-9", { ...PROVIDER_POINT, state: "DISPUTED", visibility: "TENANT_INTERNAL", supersedes: "'geo-8'", point: FAR_PT }), CORR("corr-9", "geo-8", "geo-9", { actorKind: "PROVIDER", actor: "provider-1", reviewer: "'admin-2'" })),
  "23514",
  "a dispute cannot move the point",
);
await client.query(A("geo-9", { ...PROVIDER_POINT, state: "DISPUTED", visibility: "TENANT_INTERNAL", supersedes: "'geo-8'" }));
await expectDbError(() => client.query(A("geo-10", { ...PROVIDER_POINT, state: "PROVIDER_ATTESTED", supersedes: "'geo-9'" })), "23514", "a provider cannot resolve a dispute of a verified point");
await client.query(A("geo-10", { supersedes: "'geo-9'" }));

// Small unaudited steps accumulate from the audited anchor (geo-8, a correction target).
const STEP_45 = "ST_SetSRID(ST_MakePoint(46.67575, 24.7136), 4326)";
const STEP_91 = "ST_SetSRID(ST_MakePoint(46.6762, 24.7136), 4326)";
await client.query(A("geo-11", { supersedes: "'geo-10'", point: STEP_45 }));
await expectDbError(() => client.query(A("geo-12", { supersedes: "'geo-11'", point: STEP_91 })), "23514", "small steps must not walk a facility without a correction", "correction record");
await tx(A("geo-12", { supersedes: "'geo-11'", point: STEP_91 }), CORR("corr-12", "geo-11", "geo-12"));
const corr12 = await client.query(`SELECT moved_m FROM geo_coordinate_corrections WHERE id='corr-12'`);
if (!(corr12.rows[0]?.moved_m > 85 && corr12.rows[0].moved_m < 100)) fail(`the correction must measure from the audited anchor, got ${JSON.stringify(corr12.rows)}`);

// Without any audited point (UNKNOWN root), the oldest point is the anchor; and audited moves
// without review cannot add up past 1 000 m from the last reviewed point.
const STEP_900 = "ST_SetSRID(ST_MakePoint(46.6842, 24.7136), 4326)";
const STEP_1800 = "ST_SetSRID(ST_MakePoint(46.6931, 24.7136), 4326)";
const B1C = { branch: "b1c" };
await client.query(A("geo-c-root", { ...UNVERIFIED, ...B1C, point: "NULL", accuracy: "NULL", precision: "UNKNOWN", visibility: "TENANT_INTERNAL" }));
await client.query(A("geo-c-1", { ...B1C, supersedes: "'geo-c-root'" }));
await expectDbError(() => client.query(A("geo-c-far", { ...B1C, supersedes: "'geo-c-1'", point: FAR_PT })), "23514", "a move after an UNKNOWN root needs a correction", "correction record");
await tx(A("geo-c-2", { ...B1C, supersedes: "'geo-c-1'", point: STEP_900 }), CORR("corr-c-2", "geo-c-1", "geo-c-2", { branch: "b1c", actor: "admin-3" }));
await expectDbError(
  () => tx(A("geo-c-3", { ...B1C, supersedes: "'geo-c-2'", point: STEP_1800 }), CORR("corr-c-3", "geo-c-2", "geo-c-3", { branch: "b1c", actor: "admin-3" })),
  "23514",
  "unreviewed audited moves cannot add up past 1 000 m",
  "independent reviewer",
);
await tx(A("geo-c-3", { ...B1C, supersedes: "'geo-c-2'", point: STEP_1800 }), CORR("corr-c-3", "geo-c-2", "geo-c-3", { branch: "b1c", actor: "admin-3", reviewer: "'admin-2'" }));

// Conflict resolution: reviewed, once, CORRECTED only with an audited correction.
await expectDbError(() => client.query(RESOLVE("res-sys", "conflict-1", "KEEP_ZYARA", "NULL", "SYSTEM")), "23514", "the automated actor cannot close a conflict");
await expectDbError(() => client.query(RESOLVE("res-bad", "conflict-1", "CORRECTED", "'geo-6'")), "23514", "CORRECTED needs a correction of the conflicted assertion");
await client.query(RESOLVE("res-1", "conflict-1", "CORRECTED", "'geo-5'"));
await client.query(RESOLVE("res-2", "conflict-2", "KEEP_ZYARA"));
await expectDbError(() => client.query(RESOLVE("res-again", "conflict-2", "EXTERNAL_ERROR")), "23505", "a conflict is resolved once");
const openConflicts = await client.query(`SELECT count(*)::int AS n FROM geo_open_coordinate_conflicts`);
const allConflicts = await client.query(`SELECT count(*)::int AS n FROM geo_coordinate_conflicts`);
if (openConflicts.rows[0].n !== 0 || allConflicts.rows[0].n !== 2) fail("resolved conflicts leave the open view and stay in history");

// Bulk control: an eleventh correction by one actor in 24 hours needs a reviewer.
const BULK_AREA = { ...UNVERIFIED, precision: "APPROXIMATE_AREA", accuracy: "400", branch: "b1b", visibility: "TENANT_INTERNAL" };
let previous = "geo-b1b-root";
for (let i = 1; i <= 10; i += 1) {
  await tx(A(`geo-bulk-${i}`, { ...BULK_AREA, supersedes: `'${previous}'` }), CORR(`corr-bulk-${i}`, previous, `geo-bulk-${i}`, { branch: "b1b", actor: "bulk-actor" }));
  previous = `geo-bulk-${i}`;
}
await expectDbError(
  () => tx(A("geo-bulk-11", { ...BULK_AREA, supersedes: `'${previous}'` }), CORR("corr-bulk-11", previous, "geo-bulk-11", { branch: "b1b", actor: "bulk-actor" })),
  "23514",
  "bulk corrections beyond the limit need a reviewer",
  "independent reviewer",
);
await tx(A("geo-bulk-11", { ...BULK_AREA, supersedes: `'${previous}'` }), CORR("corr-bulk-11", previous, "geo-bulk-11", { branch: "b1b", actor: "bulk-actor", reviewer: "'admin-2'" }));

// Concurrency: two sessions linking the same external id; the second must fail.
const other = new Client({ connectionString: url });
await other.connect();
await other.query(`SET ROLE zyara_app`);
await other.query(`SET app.current_tenant='t1'`);
await other.query("BEGIN");
await other.query(LINK("link-race-1", { ns: "osm-relation", ext: "4242" }));
const racing = client.query(LINK("link-race-2", { branch: "b1b", ns: "osm-relation", ext: "4242" })).then(
  () => null,
  (error) => error,
);
// Prove the second session is actually blocked on the advisory lock before the first commits.
let waiting = 0;
for (let attempt = 0; attempt < 50 && waiting === 0; attempt += 1) {
  await new Promise((resolve) => setTimeout(resolve, 100));
  const locks = await other.query(`SELECT count(*)::int AS n FROM pg_locks WHERE locktype = 'advisory' AND NOT granted`);
  waiting = locks.rows[0].n;
}
if (waiting === 0) fail("the concurrent link must wait on the advisory lock");
await other.query("COMMIT");
const raceError = await racing;
if (raceError?.code !== "23514") fail(`a concurrent second link must be refused, got ${raceError?.code ?? "success"}`);
await other.end();
// A snapshot older than the lock could miss a concurrent write: the guards accept READ
// COMMITTED only.
for (const level of ["REPEATABLE READ", "SERIALIZABLE"]) {
  for (const [statement, label] of [
    [LINK("link-iso", { ns: "osm-relation", ext: "4343" }), "link"],
    [CORR("corr-iso", "geo-b1b-root", "geo-bulk-1", { branch: "b1b", actor: "iso-actor" }), "correction"],
  ]) {
    await expectDbError(
      async () => {
        await client.query(`BEGIN ISOLATION LEVEL ${level}`);
        try {
          await client.query(statement);
        } finally {
          await client.query("ROLLBACK");
        }
      },
      "25000",
      `${label} writes refuse ${level}`,
    );
  }
}

// Append-only and tenant isolation.
for (const [statement, label] of [
  [`UPDATE geo_external_links SET branch_id='b1b' WHERE id='link-2'`, "update links"],
  [`DELETE FROM geo_external_links WHERE id='link-1'`, "delete links"],
  [`DELETE FROM geo_coordinate_corrections WHERE id='corr-1'`, "delete corrections"],
  [`UPDATE geo_coordinate_conflicts SET kind='EXTERNAL_ABSENT' WHERE id='conflict-1'`, "update conflicts"],
  [`DELETE FROM geo_external_observations WHERE id='obs-far'`, "delete observations"],
]) {
  await expectDbError(() => client.query(statement), "42501", `the application role must not ${label}`, "permission denied");
}
await expectDbError(() => client.query(OBS("obs-t2", { tenant: "t2" })), "42501", "a cross-tenant observation must be refused by RLS", "row-level security");
await client.query(`SET app.current_tenant='t2'`);
const foreignConflation = await client.query(
  `SELECT (SELECT count(*) FROM geo_external_observations) + (SELECT count(*) FROM geo_external_links)
        + (SELECT count(*) FROM geo_coordinate_corrections) + (SELECT count(*) FROM geo_coordinate_conflicts)
        + (SELECT count(*) FROM geo_coordinate_conflict_resolutions) + (SELECT count(*) FROM geo_active_external_links)
        + (SELECT count(*) FROM geo_open_coordinate_conflicts) AS n`,
);
if (Number(foreignConflation.rows[0].n) !== 0) fail("tenant read isolation failed for conflation tables");
await client.query(`RESET ROLE`);
const conflationPersonal = await client.query(
  `SELECT table_name, column_name FROM information_schema.columns
   WHERE table_name IN ('geo_external_observations','geo_external_links','geo_coordinate_corrections','geo_coordinate_conflicts','geo_coordinate_conflict_resolutions')
     AND column_name ~ '(patient|account|session|user|device)'`,
);
if (conflationPersonal.rows.length !== 0) fail(`patient or user columns must not exist: ${JSON.stringify(conflationPersonal.rows)}`);

console.log(
  "GEO-01C conflation PostGIS smoke PASS: namespace-bound external ids, no automated reviewed links or unlinks, one active link per id under concurrency, unlink keeps history, conflicts measured and never overwrite, low-authority supersession refused, material moves audited, large and bulk moves need a reviewer, append-only, tenant isolation",
);

// ---------------------------------------------------------------------------
// GEO-09: spatial insights released cells (migration 050), same GEO smoke.
// ---------------------------------------------------------------------------
await client.query(`RESET ROLE`);
await client.query(`DROP VIEW IF EXISTS geo_insight_cells_live`);
await client.query(`DROP TABLE IF EXISTS geo_insight_cells CASCADE`);
await client.query(readFileSync(new URL("050_geo_spatial_insights.sql", migrations), "utf8"));
await client.query(readFileSync(new URL("050_geo_spatial_insights.sql", migrations), "utf8"));

const INSIGHT = (cell, options = {}) => {
  const {
    tenant = "t1", branch = "NULL", metric = "DEMAND_BY_CELL", subject = "PERSON", valueKind = "COUNT", denominator = "NULL",
    sensitive = "FALSE", minCohort = 11, res = 5, value = "30", suppressed = "FALSE", reason = "NULL",
    start = "'2026-09-01T00:00:00Z'", end = "'2026-10-01T00:00:00Z'", extraColumns = "", extraValues = "",
  } = options;
  return `INSERT INTO geo_insight_cells(tenant_id,branch_id,metric_id,subject_kind,value_kind,numerator,denominator,source,purpose,
     sensitive,min_cohort,resolution_cdeg,cell_id,window_start,window_end,value,suppressed,reason,retention_days${extraColumns})
   VALUES ('${tenant}',${branch},'${metric}','${subject}','${valueKind}','distinct_people_with_care_request',${denominator},
     'care_request_events','network_planning',${sensitive},${minCohort},${res},'${cell}',${start},${end},${value},${suppressed},${reason},365${extraValues})`;
};

await client.query(`SET ROLE zyara_app`);
await client.query(`SET app.current_tenant='t1'`);

// Low-count suppression is a database fact.
await client.query(INSIGHT("g5:494:933"));
await expectDbError(() => client.query(INSIGHT("g5:493:934", { value: "5" })), "23514", "an unsuppressed person count below the cohort must be refused");
await expectDbError(() => client.query(INSIGHT("g5:493:934", { value: "5", suppressed: "TRUE", reason: "'SUPPRESSED_LOW_COUNT'" })), "23514", "a suppressed cell carries no value");
await client.query(INSIGHT("g5:493:934", { value: "NULL", suppressed: "TRUE", reason: "'SUPPRESSED_LOW_COUNT'" }));
await expectDbError(() => client.query(INSIGHT("g5:492:934", { value: "NULL", suppressed: "TRUE" })), "23514", "suppression is explicit with its reason");
await expectDbError(() => client.query(INSIGHT("g5:492:934", { minCohort: 5 })), "23514", "a person metric needs a cohort of at least 11");
await expectDbError(() => client.query(INSIGHT("g5:492:934", { metric: "SENSITIVE_DEMAND", sensitive: "TRUE" })), "23514", "a sensitive metric needs a cohort of at least 20");
await expectDbError(() => client.query(INSIGHT("g5:492:934", { metric: "SENSITIVE_DEMAND", sensitive: "TRUE", minCohort: 20 })), "23514", "a sensitive metric needs a coarser grid");
await client.query(INSIGHT("g10:247:466", { metric: "SENSITIVE_DEMAND", sensitive: "TRUE", minCohort: 20, res: 10, value: "25" }));
await client.query(INSIGHT("g5:494:933", { metric: "SUPPLY_BY_CELL", subject: "FACILITY", minCohort: 1, value: "2" }));

// No patient dots: coarse cell ids only, matching their resolution.
await expectDbError(() => client.query(INSIGHT("g10:247:466")), "23514", "a cell id must match its resolution");
await expectDbError(() => client.query(INSIGHT("24.7136,46.6753")), "23514", "a coordinate is not a cell id");
await expectDbError(() => client.query(INSIGHT("g1:2471:4667", { res: 1 })), "23514", "nothing finer than 0.05 degrees exists");

// Governance and ratios.
await expectDbError(() => client.query(INSIGHT("g5:492:934", { start: "'2025-01-01T00:00:00Z'" })), "23514", "a window is at most 366 days");
await expectDbError(() => client.query(INSIGHT("g5:492:934", { metric: "CAPACITY_GAP_BY_CELL", valueKind: "RATIO" })), "23514", "a ratio needs a denominator");
await client.query(INSIGHT("g5:493:934", { metric: "CAPACITY_GAP_BY_CELL", valueKind: "RATIO", denominator: "'current_branch_locations'", value: "NULL", reason: "'NO_SUPPLY'" }));
await client.query(INSIGHT("g5:494:933", { metric: "CAPACITY_GAP_BY_CELL", valueKind: "RATIO", denominator: "'current_branch_locations'", value: "15" }));

// Stable storage: one row per cell per window, append-only, database time.
await expectDbError(() => client.query(INSIGHT("g5:494:933", { value: "31" })), "23505", "a released cell cannot be recomputed into a second value");
await expectDbError(() => client.query(INSIGHT("g5:491:934", { extraColumns: ",computed_at", extraValues: ",'2020-01-01T00:00:00Z'" })), "42501", "computed_at is database time", "permission denied");
for (const [statement, label] of [
  [`UPDATE geo_insight_cells SET value = 3 WHERE cell_id = 'g5:494:933'`, "update"],
  [`DELETE FROM geo_insight_cells WHERE cell_id = 'g5:494:933'`, "delete"],
]) {
  await expectDbError(() => client.query(statement), "42501", `the application role must not ${label} released cells`, "permission denied");
}

// Tenant and branch isolation.
await expectDbError(() => client.query(INSIGHT("g5:494:933", { tenant: "t2" })), "42501", "a cross-tenant insight must be refused by RLS", "row-level security");
await expectDbError(() => client.query(INSIGHT("g5:490:934", { branch: "'b2'" })), "23503", "an insight cannot reference another tenant's branch");
const liveInsights = await client.query(`SELECT count(*)::int AS n FROM geo_insight_cells_live`);
if (liveInsights.rows[0].n !== 6) fail(`six released cells must be live, got ${liveInsights.rows[0].n}`);
await client.query(`SET app.current_tenant='t2'`);
const foreignInsights = await client.query(`SELECT (SELECT count(*) FROM geo_insight_cells) + (SELECT count(*) FROM geo_insight_cells_live) AS n`);
if (Number(foreignInsights.rows[0].n) !== 0) fail("tenant read isolation failed for insight cells");
await client.query(`RESET ROLE`);
const insightColumns = await client.query(
  `SELECT column_name FROM information_schema.columns
   WHERE table_name = 'geo_insight_cells'
     AND (udt_name = 'geometry' OR column_name ~ '(lat|lon|point|coord|patient|subject|account|session|user|device)')`,
);
if (insightColumns.rows.length !== 0) fail(`insight cells must carry no location or person columns: ${JSON.stringify(insightColumns.rows)}`);

console.log(
  "GEO-09 spatial insights PostGIS smoke PASS: unsuppressed small person counts refused, explicit suppression, cohort 11 and sensitive 20 on coarse grid, cell ids only, ratio governance, one row per cell per window, append-only, tenant and branch isolation, no location or person columns",
);
await client.end();
