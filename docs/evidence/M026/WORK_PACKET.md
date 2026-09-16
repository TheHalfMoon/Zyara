# M026 Work Packet (immutable)

- Task: M026 — Prove the complete synthetic patient-to-review loop
- Task contract: docs/research/muse-task-contracts.json (M026, deps [M017, M018, M019, M020, M022, M025])
- Base SHA: b38f88591fbce83ebd5ff185608341a10c6b8600 (origin/main, verified live 2026-09-16)
- Dependency evidence: M017/M018/M019/M020/M022/M025 COMPLETE
- Allowed surface: tests/e2e, fixtures/synthetic, docs/evidence/M026
- Excluded: new product code, production data, real PHI, real message delivery, production deployment
- Language decision (A27): TypeScript by default. No Rust/Go extraction.
- Acceptance: (1) every pilot path completes with correct evidence; (2) no false confirmation or unauthorized access in corpus; (3) report reflects actual synthetic attendance
- Tests: full journey and failure-branch tests; screenreader/RTL/manual rehearsal recorded as procedure with locale evidence
- Security/privacy: synthetic identities only; no real national IDs or phone delivery
- Localization: five-locale completeness; Arabic RTL procedure evidence
- Failure modes: disconnected modules, misleading status, inaccessible confirmation, missing outcome
- Recovery: keep live launch disabled; repair bounded failing path and rerun affected corpus
- Risk: high when affecting patient data or appointment authority
