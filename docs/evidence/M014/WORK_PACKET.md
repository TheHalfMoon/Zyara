# M014 Work Packet (immutable)

- Task: M014 — Implement recurring schedules and hybrid availability
- Task contract: docs/research/muse-task-contracts.json (M014, deps [M013, M004])
- Source refs: A08, A04, S091, S111. Requirements: R05, R10, R20.
- Plan revision: ZYARA_CANONICAL_BUILD_PLAN.md baseline 2026-09-13; architecture
  plan includes A27 language strategy (TypeScript default; Rust/Go by evidence).
- Base SHA: 3cf7c0b826a0cac029abf0d4b955e17d5f247634 (origin/main, verified live 2026-09-15)
- Dependency evidence: M013 COMPLETE (PR #27 merged as
  c2d8c53dbb1994fda40bd9d8e35e518ac24d16ef; evidence finalized PR #28);
  M004 COMPLETE (PR #9).
- Allowed surface: packages/scheduling/availability (+ time), apps/worker
  (availability projection invalidation), db/migrations/014_availability.sql,
  tests/m014, docs/evidence/M014, .github/workflows/m014-ci.yml,
  docs/canonical/ZYARA_ARCHITECTURE_PLAN.md (A27 row only).
- Excluded: holds/booking ledger (M015), eligibility rule changes (M013),
  verification decisions (M008), real clinical approval, real PHI, production
  deployment, any language-runtime extraction (no Rust/Go/C++ in this task).
- Language decision (A27): implement in TypeScript. Benchmark
  recurrence/candidate generation first; extract to Rust only if measured
  evidence justifies it. No extraction is pre-approved by this packet.
- Acceptance: (1) candidate full duration plus buffers fits every required
  resource; (2) hard blocks dominate schedule opens; (3) stale candidate
  versions require authoritative recheck.
- Tests: Riyadh steady zone; Berlin/NY DST gaps (reject) and folds (explicit
  offset choice); holidays; provider leave; schedule override; booking horizon;
  minimum notice; cutoff; slot alignment; prep/cleanup buffers; service-duration
  change invalidation; multi-resource alignment; finite capacity; stale versions;
  invalidation; combinatorial limits; performance baseline.
- Security/privacy: public candidate cache carries no patient context or
  identifiers; private eligibility (M013) never embedded in cache keys; tenant
  isolation via FORCE RLS on new tables; synthetic data only.
- Localization: Gregorian canonical; labeled Hijri display support (display
  string, never parsed); explicit zone/date in five locales via existing M005
  locale contract; ar RTL.
- Observability: candidate latency, cache age, invalidation lag counters only;
  no clinical content in logs/events; reuse M004 outbox code
  `projection.invalidated` for invalidation.
- Failure modes: DST gap booking attempt, silent fold choice, stale projection
  authorizing booking, duration change, combinatorial overload, tzdb change.
- Recovery: invalidate projections, rebuild from versioned rules; booking commit
  always rechecks authoritatively (M015 owns the ledger; this task never books).
- Risk: medium; raised to high for reservation/authorization changes (none in
  this task — candidate generation is read-only and non-authoritative).
