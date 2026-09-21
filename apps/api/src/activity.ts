
// N5/C2: derived human + agent operational activity API for Zyara Clinic.
//
// Activity is a projection, never authority. These routes read the derived
// operational feed; there is deliberately NO public write route, because a
// client-declared "authoritative event" would fabricate source-domain authority.
// Projection runs on the server-side call path immediately after an authoritative
// domain operation, and a projection failure never fails or rolls back that
// authoritative operation.
//
// Tenant identity derives only from verified session claims; a request-body
// tenantId is ignored. Sensitivity and visibility are separate gates: an operator
// who may see clinic operations is not automatically allowed to see restricted
// activity, which requires an explicit clinical role.
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { BranchRole } from "@zyara/authorization";
import type { WhatsappWebhookReceipt } from "@zyara/communication";
import {
  ActivityError,
  ActivityStore,
  activityTitle,
  isActivityToken,
  resolvedStatus,
  type ActivityActorAuthority,
  type ActivityAgentDirectory,
  type ActivityAction,
  type ActivityProjectionInput,
  type ActivityReadAudience,
  type ActivityRecord,
  type ActivityResult,
  type ApprovalEvent,
  type ApprovalRequest,
  type ApprovalStatus,
  type AgentIdentityEvent,
  type ExceptionCase,
  type ExceptionEvent,
  type ExceptionStatus,
} from "@zyara/collaboration";
import type { OpsTask, OpsTaskComment, OpsTaskEvent } from "@zyara/enterprise-access";
import { agentIdentityStore } from "./agents.js";
import { approvalStore } from "./approvals.js";
import { taskStore } from "./tasks.js";
import { authorize, requestTenant } from "./auth.js";
import { workforceMembershipsFor } from "./workforce.js";

export const activityStore = new ActivityStore();

// The trusted C1 registry supplies an agent's authority state. The activity layer
// never invents agent authority; an unknown identity is refused at projection time.
export const activityAgentDirectory: ActivityAgentDirectory = {
  resolveAuthorityState(
    tenantId: string,
    agentIdentityId: string,
    asOf: string,
  ): ActivityActorAuthority | null {
    const identity = agentIdentityStore.identities.get(agentIdentityId);
    if (!identity || identity.tenantId !== tenantId) return null;
    return resolvedStatus(identity, asOf);
  },
};

// Projection failures are recorded rather than thrown: the authoritative operation
// has already committed and must not be failed by its derived feed. Nothing here is
// hidden from evidence, and tests assert the list is empty on the happy path.
export interface ActivityProjectionFailure {
  at: string;
  tenantId: string;
  sourceDomain: string;
  sourceEventId: string;
  code: string;
}
export const activityProjectionFailures: ActivityProjectionFailure[] = [];

function provenance(sourceRef: string) {
  return {
    source: "zyara-native" as const,
    sourceRef,
    sourceRevision: process.env.ZYARA_BUILD ?? "n5c2-dev",
    observedAt: new Date().toISOString(),
  };
}

// Source-owned metadata that fails the reference shape is dropped rather than
// stored: a correlation id is context, never a reason to admit an identifier.
function optionalToken(value: string | null | undefined): string | null {
  return typeof value === "string" && isActivityToken(value) ? value : null;
}

// An automation actor that names a C1 agent identity is attributed to that agent;
// any other automation actor stays a system actor. Either way the actor is explicit
// and an account id is never used as a free-text actor name.
function automationActor(tenantId: string, accountId: string) {
  const prefix = "agent:";
  if (accountId.startsWith(prefix)) {
    const agentIdentityId = accountId.slice(prefix.length);
    const state = activityAgentDirectory.resolveAuthorityState(
      tenantId,
      agentIdentityId,
      new Date().toISOString(),
    );
    if (state !== null) return { kind: "agent", agentIdentityId };
  }
  return { kind: "system", actorRef: optionalToken(accountId) ?? "automation-unattributed" };
}

