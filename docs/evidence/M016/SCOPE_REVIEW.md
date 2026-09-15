# M016 Scope Review

Allowed (WORK_PACKET.md): packages/scheduling (appointments module),
packages/contracts (booking contract), apps/api (bookings route),
db/migrations/016_booking_operations.sql, apps/api/scripts (m016 smoke),
tests/m016, docs/evidence/M016, .github/workflows/m016-ci.yml.

Observed changes:
- packages/scheduling/src/appointments.ts (new): operation state machine.
- packages/scheduling/src/booking-explanations.ts (new): five-locale copy.
- packages/scheduling/src/index.ts: export new modules.
- packages/contracts/src/index.ts: booking status/response contract.
- apps/api/src/bookings.ts (new): resume/status route on verified claims.
- apps/api/src/index.ts: register booking routes.
- db/migrations/016_booking_operations.sql (new).
- apps/api/scripts/m016-booking-smoke.mjs (new): real-PG commit proof.
- tests/m016/*: fixtures, 14 tests, package.json.
- .github/workflows/m016-ci.yml (new, with postgres:16 service).
- docs/evidence/M016/*: work packet plus evidence.
- pnpm-lock.yaml: tests/m016 entry if importers change (no new packages).

Excluded and untouched: booking UX (M017), safe changes (M018), calendar
(M019), communications (M020), external adapters, real clinical approval,
real PHI, production deployment, any Rust/Go/C++.
No unrelated platform features, no copied donor code.
