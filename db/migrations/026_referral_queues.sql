-- M035 referral and order-to-schedule queues (synthetic-capable schema).
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  source_id uuid NOT NULL,
  source_role text NOT NULL
    CHECK (source_role IN ('clinician', 'care-team-lead', 'dental-clinician')),
  service_id text NOT NULL,
  order_id text NOT NULL,
  urgency text NOT NULL CHECK (urgency IN ('urgent', 'soon', 'routine')),
  eligibility_context text[] NOT NULL DEFAULT '{}',
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  state text NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending', 'scheduled', 'expired', 'declined', 'cancelled')),
  scheduled_appointment_id uuid NULL,
  CHECK (expires_at > created_at)
);
CREATE UNIQUE INDEX IF NOT EXISTS referrals_pending_dedup_idx
  ON referrals (tenant_id, patient_id, service_id, order_id)
  WHERE state = 'pending';
CREATE INDEX IF NOT EXISTS referrals_queue_idx
  ON referrals (tenant_id, urgency, created_at) WHERE state = 'pending';
CREATE TABLE IF NOT EXISTS referral_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  referral_id uuid NOT NULL REFERENCES referrals (id) ON DELETE CASCADE,
  from_state text NOT NULL,
  to_state text NOT NULL,
  actor_id uuid NOT NULL,
  reason text NOT NULL CHECK (char_length(reason) > 0),
  at timestamptz NOT NULL DEFAULT now()
);
