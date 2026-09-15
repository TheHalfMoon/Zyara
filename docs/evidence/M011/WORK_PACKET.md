# M011 Work Packet (immutable)

- Task: M011 — Implement structured search and transparent ranking
- Task contract: docs/research/muse-task-contracts.json (M011, deps [M005, M010, M009, M003])
- Source refs: A05, A23, RANKING, C02, C19. Requirements: R01, R02, R04.
- Base SHA: 27e7db0b627a1d0184ae0fb2fbdd282df964fc53 (origin/main, verified live 2026-09-15)
- Dependency evidence: M005 (PR #11), M010 (PR #21), M009 (PR #19), M003 (PR #7)
- Allowed surface: packages/search, apps/api, apps/web/search, tests/m011,
  docs/evidence/M011, .github/workflows/m011-ci.yml
- Excluded: crawler/import (M007), map UI (M012), booking (M016+), real inventory
- Acceptance: (1) paid tier never influences organic score; (2) unknown
  insurance is not guaranteed coverage; (3) filter relaxation needs patient choice
- Tests: ranking invariant + relevance regression; expired/withdrawn projection
  + empty-result tests
- Security/privacy: no raw free-text retention by default; public cache excludes
  patient context
- Localization: five-locale aliases + RTL controls (M005)
- Observability: redacted intent categories, zero-results, index freshness
- Failure modes: stale index, unsafe synonyms, hidden relaxation
- Recovery: disable query expansion; deterministic name/service search remains
- Risk: medium
