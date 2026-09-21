// Zyara Network N5/C2: derived human + agent operational activity.
//
// Concept donor reference: block/buzz (Apache-2.0), unified event/activity stream
// and human/agent membership in one workspace. No Buzz source is copied into this
// file and no Nostr event model is adopted.
//
// Activity is a *projection*, never authority. This module derives an operational
// activity record from an already-recorded authoritative domain event. It holds no
// reference to any domain store, so there is no path from activity back into
// appointments, encounters, prescriptions, orders, results, claims, payments,
// eligibility, authorizations, staff authority or patient clinical facts.
//
// Privacy posture (see docs/evidence/N5/C2/JEV_REVIEW.md):
//   * no record stores prose: only closed-enum codes, opaque references, small
//     integers and timestamps;
//   * stored references are minted here as deterministic tenant-scoped pseudonyms,
//     so a caller-supplied identifier is never written verbatim;
//   * readable titles are derived from the closed enumerations at read time;
//   * sensitivity class and visibility scope are separate, so an operations reader
//     is not silently granted clinical detail.

export type ActivityActorKind = "human" | "agent" | "system" | "external";
export const ACTIVITY_ACTOR_KINDS = ["human", "agent", "system", "external"] as const;

// Closed source registry. A source domain that is not listed here cannot be
// projected at all, which is what keeps unknown or unqualified event sources out
// of the operational feed. Clinical domains are deliberately absent in this slice.
export type ActivitySourceDomain =
  | "workforce.tasks"
  | "identity.agents"
  | "communications.whatsapp"
  | "collaboration.approvals"
  | "collaboration.exceptions";
export const ACTIVITY_SOURCE_DOMAINS = [
  "workforce.tasks",
  "identity.agents",
  "communications.whatsapp",
  "collaboration.approvals",
  "collaboration.exceptions",
] as const;

export type ActivityCategory =
  | "task"
  | "agent_identity"
  | "communication"
  | "approval"
  | "exception";
export const ACTIVITY_CATEGORIES = [
  "task",
  "agent_identity",
  "communication",
  "approval",
  "exception",
] as const;

export type ActivityAction =
  | "created"
  | "assigned"
  | "transitioned"
  | "commented"
  | "capability_granted"
  | "capability_revoked"
  | "suspended"
  | "reactivated"
  | "revoked"
  | "credential_rotated"
  | "received"
  | "observed"
  | "proposed"
  | "approval_requested"
  | "approved"
  | "rejected"
  | "expired"
  | "superseded"
  | "cancelled"
  | "execution_attempted"
  | "execution_succeeded"
  | "execution_failed"
  | "execution_unknown"
  | "needs_human"
  | "opened"
  | "escalated"
  | "resolved"
  | "closed";
export const ACTIVITY_ACTIONS = [
  "created",
  "assigned",
  "transitioned",
  "commented",
  "capability_granted",
  "capability_revoked",
  "suspended",
  "reactivated",
  "revoked",
  "credential_rotated",
  "received",
  "observed",
  "proposed",
  "approval_requested",
  "approved",
  "rejected",
  "expired",
  "superseded",
  "cancelled",
  "execution_attempted",
  "execution_succeeded",
  "execution_failed",
  "execution_unknown",
  "needs_human",
  "opened",
  "escalated",
  "resolved",
  "closed",
] as const;

export type ActivityResult =
  | "proposed"
  | "observed"
  | "succeeded"
  | "failed"
  | "denied"
  | "rejected"
  | "expired"
  | "unresolved";
export const ACTIVITY_RESULTS = [
  "proposed",
  "observed",
  "succeeded",
  "failed",
  "denied",
  "rejected",
  "expired",
  "unresolved",
] as const;

// Subject references stay inside the operational universe owned by Zyara. A
// clinical subject type is not expressible here.
export type ActivitySubjectType =
  | "none"
  | "task"
  | "agent_identity"
  | "staff_assignment"
  | "facility"
  | "conversation"
  | "approval_request"
  | "exception_case";
export const ACTIVITY_SUBJECT_TYPES = [
  "none",
  "task",
  "agent_identity",
  "staff_assignment",
  "facility",
  "conversation",
  "approval_request",
  "exception_case",
] as const;

export type ActivitySensitivity = "operational" | "restricted";
export const ACTIVITY_SENSITIVITY_CLASSES = ["operational", "restricted"] as const;

