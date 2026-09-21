-- N5/C1: bounded agent identities for Zyara Clinic collaboration (additive).
-- Concept donor reference: block/buzz (Apache-2.0) channels/threads and
-- human-agent membership. No Buzz source is copied into this migration.
--
-- An agent identity is a service principal for bounded clinic operations. It is
-- NOT a Practitioner, NOT a PractitionerRole, NOT clinical or financial
-- authority, and NOT a substitute for human accountability. Every identity is
-- tenant-scoped, optionally branch-scoped, names a live human sponsor, expires,
-- and can be suspended or revoked. No secret material is stored: only an opaque
-- secret-manager reference plus rotation timestamps.

CREATE TABLE IF NOT EXISTS agent_identities (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  branch_id TEXT,
  display_name TEXT NOT NULL CHECK (char_length(display_name) > 0),
  kind TEXT NOT NULL CHECK (kind IN (
    'clinic_ops_assistant',
    'communications_agent',
    'reporting_agent'
  )),
  status TEXT NOT NULL CHECK (status IN ('active', 'suspended', 'revoked')),
  human_sponsor_account_id TEXT NOT NULL CHECK (char_length(human_sponsor_account_id) > 0),
  effective_from TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  credential_ref TEXT NOT NULL CHECK (credential_ref ~ '^secret://[^[:space:]]+$'),
  credential_rotated_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,
  correlation_id TEXT,
  idempotency_key TEXT,
  source_ref TEXT NOT NULL CHECK (char_length(source_ref) > 0),
  source_revision TEXT NOT NULL CHECK (char_length(source_revision) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, tenant_id),
  -- Bounded authority: the window must be positive and within the maximum TTL.
  CHECK (expires_at > effective_from),
  CHECK (expires_at <= effective_from + interval '90 days'),
  -- Revocation is recorded, never silent.
  CHECK ((status = 'revoked') = (revoked_at IS NOT NULL)),
  CHECK ((status = 'revoked') = (revocation_reason IS NOT NULL)),
  FOREIGN KEY (branch_id, tenant_id)
    REFERENCES branch_locations(id, tenant_id) ON DELETE RESTRICT
);

-- Lifecycle and capability changes are append-only. Current capability state is
-- derived by replaying these rows; no caller can rewrite or delete the trail,
-- and no raw credential, token or secret value is ever a column here.
CREATE TABLE IF NOT EXISTS agent_identity_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN (
    'created',
    'capability_granted',
    'capability_revoked',
    'suspended',
    'reactivated',
    'revoked',
    'credential_rotated'
  )),
  -- Closed capability set. Clinical, financial, insurance and infrastructure
  -- namespaces are absent by construction, so they cannot be persisted at all.
  capability TEXT CHECK (capability IS NULL OR capability IN (
    'workforce.tasks.read',
    'workforce.tasks.raise',
    'workforce.tasks.comment',
    'communications.outbound.propose',
    'reporting.read'
  )),
  actor_account_id TEXT NOT NULL CHECK (char_length(actor_account_id) > 0),
  actor_kind TEXT NOT NULL CHECK (actor_kind IN ('human', 'agent', 'system')),
  reason TEXT NOT NULL DEFAULT '',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, tenant_id),
  CHECK ((action IN ('capability_granted', 'capability_revoked')) = (capability IS NOT NULL)),
  FOREIGN KEY (agent_id, tenant_id)
    REFERENCES agent_identities(id, tenant_id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS agent_identities_idempotency_uidx
  ON agent_identities(tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS agent_identities_tenant_branch_status_idx
  ON agent_identities(tenant_id, branch_id, status);
CREATE INDEX IF NOT EXISTS agent_identities_tenant_sponsor_idx
  ON agent_identities(tenant_id, human_sponsor_account_id);
CREATE INDEX IF NOT EXISTS agent_identity_events_agent_idx
  ON agent_identity_events(tenant_id, agent_id, occurred_at);

ALTER TABLE agent_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_identities FORCE ROW LEVEL SECURITY;
ALTER TABLE agent_identity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_identity_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_identity_select ON agent_identities;
CREATE POLICY agent_identity_select ON agent_identities
  FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant', true));
DROP POLICY IF EXISTS agent_identity_insert ON agent_identities;
CREATE POLICY agent_identity_insert ON agent_identities
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));
DROP POLICY IF EXISTS agent_identity_update ON agent_identities;
CREATE POLICY agent_identity_update ON agent_identities
  FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS agent_identity_event_select ON agent_identity_events;
CREATE POLICY agent_identity_event_select ON agent_identity_events
  FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant', true));
DROP POLICY IF EXISTS agent_identity_event_insert ON agent_identity_events;
CREATE POLICY agent_identity_event_insert ON agent_identity_events
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

GRANT SELECT, INSERT, UPDATE ON agent_identities TO zyara_app;
-- Append-only trail: no UPDATE and no DELETE path exists for the application role.
GRANT SELECT, INSERT ON agent_identity_events TO zyara_app;

-- ROLLBACK (manual, audited, only when no dependent data remains):
-- DROP TABLE IF EXISTS agent_identity_events, agent_identities;
