# M015 Test Results (implementation head, pre-PR)

Date (UTC): 2026-09-15. Runner: tsx 4.19.2 on node v22.23.1 (windows).
Command pattern: `tsx --test tests/m015/<file>.test.ts`.

| Suite | File | Tests | Pass | Fail |
|---|---|---|---|---|
| state machine (propose/replay/conflict/all-or-none/sweep/redeem/extend) | holds.test.ts | 6 | 6 | 0 |
| concurrency (100-way race, dual races, threads, lock order, invalid) | races.test.ts | 5 | 5 | 0 |
| guards (SQL authority, five locales, telemetry, no-forbidden) | guards.test.ts | 3 | 3 | 0 |
| **Total** | | **14** | **14** | **0** |

Regression (same runner):

| Suite | Tests | Pass |
|---|---|---|
| M013 eligibility+recipes+guards | 19 | 19 |
| M014 time+schedules+candidates+recheck+guards+invalidation | 23 | 23 |
| M004 delivery | 8 | 8 |

Typecheck: `tsc -p packages/scheduling/tsconfig.json --noEmit` clean.
Lint: eslint clean on all new/changed files
(packages/scheduling/src/{reservations,hold-explanations,index}.ts,
tests/m015/*, apps/api/scripts/m015-holds-smoke.mjs).

Real-PostgreSQL proof (CI, postgres:16 service):
- apps/api/scripts/m015-holds-smoke.mjs runs in m015-ci after the unit tests:
  100 real parallel clients race one capacity-one interval (exactly 1 winner,
  invariant query confirms 1 active row), multi-resource all-or-none rollback,
  idempotency-key dedupe, inline expiry redeem-refusal with no worker running,
  tenant RLS leak check.
- No local PostgreSQL on the implementation machine and the local Docker
  daemon storage is corrupted (cannot pull/start images) — recorded honestly
  as environment residuals; the smoke runs authoritatively in CI.
