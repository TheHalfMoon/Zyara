// Zyara Network N5/C3: governed approvals and the human exception queue.
//
// Concept donor reference: block/buzz (Apache-2.0), human/agent membership and workflow
// approval steps. No Buzz source is copied into this file; the ideas are re-expressed as
// Zyara-native healthcare constraints.
//
// C3 is the governed bridge between AI / automation / external events and
// human-authorized operational actions. It is deliberately NOT a generic
// "approve = true" table:
//
//   * an approval binds to exactly one operation: tenant, branch, action type, a digest
//     of the protected parameters, requester, required authority, policy/risk class,
//     evidence, creation time, expiry and correlation id;
//   * approving one operation can never authorize another: execution presents the digest
//     it intends to use and a mismatch invalidates the approval;
//   * approver authority is resolved from a trusted directory at decision time and
//     re-resolved at execution time, so revoked or stale authority invalidates an unused
//     approval; a UI role label or a request body can never supply authority;
//   * an agent actor can never decide, and self-approval is forbidden for protected
//     classes;
//   * the state machine is explicit, illegal jumps are refused and terminal states are
//     frozen; retries reconcile the original record through an idempotency key;
//   * the exception queue is where automation safely gives up: every case names the
//     closed reason automation stopped, links to the W3 work item that owns assignment,
//     due date, escalation and follow-up, and cannot be closed without evidence when
//     evidence is required. An unknown external outcome stays unknown.
//
// Privacy posture: parameter *values* are never stored. Only a digest and the sorted,
// allow-listed key names are retained. Evidence and receipt fields are opaque bounded
// reference tokens, no field is free text, and credential material is refused everywhere.

export type ApprovalRequestId = string;
export type ExceptionCaseId = string;

export type ApprovalActorKind = "human" | "agent" | "system";
export const APPROVAL_ACTOR_KINDS = ["human", "agent", "system"] as const;

// Provenance is carried the same way as the W1-W4 and C1/C2 slices so evidence packets
// can be compared across the network plan.
export interface CollaborationProvenance {
  source: "zyara-native" | "donor-adapted";
  sourceRef: string;
  sourceRevision: string;
  observedAt: string;
}

// ---------------------------------------------------------------------------
// Closed registries
// ---------------------------------------------------------------------------

export const APPROVAL_RISK_CLASSES = ["routine", "elevated", "high", "critical"] as const;
export type ApprovalRiskClass = (typeof APPROVAL_RISK_CLASSES)[number];

// The complete set of authorities that can ever authorize a protected action. There is no
// wildcard, no dynamic authority string and no extensible namespace.
export const APPROVER_AUTHORITIES = [
  "branch_admin",
  "org_admin",
  "clinical_lead",
  "compliance_officer",
] as const;
export type ApproverAuthority = (typeof APPROVER_AUTHORITIES)[number];

// A protected parameter is either a closed enum code, a small integer, or a bounded
// reference token. Parameter values are digested, never stored.
export type ProtectedParameterKind = "enum" | "count" | "token";

export interface ProtectedParameter {
  kind: ProtectedParameterKind;
  vocabulary?: readonly string[];
}

export interface ProtectedActionRule {
  riskClass: ApprovalRiskClass;
  requiredAuthority: ApproverAuthority;
  // Protected classes forbid the requester approving its own proposal. It is stored per
  // rule so the rule is explicit and testable rather than an assumption in the code.
  selfApprovalForbidden: boolean;
  // A protected action always needs a human decision. Agents can propose; they can never
  // decide.
  humanApproverRequired: true;
  evidenceRequired: boolean;
  maxTtlMinutes: number;
  parameters: Readonly<Record<string, ProtectedParameter>>;
}

// Closed protected-action registry. An action type outside this registry cannot be
// proposed at all, so an unqualified or unknown protected action is refused rather than
// silently routed through a generic approval.
export const PROTECTED_ACTIONS: Readonly<Record<string, ProtectedActionRule>> = {
  "communications.outbound.broadcast": {
    riskClass: "high",
    requiredAuthority: "branch_admin",
    selfApprovalForbidden: true,
    humanApproverRequired: true,
    evidenceRequired: true,
    maxTtlMinutes: 60,
    parameters: {
      channel: { kind: "enum", vocabulary: ["whatsapp", "sms", "email", "in_app"] },
      audienceType: {
        kind: "enum",
        vocabulary: ["waiting_list", "recall_cohort", "department", "care_gap_list"],
      },
      scheduledHour: { kind: "count" },
    },
  },
  "workforce.coverage_override": {
    riskClass: "elevated",
    requiredAuthority: "branch_admin",
    selfApprovalForbidden: true,
    humanApproverRequired: true,
    evidenceRequired: false,
    maxTtlMinutes: 240,
    parameters: {
      staffAssignmentRef: { kind: "token" },
      shiftRef: { kind: "token" },
      reasonCode: { kind: "enum", vocabulary: ["sick_leave", "emergency", "roster_error"] },
    },
  },
  "workforce.tasks.bulk_reassign": {
    riskClass: "elevated",
    requiredAuthority: "branch_admin",
    selfApprovalForbidden: true,
    humanApproverRequired: true,
    evidenceRequired: false,
    maxTtlMinutes: 120,
    parameters: {
      fromOwnerRef: { kind: "token" },
      toOwnerRef: { kind: "token" },
      taskCount: { kind: "count" },
    },
  },
  "data.export.patient_records": {
    riskClass: "critical",
    requiredAuthority: "compliance_officer",
    selfApprovalForbidden: true,
    humanApproverRequired: true,
    evidenceRequired: true,
    maxTtlMinutes: 30,
    parameters: {
      exportFormat: { kind: "enum", vocabulary: ["csv", "json", "fhir_bundle"] },
      purposeCode: {
        kind: "enum",
        vocabulary: ["audit", "legal_request", "patient_access_request", "care_continuity"],
      },
      recordCount: { kind: "count" },
    },
  },
  "agent.agent_authority.grant": {
    riskClass: "critical",
    requiredAuthority: "org_admin",
    selfApprovalForbidden: true,
    humanApproverRequired: true,
    evidenceRequired: true,
    maxTtlMinutes: 30,
    parameters: {
      agentRef: { kind: "token" },
      // The closed C1 capability set. A protected action cannot name a capability that an
      // agent identity could never hold.
      capability: {
        kind: "enum",
        vocabulary: [
          "workforce.tasks.read",
          "workforce.tasks.raise",
          "workforce.tasks.comment",
          "communications.outbound.propose",
          "reporting.read",
        ],
      },
    },
  },
};

export const PROTECTED_ACTION_TYPES = Object.keys(PROTECTED_ACTIONS) as readonly string[];

export const APPROVAL_STATUSES = [
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
] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

// Explicit lifecycle. A state can only move along an enumerated edge, and a terminal state
// is frozen: history is corrected by a new proposal, never by rewriting this one.
export const APPROVAL_TRANSITIONS: Readonly<Record<ApprovalStatus, readonly ApprovalStatus[]>> = {
  proposed: ["awaiting_approval", "cancelled"],
  awaiting_approval: ["approved", "rejected", "expired", "cancelled", "superseded", "needs_human"],
  approved: ["executing", "expired", "cancelled", "superseded"],
  executing: ["succeeded", "failed", "needs_human"],
  // A human resolution may authorize a fresh attempt, which gets its own attempt ordinal so
  // an unknown outcome is never converted into that later outcome.
  needs_human: ["executing", "cancelled", "superseded"],
  rejected: [],
  expired: [],
  cancelled: [],
  superseded: [],
  succeeded: [],
  failed: [],
};

export const APPROVAL_TERMINAL_STATUSES: readonly ApprovalStatus[] = [
  "rejected",
  "expired",
  "cancelled",
  "superseded",
  "succeeded",
  "failed",
];

export const APPROVAL_DECISIONS = ["approved", "rejected"] as const;
export type ApprovalDecisionOutcome = (typeof APPROVAL_DECISIONS)[number];

export const APPROVAL_EXECUTION_OUTCOMES = ["attempted", "succeeded", "failed", "unknown"] as const;
export type ApprovalExecutionOutcome = (typeof APPROVAL_EXECUTION_OUTCOMES)[number];

export const APPROVAL_DECISION_REASON_CODES = [
  "authorized",
  "out_of_policy",
  "insufficient_evidence",
  "duplicate_request",
  "superseded_by_policy_change",
] as const;
export type ApprovalDecisionReasonCode = (typeof APPROVAL_DECISION_REASON_CODES)[number];

// The closed set of reasons automation or a provider stopped without a safe automatic
// resolution. A case cannot be opened with an arbitrary free-text label.
export const EXCEPTION_KINDS = [
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
] as const;
export type ExceptionKind = (typeof EXCEPTION_KINDS)[number];

