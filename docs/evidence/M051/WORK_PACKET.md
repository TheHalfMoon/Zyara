# M051 work packet — separate clinical consent and storage boundaries

- Task: M051 (P10/S10A). Objective: clinical data lives behind separate
  consent and storage boundaries from operational/app data.
- Base SHA: 6113a8e. Dependencies: M040, M003, M002 (all evidenced).
- Allowed paths: packages/consent-boundaries, tests/m051,
  db/migrations/033_*, docs/evidence/M051.
- Exclusions: no real clinical data, no FHIR import (M052), no PHI.
- Requirements: purpose-bound consent scopes (care, recall, analytics —
  analytics never implied); clinical store separate from operational
  store with explicit cross-boundary reads logged; revocation closes
  future reads but preserves audit; marketing use of clinical data
  refused; purpose limitation tested.
- Test plan: scope matrix, revocation semantics, cross-boundary audit,
  marketing refusal.
- Rollback: remove package/tests/migration.
