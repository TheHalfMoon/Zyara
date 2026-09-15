-- M015: atomic resource holds with expiry invariants.
-- Double-booking protection lives HERE, in an exclusion constraint over
-- half-open UTC intervals per tenant+unit. No application check can bypass
-- it; every writer path (holds, booking commit, admin/import) writes through
-- this table. DB time (statement_timestamp) rules expiry: no now()-based
-- index predicate anywhere, so a stopped worker can never leave a redeemable
-- expired hold. State changes flip active=false in the same transaction that
-- records the decision and appends the M004 outbox event (audited trail).
-- Safe rollback: DROP TABLE IF EXISTS reservation_items, holds (in that order).
-- Requires: btree_gist extension for text equality + range overlap exclusion.

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS holds (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_digest TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('proposed','held','expired','committed','cancelled')),
  schedule_id TEXT NOT NULL,
  schedule_version INTEGER NOT NULL,
  recipe_id TEXT NOT NULL,
  recipe_version INTEGER NOT NULL,
  ttl_min INTEGER NOT NULL CHECK (ttl_min >= 1),
  max_extensions INTEGER NOT NULL CHECK (max_extensions >= 0),
  extensions_used INTEGER NOT NULL DEFAULT 0 CHECK (extensions_used >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
  held_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  decided_at TIMESTAMPTZ,
  last_reason TEXT,
  -- One idempotency key maps to at most one hold per tenant: a replay finds
  -- the same row; a changed body under the same key is a conflict, never a
  -- second allocation.
  UNIQUE (tenant_id, idempotency_key),
  CHECK (extensions_used <= max_extensions),
  CHECK (expires_at IS NULL OR held_at IS NULL OR expires_at > held_at)
);

CREATE TABLE IF NOT EXISTS reservation_items (
  hold_id TEXT NOT NULL REFERENCES holds(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  unit_id TEXT NOT NULL,
  occupied TSTZRANGE NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  reason TEXT NOT NULL DEFAULT 'HOLD_CREATED',
  decided_at TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
  PRIMARY KEY (hold_id, unit_id, occupied),
  CHECK (NOT isempty(occupied)),
  CHECK (lower(occupied) < upper(occupied)),
  -- THE double-booking invariant: no two ACTIVE items for the same
  -- tenant+unit may overlap. Deactivation (expire/redeem/cancel) flips
  -- active=false in the same transaction that records the decision.
  EXCLUDE USING gist (
    tenant_id WITH =,
    unit_id WITH =,
    occupied WITH &&
  ) WHERE (active)
);

-- Deterministic lock helper: callers lock units in ascending ID order
-- (see reservations.lockOrderFor) before inserting. Guard table serializes
-- count-based session limits the same way.
CREATE TABLE IF NOT EXISTS session_guards (
  tenant_id TEXT NOT NULL,
  guard_id TEXT NOT NULL,
  PRIMARY KEY (tenant_id, guard_id)
);

ALTER TABLE holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE holds FORCE ROW LEVEL SECURITY;
ALTER TABLE reservation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_items FORCE ROW LEVEL SECURITY;
ALTER TABLE session_guards ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_guards FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS holds_isolation ON holds;
CREATE POLICY holds_isolation ON holds
  USING (tenant_id = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS reservation_items_isolation ON reservation_items;
CREATE POLICY reservation_items_isolation ON reservation_items
  USING (tenant_id = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS session_guards_isolation ON session_guards;
CREATE POLICY session_guards_isolation ON session_guards
  USING (tenant_id = current_setting('app.current_tenant', true));

-- Holds ledger: SELECT + INSERT + UPDATE (state/active flips are the audited
-- transitions; history is the outbox event trail). No DELETE.
GRANT SELECT, INSERT, UPDATE ON holds, reservation_items, session_guards TO zyara_app;

-- ROLLBACK (manual, audited):
-- DROP TABLE IF EXISTS session_guards, reservation_items, holds;

