-- M033 recall plans (synthetic-capable schema).
CREATE TABLE IF NOT EXISTS recall_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  issuer_id uuid NOT NULL,
  issuer_role text NOT NULL
    CHECK (issuer_role IN ('clinician', 'care-team-lead', 'dental-clinician')),
  source text NOT NULL CHECK (char_length(source) > 0),
  template text NOT NULL
    CHECK (template IN ('follow-up', 'dental-preventive', 'rehab', 'screening')),
  service_id text NOT NULL,
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  prerequisites text[] NOT NULL DEFAULT '{}',
  stop_conditions text[] NOT NULL DEFAULT '{}',
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  supersedes_id uuid NULL REFERENCES recall_plans (id),
  state text NOT NULL DEFAULT 'active'
    CHECK (state IN ('active', 'completed', 'cancelled', 'superseded', 'declined')),
  clinically_completed boolean NOT NULL DEFAULT false,
  booked_appointment_id uuid NULL,
  decline_reason text NULL,
  CHECK (window_start < window_end),
  CHECK ((state <> 'completed') OR (clinically_completed = true))
);
CREATE UNIQUE INDEX IF NOT EXISTS recall_plans_active_dedup_idx
  ON recall_plans (tenant_id, patient_id, service_id, template, window_start, window_end)
  WHERE state = 'active';
