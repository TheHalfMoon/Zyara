# M036 work packet — adapter capability and certification harness

- Task: M036 (P07/S07A). Objective: vendor names/FHIR labels never
  substitute for tested scheduling semantics; explicit capability model.
- Base SHA: 4a22798. Dependencies: M016, M004 (evidenced; M030 removed as
  impl gate, retained external).
- Allowed paths: packages/adapter-harness, tests/m036,
  docs/adapter-certification (new), docs/evidence/M036.
- Exclusions: no live vendor integration, no EHR writes, no M037/M038.
- Requirements: explicit capability flags (read, availability,
  notifications, create, cancel, reschedule, atomic-hold,
  conflict-enforcement, reconciliation, events/webhooks, identity
  assurance) — never binary integrated=true; certification suite grades
  synthetic adapters per capability; uncertified capabilities are refused
  at call time with typed errors; FHIR read never implies booking-write.
- Test plan: capability gating, fake-adapter certification pass/fail,
  overclaim refusal, matrix report.
- Rollback: remove package/tests/docs.
