-- M050 group sessions and family links (synthetic-capable schema).
CREATE TABLE IF NOT EXISTS group_sessions (
  session_id text PRIMARY KEY,
  tenant_id uuid NOT NULL,
  service_id text NOT NULL,
  capacity integer NOT NULL CHECK (capacity > 0)
);
CREATE TABLE IF NOT EXISTS group_roster (
  session_id text NOT NULL REFERENCES group_sessions (session_id) ON DELETE CASCADE,
  patient_id uuid NOT NULL,
  consented boolean NOT NULL DEFAULT false,
  PRIMARY KEY (session_id, patient_id),
  CHECK (consented = true)
);
CREATE TABLE IF NOT EXISTS family_links (
  link_id text PRIMARY KEY,
  tenant_id uuid NOT NULL,
  slot_id text NOT NULL
);
CREATE TABLE IF NOT EXISTS family_members (
  link_id text NOT NULL REFERENCES family_links (link_id) ON DELETE CASCADE,
  patient_id uuid NOT NULL,
  booking_id uuid NOT NULL,
  consented boolean NOT NULL DEFAULT false,
  state text NOT NULL DEFAULT 'booked' CHECK (state IN ('booked', 'cancelled')),
  PRIMARY KEY (link_id, patient_id),
  CHECK (consented = true)
);
