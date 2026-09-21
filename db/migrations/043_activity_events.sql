-- N5/C2: derived human + agent operational activity (additive).
-- Concept donor reference: block/buzz (Apache-2.0), unified event/activity stream
-- and human/agent membership in one workspace. No Buzz source is copied into this
-- migration and no Nostr event model is adopted.
--
-- Activity is a projection, never authority. This table records that an
-- authoritative domain event happened. It owns no appointment, encounter,
-- prescription, order, result, claim, payment, eligibility, authorization, staff
-- authority or patient clinical fact, and nothing here writes back into them.
--
-- Privacy posture: a row carries only closed-enum codes, projector-minted opaque
-- references, small integers and timestamps. There is no prose column, no title
-- column and no note column. Readable titles are derived from the closed
-- enumerations at read time, so a feed title can never carry patient text.
--
-- Reference shape used below: a stored reference is always `<prefix>_<hex digest>`;
-- a source-owned metadata string is always a bounded reference token. Whitespace,
-- "@" and "+" are outside the alphabet, so an email address or an international
-- phone number cannot be stored, a long digit run (a national id or phone number)
-- is refused, and credential material is refused outright: no stored activity field
-- may be secret material, and no credential reference belongs in a feed.

CREATE TABLE IF NOT EXISTS activity_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  branch_id TEXT,
  -- Explicit actor typing. A free-text actor name can never satisfy this model.
  actor_kind TEXT NOT NULL CHECK (actor_kind IN ('human', 'agent', 'system', 'external')),
  actor_account_id TEXT CHECK (
    actor_account_id IS NULL OR (
      actor_account_id ~ '^[A-Za-z0-9_.:-]{1,128}$'
      AND actor_account_id !~ '^[0-9]{7,}$'
      AND actor_account_id !~ '[0-9]{9,}'
      AND actor_account_id !~* '(secret://|bearer|api[_-]?key|access[_-]?token|refresh[_-]?token|app[_-]?secret|verify[_-]?token|private[_-]?key|password|passwd|credential|authorization|eaag)'
    )
  ),
  actor_agent_id TEXT,
  actor_ref TEXT NOT NULL CHECK (actor_ref ~ '^[a-z]+_[0-9a-f]{16,64}$'),
  -- Derived authority annotation at projection time, so historical agent activity
  -- never reads as a live grant of authority.
  actor_authority TEXT NOT NULL CHECK (actor_authority IN (
    'active', 'suspended', 'revoked', 'expired', 'not_applicable'
  )),
  -- Closed source registry: a source domain that is not listed cannot be projected
  -- at all. Clinical domains are deliberately absent from this slice.
  source_domain TEXT NOT NULL CHECK (source_domain IN (
    'workforce.tasks', 'identity.agents', 'communications.whatsapp'
  )),
  source_event_id TEXT NOT NULL CHECK (
    source_event_id ~ '^[A-Za-z0-9_.:-]{1,128}$'
    AND source_event_id !~ '^[0-9]{7,}$'
    AND source_event_id !~ '[0-9]{9,}'
    AND source_event_id !~* '(secret://|bearer|api[_-]?key|access[_-]?token|refresh[_-]?token|app[_-]?secret|verify[_-]?token|private[_-]?key|password|passwd|credential|authorization|eaag)'
  ),
  source_event_version INTEGER NOT NULL DEFAULT 1 CHECK (source_event_version >= 1),
  projection_version INTEGER NOT NULL DEFAULT 1 CHECK (projection_version = 1),
  category TEXT NOT NULL CHECK (category IN ('task', 'agent_identity', 'communication')),
  action TEXT NOT NULL CHECK (action IN (
    'created', 'assigned', 'transitioned', 'commented',
    'capability_granted', 'capability_revoked', 'suspended', 'reactivated',
    'revoked', 'credential_rotated', 'received', 'observed'
  )),
  result TEXT NOT NULL CHECK (result IN (
    'proposed', 'observed', 'succeeded', 'failed', 'denied', 'rejected', 'expired', 'unresolved'
  )),
  -- Subject references stay inside the operational universe owned by Zyara. A
  -- clinical subject type is not expressible here.
  subject_type TEXT NOT NULL DEFAULT 'none' CHECK (subject_type IN (
    'none', 'task', 'agent_identity', 'staff_assignment', 'facility', 'conversation'
  )),
  subject_ref TEXT CHECK (subject_ref IS NULL OR subject_ref ~ '^subject_[0-9a-f]{16,64}$'),
  -- Sensitivity class and visibility scope are separate: an operations reader is not
  -- silently granted clinical detail by being granted branch visibility.
  sensitivity TEXT NOT NULL DEFAULT 'operational' CHECK (sensitivity IN ('operational', 'restricted')),
  visibility_scope TEXT NOT NULL DEFAULT 'branch' CHECK (visibility_scope IN (
    'tenant', 'branch', 'workflow', 'private'
  )),
  correlation_id TEXT CHECK (
    correlation_id IS NULL OR (
      correlation_id ~ '^[A-Za-z0-9_.:-]{1,128}$'
      AND correlation_id !~ '^[0-9]{7,}$'
      AND correlation_id !~ '[0-9]{9,}'
      AND correlation_id !~* '(secret://|bearer|api[_-]?key|access[_-]?token|refresh[_-]?token|app[_-]?secret|verify[_-]?token|private[_-]?key|password|passwd|credential|authorization|eaag)'
    )
  ),
  occurred_at TIMESTAMPTZ NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- The payload is a flat map of closed-key codes and small integers. It cannot hold
  -- nested structure, prose, a long value, an unbounded clinical narrative or secret
  -- material, and every enum-valued key is checked against its own closed vocabulary.
  payload JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (
    jsonb_typeof(payload) = 'object'
    AND payload - ARRAY[
          'channel','provider','attempt','count','taskKind','previousValue','newValue','originKind'
        ] = '{}'::jsonb
    AND length(payload::text) <= 512
    AND payload::text ~ '^\{(("[a-zA-Z]+": ?("[A-Za-z0-9_.:-]*"|[0-9]{1,6}))(, ?"[a-zA-Z]+": ?("[A-Za-z0-9_.:-]*"|[0-9]{1,6}))*)?\}$'
    AND payload::text !~* '(secret://|bearer|api[_-]?key|access[_-]?token|refresh[_-]?token|app[_-]?secret|verify[_-]?token|private[_-]?key|password|passwd|credential|authorization|eaag)'
    AND (NOT payload ? 'channel' OR payload->>'channel' IN ('whatsapp','email','sms','push','in_app','secure_message'))
    AND (NOT payload ? 'provider' OR payload->>'provider' IN ('meta','synthetic','none'))
    AND (NOT payload ? 'taskKind' OR payload->>'taskKind' IN (
          'facility_helpdesk','it_access','referral_follow_up','prior_auth_exception',
          'refill_routing','result_review','automation_handoff'))
    AND (NOT payload ? 'originKind' OR payload->>'originKind' IN ('human','automation'))
    AND (NOT payload ? 'previousValue' OR payload->>'previousValue' IN (
          'open','in_progress','blocked','resolved','cancelled','none'))
    AND (NOT payload ? 'newValue' OR payload->>'newValue' IN (
          'open','in_progress','blocked','resolved','cancelled','none'))
  ),
  -- Corrections are appended, never written over the original record.
  supersedes_activity_id TEXT,
  source_ref TEXT NOT NULL CHECK (
    source_ref ~ '^[A-Za-z0-9_.:-]{1,128}$'
    AND source_ref !~ '^[0-9]{7,}$'
    AND source_ref !~ '[0-9]{9,}'
    AND source_ref !~* '(secret://|bearer|api[_-]?key|access[_-]?token|refresh[_-]?token|app[_-]?secret|verify[_-]?token|private[_-]?key|password|passwd|credential|authorization|eaag)'
  ),
  source_revision TEXT NOT NULL CHECK (
    source_revision ~ '^[A-Za-z0-9_.:-]{1,128}$'
    AND source_revision !~ '^[0-9]{7,}$'
    AND source_revision !~ '[0-9]{9,}'
    AND source_revision !~* '(secret://|bearer|api[_-]?key|access[_-]?token|refresh[_-]?token|app[_-]?secret|verify[_-]?token|private[_-]?key|password|passwd|credential|authorization|eaag)'
  ),
  UNIQUE (id, tenant_id),
  -- Actor integrity: the actor kind decides which reference must be present.
  CHECK ((actor_kind = 'human') = (actor_account_id IS NOT NULL)),
  CHECK ((actor_kind = 'agent') = (actor_agent_id IS NOT NULL)),
  -- An agent-authored record must carry a resolved authority state, and a
  -- non-agent record must not claim one.
  CHECK ((actor_kind = 'agent') <> (actor_authority = 'not_applicable')),
  -- A subject reference requires a subject type, and vice versa.
  CHECK ((subject_type = 'none') = (subject_ref IS NULL)),
  -- Visibility must be consistent with the branch scope of the row.
  CHECK (visibility_scope <> 'branch' OR branch_id IS NOT NULL),
  CHECK (visibility_scope <> 'tenant' OR branch_id IS NULL),
  CHECK (supersedes_activity_id IS NULL OR supersedes_activity_id <> id),
  FOREIGN KEY (actor_agent_id, tenant_id)
    REFERENCES agent_identities(id, tenant_id) ON DELETE RESTRICT,
  FOREIGN KEY (branch_id, tenant_id)
    REFERENCES branch_locations(id, tenant_id) ON DELETE RESTRICT,
  FOREIGN KEY (supersedes_activity_id, tenant_id)
    REFERENCES activity_events(id, tenant_id) ON DELETE RESTRICT
);

