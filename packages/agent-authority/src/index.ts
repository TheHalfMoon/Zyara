// Zyara Network C1: explicit agent identities and scoped administrative grants.
//
// Buzz semantic donor reference:
// block/buzz@4ab4f786085a23fe6126529861840eff6048ceee.
//
// C1 adapts the identity/authority separation principle only. It does not use
// Nostr as Zyara authority and it does not copy Buzz code.

export type AgentId = string;
export type AgentKind = "workflow_agent" | "copilot" | "integration_agent";
export type AgentStatus = "draft" | "active" | "paused" | "revoked";

export const AGENT_CAPABILITIES = [
  "ops.tasks.read",
  "ops.tasks.create",
  "ops.tasks.comment",
  "ops.tasks.progress",
  "workforce.coverage.read",
  "whatsapp.delivery.read",
] as const;

export type AgentCapability = (typeof AGENT_CAPABILITIES)[number];

export interface AgentIdentity {
  id: AgentId;
  tenantId: string;
  branchId: string | null;
  kind: AgentKind;
  displayName: string;
  purpose: string;
  status: AgentStatus;
  createdByAccountId: string;
  sourceRef: string;
  sourceRevision: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentGrant {
  id: string;
  tenantId: string;
  agentId: AgentId;
  branchId: string | null;
  capability: AgentCapability;
  requiresHumanApproval: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  grantedByAccountId: string;
  revokedAt: string | null;
  revokedByAccountId: string | null;
  reason: string;
  createdAt: string;
}

export type AgentAuthorityAction =
  | "identity_created"
  | "identity_activated"
  | "identity_paused"
  | "identity_revoked"
  | "grant_created"
  | "grant_revoked";

export interface AgentAuthorityEvent {
  id: string;
  tenantId: string;
  agentId: AgentId;
  action: AgentAuthorityAction;
  actorAccountId: string;
  grantId: string | null;
  reasonCode: string;
  occurredAt: string;
}

export interface AgentDecision {
  allow: boolean;
  reason:
    | "allowed"
    | "agent_unknown"
    | "agent_not_active"
    | "grant_missing"
    | "grant_expired"
    | "branch_out_of_scope"
    | "human_approval_required";
  identity?: AgentIdentity;
  grant?: AgentGrant;
}

export type AgentAuthorityErrorCode =
  | "AGENT_DUPLICATE_ID"
  | "AGENT_UNKNOWN"
  | "AGENT_CROSS_TENANT"
  | "AGENT_CROSS_BRANCH"
  | "AGENT_INVALID_ID"
  | "AGENT_INVALID_KIND"
  | "AGENT_INVALID_STATUS"
  | "AGENT_INVALID_TRANSITION"
  | "AGENT_INVALID_CAPABILITY"
  | "AGENT_INVALID_INTERVAL"
  | "AGENT_GRANT_DUPLICATE"
  | "AGENT_GRANT_MUTATION_REQUIRES_APPROVAL"
  | "AGENT_GRANT_REVOKED";

export class AgentAuthorityError extends Error {
  constructor(public readonly code: AgentAuthorityErrorCode, message: string) {
    super(message);
  }
}

const KINDS: readonly AgentKind[] = ["workflow_agent", "copilot", "integration_agent"];
const STATUSES: readonly AgentStatus[] = ["draft", "active", "paused", "revoked"];
const MUTATING_CAPABILITIES: readonly AgentCapability[] = [
  "ops.tasks.create",
  "ops.tasks.comment",
  "ops.tasks.progress",
];

function includes<T extends string>(values: readonly T[], value: string): value is T {
  return (values as readonly string[]).includes(value);
}

function validInstant(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function requireAgentId(id: string): void {
  if (!/^agt_[A-Za-z0-9_-]{8,64}$/.test(id)) {
    throw new AgentAuthorityError(
      "AGENT_INVALID_ID",
      "agent identity must use the dedicated agt_ namespace",
    );
  }
}

export const AGENT_STATUS_TRANSITIONS: Readonly<Record<AgentStatus, readonly AgentStatus[]>> = {
  draft: ["active", "revoked"],
  active: ["paused", "revoked"],
  paused: ["active", "revoked"],
  revoked: [],
};

export function capabilityRequiresHumanApproval(capability: AgentCapability): boolean {
  return MUTATING_CAPABILITIES.includes(capability);
}

export class AgentAuthorityStore {
  readonly identities = new Map<AgentId, AgentIdentity>();
  readonly grants = new Map<string, AgentGrant>();
  readonly events = new Map<string, AgentAuthorityEvent>();

  private fail(code: AgentAuthorityErrorCode, message: string): never {
    throw new AgentAuthorityError(code, message);
  }

  createIdentity(identity: AgentIdentity, scopeTenant: string): AgentIdentity {
    if (identity.tenantId !== scopeTenant) {
      this.fail("AGENT_CROSS_TENANT", "agent identity tenant is outside caller scope");
    }
    requireAgentId(identity.id);
    if (this.identities.has(identity.id)) {
      this.fail("AGENT_DUPLICATE_ID", `duplicate agent identity: ${identity.id}`);
    }
    if (!includes(KINDS, identity.kind)) {
      this.fail("AGENT_INVALID_KIND", `unsupported agent kind: ${identity.kind}`);
    }
    if (identity.status !== "draft") {
      this.fail("AGENT_INVALID_STATUS", "new agent identities must start as draft");
    }
    if (!identity.displayName.trim() || !identity.purpose.trim()) {
      this.fail("AGENT_INVALID_ID", "agent display name and purpose are required");
    }
    const copy = { ...identity };
    this.identities.set(identity.id, copy);
    this.recordEvent({
      tenantId: scopeTenant,
      agentId: identity.id,
      action: "identity_created",
      actorAccountId: identity.createdByAccountId,
      grantId: null,
      reasonCode: "admin_created",
      occurredAt: identity.createdAt,
    });
    return copy;
  }

  transitionIdentity(
    agentId: AgentId,
    scopeTenant: string,
    next: AgentStatus,
    at: string,
    actorAccountId: string,
    reasonCode: string,
  ): AgentIdentity {
    const current = this.identityFor(agentId, scopeTenant);
    if (!includes(STATUSES, next)) {
      this.fail("AGENT_INVALID_STATUS", `unsupported agent status: ${next}`);
    }
    if (!AGENT_STATUS_TRANSITIONS[current.status].includes(next)) {
      this.fail("AGENT_INVALID_TRANSITION", `${current.status} -> ${next} is not allowed`);
    }
    const updated = { ...current, status: next, updatedAt: at };
    this.identities.set(agentId, updated);
    const action: AgentAuthorityAction =
      next === "active"
        ? "identity_activated"
        : next === "paused"
          ? "identity_paused"
          : "identity_revoked";
    this.recordEvent({
      tenantId: scopeTenant,
      agentId,
      action,
      actorAccountId,
      grantId: null,
      reasonCode,
      occurredAt: at,
    });
    return updated;
  }

  grant(input: AgentGrant, scopeTenant: string): AgentGrant {
    if (input.tenantId !== scopeTenant) {
      this.fail("AGENT_CROSS_TENANT", "agent grant tenant is outside caller scope");
    }
    const identity = this.identityFor(input.agentId, scopeTenant);
    if (identity.status === "revoked") {
      this.fail("AGENT_GRANT_REVOKED", "revoked agent identities cannot receive grants");
    }
    if (!includes(AGENT_CAPABILITIES, input.capability)) {
      this.fail("AGENT_INVALID_CAPABILITY", `unsupported capability: ${input.capability}`);
    }
    if (
      !validInstant(input.effectiveFrom) ||
      (input.effectiveTo !== null && !validInstant(input.effectiveTo)) ||
      (input.effectiveTo !== null && Date.parse(input.effectiveTo) <= Date.parse(input.effectiveFrom))
    ) {
      this.fail("AGENT_INVALID_INTERVAL", "grant interval is invalid");
    }
    if (
      identity.branchId !== null &&
      input.branchId !== null &&
      identity.branchId !== input.branchId
    ) {
      this.fail("AGENT_CROSS_BRANCH", "grant branch exceeds identity branch scope");
    }
    if (
      capabilityRequiresHumanApproval(input.capability) &&
      !input.requiresHumanApproval
    ) {
      this.fail(
        "AGENT_GRANT_MUTATION_REQUIRES_APPROVAL",
        "mutating agent capabilities require human approval",
      );
    }
    if (this.grants.has(input.id)) {
      this.fail("AGENT_GRANT_DUPLICATE", `duplicate agent grant: ${input.id}`);
    }
    const duplicate = [...this.grants.values()].find(
      (grant) =>
        grant.tenantId === input.tenantId &&
        grant.agentId === input.agentId &&
        grant.branchId === input.branchId &&
        grant.capability === input.capability &&
        grant.revokedAt === null,
    );
    if (duplicate) {
      this.fail("AGENT_GRANT_DUPLICATE", "an active grant already exists for this scope");
    }
    const copy = { ...input };
    this.grants.set(input.id, copy);
    this.recordEvent({
      tenantId: scopeTenant,
      agentId: input.agentId,
      action: "grant_created",
      actorAccountId: input.grantedByAccountId,
      grantId: input.id,
      reasonCode: input.reason,
      occurredAt: input.createdAt,
    });
    return copy;
  }

  revokeGrant(
    grantId: string,
    scopeTenant: string,
    revokedByAccountId: string,
    at: string,
  ): AgentGrant {
    const grant = this.grants.get(grantId);
    if (!grant || grant.tenantId !== scopeTenant) {
      this.fail("AGENT_UNKNOWN", `grant ${grantId} not found`);
    }
    if (grant.revokedAt !== null) return grant;
    const updated = {
      ...grant,
      revokedAt: at,
      revokedByAccountId,
    };
    this.grants.set(grantId, updated);
    this.recordEvent({
      tenantId: scopeTenant,
      agentId: grant.agentId,
      action: "grant_revoked",
      actorAccountId: revokedByAccountId,
      grantId,
      reasonCode: "admin_revoked",
      occurredAt: at,
    });
    return updated;
  }

  authorize(args: {
    tenantId: string;
    agentId: AgentId;
    branchId: string | null;
    capability: AgentCapability;
    at: string;
    humanApprovalPresent: boolean;
  }): AgentDecision {
    const identity = this.identities.get(args.agentId);
    if (!identity || identity.tenantId !== args.tenantId) {
      return { allow: false, reason: "agent_unknown" };
    }
    if (identity.status !== "active") {
      return { allow: false, reason: "agent_not_active", identity };
    }
    if (
      identity.branchId !== null &&
      args.branchId !== identity.branchId
    ) {
      return { allow: false, reason: "branch_out_of_scope", identity };
    }
    const atMs = Date.parse(args.at);
    if (!Number.isFinite(atMs)) {
      return { allow: false, reason: "grant_expired", identity };
    }
    const candidates = [...this.grants.values()].filter(
      (grant) =>
        grant.tenantId === args.tenantId &&
        grant.agentId === args.agentId &&
        grant.capability === args.capability &&
        grant.revokedAt === null &&
        (grant.branchId === null || grant.branchId === args.branchId),
    );
    const grant = candidates.find((candidate) => {
      const fromMs = Date.parse(candidate.effectiveFrom);
      const toMs = candidate.effectiveTo === null ? null : Date.parse(candidate.effectiveTo);
      return fromMs <= atMs && (toMs === null || toMs > atMs);
    });
    if (!grant) {
      return {
        allow: false,
        reason: candidates.length > 0 ? "grant_expired" : "grant_missing",
        identity,
      };
    }
    if (grant.requiresHumanApproval && !args.humanApprovalPresent) {
      return {
        allow: false,
        reason: "human_approval_required",
        identity,
        grant,
      };
    }
    return { allow: true, reason: "allowed", identity, grant };
  }

  listIdentities(scopeTenant: string, branchId?: string): AgentIdentity[] {
    return [...this.identities.values()].filter(
      (identity) =>
        identity.tenantId === scopeTenant &&
        (branchId === undefined || identity.branchId === null || identity.branchId === branchId),
    );
  }

  listGrants(agentId: AgentId, scopeTenant: string): AgentGrant[] {
    this.identityFor(agentId, scopeTenant);
    return [...this.grants.values()].filter(
      (grant) => grant.tenantId === scopeTenant && grant.agentId === agentId,
    );
  }

  listEvents(agentId: AgentId, scopeTenant: string): AgentAuthorityEvent[] {
    this.identityFor(agentId, scopeTenant);
    return [...this.events.values()].filter(
      (event) => event.tenantId === scopeTenant && event.agentId === agentId,
    );
  }

  private recordEvent(event: Omit<AgentAuthorityEvent, "id">): void {
    const id = `agent-authority-event-${this.events.size + 1}`;
    this.events.set(id, { id, ...event });
  }

  private identityFor(agentId: AgentId, scopeTenant: string): AgentIdentity {
    const identity = this.identities.get(agentId);
    if (!identity || identity.tenantId !== scopeTenant) {
      this.fail("AGENT_UNKNOWN", `agent ${agentId} not found`);
    }
    return identity;
  }
}
