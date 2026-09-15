# M014 Result

Status: COMPLETE (merged).

- Base SHA: 3cf7c0b826a0cac029abf0d4b955e17d5f247634
- Implementation head: 6af44ae
- Merge commit on main: c9ac5e64a31eea2748b9571b6b34415a92ff2ec0 (PR #29)
- CI: m014-ci green on exact head (typecheck + lint + 23/23 tests);
  m001-ci, m004-ci, m013-ci green on exact head and post-merge.
- Branch: muse/M014-availability
- Acceptance 1 (buffers fit every resource): PASS — every candidate proves
  full duration plus prep/cleanup fits each assigned unit's opening
- Acceptance 2 (hard blocks dominate): PASS — leave/holiday/closure close the
  day; conflicting overrides rejected at authoring, never ordered silently
- Acceptance 3 (stale versions need recheck): PASS — STALE_VERSION,
  DURATION_CHANGED and NO_LONGER_FITS verdicts proven; cached candidates
  never authorize booking
- Tests: 23/23 green (Riyadh steady zone; Berlin/NY gaps reject; Berlin/NY
  folds need explicit offset; holidays; provider leave; schedule override;
  horizon; minimum notice; cutoff; slot alignment; buffers; duration-change
  invalidation; multi-resource alignment; finite capacity; stale versions;
  invalidation; combinatorial limits; performance baseline)
- Benchmark (A27): 90-day full-week generation p50 ~357ms in TypeScript —
  no Rust extraction justified; TypeScript kept
- Architecture: ADR A27 recorded (TypeScript default; Rust/Go by evidence;
  PostgreSQL stays the scheduling authority)
- Privacy: projection keys carry versions/counts only; no patient context,
  no M013 inputs in cache; string-ID invalidation events via M004 outbox
- Localization: Gregorian canonical with explicit zone; labeled Hijri display
  (never parsed); five-locale contract preserved; ar RTL untouched
- Migration: schedule_versions append-only (SELECT+INSERT), projections
  bounded cache (SELECT+INSERT+DELETE); FORCE RLS + tenant policies
- Residuals: holds/booking ledger (M015 next); no local PostgreSQL on the
  implementation machine (same residual as M013) — SQL qualified by exact-head
  CI + review; real clinical approval remains an explicit external gate.
