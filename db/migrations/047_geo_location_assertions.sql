-- GEO-01A: geo location assertions with precision, provenance and supersession (additive).
-- Authority: docs/canonical/ZYARA_GEOSPATIAL_PLATFORM_PLAN_2026-09-22.md §§4-6 and
-- docs/evidence/GEO/GEO-01A/WORK_PACKET.md.
--
-- PostGIS owns facility geometry truth. Each row asserts where a branch location is, how
-- precisely, from which source, and which earlier assertion it supersedes. Rows are
-- append-only for the application (no UPDATE or DELETE grant): a correction or dispute is a
-- new superseding row. There is no patient, account or session location here: only facility
-- points keyed to branch_locations.

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS geo_location_assertions (
  id TEXT NOT NULL CHECK (id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  tenant_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  -- WGS84 with explicit SRID; NULL only for UNKNOWN. An untyped geometry column with explicit
  -- CHECKs, because a geometry(Point, 4326) typmod silently coerces an SRID-0 (unknown SRID)
  -- input to 4326 instead of refusing it.
  point geometry,
  accuracy_m DOUBLE PRECISION CHECK (accuracy_m IS NULL OR (accuracy_m > 0 AND accuracy_m <= 50000)),
  precision_class TEXT NOT NULL CHECK (precision_class IN (
    'VERIFIED_ENTRANCE', 'VERIFIED_PARCEL', 'VERIFIED_BUILDING_CENTROID',
    'PROVIDER_ATTESTED_POINT', 'APPROXIMATE_AREA', 'PRIVATE_HIDDEN', 'UNKNOWN'
  )),
  verification_state TEXT NOT NULL CHECK (verification_state IN ('UNVERIFIED', 'PROVIDER_ATTESTED', 'VERIFIED', 'DISPUTED')),
  verification_method TEXT CHECK (verification_method IS NULL OR verification_method ~ '^[a-z][a-z0-9_]{1,63}$'),
  evidence_ref TEXT CHECK (evidence_ref IS NULL OR evidence_ref ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  -- Mandatory provenance.
  source_kind TEXT NOT NULL CHECK (source_kind IN ('PROVIDER_ATTESTATION', 'ZYARA_VERIFICATION', 'REGULATOR_REGISTRY', 'EXTERNAL_DATASET')),
  source_ref TEXT NOT NULL CHECK (source_ref ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  source_revision TEXT NOT NULL CHECK (source_revision ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  observed_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  visibility TEXT NOT NULL CHECK (visibility IN ('PUBLIC_DIRECTORY', 'TENANT_INTERNAL')),
  supersedes_id TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (id, tenant_id, branch_id),
  FOREIGN KEY (branch_id, tenant_id) REFERENCES branch_locations(id, tenant_id) ON DELETE RESTRICT,
  -- Supersession stays within one tenant and branch.
  FOREIGN KEY (supersedes_id, tenant_id, branch_id)
    REFERENCES geo_location_assertions(id, tenant_id, branch_id) ON DELETE RESTRICT,
  CHECK (supersedes_id IS NULL OR supersedes_id <> id),
  CHECK (expires_at > observed_at),
  -- Point type, explicit SRID 4326 and coordinates in range.
  CHECK (point IS NULL OR (
    GeometryType(point) = 'POINT'
    AND ST_SRID(point) = 4326
    AND NOT ST_IsEmpty(point)
    AND ST_X(point) BETWEEN -180 AND 180
    AND ST_Y(point) BETWEEN -90 AND 90
  )),
  -- Rule 5: UNKNOWN has no point; every other class has one.
  CHECK ((precision_class = 'UNKNOWN') = (point IS NULL)),
  -- Rule 4: an approximate area needs its radius.
  CHECK (precision_class <> 'APPROXIMATE_AREA' OR accuracy_m IS NOT NULL),
  -- Rule 1: verified precision <-> VERIFIED state, with method and evidence.
  CHECK ((precision_class IN ('VERIFIED_ENTRANCE', 'VERIFIED_PARCEL', 'VERIFIED_BUILDING_CENTROID')) = (verification_state = 'VERIFIED')),
  CHECK (verification_state <> 'VERIFIED' OR (verification_method IS NOT NULL AND evidence_ref IS NOT NULL)),
  -- Rule 2: a provider-attested point is attested (or disputed) and comes from the provider or Zyara.
  CHECK (precision_class <> 'PROVIDER_ATTESTED_POINT' OR (
    verification_state IN ('PROVIDER_ATTESTED', 'DISPUTED')
    AND source_kind IN ('PROVIDER_ATTESTATION', 'ZYARA_VERIFICATION')
  )),
  -- Rule 3: ProviderGraphLocation != BasemapFeature.
  CHECK (source_kind <> 'EXTERNAL_DATASET' OR precision_class IN ('APPROXIMATE_AREA', 'UNKNOWN')),
  -- Rules 6 and 7: hidden and disputed points never reach the public directory.
  CHECK (precision_class <> 'PRIVATE_HIDDEN' OR visibility = 'TENANT_INTERNAL'),
  CHECK (verification_state <> 'DISPUTED' OR visibility = 'TENANT_INTERNAL')
);

-- One chain per branch: a single root, and at most one successor per assertion.
CREATE UNIQUE INDEX IF NOT EXISTS geo_location_assertions_one_root_uidx
  ON geo_location_assertions(tenant_id, branch_id) WHERE supersedes_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS geo_location_assertions_one_successor_uidx
  ON geo_location_assertions(supersedes_id) WHERE supersedes_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS geo_location_assertions_point_gix
  ON geo_location_assertions USING GIST (point);
CREATE INDEX IF NOT EXISTS geo_location_assertions_branch_idx
  ON geo_location_assertions(tenant_id, branch_id);

ALTER TABLE geo_location_assertions ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_location_assertions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS geo_location_assertion_select ON geo_location_assertions;
CREATE POLICY geo_location_assertion_select ON geo_location_assertions
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant', true));
DROP POLICY IF EXISTS geo_location_assertion_insert ON geo_location_assertions;
CREATE POLICY geo_location_assertion_insert ON geo_location_assertions
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

-- The head of each branch's chain: the assertion nothing supersedes. security_invoker keeps
-- the querying role's RLS in force (as in 045).
CREATE OR REPLACE VIEW geo_current_location_assertions
WITH (security_invoker = true) AS
SELECT a.*
FROM geo_location_assertions a
WHERE NOT EXISTS (
  SELECT 1 FROM geo_location_assertions s
  WHERE s.supersedes_id = a.id AND s.tenant_id = a.tenant_id
);

GRANT SELECT ON geo_location_assertions, geo_current_location_assertions TO zyara_app;
-- Column-level INSERT: recorded_at is always the database's own now().
GRANT INSERT (id, tenant_id, branch_id, point, accuracy_m, precision_class, verification_state,
  verification_method, evidence_ref, source_kind, source_ref, source_revision, observed_at,
  expires_at, visibility, supersedes_id) ON geo_location_assertions TO zyara_app;

-- ROLLBACK (manual, audited, only when no dependent data remains):
-- DROP VIEW IF EXISTS geo_current_location_assertions;
-- DROP TABLE IF EXISTS geo_location_assertions;
-- (The postgis extension is left installed; later GEO slices depend on it.)
