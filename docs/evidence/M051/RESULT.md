# M051 result — separate clinical consent and storage boundaries

- Base SHA: 6113a8e. Dependencies: M040, M003, M002 (all evidenced).
- Implementation: packages/consent-boundaries (boundaries.ts); migration
  db/migrations/033_consent_boundaries.sql; tests/m051/boundaries.test.ts.
- Semantics: purpose-bound grants; analytics never implied; revocation
  closes future reads; cross-boundary reads always audited; marketing
  refused unconditionally; clinical table separated at schema level.
- Synthetic evidence only. No real clinical data.
- Commands:
  - pnpm --filter @zyara/m051-tests test → 3 pass, 0 fail
  - pnpm --filter @zyara/consent-boundaries typecheck → clean
  - pnpm --filter @zyara/consent-boundaries lint → clean
  - pnpm --filter @zyara/m051-tests lint → clean
- Residual risks: legal review of purposes is external; deletion
  semantics stay purpose-scoped in M052+.
