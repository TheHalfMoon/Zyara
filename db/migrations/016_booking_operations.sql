-- M016: authoritative native booking operations.
-- A patient receives confirmation only after committed truth exists. The
-- 015 reservation_items ledger stays the single native capacity authority:
-- every native booking writes its allocation through reservation_items in the
-- same transaction that commits the appointment. Direct bookings create their
-- holds row in committed state; hold conversions flip the source hold to
-- committed in the same transaction. No Redis-only lock; DB time rules.
-- Safe rollback: DROP TABLE IF EXISTS appointment_items, appointments,
-- booking_operations (in that order). Reservation ledger (015) is untouched.
-- Requires: btree_gist extension for text equality + range overlap exclusion.

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS booking_operations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  patient_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_digest TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('pending','booked','conflict','needs_reconfirmation','rejected')),
  hold_id TEXT REFERENCES holds(id) ON DELETE RESTRICT,
  service_id TEXT NOT NULL,
  type_id TEXT NOT NULL,
  branch_id TEXT,
  schedule_id TEXT NOT NULL,
  schedule_version INTEGER NOT NULL,
  recipe_id TEXT NOT NULL,
  recipe_version INTEGER NOT NULL,
  candidate_token TEXT NOT NULL,
  start_utc TIMESTAMPTZ NOT NULL,
  end_utc TIMESTAMPTZ NOT NULL,
  time_zone TEXT NOT NULL,
  eligibility_outcome TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
  decided_at TIMESTAMPTZ,
  last_reason TEXT,
  appointment_id TEXT,
  -- Same key replays the same operation; a changed body under the same key
  -- is a conflict, never a second appointment.
  UNIQUE (tenant_id, idempotency_key),
  CHECK (end_utc > start_utc)
);

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  operation_id TEXT NOT NULL UNIQUE REFERENCES booking_operations(id) ON DELETE RESTRICT,
  patient_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  type_id TEXT NOT NULL,
  branch_id TEXT,
  schedule_id TEXT NOT NULL,
  schedule_version INTEGER NOT NULL,
  recipe_id TEXT NOT NULL,
  recipe_version INTEGER NOT NULL,
  start_utc TIMESTAMPTZ NOT NULL,
  end_utc TIMESTAMPTZ NOT NULL,
  time_zone TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('booked')),
  eligibility_outcome TEXT NOT NULL,
  snapshot_token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
  decided_at TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
  booked_range TSTZRANGE GENERATED ALWAYS AS (tstzrange(start_utc, end_utc, '[)')) STORED,
  CHECK (end_utc > start_utc),
  -- Patient duplicate guard: one active booking per patient+service+interval.
  -- A second device with a different key but the same patient+slot returns
  -- the existing appointment instead of a second booking.
  EXCLUDE USING gist (
    tenant_id WITH =,
    patient_id WITH =,
    service_id WITH =,
    booked_range WITH &&
  ) WHERE (state = 'booked')
);

CREATE TABLE IF NOT EXISTS appointment_items (
  appointment_id TEXT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  unit_id TEXT NOT NULL,
  occupied TSTZRANGE NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  reason TEXT NOT NULL DEFAULT 'BOOKING_COMMITTED',
  decided_at TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
  PRIMARY KEY (appointment_id, unit_id, occupied),
  CHECK (NOT isempty(occupied)),
  CHECK (lower(occupied) < upper(occupied)),
  -- Booking-side double-booking invariant. The 015 reservation_items ledger
  -- remains the cross-ledger authority: every commit also inserts matching
  -- reservation_items rows, so holds and bookings can never overlap even
  -- though they live in separate item tables.
  EXCLUDE USING gist (
    tenant_id WITH =,
    unit_id WITH =,
    occupied WITH &&
  ) WHERE (active)
);

ALTER TABLE booking_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_operations FORCE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments FORCE ROW LEVEL SECURITY;
ALTER TABLE appointment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_items FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS booking_operations_isolation ON booking_operations;
CREATE POLICY booking_operations_isolation ON booking_operations
  USING (tenant_id = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS appointments_isolation ON appointments;
CREATE POLICY appointments_isolation ON appointments
  USING (tenant_id = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS appointment_items_isolation ON appointment_items;
CREATE POLICY appointment_items_isolation ON appointment_items
  USING (tenant_id = current_setting('app.current_tenant', true));

-- Booking ledger: SELECT + INSERT + UPDATE (pending to terminal is the
-- audited transition; history is the outbox event trail). No DELETE.
GRANT SELECT, INSERT, UPDATE ON booking_operations, appointments, appointment_items TO zyara_app;

-- ROLLBACK (manual, audited):
-- DROP TABLE IF EXISTS appointment_items, appointments, booking_operations;
