# M024 Evidence — Minimized operational metric definitions

- Task: M024
- Implementation PR: #49 (merge 20db5e785112d6d303f4b7f74e5f02fd5888a8e7)
- Base SHA: 31e501a76b2caabc334c973f0ad9c17fb79926d3
- Work packet: docs/evidence/M024/WORK_PACKET.md
- Implementation: packages/analytics/src/metrics.ts
- Tests: tests/m024/metrics.test.ts — 6 passing (dictionary completeness, dedupe, unknown-excluded no-show, reschedule retained, null denominators, small plus complementary suppression)
- Typecheck: packages/analytics clean
- Exact-head CI on PR #49: 3 passed, 0 failed
- Post-merge main: 20db5e785112d6d303f4b7f74e5f02fd5888a8e7
- Acceptance: (1) grain/denominator/source/coverage proven; (2) unknown exclusion proven; (3) reschedule retention proven
- Residual risks: reporting thresholds need product confirmation; pipeline-lag measurement is later observability scope
- Verdict: M024 COMPLETE_CANONICAL