export type ActivityVisibility = "tenant" | "branch" | "workflow" | "private";
export const ACTIVITY_VISIBILITY_SCOPES = ["tenant", "branch", "workflow", "private"] as const;

// Derived authority annotation. "not_applicable" is used for every non-agent actor.
export type ActivityActorAuthority =
  | "active"
  | "suspended"
  | "revoked"
  | "expired"
  | "not_applicable";
export const ACTIVITY_ACTOR_AUTHORITIES = [
  "active",
  "suspended",
  "revoked",
  "expired",
  "not_applicable",
] as const;

// Closed payload allow-list. A payload key outside this list is refused, and each
// enum-valued key has its own closed vocabulary. Numeric keys accept small integers.
export const ACTIVITY_PAYLOAD_KEYS = [
  "channel",
  "provider",
  "attempt",
  "count",
  "taskKind",
  "previousValue",
  "newValue",
  "originKind",
  "riskClass",
  "requiredAuthority",
  "approvalStatus",
  "executionOutcome",
  "exceptionKind",
  "exceptionSeverity",
  "exceptionStatus",
  "workItemStatus",
] as const;
export type ActivityPayloadKey = (typeof ACTIVITY_PAYLOAD_KEYS)[number];

export const ACTIVITY_PAYLOAD_ENUMS: Record<string, readonly string[]> = {
  channel: ["whatsapp", "email", "sms", "push", "in_app", "secure_message"],
  provider: ["meta", "synthetic", "none"],
  taskKind: [
    "facility_helpdesk",
    "it_access",
    "referral_follow_up",
    "prior_auth_exception",
    "refill_routing",
    "result_review",
    "automation_handoff",
  ],
  originKind: ["human", "automation"],
  previousValue: [
    "open",
    "in_progress",
    "blocked",
    "resolved",
    "cancelled",
    "none",
  ],
  newValue: ["open", "in_progress", "blocked", "resolved", "cancelled", "none"],
  riskClass: ["routine", "elevated", "high", "critical"],
  requiredAuthority: ["branch_admin", "org_admin", "clinical_lead", "compliance_officer"],
  approvalStatus: [
    "proposed",
    "awaiting_approval",
    "approved",
    "rejected",
    "expired",
    "cancelled",
    "superseded",
    "executing",
    "succeeded",
    "failed",
    "needs_human",
  ],
  executionOutcome: ["attempted", "succeeded", "failed", "unknown"],
  exceptionKind: [
    "ambiguous_patient_request",
    "missing_consent",
    "unavailable_authority",
    "conflicting_provider_data",
    "whatsapp_delivery_failure",
    "external_provider_timeout",
    "insurer_ambiguity",
    "prior_auth_mismatch",
    "stale_schedule",
    "duplicate_identity_ambiguity",
    "low_confidence_automation",
    "policy_refusal",
    "reconciliation_failure",
    "unknown_external_outcome",
    "approval_outcome_unknown",
  ],
  exceptionSeverity: ["low", "medium", "high", "critical"],
  exceptionStatus: [
    "open",
    "assigned",
    "in_review",
    "escalated",
    "resolved",
    "closed",
    "cancelled",
  ],
  workItemStatus: ["open", "in_progress", "blocked", "resolved", "cancelled"],
};

export const ACTIVITY_NUMERIC_PAYLOAD_KEYS = ["attempt", "count"] as const;
export const ACTIVITY_PAYLOAD_MAX_KEYS = 8;

// Only these (source domain, category, action) triples may be derived, so a source
// cannot smuggle an unrelated action into the feed. Clinical domains are absent.
export const ACTIVITY_SOURCE_RULES: Record<
  ActivitySourceDomain,
  { category: ActivityCategory; actions: readonly ActivityAction[] }
> = {
  "workforce.tasks": {
    category: "task",
    actions: ["created", "assigned", "transitioned", "commented"],
  },
  "identity.agents": {
    category: "agent_identity",
    actions: [
      "created",
      "capability_granted",
      "capability_revoked",
      "suspended",
      "reactivated",
      "revoked",
      "credential_rotated",
    ],
  },
  "communications.whatsapp": {
    category: "communication",
    actions: ["received", "observed"],
  },
  "collaboration.approvals": {
    category: "approval",
    actions: [
      "proposed",
      "approval_requested",
      "approved",
      "rejected",
      "expired",
      "superseded",
      "cancelled",
      "execution_attempted",
      "execution_succeeded",
      "execution_failed",
      "execution_unknown",
      "needs_human",
    ],
  },
  "collaboration.exceptions": {
    category: "exception",
    actions: ["opened", "assigned", "escalated", "resolved", "closed", "transitioned"],
  },
};

