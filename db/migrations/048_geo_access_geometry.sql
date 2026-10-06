-- GEO-01B: entrances and service-area geometry (additive).
-- Authority: docs/canonical/ZYARA_GEOSPATIAL_PLATFORM_PLAN_2026-09-22.md §§6, 17 and
-- docs/evidence/GEO/GEO-01B/WORK_PACKET.md.
--
-- Entrances are their own facts (VerifiedEntrance != BuildingCentroid), each with a source and
-- freshness; accessibility is never inferred (an external dataset can only say UNKNOWN). A
-- service area is geometry for home/mobile care and never implies appointment availability.
-- Both tables are append-only for the application: a correction or closure is a superseding
-- row. Facility geometry only; no patient location.

CREATE EXTENSION IF NOT EXISTS postgis;

-- A service area must belong to a care service of the same tenant and branch. care_services.id
-- is already its primary key, so every existing row satisfies this unique index.
CREATE UNIQUE INDEX IF NOT EXISTS care_services_id_tenant_branch_uidx
  ON care_services(id, tenant_id, branch_id);

-- Public wayfinding text: not blank, no e-mail address, no 9+ digit run after removing
-- separators, not an all-digit identifier. Arabic-Indic and Persian digits count as digits.
CREATE OR REPLACE FUNCTION geo_public_text_ok(value TEXT) RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE
SET search_path = pg_catalog
AS $$
  -- Normalize first: Arabic-Indic and Persian digits to ASCII, a no-break space to a space.
  SELECT value IS NULL OR (
    regexp_replace(n.v, '[[:space:]]', '', 'g') <> ''
    AND n.v !~ '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'
    AND regexp_replace(n.v, '[[:space:]()+.-]', '', 'g') !~ '[0-9]{9,}'
    AND btrim(n.v) !~ '^[0-9]{7,}$'
  )
  FROM (SELECT translate(value, '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹' || chr(160), '01234567890123456789 ') AS v) AS n
$$;

