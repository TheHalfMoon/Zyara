# Runbook: freeze, restore, reconcile, reopen (M027)

English only. Synthetic drills only; no production patient data.

1. Freeze new writes. Enable the booking freeze flag and pause delivery
   channels. Reads, in-app updates, and manual contact continue.
2. Restore the known revision. Restore the encrypted backup into an
   isolated environment. Record restore start and finish times for RPO/RTO.
3. Reconcile durable state. Replay the outbox/inbox log with idempotency
   keys; duplicates replay, never duplicate. Verify no double bookings and
   no duplicate notifications.
4. Verify invariants. Run the reliability gate suite. Confirm reservation,
   booking, change, and attendance invariants hold.
5. Reopen. Lift the freeze only after reconciliation evidence is recorded.

## RPO/RTO budgets (pilot)

- RPO: 15 minutes of durable outbox log; RTO: 4 hours to isolated restore
  plus reconciliation. Measured restore drill timings are recorded in
  `docs/evidence/M027/EVIDENCE.md`. If a drill misses budget, record a
  launch blocker and keep live launch disabled.

## Arabic operations note

- أوضاع التدهور: تجميد الكتابة الجديدة مع استمرار القراءة والتواصل اليدوي.
