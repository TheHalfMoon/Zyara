-- M006: provider graph and identifier model.
-- Opaque text IDs; effective dating; external namespaces preserved.
-- Safe rollback: DROP TABLEs in reverse dependency order (see footer).

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  parent_id TEXT REFERENCES organizations(id) ON DELETE RESTRICT,
  labels JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS branch_locations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  labels JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS practitioners (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  display_names JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Private credential evidence lives elsewhere (M008); never in public labels.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS practitioner_roles (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  practitioner_id TEXT NOT NULL REFERENCES practitioners(id) ON DELETE RESTRICT,
  branch_id TEXT NOT NULL REFERENCES branch_locations(id) ON DELETE RESTRICT,
  taxonomy TEXT NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE TABLE IF NOT EXISTS care_services (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  branch_id TEXT NOT NULL REFERENCES branch_locations(id) ON DELETE RESTRICT,
  practitioner_role_id TEXT REFERENCES practitioner_roles(id) ON DELETE RESTRICT,
  labels JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS insurer_assertions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  service_id TEXT NOT NULL REFERENCES care_services(id) ON DELETE RESTRICT,
  insurer TEXT NOT NULL,
  network TEXT NOT NULL,
  branch_id TEXT NOT NULL REFERENCES branch_locations(id) ON DELETE RESTRICT,
  effective_from DATE NOT NULL,
  effective_to DATE,
  source TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE TABLE IF NOT EXISTS external_identifiers (
  namespace TEXT NOT NULL,
  value TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  PRIMARY KEY (namespace, value)
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;
ALTER TABLE branch_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_locations FORCE ROW LEVEL SECURITY;
ALTER TABLE practitioners ENABLE ROW LEVEL SECURITY;
ALTER TABLE practitioners FORCE ROW LEVEL SECURITY;
ALTER TABLE practitioner_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE practitioner_roles FORCE ROW LEVEL SECURITY;
ALTER TABLE care_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_services FORCE ROW LEVEL SECURITY;
ALTER TABLE insurer_assertions ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurer_assertions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_isolation ON organizations;
CREATE POLICY org_isolation ON organizations USING (tenant_id = current_setting('app.current_tenant', true));
DROP POLICY IF EXISTS branch_loc_isolation ON branch_locations;
CREATE POLICY branch_loc_isolation ON branch_locations USING (tenant_id = current_setting('app.current_tenant', true));
DROP POLICY IF EXISTS practitioner_isolation ON practitioners;
CREATE POLICY practitioner_isolation ON practitioners USING (tenant_id = current_setting('app.current_tenant', true));
DROP POLICY IF EXISTS role_isolation ON practitioner_roles;
CREATE POLICY role_isolation ON practitioner_roles USING (tenant_id = current_setting('app.current_tenant', true));
DROP POLICY IF EXISTS service_isolation ON care_services;
CREATE POLICY service_isolation ON care_services USING (tenant_id = current_setting('app.current_tenant', true));
DROP POLICY IF EXISTS insurer_isolation ON insurer_assertions;
CREATE POLICY insurer_isolation ON insurer_assertions USING (tenant_id = current_setting('app.current_tenant', true));

GRANT SELECT, INSERT, UPDATE ON organizations, branch_locations, practitioners,
  practitioner_roles, care_services, insurer_assertions, external_identifiers TO zyara_app;

-- ROLLBACK (manual, audited, reverse order):
-- DROP TABLE IF EXISTS external_identifiers, insurer_assertions, care_services,
--   practitioner_roles, practitioners, branch_locations, organizations;
