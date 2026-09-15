# M007 Work Packet (immutable)

- Task: M007 — Build provenance-aware graph import and correction
- Task contract: docs/research/muse-task-contracts.json (M007, deps [M006])
- Source refs: A04, A10, S113, GOV. Requirements: R03, R13.
- Base SHA: 693f4430ca387ea8a53d0f9fedda34d44b7f8124 (origin/main, verified live 2026-09-15)
- Dependency evidence: M006 COMPLETE (PR #13 + evidence PR #14)
- Allowed surface: packages/graph-import, apps/worker, apps/api,
  tests/graph-import, docs/evidence/M007, .github/workflows/m007-ci.yml
- Excluded: verification workflow (M008), search index (M010/M011), real scraping,
  production sources
- Acceptance: (1) every material assertion shows source + last check;
  (2) conflicting identities require review; (3) withdrawal + unmerge preserve
  history and emit projection updates
- Tests: stale assertion + conflicting import; merge/unmerge/id-reuse +
  malformed batch
- Security/privacy: no unauthorized scraping; private credential evidence
  excluded from public projection
- Localization: Arabic/transliteration alias conflicts; locale addresses
- Observability: import rejects, freshness age, correction queue latency
- Failure modes: source rights expire, ID changes, clinic closure, partial batch
- Recovery: rollback batch via assertion supersession; never erase history
- Risk: medium
