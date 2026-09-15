# M010 Work Packet (immutable)

- Task: M010 — Run the fixed search-engine and cost decision benchmark
- Task contract: docs/research/muse-task-contracts.json (M010, deps [M006, M007])
- Source refs: A05, S017, S082, S103, S104. Requirements: R02, R04, R20.
- Base SHA: 304311cc2ece07d04e8ae7e464c7520f4e4dde55 (origin/main, verified live 2026-09-15)
- Dependency evidence: M006 COMPLETE (PR #13); M007 COMPLETE (PR #15)
- Allowed surface: experiments/search, docs/evidence/M010, packages/search-contract,
  .github/workflows/m010-ci.yml
- Excluded: production search index, vendor procurement, live query logs
- Acceptance: (1) one engine chosen with scored tradeoff + reproducible corpus;
  (2) no unsupported benchmark claims; (3) five-locale/Arabic subgroup results
  + failure samples
- Tests: held-out retrieval + geospatial correctness; warm/cold latency repeats
- Security/privacy: synthetic rights-cleared data; no live symptom logs
- Localization: Arabic forms/transliteration + all five locale cohorts
- Failure modes: license gate fails, overstemming, missing insurer branch, cost
- Recovery: PG fallback; corpus + failed results preserved
- Risk: medium
- Method honesty: PG baseline MEASURED on PG16 (pg_trgm). OpenSearch and
  Meilisearch-community candidates SCORED BY SIMULATION ONLY, labeled as such;
  no latency/relevance claim is made for them. Decision: PG baseline + revisit.
