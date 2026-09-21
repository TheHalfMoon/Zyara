// Zyara Network N5/C1: bounded agent identities for Zyara Clinic operations.
//
// Concept donor reference: block/buzz (Apache-2.0), channels/threads,
// human-agent membership and derived-only activity. No Buzz source is copied
// into this file; the ideas are re-expressed as Zyara-native healthcare
// constraints.
//
// An agent identity is a *service principal for bounded clinic operations*. It
// is NOT a Practitioner, NOT a PractitionerRole, NOT clinical authority and NOT
// a substitute for human accountability. Every agent identity is tenant-scoped,
// optionally branch-scoped, must name a live human sponsor, holds an explicit
// closed set of capabilities, expires, and can be suspended or revoked. Agents
// can propose and read operational work; typed Zyara domain operations and
// humans still own every healthcare fact and every authoritative transition.

export type AgentIdentityId = string;

export const AGENT_IDENTITY_KINDS = [
  "clinic_ops_assistant",
  "communications_agent",
  "reporting_agent",
] as const;
export type AgentIdentityKind = (typeof AGENT_IDENTITY_KINDS)[number];

// Stored lifecycle. "expired" is deliberately NOT stored: expiry is derived
// from `expiresAt` so that a clock change can never leave a stale stored value.
export const AGENT_IDENTITY_STATUSES = ["active", "suspended", "revoked"] as const;
export type AgentIdentityStatus = (typeof AGENT_IDENTITY_STATUSES)[number];

export const AGENT_RESOLVED_STATUSES = ["active", "suspended", "revoked", "expired"] as const;
export type AgentResolvedStatus = (typeof AGENT_RESOLVED_STATUSES)[number];

// The complete set of capabilities an agent identity may ever hold. This list
// is closed on purpose: there is no wildcard, no dynamic scope string and no
// extensible namespace. Anything outside it is refused at registration and at
// every later grant.
export const AGENT_CAPABILITIES = [
  "workforce.tasks.read",
  "workforce.tasks.raise",
  "workforce.tasks.comment",
  "communications.outbound.propose",
  "reporting.read",
] as const;
export type AgentCapability = (typeof AGENT_CAPABILITIES)[number];

// Reserved namespaces that an agent identity can never hold. These stay owned
// by typed Zyara operations and by authorised humans (and, for clinical and
// financial facts, by clinicians and regulated processes).
export const AGENT_RESERVED_CAPABILITY_PREFIXES = [
  "clinical",
  "encounter",
  "prescription",
  "refill",
  "result",
  "lab",
  "referral",
  "insurance",
  "nphies",
  "claim",
  "payment",
  "billing",
  "appointment",
  "schedule",
  "availability",
  "hold",
  "workforce.assign",
  "workforce.graph",
  "identity",
  "credential",
  "secret",
  "audit",
  "tenant",
  "role",
  "membership",
  "filesystem",
  "file",
  "shell",
  "process",
  "network",
  "http",
  "sql",
  "database",
  "code",
  "deploy",
  "infra",
] as const;

export const AGENT_IDENTITY_EVENT_ACTIONS = [
  "created",
  "capability_granted",
  "capability_revoked",
  "suspended",
  "reactivated",
  "revoked",
  "credential_rotated",
] as const;
export type AgentIdentityEventAction = (typeof AGENT_IDENTITY_EVENT_ACTIONS)[number];

export type AgentActorKind = "human" | "agent" | "system";

export interface AgentActor {
  kind: AgentActorKind;
  accountId: string;
}

// Provenance is carried the same way as W1-W4 slices so evidence packets can be
// compared across the network plan.
export interface AgentProvenance {
  source: "zyara-native" | "donor-adapted";
  sourceRef: string;
  sourceRevision: string;
  observedAt: string;
}

