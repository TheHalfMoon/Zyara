# M008 Work Packet (immutable)

- Task: M008 — Implement provider claiming and verification workflow
- Task contract: docs/research/muse-task-contracts.json (M008, deps [M005, M007])
- Source refs: GOV, A24. Requirements: R03, R13, R17.
- Base SHA: 35899a0f39b658ac34c5c397fd14c08804a284f6 (origin/main, verified live 2026-09-15)
- Dependency evidence: M005 COMPLETE (PR #11); M007 COMPLETE (PR #15)
- Allowed surface: packages/verification, apps/web/provider, apps/api,
  tests/verification (named tests/m008), docs/evidence/M008,
  .github/workflows/m008-ci.yml
- Excluded: real credential checks, regulator integrations, sales overrides,
  booking enforcement wiring (M009/M016 consume supply-blocking API)
- Acceptance: (1) badge describes evidence scope; (2) expiry/suspension disables
  affected supply; (3) dispute cannot hand control to unverified actor
- Tests: reviewer-role/expiry + competing claims; public-projection redaction
- Security/privacy: verification files private + audited; sales cannot override
- Localization: Arabic names/evidence; five-locale badge explanations
- Observability: review turnaround, expiring evidence, blocked services
- Failure modes: stolen claim, outdated registration, absent privilege
- Recovery: freeze edits, remove badge, preserve appeal trail
- Risk: medium
