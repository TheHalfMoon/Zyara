-- M032 expiring offers (synthetic-capable schema).
CREATE TABLE IF NOT EXISTS waitlist_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  enrollment_id uuid NOT NULL REFERENCES waitlist_enrollments (id) ON DELETE CASCADE,
  unit_id text NOT NULL,
  hold_backed boolean NOT NULL DEFAULT false,
  hold_id uuid NULL,
  original_appointment_id uuid NOT NULL,
  offered_start timestamptz NOT NULL,
  offered_end timestamptz NOT NULL,
  first_contact_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  state text NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending', 'accepted', 'expired', 'declined', 'consumed')),
  replacement_booking_id uuid NULL,
  CHECK (offered_start < offered_end),
  CHECK (expires_at > first_contact_at),
  CHECK ((NOT hold_backed) OR (hold_id IS NOT NULL))
);
-- At most one live (pending) offer per unit.
CREATE UNIQUE INDEX IF NOT EXISTS waitlist_offers_live_unit_idx
  ON waitlist_offers (tenant_id, unit_id) WHERE state = 'pending';
