# M054 work packet — safe documents and informational medication reminders

- Task: M054 (P10/S10B). Child packet M054.1 covers reminder transport
  (quiet hours + idempotency, reusing M020/M032 helpers).
- Base SHA: e69588c. Dependencies: M053, M020, M051 (all evidenced).
- Allowed paths: packages/patient-documents, tests/m054,
  db/migrations/035_*, docs/evidence/M054.
- Exclusions: no prescribing, no dose advice, no diagnosis, no PHI.
- Requirements: documents are patient-uploaded with virus-scan status and
  consent; medication reminders are informational only (name + time,
  never dose changes); reminders need consent + quiet-hour respect;
  critical medication claims require clinician source.
- Test plan: upload gating, reminder informational-only guard, consent
  and quiet hours, clinician-source rule.
- Rollback: remove package/tests/migration.
