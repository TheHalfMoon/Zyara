# M046 work packet — dental multi-resource service configuration

- Task: M046 (P09/S09A). Objective: dental services with multi-resource
  recipes (chair + clinician + assistant + equipment) validate end to end.
- Base SHA: 2a50afa. Dependencies: M040, M013, M015, M019 (all evidenced).
- Allowed paths: packages/specialty-dental, tests/m046,
  db/migrations/028_*, docs/evidence/M046.
- Exclusions: no imaging/lab/nursing (M047), no live clinic config.
- Requirements: dental service catalog with resource recipes; booking a
  dental visit holds all recipe resources atomically; partial holds roll
  back; qualification constraints (e.g. hygienist vs dentist scope);
  recall-plan template linkage (dental-preventive).
- Test plan: recipe completeness, atomic multi-hold, partial rollback,
  scope guard, recall linkage.
- Rollback: remove package/tests/migration.
