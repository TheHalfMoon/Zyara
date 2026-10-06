-- W3: clinic operations task queue (additive over W1/W2).
-- Semantic donor reference: TheHalfMoon/Qdrat@e2d288940aab52af881786678b2fc86dfa5c272a.
-- No Qdrat/Horilla code is copied in this migration.
-- Tasks are non-clinical operational work only: helpdesk, maintenance,
-- operational follow-up. They never carry clinical authority and never
-- mutate booking, clinical documentation, medication or billing state.
-- Clinical follow-up (referrals, results, refills, authorizations) stays in
-- its own typed domain workflow with its own authority.

CREATE TABLE IF NOT EXISTS ops_tasks (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  coverage_exception_id TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('helpdesk', 'maintenance', 'follow_up')),
  title TEXT NOT NULL CHECK (char_length(title) > 0),
  detail TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('open', 'acknowledged', 'resolved')),
  assignee_account_id TEXT,
  source_ref TEXT NOT NULL,
  source_revision TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (branch_id, tenant_id)
    REFERENCES branch_locations(id, tenant_id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS ops_tasks_id_tenant_uidx
  ON ops_tasks(id, tenant_id);
CREATE INDEX IF NOT EXISTS ops_tasks_tenant_branch_idx
  ON ops_tasks(tenant_id, branch_id, status);

ALTER TABLE ops_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_tasks FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ops_task_isolation ON ops_tasks;
CREATE POLICY ops_task_isolation ON ops_tasks
  USING (tenant_id = current_setting('app.current_tenant', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

GRANT SELECT, INSERT, UPDATE ON ops_tasks TO zyara_app;

-- ROLLBACK (manual, audited, only when no dependent data remains):
-- DROP TABLE IF EXISTS ops_tasks;