// Read-time titles. Nothing here is stored, so a feed title can never carry
// patient text, a clinical narrative or a provider message body.
const ACTIVITY_TITLES: Record<string, string> = {
  "task:created": "Operational task created",
  "task:assigned": "Operational task assigned",
  "task:transitioned": "Operational task status changed",
  "task:commented": "Operational task comment recorded",
  "agent_identity:created": "Bounded agent identity registered",
  "agent_identity:capability_granted": "Agent capability granted",
  "agent_identity:capability_revoked": "Agent capability revoked",
  "agent_identity:suspended": "Agent identity suspended",
  "agent_identity:reactivated": "Agent identity reactivated",
  "agent_identity:revoked": "Agent identity revoked",
  "agent_identity:credential_rotated": "Agent credential reference rotated",
  "communication:received": "Inbound message metadata received",
  "communication:observed": "Communication event observed",
  "approval:proposed": "Protected action proposed",
  "approval:approval_requested": "Human approval requested",
  "approval:approved": "Protected action approved",
  "approval:rejected": "Protected action rejected",
  "approval:expired": "Protected action approval expired",
  "approval:superseded": "Protected action approval superseded",
  "approval:cancelled": "Protected action approval cancelled",
  "approval:execution_attempted": "Protected action execution attempted",
  "approval:execution_succeeded": "Protected action execution succeeded",
  "approval:execution_failed": "Protected action execution failed",
  "approval:execution_unknown": "Protected action outcome unknown",
  "approval:needs_human": "Protected action handed to a human",
  "exception:opened": "Human exception case opened",
  "exception:assigned": "Human exception case assigned",
  "exception:escalated": "Human exception case escalated",
  "exception:resolved": "Human exception case resolved",
  "exception:closed": "Human exception case closed",
};

export function activityTitle(record: Pick<ActivityRecord, "category" | "action">): string {
  return ACTIVITY_TITLES[`${record.category}:${record.action}`] ?? `${record.category} ${record.action}`;
}

// Reference shapes. A stored reference is always `<prefix>_<hex>`; a source-owned
// metadata string is always a bounded reference token. Whitespace, "@" and "+" are
// outside both alphabets, so an email address or an international phone number can
// never be written, and a long digit run (a national id or phone number) is refused.
export const ACTIVITY_REFERENCE_PATTERN = /^[a-z]+_[0-9a-f]{16,64}$/;
export const ACTIVITY_METADATA_TOKEN_PATTERN = /^[A-Za-z0-9_.:-]{1,128}$/;
const ACTIVITY_DIRECT_IDENTIFIER_PATTERNS = [/^[0-9]{7,}$/, /[0-9]{9,}/];

// Credential material must never appear in a stored activity record at all.
const ACTIVITY_SECRET_PATTERNS = [
  /secret:\/\//i,
  /bearer\s/i,
  /api[_-]?key/i,
  /access[_-]?token/i,
  /refresh[_-]?token/i,
  /app[_-]?secret/i,
  /verify[_-]?token/i,
  /private[_-]?key/i,
  /password/i,
  /passwd/i,
  /credential/i,
  /authorization/i,
  /eaag/i,
  /begin [a-z ]*private key/i,
];

export interface ActivityProvenance {
  source: "zyara-native" | "donor-adapted";
  sourceRef: string;
  sourceRevision: string;
  observedAt: string;
}

export interface ActivityActorInput {
  kind: string;
  // Server-authoritative account id for a human actor.
  accountId?: string | null;
  // C1 bounded agent identity for an agent actor.
  agentIdentityId?: string | null;
  // Namespaced reference for a system or external actor.
  actorRef?: string | null;
}

export interface ActivityProjectionInput {
  id: string;
  tenantId: string;
  branchId?: string | null;
  actor: ActivityActorInput;
  sourceDomain: string;
  sourceEventId: string;
  sourceEventVersion?: number;
  projectionVersion?: number;
  category: string;
  action: string;
  result: string;
  subjectType?: string;
  // Internal, source-owned identifier. It is pseudonymised before storage; the raw
  // value never reaches a column.
  subjectId?: string | null;
  sensitivity?: string;
  visibilityScope?: string;
  correlationId?: string | null;
  occurredAt: string;
  payload?: Record<string, string | number>;
  supersedesActivityId?: string | null;
  provenance: ActivityProvenance;
}

