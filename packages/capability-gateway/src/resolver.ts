// Zyara AI Operating Fabric AIF-01B: the deny-by-default capability resolver.
//
// Authority: docs/research/ZYARA_AI_OPERATING_FABRIC_IMPLEMENTATION_HANDOFF_2026-09-22.md §5
// and docs/evidence/AIF/AIF-01B/WORK_PACKET.md, which states the decision rules in order.
//
// The resolver composes existing authorities instead of adding one: AIF-01A contract checks,
// M002 `authorize()` for humans, N5/C1 `resolveAuthority()` for agents, N5/C3 approvals,
// M036 adapter certification and an M043-shaped exact confirmation. It decides; it never
// executes. Tenant and actor come only from the server-derived principal, and server time
// only from the clock port. Any dependency that fails or cannot answer yields UNDECIDABLE.

import type { AdapterCapability, CertifiedAdapter } from "@zyara/adapter-harness";
import { requireCapability } from "@zyara/adapter-harness";
import { authorize, type BranchRole, type RequestContext } from "@zyara/authorization";
import {
  AGENT_CAPABILITIES,
  APPROVAL_PARAMETERS_DIGEST_PATTERN,
  PROTECTED_ACTIONS,
  type AgentAuthorityDecision,
  type AgentAuthorityRequest,
  type AgentCapability,
  type ApprovalRequest,
} from "@zyara/collaboration";

import { ISO_INSTANT_PATTERN, canonicalJson, sha256Hex } from "./canonical.js";
import {
  CAPABILITY_DIGEST_PATTERN,
  CAPABILITY_ID_PATTERN,
  CAPABILITY_VERSION_PATTERN,
  CapabilityContractError,
  checkInvocationScope,
  isOpaqueId,
  isOpaqueToken,
  validateInvocation,
  type AdmittedCapability,
  type CapabilityGrant,
  type CapabilityGrantee,
  type CapabilityInvocation,
  type CapabilityRef,
} from "./contract.js";

export const RESOLUTION_DECISIONS = ["ALLOW", "ASK", "DENY", "UNDECIDABLE"] as const;
export type ResolutionDecision = (typeof RESOLUTION_DECISIONS)[number];

// An ALLOW is a point-in-time decision, not a capability token: the dispatcher re-resolves
// immediately before dispatch and never dispatches on an expired receipt. Other decisions are
// valid only at the instant they were made.
export const RESOLUTION_VALIDITY_MS = 60_000;

export type ResolutionReasonCode =
  | "ALLOWED"
  | "APPROVAL_REQUIRED"
  | "CONFIRMATION_REQUIRED"
  | "DEPENDENCY_UNAVAILABLE"
  | "PRINCIPAL_INVALID"
  | "CAPABILITY_UNKNOWN"
  | "CAPABILITY_VERSION_MISMATCH"
  | "CAPABILITY_DIGEST_MISMATCH"
  | "CAPABILITY_REVOKED"
  | "CAPABILITY_CROSS_TENANT"
  | "CAPABILITY_HUMAN_ONLY"
  | "CAPABILITY_NOT_AGENT_CAPABILITY"
  | "CAPABILITY_GRANT_MISSING"
  | "CAPABILITY_ADAPTER_UNCERTIFIED"
  | "CAPABILITY_APPROVAL_NOT_APPLICABLE"
  | "CAPABILITY_APPROVAL_RULE_MISSING"
  | "CAPABILITY_APPROVAL_UNKNOWN"
  | "CAPABILITY_APPROVAL_MISMATCH"
  | "CAPABILITY_APPROVAL_STALE"
  | "CAPABILITY_APPROVAL_PARAMETERS_CHANGED"
  | "CAPABILITY_APPROVAL_CONSUMED"
  | "CAPABILITY_APPROVAL_NEEDS_INVOCATION_KEY"
  | "CAPABILITY_CONFIRMATION_INVALID"
  | "CAPABILITY_CONFIRMATION_NEEDS_INVOCATION_KEY"
  | "INVOCATION_REFERENCE_INVALID"
  | `INVOCATION_${string}`
  | `AUTHZ_${string}`
  | `AGENT_${string}`;

// Built by the caller from the verified session (human), the agent credential (agent) or the
// workflow runtime (workflow). Never from a request body.
export type AuthenticatedPrincipal =
  | { kind: "human"; context: RequestContext }
  | { kind: "agent"; agentId: string; tenantId: string }
  | { kind: "workflow"; workflowId: string; tenantId: string };

