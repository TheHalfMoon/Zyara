-- GEO-09: spatial insights — released aggregate cells (additive).
-- Authority: docs/canonical/ZYARA_GEOSPATIAL_PLATFORM_PLAN_2026-09-22.md §§16, 16A, 22 and
-- docs/evidence/GEO/GEO-09/WORK_PACKET.md.
--
-- SpatialAnalyticsCell != IndividualPatientLocation. This table stores only released aggregates:
-- one row per tenant, metric, window and coarse cell. It has no geometry, coordinate, patient,
-- subject, account or session column. The CHECKs make the minimum-cohort rule a database fact:
-- an unsuppressed person-derived count below its cohort cannot be stored. Rows are append-only
-- for the application; recomputing a window cannot overwrite a released value.

CREATE TABLE IF NOT EXISTS geo_insight_cells (
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
  cell_id TEXT NOT NULL CHECK (cell_id ~ '^g(5|10|25|50):-?[0-9]{1,5}:-?[0-9]{1,5}$'),
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  value DOUBLE PRECISION CHECK (value IS NULL OR value >= 0),
  suppressed BOOLEAN NOT NULL,
  reason TEXT CHECK (reason IS NULL OR reason IN ('SUPPRESSED_LOW_COUNT', 'SUPPRESSED_COMPLEMENTARY', 'SUPPRESSED_NUMERATOR', 'NO_SUPPLY')),
  retention_days INTEGER NOT NULL CHECK (retention_days BETWEEN 1 AND 400),
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, metric_id, window_start, window_end, cell_id),
  FOREIGN KEY (branch_id, tenant_id) REFERENCES branch_locations(id, tenant_id) ON DELETE RESTRICT,
  -- The cell id belongs to the declared resolution.
  CHECK (split_part(cell_id, ':', 1) = 'g' || resolution_cdeg::text),
  CHECK (window_end > window_start AND window_end - window_start <= interval '366 days'),
  CHECK (value_kind <> 'RATIO' OR denominator IS NOT NULL),
  -- Suppression is explicit: a suppressed cell has no value, a released one has a value unless
  -- the ratio has no supply.
  CHECK (NOT suppressed OR value IS NULL),
  CHECK (suppressed OR value IS NOT NULL OR reason = 'NO_SUPPLY'),
  CHECK (suppressed = (reason IS NOT NULL AND reason LIKE 'SUPPRESSED%')),
  -- Minimum cohorts: person-derived >= 11; sensitive care intent >= 20 on a grid of >= 0.10°.
  CHECK (subject_kind <> 'PERSON' OR min_cohort >= 11),
  CHECK (NOT sensitive OR (subject_kind = 'PERSON' AND min_cohort >= 20 AND resolution_cdeg >= 10)),
  -- An unsuppressed person-derived count is never below its cohort.
  CHECK (suppressed OR subject_kind <> 'PERSON' OR value_kind <> 'COUNT' OR value >= min_cohort)
);

CREATE INDEX IF NOT EXISTS geo_insight_cells_metric_idx
  ON geo_insight_cells(tenant_id, metric_id, window_end);

ALTER TABLE geo_insight_cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_insight_cells FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS geo_insight_cells_select ON geo_insight_cells;
CREATE POLICY geo_insight_cells_select ON geo_insight_cells
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant', true));
DROP POLICY IF EXISTS geo_insight_cells_insert ON geo_insight_cells;
CREATE POLICY geo_insight_cells_insert ON geo_insight_cells
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

-- Retention is declared per row; expiry is computed, never supplied.
CREATE OR REPLACE VIEW geo_insight_cells_live
WITH (security_invoker = true) AS
SELECT c.tenant_id, c.branch_id, c.metric_id, c.resolution_cdeg, c.cell_id, c.window_start, c.window_end,
       c.value, c.suppressed, c.reason, c.computed_at
FROM geo_insight_cells c
WHERE c.computed_at + make_interval(days => c.retention_days) > now();

GRANT SELECT ON geo_insight_cells, geo_insight_cells_live TO zyara_app;
-- Column-level INSERT: computed_at is always database time.
GRANT INSERT (tenant_id, branch_id, metric_id, subject_kind, value_kind, numerator, denominator, source, purpose,
  sensitive, min_cohort, resolution_cdeg, cell_id, window_start, window_end, value, suppressed, reason, retention_days)
  ON geo_insight_cells TO zyara_app;

-- ROLLBACK (manual, audited, only when no dependent data remains):
-- DROP VIEW IF EXISTS geo_insight_cells_live;
-- DROP TABLE IF EXISTS geo_insight_cells;
