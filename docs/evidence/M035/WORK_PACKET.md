# M035 work packet — referral and order-to-schedule work queues

- Task: M035 (P06/S06B). Objective: referral/order-to-schedule work queues.
- Base SHA: f9dde2e. Dependencies: M033, M013, M019 (all evidenced).
- Allowed paths: packages/referrals, tests/m035,
  db/migrations/026_*, docs/evidence/M035.
- Exclusions: no FHIR adapter writes (M038), no campaign logic (M034).
- Requirements: referral has accountable source, service, eligibility
  context, expiry and state machine (pending → scheduled/expired/declined/
  cancelled); duplicates suppressed; expired referrals never schedule;
  queue ordering deterministic and explainable; audit trail of transitions.
- Test plan: source/authorization, duplicate suppression, expiry guard,
  deterministic ordering, transition audit.
- Rollback: remove package/tests/migration.
