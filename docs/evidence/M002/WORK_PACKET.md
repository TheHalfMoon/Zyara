# M002 Work Packet (immutable)

- Task: M002 — Implement account, tenant and branch authorization primitives
- Task contract: docs/research/muse-task-contracts.json (M002, deps [M001])
- Source refs: A12, A13, S077, S078. Requirements: R07, R14.
- Base SHA: df831b15992eb2f697cfc3352b1bf6b723edd6d4 (origin/main, verified live 2026-09-15)
- Dependency evidence: M001 COMPLETE (merged PR #4, m001-ci green on main)
- Allowed surface: packages/identity, packages/authorization, apps/api, db/migrations, tests/m002, docs/evidence/M002, .github/workflows/m002-ci.yml
- Excluded: product features beyond authz primitives, production IdP, real PHI, deployments
- Acceptance: (1) cross-tenant/branch deny; (2) revoked loses access next request; (3) privileged require assurance
- Tests: policy matrix, revocation/session, bypass, RLS/role isolation, 5-locale errors
- Security: deny default; tenant from verified claims only; tokens minimized/never logged
- Localization: ar/en/fr/de/es auth errors; mixed-script names retained
- Observability: denial codes + membership audit events
- Failure modes: stale/invalid tenant, revoked, escalation, admin-clinical bleed, RLS misconfig
- Recovery: disable roles/endpoints, revoke sessions, roll back migration (footer in SQL)
- Risk: medium (raised high for permission changes during review)
