-- GEO-09: spatial insights — released aggregate counts (additive).
-- Authority: docs/canonical/ZYARA_GEOSPATIAL_PLATFORM_PLAN_2026-09-22.md §§16, 16A, 22 and
-- docs/evidence/GEO/GEO-09/WORK_PACKET.md.
--
-- SpatialAnalyticsCell != IndividualPatientLocation. Only released aggregate COUNTS are stored:
-- a release header per tenant, metric and window (governance, grid, scope, released total and
-- missing count) and its coarse cells. Ratios (capacity gap) are computed on read from released
-- demand and supply and are never stored. No table has a geometry, coordinate, patient, subject,
-- account or session column.
--
-- Differencing defences, all database facts:
-- * cohort CHECKs on cells, totals and missing counts;
-- * sources are migrator-managed and map to a population; one person-derived release per
--   population over any overlapping time span (any source, window length, grid, scope, metric id
--   or numerator), via an exclusion constraint;
-- * windows on a fixed grid, UTC-length checked;
-- * releases are written only by geo_publish_insight(), which writes header and cells in one
--   call and checks complementary suppression (hidden mass is 0 or >= cohort) inline, so no
--   constraint deferral or later cell write can bypass it;
-- * the retention purge keeps a tombstone header, so a purged slot is never re-released.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Insight sources: reference data managed by the migrator. Each source belongs to a population
-- of people (or facilities); a subset source (e.g. sensitive care requests) shares its parent
-- population, so the two can never both be released over one span.
CREATE TABLE IF NOT EXISTS geo_insight_sources (
  source TEXT PRIMARY KEY CHECK (source ~ '^[a-z][a-z0-9_]{1,63}$'),
  population TEXT NOT NULL CHECK (population ~ '^[a-z][a-z0-9_]{1,63}$'),
  subject_kind TEXT NOT NULL CHECK (subject_kind IN ('PERSON', 'FACILITY')),
  UNIQUE (source, population, subject_kind)
);
INSERT INTO geo_insight_sources(source, population, subject_kind) VALUES
  ('care_request_events', 'care_requests', 'PERSON'),
  ('sensitive_care_request_events', 'care_requests', 'PERSON'),
  ('geo_current_location_assertions', 'branch_locations', 'FACILITY')
ON CONFLICT (source) DO NOTHING;

