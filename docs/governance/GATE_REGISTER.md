# M029 Launch Gate Register (M003) — machine-readable blocker list

Format: ID | gate | owner | status | unblocks.
The M029 gate passes ONLY when every LAUNCH-BLOCKING row is APPROVED.

- G01 | Hosting + region decision signed | TBD | PENDING | M029
- G02 | Counsel DPIA + retention signoff | TBD | PENDING | M029
- G03 | Clinical intended-use + delegate review | TBD | PENDING | M029
- G04 | Arabic legal/clinical language review | TBD | PENDING | M029
- G05 | Pilot provider agreement signed | TBD | PENDING | M029
- G06 | SMS/email sender DPA + channel approval | TBD | PENDING | M020-live, M029
- G07 | Production secrets/credentials boundary | TBD | PENDING | M029

Non-blocking for synthetic work: all repository-owned synthetic tasks proceed.
Evaluator: tests/m003/gate-check.test.mjs asserts every row is PENDING-or-APPROVED
with no other states, and that the gate function returns BLOCKED today.
