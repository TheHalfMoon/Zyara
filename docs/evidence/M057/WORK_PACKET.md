# M057 work packet — governed aggregate analytics and partner APIs

- Task: M057 (P11/S11A). Objective: aggregate-only analytics and scoped
  partner APIs with disclosure boundaries.
- Base SHA: 205bbab. Dependencies: M056, M024, M040 (all evidenced).
- Allowed paths: packages/partner-analytics, tests/m057,
  docs/evidence/M057.
- Exclusions: no row-level export, no PHI in analytics, no real partners.
- Requirements: k-anonymity threshold on aggregates (small cells
  suppressed); purpose-scoped API tokens; rate limits; audit of every
  export; no patient free text in payloads; analytics consent honored.
- Test plan: suppression threshold, token scoping, rate limiting, audit,
  free-text exclusion.
- Rollback: remove package/tests.
