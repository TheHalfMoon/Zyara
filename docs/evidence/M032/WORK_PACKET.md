# M032 work packet — expiring offers and safe cancellation refill

- Task: M032 (P06/S06A). Objective: one offer cannot allocate one unit
  twice; expired acceptance retains original booking; quiet hours preserve
  fair response opportunity.
- Base SHA: c60bdda. Dependencies: M031, M015, M018, M020 (all evidenced).
- Allowed paths: packages/waitlist/src/offers.ts (+index), tests/m032,
  db/migrations/023_*, docs/evidence/M032.
- Exclusions: no recall campaigns (M034), no referral queues (M035), no
  real notifications, no production data/PHI.
- Safety: sequential matching; offer holds a real unit where supported;
  explicit acceptance required; native replacement atomically releases the
  later booking only after the earlier one commits; expired/late accept
  retains original; no blind retries after ambiguous writes.
- Test plan: concurrent accept/expiry, double-allocate guard, late accept
  preserves original, quiet-hour deferral, worker-outage safe state.
- Rollback: remove offers module/tests/migration; enrollments untouched.
