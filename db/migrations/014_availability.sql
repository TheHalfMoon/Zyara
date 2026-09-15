-- M014: recurring schedules + hybrid availability projections.
-- Schedules are immutable versions: publish appends a frozen row; history rows
-- are never UPDATEed or DELETEd by the application role. Projections are a
-- patient-free cache only: a candidate row never authorizes a booking; the
-- M015 commit path rechecks versions, duration, policy and occupancy.
-- Safe rollback: DROP TABLE IF EXISTS availability_projections, schedule_versions (in that order).

CREATE TABLE IF NOT EXISTS schedule_versions (
  id TEXT NOT NULL,
  version INTEGER NOT NULL,
  tenant_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  branch_id TEXT,
  time_zone TEXT NOT NULL,
  tzdb TEXT NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  weekly JSONB NOT NULL DEFAULT '[]'::jsonb,
  exceptions JSONB NOT NULL DEFAULT '[]'::jsonb,
  policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, version),
  CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE TABLE IF NOT EXISTS availability_projections (
  cache_key TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  schedule_id TEXT NOT NULL,
  schedule_version INTEGER NOT NULL,
  recipe_id TEXT NOT NULL,
  recipe_version INTEGER NOT NULL,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  candidates JSONB NOT NULL DEFAULT '[]'::jsonb,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE schedule_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_versions FORCE ROW LEVEL SECURITY;
ALTER TABLE availability_projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_projections FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS schedule_isolation ON schedule_versions;
CREATE POLICY schedule_isolation ON schedule_versions
  USING (tenant_id = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS projection_isolation ON availability_projections;
CREATE POLICY projection_isolation ON availability_projections
  USING (tenant_id = current_setting('app.current_tenant', true));

-- Append-only schedules (SELECT + INSERT); projections are a bounded cache
-- (SELECT + INSERT + DELETE for expiry). No UPDATE anywhere.
GRANT SELECT, INSERT ON schedule_versions, availability_projections TO zyara_app;
GRANT DELETE ON availability_projections TO zyara_app;

-- ROLLBACK (manual, audited):
-- DROP TABLE IF EXISTS availability_projections, schedule_versions;
