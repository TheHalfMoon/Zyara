-- M055 caregiver grants (synthetic-capable schema).
CREATE TABLE IF NOT EXISTS caregiver_grants (
  grant_id text PRIMARY KEY,
  tenant_id uuid NOT NULL,
  caregiver_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  scope text NOT NULL CHECK (scope IN ('appointments-view', 'booking-manage', 'documents-view')),
  verified_by_patient boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz NULL,
  CHECK (caregiver_id <> patient_id),
  CHECK (verified_by_patient = true)
);
CREATE TABLE IF NOT EXISTS caregiver_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  at timestamptz NOT NULL DEFAULT now(),
  grant_id text NOT NULL REFERENCES caregiver_grants (grant_id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('grant', 'use', 'revoke')),
  actor_id uuid NOT NULL
);
