# M022 Work Packet (immutable)

- Task: M022 — Implement verified experience reviews and replies
- Task contract: docs/research/muse-task-contracts.json (M022, deps [M021, M005])
- Base SHA: e70d36fce1fcf0617571623e99fc109862f6971e (origin/main, verified live 2026-09-16)
- Dependency evidence: M021 COMPLETE (PR #43/#44); M005 COMPLETE
- Allowed surface: packages/trust/reviews, apps/web/reviews, apps/web/provider, tests/m022, docs/evidence/M022
- Excluded: fraud/ranking governance (M023), provider metrics (later), production deployment, real PHI
- Language decision (A27): TypeScript by default. No Rust/Go extraction.
- Acceptance: (1) negative compliant review cannot be removed by provider; (2) anonymous display reveals no patient ID; (3) provider reply cannot expose private care facts
- Tests: permission/moderation/edit and reply checks; low-count aggregates and duplicate submission tests
- Security/privacy: redact sensitive public text; lawful minimal audit; no clinical-outcome score; synthetic data only
- Localization: five-locale moderation guidance and Arabic text handling
- Observability: invitation coverage, moderation latency, appeal outcome, review freshness
- Failure modes: doxxing, provider pressure, duplicate reviews, biased invitations
- Recovery: quarantine unsafe text, retain appeal; disable reply publication if necessary
- Risk: high when affecting patient data or appointment authority