export interface CapabilityResolutionRequest {
  capability: CapabilityRef;
  // A tenant named by the request body. It is compared with the principal's tenant and never
  // used for evaluation.
  requestedTenantId: string | null;
  // The branch of the already-resolved target resource (as for `authorize()`), or null for a
  // tenant-wide action.
  branchId: string | null;
  parametersDigest: string;
  correlationId: string;
  idempotencyKey: string | null;
  approvalRequestId: string | null;
  confirmationReceiptId: string | null;
}

export type DefinitionStatus = "active" | "revoked" | "quarantined";

export interface ProviderAdapterBinding {
  adapterId: string;
  adapterCapability: AdapterCapability;
}

export interface RegisteredCapability {
  admitted: AdmittedCapability;
  status: DefinitionStatus;
  providerBinding: ProviderAdapterBinding | null;
}

export interface CapabilityGrantRecord extends CapabilityGrant {
  grantId: string;
  grantedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
}

export interface ConfirmationQuery {
  confirmationReceiptId: string;
  tenantId: string;
  accountId: string;
  capabilityId: string;
  version: string;
  parametersDigest: string;
  idempotencyKey: string;
}

// The invocation identity that claimed an approval: who, and which invocation.
export interface ApprovalClaimant {
  actorKind: AuthenticatedPrincipal["kind"];
  actorRef: string;
  idempotencyKey: string;
}

// Ports. Each may throw or return "UNAVAILABLE"; both make the decision UNDECIDABLE.
export interface ResolverDependencies {
  clock: { now(): string };
  registry: {
    // null = no capability with this id at all.
    findCapability(capabilityId: string): readonly RegisteredCapability[] | null | "UNAVAILABLE";
  };
  grants: {
    grantsFor(tenantId: string, grantee: CapabilityGrantee, capabilityId: string, version: string): readonly CapabilityGrantRecord[] | "UNAVAILABLE";
  };
  agents: {
    resolveAuthority(agentId: string, tenantId: string, request: AgentAuthorityRequest): AgentAuthorityDecision | "UNAVAILABLE";
  };
  approvals: {
    getRequest(approvalRequestId: string, tenantId: string): ApprovalRequest | null | "UNAVAILABLE";
    claimant(approvalRequestId: string, tenantId: string): ApprovalClaimant | null | "UNAVAILABLE";
  };
  adapters: {
    certified(adapterId: string): CertifiedAdapter | null | "UNAVAILABLE";
  };
  confirmations: {
    isConfirmed(query: ConfirmationQuery): boolean | "UNAVAILABLE";
  };
}

// Every request-supplied field is echoed only when it has a safe opaque shape; otherwise it
// is null, so a receipt never carries free text, parameter values or credential shapes.
export interface ResolutionReceipt {
  decision: ResolutionDecision;
  reasons: readonly ResolutionReasonCode[];
  capabilityId: string | null;
  version: string | null;
  definitionDigest: string | null;
  tenantId: string;
  branchId: string | null;
  actorKind: AuthenticatedPrincipal["kind"];
  actorRef: string | null;
  parametersDigest: string | null;
  correlationId: string | null;
  idempotencyKey: string | null;
  grantId: string | null;
  // Only an approval that rule 8 actually evaluated and relied on.
  approvalRequestId: string | null;
  // null only when trusted time was unavailable (the decision is then UNDECIDABLE).
  decidedAt: string | null;
  validUntil: string | null;
  receiptDigest: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

class Undecidable extends Error {}

function available<T>(value: T | "UNAVAILABLE"): T {
  if (value === "UNAVAILABLE") throw new Undecidable("dependency unavailable");
  return value;
}

function instant(value: unknown): number {
  if (typeof value !== "string" || !ISO_INSTANT_PATTERN.test(value)) throw new Undecidable("time unavailable");
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) throw new Undecidable("time unavailable");
  return parsed;
}

const PRINCIPAL_KINDS = ["human", "agent", "workflow"] as const;
const ADMIN_ROLES: readonly string[] = ["org_admin", "branch_admin"];

// Reads the caller's objects exactly once into plain data, so a getter or Proxy cannot answer
// one value to a check and another to a later check. A principal that is not one of the three
// kinds is a server-side programming error and is refused outright.
function snapshot<T>(value: T, label: string): T {
  let text: string | undefined;
  try {
    text = JSON.stringify(value);
  } catch {
    text = undefined;
  }
  if (text === undefined) throw new CapabilityContractError("CAPABILITY_FIELD_MISSING", `${label} must be plain data`);
  return JSON.parse(text) as T;
}

