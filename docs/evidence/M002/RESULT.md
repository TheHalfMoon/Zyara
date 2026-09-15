# M002 Result

Status: COMPLETE (merged; post-merge CI verified below).

- Base SHA: df831b15992eb2f697cfc3352b1bf6b723edd6d4
- Implementation head: a8078741a5d21f03e1b5ba8163f36ed4b934af10
- Merge commit on main: 6d922694ea5c2b99eb713f1f37bf0fcd16d44b8f (PR #5)
- Acceptance 1 (cross-tenant/branch deny): PASS — 10/10 tests/m002 green locally + CI
- Acceptance 2 (revocation): PASS — session revoke + membership revoke covered
- Acceptance 3 (assurance): PASS — aal2 required for admin.privileged
- RLS: migration 002 proven against real PostgreSQL 16 in m002-ci
  (tenant isolation as zyara_app + migrator/app role isolation).
  CI also caught and fixed three genuine defects before merge:
  missing pg resolution path, BIGINT typo, superuser RLS bypass in smoke.
  Local PG unavailable (known M001 residual: Docker daemon corrupted on author host).
- Localization: 5-locale auth errors, mixed-script names retained.

- Base SHA: df831b15992eb2f697cfc3352b1bf6b723edd6d4
- Branch: muse/M002-authz-primitives
- Acceptance 1 (cross-tenant/branch deny): PASS — 10/10 tests/m002 green locally
- Acceptance 2 (revocation): PASS — session revoke + membership revoke covered
- Acceptance 3 (assurance): PASS — aal2 required for admin.privileged
- RLS: migration 002 applies tenant isolation + zyara_migrator/zyara_app roles;
  live-DB proof runs in m002-ci (postgres:16 service + scripts/m002-rls-smoke.mjs).
  Local PG unavailable (known M001 residual: Docker daemon corrupted on author host).
- Localization: 5-locale auth errors, mixed-script names retained.
- Residuals: RLS proven in CI only until local PG restored; Keycloak is a
  synthetic realm abstraction (no vendor lock-in, no production IdP claim).