export interface AgentIdentity {
  id: AgentIdentityId;
  tenantId: string;
  // null = tenant-wide (no branch scope). Set = the identity may act only in
  // that branch of that tenant.
  branchId: string | null;
  displayName: string;
  kind: AgentIdentityKind;
  status: AgentIdentityStatus;
  humanSponsorAccountId: string;
  effectiveFrom: string;
  expiresAt: string;
  // Opaque secret-manager reference only. Never a secret value.
  credentialRef: string;
  credentialRotatedAt: string | null;
  revokedAt: string | null;
  revocationReason: string | null;
  correlationId: string | null;
  idempotencyKey: string | null;
  provenance: AgentProvenance;
  createdAt: string;
  updatedAt: string;
}

export interface AgentIdentityEvent {
  id: string;
  tenantId: string;
  agentId: AgentIdentityId;
  action: AgentIdentityEventAction;
  capability: AgentCapability | null;
  actor: AgentActor;
  reason: string;
  occurredAt: string;
}

export interface AgentRegistrationInput {
  id: AgentIdentityId;
  tenantId: string;
  branchId?: string | null;
  displayName: string;
  kind: AgentIdentityKind;
  humanSponsorAccountId: string;
  effectiveFrom: string;
  expiresAt: string;
  credentialRef: string;
  provenance: AgentProvenance;
  correlationId?: string | null;
  idempotencyKey?: string | null;
}

export interface AgentAuthorityRequest {
  capability: AgentCapability;
  branchId: string | null;
  at: string;
}

export interface AgentAuthority {
  agentId: AgentIdentityId;
  tenantId: string;
  branchId: string | null;
  capability: AgentCapability;
  humanSponsorAccountId: string;
  expiresAt: string;
  at: string;
}

export type AgentDenialCode =
  | "AGENT_UNKNOWN"
  | "AGENT_CROSS_TENANT"
  | "AGENT_CROSS_BRANCH"
  | "AGENT_REVOKED"
  | "AGENT_SUSPENDED"
  | "AGENT_EXPIRED"
  | "AGENT_NOT_YET_EFFECTIVE"
  | "AGENT_CAPABILITY_DENIED"
  | "AGENT_SPONSOR_INELIGIBLE";

export interface AgentAuditEvent {
  at: string;
  agentId: AgentIdentityId;
  tenant: string;
  branch: string | null;
  capability: AgentCapability;
  decision: "allow" | "deny";
  denial?: AgentDenialCode;
}

export type AgentAuthorityDecision =
  | { allow: true; authority: AgentAuthority; audit: AgentAuditEvent }
  | { allow: false; denial: AgentDenialCode; audit: AgentAuditEvent };

export type AgentIdentityErrorCode =
  | "AGENT_DUPLICATE_ID"
  | "AGENT_CROSS_TENANT"
  | "AGENT_MALFORMED"
  | "AGENT_UNKNOWN_REFERENCE"
  | "AGENT_UNKNOWN_KIND"
  | "AGENT_CAPABILITY_UNKNOWN"
  | "AGENT_CAPABILITY_NOT_DELEGABLE"
  | "AGENT_CAPABILITY_ALREADY_GRANTED"
  | "AGENT_CAPABILITY_NOT_GRANTED"
  | "AGENT_TTL_EXCEEDED"
  | "AGENT_INVALID_WINDOW"
  | "AGENT_CREDENTIAL_REF_INVALID"
  | "AGENT_SPONSOR_INELIGIBLE"
  | "AGENT_SPONSOR_IS_AGENT"
  | "AGENT_INVALID_STATUS"
  | "AGENT_INVALID_TRANSITION"
  | "AGENT_MISSING_REASON"
  | "AGENT_IDEMPOTENCY_CONFLICT";

export class AgentIdentityError extends Error {
  code: AgentIdentityErrorCode;