function principalTenant(principal: AuthenticatedPrincipal): string {
  const value = principal.kind === "human" ? principal.context?.claims?.tenant : principal.tenantId;
  return typeof value === "string" ? value : "";
}

function principalRef(principal: AuthenticatedPrincipal): string {
  if (principal.kind === "human") return String(principal.context?.claims?.sub ?? "");
  return String(principal.kind === "agent" ? principal.agentId : principal.workflowId);
}

function requiresApproval(admitted: AdmittedCapability): boolean {
  const { riskClass, authorityClass } = admitted.definition;
  return riskClass === "high" || riskClass === "critical" || authorityClass === "A4_EXECUTE_MED";
}

function isAgentCapability(value: string): value is AgentCapability {
  return (AGENT_CAPABILITIES as readonly string[]).includes(value);
}

// Narrowest first: a branch grant before a tenant-wide grant, then the lowest grant id.
function grantOrder(a: CapabilityGrantRecord, b: CapabilityGrantRecord): number {
  if ((a.branchId === null) !== (b.branchId === null)) return a.branchId === null ? 1 : -1;
  if (a.grantId === b.grantId) return 0;
  return a.grantId < b.grantId ? -1 : 1;
}

// The approval's requester must be the principal now invoking it: an approval raised by one
// agent, account or workflow cannot be spent by another.
function requestedBy(approval: ApprovalRequest, principal: AuthenticatedPrincipal): boolean {
  if (principal.kind === "agent") return approval.requesterKind === "agent" && approval.requesterAgentId === principal.agentId;
  if (principal.kind === "human") return approval.requesterKind === "human" && approval.requesterAccountId === principal.context.claims.sub;
  return approval.requesterKind === "system" && approval.requesterRef === principal.workflowId;
}

interface Outcome {
  decision: ResolutionDecision;
  reasons: ResolutionReasonCode[];
  grantId: string | null;
  admitted: AdmittedCapability | null;
  approvalUsed: string | null;
}

const deny = (reason: ResolutionReasonCode, admitted: AdmittedCapability | null = null): Outcome => ({
  decision: "DENY",
  reasons: [reason],
  grantId: null,
  admitted,
  approvalUsed: null,
});

// ---------------------------------------------------------------------------
// Evaluation (the order mirrors the work packet's numbered rules)
// ---------------------------------------------------------------------------