// Evidence requirements are declared per kind rather than decided by the caller.
export const EXCEPTION_EVIDENCE_REQUIRED: Readonly<Record<ExceptionKind, boolean>> = {
  ambiguous_patient_request: false,
  missing_consent: true,
  unavailable_authority: false,
  conflicting_provider_data: true,
  whatsapp_delivery_failure: false,
  external_provider_timeout: false,
  insurer_ambiguity: true,
  prior_auth_mismatch: true,
  stale_schedule: false,
  duplicate_identity_ambiguity: true,
  low_confidence_automation: false,
  policy_refusal: false,
  reconciliation_failure: true,
  unknown_external_outcome: true,
  approval_outcome_unknown: true,
};

export const EXCEPTION_SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type ExceptionSeverity = (typeof EXCEPTION_SEVERITIES)[number];

// SLA hours per severity. The due time is derived here and owned operationally by the
// linked W3 work item.
export const EXCEPTION_SLA_HOURS: Readonly<Record<ExceptionSeverity, number>> = {
  low: 72,
  medium: 24,
  high: 8,
  critical: 2,
};

export const EXCEPTION_STATUSES = [
  "open",
  "assigned",
  "in_review",
  "escalated",
  "resolved",
  "closed",
  "cancelled",
] as const;
export type ExceptionStatus = (typeof EXCEPTION_STATUSES)[number];

export const EXCEPTION_TRANSITIONS: Readonly<Record<ExceptionStatus, readonly ExceptionStatus[]>> = {
  open: ["assigned", "in_review", "escalated", "cancelled"],
  assigned: ["in_review", "escalated", "cancelled"],
  in_review: ["resolved", "escalated", "cancelled"],
  escalated: ["in_review", "resolved", "cancelled"],
  resolved: ["closed"],
  closed: [],
  cancelled: [],
};

export const EXCEPTION_TERMINAL_STATUSES: readonly ExceptionStatus[] = ["closed", "cancelled"];

// A resolution code states what the human determined. "unknown_outcome" exists precisely
// so that an unresolved external outcome does not have to be recorded as success or
// failure, and a case resolved that way can never be closed.
export const EXCEPTION_RESOLUTION_CODES = [
  "resolved_with_evidence",
  "no_action_required",
  "escalated_to_clinician",
  "retry_safe",
  "retry_unsafe",
  "unknown_outcome",
] as const;
export type ExceptionResolutionCode = (typeof EXCEPTION_RESOLUTION_CODES)[number];

export const EXCEPTION_EVENT_ACTIONS = ["opened", "assigned", "escalated", "transitioned"] as const;
export type ExceptionEventAction = (typeof EXCEPTION_EVENT_ACTIONS)[number];

// Reference shape used for every C3 identifier, evidence reference and receipt reference.
// Whitespace, "@" and "+" are outside the alphabet, so an email address or an
// international phone number cannot be stored, and a long digit run (a national id or a
// phone number) is refused.
export const APPROVAL_ID_PATTERN = /^[A-Za-z0-9_.:-]{1,128}$/;
export const APPROVAL_EVIDENCE_REF_PATTERN = /^[A-Za-z0-9_.:-]{1,128}$/;
// A parameters digest is minted here, never supplied by a caller. It is verified with its
// own shape because a hex digest may legitimately contain a long run of digits.
export const APPROVAL_PARAMETERS_DIGEST_PATTERN = /^params_[0-9a-f]{64}$/;

const DIRECT_IDENTIFIER_PATTERNS = [/^[0-9]{7,}$/, /[0-9]{9,}/];

