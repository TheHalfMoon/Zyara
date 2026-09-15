# M004 Work Packet (immutable)

- Task: M004 — Enforce module ownership and durable event delivery
- Task contract: docs/research/muse-task-contracts.json (M004, deps [M001, M002])
- Source refs: A06, A20, S083, S084, S112. Requirements: R12, R14, R20.
- Base SHA: db8506f5556c345c6581eaf428fea248d7d1e5fc (origin/main, verified live 2026-09-15)
- Dependency evidence: M001 COMPLETE (PR #4); M002 COMPLETE (PR #5 + evidence PR #6)
- Allowed surface: packages/events (+domain audit iface), apps/worker,
  db/migrations/004_*, tests/m004, docs/evidence/M004, .github/workflows/m004-ci.yml
- Excluded: scheduling logic, notification content, product features, pg-boss
  vendor lock-in (DB-task discovery is the fallback; wakeup via LISTEN/NOTIFY)
- Acceptance: (1) commit writes domain state + outbox together; (2) duplicate
  delivery has one logical effect; (3) incompatible event version quarantined
- Tests: crash before/after commit, duplicate consumer, cross-tenant routing,
  worker restart, quarantine, RLS smoke on real PG16 in CI
- Security/privacy: no patient text in event body; audit reader scoped (M002 roles)
- Localization: stable event codes; UI-localized explanations only
- Observability: outbox age, retry count, DLQ, correlation IDs
- Failure modes: worker outage, poison message, replay, lost wakeup
- Recovery: stop consumers, replay from durable cursor; never bulk resend blindly
- Risk: medium