export interface ActivityRecord {
  id: string;
  tenantId: string;
  branchId: string | null;
  actorKind: ActivityActorKind;
  actorAccountId: string | null;
  actorAgentId: string | null;
  actorRef: string;
  actorAuthority: ActivityActorAuthority;
  sourceDomain: ActivitySourceDomain;
  sourceEventId: string;
  sourceEventVersion: number;
  projectionVersion: number;
  category: ActivityCategory;
  action: ActivityAction;
  result: ActivityResult;
  subjectType: ActivitySubjectType;
  subjectRef: string | null;
  sensitivity: ActivitySensitivity;
  visibilityScope: ActivityVisibility;
  correlationId: string | null;
  occurredAt: string;
  recordedAt: string;
  payload: Readonly<Record<string, string | number>>;
  supersedesActivityId: string | null;
  sourceRef: string;
  sourceRevision: string;
}

export interface ActivityProjectionOutcome {
  record: ActivityRecord;
  replayed: boolean;
}

export interface ActivityReadFilter {
  branchId?: string;
  category?: string;
  actorKind?: string;
  subjectType?: string;
  subjectRef?: string;
  since?: string;
  until?: string;
  limit?: number;
}

// The audience a read surface has already established for the caller. `tenantWide`
// and `branchIds` come from the server-side membership registry, never from a body.
export interface ActivityReadAudience {
  tenantId: string;
  accountId: string;
  tenantWide: boolean;
  branchIds: readonly string[];
  // True only for a caller holding an authorized clinical role. Operational readers
  // must not receive `restricted` activity.
  allowRestricted: boolean;
}

// Resolves a C1 agent identity to its authority state at a point in time. Supplied
// by the caller from the trusted collaboration registry; this layer never invents it.
export interface ActivityAgentDirectory {
  resolveAuthorityState(
    tenantId: string,
    agentIdentityId: string,
    asOf: string,
  ): ActivityActorAuthority | null;
}

export type ActivityErrorCode =
  | "ACTIVITY_CROSS_TENANT"
  | "ACTIVITY_MALFORMED"
  | "ACTIVITY_UNKNOWN_SOURCE_DOMAIN"
  | "ACTIVITY_UNSUPPORTED_ACTOR_TYPE"
  | "ACTIVITY_UNKNOWN_AGENT_IDENTITY"
  | "ACTIVITY_SOURCE_MISMATCH"
  | "ACTIVITY_INVALID_SUBJECT"
  | "ACTIVITY_PAYLOAD_INVALID"
  | "ACTIVITY_PAYLOAD_SECRET_REFUSED"
  | "ACTIVITY_MISSING_PROVENANCE"
  | "ACTIVITY_DUPLICATE_ID"
  | "ACTIVITY_IDEMPOTENCY_CONFLICT"
  | "ACTIVITY_UNKNOWN_REFERENCE"
  | "ACTIVITY_RESTRICTED_DENIED"
  | "ACTIVITY_VISIBILITY_DENIED";

export class ActivityError extends Error {
  code: ActivityErrorCode;

