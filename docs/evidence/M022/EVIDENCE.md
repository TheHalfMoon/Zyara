# M022 Evidence — Verified experience reviews and replies

- Task: M022
- Implementation PR: #45 (merge 806e1f0bf688574f3cc78834953c31ca1a894e74)
- Base SHA: e70d36fce1fcf0617571623e99fc109862f6971e
- Work packet: docs/evidence/M022/WORK_PACKET.md
- Implementation: packages/trust/reviews/src/reviews.ts, apps/web/app/reviews/page.tsx
- Tests: tests/m022/reviews.test.ts — 7 passing (negative review protected from provider removal, anonymous projection, reply screening, duplicate replay, eligibility plus edit history, low-count aggregate guard, five locales)
- Typecheck: packages/trust/reviews clean
- Exact-head CI on PR #45: 3 passed, 0 failed
- Post-merge main: 806e1f0bf688574f3cc78834953c31ca1a894e74
- Acceptance: (1) negative compliant review irremovable by provider proven; (2) anonymous display proven; (3) reply screening proven
- Security/privacy: redacted public text, minimal audit, no clinical-outcome score, synthetic data only
- Residual risks: fraud/ranking governance is M023 scope; low-count threshold needs product confirmation before launch
- Verdict: M022 COMPLETE_CANONICAL
