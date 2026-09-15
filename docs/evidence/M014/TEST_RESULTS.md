# M014 Test Results (implementation head, pre-PR)

Date (UTC): 2026-09-15. Runner: tsx 4.19.2 on node v22.23.1 (windows).
Command pattern: `tsx --test tests/m014/<file>.test.ts`.

| Suite | File | Tests | Pass | Fail |
|---|---|---|---|---|
| civil time (Riyadh/Berlin/NY gaps+folds) | time.test.ts | 5 | 5 | 0 |
| schedules (revisions, blocks, conflicts, buffers) | schedules.test.ts | 5 | 5 | 0 |
| candidates (acceptance 1+2) | candidates.test.ts | 2 | 2 | 0 |
| recheck (acceptance 3, busy, policy, caps) | recheck.test.ts | 4 | 4 | 0 |
| guards (TS-only, SQL, telemetry, perf gate) | guards.test.ts | 4 | 4 | 0 |
| worker invalidation | invalidation.test.ts | 3 | 3 | 0 |
| **Total** | | **23** | **23** | **0** |

Regression (same runner):

| Suite | Tests | Pass |
|---|---|---|
| M013 eligibility+recipes+guards | 19 | 19 |
| M004 delivery | 8 | 8 |

Typecheck: `tsc -p packages/scheduling/tsconfig.json --noEmit` clean;
`tsc -p apps/worker/tsconfig.json --noEmit` clean (workspace junctions,
mirroring `pnpm install` in CI).
Lint: eslint clean on all new/changed files
(packages/scheduling/src/{time,schedules,candidates,index}.ts,
apps/worker/src/consumers.ts, tests/m014/*).

Benchmark (tests/m014/bench.ts, 5 samples, this machine):

| Window | Starts evaluated | Candidates | p50 | p95 |
|---|---|---|---|---|
| 7 days, full week 08:00-18:00 | 189 | 184 | 47.3 ms | 58.0 ms |
| 30 days | 810 | 805 | 120.3 ms | 165.6 ms |
| 90 days (pilot maximum) | 2430 | 2425 | 356.5 ms | 378.5 ms |

Decision (A27): TypeScript meets the requirement with wide margin. No Rust
extraction justified. Revisit only if a future workload breaks the 5 s
90-day budget recorded in guards.test.ts.
