# N5/C3 design state (revision 1) — approvals + human exception queue

## Purpose

C3 is the governed bridge between AI / automation / external events and human-authorized
operational actions. It replaces any notion of a generic `approve = true` table with
action-specific, authority-specific, scoped, expiring, digest-bound approval.

## Model

`ApprovalRequest` (the Zyara realization of `ProposedAction`):

- `id`, `tenantId`, `branchId` (null = tenant-wide)
- `actionType` — closed protected-action registry
- `parametersDigest` — SHA-256 over canonicalised protected parameters; **values are never
  stored**, only the digest plus the sorted allow-listed key names
- `parameterKeys` — closed per-action allow-list
- `riskClass`, `requiredAuthority` — derived from the registry, never from the body
- `requester` — explicit actor: human account, bounded C1 agent identity, or system
- `evidenceRequired` — derived from the registry
- `status`, `createdAt`, `expiresAt`, `correlationId`, `idempotencyKey`

`ApprovalDecision` (append-only): request id, decision (`approved` / `rejected`),
approver kind (`human` only), approver account id, resolved authority snapshot
(`authority`, `branchId`, `sourceRef`, `resolvedAt`), evidence reference, reason code,
correlation id, decided at.

`ApprovalExecution` (append-only): request id, attempt ordinal, outcome (`attempted`,
`succeeded`, `failed`, `unknown`, `refused`), receipt reference, evidence reference,
presented parameters digest, correlation id, occurred at.

`ExceptionCase`: closed kind, severity, branch, pseudonymous subject reference,
`workItemTaskId` (the W3 task that owns assignment, due date, ownership, escalation and
follow-up), `evidenceRequired`, SLA due time, status, resolution code, closure evidence
reference, correlation id, timestamps.

Closed registries: protected action types (each with risk class, required authority,
self-approval rule, evidence rule and bounded TTL), approver authorities, execution
outcomes, exception kinds, exception severities (with SLA hours), exception statuses,
exception resolution codes.

## Invariants

1. An approval binds to exactly one operation: tenant, branch, action type, parameters
   digest, requester, required authority, risk class, evidence, creation time, expiry,
   correlation id.
2. Execution presents the digest it intends to use. A mismatch refuses execution and moves
   the request to `superseded`; the approval cannot be repointed at another action.
3. An expired approval cannot authorize execution.
4. Approver authority is resolved from the trusted server-side directory at decision time
   and re-resolved at execution time. Revoked, suspended, expired, cross-tenant or
   cross-branch authority invalidates an unused approval.
5. Self-approval is forbidden for protected classes; an agent actor can never decide; an
   agent actor cannot sponsor approval authority.
6. An agent requester must resolve to a live bounded C1 identity for the proposed action;
   unknown, revoked, suspended, expired or branch-mismatched identities cannot propose.
7. Explicit state machine, legal-transition table, refused illegal jumps, frozen terminal
   states; retries with the same idempotency key reconcile the original record and
   divergent reuse is refused.
8. Unknown external outcome stays `unknown` and moves the request to `needs_human`; a later
   definitive outcome for the same attempt requires evidence; a case resolved as
   `unknown_outcome` cannot be closed.
9. Closure of a case whose kind requires evidence requires an evidence reference.
10. Every case is linked to a W3 work item; C3 adds approval/exception semantics and does
    not reimplement task ownership, assignment, due date or escalation.
11. C2 activity is derived from C3 truth: `ActivityEvent != authoritative approval state`
    and `ActivityEvent != execution state`. There is no write path from activity back into
    C3 state.
12. No prose, no PHI and no credentials: parameter values are digested, evidence and
    receipts are opaque bounded reference tokens, and credential-shaped material is
    refused in every field.
13. Tenant and branch isolation is enforced in the domain layer, at the API boundary from
    verified claims only, and by row-level security with the application role.

## State machine

```text
proposed            -> awaiting_approval, cancelled
awaiting_approval   -> approved, rejected, expired, cancelled, superseded, needs_human
approved            -> executing, expired, cancelled, superseded
executing           -> succeeded, failed, needs_human
needs_human         -> cancelled, superseded
terminal            : rejected, expired, cancelled, superseded, succeeded, failed
```

## Exception lifecycle

```text
open -> assigned -> in_review -> resolved -> closed
open | assigned | in_review -> escalated
open | assigned | in_review -> cancelled
escalated -> in_review | resolved | cancelled
```

## Integration

- **C1**: agent requesters resolve to bounded `AgentIdentity` state; agents can propose
  and be attributed, and can never approve.
- **C2**: proposal created, approval requested, approved, rejected, expired, exception
  opened, exception assigned, execution attempted, execution succeeded/failed and
  exception resolved/closed are projected as derived activity rows (closed registries,
  no prose, opaque references).
- **W3**: every exception case references a W3 ops task; assignment, due date, owner,
  escalation and follow-up stay W3 operations, and the queue read surface reports the
  W3-owned work state alongside the C3 exception semantics.

## Database posture

- `approval_requests`: the application role may `SELECT`, `INSERT`, and `UPDATE` only the
  `status` / `updated_at` columns, so protected parameters, action type, tenant, branch and
  expiry are immutable once written; a trigger refuses illegal status transitions.
- `approval_decisions`, `approval_executions`: `SELECT`, `INSERT` only (append-only).
- `exception_cases`: `SELECT`, `INSERT`, and `UPDATE` of the lifecycle columns only, with a
  transition trigger and a closure rule that requires evidence when evidence is required.
- Row-level security is forced on every C3 table with a tenant policy for read and write.

## Known limits (declared before implementation)

- there is still no verified agent credential path, so no agent-originated HTTP write is
  enabled; agent requesters are exercised through the trusted server-side call path;
- C3 does not implement the protected operation itself: it records the governed
  authorization and the execution receipt, and states that the typed operation owns the
  canonical outcome;
- no cryptographic immutability is claimed (C4 owns that question);
- synthetic and local-database qualification only; no real clinic, provider, payer or
  patient data.