async function project(input: ActivityProjectionInput): Promise<void> {
  try {
    await activityStore.record(input, input.tenantId, activityAgentDirectory);
  } catch (error) {
    if (error instanceof ActivityError) {
      activityProjectionFailures.push({
        at: new Date().toISOString(),
        tenantId: input.tenantId,
        sourceDomain: input.sourceDomain,
        sourceEventId: input.sourceEventId,
        code: error.code,
      });
      return;
    }
    throw error;
  }
}

const PROJECTION_SOURCE_REF = "n5c2-activity-projection";

function taskResult(event: OpsTaskEvent): ActivityResult {
  if (event.action !== "transitioned") return "observed";
  if (event.toStatus === "resolved") return "succeeded";
  if (event.toStatus === "cancelled") return "rejected";
  if (event.toStatus === "blocked") return "unresolved";
  return "observed";
}

function taskActor(tenantId: string, kind: string, accountId: string) {
  return kind === "human"
    ? { kind: "human", accountId }
    : automationActor(tenantId, accountId);
}

// W3 task trail -> derived operational activity. The task stays the source of truth;
// only state codes and identifiers are projected. A task title, detail or comment
// body is never copied into the feed.
export async function projectTaskActivity(tenantId: string, taskId: string): Promise<void> {
  const task: OpsTask | undefined = taskStore.tasks.get(taskId);
  if (!task || task.tenantId !== tenantId) return;
  const base = {
    tenantId,
    sourceDomain: "workforce.tasks",
    category: "task",
    subjectType: "task",
    subjectId: task.id,
    branchId: task.branchId,
    visibilityScope: "branch",
    sensitivity: "operational",
    provenance: provenance(PROJECTION_SOURCE_REF),
  };
  for (const event of taskStore.listEvents(taskId, tenantId)) {
    const payload: Record<string, string> = {};
    if (event.action === "created") {
      payload.taskKind = task.kind;
      payload.originKind = event.actor.kind;
    }
    if (event.action === "transitioned" && event.toStatus !== null) {
      payload.previousValue = event.fromStatus ?? "none";
      payload.newValue = event.toStatus;
    }
    await project({
      ...base,
      id: `activity-${task.id}-${event.id}`,
      actor: taskActor(tenantId, event.actor.kind, event.actor.accountId),
      sourceEventId: event.id,
      action: event.action,
      result: taskResult(event),
      correlationId: optionalToken(task.correlationId),
      occurredAt: event.occurredAt,
      payload,
    });
  }
  // Comments are projected by ordinal, so a caller-supplied comment id never becomes
  // a stored source reference. The comment body itself is never projected.
  const comments: OpsTaskComment[] = taskStore.listComments(taskId, tenantId);
  for (let index = 0; index < comments.length; index += 1) {
    const comment = comments[index];
    await project({
      ...base,
      id: `activity-${task.id}-comment-${index + 1}`,
      actor: taskActor(tenantId, comment.author.kind, comment.author.accountId),
      sourceEventId: `${task.id}:comment:${index + 1}`,
      action: "commented",
      result: "observed",
      correlationId: optionalToken(task.correlationId),
      occurredAt: comment.createdAt,
    });
  }
}

function agentEventResult(action: AgentIdentityEvent["action"]): ActivityResult {
  return action === "created" ? "observed" : "succeeded";
}

function agentEventActor(tenantId: string, event: AgentIdentityEvent) {
  if (event.actor.kind === "human") return { kind: "human", accountId: event.actor.accountId };
  if (event.actor.kind === "agent") return { kind: "agent", agentIdentityId: event.actor.accountId };
  return automationActor(tenantId, event.actor.accountId);
}

// C1 identity trail -> derived operational activity. Agent-authority changes are
// operational events: they describe that authority moved, and they never grant it.
export async function projectAgentIdentityActivity(tenantId: string, agentId: string): Promise<void> {
  const identity = agentIdentityStore.identities.get(agentId);
  if (!identity || identity.tenantId !== tenantId) return;
  for (const event of agentIdentityStore.listEvents(agentId, tenantId)) {
    await project({
      id: `activity-${agentId}-${event.id}`,
      tenantId,
      branchId: identity.branchId,
      actor: agentEventActor(tenantId, event),
      sourceDomain: "identity.agents",
      sourceEventId: event.id,
      category: "agent_identity",
      action: event.action,
      result: agentEventResult(event.action),
      subjectType: "agent_identity",
      subjectId: identity.id,
      sensitivity: "operational",
      // A tenant-wide agent identity is tenant-scoped; a branch-scoped identity
      // stays inside its branch.
      visibilityScope: identity.branchId === null ? "tenant" : "branch",
      correlationId: optionalToken(identity.correlationId),
      occurredAt: event.occurredAt,
      provenance: provenance(PROJECTION_SOURCE_REF),
    });
  }
}

