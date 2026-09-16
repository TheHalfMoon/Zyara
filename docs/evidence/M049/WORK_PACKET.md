# M049 work packet — approved telehealth and request-first home visits

- Task: M049 (P09/S09B). Objective: telehealth visits and request-first
  home visits with explicit modality authority.
- Base SHA: c4c215d. Dependencies: M040, M047, M013, M020 (all evidenced).
- Allowed paths: packages/care-modalities, tests/m049,
  db/migrations/031_*, docs/evidence/M049.
- Exclusions: no live video vendor, no real home dispatch, no PHI.
- Requirements: modality is explicit per appointment (in-person,
  telehealth, home-visit-request); home visits are request-first (staff
  approve before commit); telehealth needs a verified link + consent;
  eligibility per modality; modality change re-verifies authority.
- Test plan: modality guards, request-first approval, link/consent
  checks, change re-verification.
- Rollback: remove package/tests/migration.
