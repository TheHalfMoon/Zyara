-- M035 placeholder note: referral work queues land in 026_referral_queues.sql
-- with the M035 change (kept separate so M034 stays bounded).
-- M034 campaigns (synthetic-capable schema).
CREATE TABLE IF NOT EXISTS recall_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  template text NOT NULL,
  stop_conditions text[] NOT NULL DEFAULT '{}',
  stopped boolean NOT NULL DEFAULT false,
  stop_reason text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS recall_outreach_tasks (
  idempotency_key text PRIMARY KEY,
  tenant_id uuid NOT NULL,
  campaign_id uuid NOT NULL REFERENCES recall_campaigns (id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES recall_plans (id) ON DELETE CASCADE,
  patient_id uuid NOT NULL,
  channel text NOT NULL,
  first_contact_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
