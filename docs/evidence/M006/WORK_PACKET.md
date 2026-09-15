# M006 Work Packet (immutable)

- Task: M006 — Create the provider graph and identifier model
- Task contract: docs/research/muse-task-contracts.json (M006, deps [M002, M004])
- Source refs: A03, A04, A10, FHIR, S113. Requirements: R03, R10.
- Base SHA: c69ed45567d196ce5aedbefdf16bfbdfa4c8a659 (origin/main, verified live 2026-09-15)
- Dependency evidence: M002 COMPLETE (PR #5); M004 COMPLETE (PR #9)
- Allowed surface: packages/graph, db/migrations/006_*, tests/graph,
  docs/evidence/M006, .github/workflows/m006-ci.yml
- Excluded: import pipelines (M007), verification (M008), search (M010/M011),
  scheduling (M013+), real provider data
- Acceptance: (1) one practitioner, several branch roles, one identity;
  (2) service exists without primary doctor; (3) hierarchy cycles +
  cross-tenant writes fail
- Tests: cardinality/cycle/identifier; synthetic FHIR mapping fixtures
- Security/privacy: public vs private evidence fields separated; no patient IDs
- Localization: multilingual labels/aliases preserve source spelling
- Observability: graph integrity failures + source coverage counters
- Failure modes: duplicate names, org merger, reused external identifier
- Recovery: reversible migrations; quarantine conflicts, never destructive merge
- Risk: medium