CREATE TABLE IF NOT EXISTS geo_insight_releases (
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  branch_id TEXT,
  metric_id TEXT NOT NULL CHECK (metric_id ~ '^[A-Z][A-Z0-9_]{1,63}$'),
  subject_kind TEXT NOT NULL CHECK (subject_kind IN ('PERSON', 'FACILITY')),
  numerator TEXT NOT NULL CHECK (numerator ~ '^[a-z][a-z0-9_]{1,63}$'),
  source TEXT NOT NULL CHECK (source ~ '^[a-z][a-z0-9_]{1,63}$'),
  -- Copied from geo_insight_sources and pinned by the composite foreign key.
  population TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose ~ '^[a-z][a-z0-9_]{1,63}$'),
  sensitive BOOLEAN NOT NULL,
  min_cohort INTEGER NOT NULL CHECK (min_cohort BETWEEN 1 AND 1000),
  -- Grid resolution in centi-degrees; nothing finer than 0.05° exists.
  resolution_cdeg INTEGER NOT NULL CHECK (resolution_cdeg IN (5, 10, 25, 50)),
  window_days INTEGER NOT NULL CHECK (window_days BETWEEN 1 AND 366),
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  -- Released units (a person counts once per cell and once in missing); NULL = withheld.
  total INTEGER CHECK (total IS NULL OR total >= 0),
  missing INTEGER CHECK (missing IS NULL OR missing >= 0),
  retention_days INTEGER NOT NULL CHECK (retention_days BETWEEN 1 AND 400),
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Set only by geo_purge_expired_insights(); the header stays as a tombstone.
  purged_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, metric_id, window_start, window_end),
  UNIQUE (tenant_id, metric_id, window_start, window_end, resolution_cdeg, subject_kind, min_cohort),
  FOREIGN KEY (branch_id, tenant_id) REFERENCES branch_locations(id, tenant_id) ON DELETE RESTRICT,
  FOREIGN KEY (source, population, subject_kind) REFERENCES geo_insight_sources(source, population, subject_kind) ON DELETE RESTRICT,
  -- Fixed window grid: UTC midnight, a multiple of window_days days since the epoch, and an
  -- exact UTC length (independent of the session time zone).
  CHECK (extract(epoch FROM (window_end - window_start)) = window_days * 86400::numeric),
  CHECK (extract(epoch FROM window_start)::bigint % 86400 = 0),
  CHECK ((extract(epoch FROM window_start)::bigint / 86400) % window_days = 0),
  -- Only supply is facility-derived, and supply is the current branch-location count.
  CHECK ((subject_kind = 'FACILITY') = (metric_id = 'SUPPLY_BY_CELL')),
  CHECK (metric_id <> 'SUPPLY_BY_CELL' OR (numerator = 'current_branch_locations' AND source = 'geo_current_location_assertions')),
  -- Minimum cohorts: person-derived >= 11; sensitive care intent >= 20 on a grid of >= 0.10°.
  CHECK (subject_kind <> 'PERSON' OR min_cohort >= 11),
  CHECK (NOT sensitive OR (subject_kind = 'PERSON' AND min_cohort >= 20 AND resolution_cdeg >= 10)),
  -- Released totals and missing counts obey the cohort too.
  CHECK (total IS NULL OR subject_kind <> 'PERSON' OR total >= min_cohort),
  CHECK (missing IS NULL OR subject_kind <> 'PERSON' OR missing = 0 OR missing >= min_cohort),
  CHECK (purged_at IS NULL OR (total IS NULL AND missing IS NULL)),
  -- One person-derived release per population over any overlapping span: no second source,
  -- grid, scope, metric id, numerator or window length over the same people and time.
  EXCLUDE USING gist (tenant_id WITH =, population WITH =, tstzrange(window_start, window_end) WITH &&)
    WHERE (subject_kind = 'PERSON')
);

CREATE TABLE IF NOT EXISTS geo_insight_cells (
  tenant_id TEXT NOT NULL,
  metric_id TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  -- Copied from the release header and pinned to it by the composite foreign key.
  resolution_cdeg INTEGER NOT NULL,
  subject_kind TEXT NOT NULL,
  min_cohort INTEGER NOT NULL,
  cell_id TEXT NOT NULL CHECK (cell_id ~ '^g(5|10|25|50):-?[0-9]{1,5}:-?[0-9]{1,5}$'),
  value INTEGER CHECK (value IS NULL OR value >= 0),
  suppressed BOOLEAN NOT NULL,
  reason TEXT CHECK (reason IS NULL OR reason IN ('SUPPRESSED_LOW_COUNT', 'SUPPRESSED_COMPLEMENTARY')),
  -- The true count behind a suppressed cell is never stored: suppressed cells carry no value.
  PRIMARY KEY (tenant_id, metric_id, window_start, window_end, cell_id),
  FOREIGN KEY (tenant_id, metric_id, window_start, window_end, resolution_cdeg, subject_kind, min_cohort)
    REFERENCES geo_insight_releases(tenant_id, metric_id, window_start, window_end, resolution_cdeg, subject_kind, min_cohort)
    ON DELETE RESTRICT,
  -- The cell id belongs to the release's grid.
  CHECK (split_part(cell_id, ':', 1) = 'g' || resolution_cdeg::text),
  -- Suppression is explicit, with its reason, and a suppressed cell has no value.
  CHECK (suppressed = (value IS NULL)),
  CHECK (suppressed = (reason IS NOT NULL)),
  -- An unsuppressed person-derived count is never below its cohort.
  CHECK (suppressed OR subject_kind <> 'PERSON' OR value >= min_cohort)
);

