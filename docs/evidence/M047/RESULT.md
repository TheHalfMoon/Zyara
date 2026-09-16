# M047 result — imaging, laboratory and nursing service workflows

- Base SHA: fd64b9d. Dependencies: M046, M035, M013 (all evidenced).
- Implementation: packages/clinical-workflows (workflows.ts); migration
  db/migrations/029_service_orders.sql; tests/m047/workflows.test.ts.
- Semantics: strict order lifecycle; results gated on collected/performed;
  payload required for non-pending; preliminary labeled and never final;
  licensed-only nursing delegation guard; referral linkage retained.
- Synthetic evidence only. No devices, no interpretation, no PHI.
- Commands:
  - pnpm --filter @zyara/m047-tests test → 4 pass, 0 fail
  - pnpm --filter @zyara/clinical-workflows typecheck → clean
  - pnpm --filter @zyara/clinical-workflows lint → clean
  - pnpm --filter @zyara/m047-tests lint → clean
- Residual risks: device/result-payload formats need partner runs
  (external); interpretation stays out of scope permanently.
