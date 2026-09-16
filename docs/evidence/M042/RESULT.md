# M042 result — text navigation to typed provider/scheduling tools

- Base SHA: d438ac7. Dependencies: M041, M036, M016, M013 (all evidenced).
- Implementation: packages/navigation-tools (tools.ts);
  tests/m042/tools.test.ts.
- Semantics: M041 intent gate on every call; typed tools only;
  draft-booking returns a draft id and never a confirmation; unknown
  entities clarify without fabricated ids; adapter tools refuse without
  certified capabilities.
- Synthetic evidence only.
- Commands:
  - pnpm --filter @zyara/m042-tests test → 4 pass, 0 fail
  - pnpm --filter @zyara/navigation-tools typecheck → clean
  - pnpm --filter @zyara/navigation-tools lint → clean
  - pnpm --filter @zyara/m042-tests lint → clean
- Residual risks: confirmation redemption is M043; tool UI copy needs
  locale review.
