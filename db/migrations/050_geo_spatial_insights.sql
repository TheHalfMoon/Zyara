-- GEO-09: spatial insights — released aggregates (additive).
-- Authority: docs/canonical/ZYARA_GEOSPATIAL_PLATFORM_PLAN_2026-09-22.md §§16, 16A, 22 and
-- docs/evidence/GEO/GEO-09/WORK_PACKET.md.
--
-- SpatialAnalyticsCell != IndividualPatientLocation. Only released aggregates are stored: a
-- release header per tenant, metric and window (its governance, grid, scope, released total and
-- missing count) and its coarse cells. No table has a geometry, coordinate, patient, subject,
-- account or session column. The CHECKs make the cohort rules database facts, windows sit on a
-- fixed grid so releases never overlap, one person-count numerator is released once per window
-- (one grid, one scope), and rows are append-only for the application. Expired releases are
-- removed only by geo_purge_expired_insights().

CREATE TABLE IF NOT EXISTS geo_insight_releases (
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  branch_id TEXT,
  metric_id TEXT NOT NULL CHECK (metric_id ~ '^[A-Z][A-Z0-9_]{1,63}$'),
  subject_kind TEXT NOT NULL CHECK (subject_kind IN ('PERSON', 'FACILITY')),
  value_kind TEXT NOT NULL CHECK (value_kind IN ('COUNT', 'RATIO')),
  numerator TEXT NOT NULL CHECK (numerator ~ '^[a-z][a-z0-9_]{1,63}$'),
  denominator TEXT CHECK (denominator IS NULL OR denominator ~ '^[a-z][a-z0-9_]{1,63}$'),
  source TEXT NOT NULL CHECK (source ~ '^[a-z][a-z0-9_]{1,63}$'),
  purpose TEXT NOT NULL CHECK (purpose ~ '^[a-z][a-z0-9_]{1,63}$'),
  sensitive BOOLEAN NOT NULL,
  min_cohort INTEGER NOT NULL CHECK (min_cohort BETWEEN 1 AND 1000),
  -- Grid resolution in centi-degrees; nothing finer than 0.05° exists.
  resolution_cdeg INTEGER NOT NULL CHECK (resolution_cdeg IN (5, 10, 25, 50)),
  window_days INTEGER NOT NULL CHECK (window_days BETWEEN 1 AND 366),
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  -- Released units (a person counts once per cell and once in missing); NULL = withheld.
  total DOUBLE PRECISION CHECK (total IS NULL OR total >= 0),
  missing INTEGER CHECK (missing IS NULL OR missing >= 0),
  retention_days INTEGER NOT NULL CHECK (retention_days BETWEEN 1 AND 400),
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, metric_id, window_start, window_end),
  UNIQUE (tenant_id, metric_id, window_start, window_end, resolution_cdeg, subject_kind, value_kind, min_cohort),
  FOREIGN KEY (branch_id, tenant_id) REFERENCES branch_locations(id, tenant_id) ON DELETE RESTRICT,
  -- Fixed window grid: UTC midnight, a multiple of window_days days since the epoch.
  CHECK (window_end = window_start + make_interval(days => window_days)),
  CHECK (extract(epoch FROM window_start)::bigint % 86400 = 0),
  CHECK ((extract(epoch FROM window_start)::bigint / 86400) % window_days = 0),
  -- Only supply is facility-derived; every other metric is a person count or ratio.
  CHECK ((subject_kind = 'FACILITY') = (metric_id = 'SUPPLY_BY_CELL')),
  CHECK (value_kind <> 'RATIO' OR denominator IS NOT NULL),
  -- Minimum cohorts: person-derived >= 11; sensitive care intent >= 20 on a grid of >= 0.10°.
  CHECK (subject_kind <> 'PERSON' OR min_cohort >= 11),
  CHECK (NOT sensitive OR (subject_kind = 'PERSON' AND min_cohort >= 20 AND resolution_cdeg >= 10)),
  -- Released totals and missing counts obey the cohort too; counts are integers.
  CHECK (total IS NULL OR value_kind <> 'COUNT' OR total = trunc(total)),
  CHECK (total IS NULL OR subject_kind <> 'PERSON' OR value_kind <> 'COUNT' OR total >= min_cohort),
  CHECK (missing IS NULL OR subject_kind <> 'PERSON' OR missing = 0 OR missing >= min_cohort)
);

-- One release of a person-count numerator per window: it cannot also be released at another
-- grid, another scope or under another metric id and then differenced.
CREATE UNIQUE INDEX IF NOT EXISTS geo_insight_releases_person_numerator_uidx
  ON geo_insight_releases(tenant_id, numerator, source, window_start, window_end)
  WHERE subject_kind = 'PERSON' AND value_kind = 'COUNT';

