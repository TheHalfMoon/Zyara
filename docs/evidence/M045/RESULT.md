# M045 result — correctable voice navigation and booking

- Base SHA: 1d8b78f. Dependencies: M044, M042, M043, M005 (all evidenced).
- Implementation: packages/voice-booking (voice.ts);
  tests/m045/voice.test.ts.
- Semantics: transcript → candidate with ambiguity marked; correction
  loop; per-field critical confirmation with exact-match; readiness
  requires M041 gate + all critical confirmed + ambiguity resolved;
  M043 challenge binding for the final action.
- Synthetic evidence only. No live audio or autonomous booking.
- Commands:
  - pnpm --filter @zyara/m045-tests test → 3 pass, 0 fail
  - pnpm --filter @zyara/voice-booking typecheck → clean
  - pnpm --filter @zyara/voice-booking lint → clean
  - pnpm --filter @zyara/m045-tests lint → clean
- Residual risks: real-speech ambiguity needs consented corpus runs
  (external); locale-specific critical keys need review.
