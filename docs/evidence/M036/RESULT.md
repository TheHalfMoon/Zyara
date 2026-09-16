# M036 result — adapter capability and certification harness

- Base SHA: 4a22798. Dependencies: M016, M004 (evidenced).
- Implementation: packages/adapter-harness (harness.ts);
  tests/m036/harness.test.ts; docs/adapter-certification/REGISTER.md.
- Semantics: 11 explicit capabilities; certification grades claimed
  capabilities against synthetic contracts; uncertified calls refused with
  typed errors; booking-write requires create + conflict-enforcement;
  FHIR read never implies write; explicit per-adapter matrix.
- Synthetic evidence only. No vendor capabilities claimed.
- Commands:
  - pnpm --filter @zyara/m036-tests test → 4 pass, 0 fail
  - pnpm --filter @zyara/adapter-harness typecheck → clean
  - pnpm --filter @zyara/adapter-harness lint → clean
  - pnpm --filter @zyara/m036-tests lint → clean
- Residual risks: real vendor certification needs contracted partner
  environments (external); harness must be enforced at M037/M038 call sites.
