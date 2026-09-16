# M025 Evidence — Provider monthly reports and B2B entitlements

- Task: M025
- Implementation PR: #51 (merge 293ad041469ae038f5620611ce4b7f9e852438fa)
- Base SHA: 6e0074e61c77b6fa620098a793c649d61627d33d
- Work packet: docs/evidence/M025/WORK_PACKET.md
- Implementation: packages/commerce/src/reports.ts, apps/web/app/provider-reports/page.tsx
- Tests: tests/m025/reports.test.ts — 5 passing (reconciliation, entitlement separation, lapse continuity, manual invoices, five locales plus SAR)
- Typecheck: packages/commerce clean
- Exact-head CI on PR #51: 3 passed, 0 failed
- Post-merge main: 293ad041469ae038f5620611ce4b7f9e852438fa
- Acceptance: (1) reconciliation proven; (2) rank/review separation proven; (3) lapse continuity proven
- Residual risks: invoice amounts are synthetic; payment automation explicitly out of scope
- Verdict: M025 COMPLETE_CANONICAL
