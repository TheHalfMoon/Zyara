# M055 work packet — verified family and caregiver permissions

- Task: M055 (P10/S10B). Objective: granular, verified, revocable
  caregiver access with least privilege.
- Base SHA: bb4de9f. Dependencies: M050, M051, M053, M003 (all evidenced).
- Allowed paths: packages/caregiver-access, tests/m055,
  db/migrations/036_*, docs/evidence/M055.
- Exclusions: no blanket family access, no clinical authority for
  caregivers, no PHI.
- Requirements: grants are per-caregiver, per-patient, per-scope with
  patient verification; scopes: appointments-view, booking-manage,
  documents-view (clinical excluded by default); expiry required;
  revocation immediate; caregiver actions audited; self-grant refused.
- Test plan: scope matrix, verification gate, expiry, revocation,
  self-grant refusal, audit.
- Rollback: remove package/tests/migration.
