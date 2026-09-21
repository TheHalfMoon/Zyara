# N5/C3 Result — Approvals + Human Exception Queue

- Base SHA: `f05c3358bee8ef2133760d95562911183d7fdb0e` (fresh `origin/main`; the N5/C2
  post-merge closure, PR #106).
- Branch: `feat/zyara-network-n5c3-approvals-exceptions`.
- Implementation commit: `9aa2a8089f076dea6a3efffb709845087fac995f`.
- Evidence commit: `c2ec2e828f2966ece7e315e4056d80f0f7c4474e`.
- Pull request: `#107` (`feat(network): add N5/C3 approvals and the human exception queue`).
- Exact qualified head: `c2ec2e828f2966ece7e315e4056d80f0f7c4474e`.
- Merge SHA: `463cdc2827f9d232515cda3aed8ab00af786bdb4`.

## Post-merge verification

Fresh `origin/main` after the merge: `463cdc2827f9d232515cda3aed8ab00af786bdb4`.

Post-merge workflow conclusions observed live on that commit:

| Check | Conclusion | Run |
| --- | --- | --- |
| `foundation` (m001 CI) | pass | `35644354546` |
| `m002` | pass | `35644354620` |
| `m008` | pass | `35644355167` |
| `m016` (PostgreSQL service) | pass | `35644354567` |

The N5/C3, N5/C2, N5/C1, W1-W4 workflows are bound to their feature branches and to
pull-request paths, so they do not re-run on a main push by design; their exact-head runs are
recorded below.

Post-merge local re-verification on the merged tree (`463cdc2`):

- `tests/n5c3/approvals.test.ts` (20) + `tests/n5c2` (14) + `tests/n5c1` (13) +
  `tests/m020` (8) + `tests/m056` (21) — 76 pass, 0 fail;
- `node apps/api/scripts/n5c3-approvals-rls-smoke.mjs` against a **newly created**
  `zyara_postmerge_c3` database — PASS;
- `apps/api/scripts/n5c3-approvals-http-smoke.ts` — passed;
- `tsc` for `packages/collaboration` and `apps/api` — clean;
- `node scripts/check-boundaries.mjs` — passed.

Open pull requests after the merge: `#94` only (preserved, unabsorbed).

Live truth was reverified before starting: `origin/main` was `f05c3358…`, the only open pull
request was `#94` (`ui/zyara-v1-patient-experience`, preserved and intentionally separate),
all main CI was green, and the master plan still listed `C3 approval-exception-queue` as the
next dependency-authorized slice after C2.

## Behavior delivered

An approval is a scoped, expiring, digest-bound grant, not a boolean.

- **Closed protected-action registry.** Five protected actions, each with a risk class, a
  required authority, a self-approval rule, an evidence rule, a bounded TTL and an exact
  parameter key set. An unregistered action type is refused; the parameter key set is
  enforced as an exact set both in the domain layer and by a database `CHECK`.
- **The approval binds to one operation.** Tenant, branch, action type, a minted
  SHA-256 digest over the canonicalised protected parameters, requester, required authority,
  risk class, evidence requirement, creation time, expiry and correlation id. Parameter
  *values* are never stored: only the digest and the declared key names are retained.
- **Parameter substitution invalidates the approval.** Execution presents the digest it
  intends to use; a mismatch refuses execution and moves the request to `superseded`, so an
  approval can never be repointed at an operation the approver never saw.
- **Expiry is enforced, not decorative.** A decision after expiry is refused and the request
  becomes `expired`; execution at or after the expiry instant is refused (the instant itself
  is already expired). Expiry is swept by an explicit tenant-administrator action rather
  than as a read side effect, and the read surface reports a derived `effectiveStatus`.
- **Live authority is re-resolved.** The decision stores the authority snapshot resolved from
  the trusted server-side registry, and every attempt start re-resolves it, so a revoked,
  suspended, expired, cross-tenant or cross-branch authority invalidates an unused approval.
  A UI role label, a request body field or a query parameter can never supply approval
  authority.
- **Human-only decisions.** An agent actor is refused as a decider regardless of the
  requester; self-approval is refused for every protected class even when the requester holds
  the deciding role; and an agent requester must resolve to a live bounded C1 identity
  (unknown, revoked, suspended, expired, not-yet-effective or branch-mismatched identities
  cannot propose).
- **Explicit state machine.** `proposed → awaiting_approval → approved → executing →
  succeeded`, with `rejected`, `expired`, `cancelled`, `superseded`, `failed` and
  `needs_human`. Every change goes through one guarded transition helper against an
  enumerated edge table; terminal states are frozen; the same table is enforced in the
  database by a legality function plus triggers on both request updates and event inserts.
- **Idempotent retries reconcile.** Keys are scoped per tenant and per operation kind; an
  identical retry returns the original request, decision or execution, a divergent reuse is
  refused, and two interleaved identical submissions resolve to a single request.
- **Unknown stays unknown.** An unevidenced external outcome is recorded as `unknown` and
  moves the request to `needs_human`; a definitive outcome requires a receipt or evidence; an
  unsettled attempt cannot be relabelled, and a later human-resolution retry carries its own
  attempt ordinal so the earlier unknown is never rewritten.
- **The exception queue is owned work.** Fifteen closed exception kinds with a per-kind
  evidence requirement, severity-derived SLA hours, immutable case semantics
  (kind, severity, SLA, owning work item, subject reference) and lifecycle
  `open → assigned → in_review → resolved → closed` with `escalated` and `cancelled` edges.
  Every case links to the W3 work item that owns assignment, ownership, due date, escalation
  and follow-up: opening creates or validates it, assignment goes through the W3 store,
  review and resolution move it with the case, a resolved case requires the work item to be
  resolved before closure, and a case resolved as `unknown_outcome` can never be closed.
- **C3 truth is derived into C2 activity.** Approval and exception transitions project
  closed codes only (action type, risk class, required authority, resulting status, exception
  kind/severity/status): no parameter value, prose or receipt reference reaches the feed.
  `ActivityEvent != authoritative approval state` and `ActivityEvent != execution state`
  remain true, and there is no activity write route.
- **Forward-only registry extension.** C3 added two source domains, two categories, twelve
  approval actions, five exception actions, two subject types and eight payload keys to the
  closed C2 registries, preserving every previously permitted value and rewriting no row; the
  affected constraints are re-declared by name so the extension is deterministic.

## Files changed

26 files, +7845 / -6 between the base and the merge.

| Area | Change |
| --- | --- |
| `packages/collaboration/src/approvals.ts` | new; the C3 domain: registries, digest binding, actor and authority directories, guarded state machines, exception queue |
| `packages/collaboration/src/activity.ts` | forward-only registry extension for the C3 sources |
| `apps/api/src/approvals.ts` | new; scoped routes, trusted authority and agent directories, W3 wiring for the exception queue |
| `apps/api/src/activity.ts` | additive C3 projections |
| `apps/api/src/index.ts` | additive route registration |
| `db/migrations/044_approvals_exceptions.sql` | new; six tables, legality functions, guards, RLS, grants, registry extension |
| `apps/api/scripts/n5c3-approvals-rls-smoke.mjs` | new; real-PostgreSQL smoke |
| `apps/api/scripts/n5c3-approvals-http-smoke.ts` | new; authenticated Fastify `inject()` harness for C3 |
| `tests/n5c3/**` | new; 20 qualification cases |
| `tests/n5c2/activity.test.ts` | the three registry assertions updated to the extended live registry |
| `.github/workflows/n5c3-ci.yml` | new; the slice CI |
| `pnpm-lock.yaml` | additive importer for `tests/n5c3` |
| `docs/evidence/N5/C3/**` | this packet |

## Database migration

`db/migrations/044_approvals_exceptions.sql` is additive and forward-only: six new tables
(`approval_requests`, `approval_decisions`, `approval_executions`, `approval_events`,
`exception_cases`, `exception_events`), two legality functions, five guard triggers, RLS with
forced tenant policies on every table, and the re-declaration of the five affected
`activity_events` registry constraints with every previous value preserved. No existing
column, row, policy or grant was modified, and no row was rewritten. Rollback is the
commented footer plus reverting this branch; the smoke recreates its own tables from the
migrations so the run is repeatable.

Application-role privileges are deliberately narrow: `SELECT, INSERT` everywhere plus a
column-level `UPDATE` limited to `approval_requests(status, updated_at)` and
`exception_cases(status, resolution_code, closure_evidence_ref, closed_at, updated_at)`.

## Tests

Synthetic qualification on the repository toolchain (Node 24.19.0 in this environment; CI
pins Node 22.12.0):

- `tests/n5c3/approvals.test.ts` — 20 pass, 0 fail. Covers binding, the closed action and
  parameter registries, TTL bounds, the resolved authority snapshot, an unauthorised and a
  body-supplied approver, self-approval, agent deciders, agent requester eligibility, an
  untyped requester, cross-tenant and cross-branch refusal, parameter substitution,
  invalidation by revoked authority, expiry before and after a decision, the expiry instant
  itself, the expiry sweep, the full execution state machine, terminal-state freezing,
  unknown outcomes, divergence refusal, idempotent and interleaved duplicate submissions,
  privacy of stored records, the owned exception case, evidence-gated closure, unknown
  resolution closure refusal, the exception transition table and queue tenant isolation.
- Regression: `tests/n5c2` (14), `tests/n5c1` (13), `tests/m020` (21 in the slice CI; the
  WhatsApp suite is 8 plus the comms suite), `tests/m056` (25) — all pass.
- `tsc -p packages/collaboration/tsconfig.json --noEmit` — clean;
  `tsc -p apps/api/tsconfig.json --noEmit` — clean.
- `eslint packages/collaboration/src`, `eslint apps/api/src`, `eslint tests/n5c3`,
  `eslint apps/api/scripts/n5c3-approvals-http-smoke.ts` — clean.
- `node scripts/check-boundaries.mjs` — passed.

This environment's `pnpm` is a runtime shim (against a lockfile pinned to 9.12.0), so the
equivalent package scripts were executed directly against the workspace toolchain; CI runs
the real `pnpm` 9.12.0 path.

## Real PostgreSQL smoke

PostgreSQL 16 (local Docker) and the CI `postgres:16` service, `DATABASE_URL` set. The
application-role section runs under `SET ROLE zyara_app`, not only as the owner.

`node apps/api/scripts/n5c3-approvals-rls-smoke.mjs`:

> N5/C3 approvals DB smoke PASS: tenant isolation, closed protected-action and exception
> registries, digest-only parameter binding, human-only evidenced decisions, append-only
> decision/execution trails, transition and immutability guards, exception ownership and
> closure rules, and the forward-only C2 registry extension verified

The smoke proves, against a live database: RLS refuses a cross-tenant request, decision or
case insert; every closed registry refuses an unknown value (action type, risk class,
required authority, status, exception kind, severity, resolution, payload vocabulary); an
approval cannot be stored with self-approval permitted; a raw string cannot masquerade as a
minted digest; a parameter key set that does not match its action is refused; an agent
requester without a real bounded identity is refused (23503) and with one is accepted; an
agent decision is impossible to persist; a decision without required evidence, a decision on
a request that is not awaiting approval and a second decision for one request are all
refused; a definitive execution outcome without a receipt or evidence is refused, while an
unknown outcome is allowed; an illegal approval transition is refused both as an event and as
a status update, and a protected column (digest, expiry) cannot be changed even by the table
owner; an exception case cannot be closed from `open`, cannot be closed without required
evidence, cannot be closed while its resolution is unknown, and cannot have its kind or
owning work item rewritten; the application role's `UPDATE` privileges are exactly the
lifecycle columns listed above; decisions, executions and both event trails are
`SELECT`/`INSERT` only; decisions/executions cannot be updated or deleted; no secret-bearing
column exists; no stored row contains prose; and the extended C2 activity registries accept
the C3 sources, categories, actions and payload vocabularies while still refusing a clinical
source domain and an unknown exception kind or approval status.

Smoke isolation was verified rather than assumed. Each database smoke was run in its own
freshly created database and all four passed: `n5c2-activity` (fresh), `n5c1-agent` (fresh),
`w3-task` (fresh), `w4-whatsapp` (fresh), and the C3 smoke in `zyara_n5c3` and again in
`zyara_postmerge_c3` after the merge. C3 owns only its own tables and its own synthetic rows,
so it adds no interference class to the shared-smoke artefact recorded in the N5/C1 and
N5/C2 packets.

## HTTP route harness

`apps/api/scripts/n5c3-approvals-http-smoke.ts` reuses the reusable harness introduced by
N5/C2 (`buildServer()` plus Fastify `inject()`, real synthetic OIDC bearer tokens and
server-side memberships) and extends it to W3-owned exception work:

> N5/C3 approvals HTTP smoke passed.

It proves over HTTP: no C3 read or write without a verified session (401) and none at AAL1
(403); a body-supplied requester or authority is refused (403
`APPROVAL_REQUESTER_NOT_AUTHORIZED`); a body-supplied approver or authority is refused (403
`APPROVAL_APPROVER_NOT_AUTHORIZED`); a protected action that requires evidence cannot be
decided without it; a receptionist cannot decide, a clinician cannot satisfy a branch-admin
requirement, and a requester holding the deciding role still cannot self-approve; a
cross-branch operator cannot read another branch's request, a branch operator cannot list
tenant-wide, and a foreign tenant sees an empty list plus a 404 by direct id; a retry with
the same idempotency key reconciles the original request; execution with a wrong digest is
refused and supersedes the approval; a definitive outcome without a receipt or evidence is
refused; an expired approval refuses execution and reads as `expired`; the expiry sweep is
administrator-only; an unknown execution outcome moves the request to `needs_human`; a
client-declared automation origin without a C3-driven reason is refused, while a case linked
to a request the server placed in `needs_human` inherits the correlation id and is queued as
an automation-originated W3 work item with the SLA due time; assignment goes through W3 and
the transition route refuses to fake it; review and resolution move the work item with the
case; closure without required evidence is refused; a case resolved as `unknown_outcome`
cannot be closed; the queue is branch-scoped with a foreign tenant receiving 404; approval
and exception transitions appear in the derived activity feed with derived titles and closed
codes only; and `activityProjectionFailures` is empty.

No native HTTP expiry wait is used: the expiry case is exercised by proposing through the
route with the smallest allowed TTL, approving it, and moving the stored expiry into the past
so the route's own expiry rule is what refuses execution. That technique is recorded here so
it is not mistaken for a real clock.

## Exact-head CI

Head `c2ec2e828f2966ece7e315e4056d80f0f7c4474e`, observed live:

| Check | Conclusion | Run |
| --- | --- | --- |
| `approvals-exceptions` (N5/C3 CI, includes the PostgreSQL smoke and the HTTP smoke) | pass | `35643776089` (pull request), `35643739673` (push) |
| `derived-activity` (N5/C2 CI) | pass | `35643775996` |
| `agent-identities` (N5/C1 CI) | pass | `35643776153` |
| `workforce` (W1 CI) | pass | `35643776156` |
| `coverage` (W2 CI) | pass | `35643776104` |
| `helpdesk` (W3 CI) | pass | `35643776114` |
| `whatsapp` (W4 CI) | pass | `35643776017` |
| `foundation` (m001 CI) | pass | `35643776035`, `35643739543` |
| `m002` | pass | `35643776091` |
| `m008` | pass | `35643776271` |
| `m016` (booking smoke, PostgreSQL service) | pass | `35643776178` |
| `CodeRabbit` | pass (review skipped: manual review required for this OSS repository) | n/a |
| `cubic · AI code reviewer` | neutral (no verdict) | n/a |

## Review evidence actually produced

- **Jev (TypeSafe, CLI 0.3.2, model `jev-1.13.0`): executed.** Three design rounds and eight
  scoped exact-diff windows plus two test-coverage reviews, with the exact specs preserved in
  `jev/`. The window map, verdicts and their limits are in `JEV_REVIEW.md`.
- **Findings verified, not accepted blindly.** The repeated `authority: no` verdicts were
  traced to review windows that contained either the decision-time or the execution-time
  authority check but not both; re-running with the whole mechanism in one window returned
  `yes 0.85`. The same holds for the `agent`, `exception` and `state` verdicts. This is
  recorded as a false-positive class rather than as a weakness.
- **Findings fixed.** One real scope widening (a branch-scoped operator could record the
  execution of a tenant-wide protected action) was found from the review's weakest-area
  signal, verified against the code and fixed by requiring a tenant-level role set. One
  divergent-projection defect was caught by the HTTP smoke (a mutable W3 work-item status in
  a derived payload made a re-projection a conflict) and fixed by projecting only
  event-owned, immutable properties. Two test gaps (`concurrency`, `clock_boundaries`) were
  closed; after the expiry-over-HTTP case was added, the review's `expiry_http` pick fell
  from 0.52 to 0.02.
- **Deferred / disclosed findings.** Agent requester attribution remains the top residual
  vector (`0.54`): there is still no verified agent credential path. Approval and exception
  metadata is visible to branch operations readers as `operational` activity, including
  `critical`-risk actions, because `restricted` sensitivity is reserved for clinical content
  and no compliance-sensitivity class exists yet. The `needs_human` retry window, the
  historical decision row that survives a later revocation, and the fact that no single Jev
  run saw the whole head are all recorded in `JEV_REVIEW.md`.
- **alibaba/open-code-review: not executed.** No npm, npx, `ocr` binary, Python package or
  `%ProgramFiles%\nodejs` exists in this environment, so the tool could neither be installed
  nor invoked. See `OCR_REVIEW.md`. No OCR verdict is claimed.

## Negative evidence and residual limits

- **No agent credential verification path exists.** There is still no service token, mTLS,
  SPIFFE/SPIRE or workload identity, so no route lets an agent authenticate and no
  agent-originated HTTP write is enabled. Agent requesters are exercised through the trusted
  server-side call path.
- **C3 does not implement the protected operations.** It records the governed authorization
  and the execution receipt; the typed operation owns the canonical outcome, and the receipt
  is a reference the typed operation must produce.
- **Compliance authority mapping is synthetic.** In this build `compliance_officer` is
  satisfied by a tenant-wide organisation administrator membership; a real deployment must
  bind that authority to a designated compliance officer.
- **Synthetic and local-database qualification only.** No real clinic, provider, patient,
  payer or PHI data; no production identity provider, secret manager, queue or broker.
- **The stores are in-process.** W3, C1, C2 and C3 use in-memory stores in this build, so the
  projection path was not exercised against a durable event outbox. The database contract,
  RLS, guards and grants are proven against real PostgreSQL.
- **No cryptographic immutability claim.** Append-only is enforced by privileges, guards and
  forced RLS, which is not the same as tamper-evidence; C4 owns that question.
- **No search.** Approvals and exception cases are not indexed.
- **Clinical content is not representable.** C3 stores governance metadata only; no clinical
  domain, parameter value, evidence document or narrative can be persisted.
- **No C4.** Audit-chain qualification remains unbuilt; C3 is a prerequisite for it, not a
  substitute.
- **No production readiness, security qualification, clinical authority or external
  validation is claimed.**

## Completion semantics

`REPOSITORY_IMPLEMENTATION_COMPLETE` for this bounded slice: yes — merged into `main` as
`463cdc2827f9d232515cda3aed8ab00af786bdb4` from qualified head `c2ec2e8…`.
`SYNTHETIC_QUALIFICATION_COMPLETE`: yes for this slice.
`REAL_CLINIC_VALIDATION_COMPLETE`, `REAL_PROVIDER_VALIDATION_COMPLETE`,
`REAL_NPHIES_VALIDATION_COMPLETE`, `REAL_TELEHEALTH_VALIDATION_COMPLETE`,
`COMMERCIAL_VALIDATION_COMPLETE`, `PRODUCTION_SECURITY_REVIEW_COMPLETE`,
`PRODUCTION_AUTHORIZED` and `ZYARA_PROJECT_COMPLETE`: not claimed.

## Next authorized task

`N5/C4 — audit-chain qualification`, which must qualify whether important actions across W1,
W2, W3, W4, C1, C2 and C3 can be reconstructed reliably, identify genuine gaps in the
earlier slices and fix them forward-only.

## Rollback

Additive only. Revert this branch's commits and run the documented footer in
`db/migrations/044_approvals_exceptions.sql`. The C2 registry extension is reverted by
re-applying the 043 constraint definitions, which this migration preserves. No data
migration or backfill is involved.
