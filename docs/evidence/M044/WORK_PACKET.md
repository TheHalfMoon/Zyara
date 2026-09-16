# M044 work packet — evaluate private and approved-cloud ASR

- Task: M044 (P08/S08B). Objective: measured ASR evaluation over private
  and approved-cloud options with privacy grading.
- Base SHA: ffe550b. Dependencies: M041, M003, M001 (all evidenced).
- Allowed paths: packages/voice-eval, tests/m044, docs/evidence/M044.
- Exclusions: no live audio, no real voice data, no booking from voice
  (M045), no vendor procurement.
- Requirements: synthetic multilingual fixture corpus (5 locales incl. AR
  RTL); per-engine word-error measurement on fixtures; privacy grades
  (on-device/private vs approved-cloud with data-flow record); critical
  values flagged for M045 confirmation; no engine selected without both
  accuracy and privacy evidence.
- Test plan: scoring math, privacy grading, fixture coverage, gate logic.
- Rollback: remove package/tests.
