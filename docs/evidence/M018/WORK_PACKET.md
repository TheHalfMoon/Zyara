# M018 Work Packet (immutable)

- Task: M018 — Implement safe cancellation and rescheduling
- Task contract: docs/research/muse-task-contracts.json (M018, deps [M016, M017])
- Source refs: A09, A11, C16. Requirements: R05, R15, R20.
- Base SHA: 9b2ca23fe0e6e24637f49150e89bbf08b6ad432b (origin/main, verified live 2026-09-16)
- Dependency evidence: M016 COMPLETE (PR #33/#34, authoritative operations);
  M017 COMPLETE (PR #35/#36, honest booking UX).
- Allowed surface: packages/scheduling/changes, apps/web/booking,
  apps/api (change-action handlers only), tests/m018, docs/evidence/M018,
  .github/workflows/m018-ci.yml.
- Excluded: new booking commit paths (M016 owns commit truth), calendar
  (M019), communications (M020), external adapters, real PHI, production
  deployment, any language-runtime extraction (no Rust/Go/C++).
- Language decision (A27): TypeScript by default. No Rust/Go extraction.
- Acceptance: (1) original survives failed replacement; (2) mail-link preview
  (GET) cannot cancel; (3) reschedule not double-counted as lost care.
- Tests: concurrent change/cancel, policy revision, replacement conflict,
  expired link, scanner GET, idempotent replay.
- Security/privacy: scoped expiring action tokens; optional reason private;
  link bound to patient; synthetic data only.
- Localization: five-locale policy/time/cutoff explanations; synthetic copy,
  human review required before real use.
- Observability: change outcomes, original-retained and duplicate-action
  metrics; no PHI.
- Failure modes: cutoff reached, conflict, already cancelled, wrong-patient
  link.
- Recovery: disable self-service mutation while retaining assistance and
  existing appointments.
- Risk: high when affecting appointment authority. Mitigated by voiding the
  original only after replacement commit succeeds, versioned idempotent
  change records, and GET-never-mutates safe links.