ALTER TABLE geo_insight_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_insight_releases FORCE ROW LEVEL SECURITY;
ALTER TABLE geo_insight_cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_insight_cells FORCE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['geo_insight_releases', 'geo_insight_cells'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_select', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING (tenant_id = current_setting(''app.current_tenant'', true))', t || '_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_insert', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT WITH CHECK (tenant_id = current_setting(''app.current_tenant'', true))', t || '_insert', t);
  END LOOP;
END;
$$;
-- Used only by the purge function (the application has no UPDATE or DELETE privilege).
DROP POLICY IF EXISTS geo_insight_cells_purge ON geo_insight_cells;
CREATE POLICY geo_insight_cells_purge ON geo_insight_cells
  FOR DELETE USING (tenant_id = current_setting('app.current_tenant', true));
DROP POLICY IF EXISTS geo_insight_releases_purge ON geo_insight_releases;
CREATE POLICY geo_insight_releases_purge ON geo_insight_releases
  FOR UPDATE USING (tenant_id = current_setting('app.current_tenant', true));

-- Live (unexpired, unpurged) releases and cells; the application reads only these views. They
-- run with the owner's rights (the application has no SELECT on the base tables, so expired rows
-- stay unreadable) and therefore filter on app.current_tenant explicitly, as a security barrier.
CREATE OR REPLACE VIEW geo_insight_releases_live
WITH (security_barrier = true) AS
SELECT r.tenant_id, r.branch_id, r.metric_id, r.subject_kind, r.numerator, r.source, r.purpose, r.sensitive,
       r.min_cohort, r.resolution_cdeg, r.window_days, r.window_start, r.window_end, r.total, r.missing,
       r.retention_days, r.computed_at
FROM geo_insight_releases r
WHERE r.tenant_id = current_setting('app.current_tenant', true)
  AND r.purged_at IS NULL
  AND r.computed_at + make_interval(days => r.retention_days) > now();

CREATE OR REPLACE VIEW geo_insight_cells_live
WITH (security_barrier = true) AS
SELECT c.tenant_id, c.metric_id, c.window_start, c.window_end, c.resolution_cdeg, c.cell_id, c.value, c.suppressed, c.reason
FROM geo_insight_cells c
JOIN geo_insight_releases r
  ON r.tenant_id = c.tenant_id AND r.metric_id = c.metric_id AND r.window_start = c.window_start AND r.window_end = c.window_end
WHERE c.tenant_id = current_setting('app.current_tenant', true)
  AND r.purged_at IS NULL
  AND r.computed_at + make_interval(days => r.retention_days) > now();

-- The only write path. Writes the header and its cells in one call for the current tenant,
-- copies grid, subject kind and cohort from the header into every cell, and checks
-- complementary suppression inline. SECURITY DEFINER because the application has no INSERT or
-- SELECT on the base tables; the tenant always comes from app.current_tenant.
CREATE OR REPLACE FUNCTION geo_publish_insight(p_release JSONB, p_cells JSONB) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  tenant TEXT := current_setting('app.current_tenant', true);
  pop TEXT;
  h public.geo_insight_releases%ROWTYPE;
  visible BIGINT;
  hidden BIGINT;
