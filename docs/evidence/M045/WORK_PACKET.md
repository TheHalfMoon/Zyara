# M045 work packet — correctable voice navigation and booking

- Task: M045 (P08/S08B). Objective: voice booking where transcription
  never silently becomes clinical truth.
- Base SHA: 1d8b78f. Dependencies: M044, M042, M043, M005 (all evidenced).
- Allowed paths: packages/voice-booking, tests/m045, docs/evidence/M045.
- Exclusions: no live microphone, no autonomous booking, no diagnosis.
- Requirements: transcript → structured draft requires explicit user
  correction loop; critical values (dates, names, doses) require separate
  confirmation; ambiguous speech fails safe to clarification; actions go
  through M043 exact confirmation; M041 intent gate on every turn.
- Test plan: correction loop, critical-value confirmation, ambiguity
  failsafe, confirmation binding.
- Rollback: remove package/tests.
