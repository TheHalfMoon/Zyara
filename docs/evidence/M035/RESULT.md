# M035 result — referral and order-to-schedule work queues

- Base SHA: f9dde2e. Dependencies: M033, M013, M019 (all evidenced).
- Implementation: packages/referrals (referrals.ts); migration
  db/migrations/026_referral_queues.sql; tests/m035/referrals.test.ts.
- Semantics: authorized clinical sources only; expiry-after-creation;
  expired referrals never schedule; expiry sweep with audit; pending
  dedup guard (memory + partial unique index); deterministic urgency-then-
  FIFO queue order; reasoned transition audit; terminal immutability.
- Synthetic evidence only.
- Commands:
  - pnpm --filter @zyara/m035-tests test → 4 pass, 0 fail
  - pnpm --filter @zyara/referrals typecheck → clean
  - pnpm --filter @zyara/referrals lint → clean
  - pnpm --filter @zyara/m035-tests lint → clean
- Residual risks: FHIR referral writes are M038; queue UI not in scope.
