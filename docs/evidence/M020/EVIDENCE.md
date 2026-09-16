# M020 Evidence — Consent-aware email/SMS orchestration

- Task: M020
- Implementation PR: #41 (merge 439065f0bca1d8e05956ac1774998a674cf6c344)
- Base SHA: 2e09de09a0ff84e926355cd4b256e117be59f513
- Work packet: docs/evidence/M020/WORK_PACKET.md
- Implementation: packages/communication/src/orchestration.ts, packages/communication/src/templates.ts, apps/worker/src/comms-consumer.ts, apps/web/app/preferences/page.tsx
- Tests: tests/m020/comms.test.ts — 13 passing (send gate, cancellation race suppression, replacement suppression, stale version/time, consent revoked at send, unconsented fallback block, retry plus timeout-unknown plus callback replay, invalid destinations, patient-timezone quiet hours, appointment-state independence, generic five-locale previews, Arabic UCS-2 SMS segmentation, idempotency digest)
- Regression: tests/m019 9 passing; packages/communication and apps/worker typecheck clean
- Exact-head CI on PR #41: 5 passed, 0 failed
- Post-merge main: 439065f0bca1d8e05956ac1774998a674cf6c344
- Acceptance: (1) cancellation suppresses queued stale reminder proven; (2) delivery never mutates appointment truth proven; (3) unconsented fallback never sends proven
- Security/privacy: generic external previews, send-time consent, scoped links by design, synthetic data only, counts-only telemetry
- Localization: ar, en, fr, de, es templates verified; Arabic SMS segmentation verified
- Residual risks: real sender procurement remains an explicit live-gate external step; quiet-hour defaults require product confirmation before launch
- Verdict: M020 COMPLETE_CANONICAL
