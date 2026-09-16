# M037 result — durable external booking and change operations

- Base SHA: 59007bb. Dependencies: M036, M016, M018 (all evidenced).
- Implementation: packages/adapter-ops (operations.ts); migration
  db/migrations/027_external_operations.sql; tests/m037/operations.test.ts.
- Semantics: capability gating per kind; idempotent replay without
  re-issuing writes; UNKNOWN recorded on ambiguous outcomes and resolved
  only by reconcile (no blind retry); cancel guarded on confirmed state;
  unique (tenant, idempotency_key) at DB level.
- Synthetic evidence only, fake adapter calls in tests.
- Commands:
  - pnpm --filter @zyara/m037-tests test → 4 pass, 0 fail
  - pnpm --filter @zyara/adapter-ops typecheck → clean
  - pnpm --filter @zyara/adapter-ops lint → clean
  - pnpm --filter @zyara/m037-tests lint → clean
- Residual risks: live-adapter timeout mapping needs contracted partner
  runs (external); worker crash recovery relies on PENDING-row pickup.