  constructor(code: ActivityErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

function isOneOf<T extends string>(allowed: readonly T[], value: string): value is T {
  return (allowed as readonly string[]).includes(value);
}

function requiredText(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

// A source-owned metadata string is acceptable as an activity token only when it is
// a bounded reference shape, is not an unqualified direct identifier, and carries no
// credential material. Read surfaces and source adapters reuse this predicate so no
// caller-supplied value sneaks into a stored reference column.
export function isActivityToken(value: unknown): boolean {
  if (typeof value !== "string" || value.length === 0) return false;
  if (!ACTIVITY_METADATA_TOKEN_PATTERN.test(value)) return false;
  if (ACTIVITY_DIRECT_IDENTIFIER_PATTERNS.some((pattern) => pattern.test(value))) return false;
  if (ACTIVITY_SECRET_PATTERNS.some((pattern) => pattern.test(value))) return false;
  return true;
}

function assertToken(value: string, label: string): string {
  if (!ACTIVITY_METADATA_TOKEN_PATTERN.test(value)) {
    throw new ActivityError(
      "ACTIVITY_MALFORMED",
      `${label} must be a bounded reference token`,
    );
  }
  if (ACTIVITY_DIRECT_IDENTIFIER_PATTERNS.some((pattern) => pattern.test(value))) {
    throw new ActivityError(
      "ACTIVITY_MALFORMED",
      `${label} must not be an unqualified direct identifier`,
    );
  }
  if (ACTIVITY_SECRET_PATTERNS.some((pattern) => pattern.test(value))) {
    throw new ActivityError(
      "ACTIVITY_PAYLOAD_SECRET_REFUSED",
      `${label} must not carry credential material`,
    );
  }
  return value;
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...digest].map((part) => part.toString(16).padStart(2, "0")).join("");
}

// Deterministic, tenant-scoped pseudonym. The raw identifier is never stored, so no
// caller-supplied identifier can appear verbatim in an activity record, and the same
// subject stays correlatable inside one tenant.
export async function activityPseudonym(
  prefix: string,
  tenantId: string,
  referenceKind: string,
  internalId: string,
): Promise<string> {
  const digest = await sha256Hex(`${tenantId}\u0000${referenceKind}\u0000${internalId}`);
  return `${prefix}_${digest}`;
}

function normalizePayload(payload: Record<string, string | number> | undefined): Record<string, string | number> {
  if (!payload) return {};
  const keys = Object.keys(payload);
  if (keys.length > ACTIVITY_PAYLOAD_MAX_KEYS) {
    throw new ActivityError("ACTIVITY_PAYLOAD_INVALID", "activity payload has too many keys");
  }
  const normalized: Record<string, string | number> = {};
  for (const key of keys) {
    if (!(ACTIVITY_PAYLOAD_KEYS as readonly string[]).includes(key)) {
      throw new ActivityError(
        "ACTIVITY_PAYLOAD_INVALID",
        `activity payload key is not in the closed allow-list: ${key}`,
      );
    }
    const value = payload[key];
    if ((ACTIVITY_NUMERIC_PAYLOAD_KEYS as readonly string[]).includes(key)) {
      if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 100000) {
        throw new ActivityError(
          "ACTIVITY_PAYLOAD_INVALID",
          `activity payload key ${key} accepts a small non-negative integer only`,
        );
      }
      normalized[key] = value;
      continue;
    }
    if (typeof value !== "string") {
      throw new ActivityError(
        "ACTIVITY_PAYLOAD_INVALID",
        `activity payload key ${key} accepts a closed enum code only`,
      );
    }
    const vocabulary = ACTIVITY_PAYLOAD_ENUMS[key];
    if (vocabulary && !vocabulary.includes(value)) {
      throw new ActivityError(
        "ACTIVITY_PAYLOAD_INVALID",
        `activity payload key ${key} does not accept the value ${value}`,
      );
    }
    if (ACTIVITY_SECRET_PATTERNS.some((pattern) => pattern.test(value))) {
      throw new ActivityError(
        "ACTIVITY_PAYLOAD_SECRET_REFUSED",
        `activity payload key ${key} must not carry credential material`,
      );
    }
    normalized[key] = value;
  }
  return normalized;
}

export class ActivityStore {
  readonly records = new Map<string, ActivityRecord>();

  // Dedupe key: one derived activity record per (tenant, source domain, source event
  // id, projection version), so at-least-once delivery is deterministic.
  private readonly sourceKeys = new Map<string, string>();
  private readonly fingerprints = new Map<string, string>();

  private fail(code: ActivityErrorCode, message: string): never {
    throw new ActivityError(code, message);
  }

  private requireRecord(id: string, scopeTenant: string): ActivityRecord {
    const record = this.records.get(id);
    if (!record || record.tenantId !== scopeTenant) {
      this.fail("ACTIVITY_UNKNOWN_REFERENCE", `activity record ${id}`);
    }
    return record;
  }

  private fingerprint(record: Omit<ActivityRecord, "recordedAt">): string {
    return JSON.stringify([
      record.tenantId,
      record.branchId,
      record.actorKind,
      record.actorAccountId,
      record.actorAgentId,
      record.actorRef,
      record.actorAuthority,
      record.sourceDomain,
      record.sourceEventId,
      record.sourceEventVersion,
      record.projectionVersion,
      record.category,
      record.action,
      record.result,
      record.subjectType,
      record.subjectRef,
      record.sensitivity,
      record.visibilityScope,
      record.correlationId,
      record.occurredAt,
      record.payload,
      record.supersedesActivityId,
      record.sourceRef,
      record.sourceRevision,
    ]);
  }