  constructor(code: AgentIdentityErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

// The maximum lifetime of any agent identity. Bounded authority must be
// re-issued on a schedule instead of accumulating silently.
export const AGENT_MAX_TTL_MS = 90 * 24 * 60 * 60 * 1000;

// Opaque secret-manager references only. A raw token, key or credential value
// never satisfies this shape.
export const AGENT_CREDENTIAL_REF_PATTERN = /^secret:\/\/[^\s]+$/;

// Agents are never a Practitioner/PractitionerRole and never carry clinical or
// financial authority, so their actor names are namespaced and traceable.
export const AGENT_ACTOR_PREFIX = "agent:";

export interface HumanSponsorLookup {
  tenantId: string;
  accountId: string;
  asOf: string;
}

// Supplied by the caller from the trusted server-side membership registry. The
// collaboration layer never invents a human sponsor.
export interface HumanSponsorDirectory {
  isEligibleHumanSponsor(lookup: HumanSponsorLookup): boolean;
}

export interface AgentIdentityFilter {
  branchId?: string;
  status?: AgentIdentityStatus;
  kind?: AgentIdentityKind;
  humanSponsorAccountId?: string;
}

function isOneOf<T extends string>(allowed: readonly T[], value: string): value is T {
  return (allowed as readonly string[]).includes(value);
}

function requiredText(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function time(value: string): number {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    throw new AgentIdentityError("AGENT_MALFORMED", `unparseable timestamp: ${value}`);
  }
  return parsed;
}

function isReservedCapability(capability: string): boolean {
  const lower = capability.toLowerCase();
  return AGENT_RESERVED_CAPABILITY_PREFIXES.some(
    (prefix) => lower === prefix || lower.startsWith(`${prefix}.`) || lower.startsWith(`${prefix}:`) ||
      lower.startsWith(`${prefix}_`) || lower.startsWith(`${prefix}-`),
  );
}

export function assertGrantableCapability(capability: string): AgentCapability {
  if (isOneOf(AGENT_CAPABILITIES, capability)) return capability;
  if (isReservedCapability(capability)) {
    throw new AgentIdentityError(
      "AGENT_CAPABILITY_NOT_DELEGABLE",
      `capability namespace is reserved for typed operations or humans: ${capability}`,
    );
  }
  throw new AgentIdentityError("AGENT_CAPABILITY_UNKNOWN", `unsupported agent capability: ${capability}`);
}

export function resolvedStatus(identity: AgentIdentity, asOf: string): AgentResolvedStatus {
  if (identity.status === "revoked") return "revoked";
  if (identity.status === "suspended") return "suspended";
  if (time(asOf) >= time(identity.expiresAt)) return "expired";
  return "active";
}

export interface AgentTaskActor {
  kind: "automation";
  accountId: string;
}

// The single mapping from an agent identity to a W3 task-queue actor. It maps
// onto the existing "automation" actor kind so that W3's rule (automation may
// raise and comment on work, never resolve or cancel it) keeps applying to
// agents, and so no second authority path is created. The namespaced account id
// keeps the actor attributable to the agent identity in the audit trail.
export function agentTaskActor(identity: Pick<AgentIdentity, "id">): AgentTaskActor {
  return { kind: "automation", accountId: `${AGENT_ACTOR_PREFIX}${identity.id}` };
}

export class AgentIdentityStore {
  readonly identities = new Map<AgentIdentityId, AgentIdentity>();
  readonly events = new Map<string, AgentIdentityEvent>();

  // Derived capability state: last recorded action per (agent, capability).
  private readonly capabilityState = new Map<string, "granted" | "revoked">();
  private readonly idempotency = new Map<string, AgentIdentityId>();
  private readonly fingerprints = new Map<AgentIdentityId, string>();
  private eventCounter = 0;

  private fail(code: AgentIdentityErrorCode, message: string): never {
    throw new AgentIdentityError(code, message);
  }

  private checkTenant(recordTenant: string, scopeTenant: string): void {
    if (recordTenant !== scopeTenant) {
      this.fail("AGENT_CROSS_TENANT", `cross-tenant agent write: ${recordTenant} != ${scopeTenant}`);
    }
  }

  private requireIdentity(agentId: AgentIdentityId, scopeTenant: string): AgentIdentity {
    const identity = this.identities.get(agentId);
    if (!identity || identity.tenantId !== scopeTenant) {
      this.fail("AGENT_UNKNOWN_REFERENCE", `agent identity ${agentId}`);
    }
    return identity;
  }

  private requireActor(actor: AgentActor): void {
    if (!isOneOf(["human", "agent", "system"] as const, actor.kind) || !requiredText(actor.accountId)) {
      this.fail("AGENT_MALFORMED", "agent events need a named human, agent or system actor");
    }
  }

  private nextEventId(): string {
    this.eventCounter += 1;
    return `agent-identity-event-${this.eventCounter}`;
  }

  private record(event: Omit<AgentIdentityEvent, "id">, scopeTenant: string): AgentIdentityEvent {
    this.checkTenant(event.tenantId, scopeTenant);
    const stored: AgentIdentityEvent = { id: this.nextEventId(), ...event };
    this.events.set(stored.id, stored);
    return stored;
  }

  private fingerprint(input: AgentRegistrationInput): string {
    return JSON.stringify([
      input.branchId ?? null,
      input.displayName,
      input.kind,
      input.humanSponsorAccountId,
      input.effectiveFrom,
      input.expiresAt,
      input.credentialRef,
      input.correlationId ?? null,
    ]);
  }

  private capabilitiesHeld(agentId: AgentIdentityId, scopeTenant: string): AgentCapability[] {
    const held: AgentCapability[] = [];
    for (const capability of AGENT_CAPABILITIES) {
      const key = `${scopeTenant}:${agentId}:${capability}`;
      if (this.capabilityState.get(key) === "granted") held.push(capability);
    }
    return held;
  }

  register(
    input: AgentRegistrationInput,
    scopeTenant: string,
    sponsors: HumanSponsorDirectory,
  ): AgentIdentity {
    this.checkTenant(input.tenantId, scopeTenant);
    if (!requiredText(input.id) || !requiredText(input.displayName)) {
      this.fail("AGENT_MALFORMED", "agent identity id and displayName are required");
    }
    if (!isOneOf(AGENT_IDENTITY_KINDS, input.kind)) {
      this.fail("AGENT_UNKNOWN_KIND", `unsupported agent identity kind: ${input.kind}`);
    }
    if (!requiredText(input.humanSponsorAccountId)) {
      this.fail("AGENT_SPONSOR_INELIGIBLE", "an agent identity must name a human sponsor account");
    }
    if (input.humanSponsorAccountId.startsWith(AGENT_ACTOR_PREFIX)) {
      this.fail("AGENT_SPONSOR_IS_AGENT", "an agent identity cannot sponsor another agent identity");
    }
    if (!AGENT_CREDENTIAL_REF_PATTERN.test(input.credentialRef ?? "")) {
      this.fail(
        "AGENT_CREDENTIAL_REF_INVALID",
        "credentialRef must be an opaque secret-manager reference (secret://...)",
      );
    }
    const from = time(input.effectiveFrom);
    const until = time(input.expiresAt);
    if (until <= from) {
      this.fail("AGENT_INVALID_WINDOW", "agent identity expiry must be after its effective time");
    }
    if (until - from > AGENT_MAX_TTL_MS) {
      this.fail("AGENT_TTL_EXCEEDED", "agent identity lifetime exceeds the maximum bounded TTL");
    }

    const idempotencyKey = input.idempotencyKey ?? null;
    const fingerprint = this.fingerprint(input);
    if (idempotencyKey !== null) {
      if (!requiredText(idempotencyKey)) {
        this.fail("AGENT_MALFORMED", "idempotencyKey must not be blank");
      }
      const existingId = this.idempotency.get(`${scopeTenant}:${idempotencyKey}`);
      if (existingId !== undefined) {
        if (this.fingerprints.get(existingId) !== fingerprint) {
          this.fail(
            "AGENT_IDEMPOTENCY_CONFLICT",
            `agent idempotency key reused with different content: ${idempotencyKey}`,
          );
        }
        return this.identities.get(existingId) as AgentIdentity;
      }
    }

    // Sponsor eligibility is checked only for a genuinely new identity so that a
    // retry after a timeout cannot fail or duplicate work.
    if (!sponsors.isEligibleHumanSponsor({
      tenantId: scopeTenant,
      accountId: input.humanSponsorAccountId,
      asOf: input.effectiveFrom,
    })) {
      this.fail(
        "AGENT_SPONSOR_INELIGIBLE",
        `human sponsor ${input.humanSponsorAccountId} has no active membership in ${scopeTenant}`,
      );
    }
    if (this.identities.has(input.id)) {
      this.fail("AGENT_DUPLICATE_ID", `duplicate agent identity id: ${input.id}`);
    }

    const identity: AgentIdentity = {
      id: input.id,
      tenantId: input.tenantId,
      branchId: input.branchId ?? null,
      displayName: input.displayName.trim(),
      kind: input.kind,
      status: "active",
      humanSponsorAccountId: input.humanSponsorAccountId,
      effectiveFrom: input.effectiveFrom,
      expiresAt: input.expiresAt,
      credentialRef: input.credentialRef,
      credentialRotatedAt: null,
      revokedAt: null,
      revocationReason: null,
      correlationId: input.correlationId ?? null,
      idempotencyKey,
      provenance: input.provenance,
      createdAt: input.effectiveFrom,
      updatedAt: input.effectiveFrom,
    };
    this.identities.set(identity.id, identity);
    this.fingerprints.set(identity.id, fingerprint);
    if (idempotencyKey !== null) this.idempotency.set(`${scopeTenant}:${idempotencyKey}`, identity.id);
    this.record(
      {
        tenantId: scopeTenant,
        agentId: identity.id,
        action: "created",
        capability: null,
        actor: { kind: "human", accountId: input.humanSponsorAccountId },
        reason: `sponsored by ${input.humanSponsorAccountId}`,
        occurredAt: input.effectiveFrom,
      },
      scopeTenant,
    );
    return identity;
  }

  grantCapability(
    agentId: AgentIdentityId,
    capability: string,
    actor: AgentActor,
    scopeTenant: string,
    options: { at: string; reason?: string },
  ): AgentIdentity {
    const identity = this.requireIdentity(agentId, scopeTenant);
    if (identity.status === "revoked") {
      this.fail("AGENT_INVALID_TRANSITION", "a revoked agent identity cannot be granted new authority");
    }
    this.requireActor(actor);
    const granted = assertGrantableCapability(capability);
    const key = `${scopeTenant}:${agentId}:${granted}`;
    if (this.capabilityState.get(key) === "granted") {
      this.fail("AGENT_CAPABILITY_ALREADY_GRANTED", `agent already holds ${granted}`);
    }
    this.capabilityState.set(key, "granted");
    const updated: AgentIdentity = { ...identity, updatedAt: options.at };
    this.identities.set(agentId, updated);
    this.record(
      {
        tenantId: scopeTenant,
        agentId,
        action: "capability_granted",
        capability: granted,
        actor,
        reason: options.reason ?? "",
        occurredAt: options.at,
      },
      scopeTenant,
    );
    return updated;
  }

  revokeCapability(
    agentId: AgentIdentityId,
    capability: string,
    actor: AgentActor,
    scopeTenant: string,
    options: { at: string; reason: string },
  ): AgentIdentity {
    const identity = this.requireIdentity(agentId, scopeTenant);
    this.requireActor(actor);
    const granted = assertGrantableCapability(capability);
    const key = `${scopeTenant}:${agentId}:${granted}`;
    if (this.capabilityState.get(key) !== "granted") {
      this.fail("AGENT_CAPABILITY_NOT_GRANTED", `agent does not hold ${granted}`);
    }
    if (!requiredText(options.reason)) {
      this.fail("AGENT_MISSING_REASON", "revoking agent authority requires a recorded reason");
    }
    this.capabilityState.set(key, "revoked");
    const updated: AgentIdentity = { ...identity, updatedAt: options.at };
    this.identities.set(agentId, updated);
    this.record(
      {
        tenantId: scopeTenant,
        agentId,
        action: "capability_revoked",
        capability: granted,
        actor,
        reason: options.reason,
        occurredAt: options.at,
      },
      scopeTenant,
    );
    return updated;
  }

  suspend(
    agentId: AgentIdentityId,
    actor: AgentActor,
    scopeTenant: string,
    options: { at: string; reason: string },
  ): AgentIdentity {
    const identity = this.requireIdentity(agentId, scopeTenant);
    this.requireActor(actor);
    if (identity.status !== "active") {
      this.fail("AGENT_INVALID_TRANSITION", `cannot suspend a ${identity.status} agent identity`);
    }
    if (!requiredText(options.reason)) {
      this.fail("AGENT_MISSING_REASON", "suspending an agent identity requires a recorded reason");
    }
    const updated: AgentIdentity = { ...identity, status: "suspended", updatedAt: options.at };
    this.identities.set(agentId, updated);
    this.record(
      {
        tenantId: scopeTenant,
        agentId,
        action: "suspended",
        capability: null,
        actor,
        reason: options.reason,
        occurredAt: options.at,
      },
      scopeTenant,
    );
    return updated;
  }

  reactivate(
    agentId: AgentIdentityId,
    actor: AgentActor,
    scopeTenant: string,
    options: { at: string; reason: string },
  ): AgentIdentity {
    const identity = this.requireIdentity(agentId, scopeTenant);
    this.requireActor(actor);
    if (identity.status !== "suspended") {
      this.fail("AGENT_INVALID_TRANSITION", `cannot reactivate a ${identity.status} agent identity`);
    }
    if (!requiredText(options.reason)) {
      this.fail("AGENT_MISSING_REASON", "reactivating an agent identity requires a recorded reason");
    }
    const updated: AgentIdentity = { ...identity, status: "active", updatedAt: options.at };
    this.identities.set(agentId, updated);
    this.record(
      {
        tenantId: scopeTenant,
        agentId,
        action: "reactivated",
        capability: null,
        actor,
        reason: options.reason,
        occurredAt: options.at,
      },
      scopeTenant,
    );
    return updated;
  }

  revoke(
    agentId: AgentIdentityId,
    actor: AgentActor,
    scopeTenant: string,
    options: { at: string; reason: string },
  ): AgentIdentity {
    const identity = this.requireIdentity(agentId, scopeTenant);
    this.requireActor(actor);
    if (identity.status === "revoked") {
      this.fail("AGENT_INVALID_TRANSITION", "agent identity is already revoked");
    }
    if (!requiredText(options.reason)) {
      this.fail("AGENT_MISSING_REASON", "revoking an agent identity requires a recorded reason");
    }
    const updated: AgentIdentity = {
      ...identity,
      status: "revoked",
      revokedAt: options.at,
      revocationReason: options.reason,
      updatedAt: options.at,
    };
    this.identities.set(agentId, updated);
    this.record(
      {
        tenantId: scopeTenant,
        agentId,
        action: "revoked",
        capability: null,
        actor,
        reason: options.reason,
        occurredAt: options.at,
      },
      scopeTenant,
    );
    return updated;
  }

  // Secret rotation replaces the referenced material without rewriting identity
  // or event history: only a new opaque reference and a rotation timestamp move.
  rotateCredential(
    agentId: AgentIdentityId,
    nextCredentialRef: string,
    actor: AgentActor,
    scopeTenant: string,
    options: { at: string; reason?: string },
  ): AgentIdentity {
    const identity = this.requireIdentity(agentId, scopeTenant);
    this.requireActor(actor);
    if (identity.status === "revoked") {
      this.fail("AGENT_INVALID_TRANSITION", "a revoked agent identity cannot rotate credentials");
    }
    if (!AGENT_CREDENTIAL_REF_PATTERN.test(nextCredentialRef ?? "")) {
      this.fail(
        "AGENT_CREDENTIAL_REF_INVALID",
        "rotated credentialRef must be an opaque secret-manager reference (secret://...)",
      );
    }
    const updated: AgentIdentity = {
      ...identity,
      credentialRef: nextCredentialRef,
      credentialRotatedAt: options.at,
      updatedAt: options.at,
    };
    this.identities.set(agentId, updated);
    this.record(
      {
        tenantId: scopeTenant,
        agentId,
        action: "credential_rotated",
        capability: null,
        actor,
        reason: options.reason ?? "",
        occurredAt: options.at,
      },
      scopeTenant,
    );
    return updated;
  }

  // Deny-by-default evaluation. This is the only supported way for an
  // operational surface to decide whether an agent identity may act.
  resolveAuthority(
    agentId: AgentIdentityId,
    scopeTenant: string,
    request: AgentAuthorityRequest,
    sponsors: HumanSponsorDirectory,
  ): AgentAuthorityDecision {
    const capability = request.capability;
    const audit = (
      decision: "allow" | "deny",
      denial?: AgentDenialCode,
    ): AgentAuditEvent => ({
      at: request.at,
      agentId,
      tenant: scopeTenant,
      branch: request.branchId,
      capability,
      decision,
      denial,
    });
    const deny = (denial: AgentDenialCode): AgentAuthorityDecision => ({
      allow: false,
      denial,
      audit: audit("deny", denial),
    });

    const identity = this.identities.get(agentId);
    if (!identity) return deny("AGENT_UNKNOWN");
    if (identity.tenantId !== scopeTenant) return deny("AGENT_CROSS_TENANT");
    if (!isOneOf(AGENT_CAPABILITIES, capability)) return deny("AGENT_CAPABILITY_DENIED");

    const status = resolvedStatus(identity, request.at);
    if (status === "revoked") return deny("AGENT_REVOKED");
    if (status === "suspended") return deny("AGENT_SUSPENDED");
    if (status === "expired") return deny("AGENT_EXPIRED");
    if (time(request.at) < time(identity.effectiveFrom)) return deny("AGENT_NOT_YET_EFFECTIVE");

    // A branch-scoped identity is confined to its branch. A tenant-wide identity
    // (branchId === null) may act on any branch of its own tenant. As with
    // `authorize()` in @zyara/authorization, `request.branchId` is the branch of
    // an already-resolved resource: the calling typed operation resolves and
    // validates that branch inside the tenant before policy is evaluated, so this
    // function never mints a branch that does not exist.
    if (identity.branchId !== null && request.branchId !== identity.branchId) {
      return deny("AGENT_CROSS_BRANCH");
    }

    if (this.capabilityState.get(`${scopeTenant}:${agentId}:${capability}`) !== "granted") {
      return deny("AGENT_CAPABILITY_DENIED");
    }

    // Sponsor liveness is evaluated at action time: an agent whose sponsor has
    // left the tenant stops acting, even before an administrator reacts.
    if (!sponsors.isEligibleHumanSponsor({
      tenantId: scopeTenant,
      accountId: identity.humanSponsorAccountId,
      asOf: request.at,
    })) {
      return deny("AGENT_SPONSOR_INELIGIBLE");
    }

    return {
      allow: true,
      authority: {
        agentId,
        tenantId: identity.tenantId,
        branchId: request.branchId,
        capability,
        humanSponsorAccountId: identity.humanSponsorAccountId,
        expiresAt: identity.expiresAt,
        at: request.at,
      },
      audit: audit("allow"),
    };
  }

  capabilitiesOf(agentId: AgentIdentityId, scopeTenant: string): AgentCapability[] {
    this.requireIdentity(agentId, scopeTenant);
    return this.capabilitiesHeld(agentId, scopeTenant);
  }

  listIdentities(scopeTenant: string, filter: AgentIdentityFilter = {}): AgentIdentity[] {
    return [...this.identities.values()].filter(
      (identity) =>
        identity.tenantId === scopeTenant &&
        (filter.branchId === undefined || identity.branchId === filter.branchId) &&
        (filter.status === undefined || identity.status === filter.status) &&
        (filter.kind === undefined || identity.kind === filter.kind) &&
        (filter.humanSponsorAccountId === undefined ||
          identity.humanSponsorAccountId === filter.humanSponsorAccountId),
    );
  }

  listEvents(agentId: AgentIdentityId, scopeTenant: string): AgentIdentityEvent[] {
    this.requireIdentity(agentId, scopeTenant);
    return [...this.events.values()].filter(
      (event) => event.agentId === agentId && event.tenantId === scopeTenant,
    );
  }
}
