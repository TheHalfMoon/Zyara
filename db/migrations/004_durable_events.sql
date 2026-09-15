-- M004: durable event delivery (outbox/inbox/audit).
-- Commit domain state + outbox in ONE transaction; consumers dedupe via inbox.
-- Safe rollback: DROP TABLE IF EXISTS inbox, outbox, audit_log (in that order).

CREATE TABLE IF NOT EXISTS outbox (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  tenant_id TEXT NOT NULL,
  correlation TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','delivered','dead')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  claimed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS outbox_pending_idx
  ON outbox (status, next_attempt_at) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS inbox (
  consumer TEXT NOT NULL,
  event_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  consumed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (consumer, event_id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  action TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('allow','deny')),
  denial TEXT,
  correlation TEXT
);
CREATE INDEX IF NOT EXISTS audit_log_tenant_idx ON audit_log (tenant_id, at);

ALTER TABLE outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox FORCE ROW LEVEL SECURITY;
ALTER TABLE inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS outbox_isolation ON outbox;
CREATE POLICY outbox_isolation ON outbox
  USING (tenant_id = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS inbox_isolation ON inbox;
CREATE POLICY inbox_isolation ON inbox
  USING (tenant_id = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS audit_isolation ON audit_log;
CREATE POLICY audit_isolation ON audit_log
  USING (tenant_id = current_setting('app.current_tenant', true));

GRANT SELECT, INSERT, UPDATE ON outbox, inbox, audit_log TO zyara_app;
GRANT USAGE, SELECT ON audit_log_id_seq TO zyara_app;

-- Wakeup: notify workers on append; if a wake is lost, polling by
-- (status, next_attempt_at) cursor still discovers owed work.
CREATE OR REPLACE FUNCTION notify_outbox() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('outbox_pending', NEW.tenant_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS outbox_notify ON outbox;
CREATE TRIGGER outbox_notify AFTER INSERT ON outbox
  FOR EACH ROW EXECUTE FUNCTION notify_outbox();
