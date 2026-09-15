# M010 Result

Status: COMPLETE (merged).

- Base SHA: 304311cc2ece07d04e8ae7e464c7520f4e4dde55
- Implementation head: 636732e
- Merge commit on main: 9bafc55bb611c996e7bd988d8dea1e42788aa68e (PR #21)
- CI: m010-ci green on head. Measured PG16: top-1 0.019 (recorded as failure
  sample; relevance owned by M011 layer), p95 0.89ms, geo 120/120.
- Branch: muse/M010-search-benchmark
- Acceptance 1 (engine chosen + reproducible corpus): PASS — 120 docs /
  320 judged intents, seeded PRNG, PG baseline adopted (DECISION.md)
- Acceptance 2 (no unsupported claims): PASS — candidates labeled SIMULATED;
  check.mjs enforces commercial-free ranking contract
- Acceptance 3 (locale cohorts + failures): PASS — 5 cohorts incl. Arabic
  script vs transliteration split; per-locale top-5 in results.json
- Residuals: benchmark scale is pilot-sized; revisit dated 2027-03-15.
