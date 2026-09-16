# M038 work packet — first negotiated FHIR scheduling adapter (synthetic)

- Task: M038 (P07/S07A). Objective: FHIR scheduling against a synthetic
  counterpart with strict reference/status/time mapping.
- Base SHA: a578d60. Dependencies: M036, M037, M035 (all evidenced).
- Allowed paths: packages/fhir-adapter, tests/m038, docs/evidence/M038.
- Exclusions: no production EHR connection, no real patient data, no PHI.
- Requirements: Slot/Appointment mapping with reference integrity, status
  mapping, UTC time mapping, unknown-extension tolerance, invalid-resource
  rejection, missing-identifier handling, pagination, re-key via M037
  reconcile path; booking-write only through M037 ops with certified
  capabilities.
- Test plan: mapping matrix, invalid/unknown/pagination/re-key cases.
- Rollback: remove package/tests.
