-- M056 enterprise branch admins and support contracts.
CREATE TABLE IF NOT EXISTS branch_admins (
  admin_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  PRIMARY KEY (admin_id, branch_id)
);
CREATE TABLE IF NOT EXISTS support_contracts (
  contract_id text PRIMARY KEY,
  tenant_id uuid NOT NULL,
  slo text NOT NULL CHECK (char_length(slo) > 0),
  escalation text NOT NULL CHECK (char_length(escalation) > 0),
  signed boolean NOT NULL DEFAULT false
);
