-- W4: privacy-first WhatsApp adapter persistence.
-- Semantic donor reference: TheHalfMoon/Qdrat@e2d288940aab52af881786678b2fc86dfa5c272a.
-- No Qdrat/Horilla code copied.
--
-- Secrets are NEVER stored here. Only opaque secret-manager references are
-- persisted. Webhook receipts are metadata-only and append-only; raw payloads,
-- message bodies, phone numbers and contact names are not persisted by W4.

CREATE TABLE IF NOT EXISTS whatsapp_accounts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  business_account_id TEXT NOT NULL,
  phone_number_id TEXT NOT NULL,
  app_secret_ref TEXT NOT NULL CHECK (char_length(app_secret_ref) > 0),
  verify_token_ref TEXT NOT NULL CHECK (char_length(verify_token_ref) > 0),
  enabled BOOLEAN NOT NULL DEFAULT false,
  source_ref TEXT NOT NULL,
  source_revision TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, tenant_id),
  UNIQUE (tenant_id, business_account_id, phone_number_id),
  FOREIGN KEY (branch_id, tenant_id)
    REFERENCES branch_locations(id, tenant_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS whatsapp_outbound_operations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  patient_ref TEXT NOT NULL,
  destination_ref TEXT NOT NULL,
  template_id TEXT NOT NULL,
  locale TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('care_access', 'appointment_operations', 'request_updates')),
  consent_assertion_ref TEXT NOT NULL CHECK (char_length(consent_assertion_ref) > 0),
  idempotency_key TEXT NOT NULL CHECK (char_length(idempotency_key) > 0),
  status TEXT NOT NULL CHECK (status IN ('queued', 'suppressed', 'sending', 'sent', 'failed_transient', 'failed_permanent')),
  provider_message_ref TEXT,
  correlation_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, tenant_id),
  UNIQUE (tenant_id, idempotency_key),
  FOREIGN KEY (account_id, tenant_id)
    REFERENCES whatsapp_accounts(id, tenant_id) ON DELETE RESTRICT,
  FOREIGN KEY (branch_id, tenant_id)
    REFERENCES branch_locations(id, tenant_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS whatsapp_webhook_receipts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  provider_event_key TEXT NOT NULL,
  event_kind TEXT NOT NULL CHECK (event_kind IN ('message_received', 'delivery_status')),
  provider_message_ref TEXT NOT NULL,
  provider_status TEXT,
  payload_digest TEXT NOT NULL CHECK (char_length(payload_digest) = 64),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, tenant_id),
  UNIQUE (tenant_id, account_id, provider_event_key),
  FOREIGN KEY (account_id, tenant_id)
    REFERENCES whatsapp_accounts(id, tenant_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS whatsapp_outbound_ops_tenant_branch_status_idx
  ON whatsapp_outbound_operations(tenant_id, branch_id, status);
CREATE INDEX IF NOT EXISTS whatsapp_receipts_tenant_account_received_idx
  ON whatsapp_webhook_receipts(tenant_id, account_id, received_at);

ALTER TABLE whatsapp_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_outbound_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_outbound_operations FORCE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_webhook_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_webhook_receipts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS whatsapp_accounts_select ON whatsapp_accounts;
CREATE POLICY whatsapp_accounts_select ON whatsapp_accounts
  FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant', true));
DROP POLICY IF EXISTS whatsapp_accounts_insert ON whatsapp_accounts;
CREATE POLICY whatsapp_accounts_insert ON whatsapp_accounts
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));
DROP POLICY IF EXISTS whatsapp_accounts_update ON whatsapp_accounts;
CREATE POLICY whatsapp_accounts_update ON whatsapp_accounts
  FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS whatsapp_outbound_select ON whatsapp_outbound_operations;
CREATE POLICY whatsapp_outbound_select ON whatsapp_outbound_operations
  FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant', true));
DROP POLICY IF EXISTS whatsapp_outbound_insert ON whatsapp_outbound_operations;
CREATE POLICY whatsapp_outbound_insert ON whatsapp_outbound_operations
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));
DROP POLICY IF EXISTS whatsapp_outbound_update ON whatsapp_outbound_operations;
CREATE POLICY whatsapp_outbound_update ON whatsapp_outbound_operations
  FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS whatsapp_receipts_select ON whatsapp_webhook_receipts;
CREATE POLICY whatsapp_receipts_select ON whatsapp_webhook_receipts
  FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant', true));
DROP POLICY IF EXISTS whatsapp_receipts_insert ON whatsapp_webhook_receipts;
CREATE POLICY whatsapp_receipts_insert ON whatsapp_webhook_receipts
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

GRANT SELECT, INSERT, UPDATE ON whatsapp_accounts TO zyara_app;
GRANT SELECT, INSERT, UPDATE ON whatsapp_outbound_operations TO zyara_app;
GRANT SELECT, INSERT ON whatsapp_webhook_receipts TO zyara_app;

-- ROLLBACK (manual, audited, only when no dependent data remains):
-- DROP TABLE IF EXISTS whatsapp_webhook_receipts,
--   whatsapp_outbound_operations, whatsapp_accounts;