  async record(
    input: ActivityProjectionInput,
    scopeTenant: string,
    agents: ActivityAgentDirectory,
  ): Promise<ActivityProjectionOutcome> {
    if (input.tenantId !== scopeTenant) {
      this.fail("ACTIVITY_CROSS_TENANT", `cross-tenant activity projection: ${input.tenantId}`);
    }
    if (!requiredText(input.id) || !requiredText(input.sourceEventId) || !requiredText(input.occurredAt)) {
      this.fail("ACTIVITY_MALFORMED", "activity id, sourceEventId and occurredAt are required");
    }
    if (Number.isNaN(Date.parse(input.occurredAt))) {
      this.fail("ACTIVITY_MALFORMED", "activity occurredAt must be an ISO timestamp");
    }
    if (!input.provenance || !requiredText(input.provenance.sourceRef) ||
      !requiredText(input.provenance.sourceRevision) || !requiredText(input.provenance.observedAt)) {
      this.fail(
        "ACTIVITY_MISSING_PROVENANCE",
        "activity projection requires sourceRef, sourceRevision and observedAt provenance",
      );
    }

    // Closed source registry, checked before anything else so an unqualified source
    // cannot reach storage even with an otherwise valid shape.
    if (!isOneOf(ACTIVITY_SOURCE_DOMAINS, input.sourceDomain)) {
      this.fail(
        "ACTIVITY_UNKNOWN_SOURCE_DOMAIN",
        `source domain is not in the closed registry: ${input.sourceDomain}`,
      );
    }
    const sourceDomain = input.sourceDomain;
    const rule = ACTIVITY_SOURCE_RULES[sourceDomain];
    if (input.category !== rule.category || !isOneOf(rule.actions, input.action)) {
      this.fail(
        "ACTIVITY_SOURCE_MISMATCH",
        `${sourceDomain} cannot derive ${input.category}/${input.action}`,
      );
    }
    if (!isOneOf(ACTIVITY_RESULTS, input.result)) {
      this.fail("ACTIVITY_MALFORMED", `unsupported activity result: ${input.result}`);
    }

    const projectionVersion = input.projectionVersion ?? 1;
    if (!Number.isInteger(projectionVersion) || projectionVersion !== 1) {
      this.fail("ACTIVITY_MALFORMED", "only projectionVersion 1 is supported");
    }
    const sourceEventVersion = input.sourceEventVersion ?? 1;
    if (!Number.isInteger(sourceEventVersion) || sourceEventVersion < 1) {
      this.fail("ACTIVITY_MALFORMED", "sourceEventVersion must be a positive integer");
    }

    // Actor model: an explicit, closed actor kind. A free-text actor name can never
    // satisfy it.
    if (!isOneOf(ACTIVITY_ACTOR_KINDS, input.actor.kind)) {
      this.fail(
        "ACTIVITY_UNSUPPORTED_ACTOR_TYPE",
        `unsupported activity actor kind: ${input.actor.kind}`,
      );
    }
    const actorKind = input.actor.kind;
    let actorAccountId: string | null = null;
    let actorAgentId: string | null = null;
    let actorAuthority: ActivityActorAuthority = "not_applicable";
    let actorRef: string;
    if (actorKind === "human") {
      if (!requiredText(input.actor.accountId)) {
        this.fail("ACTIVITY_MALFORMED", "a human activity actor requires a server-authoritative account id");
      }
      actorAccountId = assertToken(input.actor.accountId as string, "actor.accountId");
      actorRef = await activityPseudonym("human", scopeTenant, "account", actorAccountId);
    } else if (actorKind === "agent") {
      if (!requiredText(input.actor.agentIdentityId)) {
        this.fail("ACTIVITY_MALFORMED", "an agent activity actor requires a bounded agent identity");
      }
      actorAgentId = input.actor.agentIdentityId as string;
      const resolved = agents.resolveAuthorityState(scopeTenant, actorAgentId, input.occurredAt);
      if (resolved === null) {
        this.fail(
          "ACTIVITY_UNKNOWN_AGENT_IDENTITY",
          `agent identity ${actorAgentId} is not known to tenant ${scopeTenant}`,
        );
      }
      actorAuthority = resolved;
      actorRef = await activityPseudonym("agent", scopeTenant, "agent", actorAgentId);
    } else {
      if (!requiredText(input.actor.actorRef)) {
        this.fail("ACTIVITY_MALFORMED", `a ${actorKind} activity actor requires a namespaced reference`);
      }
      actorRef = await activityPseudonym(
        actorKind,
        scopeTenant,
        actorKind,
        assertToken(input.actor.actorRef as string, "actor.actorRef"),
      );
    }

    const subjectType = (input.subjectType ?? "none") as string;
    if (!isOneOf(ACTIVITY_SUBJECT_TYPES, subjectType)) {
      this.fail("ACTIVITY_MALFORMED", `unsupported activity subject type: ${subjectType}`);
    }
    let subjectRef: string | null = null;
    if (subjectType === "none") {
      if (requiredText(input.subjectId)) {
        this.fail("ACTIVITY_INVALID_SUBJECT", "a subject reference requires a subject type");
      }
    } else {
      if (!requiredText(input.subjectId)) {
        this.fail("ACTIVITY_INVALID_SUBJECT", `subject type ${subjectType} requires a subject id`);
      }
      subjectRef = await activityPseudonym("subject", scopeTenant, subjectType, input.subjectId as string);
    }

    const sensitivity = (input.sensitivity ?? "operational") as string;
    if (!isOneOf(ACTIVITY_SENSITIVITY_CLASSES, sensitivity)) {
      this.fail("ACTIVITY_MALFORMED", `unsupported activity sensitivity class: ${sensitivity}`);
    }
    const visibilityScope = (input.visibilityScope ?? "branch") as string;
    if (!isOneOf(ACTIVITY_VISIBILITY_SCOPES, visibilityScope)) {
      this.fail("ACTIVITY_MALFORMED", `unsupported activity visibility scope: ${visibilityScope}`);
    }
    const branchId = input.branchId ?? null;
    if (visibilityScope === "branch" && !requiredText(branchId)) {
      this.fail("ACTIVITY_MALFORMED", "branch visibility requires a branch");
    }
    if (visibilityScope === "tenant" && requiredText(branchId)) {
      this.fail("ACTIVITY_INVALID_SUBJECT", "tenant-wide activity must not carry a branch");
    }

    const correlationId = requiredText(input.correlationId)
      ? assertToken(input.correlationId as string, "correlationId")
      : null;
    const sourceEventId = assertToken(input.sourceEventId, "sourceEventId");
    const sourceRef = assertToken(input.provenance.sourceRef, "provenance.sourceRef");
    const sourceRevision = assertToken(input.provenance.sourceRevision, "provenance.sourceRevision");

    let supersedesActivityId: string | null = null;
    if (requiredText(input.supersedesActivityId)) {
      const previous = this.requireRecord(input.supersedesActivityId as string, scopeTenant);
      if (previous.subjectRef !== subjectRef) {
        this.fail(
          "ACTIVITY_INVALID_SUBJECT",
          "a superseding activity record must describe the same subject as the record it corrects",
        );
      }
      supersedesActivityId = previous.id;
    }

    const payload = normalizePayload(input.payload);

    const candidate: Omit<ActivityRecord, "recordedAt"> = {
      id: input.id,
      tenantId: scopeTenant,
      branchId,
      actorKind,
      actorAccountId,
      actorAgentId,
      actorRef,
      actorAuthority,
      sourceDomain,
      sourceEventId,
      sourceEventVersion,
      projectionVersion,
      category: rule.category,
      action: input.action,
      result: input.result,
      subjectType,
      subjectRef,
      sensitivity,
      visibilityScope,
      correlationId,
      occurredAt: input.occurredAt,
      payload,
      supersedesActivityId,
      sourceRef,
      sourceRevision,
    };
    const fingerprint = this.fingerprint(candidate);

    // Deduplication runs before any uniqueness failure so that a legitimate replay
    // of the same canonical event is idempotent rather than an error.
    const dedupeKey = `${scopeTenant}|${sourceDomain}|${sourceEventId}|${projectionVersion}`;
    const existingId = this.sourceKeys.get(dedupeKey);
    if (existingId !== undefined) {
      if (this.fingerprints.get(existingId) !== fingerprint) {
        this.fail(
          "ACTIVITY_IDEMPOTENCY_CONFLICT",
          `source event ${sourceEventId} was already projected with different content`,
        );
      }
      return { record: this.records.get(existingId) as ActivityRecord, replayed: true };
    }
    if (this.records.has(input.id)) {
      this.fail("ACTIVITY_DUPLICATE_ID", `duplicate activity id: ${input.id}`);
    }

    const record: ActivityRecord = {
      ...candidate,
      sourceDomain,
      category: rule.category,
      action: input.action as ActivityAction,
      result: input.result as ActivityResult,
      subjectType: subjectType as ActivitySubjectType,
      sensitivity: sensitivity as ActivitySensitivity,
      visibilityScope: visibilityScope as ActivityVisibility,
      recordedAt: input.provenance.observedAt,
    };
    this.records.set(record.id, record);
    this.sourceKeys.set(dedupeKey, record.id);
    this.fingerprints.set(record.id, fingerprint);
    return { record, replayed: false };
  }

