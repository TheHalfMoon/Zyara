# N5/C3 design state (revision 2) — approvals + human exception queue

Revision 2 keeps every property of revision 1 and responds to the two weakest verdicts of
round 1 (`audit_completeness` yes 0.61, `tenant_branch_isolation` yes 0.80, weakest control
`agent` at confidence 0.38) with explicit, checkable detail rather than new promises.

## Model (unchanged, restated precisely)

- `ApprovalRequest`: `id`, `tenantId`, `branchId`, `actionType` (closed registry),
  `parametersDigest` (SHA-256 over canonicalised protected parameters), `parameterKeys`
  (closed per-action allow-list; values are never stored), `riskClass`,
  `requiredAuthority`, `requester` (human account | bounded C1 agent identity | system),
  `evidenceRequired`, `status`, `createdAt`, `expiresAt`, `correlationId`, `idempotencyKey`.
- `ApprovalDecision` (append-only): decision, approver kind (`human` only), approver account,
  resolved authority snapshot (`authority`, `branchId`, `sourceRef`, `resolvedAt`),
  evidence reference, reason code, correlation id, decided at.
- `ApprovalExecution` (append-only): attempt ordinal, outcome (`attempted`, `succeeded`,
  `failed`, `unknown`, `refused`), receipt reference, evidence reference, presented
  parameters digest, correlation id, occurred at.
- `ExceptionCase`: closed kind, severity with SLA hours, branch, pseudonymous subject
  reference, `workItemTaskId` (W3 task), `evidenceRequired`, SLA due time, status,
  resolution code, closure evidence reference, correlation id, timestamps.

## Reconstruction of the audit chain (explicit)

For any protected action the C3 trail answers each question of the audit chain with a named
row and field, all correlated by the same `correlationId`:

| Chain question | Answering record |
| --- | --- |
| who or what initiated the request | `ApprovalRequest.requester` (typed actor, never free text) |
| under which identity | requester account id, or the C1 agent identity id the request resolved |
| under which tenant / branch | `ApprovalRequest.tenantId` / `branchId` (immutable after insert) |
| which authority / capability applied | `requiredAuthority` plus the decision's resolved authority snapshot |
| what policy decision occurred | `ApprovalRequest.riskClass` + `evidenceRequired` + `expiresAt` from the closed registry |
| was human approval required | registry rule + `status` transition history (`proposed`, `awaiting_approval`) |
| who approved or rejected | `ApprovalDecision.approverAccountId` with its authority snapshot |
| what typed action executed | `ApprovalRequest.actionType` + the presented `parametersDigest` on the execution row |
| what external action occurred | `ApprovalExecution.receiptRef` (opaque provider receipt reference) |
| what receipt or result returned | `ApprovalExecution.outcome` + `evidenceRef` |
| what canonical state changed | the typed operation's own canonical outcome, referenced by the execution receipt |
| what derived activity was emitted | the C2 projection row keyed by source domain, source event id and correlation id |
| what failure, retry or reconciliation happened | `ApprovalExecution` attempt ordinals, outcome history, and the `ExceptionCase` that owns unresolved work |

Status history is an ordered, append-only event trail (one event per transition, with actor,
reason code and timestamp), so the chain is reconstructed from records rather than from a
mutable column that could have been overwritten.

## Agent boundary (explicit refusal set)

- A decision requires `actor.kind === "human"`. An agent actor is refused with
  `APPROVAL_AGENT_APPROVER_FORBIDDEN` regardless of the proposal's requester.
- A human approver whose account id equals the requester account id is refused with
  `APPROVAL_SELF_APPROVAL_FORBIDDEN` for every protected action class.
- An agent requester is refused when the bounded C1 identity is unknown, revoked,
  suspended, expired, not yet effective, branch-mismatched or has lost its sponsor
  (`APPROVAL_REQUESTER_AGENT_INELIGIBLE`).
- Approval authority is never taken from a role label, a request body or a query string: it
  comes from the trusted server-side authority directory, and the resolved snapshot is
  stored with the decision.
- Two agents can never satisfy each other: agent A proposing and agent B deciding is
  refused by the first rule, and no code path substitutes an agent for a missing human.
- The decision row stores approver kind explicitly, so a later reader cannot reinterpret an
  agent-authored decision as human.

## Privacy controls (explicit)

- Parameter **values** are never persisted: only a SHA-256 digest and the sorted,
  allow-listed key names. A value that carries credential-shaped material is refused before
  digesting.
- Evidence and receipt fields are opaque bounded reference tokens (`^[A-Za-z0-9_.:-]{1,128}$`)
  that refuse whitespace, `@`, `+`, long digit runs, `secret://`, bearer tokens, API keys and
  password material; an evidence reference is a pointer, never a document.
- No free-text field exists anywhere in C3 state: reason, resolution and closure are codes.
- Subject references are pseudonymised with the same tenant-scoped digest function C2 uses,
  so an internal identifier is never written verbatim.
- Exception kinds are closed, so a case cannot be opened with an arbitrary clinical label.

## Tenant and branch isolation (explicit)

- Tenant and branch scope are taken only from verified session claims and from the
  server-side membership registry; a body- or query-supplied tenant is ignored, and a
  branch-supplied scope is validated against the caller's memberships before use.
- A branch-scoped request can only be decided by an authority whose resolved branch scope
  covers that branch; a branch-scoped authority cannot decide a tenant-wide request
  (`APPROVAL_CROSS_BRANCH`).
- Reads are tenant-scoped and filtered by branch; a foreign tenant receives an empty list
  and a 404 by direct id.
- Row-level security is forced on every C3 table with `current_setting('app.current_tenant')`
  policies for both read and write, so a foreign-tenant insert is refused by the database
  rather than only by application code.
- The application role can update only the lifecycle columns of a request, so tenant,
  branch, action type and parameters digest are immutable after insert.

## State machine and idempotency (unchanged)

```text
proposed            -> awaiting_approval, cancelled
awaiting_approval   -> approved, rejected, expired, cancelled, superseded, needs_human
approved            -> executing, expired, cancelled, superseded
executing           -> succeeded, failed, needs_human
needs_human         -> cancelled, superseded
terminal            : rejected, expired, cancelled, superseded, succeeded, failed
```

Illegal jumps are refused in the domain layer and by a database trigger; terminal states are
frozen. Idempotency keys are scoped per tenant and per operation kind: a repeated key returns
the original record, and a repeated key with divergent content is refused.

## Exception queue (unchanged)

```text
open -> assigned -> in_review -> resolved -> closed
open | assigned | in_review -> escalated
open | assigned | in_review -> cancelled
escalated -> in_review | resolved | cancelled
```

Every case references a W3 work item that owns assignment, due date, ownership, escalation
and follow-up. Closure requires an evidence reference when the kind requires evidence, and a
case resolved as `unknown_outcome` cannot be closed at all.

## Declared limits (unchanged)

No verified agent credential path; no protected-operation implementation inside C3; no
cryptographic immutability claim; synthetic and local-database qualification only.
