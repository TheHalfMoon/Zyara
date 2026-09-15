# M004 Result

Status: COMPLETE (merged).

- Base SHA: db8506f5556c345c6581eaf428fea248d7d1e5fc
- Implementation head: 1bfeb7c
- Merge commit on main: 87e28937f21f707e118faa28e723a88dcde11545 (PR #9)
- CI: m004-ci green on head (typechecks + 8/8 matrix + PG16 outbox smoke).
- Branch: muse/M004-durable-events
- Acceptance 1 (tx domain+outbox commit): PASS — SQL smoke commits tenants+outbox
  in one transaction; MemoryOutbox models crash-before-commit as no-append
- Acceptance 2 (duplicate = one effect): PASS — inbox PK dedupe proven at SQL
  level (ON CONFLICT DO NOTHING, rowCount 0) and in dispatcher (effects == 1)
- Acceptance 3 (incompatible version quarantined): PASS — dispatcher quarantine
- RLS: outbox/inbox/audit_log FORCE RLS + tenant policies; cross-tenant leak
  check in smoke; local PG unavailable (M001 residual persists)
- Worker: scoped consumer registry + LISTEN-wakeup with cursor-poll fallback
- Residuals: pg-boss not vendored; wakeup is pg_notify + polling cursor with the
  same at-least-once + dedupe semantics. No patient text in envelopes (string-ID
  payloads enforced).
