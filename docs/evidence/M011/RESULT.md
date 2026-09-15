# M011 Result

Status: IMPLEMENTED — pending CI + merge verification.

- Base SHA: 27e7db0b627a1d0184ae0fb2fbdd282df964fc53
- Branch: muse/M011-search-ranking
- Acceptance 1 (no paid organic influence): PASS — contract allowlist has no
  commercial signal; source scan enforced in tests
- Acceptance 2 (unknown insurance ≠ covered): PASS — insurerKnown false path
- Acceptance 3 (relaxation by patient choice): PASS — allowRelax flag only
- Tests: 6/6 ranking green (invariants, regression, withdrawn, empty, gating)
- Residuals: symptom navigation OFF pending M003 clinical policy; ranking
  weights synthetic and need M012-era relevance review against M010 corpus.
