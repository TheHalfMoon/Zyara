# M043 work packet — exact action confirmation across AI and UI

- Task: M043 (P08/S08A). Objective: high-impact actions execute only on
  exact user confirmation of the precise action.
- Base SHA: 1813731. Dependencies: M042, M017, M018 (all evidenced).
- Allowed paths: packages/action-confirmation, tests/m043,
  docs/evidence/M043.
- Exclusions: no voice confirmation (M045), no new booking authority.
- Requirements: confirmation challenge states exact action parameters
  (who/what/when); stale or mismatched confirmations rejected; drafts
  expire; double-submit via idempotency returns the original receipt;
  confirmation binds to one draft only; audit of challenge/answer/outcome.
- Test plan: exact-match accept, mismatch reject, expiry, double-submit,
  draft binding.
- Rollback: remove package/tests.
