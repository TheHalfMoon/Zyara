# W3 Result — Clinic Helpdesk / Internal Task Queue

- Base SHA: `a7ef63d7c00151c6977437760d911533255f5e6d` (fresh `origin/main` after W1 `33d837f7` and W2 `a7ef63d7`).
- Branch: `feat/zyara-network-w3-helpdesk-tasks`.
- Implementation commit: `213abcf102819fd57ef13f38c8396ed988fdd7e8`.
- Pull request: number and exact-head CI run identifiers are recorded in this file
  only once they exist and have been observed; they are deliberately not predicted.

## Behavior delivered

- `OpsTaskStore` with an explicit lifecycle
  (`open -> in_progress|blocked|cancelled`, `in_progress -> blocked|resolved|cancelled`,
  `blocked -> in_progress|cancelled`, `resolved -> open` only with a recorded reason);
- closure requires recorded outcome evidence; cancelled work is frozen and resolved
  work accepts no assignment or comments;
- automation may raise and comment on work but can never resolve or cancel it;
- assignment is restricted to an active staff assignment in the same tenant and branch
  that belongs to the named account and is effective at the operation time;
- creation is idempotent per `(tenant, idempotencyKey)`; a replay returns the original
  record even after the assignment has expired, while divergent reuse conflicts;
- append-only comment and lifecycle-event trail with server-generated event ids;
- `subjectType` / `subjectRef` stay opaque pointers: the task never writes to, and never
  becomes, another domain's state;
- scoped Fastify routes deriving tenant from verified claims with AAL2, deny-by-default
  membership, and refusal of client-declared automation origin;
- additive migration with tenant RLS, `FORCE ROW LEVEL SECURITY`, separate select,
  insert and update policies carrying `WITH CHECK`, and `SELECT, INSERT`-only grants for
  the trail tables.

## Evidence

Local qualification on `213abcf1` (repository `pnpm` 9.12.0 toolchain, Node 22):

- `pnpm --filter @zyara/enterprise-access typecheck` — clean;
- `pnpm --filter @zyara/api typecheck` — clean;
- `pnpm --filter @zyara/m056-tests test` — 25 pass, 0 fail;
- `pnpm --filter @zyara/enterprise-access lint` — clean;
- `pnpm --filter @zyara/api lint` — clean;
- `pnpm --filter @zyara/m056-tests lint` — clean;
- `node scripts/check-boundaries.mjs` — passed.

Real database qualification (PostgreSQL 16 container, `DATABASE_URL` set, run as the
non-superuser `zyara_app` role):

- `node apps/api/scripts/w3-task-rls-smoke.mjs` —
  `W3 task RLS smoke PASS: tenant isolation, branch integrity, closure evidence and append-only trail verified`.
  The smoke proves, against a live database: cross-tenant insert refused by the RLS
  `WITH CHECK` (SQLSTATE 42501); assignee from another branch refused by the composite
  foreign key (23503); unknown branch refused (23503); duplicate idempotency key refused
  (23505); resolving without recorded evidence refused by the schema (23514); tenant read
  isolation (0 rows visible to another tenant); tenant write isolation (0 rows updated);
  `UPDATE`/`DELETE` on comments and `UPDATE` on events denied (42501); closure with a
  resolution note accepted.

Review:

- Jev design challenge and two diff reviews executed against the live TypeSafe endpoint
  (see `PROVENANCE.md`); confirmed findings resolved forward;
- `alibaba/open-code-review` delegation-mode review executed at revision
  `01cf7ff8b94c5087205eaf47a6e67f94dabb2a32` (CLI `v1.12.8`); four findings fixed, four
  deferred with rationale, dismissed items recorded (see `OCR_REVIEW.md`).

CI: pending at the time this file was written; the exact workflow conclusions are
appended after the pull request runs complete.

## Review outcomes on the exact head

Jev (TypeSafe, `jev-1.13.0`) over the corrected diff:

| Question | First pass | Final pass |
| --- | --- | --- |
| authority leak | no 0.03 | no 0.02 |
| tenant/branch isolation defect | no 0.23 | no 0.14 |
| assignee eligibility defect | no 0.08 | no 0.10 |
| lifecycle defect | no 0.05 | no 0.03 |
| security defect | no 0.28 | no 0.15 |
| correctness defect | yes 0.62 | no 0.41 |
| scope creep | no 0.03 | no 0.03 |
| test adequacy | yes 0.91 | yes 0.52 |

Targeted probes: idempotency-fingerprint gap 0.38 -> 0.27; guard-order defect
0.57 -> 0.43; schema/domain mismatch 0.46 -> 0.37; route authority 0.33 -> 0.27;
data retention 0.11 -> 0.10; unproven evidence claim 0.91 -> 0.85.

The remaining `test adequacy` flag was verified rather than accepted: every named
failure mode (automation closing human work, cross-tenant access, ineligible
assignee, incorrect lifecycle handling, non-idempotent creation, database isolation)
has a concrete test or a live database assertion. The residual, explicitly recorded
gap is that no HTTP-level route test harness exists in this repository.

## Negative evidence and residual limits

- synthetic and local-database qualification only: no real clinic, provider, patient or
  PHI data, and no production membership or identity provider;
- no HTTP-level route test harness exists in this repository, so the route contract is
  guarded by source-level assertions plus the database smoke, not by an end-to-end
  request test;
- no independent second-model review: OCR ran in delegation mode because no
  OpenAI/Anthropic-compatible credential exists in this environment;
- automation-originated work is refused at the API boundary until a verified service
  identity (agent identities, later slice) exists; the automation path is exercised only
  at the domain layer;
- SLA/escalation behaviour, notification channels, reporting and analytics are
  deliberately out of scope.

## Rollback

Additive only: no existing table, column, route or package export was changed except two
additive imports and one additive membership accessor. Rollback is the documented
`DROP TABLE IF EXISTS ops_task_events, ops_task_comments, ops_tasks;` footer in
`db/migrations/040_ops_tasks.sql`, and reverting this branch's commits. No data migration
or backfill is involved.
