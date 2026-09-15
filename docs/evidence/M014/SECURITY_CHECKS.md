# M014 Security / Privacy Checks

- Tenant isolation: schedule_versions + availability_projections carry
  tenant_id, FORCE RLS, tenant policies on current_setting('app.current_tenant');
  generator rejects TENANT_MISMATCH before computing.
- Patient-free cache: projectionCacheKey binds tenant/service/type/branch +
  schedule/recipe versions + range + fold choice only. Asserted by test:
  no patient|symptom|insurer|dob token in keys.
- M013 stays private: eligibility inputs/results never enter candidates,
  tokens, payloads or telemetry (telemetryForCandidates: counts/versions/
  latency only; unit IDs excluded, verified in test).
- Event envelope rule preserved: invalidationPayload returns string IDs only;
  worker consumer rejects bindings missing schedule/scheduleVersion/reason.
- No LLM, no eval/Function, no child processes, no network calls in
  packages/scheduling/src/{time,schedules,candidates}.ts (asserted in guards).
- Synthetic data only. No PHI, no production credentials, no deployment.
- Migration grants: SELECT+INSERT on schedule_versions; SELECT+INSERT+DELETE
  on availability_projections (bounded cache expiry). No UPDATE anywhere;
  no UPDATE/DELETE grant on version history.
- Residual: no local PostgreSQL on this machine, so the migration was
  validated structurally + by SQL-text guards (same residual as M013);
  exact-head CI plus reviewer inspection qualify the SQL before merge.
