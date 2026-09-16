# M050 work packet — group sessions and linked family appointments

- Task: M050 (P09/S09B). Objective: group sessions with capacity and
  linked family appointments with per-patient consent.
- Base SHA: 3e708ac. Dependencies: M048, M017, M013 (all evidenced).
- Allowed paths: packages/group-care, tests/m050, db/migrations/032_*,
  docs/evidence/M050.
- Exclusions: no shared clinical records, no family data pooling, no PHI.
- Requirements: group sessions have finite capacity and rosters; joining
  checks capacity + eligibility per patient; family links join relatives
  to a shared slot with per-patient booking records and per-patient
  consent; one member cancelling never cancels siblings; privacy: no
  cross-patient record visibility.
- Test plan: capacity guard, per-patient consent, sibling independence,
  roster privacy.
- Rollback: remove package/tests/migration.
