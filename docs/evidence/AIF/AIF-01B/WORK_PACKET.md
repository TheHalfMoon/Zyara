# AIF-01B Work Packet — Durable Registry + Deny-by-Default Resolver

Base: `main` @ `436590dfe8c81e78a5e4b72bf0de6760d528dff0` (merge of PR #114; AIF-01A merged as PR #116).
Branch: `feat/zyara-network-aif01b-capability-resolver`.
Authority: AIF plan §12 (AIF-01); AIF handoff §5 (AIF-01B); AIF-01A `WORK_PACKET.md` "Carried into AIF-01B".
Exit marker: `CAPABILITY_RESOLVER_QUALIFIED = TRUE`.

## Scope

1. `resolveCapability()` in `@zyara/capability-gateway`: given a server-derived principal and a capability request, it returns exactly one of `ALLOW`, `ASK`, `DENY` or `UNDECIDABLE`, with stable reason codes and an audit/activity-safe resolution receipt.
2. Migration `046_capability_registry.sql`: the minimum durable tables for qualification. It is append-only by construction (no `UPDATE` or `DELETE` grant on any table), uses RLS on every tenant table, and the database itself enforces "A5 is human-only".
3. An in-process `CapabilityRegistryState` that implements the resolver's registry and grant ports with the same append-only semantics, so the resolver is testable without a database. The real-PostgreSQL smoke proves the durable constraints.

Non-goals: no HTTP route; no model, browser or provider call; no dispatch or execution (AIF-04C); no egress or credential mediation (AIF-02).

## Composition (no second authority system)

| Concern | Reused primitive |
| --- | --- |
| capability contract, digest, grant/scope rules | AIF-01A `validateGrant`, `checkInvocationScope`, `validateInvocation` |
| human membership, branch, assurance | `authorize()` from `@zyara/authorization` (M002) |
| agent lifecycle, expiry, branch, sponsor liveness, held capability | `AgentIdentityStore.resolveAuthority()` (N5/C1) |
| protected-action approval | `ApprovalRequest` from `ApprovalStore` (N5/C3); action type = capability id |
| provider adapter certification | `requireCapability()` from `@zyara/adapter-harness` (M036) |
| exact human confirmation | a confirmation port shaped on `@zyara/action-confirmation` (M043) |

## Principal binding (closes the AIF-01A carry-over)

The resolver never reads tenant, actor kind or actor id from the request. The caller builds an `AuthenticatedPrincipal` from the verified session or service identity:

- `human`: `RequestContext` from `@zyara/authorization`; the tenant is `claims.tenant`;
- `agent`: an N5/C1 agent id with its tenant, from the agent's credential;
- `workflow`: a workflow id with its tenant, from the workflow runtime.

A `requestedTenantId` in the request is only compared with the principal's tenant: a mismatch is `DENY CAPABILITY_CROSS_TENANT`, and it is never used. Grants are looked up for the principal's own identity, so an agent cannot present itself as a workflow or a human role.

## Decision rules (evaluated in this order; the first rule that applies wins)

1. A dependency that fails, throws or answers "unknown" yields `UNDECIDABLE`. Never `ALLOW`.
2. Registry lookup: unknown id → `DENY CAPABILITY_UNKNOWN`; unregistered version → `DENY CAPABILITY_VERSION_MISMATCH`; digest differs → `DENY CAPABILITY_DIGEST_MISMATCH`; revoked or quarantined definition → `DENY CAPABILITY_REVOKED`.
3. Body tenant differs from the principal tenant → `DENY CAPABILITY_CROSS_TENANT`.
4. Invocation shape (AIF-01A `validateInvocation`) fails → `DENY` with that code (for example a wrong parameter digest format or a missing idempotency key).
5. Principal checks:
   - human: a membership with a granted role must pass `authorize()` for the tenant and branch, with `aal2` required for A4 and A5; otherwise `DENY` with the `AUTHZ_*` code;
   - agent: A5 → `DENY CAPABILITY_HUMAN_ONLY`; the capability id must be an N5/C1 agent capability, and `resolveAuthority()` must allow it (revoked, expired, suspended, cross-branch and sponsor checks); otherwise `DENY` with the `AGENT_*` code;
   - workflow: A5 → `DENY CAPABILITY_HUMAN_ONLY`.
6. Grant: no active grant (unrevoked, unexpired at server time) for this principal, capability, version and tenant that also passes `checkInvocationScope` → `DENY CAPABILITY_GRANT_MISSING` (or the scope code, for example `CAPABILITY_SCOPE_WIDENING`).
7. Adapter: if the capability is bound to a provider adapter, that adapter must hold the bound certified capability → otherwise `DENY CAPABILITY_ADAPTER_UNCERTIFIED`. An unknown adapter → `UNDECIDABLE`.
8. Approval, required when `riskClass ∈ {high, critical}` or the authority class is `A4_EXECUTE_MED`:
   - the capability id must be an N5/C3 protected action type → otherwise `DENY CAPABILITY_APPROVAL_RULE_MISSING`;
   - no approval presented → `ASK APPROVAL_REQUIRED`;
   - unknown approval → `DENY CAPABILITY_APPROVAL_UNKNOWN`;
   - different tenant, branch or action type → `DENY CAPABILITY_APPROVAL_MISMATCH`;
   - status other than `approved`, or expired at server time → `DENY CAPABILITY_APPROVAL_STALE`;
   - parameter digest differs → `DENY CAPABILITY_APPROVAL_PARAMETERS_CHANGED`.
   - the approval is already claimed by another invocation (a different idempotency key) → `DENY CAPABILITY_APPROVAL_CONSUMED`.
9. `A5_HUMAN_ONLY` (human principals only): no confirmation presented → `ASK CONFIRMATION_REQUIRED`; a confirmation that does not match → `DENY CAPABILITY_CONFIRMATION_INVALID`. A confirmation counts only when the confirmation port answers that it was given by this account for exactly this capability, version, tenant, parameters digest and idempotency key.
10. Otherwise `ALLOW`.

Server time always comes from the clock port, never from the request.

### Grant selection

Revoked grants and grants expired at server time are ignored. Among the remaining grants that pass `checkInvocationScope`, the narrowest wins: a branch grant before a tenant-wide grant, then the lowest grant id. The receipt names the chosen grant.

### One approval, one invocation

An approval authorizes one invocation identity: (approval request id, idempotency key). The first `ALLOW` that uses an approval claims it in `capability_approval_claims`, where the primary key (tenant, approval request id) is the race-safe serialization point. A re-resolution with the same idempotency key is the same invocation. A different key is refused with `CAPABILITY_APPROVAL_CONSUMED`. If two concurrent resolutions both see an unclaimed approval, only one claim insert succeeds, and the caller must treat the loser as `DENY`.

### Decisions are point-in-time (time of check vs time of use)

`ALLOW` is not a capability token. A receipt is valid until `validUntil = decidedAt + 60 s` (`RESOLUTION_VALIDITY_MS`). The dispatcher (AIF-04C) must re-resolve immediately before dispatch and must not dispatch on an expired receipt. A grant, agent or approval revoked after the decision is therefore seen at dispatch. The receipt also names the grant and approval it relied on, so a later audit can check them.

### Every decision is receipted

`resolveCapability` returns a receipt for every decision, including `DENY`, `ASK` and `UNDECIDABLE`, and the caller appends every receipt to `capability_resolution_receipts`.

## Receipt

`ResolutionReceipt` holds: decision, reason codes, capability id, version, definition digest, tenant, branch, actor kind, actor ref, parameters digest, correlation id, idempotency key, the chosen grant id, the approval request id, `decidedAt`, `validUntil` and `receiptDigest` (`res_` + SHA-256 over canonical JSON). It carries no parameter values, no free text from the request, and no credential or approval content. A tenant mismatch is recorded under the principal's tenant, never under the requested one.

## Migration 046 (additive)

- `capability_definitions`: installation-scoped catalog with no tenant data. Key (capability_id, version); unique digest; closed authority class; optional provider-adapter binding; `INSERT` for `zyara_migrator`, `SELECT` for `zyara_app`. No `UPDATE` or `DELETE` grant, so an admitted definition is immutable.
- `capability_definition_status_events`: append-only revoke/quarantine/reinstate trail.
- `capability_grants`: tenant-scoped with RLS (`FORCE`). The branch FK is composite with the tenant. A composite FK to (capability_id, version, authority_class) plus a CHECK makes an A5 grant to a non-human impossible. Agent and workflow grants must expire. `SELECT, INSERT` only.
- `capability_grant_revocations`: append-only, RLS.
- `capability_resolution_receipts`: append-only, RLS; closed decision set; `res_` digest shape.
- `capability_approval_claims`: append-only, RLS; primary key (tenant_id, approval_request_id); records the idempotency key that claimed the approval.

## Required tests (handoff §5 plus hardening)

- body-supplied tenant rejected and never used;
- revoked agent denied; expired agent denied;
- cross-branch denied;
- stale approval denied (expired, rejected, superseded);
- wrong parameter digest denied (approval mismatch and malformed digest);
- uncertified adapter denied;
- human-only denied for agent and workflow;
- unknown state returns `UNDECIDABLE` (each port failing), never `ALLOW`;
- revoked grant denied; expired grant denied; revoked definition denied;
- approval required → `ASK`; confirmation required → `ASK`;
- happy paths for human, agent and workflow → `ALLOW`;
- receipt carries no parameter values and is deterministic;
- approval claimed by another invocation denied; the same invocation re-resolves to ALLOW;
- confirmation for other parameters denied;
- the narrowest active grant is chosen; a revoked branch grant does not hide an active tenant-wide one;
- every decision kind produces a receipt; `validUntil` is 60 s after server time.

DB smoke (real PostgreSQL 16): RLS read and write isolation; no `UPDATE`/`DELETE` on any table; A5 grant to an agent refused by the database; non-human grant without expiry refused; cross-tenant branch refused; malformed digest refused.
