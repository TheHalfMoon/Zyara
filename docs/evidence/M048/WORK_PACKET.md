# M048 work packet — bounded recurring and linked-care scheduling

- Task: M048 (P09/S09A). Objective: bounded recurring series and linked
  care episodes without unbounded commitments.
- Base SHA: 25b5b53. Dependencies: M046, M047, M033, M018 (all evidenced).
- Allowed paths: packages/recurring-care, tests/m048,
  db/migrations/030_*, docs/evidence/M048.
- Exclusions: no group/family sessions (M050), no open-ended series.
- Requirements: series are bounded (max occurrences, end date required);
  each occurrence is individually committable/cancellable; linked episodes
  group related appointments with a shared episode id; cancelling the
  episode policy is explicit per occurrence; recall-plan linkage for
  episode origin.
- Test plan: bound enforcement, per-occurrence independence, episode
  linkage, cancellation policy.
- Rollback: remove package/tests/migration.
