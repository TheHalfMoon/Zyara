# M005 Work Packet (immutable)

- Task: M005 — Deliver the five-locale accessible interface foundation
- Task contract: docs/research/muse-task-contracts.json (M005, deps [M001])
- Source refs: A21, WCAG. Requirements: R02, R06.
- Base SHA: fdf9c36340628edf9b5be40f460e81fc63ee23b3 (origin/main, verified live 2026-09-15)
- Dependency evidence: M001 COMPLETE (PR #4)
- Allowed surface: apps/web, packages/ui, packages/i18n, tests/accessibility,
  docs/evidence/M005
- Excluded: booking flows, search UI, clinical content, real translations vendor
- Acceptance: (1) Arabic RTL without mirrored meaning-changing icons;
  (2) keyboard/screenreader can complete a synthetic form;
  (3) five locales have catalog completeness + date examples
- Tests: RTL/manual-screenreader checklist; zoom/keyboard/bidi/missing-key checks
- Security/privacy: no patient data in snapshots; consent never preselected
- Observability: missing-key telemetry (console-free counter API); UI error counts
- Localization: ar/en/fr/de/es; Gregorian canonical + labeled Hijri display option
- Failure modes: long German labels, mixed Arabic numerals, ambiguous dates,
  modal focus loss
- Recovery: revert components; accessible list/text fallback
- Risk: medium
