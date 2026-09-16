# M031 result — preference-aware waitlist enrollment

- Base SHA: 19da5b7. Dependencies: M013, M017 (verified evidence present).
  M030 intentionally not an implementation dependency per
  docs/governance/M028_M030_DEPENDENCY_CORRECTION.md.
- Implementation: packages/waitlist (enrollment.ts, fairness.ts, index.ts);
  migration db/migrations/022_waitlist_enrollment.sql; tests
  tests/m031/waitlist.test.ts.
- Semantics: hard vs alternate preferences; enrollment preserves original
  appointment id; priority band + FIFO ordering; audited overrides;
  quiet-hour suppression; consented channels; duplicate/idempotency guard.
- Synthetic evidence only. No real patients, clinics, or PHI.
- Commands:
  - pnpm --filter @zyara/m031-tests test → 6 pass, 0 fail
  - pnpm --filter @zyara/waitlist typecheck → clean
  - pnpm --filter @zyara/waitlist lint → clean
  - pnpm --filter @zyara/m031-tests lint/typecheck → clean
- Residual risks: offer/matching engine is M032 (not in scope); timezone
  edge cases beyond IANA validation rely on platform Intl; migration
  applied to synthetic/local DB only, needs DBA review before any shared env.
- External gates unaffected: M028/M029/M030 remain DEFERRED_EXTERNAL_VALIDATION.
