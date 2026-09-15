# M015 Work Packet (immutable)

- Task: M015 — Prove atomic resource holds and expiry invariants
- Task contract: docs/research/muse-task-contracts.json (M015, deps [M013, M014, M004])
- Source refs: A09, A06, POSTGRES. Requirements: R05, R10, R20.
- Plan revision: ZYARA_CANONICAL_BUILD_PLAN.md baseline 2026-09-13; architecture
  plan includes A27 language strategy (TypeScript default; Rust/Go by evidence).
- Base SHA: e2d8afa4b4e0066c48f51775580b7149d9f927dc (origin/main, verified live 2026-09-15)
- Dependency evidence: M013 COMPLETE (PR #27/#28); M014 COMPLETE (PR #29/#30);
  M004 COMPLETE (PR #9).
- Allowed surface: packages/scheduling (reservations module), apps/api/scripts
  (m015 holds smoke), db/migrations/015_reservation_holds.sql, tests/m015,
  docs/evidence/M015, .github/workflows/m015-ci.yml.
- Excluded: booking commit/appointment ledger (M016), eligibility rule changes
  (M013), availability generation changes (M014), verification (M008), real
  clinical approval, real PHI, production deployment, any language-runtime
  extraction (no Rust/Go/C++ in this task).
- Language decision (A27): TypeScript + PostgreSQL. PostgreSQL exclusion
  constraints are the double-booking authority; no Redis-only lock; no
  now()-based index predicate. No Rust extraction: coordination volume does
  not justify it; revisit with M059 scaling measurements if ever needed.
- Acceptance: (1) at most one active allocation per unit/interval;
  (2) multi-resource hold is all-or-none; (3) expired hold cannot redeem
  with worker stopped.
- Tests: 100 concurrent capacity-one attempts + mixed-resource races (real
  parallel clients in CI PG smoke; worker-thread race locally); boundary
  expiry; duplicate key/different body; deadlock/retry; crash before/after.
- Security/privacy: authorize holder/tenant; abuse caps on active holds per
  actor/service; synthetic data only; string-ID telemetry.
- Localization: five-locale held/expiry/needs-reconfirmation copy + zone
  display (operational strings, synthetic, review-flagged like M013).
- Observability: conflict, expiry lag, deadlock, leaked-reservation counters
  only; no clinical content.
- Failure modes: worker lag, partial allocation, concurrent cleanup, clock
  boundary, deadlock, duplicate-key conflict.
- Recovery: disable new holds, retain booked ledger; repair only through
  audited commands; expiry reap is inline at commit, never worker-only.
- Risk: high (reservation authority). Mitigated by exclusion constraints as
  the final arbiter on every writer path, deterministic lock order, and
  DB-time expiry.
