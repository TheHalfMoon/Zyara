# M014 Scope Review

Allowed (WORK_PACKET.md): packages/scheduling (time/schedules/candidates),
apps/worker (projection invalidation), db/migrations/014_availability.sql,
tests/m014, docs/evidence/M014, .github/workflows/m014-ci.yml,
docs/canonical/ZYARA_ARCHITECTURE_PLAN.md (A27 row only).

Observed changes:
- packages/scheduling/src/time.ts (new): civil-time engine.
- packages/scheduling/src/schedules.ts (new): versioned weekly rules.
- packages/scheduling/src/candidates.ts (new): hybrid generation + recheck.
- packages/scheduling/src/index.ts: export new modules.
- apps/worker/src/consumers.ts: projection cache + real invalidator.
- db/migrations/014_availability.sql (new).
- tests/m014/*: fixtures, 23 tests, bench.ts, package.json.
- .github/workflows/m014-ci.yml (new).
- docs/canonical/ZYARA_ARCHITECTURE_PLAN.md: A27 row appended only.
- docs/evidence/M014/*: work packet + evidence.

Excluded and untouched: holds/booking ledger (M015), eligibility rules (M013),
verification (M008), API routes, web UI, FHIR, AI/voice, any Rust/Go/C++.
No unrelated platform features, no copied donor code, no production data.
Arabic clinical wording: none added (display labels only; Hijri is
system-formatted, never authored). No reviewer-facing PHI anywhere.
