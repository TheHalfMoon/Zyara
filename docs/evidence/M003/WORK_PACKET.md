# M003 Work Packet (immutable)

- Task: M003 — Complete the Saudi launch governance and data-flow package
- Task contract: docs/research/muse-task-contracts.json (M003, deps [M001])
- Source refs: A16, A22, A26, GOV. Requirements: R07, R14, R19.
- Base SHA: 55ec326ca07cfc0a84f3af92c0e211502c907654 (origin/main, verified live 2026-09-15)
- Dependency evidence: M001 COMPLETE (PR #4); M002 COMPLETE (PR #5, merge 6d92269)
- Allowed surface: docs/governance, docs/privacy, docs/safety, docs/vendor-register,
  tests/m003, docs/evidence/M003
- Excluded: product code, real-PHI processing, fabricated legal conclusions,
  regulator filings, production deployment
- Acceptance: (1) every dataset has purpose/owner/region/retention or blocker;
  (2) clinical navigation + delegate policies have named reviewers;
  (3) M029 gate mechanically distinguishes approved from pending
- Tests: document completeness/rights-workflow walkthrough; synthetic
  emergency/contact + incident tabletop
- Security/privacy: no fabricated approvals; minimize proposed processing
- Localization: five-locale notice inventory; Arabic legal/clinical review required
- Failure modes: unavailable counsel, unapproved hosting, SaMD mis-assumption,
  unclear guardian authority
- Recovery: all environments stay synthetic; gated features disabled until signoffs
- Risk: medium
