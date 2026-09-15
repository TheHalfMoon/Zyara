# M015 Result

Status: COMPLETE (merged).

- Base SHA: e2d8afa4b4e0066c48f51775580b7149d9f927dc
- Implementation head: 76a712543675001a1d79c75828156a3e73182e29
- Merge commit on main: f4f6ff6450cee98fe10ba22b11f008d12af00bd7 (PR #31)
- CI: m015-ci green on exact head (typecheck + lint + 14/14 tests + real PG smoke);
  m001-ci, m002-ci, m008-ci, m013-ci, m014-ci green on exact head and post-merge.
- Branch: muse/M015-holds-expiry
- Acceptance 1 (at most one active allocation per unit/interval): PASS — 100 real
  parallel clients race one capacity-one interval in CI PG smoke, exactly 1 winner;
  invariant query confirms 1 active row; 100-way in-memory race also yields 1 hold
- Acceptance 2 (multi-resource hold is all-or-none): PASS — second-unit exclusion
  conflict rolls back the whole transaction, zero partial items survive; typed
  allItemsFree pre-check keeps errors explicit while the exclusion constraint
  remains the final arbiter
- Acceptance 3 (expired hold cannot redeem with worker stopped): PASS — no worker
  runs in the smoke; redeem path reaps inline against statement_timestamp first;
  expired UPDATE refuses commit and sweep marks the hold expired with items deactivated
- Tests: 14/14 green (6 state machine, 5 concurrency, 3 guards); regression
  M013 19/19, M014 23/23, M004 8/8; typecheck and eslint clean
- Idempotency: same key plus same digest replays the same hold; same key plus
  changed body conflicts and never allocates a second row (UNIQUE tenant+key)
- Language decision (A27): TypeScript plus PostgreSQL. Exclusion constraints are
  the double-booking authority; deterministic lock order prevents deadlock cycles;
  DB time via statement_timestamp rules expiry; no Redis-only lock; no now()
  predicate. No Rust extraction justified; revisit only with M059 measurements
- Architecture: PostgreSQL stays the scheduling authority; every writer path
  (holds, booking commit, admin/import) writes through reservation_items
- Privacy: ledger carries tenant, actor, service, unit IDs, UTC ranges, versions
  and opaque digests only; telemetry carries counts/codes/versions; string-ID
  outbox events via M004; synthetic data only, no PHI
- Localization: five-locale held/expired/needs-reconfirmation/conflict catalog
  (ar, en, fr, de, es); ar RTL preserved; human review required before real use
- Migration: 015_reservation_holds.sql creates holds plus reservation_items plus
  session_guards with btree_gist exclusion, UNIQUE tenant+key, FORCE RLS plus
  tenant policies; grants SELECT+INSERT+UPDATE only, no DELETE
- Residuals: booking commit ledger is M016 next; no local PostgreSQL on the
  implementation machine plus local Docker storage corrupted — real-DB proof runs
  authoritatively in CI on postgres:16; real clinical approval remains an explicit
  external gate.
