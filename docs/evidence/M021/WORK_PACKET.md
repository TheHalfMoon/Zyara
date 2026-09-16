# M021 Work Packet (immutable)

- Task: M021 — Build attendance evidence and review eligibility
- Task contract: docs/research/muse-task-contracts.json (M021, deps [M019, M002])
- Base SHA: 8d0b6835f939313e02f354be99150f448a1c191d (origin/main, verified live 2026-09-16)
- Dependency evidence: M019 COMPLETE (PR #39/#40); M002 COMPLETE; M020 COMPLETE (PR #41/#42)
- Allowed surface: packages/trust/attendance, db/migrations, tests/m021, docs/evidence/M021
- Excluded: review content/moderation (M022), provider metrics (later), production deployment, real PHI
- Language decision (A27): TypeScript by default. No Rust/Go extraction.
- Acceptance: (1) reminder delivery never grants eligibility; (2) provider no-show can be appealed; (3) corrected attendance re-evaluates dependent review state
- Tests: completed/no-show correction and dispute cases; cross-patient evidence and duplicate eligibility
- Security/privacy: evidence private; trust reviewer separated from provider/sales authority; synthetic data only
- Localization: five-locale eligibility/appeal text, no accusatory no-show wording
- Observability: unknown attendance coverage, disputes, correction rate
- Failure modes: provider mislabels attendance, duplicate encounter, erroneous source mapping
- Recovery: suspend eligibility publication, preserve evidence and appeal access
- Risk: high when affecting patient data or appointment authority
