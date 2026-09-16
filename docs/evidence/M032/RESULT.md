# M032 result — expiring offers and safe cancellation refill

- Base SHA: c60bdda. Dependencies: M031, M015, M018, M020 (all evidenced).
- Implementation: packages/waitlist/src/offers.ts; migration
  db/migrations/023_waitlist_offers.sql; tests/m032/offers.test.ts.
- Semantics: one live offer per unit (memory guard + partial unique
  index); in-time accept consumes and returns replacement id; late accept
  expires and retains original with no allocation; ambiguous commit keeps
  offer pending and allocates nothing (no blind retry); first contact
  deferred past quiet hours; hold-backed offers require a hold id while
  no-hold sources send honest invitations.
- Synthetic evidence only. No real notifications sent.
- Commands:
  - pnpm --filter @zyara/m032-tests test → 6 pass, 0 fail
  - pnpm --filter @zyara/waitlist typecheck → clean
  - pnpm --filter @zyara/waitlist lint → clean
  - pnpm --filter @zyara/m032-tests lint → clean
- Residual risks: worker outage recovery beyond in-memory sweep needs the
  durable outbox path (existing M020 infra); DB-level concurrency proof
  awaits integration test against a live migration run.
