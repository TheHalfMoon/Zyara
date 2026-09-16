# M021 Evidence — Attendance evidence and review eligibility

- Task: M021
- Implementation PR: #43 (merge db6c2c33045965cfe0f897413e40b5c3da03d864)
- Base SHA: 8d0b6835f939313e02f354be99150f448a1c191d
- Work packet: docs/evidence/M021/WORK_PACKET.md
- Implementation: packages/trust/attendance/src/attendance.ts, db/migrations/021_attendance_evidence.sql
- Tests: tests/m021/attendance.test.ts — 7 passing (one-visit eligibility, reminder never grants, no-show/unknown ineligible, correction supersede with re-evaluation, patient appeal via independent reviewer with separation enforcement, cross-patient rejection, imported provenance, five locales non-accusatory)
- Typecheck: packages/trust/attendance clean
- Exact-head CI on PR #43: foundation SUCCESS plus neutral review skip, 0 failures
- Post-merge main: db6c2c33045965cfe0f897413e40b5c3da03d864
- Acceptance: (1) reminder delivery never grants eligibility proven; (2) provider no-show appeal path proven; (3) correction re-evaluates eligibility proven
- Security/privacy: evidence private by schema, reviewer separation enforced, synthetic data only
- Localization: ar, en, fr, de, es eligibility and appeal text verified
- Workspace note: added packages/trust/* to pnpm-workspace.yaml so the contract path packages/trust/attendance resolves; scope rationale recorded here
- Residual risks: RLS policies for evidence readers remain a later hardening item; duplicate-encounter matching across imports needs M022-adjacent review
- Verdict: M021 COMPLETE_CANONICAL
