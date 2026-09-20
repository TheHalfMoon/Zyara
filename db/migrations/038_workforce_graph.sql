-- W1: clinic organization/workforce graph.
-- Semantic donor reference: TheHalfMoon/Qdrat@e2d288940aab52af881786678b2fc86dfa5c272a.
-- No Qdrat/Horilla code is copied in this migration.
-- Practitioner/PractitionerRole remain the healthcare identity/privilege authority.
-- Shift overlap/coverage resolution is intentionally deferred to W2.

CREATE UNIQUE INDEX IF NOT EXISTS organizations_id_tenant_uidx
  ON organizations(id, tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS branch_locations_id_tenant_uidx
  ON branch_locations(id, tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS branch_locations_id_org_tenant_uidx
  ON branch_locations(id, organization_id, tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS practitioner_roles_id_tenant_uidx
  ON practitioner_roles(id, tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS practitioner_roles_id_branch_tenant_uidx
  ON practitioner_roles(id, branch_id, tenant_id);

CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  branch_id TEXT,
  parent_department_id TEXT,
  labels JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  source_ref TEXT NOT NULL,
  source_revision TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, tenant_id),
  FOREIGN KEY (organization_id, tenant_id)
    REFERENCES organizations(id, tenant_id) ON DELETE RESTRICT,
  FOREIGN KEY (branch_id, organization_id, tenant_id)
    REFERENCES branch_locations(id, organization_id, tenant_id) ON DELETE RESTRICT,
  FOREIGN KEY (parent_department_id, tenant_id)
    REFERENCES departments(id, tenant_id) ON DELETE RESTRICT
);


CREATE TABLE IF NOT EXISTS workforce_teams (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  branch_id TEXT,
  department_id TEXT,
  labels JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  source_ref TEXT NOT NULL,
  source_revision TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, tenant_id)
    REFERENCES organizations(id, tenant_id) ON DELETE RESTRICT,
  FOREIGN KEY (branch_id, organization_id, tenant_id)
    REFERENCES branch_locations(id, organization_id, tenant_id) ON DELETE RESTRICT,
  FOREIGN KEY (department_id, tenant_id)
    REFERENCES departments(id, tenant_id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS workforce_teams_id_tenant_uidx
  ON workforce_teams(id, tenant_id);

CREATE TABLE IF NOT EXISTS staff_assignments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  branch_id TEXT,
  department_id TEXT,
  team_id TEXT,
  practitioner_role_id TEXT,
  operational_role TEXT NOT NULL CHECK (char_length(operational_role) > 0),
  effective_from DATE NOT NULL,
  effective_to DATE,
  source_ref TEXT NOT NULL,
  source_revision TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (effective_to IS NULL OR effective_to >= effective_from),
  CHECK (practitioner_role_id IS NULL OR branch_id IS NOT NULL),
  FOREIGN KEY (organization_id, tenant_id)
    REFERENCES organizations(id, tenant_id) ON DELETE RESTRICT,
  FOREIGN KEY (branch_id, organization_id, tenant_id)
    REFERENCES branch_locations(id, organization_id, tenant_id) ON DELETE RESTRICT,
  FOREIGN KEY (department_id, tenant_id)
    REFERENCES departments(id, tenant_id) ON DELETE RESTRICT,
  FOREIGN KEY (team_id, tenant_id)
    REFERENCES workforce_teams(id, tenant_id) ON DELETE RESTRICT,
  FOREIGN KEY (practitioner_role_id, branch_id, tenant_id)
    REFERENCES practitioner_roles(id, branch_id, tenant_id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS staff_assignments_id_tenant_uidx
  ON staff_assignments(id, tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS staff_assignments_id_branch_tenant_uidx
  ON staff_assignments(id, branch_id, tenant_id);
CREATE INDEX IF NOT EXISTS staff_assignments_tenant_branch_idx
  ON staff_assignments(tenant_id, branch_id, account_id);

CREATE TABLE IF NOT EXISTS workforce_shifts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  staff_assignment_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planned', 'cancelled')),
  source_ref TEXT NOT NULL,
  source_revision TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  FOREIGN KEY (staff_assignment_id, branch_id, tenant_id)
    REFERENCES staff_assignments(id, branch_id, tenant_id) ON DELETE RESTRICT,
  FOREIGN KEY (branch_id, tenant_id)
    REFERENCES branch_locations(id, tenant_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  staff_assignment_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('requested', 'approved', 'rejected', 'cancelled')),
  approver_account_id TEXT,
  source_ref TEXT NOT NULL,
  source_revision TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_on >= starts_on),
  FOREIGN KEY (staff_assignment_id, branch_id, tenant_id)
    REFERENCES staff_assignments(id, branch_id, tenant_id) ON DELETE RESTRICT,
  FOREIGN KEY (branch_id, tenant_id)
    REFERENCES branch_locations(id, tenant_id) ON DELETE RESTRICT
);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments FORCE ROW LEVEL SECURITY;
ALTER TABLE workforce_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE workforce_teams FORCE ROW LEVEL SECURITY;
ALTER TABLE staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_assignments FORCE ROW LEVEL SECURITY;
ALTER TABLE workforce_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workforce_shifts FORCE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS department_isolation ON departments;
CREATE POLICY department_isolation ON departments
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));
DROP POLICY IF EXISTS workforce_team_isolation ON workforce_teams;
CREATE POLICY workforce_team_isolation ON workforce_teams
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));
DROP POLICY IF EXISTS staff_assignment_isolation ON staff_assignments;
CREATE POLICY staff_assignment_isolation ON staff_assignments
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));
DROP POLICY IF EXISTS workforce_shift_isolation ON workforce_shifts;
CREATE POLICY workforce_shift_isolation ON workforce_shifts
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));
DROP POLICY IF EXISTS leave_request_isolation ON leave_requests;
CREATE POLICY leave_request_isolation ON leave_requests
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

GRANT SELECT, INSERT, UPDATE ON
  departments, workforce_teams, staff_assignments, workforce_shifts, leave_requests
TO zyara_app;

-- ROLLBACK (manual, audited, only when no dependent data remains):
-- DROP TABLE IF EXISTS leave_requests, workforce_shifts, staff_assignments,
--   workforce_teams, departments;
