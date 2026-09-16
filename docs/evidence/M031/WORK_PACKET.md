# M031 work packet — preference-aware waitlist enrollment

- Task: M031 (P06/S06A). Objective: preference-aware waitlist enrollment.
- Base SHA: 19da5b7 (post dependency-correction merge).
- Dependencies: M013, M017 (M030 removed as implementation gate per
  docs/governance/M028_M030_DEPENDENCY_CORRECTION.md; M028-M030 retained
  as external validation gates only).
- Allowed paths: packages/waitlist, tests/m031, db/migrations/022_*,
  docs/evidence/M031.
- Exclusions: no offer/matching engine (M032), no recalls (M033), no
  production data, no real PHI, no vendor integration.
- Source refs: A07, A24, C10, C13, C20. Requirements: R05, R08, R14.
- Security/privacy: explicit priority bands with recorded reasons; no
  opaque no-show/revenue scoring; minimize condition data; consented
  channels only; enrollment preserves original appointment.
- Acceptance: hard vs alternate preferences; enrollment does not cancel
  original; priority basis and overrides auditable.
- Test plan: tests/m031/waitlist.test.ts (validation, duplicates,
  eligibility, quiet hours, FIFO fairness); typecheck; lint; migration
  syntax review.
- Evidence: RESULT.md with head SHA, commands, exact results, residual risks.
- Rollback: drop package/tests/migration; no shared tables touched.
