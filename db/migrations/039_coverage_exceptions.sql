-- W2: shift/leave conflict and coverage exceptions (additive over W1).
-- Semantic donor reference: TheHalfMoon/Qdrat@e2d288940aab52af881786678b2fc86dfa5c272a.
-- No Qdrat/Horilla code is copied in this migration.
-- Practitioner/PractitionerRole remain the healthcare identity/privilege authority.
-- This slice is advisory: coverage exceptions record operational review state.
-- It never mutates booking, clinical documentation, medication or billing state.

CREATE TABLE IF NOT EXISTS coverage_exceptions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  staff_assignment_id TEXT,
  shift_id TEXT,
  leave_request_id TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('shift_overlap', 'leave_conflict', 'coverage_gap')),
  detail TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('open', 'acknowledged', 'resolved')),
  source_ref TEXT NOT NULL,
  source_revision TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (staff_assignment_id IS NOT NULL OR shift_id IS NOT NULL OR leave_request_id IS NOT NULL),
  FOREIGN KEY (branch_id, tenant_id)
    REFERENCES branch_locations(id, tenant_id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS coverage_exceptions_id_tenant_uidx
  ON coverage_exceptions(id, tenant_id);
CREATE INDEX IF NOT EXISTS coverage_exceptions_tenant_branch_idx
  ON coverage_exceptions(tenant_id, branch_id, status);

ALTER TABLE coverage_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coverage_exceptions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coverage_exception_isolation ON coverage_exceptions;
CREATE POLICY coverage_exception_isolation ON coverage_exceptions
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

GRANT SELECT, INSERT, UPDATE ON coverage_exceptions TO zyara_app;

-- ROLLBACK (manual, audited, only when no dependent data remains):
-- DROP TABLE IF EXISTS coverage_exceptions;