  get(id: string, scopeTenant: string): ActivityRecord {
    return this.requireRecord(id, scopeTenant);
  }

  list(scopeTenant: string, filter: ActivityReadFilter = {}): ActivityRecord[] {
    if (filter.category !== undefined && !isOneOf(ACTIVITY_CATEGORIES, filter.category)) {
      this.fail("ACTIVITY_MALFORMED", `unsupported category filter: ${filter.category}`);
    }
    if (filter.actorKind !== undefined && !isOneOf(ACTIVITY_ACTOR_KINDS, filter.actorKind)) {
      this.fail("ACTIVITY_UNSUPPORTED_ACTOR_TYPE", `unsupported actor filter: ${filter.actorKind}`);
    }
    if (filter.subjectType !== undefined && !isOneOf(ACTIVITY_SUBJECT_TYPES, filter.subjectType)) {
      this.fail("ACTIVITY_MALFORMED", `unsupported subject type filter: ${filter.subjectType}`);
    }
    const limit = filter.limit ?? 100;
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
      this.fail("ACTIVITY_MALFORMED", "activity limit must be an integer between 1 and 500");
    }
    return [...this.records.values()]
      .filter(
        (record) =>
          record.tenantId === scopeTenant &&
          (filter.branchId === undefined || record.branchId === filter.branchId) &&
          (filter.category === undefined || record.category === filter.category) &&
          (filter.actorKind === undefined || record.actorKind === filter.actorKind) &&
          (filter.subjectType === undefined || record.subjectType === filter.subjectType) &&
          (filter.subjectRef === undefined || record.subjectRef === filter.subjectRef) &&
          (filter.since === undefined || record.occurredAt >= filter.since) &&
          (filter.until === undefined || record.occurredAt <= filter.until),
      )
      .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
      .slice(0, limit);
  }

