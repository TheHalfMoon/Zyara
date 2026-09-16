# M025 Work Packet (immutable)

- Task: M025 — Deliver provider monthly reports and B2B entitlements
- Task contract: docs/research/muse-task-contracts.json (M025, deps [M024, M019, M022])
- Base SHA: 6e0074e61c77b6fa620098a793c649d61627d33d (origin/main, verified live 2026-09-16)
- Dependency evidence: M024 COMPLETE (PR #49/#50); M019/M022 COMPLETE
- Allowed surface: apps/web/provider-reports, packages/commerce, packages/analytics, tests/m025, docs/evidence/M025
- Excluded: payment automation, patient fees, commissions, ranking influence, production deployment, real PHI
- Language decision (A27): TypeScript by default. No Rust/Go extraction.
- Acceptance: (1) report totals reconcile to metric fixtures; (2) subscription state cannot change rank/reviews; (3) lapsed billing preserves existing patient appointment access
- Tests: report reconciliation and entitlement separation tests; missing-data/empty-cohort and export-permission tests
- Security/privacy: scoped provider reports; no identifiable cross-provider demand export; synthetic data only
- Localization: five-locale reports, SAR currency formatting
- Failure modes: misleading ROI, small sample, billing suspension blocking cancellation
- Recovery: revert commercial entitlements; keep core appointment continuity
- Risk: high when affecting patient data or appointment authority