CREATE TABLE IF NOT EXISTS geo_insight_cells (
  tenant_id TEXT NOT NULL,
  metric_id TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  -- Copied from the release header and pinned to it by the composite foreign key.
  resolution_cdeg INTEGER NOT NULL,
  subject_kind TEXT NOT NULL,
  value_kind TEXT NOT NULL,
  min_cohort INTEGER NOT NULL,
  cell_id TEXT NOT NULL CHECK (cell_id ~ '^g(5|10|25|50):-?[0-9]{1,5}:-?[0-9]{1,5}$'),
  value DOUBLE PRECISION CHECK (value IS NULL OR value >= 0),
  suppressed BOOLEAN NOT NULL,
  reason TEXT CHECK (reason IS NULL OR reason IN ('SUPPRESSED_LOW_COUNT', 'SUPPRESSED_COMPLEMENTARY', 'SUPPRESSED_NUMERATOR', 'NO_SUPPLY')),
  PRIMARY KEY (tenant_id, metric_id, window_start, window_end, cell_id),
  FOREIGN KEY (tenant_id, metric_id, window_start, window_end, resolution_cdeg, subject_kind, value_kind, min_cohort)
    REFERENCES geo_insight_releases(tenant_id, metric_id, window_start, window_end, resolution_cdeg, subject_kind, value_kind, min_cohort)
    ON DELETE RESTRICT,
  -- The cell id belongs to the release's grid.
  CHECK (split_part(cell_id, ':', 1) = 'g' || resolution_cdeg::text),
  -- Suppression is explicit: a suppressed cell has no value; a released one has a value unless
  -- the ratio has no supply.
  CHECK (NOT suppressed OR value IS NULL),
  CHECK (suppressed OR value IS NOT NULL OR reason = 'NO_SUPPLY'),
  CHECK (suppressed = (reason IS NOT NULL AND reason LIKE 'SUPPRESSED%')),
  CHECK (value IS NULL OR value_kind <> 'COUNT' OR value = trunc(value)),
  -- An unsuppressed person-derived count is never below its cohort.
  CHECK (suppressed OR subject_kind <> 'PERSON' OR value_kind <> 'COUNT' OR value >= min_cohort)
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
    -- Used only by the purge function (the application has no DELETE privilege).
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_purge', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR DELETE USING (tenant_id = current_setting(''app.current_tenant'', true))', t || '_purge', t);
  END LOOP;
END;
$$;

-- Live (unexpired) releases and cells; the application reads only these views. They run with the
-- owner's rights (the application has no SELECT on the base tables, so expired rows stay
-- unreadable) and therefore filter on app.current_tenant explicitly, as a security barrier.
CREATE OR REPLACE VIEW geo_insight_releases_live
WITH (security_barrier = true) AS
SELECT r.tenant_id, r.branch_id, r.metric_id, r.subject_kind, r.value_kind, r.numerator, r.denominator, r.source,
       r.purpose, r.sensitive, r.min_cohort, r.resolution_cdeg, r.window_days, r.window_start, r.window_end,
       r.total, r.missing, r.retention_days, r.computed_at
FROM geo_insight_releases r
WHERE r.tenant_id = current_setting('app.current_tenant', true)
  AND r.computed_at + make_interval(days => r.retention_days) > now();

CREATE OR REPLACE VIEW geo_insight_cells_live
WITH (security_barrier = true) AS
SELECT c.tenant_id, c.metric_id, c.window_start, c.window_end, c.resolution_cdeg, c.cell_id, c.value, c.suppressed, c.reason
FROM geo_insight_cells c
JOIN geo_insight_releases r
  ON r.tenant_id = c.tenant_id AND r.metric_id = c.metric_id AND r.window_start = c.window_start AND r.window_end = c.window_end
WHERE c.tenant_id = current_setting('app.current_tenant', true)
  AND r.computed_at + make_interval(days => r.retention_days) > now();

-- Retention enforcement: removes the current tenant's expired releases and their cells. Runs as
-- the owner (the application has no DELETE privilege) and is scoped to app.current_tenant even
-- when the owner bypasses row-level security.
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
    AND r.computed_at + make_interval(days => r.retention_days) <= now();
  DELETE FROM public.geo_insight_releases r
  WHERE r.tenant_id = tenant AND r.computed_at + make_interval(days => r.retention_days) <= now();
  GET DIAGNOSTICS purged = ROW_COUNT;
  RETURN purged;
END;
$$;

REVOKE ALL ON FUNCTION geo_purge_expired_insights() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION geo_purge_expired_insights() TO zyara_app;

GRANT SELECT ON geo_insight_releases_live, geo_insight_cells_live TO zyara_app;
-- Column-level INSERT: computed_at is always database time. No SELECT on the base tables, so
-- expired rows are never readable.
GRANT INSERT (tenant_id, branch_id, metric_id, subject_kind, value_kind, numerator, denominator, source, purpose,
  sensitive, min_cohort, resolution_cdeg, window_days, window_start, window_end, total, missing, retention_days)
  ON geo_insight_releases TO zyara_app;
GRANT INSERT (tenant_id, metric_id, window_start, window_end, resolution_cdeg, subject_kind, value_kind, min_cohort,
  cell_id, value, suppressed, reason) ON geo_insight_cells TO zyara_app;

-- ROLLBACK (manual, audited, only when no dependent data remains):
-- DROP VIEW IF EXISTS geo_insight_cells_live, geo_insight_releases_live;
-- DROP FUNCTION IF EXISTS geo_purge_expired_insights();
-- DROP TABLE IF EXISTS geo_insight_cells, geo_insight_releases;
