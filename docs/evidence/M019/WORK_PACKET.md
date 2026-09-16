# M019 Work Packet (immutable)

- Task: M019 — Deliver provider calendar and attendance operations
- Task contract: docs/research/muse-task-contracts.json (M019, deps [M016, M018, M009, M005])
- Source refs: A07, A13, C10, C11. Requirements: R09, R10, R17.
- Base SHA: 3db40767b1619801bf0ffc791efdc81e1f3eb94f (origin/main, verified live 2026-09-16)
- Dependency evidence: M016 COMPLETE (PR #33/#34); M018 COMPLETE (PR
  #37/#38); M009 COMPLETE (provider onboarding evidence); M005 COMPLETE
  (five-locale foundation).
- Allowed surface: apps/web/provider-calendar,
  packages/scheduling/operations, tests/m019, docs/evidence/M019,
  .github/workflows/m019-ci.yml.
- Excluded: new booking commit paths (M016 owns commit truth), safe-change
  semantics changes (M018 owns them), messaging (M020), external adapters,
  real PHI, production deployment, any language-runtime extraction (no
  Rust/Go/C++).
- Language decision (A27): TypeScript by default. No Rust/Go extraction.
- Acceptance: (1) calendar cannot bypass capacity/rules; (2) staff sees
  permitted patient fields only; (3) bulk absence produces per-appointment
  outcomes and consented alternatives.
- Tests: role matrix and concurrent drag/drop conflict; bulk partial failure,
  check-in status, keyboard/list tests.
- Security/privacy: reception clinical visibility restricted; operations
  completion distinct from clinical record; synthetic data only.
- Localization: five locales, RTL navigation, color-independent status
  labels; synthetic copy, human review required before real use.
- Observability: request age, check-in lag, bulk failures, sync-health;
  no PHI.
- Failure modes: provider leaves, day cancelled, stale UI revision, wrong
  branch.
- Recovery: read-only calendar plus staff assistance; preserve unresolved
  batch state.
- Risk: high when affecting appointment authority. Mitigated by routing all
  calendar writes through canonical M016/M018 commands, versioned
  drag/drop confirmation, and field-level staff visibility.
