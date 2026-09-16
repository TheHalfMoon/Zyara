# M034 result — consented recall and recovery campaigns

- Base SHA: d0f0519. Dependencies: M033, M020, M032 (all evidenced).
- Implementation: packages/recall-campaigns (campaigns.ts); migration
  db/migrations/025_recall_campaigns.sql; tests/m034/campaigns.test.ts.
- Semantics: only active unsuppressed plans flow; consented channel
  required; quiet-hour deferral via shared helper; per-recipient
  idempotency (`campaign:plan:channel`); stop conditions halt; declines
  honored; minimized payloads (ids only, no clinical text).
- Synthetic evidence only. No real messages sent.
- Commands:
  - pnpm --filter @zyara/m034-tests test → 3 pass, 0 fail
  - pnpm --filter @zyara/recall-campaigns typecheck → clean
  - pnpm --filter @zyara/recall-campaigns lint → clean
  - pnpm --filter @zyara/m034-tests lint → clean
- Residual risks: durable worker delivery stays on M020 outbox; template
  copy needs clinician + locale review before live use.
