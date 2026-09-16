# M047 work packet — imaging, laboratory and nursing service workflows

- Task: M047 (P09/S09A). Objective: imaging/lab/nursing workflows with
  order-driven states and result handling that never fabricates results.
- Base SHA: fd64b9d. Dependencies: M046, M035, M013 (all evidenced).
- Allowed paths: packages/clinical-workflows, tests/m047,
  db/migrations/029_*, docs/evidence/M047.
- Exclusions: no real lab devices, no diagnostic interpretation, no PHI.
- Requirements: order lifecycle (ordered → scheduled → collected/
  performed → resulted → reviewed); result states distinguish pending,
  preliminary and final; preliminary never presented as final; nursing
  task lists with delegation guard (licensed-only tasks); referral linkage
  for order origin.
- Test plan: lifecycle transitions, preliminary/final distinction,
  delegation guard, referral linkage.
- Rollback: remove package/tests/migration.
