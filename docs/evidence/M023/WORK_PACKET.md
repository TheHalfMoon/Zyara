# M023 Work Packet (immutable)

- Task: M023 — Add review fraud review and ranking governance
- Task contract: docs/research/muse-task-contracts.json (M023, deps [M022, M011])
- Base SHA: 5106e14f25177f5fc1ee4ced6e92f3b87736e95f (origin/main, verified live 2026-09-16)
- Dependency evidence: M022 COMPLETE (PR #45/#46); M011 COMPLETE
- Allowed surface: packages/trust/governance, packages/search/ranking, apps/web/admin, tests/m023, docs/evidence/M023
- Excluded: changes to M011 score semantics, medical-access denial, invasive cross-provider tracking, production deployment, real PHI
- Language decision (A27): TypeScript by default. No Rust/Go extraction.
- Acceptance: (1) paid tier absent from score dependency graph; (2) small samples display uncertainty/count; (3) fraud flag cannot silently erase compliant negative review
- Tests: ranking invariant and aggregate golden tests; moderator/sales separation and appeal reversal tests
- Security/privacy: minimize fraud signals, no invasive cross-provider health tracking, synthetic data only
- Localization: locale fairness checks and translated explanation labels
- Observability: rank policy version, moderation override audit, fairness summaries
- Failure modes: biased moderation, sparse review confidence, sales override
- Recovery: remove faulty optional rank factor; retain transparent deterministic relevance
- Risk: high when affecting patient data or appointment authority
