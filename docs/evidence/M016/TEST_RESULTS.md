# M016 Test Results (implementation head, pre-PR)

Date (UTC): 2026-09-16. Runner: tsx 4.19.2 on node v22.23.1 (windows).
Command pattern: `tsx --test tests/m016/<file>.test.ts`.

| Suite | File | Tests | Pass | Fail |
|---|---|---|---|---|
| booking state machine (propose/replay/commit/resume/reconfirmation/duplicate) | bookings.test.ts | 7 | 7 | 0 |
| concurrency (two-device, direct/hold race, crash, 100-way) | races.test.ts | 5 | 5 | 0 |
| guards (SQL authority, no-optimistic-success, five locales, telemetry) | guards.test.ts | 4 | 4 | 0 |
| **Total** | | **16** | **16** | **0** |

Regression (same runner):

| Suite | Tests | Pass |
|---|---|---|
| M015 holds plus races plus guards | 14 | 14 |
| M014 time+schedules+candidates+recheck+guards+invalidation | 23 | 23 |
| M013 eligibility+recipes+guards | 19 | 19 |
| M004 delivery | 8 | 8 |

Typecheck: `tsc -p packages/scheduling/tsconfig.json --noEmit` clean;
`tsc -p packages/contracts/tsconfig.json --noEmit` clean;
`tsc -p apps/api/tsconfig.json --noEmit` clean.
Lint: eslint clean on all new/changed files
(packages/scheduling/src/{appointments,booking-explanations,index}.ts,
packages/contracts/src/index.ts, apps/api/src/{bookings,index}.ts,
tests/m016/*, apps/api/scripts/m016-booking-smoke.mjs).

Real-PostgreSQL proof (CI, postgres:16 service):
- apps/api/scripts/m016-booking-smoke.mjs runs in m016-ci after the unit tests:
  100 real parallel clients race one capacity-one slot (exactly 1 booked),
  idempotency-key dedupe, patient duplicate guard across different keys,
  material reconfirmation gate, expired-hold conversion refusal with no worker
  running, tenant RLS leak check, AppointmentBooked outbox insert.
- No local PostgreSQL on the implementation machine — recorded honestly as
  environment residual; the smoke runs authoritatively in CI.
