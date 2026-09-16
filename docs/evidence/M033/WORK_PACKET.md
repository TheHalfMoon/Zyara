# M033 work packet — clinician-originated follow-up and recall plans

- Task: M033 (P06/S06B). Objective: recall requires an accountable
  clinical source, not inferred advice.
- Base SHA: c4edeff. Dependencies: M021, M013 (M030 removed as impl gate
  per dependency correction; retained external).
- Allowed paths: packages/recall-plans, tests/m033,
  db/migrations/024_*, docs/evidence/M033.
- Exclusions: no campaign orchestration (M034), no referrals (M035).
- Requirements: plan issuer/source/window/service/prerequisites/stop
  conditions + state machine; approved templates; explicit declines and
  escalation; booking does not close clinical completion; completed/
  cancelled/superseded plans suppress obsolete work; missed visit reopens
  only within approved policy; unauthorized issuers rejected.
- Test plan: issuer authorization, version/supersede, completion-correction
  separation, duplicate suppression, reopen policy.
- Rollback: remove package/tests/migration.