// W4 verified webhook receipt -> derived operational activity. Metadata only: the
// provider event kind, never a phone number, contact name or message body.
export async function projectWhatsappReceiptActivity(
  tenantId: string,
  accountId: string,
  receipt: WhatsappWebhookReceipt,
): Promise<void> {
  if (!isActivityToken(receipt.id)) return;
  await project({
    id: `activity-whatsapp-${receipt.id}`,
    tenantId,
    actor: { kind: "external", actorRef: `whatsapp.${accountId}` },
    sourceDomain: "communications.whatsapp",
    sourceEventId: receipt.id,
    category: "communication",
    action: receipt.kind === "message_received" ? "received" : "observed",
    result: "observed",
    subjectType: "none",
    sensitivity: "operational",
    visibilityScope: "tenant",
    occurredAt: receipt.receivedAt,
    provenance: provenance(PROJECTION_SOURCE_REF),
  });
}

// ---------------------------------------------------------------------------
// N5/C3: approvals and the human exception queue are derived into C2 activity
// ---------------------------------------------------------------------------
//
// Activity stays derived. An approval or exception record remains the authority; an
// activity row is a projection of it, and there is no path from the feed back into C3
// state. This is why the projection re-reads the authoritative store every time instead of
// accepting a caller-supplied status.

const APPROVAL_STATUS_ACTIONS: Record<ApprovalStatus, ActivityAction> = {
  proposed: "proposed",
  awaiting_approval: "approval_requested",
  approved: "approved",
  rejected: "rejected",
  expired: "expired",
  cancelled: "cancelled",
  superseded: "superseded",
  executing: "execution_attempted",
  succeeded: "execution_succeeded",
  failed: "execution_failed",
  needs_human: "needs_human",
};

const APPROVAL_STATUS_RESULTS: Record<ApprovalStatus, ActivityResult> = {
  proposed: "proposed",
  awaiting_approval: "proposed",
  approved: "succeeded",
  rejected: "rejected",
  expired: "expired",
  cancelled: "rejected",
  superseded: "denied",
  executing: "observed",
  succeeded: "succeeded",
  failed: "failed",
  needs_human: "unresolved",
};

const EXCEPTION_STATUS_ACTIONS: Record<ExceptionStatus, ActivityAction> = {
  open: "opened",
  assigned: "assigned",
  in_review: "transitioned",
  escalated: "escalated",
  resolved: "resolved",
  closed: "closed",
  cancelled: "cancelled",
};

const EXCEPTION_STATUS_RESULTS: Record<ExceptionStatus, ActivityResult> = {
  open: "observed",
  assigned: "observed",
  in_review: "observed",
  escalated: "unresolved",
  resolved: "succeeded",
  closed: "succeeded",
  cancelled: "rejected",
};

// A C3 actor is typed exactly like every other collaboration actor: a human resolves to a
// server-authoritative account, an agent to a live bounded C1 identity, and anything else
// stays a namespaced system reference. A free-text actor name can never satisfy this.
function collaborationActor(
  tenantId: string,
  actor: {
    kind: string;
    accountId?: string | null;
    agentIdentityId?: string | null;
    actorRef?: string | null;
  },
) {
  if (actor.kind === "human" && isActivityToken(actor.accountId)) {
    return { kind: "human", accountId: actor.accountId as string };
  }
  if (actor.kind === "agent") {
    const agentIdentityId = actor.agentIdentityId ?? "";
    const state = activityAgentDirectory.resolveAuthorityState(
      tenantId,
      agentIdentityId,
      new Date().toISOString(),
    );
    if (state !== null) return { kind: "agent", agentIdentityId };
    return { kind: "system", actorRef: optionalToken(agentIdentityId) ?? "agent-unattributed" };
  }
  return {
    kind: "system",
    actorRef: optionalToken(actor.actorRef ?? null) ?? "automation-unattributed",
  };
}

