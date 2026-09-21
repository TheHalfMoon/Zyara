-- N5/C4: audit-chain qualification (additive, forward-only).
--
-- C4 does not add another audit log. It closes two genuine join gaps that existed in earlier
-- slices and adds one read-only, tenant-scoped projection over the append-only trails that
-- already exist, so an important action can be reconstructed from the records its owning slice
-- already keeps.
--
--   * W2 coverage exceptions carried no correlation reference, so a coverage exception could
--     not be joined to the chain that produced it. An optional column is added.
--   * W4 verified inbound provider events carried no Zyara correlation reference, because the
--     provider supplies none. A deterministic, tenant-scoped reference minted at the boundary
--     is added.
--   * `audit_chain_entries` is a read-only view over the existing trails. It owns no data, it
--     cannot be written, and `security_invoker` makes the querying role's row-level security
--     apply to the base tables instead of the view owner's privileges.
--
-- No existing column, constraint, row, policy or grant is modified, and no row is rewritten.
-- No cryptographic tamper-evidence is implemented or claimed: append-only means the
-- application role holds no update or delete path, which is not the same as WORM storage.

-- ---------------------------------------------------------------------------
-- W2: coverage exceptions become chain-joinable
-- ---------------------------------------------------------------------------

ALTER TABLE coverage_exceptions ADD COLUMN IF NOT EXISTS correlation_id TEXT;

ALTER TABLE coverage_exceptions DROP CONSTRAINT IF EXISTS coverage_exceptions_correlation_id_check;
ALTER TABLE coverage_exceptions ADD CONSTRAINT coverage_exceptions_correlation_id_check CHECK (
  correlation_id IS NULL OR (
    correlation_id ~ '^[A-Za-z0-9_.:-]{1,128}$'
    AND correlation_id !~ '^[0-9]{7,}$'
    AND correlation_id !~ '[0-9]{9,}'
    AND correlation_id !~* '(secret://|bearer|api[_-]?key|access[_-]?token|refresh[_-]?token|app[_-]?secret|verify[_-]?token|private[_-]?key|password|passwd|credential|authorization|eaag)'
  )
);

CREATE INDEX IF NOT EXISTS coverage_exceptions_correlation_idx
  ON coverage_exceptions(tenant_id, correlation_id)
  WHERE correlation_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- W4: an inbound provider event gets a boundary-minted correlation reference
-- ---------------------------------------------------------------------------
-- The reference is a minted digest, so its shape check deliberately allows a long digit run;
-- credential material and prose are still refused outright.

ALTER TABLE whatsapp_webhook_receipts ADD COLUMN IF NOT EXISTS correlation_ref TEXT;

ALTER TABLE whatsapp_webhook_receipts DROP CONSTRAINT IF EXISTS whatsapp_webhook_receipts_correlation_ref_check;
ALTER TABLE whatsapp_webhook_receipts ADD CONSTRAINT whatsapp_webhook_receipts_correlation_ref_check CHECK (
  correlation_ref IS NULL OR (
    correlation_ref ~ '^[A-Za-z0-9_.:-]{1,128}$'
    AND correlation_ref !~* '(secret://|bearer|api[_-]?key|access[_-]?token|refresh[_-]?token|app[_-]?secret|verify[_-]?token|private[_-]?key|password|passwd|credential|authorization|eaag)'
  )
);

CREATE INDEX IF NOT EXISTS whatsapp_webhook_receipts_correlation_idx
  ON whatsapp_webhook_receipts(tenant_id, correlation_ref)
  WHERE correlation_ref IS NOT NULL;

-- ---------------------------------------------------------------------------
-- The read-only reconstruction surface
-- ---------------------------------------------------------------------------
-- One row per authoritative record that carries a correlation reference. The view projects
-- only scope, source, a bounded record reference, a closed outcome code and a timestamp: it
-- never exposes a payload, a message body, a contact, a clinical field or a credential.

CREATE OR REPLACE VIEW audit_chain_entries
WITH (security_invoker = true)
AS
SELECT 'workforce.tasks'::text AS source_domain,
       t.tenant_id,
       t.branch_id,
       t.id AS record_ref,
       t.correlation_id,
       t.kind AS outcome_code,
       t.created_at AS occurred_at
  FROM ops_tasks t
 WHERE t.correlation_id IS NOT NULL
UNION ALL
SELECT 'workforce.coverage', c.tenant_id, c.branch_id, c.id, c.correlation_id, c.kind, c.observed_at
  FROM coverage_exceptions c
 WHERE c.correlation_id IS NOT NULL
UNION ALL
SELECT 'identity.agents', a.tenant_id, a.branch_id, a.id, a.correlation_id, a.kind, a.created_at
  FROM agent_identities a
 WHERE a.correlation_id IS NOT NULL
UNION ALL
SELECT 'communications.whatsapp', r.tenant_id, NULL::text, r.id, r.correlation_ref,
       r.event_kind, r.received_at
  FROM whatsapp_webhook_receipts r
 WHERE r.correlation_ref IS NOT NULL
UNION ALL
SELECT 'collaboration.approvals', s.tenant_id, s.branch_id, s.id, s.correlation_id, s.status, s.created_at
  FROM approval_requests s
 WHERE s.correlation_id IS NOT NULL
UNION ALL
SELECT 'collaboration.exceptions', e.tenant_id, e.branch_id, e.id, e.correlation_id, e.status, e.opened_at
  FROM exception_cases e
 WHERE e.correlation_id IS NOT NULL
UNION ALL
SELECT 'activity.projection', v.tenant_id, v.branch_id, v.id, v.correlation_id, v.result, v.occurred_at
  FROM activity_events v
 WHERE v.correlation_id IS NOT NULL;

-- The view is a read path only. No INSERT, UPDATE or DELETE is granted on it, and the
-- base-table grants are unchanged, so a reconstruction cannot become a write route.
REVOKE ALL ON audit_chain_entries FROM PUBLIC;
GRANT SELECT ON audit_chain_entries TO zyara_app;

-- ROLLBACK (manual, audited, only when no dependent data remains):
--   DROP VIEW IF EXISTS audit_chain_entries;
--   ALTER TABLE whatsapp_webhook_receipts DROP COLUMN IF EXISTS correlation_ref;
--   ALTER TABLE coverage_exceptions DROP COLUMN IF EXISTS correlation_id;
-- Dropping the two columns discards only the correlation references added by C4; no existing
-- column, constraint or row is affected by this migration.