  // Deny-by-default read gate. Sensitivity and visibility are evaluated separately so
  // an operations reader is never silently granted clinical detail.
  visibleTo(record: ActivityRecord, audience: ActivityReadAudience): boolean {
    if (record.tenantId !== audience.tenantId) return false;
    if (record.sensitivity === "restricted" && !audience.allowRestricted) return false;
    if (record.visibilityScope === "private") return record.actorAccountId === audience.accountId;
    if (record.visibilityScope === "tenant") return true;
    if (audience.tenantWide) return true;
    return record.branchId !== null && audience.branchIds.includes(record.branchId);
  }

  listVisible(
    audience: ActivityReadAudience,
    filter: ActivityReadFilter = {},
    options: { includeRestricted?: boolean } = {},
  ): ActivityRecord[] {
    if (options.includeRestricted && !audience.allowRestricted) {
      this.fail(
        "ACTIVITY_RESTRICTED_DENIED",
        "restricted activity requires an explicitly authorized clinical surface",
      );
    }
    const visible = this.list(audience.tenantId, filter).filter((record) =>
      this.visibleTo(record, audience),
    );
    if (options.includeRestricted) return visible;
    return visible.filter((record) => record.sensitivity === "operational");
  }

  // An activity record may only imply current agent authority when the agent held
  // authority at projection time *and* still holds it now. Revoked history stays
  // readable; it never reads as a live grant.
  impliesCurrentAgentAuthority(
    record: ActivityRecord,
    agents: ActivityAgentDirectory,
    asOf: string,
  ): boolean {
    if (record.actorKind !== "agent" || record.actorAgentId === null) return false;
    if (record.actorAuthority !== "active") return false;
    const current = agents.resolveAuthorityState(record.tenantId, record.actorAgentId, asOf);
    return current === "active";
  }
}
