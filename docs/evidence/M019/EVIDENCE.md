# M019 Evidence — Provider calendar and attendance operations

- Task: M019
- Implementation PR: #39 (merge b50e72d8443516d3f2068ccd67bf4c34f52764cb)
- Base SHA: 3db40767b1619801bf0ffc791efdc81e1f3eb94f
- Work packet: docs/evidence/M019/WORK_PACKET.md
- Implementation: packages/scheduling/src/calendar.ts, apps/web/app/provider-calendar/page.tsx
- Tests: tests/m019/calendar.test.ts — 9 passing (role matrix, branch scope, privacy masking, filters, drag/drop confirmation plus stale rejection, bulk preview with partial failure, check-in plus request decision, five locales, counts-only telemetry)
- Typecheck: packages/scheduling clean
- Exact-head CI on PR #39: 8 passed, 0 failed
- Post-merge main: b50e72d8443516d3f2068ccd67bf4c34f52764cb
- Security/privacy: reception restricted to operational fields, server-side projection enforces tenant plus branch scope, privacy mode masks patient name, no clinical fields, synthetic data only
- Localization: ar, en, fr, de, es status labels verified
- Residual risks: calendar writes depend on downstream M016/M018 routing at API layer; bulk commit adapter errors surface as per-appointment failed outcomes
- Verdict: M019 COMPLETE_CANONICAL
