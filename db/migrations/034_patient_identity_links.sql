-- M052 patient identity links (synthetic-capable schema).
CREATE TABLE IF NOT EXISTS patient_identity_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  surviving_patient_id uuid NOT NULL,
  absorbed_patient_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  reason text NOT NULL CHECK (char_length(reason) > 0),
  at timestamptz NOT NULL DEFAULT now(),
  undone boolean NOT NULL DEFAULT false,
  CHECK (surviving_patient_id <> absorbed_patient_id)
);
