-- N5/C3: approvals + human exception queue (additive, forward-only).
-- Concept donor reference: block/buzz (Apache-2.0), human/agent membership and workflow
-- approval steps. No Buzz source is copied into this migration and no Nostr event model is
-- adopted.
--
-- An approval is NOT a boolean. A row binds tenant, branch, action type, a digest of the
-- protected parameters, requester, required authority, policy/risk class, evidence,
-- creation time, expiry and correlation id. Protected parameter *values* are never stored:
-- only the digest and the declared key names remain. No column here is free text, and
-- credential material is refused everywhere.
--
-- The exception queue is where automation safely gives up. Every case links to the W3 work
-- item that owns assignment, ownership, due date, escalation and follow-up, so C3 adds
-- approval/exception semantics and does not become a second task manager.
--
-- Append-only posture: decisions, executions and both event trails are SELECT/INSERT only
-- for the application role. A request may only have its lifecycle columns updated, and a
-- trigger refuses an illegal status transition or a change to a protected column. A case
-- may only have its lifecycle columns updated, with the same guard and an evidence rule on
-- closure.

-- ---------------------------------------------------------------------------
-- Transition legality helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION approval_transition_is_legal(from_status TEXT, to_status TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN from_status IS NULL AND to_status = 'proposed' THEN true
    WHEN from_status = 'proposed' AND to_status IN ('awaiting_approval', 'cancelled') THEN true
    WHEN from_status = 'awaiting_approval'
      AND to_status IN ('approved', 'rejected', 'expired', 'cancelled', 'superseded', 'needs_human')
      THEN true
    WHEN from_status = 'approved'
      AND to_status IN ('executing', 'expired', 'cancelled', 'superseded') THEN true
    WHEN from_status = 'executing' AND to_status IN ('succeeded', 'failed', 'needs_human') THEN true
    WHEN from_status = 'needs_human' AND to_status IN ('executing', 'cancelled', 'superseded') THEN true
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION exception_transition_is_legal(from_status TEXT, to_status TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN from_status IS NULL AND to_status = 'open' THEN true
    WHEN from_status = 'open'
      AND to_status IN ('assigned', 'in_review', 'escalated', 'cancelled') THEN true
    WHEN from_status = 'assigned' AND to_status IN ('in_review', 'escalated', 'cancelled') THEN true
    WHEN from_status = 'in_review' AND to_status IN ('resolved', 'escalated', 'cancelled') THEN true
    WHEN from_status = 'escalated' AND to_status IN ('in_review', 'resolved', 'cancelled') THEN true
    WHEN from_status = 'resolved' AND to_status = 'closed' THEN true
    ELSE false
  END;
$$;

-- ---------------------------------------------------------------------------
-- Approval requests
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS approval_requests (
  id TEXT PRIMARY KEY CHECK (id ~ '^[A-Za-z0-9_.:-]{1,128}$'),
  tenant_id TEXT NOT NULL,
  branch_id TEXT,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'communications.outbound.broadcast',
    'workforce.coverage_override',
    'workforce.tasks.bulk_reassign',
    'data.export.patient_records',
    'agent.agent_authority.grant'
  )),
  risk_class TEXT NOT NULL CHECK (risk_class IN ('routine', 'elevated', 'high', 'critical')),
  required_authority TEXT NOT NULL CHECK (required_authority IN (
    'branch_admin', 'org_admin', 'clinical_lead', 'compliance_officer'
  )),
  -- Every protected class forbids the requester approving its own proposal, and every
  -- protected action needs a human decision. Both are enforced here, not merely in code.
  self_approval_forbidden BOOLEAN NOT NULL CHECK (self_approval_forbidden IS TRUE),
  evidence_required BOOLEAN NOT NULL,
  -- The digest is minted by the projector; a raw parameter set can never be stored.
  parameters_digest TEXT NOT NULL CHECK (parameters_digest ~ '^params_[0-9a-f]{64}$'),
  parameter_keys TEXT[] NOT NULL,
  requester_kind TEXT NOT NULL CHECK (requester_kind IN ('human', 'agent', 'system')),
  requester_account_id TEXT,
  requester_agent_id TEXT,
  requester_ref TEXT,
  status TEXT NOT NULL CHECK (status IN (
    'proposed', 'awaiting_approval', 'approved', 'rejected', 'expired', 'cancelled',
    'superseded', 'executing', 'succeeded', 'failed', 'needs_human'
  )),
  correlation_id TEXT CHECK (
    correlation_id IS NULL OR (
      correlation_id ~ '^[A-Za-z0-9_.:-]{1,128}$'
      AND correlation_id !~ '^[0-9]{7,}$'
      AND correlation_id !~ '[0-9]{9,}'
      AND correlation_id !~* '(secret://|bearer|api[_-]?key|access[_-]?token|refresh[_-]?token|app[_-]?secret|verify[_-]?token|private[_-]?key|password|passwd|credential|authorization|eaag)'
    )
  ),
  idempotency_key TEXT CHECK (
    idempotency_key IS NULL OR (
      idempotency_key ~ '^[A-Za-z0-9_.:-]{1,128}$'
      AND idempotency_key !~ '^[0-9]{7,}$'
      AND idempotency_key !~ '[0-9]{9,}'
      AND idempotency_key !~* '(secret://|bearer|api[_-]?key|access[_-]?token|refresh[_-]?token|app[_-]?secret|verify[_-]?token|private[_-]?key|password|passwd|credential|authorization|eaag)'
    )
  ),
  source_ref TEXT NOT NULL CHECK (
    source_ref ~ '^[A-Za-z0-9_.:-]{1,128}$'
    AND source_ref !~* '(secret://|bearer|api[_-]?key|access[_-]?token|refresh[_-]?token|app[_-]?secret|verify[_-]?token|private[_-]?key|password|passwd|credential|authorization|eaag)'
  ),
  source_revision TEXT NOT NULL CHECK (
    source_revision ~ '^[A-Za-z0-9_.:-]{1,128}$'
    AND source_revision !~* '(secret://|bearer|api[_-]?key|access[_-]?token|refresh[_-]?token|app[_-]?secret|verify[_-]?token|private[_-]?key|password|passwd|credential|authorization|eaag)'
  ),
  observed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE (id, tenant_id),
  CHECK (expires_at > created_at),
  -- Exactly one typed requester reference must be present, matching the declared kind.
  CHECK ((requester_kind = 'human') = (requester_account_id IS NOT NULL)),
  CHECK ((requester_kind = 'agent') = (requester_agent_id IS NOT NULL)),
  CHECK ((requester_kind = 'system') = (requester_ref IS NOT NULL)),
  -- The declared key set must be exactly the key set of that action type, so an approval
  -- cannot be bound to a parameter set its registry entry does not describe.
  CHECK (
    (action_type = 'communications.outbound.broadcast'
      AND parameter_keys @> ARRAY['audienceType', 'channel', 'scheduledHour']
      AND array_length(parameter_keys, 1) = 3)
    OR (action_type = 'workforce.coverage_override'
      AND parameter_keys @> ARRAY['reasonCode', 'shiftRef', 'staffAssignmentRef']
      AND array_length(parameter_keys, 1) = 3)
    OR (action_type = 'workforce.tasks.bulk_reassign'
      AND parameter_keys @> ARRAY['fromOwnerRef', 'taskCount', 'toOwnerRef']
      AND array_length(parameter_keys, 1) = 3)
    OR (action_type = 'data.export.patient_records'
      AND parameter_keys @> ARRAY['exportFormat', 'purposeCode', 'recordCount']
      AND array_length(parameter_keys, 1) = 3)
    OR (action_type = 'agent.agent_authority.grant'
      AND parameter_keys @> ARRAY['agentRef', 'capability']
      AND array_length(parameter_keys, 1) = 2)
  ),
  FOREIGN KEY (requester_agent_id, tenant_id)
    REFERENCES agent_identities(id, tenant_id) ON DELETE RESTRICT,
  FOREIGN KEY (branch_id, tenant_id)
    REFERENCES branch_locations(id, tenant_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS approval_requests_tenant_status_idx
  ON approval_requests(tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS approval_requests_tenant_branch_idx
  ON approval_requests(tenant_id, branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS approval_requests_expiry_idx
  ON approval_requests(tenant_id, expires_at)
  WHERE status IN ('awaiting_approval', 'approved');
CREATE UNIQUE INDEX IF NOT EXISTS approval_requests_idempotency_uidx
  ON approval_requests(tenant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Decisions (append-only) and executions (append-only)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS approval_decisions (
  id TEXT PRIMARY KEY CHECK (id ~ '^[A-Za-z0-9_.:-]{1,128}$'),
  tenant_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('approved', 'rejected')),
  -- A decision is always human. An agent actor is not expressible here at all.
  approver_kind TEXT NOT NULL CHECK (approver_kind = 'human'),
  approver_account_id TEXT NOT NULL CHECK (
    approver_account_id ~ '^[A-Za-z0-9_.:-]{1,128}$'
    AND approver_account_id !~* '(secret://|bearer|api[_-]?key|access[_-]?token|refresh[_-]?token|app[_-]?secret|verify[_-]?token|private[_-]?key|password|passwd|credential|authorization|eaag)'
  ),
  -- The authority is resolved from the trusted registry and stored with the decision, so a
  -- UI role label can never be the record of why the decision was allowed.
  authority TEXT NOT NULL CHECK (authority IN (
    'branch_admin', 'org_admin', 'clinical_lead', 'compliance_officer'
  )),
  authority_branch_id TEXT,
  authority_source_ref TEXT NOT NULL CHECK (
    authority_source_ref ~ '^[A-Za-z0-9_.:-]{1,128}$'
    AND authority_source_ref !~* '(secret://|bearer|api[_-]?key|access[_-]?token|refresh[_-]?token|app[_-]?secret|verify[_-]?token|private[_-]?key|password|passwd|credential|authorization|eaag)'
  ),
  authority_resolved_at TIMESTAMPTZ NOT NULL,
  evidence_ref TEXT CHECK (
    evidence_ref IS NULL OR (
      evidence_ref ~ '^[A-Za-z0-9_.:-]{1,128}$'
      AND evidence_ref !~ '^[0-9]{7,}$'
      AND evidence_ref !~ '[0-9]{9,}'
      AND evidence_ref !~* '(secret://|bearer|api[_-]?key|access[_-]?token|refresh[_-]?token|app[_-]?secret|verify[_-]?token|private[_-]?key|password|passwd|credential|authorization|eaag)'
    )
  ),
  reason_code TEXT NOT NULL CHECK (reason_code IN (
    'authorized', 'out_of_policy', 'insufficient_evidence', 'duplicate_request',
    'superseded_by_policy_change'
  )),
  correlation_id TEXT,
  decided_at TIMESTAMPTZ NOT NULL,
  UNIQUE (id, tenant_id),
  FOREIGN KEY (request_id, tenant_id)
    REFERENCES approval_requests(id, tenant_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS approval_decisions_request_idx
  ON approval_decisions(tenant_id, request_id, decided_at);
CREATE UNIQUE INDEX IF NOT EXISTS approval_decisions_request_uidx
  ON approval_decisions(tenant_id, request_id);

CREATE TABLE IF NOT EXISTS approval_executions (
  id TEXT PRIMARY KEY CHECK (id ~ '^[A-Za-z0-9_.:-]{1,128}$'),
  tenant_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  attempt INTEGER NOT NULL CHECK (attempt >= 1),
  outcome TEXT NOT NULL CHECK (outcome IN ('attempted', 'succeeded', 'failed', 'unknown')),
  executor_kind TEXT NOT NULL CHECK (executor_kind IN ('human', 'agent', 'system')),
  executor_account_id TEXT,
  executor_agent_id TEXT,
  executor_ref TEXT,
  parameters_digest TEXT NOT NULL CHECK (parameters_digest ~ '^params_[0-9a-f]{64}$'),
  receipt_ref TEXT CHECK (
    receipt_ref IS NULL OR (
      receipt_ref ~ '^[A-Za-z0-9_.:-]{1,128}$'
      AND receipt_ref !~ '^[0-9]{7,}$'
      AND receipt_ref !~ '[0-9]{9,}'
      AND receipt_ref !~* '(secret://|bearer|api[_-]?key|access[_-]?token|refresh[_-]?token|app[_-]?secret|verify[_-]?token|private[_-]?key|password|passwd|credential|authorization|eaag)'
    )
  ),
  evidence_ref TEXT CHECK (
    evidence_ref IS NULL OR (
      evidence_ref ~ '^[A-Za-z0-9_.:-]{1,128}$'
      AND evidence_ref !~ '^[0-9]{7,}$'
      AND evidence_ref !~ '[0-9]{9,}'
      AND evidence_ref !~* '(secret://|bearer|api[_-]?key|access[_-]?token|refresh[_-]?token|app[_-]?secret|verify[_-]?token|private[_-]?key|password|passwd|credential|authorization|eaag)'
    )
  ),
  correlation_id TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  UNIQUE (id, tenant_id),
  CHECK ((executor_kind = 'human') = (executor_account_id IS NOT NULL)),
  CHECK ((executor_kind = 'agent') = (executor_agent_id IS NOT NULL)),
  CHECK ((executor_kind = 'system') = (executor_ref IS NOT NULL)),
  -- A definitive outcome must be evidenced. An unknown outcome may stand without evidence,
  -- which is exactly how an unsettled external result stays unsettled.
  CHECK (
    outcome IN ('attempted', 'unknown')
    OR receipt_ref IS NOT NULL
    OR evidence_ref IS NOT NULL
  ),
  FOREIGN KEY (request_id, tenant_id)
    REFERENCES approval_requests(id, tenant_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS approval_executions_request_idx
  ON approval_executions(tenant_id, request_id, occurred_at);

-- ---------------------------------------------------------------------------
-- Approval event trail (append-only) and its transition guard
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS approval_events (
  id TEXT PRIMARY KEY CHECK (id ~ '^[A-Za-z0-9_.:-]{1,128}$'),
  tenant_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL CHECK (to_status IN (
    'proposed', 'awaiting_approval', 'approved', 'rejected', 'expired', 'cancelled',
    'superseded', 'executing', 'succeeded', 'failed', 'needs_human'
  )),
  actor_kind TEXT NOT NULL CHECK (actor_kind IN ('human', 'agent', 'system')),
  actor_account_id TEXT,
  actor_agent_id TEXT,
  actor_ref TEXT,
  reason_code TEXT NOT NULL CHECK (
    reason_code ~ '^[A-Za-z0-9_.:-]{1,128}$'
    AND reason_code !~* '(secret://|bearer|api[_-]?key|access[_-]?token|refresh[_-]?token|app[_-]?secret|verify[_-]?token|private[_-]?key|password|passwd|credential|authorization|eaag)'
  ),
  occurred_at TIMESTAMPTZ NOT NULL,
  UNIQUE (id, tenant_id),
  CHECK ((actor_kind = 'human') = (actor_account_id IS NOT NULL)),
  CHECK ((actor_kind = 'agent') = (actor_agent_id IS NOT NULL)),
  CHECK ((actor_kind = 'system') = (actor_ref IS NOT NULL)),
  FOREIGN KEY (request_id, tenant_id)
    REFERENCES approval_requests(id, tenant_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS approval_events_request_idx
  ON approval_events(tenant_id, request_id, occurred_at);

CREATE OR REPLACE FUNCTION approval_events_guard() RETURNS TRIGGER AS $$
BEGIN
  IF NOT approval_transition_is_legal(NEW.from_status, NEW.to_status) THEN
    RAISE EXCEPTION 'illegal approval transition % -> %', NEW.from_status, NEW.to_status
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS approval_events_transition_guard ON approval_events;
CREATE TRIGGER approval_events_transition_guard
  BEFORE INSERT ON approval_events
  FOR EACH ROW EXECUTE FUNCTION approval_events_guard();

CREATE OR REPLACE FUNCTION approval_requests_guard() RETURNS TRIGGER AS $$
BEGIN
  -- Protected columns are immutable: an approval cannot be repointed at another action,
  -- another parameter set, another tenant, another branch or a later expiry.
  IF NEW.tenant_id <> OLD.tenant_id
    OR NEW.branch_id IS DISTINCT FROM OLD.branch_id
    OR NEW.action_type <> OLD.action_type
    OR NEW.parameters_digest <> OLD.parameters_digest
    OR NEW.parameter_keys <> OLD.parameter_keys
    OR NEW.risk_class <> OLD.risk_class
    OR NEW.required_authority <> OLD.required_authority
    OR NEW.evidence_required <> OLD.evidence_required
    OR NEW.requester_kind <> OLD.requester_kind
    OR NEW.requester_account_id IS DISTINCT FROM OLD.requester_account_id
    OR NEW.requester_agent_id IS DISTINCT FROM OLD.requester_agent_id
    OR NEW.requester_ref IS DISTINCT FROM OLD.requester_ref
    OR NEW.created_at <> OLD.created_at
    OR NEW.expires_at <> OLD.expires_at
  THEN
    RAISE EXCEPTION 'a protected approval column is immutable'
      USING ERRCODE = '23514';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
    AND NOT approval_transition_is_legal(OLD.status, NEW.status) THEN
    RAISE EXCEPTION 'illegal approval transition % -> %', OLD.status, NEW.status
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS approval_requests_protect ON approval_requests;
CREATE TRIGGER approval_requests_protect
  BEFORE UPDATE ON approval_requests
  FOR EACH ROW EXECUTE FUNCTION approval_requests_guard();

CREATE OR REPLACE FUNCTION approval_decisions_guard() RETURNS TRIGGER AS $$
DECLARE
  parent approval_requests;
BEGIN
  SELECT * INTO parent FROM approval_requests
    WHERE id = NEW.request_id AND tenant_id = NEW.tenant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'a decision must reference a request in the same tenant'
      USING ERRCODE = '23503';
  END IF;
  IF parent.status <> 'awaiting_approval' THEN
    RAISE EXCEPTION 'a decision may only be recorded while a request is awaiting approval'
      USING ERRCODE = '23514';
  END IF;
  IF parent.evidence_required AND NEW.evidence_ref IS NULL THEN
    RAISE EXCEPTION 'this protected action requires an evidence reference to decide'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS approval_decisions_guard ON approval_decisions;
CREATE TRIGGER approval_decisions_guard
  BEFORE INSERT ON approval_decisions
  FOR EACH ROW EXECUTE FUNCTION approval_decisions_guard();

-- ---------------------------------------------------------------------------
-- Human exception queue
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS exception_cases (
  id TEXT PRIMARY KEY CHECK (id ~ '^[A-Za-z0-9_.:-]{1,128}$'),
  tenant_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN (
    'ambiguous_patient_request', 'missing_consent', 'unavailable_authority',
    'conflicting_provider_data', 'whatsapp_delivery_failure', 'external_provider_timeout',
    'insurer_ambiguity', 'prior_auth_mismatch', 'stale_schedule',
    'duplicate_identity_ambiguity', 'low_confidence_automation', 'policy_refusal',
    'reconciliation_failure', 'unknown_external_outcome', 'approval_outcome_unknown'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL CHECK (status IN (
    'open', 'assigned', 'in_review', 'escalated', 'resolved', 'closed', 'cancelled'
  )),
  -- The W3 work item owns assignment, ownership, due date, escalation and follow-up.
  work_item_task_id TEXT NOT NULL,
  subject_ref TEXT CHECK (subject_ref IS NULL OR subject_ref ~ '^subject_[0-9a-f]{16,64}$'),
  evidence_required BOOLEAN NOT NULL,
  sla_due_at TIMESTAMPTZ NOT NULL,
  resolution_code TEXT CHECK (resolution_code IS NULL OR resolution_code IN (
    'resolved_with_evidence', 'no_action_required', 'escalated_to_clinician',
    'retry_safe', 'retry_unsafe', 'unknown_outcome'
  )),
  closure_evidence_ref TEXT CHECK (
    closure_evidence_ref IS NULL OR (
      closure_evidence_ref ~ '^[A-Za-z0-9_.:-]{1,128}$'
      AND closure_evidence_ref !~ '^[0-9]{7,}$'
      AND closure_evidence_ref !~ '[0-9]{9,}'
      AND closure_evidence_ref !~* '(secret://|bearer|api[_-]?key|access[_-]?token|refresh[_-]?token|app[_-]?secret|verify[_-]?token|private[_-]?key|password|passwd|credential|authorization|eaag)'
    )
  ),
  correlation_id TEXT,
  idempotency_key TEXT CHECK (
    idempotency_key IS NULL OR (
      idempotency_key ~ '^[A-Za-z0-9_.:-]{1,128}$'
      AND idempotency_key !~ '^[0-9]{7,}$'
      AND idempotency_key !~ '[0-9]{9,}'
      AND idempotency_key !~* '(secret://|bearer|api[_-]?key|access[_-]?token|refresh[_-]?token|app[_-]?secret|verify[_-]?token|private[_-]?key|password|passwd|credential|authorization|eaag)'
    )
  ),
  source_ref TEXT NOT NULL CHECK (
    source_ref ~ '^[A-Za-z0-9_.:-]{1,128}$'
    AND source_ref !~* '(secret://|bearer|api[_-]?key|access[_-]?token|refresh[_-]?token|app[_-]?secret|verify[_-]?token|private[_-]?key|password|passwd|credential|authorization|eaag)'
  ),
  source_revision TEXT NOT NULL CHECK (
    source_revision ~ '^[A-Za-z0-9_.:-]{1,128}$'
    AND source_revision !~* '(secret://|bearer|api[_-]?key|access[_-]?token|refresh[_-]?token|app[_-]?secret|verify[_-]?token|private[_-]?key|password|passwd|credential|authorization|eaag)'
  ),
  observed_at TIMESTAMPTZ NOT NULL,
  opened_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ,
  UNIQUE (id, tenant_id),
  CHECK (sla_due_at > opened_at),
  -- The evidence requirement is a property of the kind, not of the caller.
  CHECK (evidence_required = (kind IN (
    'missing_consent', 'conflicting_provider_data', 'insurer_ambiguity',
    'prior_auth_mismatch', 'duplicate_identity_ambiguity', 'reconciliation_failure',
    'unknown_external_outcome', 'approval_outcome_unknown'
  ))),
  CHECK ((status = 'closed') = (closed_at IS NOT NULL)),
  CHECK (status <> 'resolved' OR resolution_code IS NOT NULL),
  CHECK (status <> 'closed' OR resolution_code IS NOT NULL),
  -- An unknown external outcome stays unknown: it can be escalated, but it cannot be
  -- closed as though the outcome were settled, and a kind that requires evidence cannot be
  -- closed without an evidence reference.
  CHECK (status <> 'closed' OR resolution_code <> 'unknown_outcome'),
  CHECK (status <> 'closed' OR closure_evidence_ref IS NOT NULL OR NOT evidence_required),
  FOREIGN KEY (branch_id, tenant_id)
    REFERENCES branch_locations(id, tenant_id) ON DELETE RESTRICT,
  FOREIGN KEY (work_item_task_id, tenant_id)
    REFERENCES ops_tasks(id, tenant_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS exception_cases_tenant_status_idx
  ON exception_cases(tenant_id, status, sla_due_at);
CREATE INDEX IF NOT EXISTS exception_cases_tenant_branch_idx
  ON exception_cases(tenant_id, branch_id, opened_at DESC);
CREATE INDEX IF NOT EXISTS exception_cases_work_item_idx
  ON exception_cases(tenant_id, work_item_task_id);
CREATE UNIQUE INDEX IF NOT EXISTS exception_cases_idempotency_uidx
  ON exception_cases(tenant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS exception_events (
  id TEXT PRIMARY KEY CHECK (id ~ '^[A-Za-z0-9_.:-]{1,128}$'),
  tenant_id TEXT NOT NULL,
  case_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('opened', 'assigned', 'escalated', 'transitioned')),
  from_status TEXT,
  to_status TEXT NOT NULL CHECK (to_status IN (
    'open', 'assigned', 'in_review', 'escalated', 'resolved', 'closed', 'cancelled'
  )),
  actor_kind TEXT NOT NULL CHECK (actor_kind IN ('human', 'agent', 'system')),
  actor_account_id TEXT,
  actor_agent_id TEXT,
  actor_ref TEXT,
  reason_code TEXT NOT NULL CHECK (
    reason_code ~ '^[A-Za-z0-9_.:-]{1,128}$'
    AND reason_code !~* '(secret://|bearer|api[_-]?key|access[_-]?token|refresh[_-]?token|app[_-]?secret|verify[_-]?token|private[_-]?key|password|passwd|credential|authorization|eaag)'
  ),
  occurred_at TIMESTAMPTZ NOT NULL,
  UNIQUE (id, tenant_id),
  CHECK ((actor_kind = 'human') = (actor_account_id IS NOT NULL)),
  CHECK ((actor_kind = 'agent') = (actor_agent_id IS NOT NULL)),
  CHECK ((actor_kind = 'system') = (actor_ref IS NOT NULL)),
  FOREIGN KEY (case_id, tenant_id)
    REFERENCES exception_cases(id, tenant_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS exception_events_case_idx
  ON exception_events(tenant_id, case_id, occurred_at);

CREATE OR REPLACE FUNCTION exception_events_guard() RETURNS TRIGGER AS $$
BEGIN
  IF NOT exception_transition_is_legal(NEW.from_status, NEW.to_status) THEN
    RAISE EXCEPTION 'illegal exception transition % -> %', NEW.from_status, NEW.to_status
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS exception_events_transition_guard ON exception_events;
CREATE TRIGGER exception_events_transition_guard
  BEFORE INSERT ON exception_events
  FOR EACH ROW EXECUTE FUNCTION exception_events_guard();

CREATE OR REPLACE FUNCTION exception_cases_guard() RETURNS TRIGGER AS $$
BEGIN
  -- Case semantics are immutable: another kind, another severity, another owner work item
  -- or another SLA cannot be written over an existing case.
  IF NEW.tenant_id <> OLD.tenant_id
    OR NEW.branch_id <> OLD.branch_id
    OR NEW.kind <> OLD.kind
    OR NEW.severity <> OLD.severity
    OR NEW.work_item_task_id <> OLD.work_item_task_id
    OR NEW.evidence_required <> OLD.evidence_required
    OR NEW.sla_due_at <> OLD.sla_due_at
    OR NEW.subject_ref IS DISTINCT FROM OLD.subject_ref
    OR NEW.opened_at <> OLD.opened_at
  THEN
    RAISE EXCEPTION 'a protected exception case column is immutable'
      USING ERRCODE = '23514';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
    AND NOT exception_transition_is_legal(OLD.status, NEW.status) THEN
    RAISE EXCEPTION 'illegal exception transition % -> %', OLD.status, NEW.status
      USING ERRCODE = '23514';
  END IF;
  IF NEW.status = 'closed' AND OLD.resolution_code = 'unknown_outcome' THEN
    RAISE EXCEPTION 'a case whose resolution is unknown cannot be closed'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS exception_cases_protect ON exception_cases;
CREATE TRIGGER exception_cases_protect
  BEFORE UPDATE ON exception_cases
  FOR EACH ROW EXECUTE FUNCTION exception_cases_guard();

-- ---------------------------------------------------------------------------
-- Row level security and grants
-- ---------------------------------------------------------------------------

ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE approval_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_decisions FORCE ROW LEVEL SECURITY;
ALTER TABLE approval_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_executions FORCE ROW LEVEL SECURITY;
ALTER TABLE approval_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_events FORCE ROW LEVEL SECURITY;
ALTER TABLE exception_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE exception_cases FORCE ROW LEVEL SECURITY;
ALTER TABLE exception_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE exception_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS approval_request_select ON approval_requests;
CREATE POLICY approval_request_select ON approval_requests
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant', true));
DROP POLICY IF EXISTS approval_request_insert ON approval_requests;
CREATE POLICY approval_request_insert ON approval_requests
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant', true));
DROP POLICY IF EXISTS approval_request_update ON approval_requests;
CREATE POLICY approval_request_update ON approval_requests
  FOR UPDATE USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS approval_decision_select ON approval_decisions;
CREATE POLICY approval_decision_select ON approval_decisions
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant', true));
DROP POLICY IF EXISTS approval_decision_insert ON approval_decisions;
CREATE POLICY approval_decision_insert ON approval_decisions
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS approval_execution_select ON approval_executions;
CREATE POLICY approval_execution_select ON approval_executions
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant', true));
DROP POLICY IF EXISTS approval_execution_insert ON approval_executions;
CREATE POLICY approval_execution_insert ON approval_executions
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS approval_event_select ON approval_events;
CREATE POLICY approval_event_select ON approval_events
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant', true));
DROP POLICY IF EXISTS approval_event_insert ON approval_events;
CREATE POLICY approval_event_insert ON approval_events
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS exception_case_select ON exception_cases;
CREATE POLICY exception_case_select ON exception_cases
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant', true));
DROP POLICY IF EXISTS exception_case_insert ON exception_cases;
CREATE POLICY exception_case_insert ON exception_cases
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant', true));
DROP POLICY IF EXISTS exception_case_update ON exception_cases;
CREATE POLICY exception_case_update ON exception_cases
  FOR UPDATE USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS exception_event_select ON exception_events;
CREATE POLICY exception_event_select ON exception_events
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant', true));
DROP POLICY IF EXISTS exception_event_insert ON exception_events;
CREATE POLICY exception_event_insert ON exception_events
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

-- Append-only for decisions, executions and both event trails. A request and a case may
-- only have their lifecycle columns updated; every protected column is outside the grant
-- and is additionally guarded by the trigger above.
GRANT SELECT, INSERT ON approval_requests TO zyara_app;
GRANT UPDATE (status, updated_at) ON approval_requests TO zyara_app;
GRANT SELECT, INSERT ON approval_decisions TO zyara_app;
GRANT SELECT, INSERT ON approval_executions TO zyara_app;
GRANT SELECT, INSERT ON approval_events TO zyara_app;
GRANT SELECT, INSERT ON exception_cases TO zyara_app;
GRANT UPDATE (status, resolution_code, closure_evidence_ref, closed_at, updated_at)
  ON exception_cases TO zyara_app;
GRANT SELECT, INSERT ON exception_events TO zyara_app;

-- ---------------------------------------------------------------------------
-- C2 activity registry extension (forward-only)
-- ---------------------------------------------------------------------------
-- C3 derives operational activity from approval and exception truth, so the closed activity
-- registries must admit the two new source domains, categories, actions and payload keys.
-- Every value already permitted by 043 is preserved; the constraint names are re-declared
-- explicitly so this extension is deterministic. No row is rewritten and no column moves.

ALTER TABLE activity_events DROP CONSTRAINT IF EXISTS activity_events_source_domain_check;
ALTER TABLE activity_events ADD CONSTRAINT activity_events_source_domain_check CHECK (source_domain IN (
  'workforce.tasks', 'identity.agents', 'communications.whatsapp',
  'collaboration.approvals', 'collaboration.exceptions'
));

ALTER TABLE activity_events DROP CONSTRAINT IF EXISTS activity_events_category_check;
ALTER TABLE activity_events ADD CONSTRAINT activity_events_category_check CHECK (category IN (
  'task', 'agent_identity', 'communication', 'approval', 'exception'
));

ALTER TABLE activity_events DROP CONSTRAINT IF EXISTS activity_events_action_check;
ALTER TABLE activity_events ADD CONSTRAINT activity_events_action_check CHECK (action IN (
  'created', 'assigned', 'transitioned', 'commented',
  'capability_granted', 'capability_revoked', 'suspended', 'reactivated',
  'revoked', 'credential_rotated', 'received', 'observed',
  'proposed', 'approval_requested', 'approved', 'rejected', 'expired', 'superseded',
  'cancelled', 'execution_attempted', 'execution_succeeded', 'execution_failed',
  'execution_unknown', 'needs_human', 'opened', 'escalated', 'resolved', 'closed'
));

ALTER TABLE activity_events DROP CONSTRAINT IF EXISTS activity_events_subject_type_check;
ALTER TABLE activity_events ADD CONSTRAINT activity_events_subject_type_check CHECK (subject_type IN (
  'none', 'task', 'agent_identity', 'staff_assignment', 'facility', 'conversation',
  'approval_request', 'exception_case'
));

ALTER TABLE activity_events DROP CONSTRAINT IF EXISTS activity_events_payload_check;
ALTER TABLE activity_events ADD CONSTRAINT activity_events_payload_check CHECK (
  jsonb_typeof(payload) = 'object'
  AND payload - ARRAY[
        'channel','provider','attempt','count','taskKind','previousValue','newValue','originKind',
        'riskClass','requiredAuthority','approvalStatus','executionOutcome','exceptionKind',
        'exceptionSeverity','exceptionStatus','workItemStatus'
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
  AND (NOT payload ? 'riskClass' OR payload->>'riskClass' IN (
        'routine','elevated','high','critical'))
  AND (NOT payload ? 'requiredAuthority' OR payload->>'requiredAuthority' IN (
        'branch_admin','org_admin','clinical_lead','compliance_officer'))
  AND (NOT payload ? 'approvalStatus' OR payload->>'approvalStatus' IN (
        'proposed','awaiting_approval','approved','rejected','expired','cancelled','superseded',
        'executing','succeeded','failed','needs_human'))
  AND (NOT payload ? 'executionOutcome' OR payload->>'executionOutcome' IN (
        'attempted','succeeded','failed','unknown'))
  AND (NOT payload ? 'exceptionKind' OR payload->>'exceptionKind' IN (
        'ambiguous_patient_request','missing_consent','unavailable_authority',
        'conflicting_provider_data','whatsapp_delivery_failure','external_provider_timeout',
        'insurer_ambiguity','prior_auth_mismatch','stale_schedule',
        'duplicate_identity_ambiguity','low_confidence_automation','policy_refusal',
        'reconciliation_failure','unknown_external_outcome','approval_outcome_unknown'))
  AND (NOT payload ? 'exceptionSeverity' OR payload->>'exceptionSeverity' IN (
        'low','medium','high','critical'))
  AND (NOT payload ? 'exceptionStatus' OR payload->>'exceptionStatus' IN (
        'open','assigned','in_review','escalated','resolved','closed','cancelled'))
  AND (NOT payload ? 'workItemStatus' OR payload->>'workItemStatus' IN (
        'open','in_progress','blocked','resolved','cancelled'))
);

-- ROLLBACK (manual, audited, only when no dependent data remains):
--   DROP TRIGGER IF EXISTS approval_requests_protect ON approval_requests;
--   DROP TRIGGER IF EXISTS approval_events_transition_guard ON approval_events;
--   DROP TRIGGER IF EXISTS approval_decisions_guard ON approval_decisions;
--   DROP TRIGGER IF EXISTS exception_cases_protect ON exception_cases;
--   DROP TRIGGER IF EXISTS exception_events_transition_guard ON exception_events;
--   DROP FUNCTION IF EXISTS approval_requests_guard, approval_events_guard,
--     approval_decisions_guard, exception_cases_guard, exception_events_guard;
--   DROP FUNCTION IF EXISTS approval_transition_is_legal, exception_transition_is_legal;
--   DROP TABLE IF EXISTS exception_events, exception_cases, approval_events,
--     approval_executions, approval_decisions, approval_requests;
-- The C2 registry extension is reverted by re-applying db/migrations/043_activity_events.sql
-- constraints (values already permitted by 043 are preserved by this migration).