// Approval trail -> derived operational activity. Only closed codes are projected: the
// action type, the risk class, the required authority and the resulting status. Protected
// parameter values were never stored in C3 and cannot appear here either.
export async function projectApprovalActivity(tenantId: string, requestId: string): Promise<void> {
  const request: ApprovalRequest | undefined = approvalStore.requests.get(requestId);
  if (!request || request.tenantId !== tenantId) return;
  const events: ApprovalEvent[] = approvalStore.eventsFor(requestId, tenantId);
  for (const event of events) {
    await project({
      id: `activity-${request.id}-${event.id}`,
      tenantId,
      branchId: request.branchId,
      actor: collaborationActor(tenantId, event.actor),
      sourceDomain: "collaboration.approvals",
      sourceEventId: event.id,
      category: "approval",
      action: APPROVAL_STATUS_ACTIONS[event.toStatus],
      result: APPROVAL_STATUS_RESULTS[event.toStatus],
      subjectType: "approval_request",
      subjectId: request.id,
      sensitivity: "operational",
      // A tenant-wide protected action stays tenant-scoped; a branch request stays inside
      // its branch.
      visibilityScope: request.branchId === null ? "tenant" : "branch",
      correlationId: optionalToken(request.correlationId),
      occurredAt: event.occurredAt,
      payload: {
        riskClass: request.riskClass,
        requiredAuthority: request.requiredAuthority,
        approvalStatus: event.toStatus,
      },
      provenance: provenance(PROJECTION_SOURCE_REF),
    });
  }
}

// Exception trail -> derived operational activity. The payload holds only properties of the
// event itself: the owning work item's mutable status belongs to W3 and is read from the
// queue, so re-projecting the same event stays byte-identical instead of diverging.
export async function projectExceptionActivity(tenantId: string, caseId: string): Promise<void> {
  const record: ExceptionCase | undefined = approvalStore.exceptions.get(caseId);
  if (!record || record.tenantId !== tenantId) return;
  const events: ExceptionEvent[] = approvalStore.exceptionEventsFor(caseId, tenantId);
  for (const event of events) {
    const payload: Record<string, string> = {
      exceptionKind: record.kind,
      exceptionSeverity: record.severity,
      exceptionStatus: event.toStatus,
    };
    await project({
      id: `activity-${record.id}-${event.id}`,
      tenantId,
      branchId: record.branchId,
      actor: collaborationActor(tenantId, event.actor),
      sourceDomain: "collaboration.exceptions",
      sourceEventId: event.id,
      category: "exception",
      action: EXCEPTION_STATUS_ACTIONS[event.toStatus],
      result: EXCEPTION_STATUS_RESULTS[event.toStatus],
      subjectType: "exception_case",
      subjectId: record.id,
      sensitivity: "operational",
      visibilityScope: "branch",
      correlationId: optionalToken(record.correlationId),
      occurredAt: event.occurredAt,
      payload,
      provenance: provenance(PROJECTION_SOURCE_REF),
    });
  }
}

const ACTIVITY_BRANCH_READERS: BranchRole[] = ["org_admin", "branch_admin", "clinician", "receptionist"];
const ACTIVITY_TENANT_READERS: BranchRole[] = ["org_admin"];

function scoped(req: FastifyRequest, action: string, branchId: string | null, allowRoles: BranchRole[]) {
  const { claims } = requestTenant(req);
  const memberships = workforceMembershipsFor(claims.tenant, claims.sub);
  const decision = authorize(
    { claims, memberships },
    {
      action,
      resourceTenant: claims.tenant,
      resourceBranch: branchId,
      requireAssurance: "aal2",
      allowRoles,
    },
  );
  return { claims, memberships, decision };
}

function malformed(reply: { code(code: number): { send(body: unknown): unknown } }, detail: string) {
  return reply.code(400).send({ error: "ACTIVITY_MALFORMED", detail });
}

