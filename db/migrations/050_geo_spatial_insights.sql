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
-- * one person-derived release per source over any overlapping time span (any window length,
--   grid, scope, metric id or numerator), via an exclusion constraint;
-- * windows on a fixed grid, UTC-length checked;
-- * complementary suppression re-checked at commit (hidden mass is 0 or >= cohort);
-- * a release is sealed to the transaction that created it (no cells added later);
-- * the retention purge keeps a tombstone header, so a purged slot is never re-released.

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS geo_insight_releases (
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  branch_id TEXT,
  metric_id TEXT NOT NULL CHECK (metric_id ~ '^[A-Z][A-Z0-9_]{1,63}$'),
  subject_kind TEXT NOT NULL CHECK (subject_kind IN ('PERSON', 'FACILITY')),
  numerator TEXT NOT NULL CHECK (numerator ~ '^[a-z][a-z0-9_]{1,63}$'),
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
  total INTEGER CHECK (total IS NULL OR total >= 0),
  missing INTEGER CHECK (missing IS NULL OR missing >= 0),
  retention_days INTEGER NOT NULL CHECK (retention_days BETWEEN 1 AND 400),
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Set only by geo_purge_expired_insights(); the header stays as a tombstone.
  purged_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, metric_id, window_start, window_end),
  UNIQUE (tenant_id, metric_id, window_start, window_end, resolution_cdeg, subject_kind, min_cohort),
  FOREIGN KEY (branch_id, tenant_id) REFERENCES branch_locations(id, tenant_id) ON DELETE RESTRICT,
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
  -- One person-derived release per source over any overlapping span: no second grid, scope,
  -- metric id, numerator or window length over the same people and time.
  EXCLUDE USING gist (tenant_id WITH =, source WITH =, tstzrange(window_start, window_end) WITH &&)
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

-- Seal: cells are written only in the transaction that created their release (now() is the
-- transaction start time), so a release cannot be extended later. SECURITY DEFINER because the
-- application has no SELECT on the base tables.
CREATE OR REPLACE FUNCTION geo_insight_cells_seal() RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.geo_insight_releases r
    WHERE r.tenant_id = NEW.tenant_id AND r.metric_id = NEW.metric_id
      AND r.window_start = NEW.window_start AND r.window_end = NEW.window_end
      AND r.computed_at = now() AND r.purged_at IS NULL
  ) THEN
    RAISE EXCEPTION 'cells are written only with their release, in one transaction' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS geo_insight_cells_seal ON geo_insight_cells;
CREATE TRIGGER geo_insight_cells_seal
  BEFORE INSERT ON geo_insight_cells
  FOR EACH ROW EXECUTE FUNCTION geo_insight_cells_seal();

-- Complementary suppression, re-checked at commit: with a released total, the hidden mass
-- (total minus visible cells minus a released missing count) is 0 or at least the cohort.
CREATE OR REPLACE FUNCTION geo_insight_releases_complement() RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  visible BIGINT;
  hidden BIGINT;
BEGIN
  IF NEW.total IS NULL OR NEW.subject_kind <> 'PERSON' THEN
    RETURN NULL;
  END IF;
  SELECT COALESCE(sum(c.value), 0) INTO visible FROM public.geo_insight_cells c
  WHERE c.tenant_id = NEW.tenant_id AND c.metric_id = NEW.metric_id
    AND c.window_start = NEW.window_start AND c.window_end = NEW.window_end AND NOT c.suppressed;
  hidden := NEW.total - visible - COALESCE(NEW.missing, 0);
  IF hidden < 0 OR (hidden > 0 AND hidden < NEW.min_cohort) THEN
    RAISE EXCEPTION 'released total leaves a hidden mass of % (must be 0 or >= %)', hidden, NEW.min_cohort USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS geo_insight_releases_complement ON geo_insight_releases;
CREATE CONSTRAINT TRIGGER geo_insight_releases_complement
  AFTER INSERT ON geo_insight_releases
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION geo_insight_releases_complement();

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
REVOKE ALL ON FUNCTION geo_insight_cells_seal(), geo_insight_releases_complement() FROM PUBLIC;

GRANT SELECT ON geo_insight_releases_live, geo_insight_cells_live TO zyara_app;
-- Column-level INSERT: computed_at is database time and purged_at belongs to the purge. No SELECT
-- on the base tables, so expired and purged rows are never readable.
GRANT INSERT (tenant_id, branch_id, metric_id, subject_kind, numerator, source, purpose, sensitive, min_cohort,
  resolution_cdeg, window_days, window_start, window_end, total, missing, retention_days)
  ON geo_insight_releases TO zyara_app;
GRANT INSERT (tenant_id, metric_id, window_start, window_end, resolution_cdeg, subject_kind, min_cohort,
  cell_id, value, suppressed, reason) ON geo_insight_cells TO zyara_app;

-- ROLLBACK (manual, audited, only when no dependent data remains):
-- DROP VIEW IF EXISTS geo_insight_cells_live, geo_insight_releases_live;
-- DROP FUNCTION IF EXISTS geo_purge_expired_insights(), geo_insight_cells_seal(), geo_insight_releases_complement();
-- DROP TABLE IF EXISTS geo_insight_cells, geo_insight_releases;
-- (btree_gist is left installed.)
