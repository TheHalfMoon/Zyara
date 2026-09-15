# M015 Scope Review

Allowed (WORK_PACKET.md): packages/scheduling (reservations module),
apps/api/scripts (m015 smoke), db/migrations/015_reservation_holds.sql,
tests/m015, docs/evidence/M015, .github/workflows/m015-ci.yml.

Observed changes:
- packages/scheduling/src/reservations.ts (new): hold state machine.
- packages/scheduling/src/hold-explanations.ts (new): five-locale copy.
- packages/scheduling/src/index.ts: export new modules.
- apps/api/scripts/m015-holds-smoke.mjs (new): real-PG concurrency proof.
- db/migrations/015_reservation_holds.sql (new).
- tests/m015/*: fixtures, 14 tests, package.json.
- .github/workflows/m015-ci.yml (new, with postgres:16 service).
- docs/evidence/M015/*: work packet + evidence.
- pnpm-lock.yaml: tests/m014 entry (importers-only, no new packages).

Excluded and untouched: booking/appointment commit (M016), eligibility rules
(M013), availability generation (M014), verification (M008), real clinical
approval, real PHI, production deployment, any Rust/Go/C++.
No unrelated platform features, no copied donor code.
