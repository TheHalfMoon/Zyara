-- W3: clinic helpdesk / internal task queue (additive over W1 and W2).
-- Semantic donor reference: TheHalfMoon/Qdrat@e2d288940aab52af881786678b2fc86dfa5c272a.
-- No Qdrat/Horilla code is copied in this migration.
-- Tasks are administrative coordination records. They are never clinical,
-- scheduling, insurance or financial authority, and they never write to the
-- domains they point at. Automation may raise and comment on work; closing an
-- outcome stays human-owned. Practitioner/PractitionerRole remain the
-- healthcare identity/privilege authority.

CREATE TABLE IF NOT EXISTS ops_tasks (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN (
    'facility_helpdesk',
    'it_access',
    'referral_follow_up',
    'prior_auth_exception',
    'refill_routing',
    'result_review',
    'automation_handoff'
  )),
  status TEXT NOT NULL CHECK (status IN ('open', 'in_progress', 'blocked', 'resolved', 'cancelled')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  title TEXT NOT NULL CHECK (char_length(title) > 0),
  detail TEXT NOT NULL DEFAULT '',
  requester_account_id TEXT NOT NULL,
  assignee_account_id TEXT,
  assignee_staff_assignment_id TEXT,
  subject_type TEXT NOT NULL DEFAULT 'none' CHECK (subject_type IN (
    'none',
    'appointment',
    'referral',
    'result',
    'prescription_request',
    'facility'
  )),
  subject_ref TEXT,
  due_at TIMESTAMPTZ,
  origin_kind TEXT NOT NULL CHECK (origin_kind IN ('human', 'automation')),
  origin_ref TEXT NOT NULL CHECK (char_length(origin_ref) > 0),
  resolution_note TEXT,
  resolved_at TIMESTAMPTZ,
  correlation_id TEXT,
  idempotency_key TEXT,
  source_ref TEXT NOT NULL,
  source_revision TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, tenant_id),
  CHECK ((subject_type = 'none') = (subject_ref IS NULL)),
  CHECK ((status = 'resolved') = (resolution_note IS NOT NULL)),
  CHECK ((status = 'resolved') = (resolved_at IS NOT NULL)),
  CHECK ((assignee_account_id IS NULL) = (assignee_staff_assignment_id IS NULL)),
  FOREIGN KEY (branch_id, tenant_id)
    REFERENCES branch_locations(id, tenant_id) ON DELETE RESTRICT,
  FOREIGN KEY (assignee_staff_assignment_id, branch_id, tenant_id)
    REFERENCES staff_assignments(id, branch_id, tenant_id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS ops_tasks_idempotency_uidx
  ON ops_tasks(tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS ops_tasks_tenant_branch_status_idx
  ON ops_tasks(tenant_id, branch_id, status);
CREATE INDEX IF NOT EXISTS ops_tasks_tenant_assignee_status_idx
  ON ops_tasks(tenant_id, assignee_account_id, status);

-- Comments and lifecycle events are append-only. They are granted SELECT and
-- INSERT only: no UPDATE and no DELETE path exists for the application role.
CREATE TABLE IF NOT EXISTS ops_task_comments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  author_account_id TEXT NOT NULL,
  author_kind TEXT NOT NULL CHECK (author_kind IN ('human', 'automation')),
  body TEXT NOT NULL CHECK (char_length(body) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, tenant_id),
  FOREIGN KEY (task_id, tenant_id)
    REFERENCES ops_tasks(id, tenant_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS ops_task_comments_task_idx
  ON ops_task_comments(tenant_id, task_id, created_at);

CREATE TABLE IF NOT EXISTS ops_task_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'assigned', 'transitioned')),
  from_status TEXT CHECK (from_status IS NULL OR from_status IN ('open', 'in_progress', 'blocked', 'resolved', 'cancelled')),
  to_status TEXT CHECK (to_status IS NULL OR to_status IN ('open', 'in_progress', 'blocked', 'resolved', 'cancelled')),
  actor_account_id TEXT NOT NULL,
  actor_kind TEXT NOT NULL CHECK (actor_kind IN ('human', 'automation')),
  reason TEXT NOT NULL DEFAULT '',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, tenant_id),
  FOREIGN KEY (task_id, tenant_id)
    REFERENCES ops_tasks(id, tenant_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS ops_task_events_task_idx
  ON ops_task_events(tenant_id, task_id, occurred_at);

ALTER TABLE ops_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_tasks FORCE ROW LEVEL SECURITY;
ALTER TABLE ops_task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_task_comments FORCE ROW LEVEL SECURITY;
ALTER TABLE ops_task_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_task_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ops_task_select ON ops_tasks;
CREATE POLICY ops_task_select ON ops_tasks
  FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant', true));
DROP POLICY IF EXISTS ops_task_insert ON ops_tasks;
CREATE POLICY ops_task_insert ON ops_tasks
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));
DROP POLICY IF EXISTS ops_task_update ON ops_tasks;
CREATE POLICY ops_task_update ON ops_tasks
  FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS ops_task_comment_select ON ops_task_comments;
CREATE POLICY ops_task_comment_select ON ops_task_comments
  FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant', true));
DROP POLICY IF EXISTS ops_task_comment_insert ON ops_task_comments;
CREATE POLICY ops_task_comment_insert ON ops_task_comments
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS ops_task_event_select ON ops_task_events;
CREATE POLICY ops_task_event_select ON ops_task_events
  FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant', true));
DROP POLICY IF EXISTS ops_task_event_insert ON ops_task_events;
CREATE POLICY ops_task_event_insert ON ops_task_events
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

GRANT SELECT, INSERT, UPDATE ON ops_tasks TO zyara_app;
GRANT SELECT, INSERT ON ops_task_comments TO zyara_app;
GRANT SELECT, INSERT ON ops_task_events TO zyara_app;

-- ROLLBACK (manual, audited, only when no dependent data remains):
-- DROP TABLE IF EXISTS ops_task_events, ops_task_comments, ops_tasks;
