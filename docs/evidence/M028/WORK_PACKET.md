# M028 Work Packet (immutable)

- Task: M028 — Qualify pilot clinics and rehearse real operating procedures
- Task contract: docs/research/muse-task-contracts.json (M028, deps [M009, M019, M025, M003, M027])
- Base SHA: 3846716a47efa0127db7a1610f7195fb4de5291c (origin/main, verified live 2026-09-16)
- Dependency evidence: M009/M019/M025/M003/M027 COMPLETE
- Allowed surface: docs/pilot, provider-onboarding-config, docs/evidence/M028
- Excluded: contacting clinics/providers, signing agreements on behalf of the founder, production data, production deployment, real PHI
- Language decision (A27): TypeScript by default. No Rust/Go extraction; no code in this task.
- Acceptance: (1) each enabled service has evidence and named owner; (2) staff can resolve unknown/request/cancel cases; (3) unsupported clinics use honest lower-capability mode
- Repository-owned prerequisites: readiness checklist template, synthetic rehearsal script, capability-mode definitions, onboarding completeness cross-reference
- External remainder: clinic recruitment (10-20), signed rights/agreements, named human owners, onsite/remote rehearsal with real staff — see BLOCKER.md
- Risk: high when affecting patient data or appointment authority
