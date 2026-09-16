-- M031 preference-aware waitlist enrollment (synthetic-capable schema).
-- Enrollment never cancels the original visit; offers (M032) act later.
CREATE TABLE IF NOT EXISTS waitlist_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  original_appointment_id uuid NOT NULL,
  service_id text NOT NULL,
  type_id text NOT NULL,
  time_zone text NOT NULL,
  windows jsonb NOT NULL,
  required_clinicians text[] NOT NULL DEFAULT '{}',
  alternate_clinicians text[] NOT NULL DEFAULT '{}',
  required_locations text[] NOT NULL DEFAULT '{}',
  alternate_locations text[] NOT NULL DEFAULT '{}',
  accessibility_needs text[] NOT NULL DEFAULT '{}',
  language text NOT NULL,
  consents jsonb NOT NULL,
  allow_auto_switch boolean NOT NULL DEFAULT false,
  idempotency_key text NOT NULL,
  priority_band text NOT NULL CHECK (priority_band IN ('urgent-clinical', 'time-sensitive', 'routine')),
  priority_reason text NOT NULL CHECK (char_length(priority_reason) > 0),
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  sequence bigint GENERATED ALWAYS AS IDENTITY,
  state text NOT NULL DEFAULT 'waiting'
    CHECK (state IN ('waiting', 'offered', 'fulfilled', 'withdrawn', 'expired')),
  UNIQUE (tenant_id, idempotency_key),
  CHECK (char_length(idempotency_key) BETWEEN 1 AND 128),
  CHECK (NOT (required_clinicians && alternate_clinicians)),
  CHECK (NOT (required_locations && alternate_locations))
);

CREATE TABLE IF NOT EXISTS waitlist_priority_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  enrollment_id uuid NOT NULL REFERENCES waitlist_enrollments (id) ON DELETE CASCADE,
  actor_id uuid NOT NULL,
  from_band text NOT NULL,
  to_band text NOT NULL,
  reason text NOT NULL CHECK (char_length(reason) > 0),
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS waitlist_enrollments_queue_idx
  ON waitlist_enrollments (tenant_id, priority_band, enrolled_at, sequence);