const SECRET_PATTERNS = [
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

export function isApprovalToken(value: unknown): boolean {
  if (typeof value !== "string" || value.length === 0) return false;
  if (!APPROVAL_ID_PATTERN.test(value)) return false;
  if (DIRECT_IDENTIFIER_PATTERNS.some((pattern) => pattern.test(value))) return false;
  if (SECRET_PATTERNS.some((pattern) => pattern.test(value))) return false;
  return true;
}

function carriesSecret(value: string): boolean {
  return SECRET_PATTERNS.some((pattern) => pattern.test(value));
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type ApprovalErrorCode =
  | "APPROVAL_CROSS_TENANT"
  | "APPROVAL_CROSS_BRANCH"
  | "APPROVAL_MALFORMED"
  | "APPROVAL_UNKNOWN_ACTION_TYPE"
  | "APPROVAL_PARAMETER_SET_MISMATCH"
  | "APPROVAL_PARAMETER_INVALID"
  | "APPROVAL_SECRET_REFUSED"
  | "APPROVAL_UNKNOWN_REFERENCE"
  | "APPROVAL_INVALID_TRANSITION"
  | "APPROVAL_TERMINAL_IMMUTABLE"
  | "APPROVAL_ALREADY_DECIDED"
  | "APPROVAL_SELF_APPROVAL_FORBIDDEN"
  | "APPROVAL_AGENT_APPROVER_FORBIDDEN"
  | "APPROVAL_REQUESTER_REQUIRED"
  | "APPROVAL_REQUESTER_AGENT_INELIGIBLE"
  | "APPROVAL_APPROVER_AUTHORITY_MISSING"
  | "APPROVAL_APPROVER_AUTHORITY_REVOKED"
  | "APPROVAL_EVIDENCE_REQUIRED"
  | "APPROVAL_EXPIRED"
  | "APPROVAL_PARAMETERS_CHANGED"
  | "APPROVAL_UNKNOWN_REQUIRES_EVIDENCE"
  | "APPROVAL_INVALID_TTL"
  | "APPROVAL_MISSING_PROVENANCE"
  | "APPROVAL_DUPLICATE_ID"
  | "APPROVAL_IDEMPOTENCY_CONFLICT"
  | "EXCEPTION_CROSS_TENANT"
  | "EXCEPTION_MALFORMED"
  | "EXCEPTION_UNKNOWN_KIND"
  | "EXCEPTION_INVALID_SEVERITY"
  | "EXCEPTION_WORK_ITEM_REQUIRED"
  | "EXCEPTION_UNKNOWN_REFERENCE"
  | "EXCEPTION_INVALID_TRANSITION"
  | "EXCEPTION_TERMINAL_IMMUTABLE"
  | "EXCEPTION_MISSING_RESOLUTION"
  | "EXCEPTION_UNKNOWN_CANNOT_CLOSE"
  | "EXCEPTION_EVIDENCE_REQUIRED"
  | "EXCEPTION_DUPLICATE_ID"
  | "EXCEPTION_IDEMPOTENCY_CONFLICT";

export class ApprovalError extends Error {
  code: ApprovalErrorCode;

  constructor(code: ApprovalErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Actors, authority and agent directories
// ---------------------------------------------------------------------------

export interface ApprovalActor {
  kind: string;
  // Server-authoritative account id for a human actor.
  accountId?: string | null;
  // C1 bounded agent identity for an agent actor.
  agentIdentityId?: string | null;
  // Namespaced reference for a system actor.
  actorRef?: string | null;
}

// The authority a decision was taken under. It is resolved from the trusted server-side
// directory, never read from the request, and it is re-resolved before execution.
export interface ApprovalAuthoritySnapshot {
  authority: ApproverAuthority;
  // null = the authority covers the whole tenant. Set = it covers only that branch.
  branchId: string | null;
  sourceRef: string;
  resolvedAt: string;
}

export interface ApprovalAuthorityLookup {
  tenantId: string;
  accountId: string;
  authority: ApproverAuthority;
  // Scope the authority must cover: a branch, or null for a tenant-wide action.
  branchId: string | null;
  asOf: string;
}

// Supplied by the caller from the trusted server-side membership/authority registry. The
// collaboration layer never invents approval authority, and a UI role label can never
// satisfy it.
export interface ApprovalAuthorityDirectory {
  resolveAuthority(lookup: ApprovalAuthorityLookup): ApprovalAuthoritySnapshot | null;
}

export type ApprovalAgentState =
  | "active"
  | "suspended"
  | "revoked"
  | "expired"
  | "not_yet_effective"
  | "branch_mismatch"
  | "unknown";

export interface ApprovalAgentLookup {
  tenantId: string;
  agentIdentityId: string;
  branchId: string | null;
  asOf: string;
}

// Supplied by the caller from the trusted C1 registry.
export interface ApprovalAgentDirectory {
  resolveRequesterState(lookup: ApprovalAgentLookup): ApprovalAgentState;
}

export interface ApprovalDependencies {
  authorities: ApprovalAuthorityDirectory;
  agents: ApprovalAgentDirectory;
}

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface ApprovalRequest {
  id: ApprovalRequestId;
  tenantId: string;
  branchId: string | null;
  actionType: string;
  riskClass: ApprovalRiskClass;
  requiredAuthority: ApproverAuthority;
  selfApprovalForbidden: boolean;
  evidenceRequired: boolean;
  // Digest over the canonicalised protected parameters. Values are never stored.
  parametersDigest: string;
  parameterKeys: readonly string[];
  requesterKind: ApprovalActorKind;
  requesterAccountId: string | null;
  requesterAgentId: string | null;
  requesterRef: string | null;
  status: ApprovalStatus;
  correlationId: string | null;
  idempotencyKey: string | null;
  provenance: CollaborationProvenance;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface ApprovalDecision {
  id: string;
  tenantId: string;
  requestId: ApprovalRequestId;
  outcome: ApprovalDecisionOutcome;
  approverKind: "human";
  approverAccountId: string;
  authority: ApprovalAuthoritySnapshot;
  evidenceRef: string | null;
  reasonCode: ApprovalDecisionReasonCode;
  correlationId: string | null;
  decidedAt: string;
}

export interface ApprovalExecution {
  id: string;
  tenantId: string;
  requestId: ApprovalRequestId;
  attempt: number;
  outcome: ApprovalExecutionOutcome;
  // Who performed the execution attempt. Typed exactly like every other C3 actor.
  executorKind: ApprovalActorKind;
  executorAccountId: string | null;
  executorAgentId: string | null;
  executorRef: string | null;
  // Digest the executor presented at the moment it acted. It must equal the digest the
  // approval was granted for.
  parametersDigest: string;
  receiptRef: string | null;
  evidenceRef: string | null;
  correlationId: string | null;
  occurredAt: string;
}

export interface ApprovalEvent {
  id: string;
  tenantId: string;
  requestId: ApprovalRequestId;
  fromStatus: ApprovalStatus | null;
  toStatus: ApprovalStatus;
  actor: ApprovalActor;
  reasonCode: string;
  occurredAt: string;
}

export interface ExceptionCase {
  id: ExceptionCaseId;
  tenantId: string;
  branchId: string;
  kind: ExceptionKind;
  severity: ExceptionSeverity;
  status: ExceptionStatus;
  // The W3 work item that owns assignment, ownership, due date, escalation and follow-up.
  workItemTaskId: string;
  // Pseudonymous subject reference, minted here. An internal identifier is never stored.
  subjectRef: string | null;
  evidenceRequired: boolean;
  slaDueAt: string;
  resolutionCode: ExceptionResolutionCode | null;
  closureEvidenceRef: string | null;
  correlationId: string | null;
  idempotencyKey: string | null;
  provenance: CollaborationProvenance;
  openedAt: string;
  updatedAt: string;
  closedAt: string | null;
}

export interface ExceptionEvent {
  id: string;
  tenantId: string;
  caseId: ExceptionCaseId;
  action: ExceptionEventAction;
  fromStatus: ExceptionStatus | null;
  toStatus: ExceptionStatus;
  actor: ApprovalActor;
  reasonCode: string;
  occurredAt: string;
}

export type ExceptionSlaState = "on_time" | "due_soon" | "overdue" | "closed";

// SLA state is derived at read time from the due time and the current status, so it cannot
// be rewritten by a caller and never becomes stored authority.
export function exceptionSlaState(
  record: Pick<ExceptionCase, "slaDueAt" | "status" | "openedAt">,
  asOf: string,
): ExceptionSlaState {
  if (EXCEPTION_TERMINAL_STATUSES.includes(record.status)) return "closed";
  const due = Date.parse(record.slaDueAt);
  const now = Date.parse(asOf);
  if (Number.isNaN(due) || Number.isNaN(now)) return "overdue";
  if (now >= due) return "overdue";
  // "due soon" is the last quarter of the SLA window, capped at two hours.
  const remaining = due - now;
  const window = due - (Number.isNaN(Date.parse(record.openedAt)) ? due : Date.parse(record.openedAt));
  const threshold = Math.min(2 * 60 * 60 * 1000, Math.max(window / 4, 15 * 60 * 1000));
  if (remaining <= threshold) return "due_soon";
  return "on_time";
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export interface ApprovalProposalInput {
  id: ApprovalRequestId;
  tenantId: string;
  branchId?: string | null;
  actionType: string;
  // Protected parameters. Values are validated against the closed registry and digested;
  // they are never persisted.
  parameters: Record<string, unknown>;
  requester: ApprovalActor;
  proposedAt: string;
  ttlMinutes?: number;
  correlationId?: string | null;
  idempotencyKey?: string | null;
  provenance: CollaborationProvenance;
}

export interface ApprovalDecisionInput {
  outcome: ApprovalDecisionOutcome;
  reasonCode: ApprovalDecisionReasonCode;
  evidenceRef?: string | null;
  decidedAt: string;
  idempotencyKey?: string | null;
}

export interface ApprovalExecutionInput {
  outcome: ApprovalExecutionOutcome;
  // The digest of the protected parameters this executor intends to use. The raw values
  // never reach this layer, so an approval cannot be repointed by re-sending parameters.
  parametersDigest: string;
  receiptRef?: string | null;
  evidenceRef?: string | null;
  occurredAt: string;
  idempotencyKey?: string | null;
}

export interface ExceptionOpenInput {
  id: ExceptionCaseId;
  tenantId: string;
  branchId: string;
  kind: ExceptionKind;
  severity: ExceptionSeverity;
  // The W3 work item that owns this case. C3 never becomes a second task manager.
  workItemTaskId: string;
  // Internal subject identifier. It is pseudonymised before storage.
  subjectId?: string | null;
  correlationId?: string | null;
  openedAt: string;
  idempotencyKey?: string | null;
  provenance: CollaborationProvenance;
}

export interface ExceptionAssignmentInput {
  assigneeAccountId: string;
  assigneeStaffAssignmentId: string;
  // Work state reported by the W3 store after the assignment it owns succeeded.
  workItemStatus: string;
  at: string;
}

export interface ExceptionTransitionInput {
  status: ExceptionStatus;
  resolutionCode?: ExceptionResolutionCode | null;
  evidenceRef?: string | null;
  reasonCode: string;
  at: string;
}

export interface ApprovalRequestFilter {
  branchId?: string;
  status?: ApprovalStatus;
  actionType?: string;
  requesterAccountId?: string;
}

export interface ExceptionFilter {
  branchId?: string;
  status?: ExceptionStatus;
  kind?: ExceptionKind;
  severity?: ExceptionSeverity;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isOneOf<T extends string>(allowed: readonly T[], value: string): value is T {
  return (allowed as readonly string[]).includes(value);
}

function requiredText(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function time(value: string): number {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    throw new ApprovalError("APPROVAL_MALFORMED", `unparseable timestamp: ${value}`);
  }
  return parsed;
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...digest].map((part) => part.toString(16).padStart(2, "0")).join("");
}

// Deterministic, tenant-scoped pseudonym. The raw identifier is never stored, so no
// caller-supplied identifier can appear verbatim in a C3 record, and the same subject stays
// correlatable inside one tenant.
export async function collaborationPseudonym(
  prefix: string,
  tenantId: string,
  referenceKind: string,
  internalId: string,
): Promise<string> {
  const digest = await sha256Hex(`${tenantId}\u0000${referenceKind}\u0000${internalId}`);
  return `${prefix}_${digest}`;
}

function canonicalParameters(
  rule: ProtectedActionRule,
  parameters: Record<string, unknown>,
): Array<[string, string | number]> {
  const declared = Object.keys(rule.parameters).sort();
  const supplied = Object.keys(parameters).sort();
  if (JSON.stringify(declared) !== JSON.stringify(supplied)) {
    throw new ApprovalError(
      "APPROVAL_PARAMETER_SET_MISMATCH",
      `protected parameters must be exactly: ${declared.join(", ")}`,
    );
  }
  const entries: Array<[string, string | number]> = [];
  for (const key of declared) {
    const spec = rule.parameters[key];
    const value = parameters[key];
    if (typeof value === "string") {
      if (carriesSecret(value)) {
        throw new ApprovalError(
          "APPROVAL_SECRET_REFUSED",
          `protected parameter ${key} must not carry credential material`,
        );
      }
      if (spec.kind === "enum") {
        const vocabulary = spec.vocabulary ?? [];
        if (!vocabulary.includes(value)) {
          throw new ApprovalError(
            "APPROVAL_PARAMETER_INVALID",
            `protected parameter ${key} does not accept the value ${value}`,
          );
        }
        entries.push([key, value]);
        continue;
      }
      if (spec.kind === "count") {
        throw new ApprovalError(
          "APPROVAL_PARAMETER_INVALID",
          `protected parameter ${key} accepts a small non-negative integer only`,
        );
      }
      if (!isApprovalToken(value)) {
        throw new ApprovalError(
          "APPROVAL_PARAMETER_INVALID",
          `protected parameter ${key} must be a bounded reference token`,
        );
      }
      entries.push([key, value]);
      continue;
    }
    if (typeof value === "number") {
      if (spec.kind !== "count" || !Number.isInteger(value) || value < 0 || value > 100000) {
        throw new ApprovalError(
          "APPROVAL_PARAMETER_INVALID",
          `protected parameter ${key} accepts a small non-negative integer only`,
        );
      }
      entries.push([key, value]);
      continue;
    }
    throw new ApprovalError(
      "APPROVAL_PARAMETER_INVALID",
      `protected parameter ${key} must be a closed enum code, a small integer or a bounded token`,
    );
  }
  return entries;
}

// The digest is the binding between an approval and the exact protected parameters it was
// granted for. It is tenant-scoped so the same parameter set in two tenants is not
// correlatable, and it is derived from the canonical ordering, never from caller order.
export async function approvalParametersDigest(
  tenantId: string,
  actionType: string,
  parameters: Record<string, unknown>,
): Promise<{ digest: string; keys: string[] }> {
  const rule = PROTECTED_ACTIONS[actionType];
  if (!rule) {
    throw new ApprovalError(
      "APPROVAL_UNKNOWN_ACTION_TYPE",
      `unsupported protected action type: ${actionType}`,
    );
  }
  const canonical = canonicalParameters(rule, parameters);
  const payload = canonical.map(([key, value]) => `${key}=${String(value)}`).join("\u001f");
  const digest = await sha256Hex(`${tenantId}\u0000${actionType}\u0000${payload}`);
  return { digest: `params_${digest}`, keys: canonical.map(([key]) => key) };
}

function requireRequestToken(
  value: string,
  label: string,
  code: ApprovalErrorCode = "APPROVAL_MALFORMED",
): string {
  if (!requiredText(value)) {
    throw new ApprovalError(code, `${label} is required`);
  }
  if (!APPROVAL_ID_PATTERN.test(value)) {
    throw new ApprovalError(code, `${label} must be a bounded identifier token`);
  }
  if (DIRECT_IDENTIFIER_PATTERNS.some((pattern) => pattern.test(value))) {
    throw new ApprovalError(
      code,
      `${label} must not be an unqualified direct identifier`,
    );
  }
  if (carriesSecret(value)) {
    throw new ApprovalError("APPROVAL_SECRET_REFUSED", `${label} must not carry credential material`);
  }
  return value;
}

function optionalEvidenceRef(
  value: string | null | undefined,
  label: string,
  code: ApprovalErrorCode = "APPROVAL_MALFORMED",
): string | null {
  if (value === null || value === undefined) return null;
  if (!requiredText(value)) {
    throw new ApprovalError(code, `${label} must not be blank`);
  }
  if (!APPROVAL_EVIDENCE_REF_PATTERN.test(value)) {
    throw new ApprovalError(code, `${label} must be a bounded reference token`);
  }
  if (DIRECT_IDENTIFIER_PATTERNS.some((pattern) => pattern.test(value))) {
    throw new ApprovalError(
      code,
      `${label} must not be an unqualified direct identifier`,
    );
  }
  if (carriesSecret(value)) {
    throw new ApprovalError("APPROVAL_SECRET_REFUSED", `${label} must not carry credential material`);
  }
  return value;
}

function requireParametersDigest(value: string): string {
  if (typeof value !== "string" || !APPROVAL_PARAMETERS_DIGEST_PATTERN.test(value)) {
    throw new ApprovalError(
      "APPROVAL_MALFORMED",
      "parametersDigest must be the digest minted for this action",
    );
  }
  return value;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export class ApprovalStore {
  readonly requests = new Map<ApprovalRequestId, ApprovalRequest>();
  readonly decisions = new Map<string, ApprovalDecision>();
  readonly executions = new Map<string, ApprovalExecution>();
  readonly events = new Map<string, ApprovalEvent>();
  readonly exceptions = new Map<ExceptionCaseId, ExceptionCase>();
  readonly exceptionEvents = new Map<string, ExceptionEvent>();

  private readonly idempotency = new Map<string, string>();
  private readonly fingerprints = new Map<string, string>();
  private readonly exceptionIdempotency = new Map<string, ExceptionCaseId>();
  private readonly exceptionFingerprints = new Map<ExceptionCaseId, string>();
  private eventCounter = 0;
  private exceptionEventCounter = 0;

  private fail(code: ApprovalErrorCode, message: string): never {
    throw new ApprovalError(code, message);
  }

  private checkTenant(recordTenant: string, scopeTenant: string, code: ApprovalErrorCode): void {
    if (recordTenant !== scopeTenant) {
      this.fail(code, `cross-tenant collaboration write: ${recordTenant} != ${scopeTenant}`);
    }
  }

  private requireRequest(id: ApprovalRequestId, scopeTenant: string): ApprovalRequest {
    const request = this.requests.get(id);
    if (!request || request.tenantId !== scopeTenant) {
      this.fail("APPROVAL_UNKNOWN_REFERENCE", `approval request ${id}`);
    }
    return request;
  }

  private requireException(id: ExceptionCaseId, scopeTenant: string): ExceptionCase {
    const record = this.exceptions.get(id);
    if (!record || record.tenantId !== scopeTenant) {
      this.fail("EXCEPTION_UNKNOWN_REFERENCE", `exception case ${id}`);
    }
    return record;
  }

  private requireActor(actor: ApprovalActor, code: ApprovalErrorCode, label: string): void {
    if (!isOneOf(APPROVAL_ACTOR_KINDS, actor.kind)) {
      this.fail(code, `${label} must be a human, agent or system actor`);
    }
    const identifiers = [actor.accountId, actor.agentIdentityId, actor.actorRef].filter(
      (value): value is string => requiredText(value),
    );
    if (identifiers.length !== 1) {
      this.fail(code, `${label} must name exactly one typed identifier`);
    }
  }

  private nextEventId(): string {
    this.eventCounter += 1;
    return `approval-event-${this.eventCounter}`;
  }

  private nextExceptionEventId(): string {
    this.exceptionEventCounter += 1;
    return `exception-event-${this.exceptionEventCounter}`;
  }

  private recordEvent(
    event: Omit<ApprovalEvent, "id">,
    scopeTenant: string,
  ): ApprovalEvent {
    this.checkTenant(event.tenantId, scopeTenant, "APPROVAL_CROSS_TENANT");
    const stored: ApprovalEvent = { id: this.nextEventId(), ...event };
    this.events.set(stored.id, stored);
    return stored;
  }

  private recordExceptionEvent(
    event: Omit<ExceptionEvent, "id">,
    scopeTenant: string,
  ): ExceptionEvent {
    this.checkTenant(event.tenantId, scopeTenant, "EXCEPTION_CROSS_TENANT");
    const stored: ExceptionEvent = { id: this.nextExceptionEventId(), ...event };
    this.exceptionEvents.set(stored.id, stored);
    return stored;
  }

  // The single guarded transition path. Every status change goes through here, so an
  // illegal jump cannot happen by accident and every change is recorded in the trail.
  private transition(
    request: ApprovalRequest,
    to: ApprovalStatus,
    context: { actor: ApprovalActor; reasonCode: string; at: string },
    scopeTenant: string,
  ): ApprovalRequest {
    const allowed = APPROVAL_TRANSITIONS[request.status];
    if (!allowed.includes(to)) {
      if (APPROVAL_TERMINAL_STATUSES.includes(request.status)) {
        this.fail(
          "APPROVAL_TERMINAL_IMMUTABLE",
          `approval ${request.id} is ${request.status} and cannot move to ${to}`,
        );
      }
      this.fail(
        "APPROVAL_INVALID_TRANSITION",
        `approval ${request.id} cannot move from ${request.status} to ${to}`,
      );
    }
    const updated: ApprovalRequest = { ...request, status: to, updatedAt: context.at };
    this.requests.set(updated.id, updated);
    this.recordEvent(
      {
        tenantId: scopeTenant,
        requestId: updated.id,
        fromStatus: request.status,
        toStatus: to,
        actor: context.actor,
        reasonCode: context.reasonCode,
        occurredAt: context.at,
      },
      scopeTenant,
    );
    return updated;
  }

  private applyExceptionStatus(
    record: ExceptionCase,
    to: ExceptionStatus,
    context: { actor: ApprovalActor; reasonCode: string; at: string; action?: ExceptionEventAction },
    scopeTenant: string,
  ): ExceptionCase {
    this.assertExceptionTransition(record.status, to);
    const updated: ExceptionCase = { ...record, status: to, updatedAt: context.at };
    this.exceptions.set(updated.id, updated);
    this.recordExceptionEvent(
      {
        tenantId: scopeTenant,
        caseId: updated.id,
        action: context.action ?? "transitioned",
        fromStatus: record.status,
        toStatus: to,
        actor: context.actor,
        reasonCode: context.reasonCode,
        occurredAt: context.at,
      },
      scopeTenant,
    );
    return updated;
  }

  private assertExceptionTransition(from: ExceptionStatus, to: ExceptionStatus): void {
    if (EXCEPTION_TRANSITIONS[from].includes(to)) return;
    if (EXCEPTION_TERMINAL_STATUSES.includes(from)) {
      this.fail(
        "EXCEPTION_TERMINAL_IMMUTABLE",
        `exception case is ${from} and cannot move to ${to}`,
      );
    }
    this.fail(
      "EXCEPTION_INVALID_TRANSITION",
      `exception case cannot move from ${from} to ${to}`,
    );
  }

  // -------------------------------------------------------------------------
  // Approvals
  // -------------------------------------------------------------------------

  async propose(
    input: ApprovalProposalInput,
    scopeTenant: string,
    deps: ApprovalDependencies,
  ): Promise<ApprovalRequest> {
    this.checkTenant(input.tenantId, scopeTenant, "APPROVAL_CROSS_TENANT");
    requireRequestToken(input.id, "request id");
    if (!requiredText(input.provenance?.sourceRef) || !requiredText(input.provenance?.sourceRevision)) {
      this.fail("APPROVAL_MISSING_PROVENANCE", "an approval proposal must carry provenance");
    }
    const rule = PROTECTED_ACTIONS[input.actionType];
    if (!rule) {
      this.fail(
        "APPROVAL_UNKNOWN_ACTION_TYPE",
        `unsupported protected action type: ${input.actionType}`,
      );
    }
    this.requireActor(input.requester, "APPROVAL_REQUESTER_REQUIRED", "requester");
    const branchId = input.branchId ?? null;
    if (branchId !== null) requireRequestToken(branchId, "branch id");
    const proposed = time(input.proposedAt);

    const ttlMinutes = input.ttlMinutes ?? rule.maxTtlMinutes;
    if (!Number.isInteger(ttlMinutes) || ttlMinutes < 1 || ttlMinutes > rule.maxTtlMinutes) {
      this.fail(
        "APPROVAL_INVALID_TTL",
        `ttlMinutes must be an integer between 1 and ${rule.maxTtlMinutes}`,
      );
    }
    const expiresAt = new Date(proposed + ttlMinutes * 60 * 1000).toISOString();

    // A hash of the declared content, used only to detect a divergent retry under the same
    // idempotency key. It never stores parameter values.
    const { digest: parametersDigest, keys: parameterKeys } = await approvalParametersDigest(
      scopeTenant,
      input.actionType,
      input.parameters,
    );
    const fingerprint = JSON.stringify([
      input.actionType,
      branchId,
      parametersDigest,
      input.requester.kind,
      input.requester.accountId ?? null,
      input.requester.agentIdentityId ?? null,
      input.requester.actorRef ?? null,
      input.ttlMinutes ?? null,
      input.correlationId ?? null,
    ]);

    const idempotencyKey = input.idempotencyKey ?? null;
    if (idempotencyKey !== null) {
      if (!requiredText(idempotencyKey)) {
        this.fail("APPROVAL_MALFORMED", "idempotencyKey must not be blank");
      }
      if (!isApprovalToken(idempotencyKey)) {
        this.fail("APPROVAL_MALFORMED", "idempotencyKey must be a bounded reference token");
      }
      const existingId = this.idempotency.get(`${scopeTenant}:approval:${idempotencyKey}`);
      if (existingId !== undefined) {
        if (this.fingerprints.get(existingId) !== fingerprint) {
          this.fail(
            "APPROVAL_IDEMPOTENCY_CONFLICT",
            `approval idempotency key reused with different content: ${idempotencyKey}`,
          );
        }
        return this.requests.get(existingId) as ApprovalRequest;
      }
    }

    // Requester eligibility is resolved only for a genuinely new request, so a retry after
    // a timeout cannot fail or duplicate work.
    let requesterAccountId: string | null = null;
    let requesterAgentId: string | null = null;
    let requesterRef: string | null = null;
    if (input.requester.kind === "human") {
      requesterAccountId = requireRequestToken(
        input.requester.accountId as string,
        "requester account id",
      );
    } else if (input.requester.kind === "agent") {
      requesterAgentId = requireRequestToken(
        input.requester.agentIdentityId as string,
        "requester agent identity",
      );
      const state = deps.agents.resolveRequesterState({
        tenantId: scopeTenant,
        agentIdentityId: requesterAgentId,
        branchId,
        asOf: input.proposedAt,
      });
      if (state !== "active") {
        this.fail(
          "APPROVAL_REQUESTER_AGENT_INELIGIBLE",
          `agent requester ${requesterAgentId} is ${state}`,
        );
      }
    } else {
      requesterRef = requireRequestToken(input.requester.actorRef as string, "requester reference");
    }

    if (this.requests.has(input.id)) {
      this.fail("APPROVAL_DUPLICATE_ID", `duplicate approval request id: ${input.id}`);
    }

    const request: ApprovalRequest = {
      id: input.id,
      tenantId: input.tenantId,
      branchId,
      actionType: input.actionType,
      riskClass: rule.riskClass,
      requiredAuthority: rule.requiredAuthority,
      selfApprovalForbidden: rule.selfApprovalForbidden,
      evidenceRequired: rule.evidenceRequired,
      parametersDigest,
      parameterKeys,
      requesterKind: input.requester.kind as ApprovalActorKind,
      requesterAccountId,
      requesterAgentId,
      requesterRef,
      status: "proposed",
      correlationId: optionalEvidenceRef(input.correlationId ?? null, "correlation id"),
      idempotencyKey,
      provenance: input.provenance,
      createdAt: input.proposedAt,
      updatedAt: input.proposedAt,
      expiresAt,
    };
    this.requests.set(request.id, request);
    this.fingerprints.set(request.id, fingerprint);
    if (idempotencyKey !== null) {
      this.idempotency.set(`${scopeTenant}:approval:${idempotencyKey}`, request.id);
    }
    this.recordEvent(
      {
        tenantId: scopeTenant,
        requestId: request.id,
        fromStatus: null,
        toStatus: "proposed",
        actor: input.requester,
        reasonCode: "proposed",
        occurredAt: input.proposedAt,
      },
      scopeTenant,
    );
    // Explicitly walked, so the trail shows the request was queued for approval rather than
    // appearing in an approvable state by construction.
    return this.transition(
      request,
      "awaiting_approval",
      { actor: input.requester, reasonCode: "awaiting_human_decision", at: input.proposedAt },
      scopeTenant,
    );
  }

  // Expiry sweep. It is an explicit maintenance operation, not something a read does
  // silently, and it can only move a request into the terminal `expired` state.
  expireDue(scopeTenant: string, asOf: string): ApprovalRequest[] {
    const expired: ApprovalRequest[] = [];
    const now = time(asOf);
    for (const request of this.requests.values()) {
      if (request.tenantId !== scopeTenant) continue;
      if (request.status !== "awaiting_approval" && request.status !== "approved") continue;
      if (time(request.expiresAt) > now) continue;
      expired.push(
        this.transition(
          request,
          "expired",
          { actor: { kind: "system", actorRef: "approval-expiry-sweep" }, reasonCode: "expired", at: asOf },
          scopeTenant,
        ),
      );
    }
    return expired;
  }

  decide(
    requestId: ApprovalRequestId,
    input: ApprovalDecisionInput,
    actor: ApprovalActor,
    scopeTenant: string,
    deps: ApprovalDependencies,
  ): { request: ApprovalRequest; decision: ApprovalDecision } {
    const request = this.requireRequest(requestId, scopeTenant);
    if (!isOneOf(APPROVAL_DECISIONS, input.outcome)) {
      this.fail("APPROVAL_MALFORMED", `unsupported decision outcome: ${input.outcome}`);
    }
    if (!isOneOf(APPROVAL_DECISION_REASON_CODES, input.reasonCode)) {
      this.fail("APPROVAL_MALFORMED", `unsupported decision reason code: ${input.reasonCode}`);
    }
    // An agent can propose but can never decide. Two agents can therefore never satisfy
    // each other's approval requirement.
    if (actor.kind !== "human") {
      this.fail(
        "APPROVAL_AGENT_APPROVER_FORBIDDEN",
        "an agent or system actor can never decide a protected action",
      );
    }
    this.requireActor(actor, "APPROVAL_MALFORMED", "approver");
    const approverAccountId = requireRequestToken(actor.accountId as string, "approver account id");
    const at = time(input.decidedAt);
    const evidenceRef = optionalEvidenceRef(input.evidenceRef ?? null, "decision evidence");

    const idempotencyKey = input.idempotencyKey ?? null;
    if (idempotencyKey !== null) {
      if (!isApprovalToken(idempotencyKey)) {
        this.fail("APPROVAL_MALFORMED", "decision idempotencyKey must be a bounded reference token");
      }
      const existingId = this.idempotency.get(`${scopeTenant}:decision:${idempotencyKey}`);
      if (existingId !== undefined) {
        const existing = this.decisions.get(existingId) as ApprovalDecision;
        if (existing.requestId !== request.id || existing.outcome !== input.outcome) {
          this.fail(
            "APPROVAL_IDEMPOTENCY_CONFLICT",
            `decision idempotency key reused with different content: ${idempotencyKey}`,
          );
        }
        return { request, decision: existing };
      }
    }

    if (request.status === "awaiting_approval" && at >= time(request.expiresAt)) {
      this.transition(
        request,
        "expired",
        { actor, reasonCode: "expired_before_decision", at: input.decidedAt },
        scopeTenant,
      );
      this.fail("APPROVAL_EXPIRED", `approval request ${request.id} has expired`);
    }
    if (request.status !== "awaiting_approval") {
      if (this.decisionsFor(request.id, scopeTenant).length > 0) {
        this.fail("APPROVAL_ALREADY_DECIDED", `approval request ${request.id} was already decided`);
      }
      this.fail(
        "APPROVAL_INVALID_TRANSITION",
        `approval request ${request.id} cannot be decided from ${request.status}`,
      );
    }

    // Self-approval is refused for protected classes. The requester account comes from the
    // stored request, never from the caller.
    if (
      request.selfApprovalForbidden &&
      request.requesterKind === "human" &&
      request.requesterAccountId === approverAccountId
    ) {
      this.fail(
        "APPROVAL_SELF_APPROVAL_FORBIDDEN",
        "a protected action must be approved by an authority other than its requester",
      );
    }

    // A human approver must actually possess the required live authority. A UI role label
    // or a body-supplied authority can never satisfy this.
    const authority = deps.authorities.resolveAuthority({
      tenantId: scopeTenant,
      accountId: approverAccountId,
      authority: request.requiredAuthority,
      branchId: request.branchId,
      asOf: input.decidedAt,
    });
    if (!authority) {
      this.fail(
        "APPROVAL_APPROVER_AUTHORITY_MISSING",
        `approver ${approverAccountId} does not hold ${request.requiredAuthority} for this scope`,
      );
    }
    if (authority.authority !== request.requiredAuthority) {
      this.fail(
        "APPROVAL_APPROVER_AUTHORITY_MISSING",
        `resolved authority ${authority.authority} does not satisfy ${request.requiredAuthority}`,
      );
    }
    if (request.branchId === null && authority.branchId !== null) {
      this.fail(
        "APPROVAL_CROSS_BRANCH",
        "a branch-scoped authority cannot decide a tenant-wide protected action",
      );
    }
    if (request.branchId !== null && authority.branchId !== null && authority.branchId !== request.branchId) {
      this.fail(
        "APPROVAL_CROSS_BRANCH",
        `authority is scoped to ${authority.branchId}, not ${request.branchId}`,
      );
    }
    if (request.evidenceRequired && evidenceRef === null) {
      this.fail(
        "APPROVAL_EVIDENCE_REQUIRED",
        `action ${request.actionType} requires an evidence reference to decide`,
      );
    }

    const decision: ApprovalDecision = {
      id: `decision-${request.id}-${this.decisionsFor(request.id, scopeTenant).length + 1}`,
      tenantId: scopeTenant,
      requestId: request.id,
      outcome: input.outcome,
      approverKind: "human",
      approverAccountId,
      authority,
      evidenceRef,
      reasonCode: input.reasonCode,
      correlationId: request.correlationId,
      decidedAt: input.decidedAt,
    };
    this.decisions.set(decision.id, decision);
    if (idempotencyKey !== null) {
      this.idempotency.set(`${scopeTenant}:decision:${idempotencyKey}`, decision.id);
    }
    const updated = this.transition(
      request,
      input.outcome,
      { actor, reasonCode: input.reasonCode, at: input.decidedAt },
      scopeTenant,
    );
    return { request: updated, decision };
  }

  execute(
    requestId: ApprovalRequestId,
    input: ApprovalExecutionInput,
    actor: ApprovalActor,
    scopeTenant: string,
    deps: ApprovalDependencies,
  ): { request: ApprovalRequest; execution: ApprovalExecution } {
    let request = this.requireRequest(requestId, scopeTenant);
    if (!isOneOf(APPROVAL_EXECUTION_OUTCOMES, input.outcome)) {
      this.fail("APPROVAL_MALFORMED", `unsupported execution outcome: ${input.outcome}`);
    }
    this.requireActor(actor, "APPROVAL_MALFORMED", "executor");
    const digest = requireParametersDigest(input.parametersDigest);
    const receiptRef = optionalEvidenceRef(input.receiptRef ?? null, "execution receipt");
    const evidenceRef = optionalEvidenceRef(input.evidenceRef ?? null, "execution evidence");
    const at = time(input.occurredAt);

    const idempotencyKey = input.idempotencyKey ?? null;
    if (idempotencyKey !== null) {
      if (!isApprovalToken(idempotencyKey)) {
        this.fail("APPROVAL_MALFORMED", "execution idempotencyKey must be a bounded reference token");
      }
      const existingId = this.idempotency.get(`${scopeTenant}:execution:${idempotencyKey}`);
      if (existingId !== undefined) {
        const existing = this.executions.get(existingId) as ApprovalExecution;
        if (
          existing.requestId !== request.id ||
          existing.outcome !== input.outcome ||
          existing.parametersDigest !== digest
        ) {
          this.fail(
            "APPROVAL_IDEMPOTENCY_CONFLICT",
            `execution idempotency key reused with different content: ${idempotencyKey}`,
          );
        }
        return { request, execution: existing };
      }
    }

    // Parameter substitution after approval invalidates the approval instead of executing
    // something the approver never saw.
    if (digest !== request.parametersDigest) {
      if (request.status === "approved" || request.status === "awaiting_approval") {
        this.transition(
          request,
          "superseded",
          { actor, reasonCode: "parameters_changed_after_approval", at: input.occurredAt },
          scopeTenant,
        );
      }
      this.fail(
        "APPROVAL_PARAMETERS_CHANGED",
        "the presented parameters digest does not match the approved action",
      );
    }

    const attempts = this.executionsFor(request.id, scopeTenant);
    const previousUnknown = attempts.some((execution) => execution.outcome === "unknown");

    if (input.outcome === "attempted") {
      if (request.status === "approved" && at >= time(request.expiresAt)) {
        this.transition(
          request,
          "expired",
          { actor, reasonCode: "expired_before_execution", at: input.occurredAt },
          scopeTenant,
        );
        this.fail("APPROVAL_EXPIRED", `approval request ${request.id} has expired`);
      }
      if (request.status === "approved") {
        this.assertLiveApproverAuthority(request, scopeTenant, deps, input.occurredAt);
        request = this.transition(
          request,
          "executing",
          { actor, reasonCode: "execution_started", at: input.occurredAt },
          scopeTenant,
        );
      } else if (request.status !== "executing" && request.status !== "needs_human") {
        this.failInvalidExecution(request);
      } else {
        // A fresh attempt after a human resolution is checked against live authority too.
        this.assertLiveApproverAuthority(request, scopeTenant, deps, input.occurredAt);
        if (request.status === "needs_human") {
          request = this.transition(
            request,
            "executing",
            { actor, reasonCode: "human_resolved_retry", at: input.occurredAt },
            scopeTenant,
          );
        }
      }
      const execution = this.appendExecution(
        request,
        { attempt: attempts.length + 1, outcome: "attempted", digest, receiptRef, evidenceRef, at: input.occurredAt },
        actor,
        scopeTenant,
      );
      if (idempotencyKey !== null) {
        this.idempotency.set(`${scopeTenant}:execution:${idempotencyKey}`, execution.id);
      }
      return { request, execution };
    }

    // A definitive outcome must be evidenced: an external result is never assumed.
    if (receiptRef === null && evidenceRef === null) {
      this.fail(
        "APPROVAL_EVIDENCE_REQUIRED",
        `a ${input.outcome} result requires a receipt or evidence reference`,
      );
    }
    if (previousUnknown && !this.attemptIsOpen(request, attempts)) {
      this.fail(
        "APPROVAL_UNKNOWN_REQUIRES_EVIDENCE",
        "an earlier attempt has an unknown outcome; resolve it through the human exception queue",
      );
    }
    if (request.status === "approved") {
      this.fail(
        "APPROVAL_INVALID_TRANSITION",
        `approval request ${request.id} must be executing before a definitive outcome is recorded`,
      );
    }
    if (request.status !== "executing") {
      this.failInvalidExecution(request);
    }
    const attempt = attempts.length === 0 ? 1 : attempts[attempts.length - 1].attempt;
    const execution = this.appendExecution(
      request,
      { attempt, outcome: input.outcome, digest, receiptRef, evidenceRef, at: input.occurredAt },
      actor,
      scopeTenant,
    );
    if (idempotencyKey !== null) {
      this.idempotency.set(`${scopeTenant}:execution:${idempotencyKey}`, execution.id);
    }
    request = this.transition(
      request,
      input.outcome === "succeeded" ? "succeeded" : "failed",
      { actor, reasonCode: `execution_${input.outcome}`, at: input.occurredAt },
      scopeTenant,
    );
    return { request, execution };
  }

  // An unknown external outcome stays unknown and hands the request to a human. It is
  // never recorded as success or failure.
  recordUnknownOutcome(
    requestId: ApprovalRequestId,
    input: Omit<ApprovalExecutionInput, "outcome">,
    actor: ApprovalActor,
    scopeTenant: string,
    deps: ApprovalDependencies,
  ): { request: ApprovalRequest; execution: ApprovalExecution } {
    let request = this.requireRequest(requestId, scopeTenant);
    this.requireActor(actor, "APPROVAL_MALFORMED", "executor");
    const digest = requireParametersDigest(input.parametersDigest);
    if (digest !== request.parametersDigest) {
      this.fail(
        "APPROVAL_PARAMETERS_CHANGED",
        "the presented parameters digest does not match the approved action",
      );
    }
    const attempts = this.executionsFor(request.id, scopeTenant);
    if (request.status === "approved") {
      if (Date.parse(input.occurredAt) >= Date.parse(request.expiresAt)) {
        this.transition(
          request,
          "expired",
          { actor, reasonCode: "expired_before_execution", at: input.occurredAt },
          scopeTenant,
        );
        this.fail("APPROVAL_EXPIRED", `approval request ${request.id} has expired`);
      }
      // The live authority of the approver is re-checked here too: an unknown outcome is not
      // a licence to keep acting on a stale approval.
      this.assertLiveApproverAuthority(request, scopeTenant, deps, input.occurredAt);
      request = this.transition(
        request,
        "executing",
        { actor, reasonCode: "execution_started", at: input.occurredAt },
        scopeTenant,
      );
    }
    if (request.status !== "executing") {
      this.failInvalidExecution(request);
    }
    const execution = this.appendExecution(
      request,
      {
        attempt: attempts.length === 0 ? 1 : attempts[attempts.length - 1].attempt,
        outcome: "unknown",
        digest,
        receiptRef: optionalEvidenceRef(input.receiptRef ?? null, "execution receipt"),
        evidenceRef: optionalEvidenceRef(input.evidenceRef ?? null, "execution evidence"),
        at: input.occurredAt,
      },
      actor,
      scopeTenant,
    );
    request = this.transition(
      request,
      "needs_human",
      { actor, reasonCode: "unknown_external_outcome", at: input.occurredAt },
      scopeTenant,
    );
    return { request, execution };
  }

  private assertLiveApproverAuthority(
    request: ApprovalRequest,
    scopeTenant: string,
    deps: ApprovalDependencies,
    asOf: string,
  ): void {
    const decisions = this.decisionsFor(request.id, scopeTenant);
    const approved = decisions[decisions.length - 1];
    if (!approved || approved.outcome !== "approved") {
      this.fail("APPROVAL_INVALID_TRANSITION", `approval request ${request.id} has no approval`);
    }
    const live = deps.authorities.resolveAuthority({
      tenantId: scopeTenant,
      accountId: approved.approverAccountId,
      authority: request.requiredAuthority,
      branchId: request.branchId,
      asOf,
    });
    if (!live) {
      // Revoked, suspended, expired or withdrawn approver authority invalidates the unused
      // approval rather than letting it execute.
      this.transition(
        request,
        "superseded",
        {
          actor: { kind: "system", actorRef: "approval-authority-recheck" },
          reasonCode: "approver_authority_revoked",
          at: asOf,
        },
        scopeTenant,
      );
      this.fail(
        "APPROVAL_APPROVER_AUTHORITY_REVOKED",
        `approver ${approved.approverAccountId} no longer holds ${request.requiredAuthority}`,
      );
    }
    if (request.branchId === null && live.branchId !== null) {
      this.fail("APPROVAL_CROSS_BRANCH", "the approver authority no longer covers this scope");
    }
    if (request.branchId !== null && live.branchId !== null && live.branchId !== request.branchId) {
      this.fail("APPROVAL_CROSS_BRANCH", "the approver authority no longer covers this branch");
    }
  }

  private attemptIsOpen(
    request: ApprovalRequest,
    attempts: readonly ApprovalExecution[],
  ): boolean {
    if (attempts.length === 0) return true;
    const last = attempts[attempts.length - 1];
    return request.status === "executing" && last.outcome === "attempted";
  }

  private failInvalidExecution(request: ApprovalRequest): never {
    if (APPROVAL_TERMINAL_STATUSES.includes(request.status)) {
      this.fail(
        "APPROVAL_TERMINAL_IMMUTABLE",
        `approval request ${request.id} is ${request.status} and cannot be executed`,
      );
    }
    this.fail(
      "APPROVAL_INVALID_TRANSITION",
      `approval request ${request.id} cannot be executed from ${request.status}`,
    );
  }

  private appendExecution(
    request: ApprovalRequest,
    input: {
      attempt: number;
      outcome: ApprovalExecutionOutcome;
      digest: string;
      receiptRef: string | null;
      evidenceRef: string | null;
      at: string;
    },
    actor: ApprovalActor,
    scopeTenant: string,
  ): ApprovalExecution {
    const execution: ApprovalExecution = {
      id: `execution-${request.id}-${this.executionsFor(request.id, scopeTenant).length + 1}`,
      tenantId: scopeTenant,
      requestId: request.id,
      attempt: input.attempt,
      outcome: input.outcome,
      executorKind: actor.kind as ApprovalActorKind,
      executorAccountId: actor.accountId ?? null,
      executorAgentId: actor.agentIdentityId ?? null,
      executorRef: actor.actorRef ?? null,
      parametersDigest: input.digest,
      receiptRef: input.receiptRef,
      evidenceRef: input.evidenceRef,
      correlationId: request.correlationId,
      occurredAt: input.at,
    };
    this.executions.set(execution.id, execution);
    return execution;
  }

  decisionsFor(requestId: ApprovalRequestId, scopeTenant: string): ApprovalDecision[] {
    return [...this.decisions.values()]
      .filter((decision) => decision.requestId === requestId && decision.tenantId === scopeTenant)
      .sort((left, right) => left.decidedAt.localeCompare(right.decidedAt));
  }

  executionsFor(requestId: ApprovalRequestId, scopeTenant: string): ApprovalExecution[] {
    return [...this.executions.values()]
      .filter((execution) => execution.requestId === requestId && execution.tenantId === scopeTenant)
      .sort((left, right) =>
        left.occurredAt === right.occurredAt
          ? left.id.localeCompare(right.id)
          : left.occurredAt.localeCompare(right.occurredAt),
      );
  }

  eventsFor(requestId: ApprovalRequestId, scopeTenant: string): ApprovalEvent[] {
    return [...this.events.values()].filter(
      (event) => event.requestId === requestId && event.tenantId === scopeTenant,
    );
  }

  getRequest(id: ApprovalRequestId, scopeTenant: string): ApprovalRequest {
    return this.requireRequest(id, scopeTenant);
  }

  listRequests(scopeTenant: string, filter: ApprovalRequestFilter = {}): ApprovalRequest[] {
    return [...this.requests.values()].filter(
      (request) =>
        request.tenantId === scopeTenant &&
        (filter.branchId === undefined || request.branchId === filter.branchId) &&
        (filter.status === undefined || request.status === filter.status) &&
        (filter.actionType === undefined || request.actionType === filter.actionType) &&
        (filter.requesterAccountId === undefined ||
          request.requesterAccountId === filter.requesterAccountId),
    );
  }

  // -------------------------------------------------------------------------
  // Human exception queue
  // -------------------------------------------------------------------------

  async openException(
    input: ExceptionOpenInput,
    scopeTenant: string,
    actor: ApprovalActor,
  ): Promise<ExceptionCase> {
    this.checkTenant(input.tenantId, scopeTenant, "EXCEPTION_CROSS_TENANT");
    requireRequestToken(input.id, "exception case id", "EXCEPTION_MALFORMED");
    if (!requiredText(input.provenance?.sourceRef) || !requiredText(input.provenance?.sourceRevision)) {
      this.fail("EXCEPTION_MALFORMED", "an exception case must carry provenance");
    }
    this.requireActor(actor, "EXCEPTION_MALFORMED", "opening actor");
    if (!isOneOf(EXCEPTION_KINDS, input.kind)) {
      this.fail("EXCEPTION_UNKNOWN_KIND", `unsupported exception kind: ${input.kind}`);
    }
    if (!isOneOf(EXCEPTION_SEVERITIES, input.severity)) {
      this.fail("EXCEPTION_INVALID_SEVERITY", `unsupported severity: ${input.severity}`);
    }
    const branchId = requireRequestToken(input.branchId, "branch id", "EXCEPTION_MALFORMED");
    // The W3 work item is what owns the human follow-up. A case without one would be an
    // unowned record, which is exactly what this slice must not create.
    const workItemTaskId = requireRequestToken(
      input.workItemTaskId,
      "work item task id",
      "EXCEPTION_WORK_ITEM_REQUIRED",
    );
    const subjectRef =
      input.subjectId === null || input.subjectId === undefined
        ? null
        : await collaborationPseudonym("subject", scopeTenant, "exception_case", input.subjectId);
    const openedAt = input.openedAt;
    time(openedAt);
    const slaDueAt = new Date(
      time(openedAt) + EXCEPTION_SLA_HOURS[input.severity] * 60 * 60 * 1000,
    ).toISOString();
    const fingerprint = JSON.stringify([
      branchId,
      input.kind,
      input.severity,
      workItemTaskId,
      subjectRef,
      input.correlationId ?? null,
    ]);

    const idempotencyKey = input.idempotencyKey ?? null;
    if (idempotencyKey !== null) {
      if (!isApprovalToken(idempotencyKey)) {
        this.fail("EXCEPTION_MALFORMED", "idempotencyKey must be a bounded reference token");
      }
      const existingId = this.exceptionIdempotency.get(`${scopeTenant}:exception:${idempotencyKey}`);
      if (existingId !== undefined) {
        if (this.exceptionFingerprints.get(existingId) !== fingerprint) {
          this.fail(
            "EXCEPTION_IDEMPOTENCY_CONFLICT",
            `exception idempotency key reused with different content: ${idempotencyKey}`,
          );
        }
        return this.exceptions.get(existingId) as ExceptionCase;
      }
    }
    if (this.exceptions.has(input.id)) {
      this.fail("EXCEPTION_DUPLICATE_ID", `duplicate exception case id: ${input.id}`);
    }

    const record: ExceptionCase = {
      id: input.id,
      tenantId: scopeTenant,
      branchId,
      kind: input.kind,
      severity: input.severity,
      status: "open",
      workItemTaskId,
      subjectRef,
      evidenceRequired: EXCEPTION_EVIDENCE_REQUIRED[input.kind],
      slaDueAt,
      resolutionCode: null,
      closureEvidenceRef: null,
      correlationId: optionalEvidenceRef(
        input.correlationId ?? null,
        "correlation id",
        "EXCEPTION_MALFORMED",
      ),
      idempotencyKey,
      provenance: input.provenance,
      openedAt,
      updatedAt: openedAt,
      closedAt: null,
    };
    this.exceptions.set(record.id, record);
    this.exceptionFingerprints.set(record.id, fingerprint);
    if (idempotencyKey !== null) {
      this.exceptionIdempotency.set(`${scopeTenant}:exception:${idempotencyKey}`, record.id);
    }
    this.recordExceptionEvent(
      {
        tenantId: scopeTenant,
        caseId: record.id,
        action: "opened",
        fromStatus: null,
        toStatus: "open",
        actor,
        reasonCode: input.kind,
        occurredAt: openedAt,
      },
      scopeTenant,
    );
    return record;
  }

  // Assignment is owned by W3. The W3 store performs the assignment first and reports its
  // own result; C3 only mirrors that a human owner now exists for the case.
  assignException(
    caseId: ExceptionCaseId,
    input: ExceptionAssignmentInput,
    actor: ApprovalActor,
    scopeTenant: string,
  ): ExceptionCase {
    const record = this.requireException(caseId, scopeTenant);
    this.requireActor(actor, "EXCEPTION_MALFORMED", "assigning actor");
    requireRequestToken(input.assigneeAccountId, "assignee account id", "EXCEPTION_MALFORMED");
    requireRequestToken(
      input.assigneeStaffAssignmentId,
      "assignee staff assignment id",
      "EXCEPTION_MALFORMED",
    );
    if (!requiredText(input.workItemStatus)) {
      this.fail("EXCEPTION_WORK_ITEM_REQUIRED", "the linked work item must report its status");
    }
    const updated = this.applyExceptionStatus(
      record,
      "assigned",
      { actor, reasonCode: `work_item_${input.workItemStatus}`, at: input.at, action: "assigned" },
      scopeTenant,
    );
    return updated;
  }

  transitionException(
    caseId: ExceptionCaseId,
    input: ExceptionTransitionInput,
    actor: ApprovalActor,
    scopeTenant: string,
  ): ExceptionCase {
    return this.applyExceptionTransition(caseId, input, actor, scopeTenant);
  }

  escalateException(
    caseId: ExceptionCaseId,
    input: { reasonCode: string; at: string },
    actor: ApprovalActor,
    scopeTenant: string,
  ): ExceptionCase {
    const record = this.requireException(caseId, scopeTenant);
    if (!requiredText(input.reasonCode)) {
      this.fail("EXCEPTION_MALFORMED", "an escalation requires a reason code");
    }
    return this.applyExceptionStatus(
      record,
      "escalated",
      { actor, reasonCode: input.reasonCode, at: input.at, action: "escalated" },
      scopeTenant,
    );
  }

  private applyExceptionTransition(
    caseId: ExceptionCaseId,
    input: ExceptionTransitionInput,
    actor: ApprovalActor,
    scopeTenant: string,
  ): ExceptionCase {
    let record = this.requireException(caseId, scopeTenant);
    this.requireActor(actor, "EXCEPTION_MALFORMED", "acting user");
    if (!isOneOf(EXCEPTION_STATUSES, input.status)) {
      this.fail("EXCEPTION_MALFORMED", `unsupported exception status: ${input.status}`);
    }
    if (!requiredText(input.reasonCode)) {
      this.fail("EXCEPTION_MALFORMED", "every exception transition requires a reason code");
    }
    const resolutionCode = input.resolutionCode ?? null;
    if (resolutionCode !== null && !isOneOf(EXCEPTION_RESOLUTION_CODES, resolutionCode)) {
      this.fail("EXCEPTION_MALFORMED", `unsupported resolution code: ${resolutionCode}`);
    }
    const evidenceRef = optionalEvidenceRef(input.evidenceRef ?? null, "closure evidence");

    // The status edge is validated first, so an illegal jump is refused as such rather than
    // being reported as a missing resolution code.
    this.assertExceptionTransition(record.status, input.status);

    if (input.status === "resolved") {
      if (resolutionCode === null) {
        this.fail("EXCEPTION_MISSING_RESOLUTION", "resolving a case requires a resolution code");
      }
      record = { ...record, resolutionCode };
    }

    if (input.status === "closed") {
      if (record.resolutionCode === null) {
        this.fail("EXCEPTION_MISSING_RESOLUTION", "a case must be resolved before it is closed");
      }
      // An unknown external outcome stays unknown: it can be escalated or investigated, but
      // it can never be closed as if the outcome were settled.
      if (record.resolutionCode === "unknown_outcome") {
        this.fail(
          "EXCEPTION_UNKNOWN_CANNOT_CLOSE",
          "a case whose resolution is unknown cannot be closed",
        );
      }
      if (record.evidenceRequired && evidenceRef === null) {
        this.fail(
          "EXCEPTION_EVIDENCE_REQUIRED",
          `exception kind ${record.kind} requires an evidence reference to close`,
        );
      }
      if (evidenceRef !== null) record = { ...record, closureEvidenceRef: evidenceRef };
      this.exceptions.set(record.id, record);
    }

    const updated = this.applyExceptionStatus(
      record,
      input.status,
      { actor, reasonCode: input.reasonCode, at: input.at },
      scopeTenant,
    );
    if (input.status === "closed") {
      const closed: ExceptionCase = { ...updated, closedAt: input.at };
      this.exceptions.set(closed.id, closed);
      return closed;
    }
    return updated;
  }

  getException(id: ExceptionCaseId, scopeTenant: string): ExceptionCase {
    return this.requireException(id, scopeTenant);
  }

  listExceptions(scopeTenant: string, filter: ExceptionFilter = {}): ExceptionCase[] {
    return [...this.exceptions.values()].filter(
      (record) =>
        record.tenantId === scopeTenant &&
        (filter.branchId === undefined || record.branchId === filter.branchId) &&
        (filter.status === undefined || record.status === filter.status) &&
        (filter.kind === undefined || record.kind === filter.kind) &&
        (filter.severity === undefined || record.severity === filter.severity),
    );
  }

  exceptionEventsFor(caseId: ExceptionCaseId, scopeTenant: string): ExceptionEvent[] {
    return [...this.exceptionEvents.values()].filter(
      (event) => event.caseId === caseId && event.tenantId === scopeTenant,
    );
  }
}
