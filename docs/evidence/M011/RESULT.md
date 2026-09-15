# M011 Result

Status: COMPLETE (merged).

- Base SHA: 27e7db0b627a1d0184ae0fb2fbdd282df964fc53
- Implementation head: 02b40ed
- Merge commit on main: c13b6d744f6fb0a9403047a576bf38f9baecbe84 (PR #23)
- CI: m011-ci green on head (typechecks + lint + 6/6 tests).
- Branch: muse/M011-search-ranking
- Acceptance 1 (no paid organic influence): PASS — contract allowlist has no
  commercial signal; source scan enforced in tests
- Acceptance 2 (unknown insurance ≠ covered): PASS — insurerKnown false path
- Acceptance 3 (relaxation by patient choice): PASS — allowRelax flag only
- Tests: 6/6 ranking green (invariants, regression, withdrawn, empty, gating)
- Residuals: symptom navigation OFF pending M003 clinical policy; ranking
  weights synthetic and need M012-era relevance review against M010 corpus.
