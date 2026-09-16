# M060 work packet — expansion readiness decision (framework only)

- Task: M060 (P11/S11B). Objective: decide expansion readiness from
  evidence and unresolved risk.
- Base SHA: 74658ff. Dependencies: M058, M059, M057, M055 (all evidenced
  as repository implementation).
- Allowed paths: packages/expansion-decision, tests/m060,
  docs/evidence/M060.
- Exclusions: no expansion claim, no launch authorization, no commercial
  or clinical validation claims.
- Requirements: decision framework consumes gate inputs (safety, access,
  economics, unresolved risks) and outputs go/iterate/stop with reasons;
  any missing real-evidence gate forces iterate/stop, never go; records
  the honest split state.
- Test plan: gate logic, missing-evidence veto, reason completeness.
- Rollback: remove package/tests.
