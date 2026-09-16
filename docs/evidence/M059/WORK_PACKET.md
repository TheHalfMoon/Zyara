# M059 work packet — scale validation, measured bottlenecks only

- Task: M059 (P11/S11B). Objective: extract only measured bottlenecks;
  no speculative scaling.
- Base SHA: 0815024. Dependencies: M056, M057, M027 (all evidenced).
- Allowed paths: packages/scale-qual, tests/m059, docs/evidence/M059.
- Exclusions: no production load, no real traffic, no infra purchases.
- Requirements: synthetic load harness over waitlist matching + offer
  accept paths with clock control; concurrency test for single-unit
  allocation; report measured p50/p95 and bottleneck location; no
  bottleneck claimed without measurement; no scale readiness claimed
  beyond measured scope.
- Test plan: harness math, concurrency guard, report honesty.
- Rollback: remove package/tests.
