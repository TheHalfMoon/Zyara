# M016 Work Packet (immutable)

- Task: M016 — Implement authoritative native booking operations
- Task contract: docs/research/muse-task-contracts.json (M016, deps [M015, M002])
- Source refs: A07, A09, A11, FHIR. Requirements: R05, R07, R20.
- Plan revision: ZYARA_CANONICAL_BUILD_PLAN.md baseline 2026-09-13; architecture
  plan includes A27 language strategy (TypeScript default; Rust/Go by evidence).
- Base SHA: e5af3de235cc4130e552be37f1f907e67057c9a7 (origin/main, verified live 2026-09-15)
- Dependency evidence: M015 COMPLETE (PR #31/#32, exclusion ledger plus inline
  expiry); M002 COMPLETE (tenant/branch authorization, revocation, assurance).
- Allowed surface: packages/scheduling (appointments module plus
  booking-explanations), packages/contracts (booking outcome contract),
  apps/api (bookings resume/status route plus registration), db/migrations
  (016_booking_operations.sql), apps/api/scripts (m016 booking smoke),
  tests/m016, docs/evidence/M016, .github/workflows/m016-ci.yml.
- Excluded: patient booking UX (M017), cancellation/rescheduling (M018),
  provider calendar/attendance (M019), communications (M020), external
  adapters and reconciliation sagas, real PHI, production deployment, any
  language-runtime extraction (no Rust/Go/C++ in this task).
- Language decision (A27): TypeScript + PostgreSQL. PostgreSQL exclusion
  constraints stay the booking authority on both ledgers; no Redis-only lock;
  no now()-based index predicate. No Rust extraction: commit volume does not
  justify it; revisit with M059 scaling measurements if ever needed.
- Acceptance: (1) booked response follows committed appointment/resources;
  (2) retried operation returns same result; (3) material changes require
  renewed confirmation.
- Tests: crash before/after commit and lost-response resume; two-device
  same/different-key and direct/hold race tests; 100-way capacity-one race.
- Security/privacy: bind action to authorized patient/delegate and exact
  challenge; tenant from verified claims only; synthetic data only.
- Localization: five-locale booked/conflict/needs-reconfirmation/rejected copy
  plus exact date/time/zone (operational strings, synthetic, review-flagged).
- Observability: pending/conflict/commit counts plus operation correlation;
  no clinical content.
- Failure modes: false success, duplicate patient visit, changed
  provider/policy during confirm, occupancy conflict, expired hold.
- Recovery: stop new booking, preserve status/resume recovery, repair only
  through audited commands; expiry reap stays inline at commit.
- Risk: high (appointment authority). Mitigated by durable operations first,
  exclusion constraints as final arbiter on every writer path, deterministic
  lock order, and DB-time decisions.
