# M050 result — group sessions and linked family appointments

- Base SHA: 3e708ac. Dependencies: M048, M017, M013 (all evidenced).
- Implementation: packages/group-care (groups.ts); migration
  db/migrations/032_group_family.sql; tests/m050/groups.test.ts.
- Semantics: finite capacity with per-patient eligibility + consent;
  duplicate join refused; family links carry separate booking ids and
  per-patient consent; sibling cancellation independent; roster view is
  attendance-only; DB CHECKs require consent flags.
- Synthetic evidence only. No shared records, no PHI.
- Commands:
  - pnpm --filter @zyara/m050-tests test → 3 pass, 0 fail
  - pnpm --filter @zyara/group-care typecheck → clean
  - pnpm --filter @zyara/group-care lint → clean
  - pnpm --filter @zyara/m050-tests lint → clean
- Residual risks: caregiver permission depth is M055; group clinical
  content review is external.
