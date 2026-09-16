# M040 work packet — reconciliation, adapter rollout and integration ops

- Task: M040 (P07/S07B). Objective: certify reconciliation, adapter
  rollout and integration operations.
- Base SHA: 79f01d8. Dependencies: M037, M038, M039, M027 (all evidenced).
- Allowed paths: packages/integration-ops, tests/m040,
  docs/adapter-certification (append rollout log), docs/evidence/M040.
- Exclusions: no production rollout, no live vendor traffic.
- Requirements: rollout is staged (synthetic → certified → pilot-blocked)
  with per-capability gates; reconciliation sweeps UNKNOWN ops and
  re-keys external ids; rollout log records adapter, capabilities,
  evidence and production-blocked status; production rollout stays
  explicitly unauthorized without M028-M030 real evidence.
- Test plan: staged gating, UNKNOWN sweep, re-key, production-block.
- Rollback: remove package/tests.
