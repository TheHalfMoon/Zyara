-- M047 clinical orders (synthetic-capable schema).
CREATE TABLE IF NOT EXISTS service_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('imaging', 'laboratory', 'nursing')),
  referral_id uuid NULL REFERENCES referrals (id),
  state text NOT NULL DEFAULT 'ordered'
    CHECK (state IN ('ordered', 'scheduled', 'collected', 'performed', 'resulted', 'reviewed', 'cancelled')),
  result text NOT NULL DEFAULT 'pending'
    CHECK (result IN ('pending', 'preliminary', 'final')),
  result_payload text NULL,
  CHECK ((result = 'pending') OR (result_payload IS NOT NULL))
);
