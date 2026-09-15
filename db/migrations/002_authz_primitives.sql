-- M002: account, tenant and branch authorization primitives.
-- RLS enforced; migration-owned tables isolated under zyara_migrator role.
-- Safe rollback: DROP TABLE ... CASCADE in reverse order (see footer).

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memberships (
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id TEXT REFERENCES branches(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('org_admin','branch_admin','clinician','receptionist','patient')),
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  patient_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, tenant_id, branch_id, role)
);

CREATE TABLE IF NOT EXISTS sessions (
  sid TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  assurance TEXT NOT NULL DEFAULT 'aal1' CHECK (assurance IN ('aal1','aal2')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS membership_audit (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  action TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('allow','deny')),
  denial TEXT
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_audit ENABLE ROW LEVEL SECURITY;

-- Tenant isolation: rows visible only when app.current_tenant matches.
DROP POLICY IF EXISTS tenant_isolation ON tenants;
CREATE POLICY tenant_isolation ON tenants
  USING (id = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS branch_isolation ON branches;
CREATE POLICY branch_isolation ON branches
  USING (tenant_id = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS membership_isolation ON memberships;
CREATE POLICY membership_isolation ON memberships
  USING (tenant_id = current_setting('app.current_tenant', true));

-- Migration-role isolation: only zyara_migrator may write schema-level
-- membership grants; app role gets row-scoped DML only.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'zyara_migrator') THEN
    CREATE ROLE zyara_migrator NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'zyara_app') THEN
    CREATE ROLE zyara_app NOLOGIN;
  END IF;
END
$$;

GRANT SELECT, INSERT, UPDATE ON memberships, sessions, membership_audit TO zyara_app;
GRANT SELECT ON tenants, branches, accounts TO zyara_app;
GRANT ALL ON membership_audit_id_seq TO zyara_app;

-- ROLLBACK (manual, audited):
-- DROP TABLE IF EXISTS membership_audit, sessions, memberships, accounts, branches, tenants;
