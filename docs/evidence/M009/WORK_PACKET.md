# M009 Work Packet (immutable)

- Task: M009 — Build service and practice onboarding configuration
- Task contract: docs/research/muse-task-contracts.json (M009, deps [M006, M008])
- Source refs: A07, A11, C10, C13, GOV. Requirements: R10, R17.
- Base SHA: 227411d7434b39e61106ae13b65336c0c88f66c2 (origin/main, verified live 2026-09-15)
- Dependency evidence: M006 COMPLETE (PR #13); M008 COMPLETE (PR #17)
- Allowed surface: packages/services, apps/web/provider, packages/contracts,
  tests/m009, docs/evidence/M009, .github/workflows/m009-ci.yml
- Excluded: scheduling engine (M013+), verification decisions (M008),
  real intake data
- Acceptance: (1) missing duration/resource/authority blocks publish;
  (2) insurance dated by branch/network/service; (3) synthetic receptionist can
  configure initial + follow-up types
- Tests: required-field + role-permission; partial save/resume; expired assertion
- Security/privacy: restricted intake fields; public profile hides private evidence
- Localization: five-locale service labels; Arabic-native form review (M005 cats)
- Observability: completeness blocker counts + time-to-ready fields
- Failure modes: false completeness, unsupported privilege, wrong coordinates
- Recovery: unpublish service version; restore prior approved configuration
- Risk: medium
