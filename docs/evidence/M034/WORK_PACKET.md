# M034 work packet — consented recall and recovery campaigns

- Task: M034 (P06/S06B). Objective: orchestrate consented recall and
  recovery campaigns from M033 plans with durable, quiet-hour-respecting
  outreach.
- Base SHA: d0f0519. Dependencies: M033, M020, M032 (all evidenced).
- Allowed paths: packages/recall-campaigns, tests/m034,
  db/migrations/025_*, docs/evidence/M034.
- Exclusions: no referrals (M035), no real SMS/email sends, no marketing
  use of clinical data.
- Requirements: campaign targets active unsuppressed plans only; per-patient
  channel consent required; quiet hours defer first contact; per-recipient
  idempotency; stop conditions halt outreach; decline/suppression honored;
  clinical fields stay out of generic events (minimized payloads).
- Test plan: consent gating, suppression of terminal plans, quiet-hour
  deferral, idempotent enqueue, stop-condition halt.
- Rollback: remove package/tests/migration.
