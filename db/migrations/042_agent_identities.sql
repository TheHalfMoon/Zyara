-- N5/C1: explicit agent identities and scoped administrative grants.
-- Semantic donor reference: block/buzz@4ab4f786085a23fe6126529861840eff6048ceee.
-- No Buzz code copied. Nostr keys/events are not Zyara authority.
--
-- Agent identity is NOT a human account and NOT clinical authority. C1 exposes
-- only a small administrative capability allowlist. Runtime credentials are
-- intentionally absent from this schema.

CREATE TABLE IF NOT EXISTS agent_identities (
  id TEXT PRIMARY KEY CHECK (id ~ '^agt_[A-Za-z0-9_-]{8,64}$'),
  tenant_id TEXT NOT NULL,
  branch_id TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('workflow_agent','copilot','integration_agent')),
  display_name TEXT NOT NULL CHECK (char_length(trim(display_name)) > 0),
  purpose TEXT NOT NULL CHECK (char_length(trim(purpose)) > 0),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','active','paused','revoked')),
  created_by_account_id TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  source_revision TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, tenant_id),
  FOREIGN KEY (branch_id, tenant_id)
    REFERENCES branch_locations(id, tenant_id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by_account_id)
    REFERENCES accounts(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS agent_grants (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  branch_id TEXT,
  capability TEXT NOT NULL CHECK (capability IN (
    'ops.tasks.read',
    'ops.tasks.create',
    'ops.tasks.comment',
    'ops.tasks.progress',
    'workforce.coverage.read',
    'whatsapp.delivery.read'
  )),
  requires_human_approval BOOLEAN NOT NULL DEFAULT true,
  effective_from TIMESTAMPTZ NOT NULL,
  effective_to TIMESTAMPTZ,
  granted_by_account_id TEXT NOT NULL,
  revoked_at TIMESTAMPTZ,
  revoked_by_account_id TEXT,
  reason_code TEXT NOT NULL CHECK (char_length(trim(reason_code)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, tenant_id),
  FOREIGN KEY (agent_id, tenant_id)
    REFERENCES agent_identities(id, tenant_id) ON DELETE RESTRICT,
  FOREIGN KEY (branch_id, tenant_id)
    REFERENCES branch_locations(id, tenant_id) ON DELETE RESTRICT,
  FOREIGN KEY (granted_by_account_id)
    REFERENCES accounts(id) ON DELETE RESTRICT,
  FOREIGN KEY (revoked_by_account_id)
    REFERENCES accounts(id) ON DELETE RESTRICT,
  CHECK (effective_to IS NULL OR effective_to > effective_from),
  CHECK ((revoked_at IS NULL) = (revoked_by_account_id IS NULL)),
  CHECK (
    capability NOT IN ('ops.tasks.create','ops.tasks.comment','ops.tasks.progress')
    OR requires_human_approval = true
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS agent_grants_active_scope_uidx
  ON agent_grants(tenant_id, agent_id, COALESCE(branch_id, ''), capability)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS agent_authority_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN (
    'identity_created',
    'identity_activated',
    'identity_paused',
    'identity_revoked',
    'grant_created',
    'grant_revoked'
  )),
  actor_account_id TEXT NOT NULL,
  grant_id TEXT,
  reason_code TEXT NOT NULL DEFAULT '',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, tenant_id),
  FOREIGN KEY (agent_id, tenant_id)
    REFERENCES agent_identities(id, tenant_id) ON DELETE RESTRICT,
  FOREIGN KEY (actor_account_id)
    REFERENCES accounts(id) ON DELETE RESTRICT,
  FOREIGN KEY (grant_id, tenant_id)
    REFERENCES agent_grants(id, tenant_id) ON DELETE RESTRICT
);

CREATE OR REPLACE FUNCTION enforce_agent_identity_lifecycle() RETURNS trigger AS $
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'draft' THEN
      RAISE EXCEPTION 'new agent identity must start as draft'
        USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NOT (
    (OLD.status = 'draft' AND NEW.status IN ('active','revoked')) OR
    (OLD.status = 'active' AND NEW.status IN ('paused','revoked')) OR
    (OLD.status = 'paused' AND NEW.status IN ('active','revoked'))
  ) THEN
    RAISE EXCEPTION 'invalid agent identity lifecycle transition'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS agent_identity_lifecycle_guard ON agent_identities;
CREATE TRIGGER agent_identity_lifecycle_guard
  BEFORE INSERT OR UPDATE OF status ON agent_identities
  FOR EACH ROW EXECUTE FUNCTION enforce_agent_identity_lifecycle();

CREATE OR REPLACE FUNCTION enforce_agent_grant_scope() RETURNS trigger AS $
DECLARE
  identity_branch TEXT;
  identity_status TEXT;
BEGIN
  SELECT branch_id, status INTO identity_branch, identity_status
  FROM agent_identities
  WHERE id = NEW.agent_id AND tenant_id = NEW.tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'agent identity not found in tenant'
      USING ERRCODE = '23503';
  END IF;

  IF TG_OP = 'INSERT' AND identity_status = 'revoked' THEN
    RAISE EXCEPTION 'revoked agent cannot receive grants'
      USING ERRCODE = '23514';
  END IF;

  IF identity_branch IS NOT NULL AND NEW.branch_id IS DISTINCT FROM identity_branch THEN
    RAISE EXCEPTION 'agent grant exceeds identity branch scope'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS agent_grant_scope_guard ON agent_grants;
CREATE TRIGGER agent_grant_scope_guard
  BEFORE INSERT OR UPDATE ON agent_grants
  FOR EACH ROW EXECUTE FUNCTION enforce_agent_grant_scope();

ALTER TABLE agent_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_identities FORCE ROW LEVEL SECURITY;
ALTER TABLE agent_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_grants FORCE ROW LEVEL SECURITY;
ALTER TABLE agent_authority_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_authority_events FORCE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS agent_grant_select ON agent_grants;
CREATE POLICY agent_grant_select ON agent_grants
  FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant', true));
DROP POLICY IF EXISTS agent_grant_insert ON agent_grants;
CREATE POLICY agent_grant_insert ON agent_grants
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));
DROP POLICY IF EXISTS agent_grant_update ON agent_grants;
CREATE POLICY agent_grant_update ON agent_grants
  FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS agent_event_select ON agent_authority_events;
CREATE POLICY agent_event_select ON agent_authority_events
  FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant', true));
DROP POLICY IF EXISTS agent_event_insert ON agent_authority_events;
CREATE POLICY agent_event_insert ON agent_authority_events
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

GRANT SELECT, INSERT ON agent_identities, agent_grants TO zyara_app;
GRANT UPDATE(status, updated_at) ON agent_identities TO zyara_app;
GRANT UPDATE(revoked_at, revoked_by_account_id) ON agent_grants TO zyara_app;
GRANT SELECT, INSERT ON agent_authority_events TO zyara_app;

-- C1 deliberately has no secret/API-token/private-key columns, no generic
-- shell/file/browser capability, and no clinical/financial capabilities.
--
-- ROLLBACK (manual, audited):
-- DROP TABLE IF EXISTS agent_authority_events, agent_grants, agent_identities;
-- DROP FUNCTION IF EXISTS enforce_agent_grant_scope();
-- DROP FUNCTION IF EXISTS enforce_agent_identity_lifecycle();
