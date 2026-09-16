-- M051 consent and clinical-store boundary (synthetic-capable schema).
CREATE TABLE IF NOT EXISTS consent_grants (
  patient_id uuid NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('care', 'recall', 'analytics')),
  granted boolean NOT NULL DEFAULT true,
  at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz NULL,
  PRIMARY KEY (patient_id, purpose, at)
);
-- Clinical records live apart from operational rows; cross-boundary reads
-- are gated in code and recorded here.
CREATE TABLE IF NOT EXISTS clinical_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  record_class text NOT NULL DEFAULT 'clinical' CHECK (record_class = 'clinical'),
  payload_ref text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS boundary_read_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  from_store text NOT NULL,
  purpose text NOT NULL,
  allowed boolean NOT NULL,
  reason text NOT NULL
);