BEGIN
  IF tenant IS NULL OR tenant = '' THEN
    RAISE EXCEPTION 'app.current_tenant is required' USING ERRCODE = '42501';
  END IF;
  IF p_release ? 'tenant_id' AND p_release->>'tenant_id' IS DISTINCT FROM tenant THEN
    RAISE EXCEPTION 'a release is published for the current tenant only' USING ERRCODE = '42501';
  END IF;
  SELECT s.population INTO pop FROM public.geo_insight_sources s WHERE s.source = p_release->>'source';
  IF pop IS NULL THEN
    RAISE EXCEPTION 'unknown insight source %', p_release->>'source' USING ERRCODE = '23503';
  END IF;
  INSERT INTO public.geo_insight_releases(tenant_id, branch_id, metric_id, subject_kind, numerator, source, population,
    purpose, sensitive, min_cohort, resolution_cdeg, window_days, window_start, window_end, total, missing, retention_days)
  VALUES (tenant, p_release->>'branch_id', p_release->>'metric_id', p_release->>'subject_kind', p_release->>'numerator',
    p_release->>'source', pop, p_release->>'purpose', (p_release->>'sensitive')::boolean, (p_release->>'min_cohort')::integer,
    (p_release->>'resolution_cdeg')::integer, (p_release->>'window_days')::integer, (p_release->>'window_start')::timestamptz,
    (p_release->>'window_end')::timestamptz, (p_release->>'total')::integer, (p_release->>'missing')::integer,
    (p_release->>'retention_days')::integer)
  RETURNING * INTO h;
  INSERT INTO public.geo_insight_cells(tenant_id, metric_id, window_start, window_end, resolution_cdeg, subject_kind,
    min_cohort, cell_id, value, suppressed, reason)
  SELECT tenant, h.metric_id, h.window_start, h.window_end, h.resolution_cdeg, h.subject_kind, h.min_cohort,
    c->>'cell_id', (c->>'value')::integer, (c->>'suppressed')::boolean, c->>'reason'
  FROM jsonb_array_elements(COALESCE(p_cells, '[]'::jsonb)) AS c;
  IF h.total IS NOT NULL AND h.subject_kind = 'PERSON' THEN
    SELECT COALESCE(sum(c.value), 0) INTO visible FROM public.geo_insight_cells c
    WHERE c.tenant_id = tenant AND c.metric_id = h.metric_id AND c.window_start = h.window_start
      AND c.window_end = h.window_end AND NOT c.suppressed;
    hidden := h.total - visible - COALESCE(h.missing, 0);
    IF hidden < 0 OR (hidden > 0 AND hidden < h.min_cohort) THEN
      RAISE EXCEPTION 'released total leaves a hidden mass of % (must be 0 or >= %)', hidden, h.min_cohort USING ERRCODE = '23514';
    END IF;
  END IF;
END;
$$;

-- Retention enforcement for the current tenant: deletes expired cells and turns each expired
-- header into a tombstone (counts cleared, key kept), so the slot is never re-released.
CREATE OR REPLACE FUNCTION geo_purge_expired_insights() RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  tenant TEXT := current_setting('app.current_tenant', true);
  purged INTEGER;
BEGIN
  IF tenant IS NULL OR tenant = '' THEN
    RAISE EXCEPTION 'app.current_tenant is required' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.geo_insight_cells c
  USING public.geo_insight_releases r
  WHERE r.tenant_id = tenant AND c.tenant_id = r.tenant_id AND c.metric_id = r.metric_id
    AND c.window_start = r.window_start AND c.window_end = r.window_end
    AND r.purged_at IS NULL AND r.computed_at + make_interval(days => r.retention_days) <= now();
  UPDATE public.geo_insight_releases r
  SET total = NULL, missing = NULL, purged_at = now()
  WHERE r.tenant_id = tenant AND r.purged_at IS NULL
    AND r.computed_at + make_interval(days => r.retention_days) <= now();
  GET DIAGNOSTICS purged = ROW_COUNT;
  RETURN purged;
END;
$$;

REVOKE ALL ON FUNCTION geo_purge_expired_insights() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION geo_purge_expired_insights() TO zyara_app;
REVOKE ALL ON FUNCTION geo_publish_insight(JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION geo_publish_insight(JSONB, JSONB) TO zyara_app;
GRANT SELECT ON geo_insight_sources TO zyara_app;

GRANT SELECT ON geo_insight_releases_live, geo_insight_cells_live TO zyara_app;
-- No INSERT, SELECT, UPDATE or DELETE on the base tables: releases are written only by
-- geo_publish_insight() and read only through the live views.

-- ROLLBACK (manual, audited, only when no dependent data remains):
-- DROP VIEW IF EXISTS geo_insight_cells_live, geo_insight_releases_live;
-- DROP FUNCTION IF EXISTS geo_purge_expired_insights(), geo_publish_insight(JSONB, JSONB);
-- DROP TABLE IF EXISTS geo_insight_cells, geo_insight_releases, geo_insight_sources;
-- (btree_gist is left installed.)
