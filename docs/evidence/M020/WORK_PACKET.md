# M020 Work Packet (immutable)

- Task: M020 — Implement consent-aware email/SMS orchestration
- Task contract: docs/research/muse-task-contracts.json (M020, deps [M004, M016, M018, M003, M005])
- Base SHA: 2e09de09a0ff84e926355cd4b256e117be59f513 (origin/main, verified live 2026-09-16)
- Dependency evidence: M004/M016/M018/M003/M005 COMPLETE; M019 COMPLETE (PR #39/#40)
- Allowed surface: packages/communication, apps/worker, apps/web/preferences, tests/m020, docs/evidence/M020
- Excluded: real sender procurement for live gate (fake providers in build), production deployment, real PHI
- Language decision (A27): TypeScript by default. No Rust/Go extraction.
- Acceptance: (1) cancellation suppresses queued stale reminder; (2) delivery never changes booked state; (3) unconsented fallback channel never sends
- Tests: retry/callback replay, invalid destination, quiet hours, consent revoked at send, shared-phone preview, late cancellation race
- Security/privacy: generic previews, scoped secure links, no specialty or dependent names in external preview, synthetic data only
- Localization: five-locale templates, patient timezone, Arabic SMS length handling
- Observability: delivery/suppression/failure metrics by template and channel, no message bodies
- Failure modes: SMS provider down, duplicate callback, wrong number, in-flight obsolete message
- Recovery: pause channel sending; retain in-app updates and authorized manual contact
- Risk: high when affecting patient data or appointment authority
