# M017 Work Packet (immutable)

- Task: M017 — Deliver minimal-identity patient booking and request UX
- Task contract: docs/research/muse-task-contracts.json (M017, deps [M016, M005, M012, M002, M003])
- Source refs: A21, A22, C11, C33. Requirements: R05, R06, R07, R15.
- Plan revision: ZYARA_CANONICAL_BUILD_PLAN.md baseline 2026-09-13; architecture
  plan includes A27 language strategy (TypeScript default; Rust/Go by evidence).
- Base SHA: 576fd8bbf70cd87a0a35861dbd2491043ba12fd5 (origin/main, verified live 2026-09-16)
- Dependency evidence: M016 COMPLETE (PR #33/#34, authoritative operations);
  M005 COMPLETE (five-locale accessible foundation); M012 COMPLETE (profiles
  plus map/list); M002 COMPLETE (tenant/branch authorization); M003 COMPLETE
  (governance and data-flow package).
- Allowed surface: apps/web/booking, packages/patient, packages/identity
  (delegate scope only), tests/m017, docs/evidence/M017,
  .github/workflows/m017-ci.yml.
- Excluded: booking commit changes (M016), safe changes (M018), calendar
  (M019), communications (M020), external adapters, real PHI, production
  deployment, any language-runtime extraction (no Rust/Go/C++).
- Language decision (A27): TypeScript by default. No Rust/Go extraction.
- Acceptance: (1) every mode uses honest outcome language; (2) request shows
  deadline/owner without false reservation; (3) delegate revocation blocks
  next action.
- Tests: end-to-end all modes and network resume; shared phone, unauthorized
  delegate, contact-verification tests.
- Security/privacy: no national ID for browsing; contact verified at action;
  purpose-specific share; clinical delegation separate; synthetic data only.
- Localization: human-reviewed five-locale booking flow and RTL confirmation.
- Observability: funnel stage and pending requests, not raw forms.
- Failure modes: lost network, missing referral, guardian unapproved,
  redirect return without proof.
- Recovery: fallback to manual search/request; disable unapproved delegate route.
- Risk: high when affecting patient data. Mitigated by explicit patient/actor
  separation, verified contact before action, and honest mode copy that never
  promises booking before commit.
