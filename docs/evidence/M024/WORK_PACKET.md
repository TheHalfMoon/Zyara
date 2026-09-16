# M024 Work Packet (immutable)

- Task: M024 — Implement minimized operational metric definitions
- Task contract: docs/research/muse-task-contracts.json (M024, deps [M004, M016, M019, M020, M021])
- Base SHA: 31e501a76b2caabc334c973f0ad9c17fb79926d3 (origin/main, verified live 2026-09-16)
- Dependency evidence: M004/M016/M019/M020/M021 COMPLETE; M022/M023 COMPLETE
- Allowed surface: packages/analytics, packages/events, db/migrations, tests/m024, docs/evidence/M024
- Excluded: raw symptom/query/PHI logging, reidentifiable slices, production deployment, real PHI
- Language decision (A27): TypeScript by default. No Rust/Go extraction.
- Acceptance: (1) every KPI has grain/denominator/source/coverage; (2) no-show excludes unknown outcomes; (3) reschedule is not double-counted loss
- Tests: synthetic funnel reconciliation and duplicate-event tests; privacy/small-cell and late-correction tests
- Security/privacy: suppress small groups and complementary cells; synthetic data only
- Localization: locale/channel dimensions without exposing individual profiles
- Observability: pipeline lag, source coverage, reconciliation mismatch
- Failure modes: late events, missing outcome, identity join inflation, reidentifiable slices
- Recovery: stop suspect reports; rebuild aggregates from approved events
- Risk: high when affecting patient data or appointment authority
