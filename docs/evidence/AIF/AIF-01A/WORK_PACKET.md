# AIF-01A Work Packet — Capability Contract

Base: `main` @ `b95debaa784c48867e92b73f695eb560f4e0f182` (merge of PR #115).
Branch: `feat/zyara-network-aif01a-capability-contract`.
Authority: AIF plan §4.1 and §12 (AIF-01); AIF handoff §4 (AIF-01A); automation principles "Automation authority classes".
Exit marker: `CAPABILITY_CONTRACT_QUALIFIED = TRUE`.

## Scope

A pure, provider-neutral contract package, `packages/capability-gateway`, that every later AI, workflow, browser and local execution path must use to name what it wants to do. It composes existing primitives and adds no second authorization, approval or outbox system.

Non-goals (handoff §4): no external provider call, no model, no browser, no secret store, no database table. The durable registry, grants table and the deny-by-default resolver are AIF-01B (migration 046).

## Contract

`CapabilityDefinition` (AIF plan §4.1), all fields required:

- `id` — dotted lowercase namespace (`scheduling.booking.create`); no wildcards.
- `version` — `MAJOR.MINOR.PATCH`; a registered (id, version) is immutable.
- `ownerDomain` — explicit owning domain identifier.
- `inputSchema`, `outputSchema` — exact references `{ id, version, digest }` to a JSON-compatible schema; the digest is `schema_<64 hex>`.
- `readOrWrite` — `read` | `write`.
- `riskClass` — reuses `APPROVAL_RISK_CLASSES` from `@zyara/collaboration` (no second risk vocabulary).
- `authorityClass` — closed `A0_OBSERVE`, `A1_DRAFT`, `A2_PREPARE`, `A3_EXECUTE_LOW`, `A4_EXECUTE_MED`, `A5_HUMAN_ONLY`.
- `dataClasses` — non-empty subset of the AIF §4.2 classes; `CREDENTIAL` is never allowed as capability data (secrets are never tool input).
- `tenantScope` — always `SINGLE_TENANT`; `branchScope` — `BRANCH` | `TENANT_WIDE` (the widest scope a grant may ever take).
- `consentPurpose` — reuses `ConsentPurpose` from `@zyara/consent-boundaries` (`care` | `recall` | `analytics`) or `NOT_REQUIRED`, which is only legal when every data class is `PUBLIC` or `INTERNAL`.
- `credentialBinding` — `{ kind: "none" }` or `{ kind: "ref", ref: "credref_<opaque>" }`. Any other shape or any secret-looking value anywhere in the definition is rejected.
- `egressPolicy` — opaque reference `egress_<id>`; AIF-02 owns the policy content.
- `idempotency` — `NOT_APPLICABLE` (reads only), `CALLER_KEY` or `NATURAL_KEY`.
- `timeoutMs` (1..300000) and `retry` (`maxAttempts` 1..5, `retryOn: TRANSIENT_ONLY`); a write without an idempotency contract cannot retry.
- `dryRunSupport` — boolean.
- `verification` (`VerificationContract`) — `receiptKind`, `method` (`PROVIDER_RECEIPT` | `READ_BACK` | `RECONCILIATION` | `NONE_READ_ONLY`), and `onUnknownOutcome: RECONCILE`. A write cannot use `NONE_READ_ONLY`.
- `observability` — `METADATA_ONLY` | `REDACTED_PAYLOAD`; raw payload logging does not exist.

Cross-field rules:

1. a write cannot be `A0_OBSERVE` or `A1_DRAFT`;
2. `CLINICAL_SIGNING_REQUIRED` data requires `A5_HUMAN_ONLY`;
3. a write needs an idempotency contract other than `NOT_APPLICABLE`;
4. a write needs a verification method other than `NONE_READ_ONLY`;
5. `NOT_REQUIRED` consent only for `PUBLIC`/`INTERNAL` data;
6. a `CREDENTIAL` data class is rejected.

## Registration

`CapabilityContractRegistry.register(definition, registrar)`:

- the registrar must be a trusted registration authority: a human `platform_admin` or the `release_pipeline` system principal. An agent principal is always refused (agents cannot self-register);
- the definition is validated, deep-frozen and digested: `cap_` + SHA-256 over canonical JSON (sorted keys);
- a second registration of the same (id, version) is rejected, whether or not the content is identical.

## Lookup and invocation shape

`resolveDefinition(ref)` takes `{ capabilityId, version, definitionDigest }`:

- an unknown id is denied (`CAPABILITY_UNKNOWN`);
- a known id at an unregistered version is denied (`CAPABILITY_VERSION_MISMATCH`);
- a digest that differs from the admitted digest is denied (`CAPABILITY_DIGEST_MISMATCH`).

## Grants and scope

`validateGrant(definition, grant)` (structure only; durable grants are AIF-01B):

- `A5_HUMAN_ONLY` can never be granted to an agent principal;
- an agent cannot be granted any capability above `A1_DRAFT` inside a namespace reserved by `AGENT_RESERVED_CAPABILITY_PREFIXES` (`@zyara/collaboration`);
- a `BRANCH` capability requires a branch-scoped grant.

`checkInvocationScope(grant, invocation)` rejects:

- a different tenant (`CAPABILITY_CROSS_TENANT`);
- a different branch, or a tenant-wide invocation under a branch grant (`CAPABILITY_SCOPE_WIDENING`).

`CapabilityInvocation` carries:

- the capability reference and tenant/branch;
- the actor;
- a normalized `parametersDigest` matching the N5/C3 `APPROVAL_PARAMETERS_DIGEST_PATTERN`;
- a correlation id;
- an idempotency key, which is required when the contract is `CALLER_KEY`.

`InvocationReceipt` is typed here. An `UNKNOWN_EXTERNAL_OUTCOME` receipt can never be `VERIFIED`; it is always `PENDING_RECONCILIATION`.

## Required tests (handoff §4 plus hardening)

- duplicate version rejected;
- unknown capability denied;
- write registered as A0/A1 rejected;
- A5 granted to an agent rejected;
- tenant widening rejected;
- branch widening rejected;
- credential plaintext rejected;
- unsupported data class rejected;
- version mismatch rejected;
- digest mismatch rejected;
- agent self-registration rejected;
- an admitted definition cannot be mutated;
- a write without idempotency rejected;
- a write without verification rejected;
- an unknown outcome cannot be verified.
