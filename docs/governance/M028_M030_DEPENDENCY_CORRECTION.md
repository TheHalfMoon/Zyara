# M028-M030 dependency correction (2026-09-16)

Base SHA: 59918cf67a3b87ff929c854a025210be90189d86

## Decision

Founder direction: M028, M029, M030 are DEFERRED_EXTERNAL_VALIDATION.
Not complete, passed, satisfied, waived, or evidenced. No external claims made.

## Audit result (M031-M060)

Only five tasks listed M030 as a direct implementation dependency:
M031, M033, M036, M041, M056. All other M031-M060 tasks reach M030
only transitively. No task among M031-M060 requires live pilot traffic,
real clinic recruitment, signed agreements, paid commitments, revenue,
or production authorization to implement code, define schema, or qualify
synthetic behavior. M030 was a business-sequencing edge, not a true
technical, safety, data, interoperability, or release dependency.

## Changes

| Task | Old dependencies | New dependencies | Rationale |
|------|------------------|------------------|-----------|
| M031 | M030, M013, M017 | M013, M017 | Waitlist enrollment builds on scheduling domain (M013) and booking authority (M017); synthetic fixtures suffice. |
| M033 | M030, M021, M013 | M021, M013 | Recall plans build on trust/attendance (M021) and scheduling (M013); no pilot economics needed. |
| M036 | M030, M016, M004 | M016, M004 | Adapter harness builds on integration contracts (M016) and domain events (M004); synthetic adapters suffice. |
| M041 | M030, M011, M003 | M011, M003 | Navigation safety builds on search (M011) and identity/privacy (M003); no live pilot needed. |
| M056 | M040, M030, M002 | M040, M002 | Enterprise governance builds on integration ops (M040) and authz (M002); no commercial evidence needed for implementation. |

## Retained external gates

M028, M029, M030 remain recorded per task in `external_gates_retained`.
Production authorization, launch, and expansion claims still require the
real evidence defined in M028-M030, M058, M060. Completion semantics:
IMPLEMENTATION_COMPLETE and SYNTHETIC_QUALIFICATION_COMPLETE may proceed;
EXTERNAL_VALIDATION_PENDING and PRODUCTION_AUTHORIZATION_PENDING remain
until real evidence exists.

## Files

- docs/research/muse-task-contracts.json
- docs/canonical/ZYARA_MUSE_EXECUTION_HANDOFF.md
- docs/canonical/ZYARA_ROADMAP.md
- docs/governance/M028_M030_DEPENDENCY_CORRECTION.md (this file)

## Effect

- M031, M033, M036, M041 become dependency-ready (their remaining
  technical prerequisites M001-M027 are implemented per evidence packages).
- M056 becomes implementation-unblocked once M040 completes; its
  commercial gate remains external.
- No production, launch, expansion, clinical, or commercial readiness claimed.
