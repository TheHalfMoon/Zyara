# M033 result — clinician-originated follow-up and recall plans

- Base SHA: c4edeff. Dependencies: M021, M013 (evidenced).
- Implementation: packages/recall-plans (plans.ts); migration
  db/migrations/024_recall_plans.sql; tests/m033/plans.test.ts.
- Semantics: authorized issuer roles only; booking attaches access work
  without closing clinical completion; completion requires issuer role;
  versioned supersede; terminal states suppress obsolete work; missed
  visit reopens only inside an active window; explicit declines; active
  duplicate guard (memory + partial unique index).
- Synthetic evidence only.
- Commands:
  - pnpm --filter @zyara/m033-tests test → 5 pass, 0 fail
  - pnpm --filter @zyara/recall-plans typecheck → clean
  - pnpm --filter @zyara/recall-plans lint → clean
  - pnpm --filter @zyara/m033-tests lint → clean
- Residual risks: campaign orchestration is M034; template clinical
  content needs clinician review before any live use.