CREATE TABLE IF NOT EXISTS geo_entrances (
  id TEXT NOT NULL CHECK (id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  tenant_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('MAIN', 'ACCESSIBLE', 'EMERGENCY', 'DROPOFF', 'PARKING', 'SERVICE')),
  point geometry NOT NULL CHECK (
    GeometryType(point) = 'POINT' AND ST_SRID(point) = 4326 AND ST_NDims(point) = 2 AND NOT ST_IsEmpty(point)
    AND ST_X(point) BETWEEN -180 AND 180 AND ST_Y(point) BETWEEN -90 AND 90
  ),
  label_ar TEXT CHECK (label_ar IS NULL OR char_length(label_ar) BETWEEN 1 AND 120),
  label_en TEXT CHECK (label_en IS NULL OR char_length(label_en) BETWEEN 1 AND 120),
  floor SMALLINT CHECK (floor IS NULL OR floor BETWEEN -10 AND 200),
  instructions_ar TEXT CHECK (instructions_ar IS NULL OR char_length(instructions_ar) BETWEEN 1 AND 500),
  instructions_en TEXT CHECK (instructions_en IS NULL OR char_length(instructions_en) BETWEEN 1 AND 500),
  step_free TEXT NOT NULL CHECK (step_free IN ('YES', 'NO', 'UNKNOWN')),
  lift TEXT NOT NULL CHECK (lift IN ('YES', 'NO', 'UNKNOWN')),
  accessible_toilet TEXT NOT NULL CHECK (accessible_toilet IN ('YES', 'NO', 'UNKNOWN')),
  accessible_parking TEXT NOT NULL CHECK (accessible_parking IN ('YES', 'NO', 'UNKNOWN')),
  source_kind TEXT NOT NULL CHECK (source_kind IN ('PROVIDER_ATTESTATION', 'ZYARA_VERIFICATION', 'REGULATOR_REGISTRY', 'EXTERNAL_DATASET')),
  source_ref TEXT NOT NULL CHECK (source_ref ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  source_revision TEXT NOT NULL CHECK (source_revision ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  verification_state TEXT NOT NULL CHECK (verification_state IN ('UNVERIFIED', 'PROVIDER_ATTESTED', 'VERIFIED', 'DISPUTED')),
  observed_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE')),
  supersedes_id TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (id, tenant_id, branch_id),
  FOREIGN KEY (branch_id, tenant_id) REFERENCES branch_locations(id, tenant_id) ON DELETE RESTRICT,
  FOREIGN KEY (supersedes_id, tenant_id, branch_id) REFERENCES geo_entrances(id, tenant_id, branch_id) ON DELETE RESTRICT,
  CHECK (supersedes_id IS NULL OR supersedes_id <> id),
  CHECK (expires_at > observed_at),
  CHECK (label_ar IS NOT NULL OR label_en IS NOT NULL),
  -- Public wayfinding text only, checked per field (see geo_public_text_ok).
  CHECK (geo_public_text_ok(label_ar) AND geo_public_text_ok(label_en) AND geo_public_text_ok(instructions_ar) AND geo_public_text_ok(instructions_en)),
  -- Accessibility is never inferred: an external dataset says UNKNOWN only.
  CHECK (source_kind <> 'EXTERNAL_DATASET' OR (step_free = 'UNKNOWN' AND lift = 'UNKNOWN' AND accessible_toilet = 'UNKNOWN' AND accessible_parking = 'UNKNOWN')),
  -- Any YES comes from an attested or verified provider/Zyara source.
  CHECK (
    'YES' NOT IN (step_free, lift, accessible_toilet, accessible_parking)
    OR (source_kind IN ('PROVIDER_ATTESTATION', 'ZYARA_VERIFICATION') AND verification_state IN ('PROVIDER_ATTESTED', 'VERIFIED'))
  ),
  CHECK (kind <> 'ACCESSIBLE' OR step_free = 'YES')
);

CREATE TABLE IF NOT EXISTS geo_service_areas (
  id TEXT NOT NULL CHECK (id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  tenant_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  area geometry NOT NULL CHECK (
    GeometryType(area) IN ('POLYGON', 'MULTIPOLYGON') AND ST_SRID(area) = 4326 AND ST_NDims(area) = 2
    AND NOT ST_IsEmpty(area) AND ST_IsValid(area) AND ST_NPoints(area) <= 10000
    AND ST_XMin(area) >= -180 AND ST_XMax(area) <= 180 AND ST_YMin(area) >= -90 AND ST_YMax(area) <= 90
    AND ST_Area(area::geography) <= 50000000000
  ),
  source_kind TEXT NOT NULL CHECK (source_kind IN ('PROVIDER_ATTESTATION', 'ZYARA_VERIFICATION', 'REGULATOR_REGISTRY', 'EXTERNAL_DATASET')),
  source_ref TEXT NOT NULL CHECK (source_ref ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  source_revision TEXT NOT NULL CHECK (source_revision ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  observed_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE')),
  supersedes_id TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (id, tenant_id, branch_id),
  FOREIGN KEY (branch_id, tenant_id) REFERENCES branch_locations(id, tenant_id) ON DELETE RESTRICT,
  -- Cross-branch linkage is impossible: the service belongs to this tenant and branch.
  FOREIGN KEY (service_id, tenant_id, branch_id) REFERENCES care_services(id, tenant_id, branch_id) ON DELETE RESTRICT,
  FOREIGN KEY (supersedes_id, tenant_id, branch_id) REFERENCES geo_service_areas(id, tenant_id, branch_id) ON DELETE RESTRICT,
  CHECK (supersedes_id IS NULL OR supersedes_id <> id),
  CHECK (expires_at > observed_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS geo_entrances_one_successor_uidx ON geo_entrances(tenant_id, supersedes_id) WHERE supersedes_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS geo_service_areas_one_successor_uidx ON geo_service_areas(tenant_id, supersedes_id) WHERE supersedes_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS geo_entrances_point_gix ON geo_entrances USING GIST (point);
CREATE INDEX IF NOT EXISTS geo_service_areas_area_gix ON geo_service_areas USING GIST (area);
CREATE INDEX IF NOT EXISTS geo_entrances_branch_idx ON geo_entrances(tenant_id, branch_id);
CREATE INDEX IF NOT EXISTS geo_service_areas_service_idx ON geo_service_areas(tenant_id, branch_id, service_id);

ALTER TABLE geo_entrances ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_entrances FORCE ROW LEVEL SECURITY;
ALTER TABLE geo_service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_service_areas FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS geo_entrance_select ON geo_entrances;
CREATE POLICY geo_entrance_select ON geo_entrances FOR SELECT USING (tenant_id = current_setting('app.current_tenant', true));
DROP POLICY IF EXISTS geo_entrance_insert ON geo_entrances;
CREATE POLICY geo_entrance_insert ON geo_entrances FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant', true));
DROP POLICY IF EXISTS geo_service_area_select ON geo_service_areas;
CREATE POLICY geo_service_area_select ON geo_service_areas FOR SELECT USING (tenant_id = current_setting('app.current_tenant', true));
DROP POLICY IF EXISTS geo_service_area_insert ON geo_service_areas;
CREATE POLICY geo_service_area_insert ON geo_service_areas FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

-- Current entrances: active, unexpired chain heads (RLS of the querying role applies).
CREATE OR REPLACE VIEW geo_current_entrances
WITH (security_invoker = true) AS
SELECT e.*
FROM geo_entrances e
WHERE e.status = 'ACTIVE'
  AND e.expires_at > now()
  AND NOT EXISTS (
    SELECT 1 FROM geo_entrances s WHERE s.supersedes_id = e.id AND s.tenant_id = e.tenant_id
  );

GRANT SELECT ON geo_entrances, geo_service_areas, geo_current_entrances TO zyara_app;
GRANT INSERT (id, tenant_id, branch_id, kind, point, label_ar, label_en, floor, instructions_ar, instructions_en,
  step_free, lift, accessible_toilet, accessible_parking, source_kind, source_ref, source_revision,
  verification_state, observed_at, expires_at, status, supersedes_id) ON geo_entrances TO zyara_app;
GRANT INSERT (id, tenant_id, branch_id, service_id, area, source_kind, source_ref, source_revision,
  observed_at, expires_at, status, supersedes_id) ON geo_service_areas TO zyara_app;

-- ROLLBACK (manual, audited, only when no dependent data remains):
-- DROP VIEW IF EXISTS geo_current_entrances;
-- DROP TABLE IF EXISTS geo_service_areas, geo_entrances;
-- DROP INDEX IF EXISTS care_services_id_tenant_branch_uidx;
-- DROP FUNCTION IF EXISTS geo_public_text_ok(TEXT);
