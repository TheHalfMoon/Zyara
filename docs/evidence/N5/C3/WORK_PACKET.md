# N5/C3 Work Packet — Approvals + Human Exception Queue

**Authority:** `docs/research/ZYARA_NETWORK_MASTER_PLAN_2026-09-20.md` (N5 Collaboration,
"C3 approval-exception-queue"), extended by the N5/C3 founder directive.
**Fresh-main base:** `f05c3358bee8ef2133760d95562911183d7fdb0e` (N5/C2 post-merge closure, PR #106).
**Branch:** `feat/zyara-network-n5c3-approvals-exceptions`.
**Mode:** bounded implementation; synthetic and local-database qualification only.

## Purpose

C3 is the governed bridge between AI / automation / external events and
human-authorized operational actions.

```text
proposal (requester: human | bounded agent | system)
        -> approval requirement (closed action registry, risk class, required authority)
        -> human decision (live authority resolved from the trusted registry)
        -> execution (digest-bound, expiry-bound, authority-bound receipt)
        -> canonical outcome  OR  human exception queue (W3-owned work item)
        -> derived operational activity (C2), never authority
```

An approval is not a boolean. It is a scoped, expiring, digest-bound grant that names the
tenant, the branch (when applicable), the exact action type, the exact protected
parameters, the requester, the required authority, the approver, the policy/risk class,
the evidence, its creation time, its expiry and a correlation id.

## Required behavior

1. **Approval binds to one operation.** A request binds tenant, branch, action type,
   parameters digest, requester, required authority, risk class, evidence, creation time,
   expiry and correlation id. An approval for one operation cannot authorize another.
2. **Parameter substitution invalidates the approval.** Execution presents the digest of
   the protected parameters it intends to use; a mismatch refuses execution and moves the
   request to `superseded` rather than executing something the approver never saw.
3. **Expiry is enforced, not decorative.** An expired approval cannot authorize execution;
   the attempt records the expiry transition and is refused.
4. **Live authority is re-resolved.** The approver must actually hold the required
   authority, resolved from the trusted server-side authority directory at decision time
   *and* re-resolved at execution time. A revoked approver authority invalidates an unused
   approval. UI role labels are never the source of approval authority.
5. **Self-approval is forbidden for protected classes**, and an agent can never be an
   approver. Agent A cannot approve agent B merely because both are agents; an agent
   cannot approve its own proposal; an agent cannot sponsor approval authority.
6. **Explicit state machine.** `proposed -> awaiting_approval -> approved -> executing ->
   succeeded`, with `rejected`, `expired`, `cancelled`, `superseded`, `failed` and
   `needs_human` as alternative states. Illegal jumps are refused in the domain layer and
   by a database trigger, and terminal transitions are tested.
7. **Idempotent retries reconcile the original operation.** A repeated propose decision,
   execution or exception write with the same key returns the original record; the same key
   with divergent content is refused.
8. **The exception queue is where automation safely gives up.** Cases carry a closed kind,
   severity, SLA due time, evidence requirement, correlation chain and the linked W3 work
   item that owns assignment, ownership, due date, escalation and follow-up.
9. **Unknown stays unknown.** An execution whose external outcome is not evidenced is
   recorded as `unknown` and moves the request to `needs_human`; a later definitive outcome
   for the same attempt is refused unless it carries evidence. A case resolved as
   `unknown_outcome` cannot be closed.
10. **Closure needs evidence when evidence is required.** A case whose kind requires
    evidence cannot reach `closed` without an evidence reference.
11. **W3 owns human work.** C3 adds approval/exception semantics; it does not create a
    second task manager. Each exception case references a W3 task, and assignment, due
    date, escalation and follow-up stay W3 operations.
12. **C1 supplies agent actors.** Agent requesters resolve to a bounded C1 identity; an
    unknown, revoked, suspended or expired identity cannot propose.
13. **C2 stays derived.** Proposal, decision, execution and exception transitions are
    projected into derived operational activity. `ActivityEvent != authoritative approval
    state` and `ActivityEvent != execution state`: the activity feed can never authorize or
    mutate a C3 request.
14. **No prose, no PHI, no secrets in C3 state.** Parameter *values* are never stored; only
    a digest plus an allow-listed key set is retained. Evidence is an opaque reference, not
    a document, and credential-shaped material is refused everywhere.
15. **Tenant and branch isolation.** Cross-tenant and cross-branch approval, decision,
    execution and exception access is refused, and RLS enforces it in the database.

## Model

| Concept | Zyara realization |
| --- | --- |
| `ProposedAction` | `ApprovalRequest` in `awaiting_approval`, with action type + parameters digest |
| `ApprovalRequirement` | derived from the closed protected-action registry (authority, risk, evidence, TTL) |
| `ApprovalDecision` | append-only decision row by a human approver with a resolved authority snapshot |
| `ExceptionCase` | closed kind + severity + SLA + evidence requirement + linked W3 work item |
| `ExceptionAssignment` | W3 task assignment, mirrored into the case read surface |
| `ExecutionReceipt` | append-only execution row: outcome, attempt ordinal, receipt/evidence reference |
| `EvidenceReference` | opaque bounded reference token; never a document or a raw payload |
| `RiskClass` | closed `routine` / `elevated` / `high` / `critical` |
| `RequiredAuthority` | closed `branch_admin` / `org_admin` / `clinical_lead` / `compliance_officer` |
| `CorrelationId` | bounded reference token carried through every C3 row and C2 projection |

## State machine

```text
proposed            -> awaiting_approval, cancelled
awaiting_approval   -> approved, rejected, expired, cancelled, superseded, needs_human
approved            -> executing, expired, cancelled, superseded
executing           -> succeeded, failed, needs_human
needs_human         -> cancelled, superseded
rejected | expired | cancelled | superseded | succeeded | failed  -> terminal
```

## Exception lifecycle

```text
open -> assigned -> in_review -> resolved -> closed
open | assigned | in_review     -> escalated
open | assigned | in_review     -> cancelled
escalated -> in_review | resolved | cancelled
resolved -> closed (requires evidence when the kind requires evidence)
```

## Allowed surface

- `packages/collaboration/src/approvals.ts` (new), `activity.ts` (additive registries),
  `index.ts`
- `apps/api/src/approvals.ts` (new), `activity.ts` (additive projections), `index.ts`
- `db/migrations/044_approvals_exceptions.sql` (new, additive + forward-only registry extension)
- `apps/api/scripts/n5c3-approvals-rls-smoke.mjs`, `apps/api/scripts/n5c3-approvals-http-smoke.ts`
- `tests/n5c3/**`
- `.github/workflows/n5c3-ci.yml`
- `pnpm-lock.yaml` (additive importer only)
- `docs/evidence/N5/**`

## Explicit non-goals

- no verified agent credential path, no service token, no mTLS, no SPIFFE/SPIRE: the C1
  gap is unchanged and no agent-originated HTTP write is enabled;
- no workflow engine, no BPMN, no generic rule DSL: the protected-action registry is closed;
- no second task manager: assignment, ownership, due date and escalation stay W3;
- no PHI, no clinical narrative, no parameter values, no evidence documents stored;
- no cryptographic immutability or tamper-evidence claim (C4 owns that question);
- no real clinic, provider, patient, payer or NPHIES interaction;
- no production readiness, security qualification or clinical authority claim.

## Acceptance

1. a proposal binds tenant, branch, action type, parameters digest, requester, required
   authority, risk class, creation time, expiry and correlation id;
2. an approval cannot authorize a different action or a changed parameter set;
3. an expired approval cannot authorize execution;
4. a revoked approver authority invalidates an unused approval at execution time;
5. self-approval is refused for protected classes and agents can never approve;
6. an agent requester must resolve to a live bounded C1 identity;
7. cross-tenant and cross-branch approval attempts are refused;
8. body-supplied requester or approver authority cannot influence the decision;
9. duplicate idempotency keys reconcile; divergent reuse is refused;
10. illegal state transitions are refused in the domain layer and in the database;
11. an unknown external outcome stays unknown and needs a human;
12. exception closure without required evidence is refused;
13. every exception case is owned by a W3 work item, and unknown automation outcomes are
    queued rather than converted into success or failure;
14. C2 activity is derived from C3 truth and cannot authorize anything;
15. exact-head N5/C3 CI is green before merge, including the real-PostgreSQL smoke under
    `zyara_app` and the authenticated Fastify `inject()` HTTP smoke;
16. no production readiness, security qualification or clinical authority is claimed.
