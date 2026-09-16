# M037 work packet — durable external booking and change operations

- Task: M037 (P07/S07A). Objective: external booking/change ops with
  explicit unknown outcomes, reconciliation, and no blind retries.
- Base SHA: 59007bb. Dependencies: M036, M016, M018 (all evidenced).
- Allowed paths: packages/adapter-ops, tests/m037,
  db/migrations/027_*, docs/evidence/M037.
- Exclusions: no FHIR resource mapping (M038), no legacy SIU (M039).
- Requirements: every op requires the certified capability (M036);
  operations are durable with idempotency keys; ambiguous outcomes are
  recorded UNKNOWN and reconciled, never blind-retried; cancel/reschedule
  verify current state first; no false confirmation without committed
  external truth (synthetic adapter records in tests).
- Test plan: capability refusal, idempotent replay, ambiguous-write
  reconcile, no-blind-retry, cancel/reschedule state guards.
- Rollback: remove package/tests/migration.
