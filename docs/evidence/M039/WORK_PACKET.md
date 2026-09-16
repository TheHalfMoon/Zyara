# M039 work packet — legacy SIU ingestion and batch/calendar fallback

- Task: M039 (P07/S07B). Child packet M039.1 covers SIU transport parse.
- Base SHA: 0674234. Dependencies: M036, M007, M004 (all evidenced).
- Allowed paths: packages/legacy-ingest, tests/m039,
  docs/evidence/M039. No DB migration (reuse external_operations ledger).
- Exclusions: no live HL7 feed, no production PHI, no M040 rollout.
- Requirements: SIU S12 parsing with MSH/EVN/PID/SCH segment validation;
  ACK distinction (AA/AE/AR); unknown segments tolerated, invalid
  messages rejected; batch fallback marked request-only with honest
  availability invitations (never fake holds); calendar fallback is read
  only and never clinical authority.
- Test plan: valid SIU, invalid segments, ACK classes, fallback honesty.
- Rollback: remove package/tests.
