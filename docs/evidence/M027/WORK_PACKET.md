# M027 Work Packet (immutable)

- Task: M027 — Pass reliability, restoration and release-control gates
- Task contract: docs/research/muse-task-contracts.json (M027, deps [M026, M015, M004])
- Base SHA: 76096fa84396368a33444664fc135dac3c4ad0c8 (origin/main, verified live 2026-09-16)
- Dependency evidence: M026 COMPLETE (PR #53/#54); M015/M004 COMPLETE
- Allowed surface: tests/reliability, infra/runbooks, docs/evidence/M027
- Excluded: production drills, production data, real restore of production backups, production deployment
- Language decision (A27): TypeScript by default. No Rust/Go extraction.
- Acceptance: (1) native invariants hold under specified concurrency; (2) restored operations do not duplicate notifications/bookings; (3) RPO/RTO and service budgets measured or launch blocker recorded
- Tests: load/worker/database failure and restore drills; constraint migration, kill-switch and notification replay tests
- Security/privacy: synthetic data only; protected backup access and keys by policy
- Localization: localized degraded states and Arabic staff runbooks
- Failure modes: database restore rollback, delayed worker, overload, unsupported vendor SLO
- Recovery: freeze new writes, restore known revision, reconcile durable state before reopen
- Risk: high when affecting patient data or appointment authority
