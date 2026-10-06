-- AIF-01B: durable capability registry, grants and resolution receipts (additive).
-- Authority: docs/evidence/AIF/AIF-01B/WORK_PACKET.md (AIF handoff §5).
--
-- Every table is append-only for the application: no UPDATE or DELETE grant exists, so an
-- admitted definition, a grant, a revocation, an approval claim and a resolution receipt can
-- never be rewritten in place. Current state (definition status, grant revocation) is derived
-- by replaying the append-only rows. Tenant tables use FORCE ROW LEVEL SECURITY keyed on the
-- server-set app.current_tenant, following migrations 042-044. No secret, parameter value or
-- free text from a request is ever a column here.

-- Installation-scoped catalog: holds no tenant data, so it has no tenant_id and no RLS. Only
-- the migrator (release pipeline) can admit a definition; the application can only read.
CREATE TABLE IF NOT EXISTS capability_definitions (
  capability_id TEXT NOT NULL CHECK (capability_id ~ '^[a-z][a-z0-9_]{0,39}(\.[a-z][a-z0-9_]{0,39}){1,5}$'),
  version TEXT NOT NULL CHECK (version ~ '^(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})$'),
  definition_digest TEXT NOT NULL UNIQUE CHECK (definition_digest ~ '^cap_[0-9a-f]{64}$'),
  owner_domain TEXT NOT NULL CHECK (owner_domain ~ '^[a-z][a-z0-9_]{1,39}$'),
  read_or_write TEXT NOT NULL CHECK (read_or_write IN ('read', 'write')),
  authority_class TEXT NOT NULL CHECK (authority_class IN (
    'A0_OBSERVE', 'A1_DRAFT', 'A2_PREPARE', 'A3_EXECUTE_LOW', 'A4_EXECUTE_MED', 'A5_HUMAN_ONLY'
  )),
  risk_class TEXT NOT NULL CHECK (risk_class IN ('routine', 'elevated', 'high', 'critical')),
  definition JSONB NOT NULL CHECK (jsonb_typeof(definition) = 'object'),
  -- Optional provider-adapter binding (M036 certification is checked at resolution time).
  adapter_id TEXT CHECK (adapter_id IS NULL OR adapter_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  adapter_capability TEXT CHECK (adapter_capability IS NULL OR adapter_capability IN (
    'read', 'availability', 'notifications', 'create', 'cancel', 'reschedule', 'atomic-hold',
    'conflict-enforcement', 'reconciliation', 'events', 'identity-assurance'
  )),
  registered_by_kind TEXT NOT NULL CHECK (registered_by_kind IN ('platform_admin', 'release_pipeline')),
  registered_by_id TEXT NOT NULL CHECK (registered_by_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (capability_id, version),
  -- Target of the grant FK, so a grant row carries the definition's authority class.
  UNIQUE (capability_id, version, authority_class),
  CHECK ((adapter_id IS NULL) = (adapter_capability IS NULL)),
  -- The contract's cross-field rule, enforced again by the database.
  CHECK (read_or_write = 'read' OR authority_class NOT IN ('A0_OBSERVE', 'A1_DRAFT'))
);

CREATE TABLE IF NOT EXISTS capability_definition_status_events (
  id TEXT PRIMARY KEY,
  capability_id TEXT NOT NULL,
  version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'revoked', 'quarantined')),
  reason_code TEXT NOT NULL CHECK (reason_code ~ '^[a-z][a-z0-9_]{1,63}$'),
  actor_id TEXT NOT NULL CHECK (actor_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (capability_id, version) REFERENCES capability_definitions(capability_id, version) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS capability_grants (
  id TEXT NOT NULL CHECK (id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  tenant_id TEXT NOT NULL,
  -- NULL = tenant-wide; only legal for a TENANT_WIDE capability (checked by the contract).
  branch_id TEXT,
  grantee_kind TEXT NOT NULL CHECK (grantee_kind IN ('agent', 'human_role', 'workflow')),
  grantee_id TEXT NOT NULL CHECK (grantee_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  capability_id TEXT NOT NULL,
  version TEXT NOT NULL,
  authority_class TEXT NOT NULL,
  granted_by TEXT NOT NULL CHECK (granted_by ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  PRIMARY KEY (id),
  UNIQUE (id, tenant_id),
  FOREIGN KEY (capability_id, version, authority_class)
    REFERENCES capability_definitions(capability_id, version, authority_class) ON DELETE RESTRICT,
  FOREIGN KEY (branch_id, tenant_id) REFERENCES branch_locations(id, tenant_id) ON DELETE RESTRICT,
  -- A5 is human-only, in the database as in the contract.
  CHECK (authority_class <> 'A5_HUMAN_ONLY' OR grantee_kind = 'human_role'),
  -- Agent and workflow authority is bounded like N5/C1 agent identities.
  CHECK (grantee_kind = 'human_role' OR expires_at IS NOT NULL),
  CHECK (expires_at IS NULL OR (expires_at > granted_at AND expires_at <= granted_at + interval '90 days'))
);

CREATE TABLE IF NOT EXISTS capability_grant_revocations (
  grant_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  revoked_by TEXT NOT NULL CHECK (revoked_by ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  reason_code TEXT NOT NULL CHECK (reason_code ~ '^[a-z][a-z0-9_]{1,63}$'),
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One revocation per grant; a grant is never un-revoked (issue a new grant instead).
  PRIMARY KEY (grant_id),
  FOREIGN KEY (grant_id, tenant_id) REFERENCES capability_grants(id, tenant_id) ON DELETE RESTRICT
);

-- One approval authorizes one invocation identity. The primary key is the race-safe
-- serialization point: of two concurrent claims only one insert succeeds.
CREATE TABLE IF NOT EXISTS capability_approval_claims (
  tenant_id TEXT NOT NULL,
  approval_request_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL CHECK (idempotency_key ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  receipt_digest TEXT NOT NULL CHECK (receipt_digest ~ '^res_[0-9a-f]{64}$'),
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, approval_request_id),
  FOREIGN KEY (approval_request_id, tenant_id) REFERENCES approval_requests(id, tenant_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS capability_resolution_receipts (
  receipt_digest TEXT NOT NULL CHECK (receipt_digest ~ '^res_[0-9a-f]{64}$'),
  tenant_id TEXT NOT NULL,
  branch_id TEXT,
  decision TEXT NOT NULL CHECK (decision IN ('ALLOW', 'ASK', 'DENY', 'UNDECIDABLE')),
  reason_codes TEXT[] NOT NULL CHECK (cardinality(reason_codes) >= 1),
  capability_id TEXT,
  version TEXT,
  definition_digest TEXT CHECK (definition_digest IS NULL OR definition_digest ~ '^cap_[0-9a-f]{64}$'),
  actor_kind TEXT NOT NULL CHECK (actor_kind IN ('human', 'agent', 'workflow')),
  actor_ref TEXT,
  parameters_digest TEXT CHECK (parameters_digest IS NULL OR parameters_digest ~ '^params_[0-9a-f]{64}$'),
  correlation_id TEXT,
  idempotency_key TEXT,
  grant_id TEXT,
  approval_request_id TEXT,
  decided_at TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- The same decision recomputed (same digest) is recorded once.
  PRIMARY KEY (tenant_id, receipt_digest),
  -- Without trusted time a decision can only be UNDECIDABLE.
  CHECK (decided_at IS NOT NULL OR decision = 'UNDECIDABLE'),
  CHECK (decision <> 'ALLOW' OR (valid_until IS NOT NULL AND valid_until > decided_at AND grant_id IS NOT NULL)),
  -- Opaque tokens only: bounded shape, no all-digit identifier, no long digit run.
  CHECK (correlation_id IS NULL OR (correlation_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$' AND correlation_id !~ '^[0-9]{7,}$')),
  CHECK (idempotency_key IS NULL OR idempotency_key ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  CHECK (actor_ref IS NULL OR actor_ref ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$')
);

CREATE INDEX IF NOT EXISTS capability_grants_lookup_idx
  ON capability_grants(tenant_id, grantee_kind, grantee_id, capability_id, version);
CREATE INDEX IF NOT EXISTS capability_definition_status_events_idx
  ON capability_definition_status_events(capability_id, version, occurred_at);
CREATE INDEX IF NOT EXISTS capability_resolution_receipts_tenant_time_idx
  ON capability_resolution_receipts(tenant_id, decided_at);

ALTER TABLE capability_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE capability_grants FORCE ROW LEVEL SECURITY;
ALTER TABLE capability_grant_revocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE capability_grant_revocations FORCE ROW LEVEL SECURITY;
ALTER TABLE capability_approval_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE capability_approval_claims FORCE ROW LEVEL SECURITY;
ALTER TABLE capability_resolution_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE capability_resolution_receipts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS capability_grant_select ON capability_grants;
CREATE POLICY capability_grant_select ON capability_grants
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant', true));
DROP POLICY IF EXISTS capability_grant_insert ON capability_grants;
CREATE POLICY capability_grant_insert ON capability_grants
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS capability_grant_revocation_select ON capability_grant_revocations;
CREATE POLICY capability_grant_revocation_select ON capability_grant_revocations
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant', true));
DROP POLICY IF EXISTS capability_grant_revocation_insert ON capability_grant_revocations;
CREATE POLICY capability_grant_revocation_insert ON capability_grant_revocations
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS capability_approval_claim_select ON capability_approval_claims;
CREATE POLICY capability_approval_claim_select ON capability_approval_claims
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant', true));
DROP POLICY IF EXISTS capability_approval_claim_insert ON capability_approval_claims;
CREATE POLICY capability_approval_claim_insert ON capability_approval_claims
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS capability_receipt_select ON capability_resolution_receipts;
CREATE POLICY capability_receipt_select ON capability_resolution_receipts
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant', true));
DROP POLICY IF EXISTS capability_receipt_insert ON capability_resolution_receipts;
CREATE POLICY capability_receipt_insert ON capability_resolution_receipts
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

GRANT SELECT, INSERT ON capability_definitions, capability_definition_status_events TO zyara_migrator;
GRANT SELECT ON capability_definitions, capability_definition_status_events TO zyara_app;
GRANT SELECT, INSERT ON capability_grants, capability_grant_revocations,
  capability_approval_claims, capability_resolution_receipts TO zyara_app;

-- ROLLBACK (manual, audited, only when no dependent data remains):
-- DROP TABLE IF EXISTS capability_resolution_receipts, capability_approval_claims,
--   capability_grant_revocations, capability_grants, capability_definition_status_events,
--   capability_definitions;