-- Deduplication for at-least-once delivery: one derived activity record per
-- (tenant, source domain, source event id, projection version).
CREATE UNIQUE INDEX IF NOT EXISTS activity_events_source_uidx
  ON activity_events(tenant_id, source_domain, source_event_id, projection_version);
CREATE INDEX IF NOT EXISTS activity_events_tenant_occurred_idx
  ON activity_events(tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS activity_events_tenant_branch_occurred_idx
  ON activity_events(tenant_id, branch_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS activity_events_tenant_actor_agent_idx
  ON activity_events(tenant_id, actor_agent_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS activity_events_tenant_subject_idx
  ON activity_events(tenant_id, subject_type, subject_ref, occurred_at DESC);

ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS activity_event_select ON activity_events;
CREATE POLICY activity_event_select ON activity_events
  FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant', true));
DROP POLICY IF EXISTS activity_event_insert ON activity_events;
CREATE POLICY activity_event_insert ON activity_events
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

-- Append-only: the application role holds SELECT and INSERT only, so no UPDATE and
-- no DELETE path exists for it. History is corrected by appending a superseding
-- record, never by rewriting a stored row.
GRANT SELECT, INSERT ON activity_events TO zyara_app;

-- ROLLBACK (manual, audited, only when no dependent data remains):
-- DROP TABLE IF EXISTS activity_events;