function activityFailure(reply: { code(code: number): { send(body: unknown): unknown } }, error: unknown) {
  if (error instanceof ActivityError) {
    if (error.code === "ACTIVITY_UNKNOWN_REFERENCE") {
      return reply.code(404).send({ error: error.code });
    }
    if (error.code === "ACTIVITY_RESTRICTED_DENIED" || error.code === "ACTIVITY_VISIBILITY_DENIED") {
      return reply.code(403).send({ error: error.code });
    }
    return reply.code(400).send({ error: error.code });
  }
  return reply.code(401).send({ error: "UNAUTHENTICATED" });
}

function audienceFor(
  claims: { sub: string; tenant: string },
  memberships: readonly { tenantId: string; branchId: string | null; role: BranchRole; revoked: boolean }[],
  allowRestricted: boolean,
): ActivityReadAudience {
  const active = memberships.filter(
    (membership) => membership.tenantId === claims.tenant && !membership.revoked,
  );
  return {
    tenantId: claims.tenant,
    accountId: claims.sub,
    tenantWide: active.some((membership) => membership.role === "org_admin"),
    branchIds: active
      .map((membership) => membership.branchId)
      .filter((branchId): branchId is string => branchId !== null),
    allowRestricted: allowRestricted && active.some((membership) => membership.role === "clinician"),
  };
}

function serialize(record: ActivityRecord) {
  return {
    ...record,
    // Titles are derived from the closed enumerations, never stored.
    title: activityTitle(record),
  };
}

export interface ActivityQuery {
  branchId?: string;
  category?: string;
  actorKind?: string;
  subjectType?: string;
  subjectRef?: string;
  since?: string;
  until?: string;
  limit?: string;
  includeRestricted?: string;
}

export function registerActivityRoutes(app: FastifyInstance) {
  app.get("/workforce/activity", async (req, reply) => {
    try {
      const query = (req.query ?? {}) as ActivityQuery;
      const branchId = query.branchId ?? null;
      const { claims, memberships, decision } = scoped(
        req,
        "workforce.activity.read",
        branchId,
        branchId ? ACTIVITY_BRANCH_READERS : ACTIVITY_TENANT_READERS,
      );
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });

      // Restricted activity needs its own clinical authorization. An operations
      // administrator who holds no clinical role is refused rather than downgraded.
      const includeRestricted = query.includeRestricted === "true";
      const audience = audienceFor(claims, memberships, includeRestricted);
      if (includeRestricted && !audience.allowRestricted) {
        return reply.code(403).send({ error: "ACTIVITY_RESTRICTED_DENIED" });
      }

      const limit = query.limit === undefined ? undefined : Number(query.limit);
      if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 500)) {
        return malformed(reply, "limit must be an integer between 1 and 500");
      }
      const records = activityStore.listVisible(
        audience,
        {
          ...(branchId ? { branchId } : {}),
          ...(query.category ? { category: query.category } : {}),
          ...(query.actorKind ? { actorKind: query.actorKind } : {}),
          ...(query.subjectType ? { subjectType: query.subjectType } : {}),
          ...(query.subjectRef ? { subjectRef: query.subjectRef } : {}),
          ...(query.since ? { since: query.since } : {}),
          ...(query.until ? { until: query.until } : {}),
          ...(limit !== undefined ? { limit } : {}),
        },
        { includeRestricted },
      );
      return records.map(serialize);
    } catch (error) {
      return activityFailure(reply, error);
    }
  });

  app.get("/workforce/activity/:id", async (req, reply) => {
    try {
      const params = (req.params ?? {}) as { id?: string };
      const id = typeof params.id === "string" && params.id.trim().length > 0 ? params.id.trim() : null;
      if (!id) return malformed(reply, "activity id is required");
      const { claims, memberships, decision } = scoped(
        req,
        "workforce.activity.read",
        null,
        ACTIVITY_BRANCH_READERS,
      );
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });
      const record = activityStore.get(id, claims.tenant);
      const audience = audienceFor(claims, memberships, true);
      if (!activityStore.visibleTo(record, audience)) {
        throw new ActivityError("ACTIVITY_VISIBILITY_DENIED", "activity record is not visible to this caller");
      }
      return serialize(record);
    } catch (error) {
      return activityFailure(reply, error);
    }
  });
}