function evaluate(principal: AuthenticatedPrincipal, request: CapabilityResolutionRequest, deps: ResolverDependencies, nowIso: string): Outcome {
  const now = instant(nowIso);
  const tenantId = principalTenant(principal);
  if (tenantId.length === 0) return deny("PRINCIPAL_INVALID");

  // Rule 2: registry.
  const registered = available(deps.registry.findCapability(request.capability.capabilityId));
  if (registered === null || registered.length === 0) return deny("CAPABILITY_UNKNOWN");
  const entry = registered.find((item) => item.admitted.definition.version === request.capability.version);
  if (!entry) return deny("CAPABILITY_VERSION_MISMATCH");
  const { admitted } = entry;
  if (request.capability.definitionDigest !== admitted.digest) return deny("CAPABILITY_DIGEST_MISMATCH", admitted);
  if (entry.status !== "active") return deny("CAPABILITY_REVOKED", admitted);
  const definition = admitted.definition;

  // Rule 3: the body may name a tenant only to be refused when it differs.
  if (request.requestedTenantId !== null && request.requestedTenantId !== tenantId) {
    return deny("CAPABILITY_CROSS_TENANT", admitted);
  }

  let actor: CapabilityGrantee = { kind: "human_role", id: "shape-check" };
  if (principal.kind === "agent") actor = { kind: "agent", id: principal.agentId };
  if (principal.kind === "workflow") actor = { kind: "workflow", id: principal.workflowId };

  // Rule 4: invocation shape, through the AIF-01A contract, plus the references the contract
  // does not carry. A reference that could not be echoed safely is refused before any lookup,
  // so nothing is ever decided on an id the receipt cannot record.
  const invocation = (grantee: CapabilityGrantee): CapabilityInvocation => ({
    capabilityId: definition.id,
    version: definition.version,
    definitionDigest: admitted.digest,
    tenantId,
    branchId: request.branchId,
    actor: grantee,
    parametersDigest: request.parametersDigest,
    correlationId: request.correlationId,
    idempotencyKey: request.idempotencyKey,
    requestedAt: nowIso,
  });
  try {
    validateInvocation(admitted, invocation(actor));
  } catch (error) {
    if (error instanceof CapabilityContractError) return deny(`INVOCATION_${error.code}`, admitted);
    throw error;
  }
  for (const reference of [request.approvalRequestId, request.confirmationReceiptId]) {
    if (reference !== null && !isOpaqueToken(reference)) return deny("INVOCATION_REFERENCE_INVALID", admitted);
  }
  if (!isOpaqueToken(principalRef(principal))) return deny("PRINCIPAL_INVALID", admitted);

  // Rule 5: principal checks for automated principals.
  let candidates: CapabilityGrantee[] = [actor];
  if (principal.kind === "agent") {
    if (definition.authorityClass === "A5_HUMAN_ONLY") return deny("CAPABILITY_HUMAN_ONLY", admitted);
    if (!isAgentCapability(definition.id)) return deny("CAPABILITY_NOT_AGENT_CAPABILITY", admitted);
    const decision = available(
      deps.agents.resolveAuthority(principal.agentId, tenantId, { capability: definition.id, branchId: request.branchId, at: nowIso }),
    );
    if (!decision.allow) return deny(decision.denial, admitted);
  } else if (principal.kind === "workflow") {
    if (definition.authorityClass === "A5_HUMAN_ONLY") return deny("CAPABILITY_HUMAN_ONLY", admitted);
  } else {
    // A human acts through the roles of their own active memberships in this tenant; M002
    // membership, branch and assurance are checked per granted role in rule 6.
    const roles = principal.context.memberships
      .filter((membership) => membership.tenantId === tenantId && !membership.revoked)
      .map((membership) => membership.role);
    candidates = [...new Set(roles)].sort().map((role) => ({ kind: "human_role", id: role }));
  }

  // Rule 6: an active grant, in force at server time, for this exact principal, whose scope
  // covers the invocation. The port's tenant and grantee filtering is re-checked here: the
  // port is a storage adapter, not an authority.
  const usable: CapabilityGrantRecord[] = [];
  let scopeFailure: ResolutionReasonCode | null = null;
  for (const grantee of candidates) {
    const records = available(deps.grants.grantsFor(tenantId, grantee, definition.id, definition.version));
    for (const record of records) {
      if (record.tenantId !== tenantId || record.grantee.kind !== grantee.kind || record.grantee.id !== grantee.id) continue;
      if (record.revokedAt !== null || instant(record.grantedAt) > now) continue;
      if (record.expiresAt !== null && instant(record.expiresAt) <= now) continue;
      try {
        checkInvocationScope(admitted, record, invocation(grantee));
        usable.push(record);
      } catch (error) {
        if (!(error instanceof CapabilityContractError)) throw error;
        scopeFailure ??= `INVOCATION_${error.code}`;
      }
    }
  }
  if (usable.length === 0) return deny(scopeFailure ?? "CAPABILITY_GRANT_MISSING", admitted);
  usable.sort(grantOrder);

  // For a human the chosen grant is the narrowest one whose role passes M002 at this branch,
  // so the receipt names the grant that was actually the basis of the decision.
  let chosen = usable[0];
  if (principal.kind === "human") {
    const highAuthority = definition.authorityClass === "A4_EXECUTE_MED" || definition.authorityClass === "A5_HUMAN_ONLY";
    // Admin roles are kept out of clinical-signing data, and out of PHI unless the capability
    // is approval-gated: an approved PHI export is governed by its N5/C3 approval, but a
    // routine PHI read is never open to an admin-only account.
    const clinical =
      definition.dataClasses.includes("CLINICAL_SIGNING_REQUIRED") ||
      (definition.dataClasses.includes("PHI") && !requiresApproval(admitted));
    let firstDenial: string | undefined;
    const passing = usable.find((record) => {
      // Admin/clinical separation for every request, including tenant-wide ones, where
      // authorize() itself does not apply forbidAdminClinical.
      if (clinical && ADMIN_ROLES.includes(record.grantee.id)) {
        firstDenial ??= "AUTHZ_ADMIN_CLINICAL_SEPARATION";
        return false;
      }
      const authz = authorize(
        { ...principal.context, nowIso },
        {
          action: definition.id,
          resourceTenant: tenantId,
          resourceBranch: request.branchId,
          allowRoles: [record.grantee.id as BranchRole],
          requireAssurance: highAuthority ? "aal2" : undefined,
          forbidAdminClinical: clinical,
        },
      );
      if (!authz.allow) firstDenial ??= authz.denial;
      return authz.allow;
    });
    if (!passing) return deny((firstDenial ?? "AUTHZ_DENIED") as ResolutionReasonCode, admitted);
    chosen = passing;
  }

  // Rule 7: provider adapter certification.
  if (entry.providerBinding !== null) {
    const adapter = available(deps.adapters.certified(entry.providerBinding.adapterId));
    if (adapter === null) throw new Undecidable("adapter unknown");
    if (!requireCapability(adapter, entry.providerBinding.adapterCapability).ok) {
      return deny("CAPABILITY_ADAPTER_UNCERTIFIED", admitted);
    }
  }

  // Rule 8: approval for high-risk and A4 capabilities, and only for them.
  let approvalUsed: string | null = null;
  if (!requiresApproval(admitted)) {
    if (request.approvalRequestId !== null) return deny("CAPABILITY_APPROVAL_NOT_APPLICABLE", admitted);
  } else {
    if (!Object.hasOwn(PROTECTED_ACTIONS, definition.id)) return deny("CAPABILITY_APPROVAL_RULE_MISSING", admitted);
    if (request.approvalRequestId === null) {
      return { decision: "ASK", reasons: ["APPROVAL_REQUIRED"], grantId: chosen.grantId, admitted, approvalUsed: null };
    }
    // The approval is claimed by one invocation identity, so even an approval-gated read
    // must name its invocation with an idempotency key.
    if (request.idempotencyKey === null) return deny("CAPABILITY_APPROVAL_NEEDS_INVOCATION_KEY", admitted);
    const approval = available(deps.approvals.getRequest(request.approvalRequestId, tenantId));
    if (approval === null) return deny("CAPABILITY_APPROVAL_UNKNOWN", admitted);
    if (
      approval.id !== request.approvalRequestId ||
      approval.tenantId !== tenantId ||
      approval.branchId !== request.branchId ||
      approval.actionType !== definition.id ||
      !requestedBy(approval, principal)
    ) {
      return deny("CAPABILITY_APPROVAL_MISMATCH", admitted);
    }
    if (approval.status !== "approved" || instant(approval.expiresAt) <= now) return deny("CAPABILITY_APPROVAL_STALE", admitted);
    if (approval.parametersDigest !== request.parametersDigest) return deny("CAPABILITY_APPROVAL_PARAMETERS_CHANGED", admitted);
    const claimant = available(deps.approvals.claimant(approval.id, tenantId));
    if (
      claimant !== null &&
      (claimant.actorKind !== principal.kind || claimant.actorRef !== principalRef(principal) || claimant.idempotencyKey !== request.idempotencyKey)
    ) {
      return deny("CAPABILITY_APPROVAL_CONSUMED", admitted);
    }
    approvalUsed = approval.id;
  }

  // Rule 9: exact confirmation for human-only capabilities (rule 5 already refused A5 to every
  // automated principal, so the principal here is human).
  if (definition.authorityClass === "A5_HUMAN_ONLY" && principal.kind === "human") {
    if (request.idempotencyKey === null) return deny("CAPABILITY_CONFIRMATION_NEEDS_INVOCATION_KEY", admitted);
    if (request.confirmationReceiptId === null) {
      return { decision: "ASK", reasons: ["CONFIRMATION_REQUIRED"], grantId: chosen.grantId, admitted, approvalUsed };
    }
    const confirmed = available(
      deps.confirmations.isConfirmed({
        confirmationReceiptId: request.confirmationReceiptId,
        tenantId,
        accountId: principal.context.claims.sub,
        capabilityId: definition.id,
        version: definition.version,
        parametersDigest: request.parametersDigest,
        idempotencyKey: request.idempotencyKey,
      }),
    );
    if (confirmed !== true) return deny("CAPABILITY_CONFIRMATION_INVALID", admitted);
  }

  return { decision: "ALLOW", reasons: ["ALLOWED"], grantId: chosen.grantId, admitted, approvalUsed };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export async function resolveCapability(
  principalInput: AuthenticatedPrincipal,
  requestInput: CapabilityResolutionRequest,
  deps: ResolverDependencies,
): Promise<ResolutionReceipt> {
  const principal = snapshot(principalInput, "principal");
  const request = snapshot(requestInput, "request");
  if (typeof principal !== "object" || principal === null || !(PRINCIPAL_KINDS as readonly string[]).includes(principal.kind)) {
    throw new CapabilityContractError("CAPABILITY_FIELD_MISSING", "principal must be a human, agent or workflow");
  }
  if (typeof request !== "object" || request === null) {
    throw new CapabilityContractError("CAPABILITY_FIELD_MISSING", "request must be an object");
  }
  // The snapshot drops undefined fields; every optional reference is null from here on, so
  // an omitted field can never slip past a `=== null` rule.
  request.requestedTenantId ??= null;
  request.branchId ??= null;
  request.idempotencyKey ??= null;
  request.approvalRequestId ??= null;
  request.confirmationReceiptId ??= null;

  let nowIso: string;
  let outcome: Outcome;
  try {
    nowIso = deps.clock.now();
    instant(nowIso);
  } catch {
    // Without trusted time nothing can be decided or even dated; the receipt says so.
    outcome = { decision: "UNDECIDABLE", reasons: ["DEPENDENCY_UNAVAILABLE"], grantId: null, admitted: null, approvalUsed: null };
    return buildReceipt(principal, request, outcome, null);
  }
  try {
    outcome = evaluate(principal, request, deps, nowIso);
  } catch {
    // Any failure, including an unexpected exception, is UNDECIDABLE and never ALLOW.
    outcome = { decision: "UNDECIDABLE", reasons: ["DEPENDENCY_UNAVAILABLE"], grantId: null, admitted: null, approvalUsed: null };
  }
  return buildReceipt(principal, request, outcome, nowIso);
}

// Recomputes the content digest, so a receipt edited after resolution (for example a DENY
// turned into an ALLOW) is detected. The digest is content addressing, not authentication:
// a keyed MAC needs a server secret and arrives with AIF-02 credential mediation.
export async function verifyReceiptDigest(receipt: ResolutionReceipt): Promise<boolean> {
  const { receiptDigest, ...body } = receipt;
  return receiptDigest === `res_${await sha256Hex(canonicalJson({ ...body, reasons: [...body.reasons] }))}`;
}

function shaped(value: unknown, pattern: RegExp): string | null {
  return typeof value === "string" && pattern.test(value) ? value : null;
}

async function buildReceipt(
  principal: AuthenticatedPrincipal,
  request: CapabilityResolutionRequest,
  outcome: Outcome,
  nowIso: string | null,
): Promise<ResolutionReceipt> {
  // Identity fields come from the principal and the admitted definition when known.
  const ref: Partial<CapabilityRef> = typeof request.capability === "object" && request.capability !== null ? request.capability : {};
  const tenant = principalTenant(principal);
  const actorRef = principalRef(principal);
  const body: Omit<ResolutionReceipt, "receiptDigest"> = {
    decision: outcome.decision,
    reasons: outcome.reasons,
    capabilityId: outcome.admitted?.definition.id ?? shaped(ref.capabilityId, CAPABILITY_ID_PATTERN),
    version: outcome.admitted?.definition.version ?? shaped(ref.version, CAPABILITY_VERSION_PATTERN),
    definitionDigest: outcome.admitted?.digest ?? shaped(ref.definitionDigest, CAPABILITY_DIGEST_PATTERN),
    tenantId: isOpaqueId(tenant) ? tenant : "invalid",
    branchId: isOpaqueId(request.branchId) ? request.branchId : null,
    actorKind: principal.kind,
    actorRef: isOpaqueToken(actorRef) ? actorRef : null,
    parametersDigest: shaped(request.parametersDigest, APPROVAL_PARAMETERS_DIGEST_PATTERN),
    correlationId: isOpaqueToken(request.correlationId) ? request.correlationId : null,
    idempotencyKey: isOpaqueToken(request.idempotencyKey) ? request.idempotencyKey : null,
    grantId: outcome.grantId,
    approvalRequestId: outcome.approvalUsed,
    decidedAt: nowIso,
    validUntil:
      nowIso === null
        ? null
        : new Date(Date.parse(nowIso) + (outcome.decision === "ALLOW" ? RESOLUTION_VALIDITY_MS : 0)).toISOString(),
  };
  return Object.freeze({ ...body, reasons: Object.freeze([...body.reasons]), receiptDigest: `res_${await sha256Hex(canonicalJson(body))}` });
}
