# M016 Result

Status: COMPLETE (merged).

- Base SHA: e5af3de235cc4130e552be37f1f907e67057c9a7
- Implementation head: 64c132473cfe7d688a6fb3717b5d0b48ed694caa
- Merge commit on main: 1f34ccc678bce56de8a1c8642ef7e85858d3de7e (PR #33)
- CI: m016-ci green on exact head (typecheck plus lint plus 16/16 tests plus
  real PG smoke); m001-ci, m002-ci, m008-ci, m009-ci, m013-ci, m014-ci,
  m015-ci green on exact head and post-merge.
- Branch: muse/M016-booking-ops
- Acceptance 1 (booked follows committed appointment/resources): PASS — 100
  real parallel clients race one capacity-one slot in CI PG smoke, exactly 1
  booked; invariant queries confirm single active allocation across both
  ledgers; typed commit returns appointment only with the committed record
- Acceptance 2 (retried operation returns same result): PASS — same key plus
  same digest replays the same operation and appointment id; same key plus
  changed body conflicts; lost-response resume returns stable pending/booked
  state with operation correlation
- Acceptance 3 (material changes require renewed confirmation): PASS —
  schedule/recipe version, interval, and duration mismatches gate commit with
  NEEDS_RECONFIRMATION; stale hold expiry refuses conversion with no worker
  running; eligibility recheck rejects non-ALLOW
- Tests: 16/16 green (7 state machine, 5 concurrency, 4 guards); regression
  M015 14/14, M014 23/23, M013 19/19, M004 8/8; typecheck and eslint clean
- Patient duplicate guard: exclusion on tenant plus patient plus service plus
  overlapping booked_range; different-key same-slot returns existing id
- Language decision (A27): TypeScript plus PostgreSQL. Dual exclusion
  constraints (015 reservation_items cross-ledger plus 016 appointment_items)
  are the booking authority; deterministic lock order; DB time via
  statement_timestamp; no Redis-only lock; no now() predicate. No Rust
  extraction justified; revisit only with M059 measurements
- Architecture: PostgreSQL stays the scheduling authority; every writer path
  writes through the reservation ledger in the commit transaction with
  AppointmentBooked outbox events
- Privacy: ledger carries tenant, actor, patient, service, unit IDs, UTC
  ranges, versions and opaque digests only; telemetry carries counts/codes;
  synthetic data only, no PHI
- Localization: five-locale booked/conflict/needs-reconfirmation/rejected
  catalog (ar, en, fr, de, es); ar RTL preserved; exact date/time/zone in the
  outcome contract; human review required before real use
- Migration: 016_booking_operations.sql creates booking_operations plus
  appointments (with patient duplicate exclusion) plus appointment_items (with
  occupancy exclusion); FORCE RLS plus tenant policies; grants
  SELECT plus INSERT plus UPDATE only, no DELETE
- Residuals: patient UX is M017 next; safe changes are M018 next; no local
  PostgreSQL on the implementation machine — real-DB proof runs
  authoritatively in CI on postgres:16; real clinical approval remains an
  explicit external gate.
