# M052 work packet — patient matching and validated FHIR imports

- Task: M052 (P10/S10A). Objective: match imported FHIR patients to local
  identities without silent merges; validate imports.
- Base SHA: 91d2416. Dependencies: M051, M038, M007 (all evidenced).
- Allowed paths: packages/patient-matching, tests/m052,
  db/migrations/034_*, docs/evidence/M052.
- Exclusions: no production import, no real PHI, no identity erasure.
- Requirements: deterministic match scoring with explainable outcome
  (match / review / no-match); never auto-merge on conflicting
  identifiers; merge/unmerge history preserved; invalid FHIR patients
  rejected; import runs behind M051 care consent.
- Test plan: match tiers, conflict refusal, merge history, invalid
  rejection, consent gate.
- Rollback: remove package/tests/migration.
