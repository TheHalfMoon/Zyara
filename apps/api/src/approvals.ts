// N5/C3 scoped approvals + human exception queue API for Zyara Clinic.
//
// This is the governed bridge between AI / automation / external events and
// human-authorized operational actions. It is not a generic "approve = true" table:
// a request binds tenant, branch, action type, a digest of the protected parameters,
// requester, required authority, policy/risk class, evidence, creation time, expiry and
// correlation id, and the approval carries a live authority snapshot rather than a role
// label.
//
// Tenant identity derives only from verified session claims; a request-body tenantId is
// ignored and a body-supplied requester, approver or authority is refused outright. There
// is still no verified agent credential path, so no route here lets an agent authenticate:
// proposals are attributed to the verified human caller, and a client that claims to be an
// automation is refused rather than trusted.
//
// The exception queue links every case to the W3 work item that owns assignment, ownership,
// due date, escalation and follow-up. C3 adds approval and exception semantics; it does not
// become a second task manager.
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { BranchRole } from "@zyara/authorization";
import {
  APPROVAL_DECISION_REASON_CODES,
  APPROVAL_EXECUTION_OUTCOMES,
  APPROVAL_STATUSES,
  ApprovalError,
  ApprovalStore,
  EXCEPTION_KINDS,
  EXCEPTION_SEVERITIES,
  EXCEPTION_SLA_HOURS,
  EXCEPTION_STATUSES,
  exceptionSlaState,
  resolvedStatus,
  type ApprovalActor,
  type ApprovalAgentDirectory,
  type ApprovalAgentState,
  type ApprovalAuthorityDirectory,
  type ApprovalAuthoritySnapshot,
  type ApprovalDecisionOutcome,
  type ApprovalDecisionReasonCode,
  type ApprovalExecutionInput,
  type ApprovalExecutionOutcome,
  type ApprovalRequest,
  type ApprovalRequestFilter,
  type ApprovalStatus,
  type ApproverAuthority,
  type CollaborationProvenance,
  type ExceptionCase,
  type ExceptionFilter,
  type ExceptionKind,
  type ExceptionResolutionCode,
  type ExceptionSeverity,
  type ExceptionStatus,
} from "@zyara/collaboration";
import { OpsTaskError, type OpsTaskPriority, type OpsTaskStatus } from "@zyara/enterprise-access";
import { agentIdentityStore } from "./agents.js";
import { taskStore } from "./tasks.js";
import { authorize, requestTenant } from "./auth.js";
import { workforceMembershipsFor, workforceStore } from "./workforce.js";
import { projectApprovalActivity, projectExceptionActivity } from "./activity.js";

export const approvalStore = new ApprovalStore();

// ---------------------------------------------------------------------------
// Trusted directories
// ---------------------------------------------------------------------------

// Which membership role satisfies which approval authority, and whether that authority is
// tenant-wide only. This mapping is the single place where a session-verified membership is
// translated into approval authority; a UI role label can never reach it.
//
// Declared limitation: in this build `compliance_officer` is satisfied by a tenant-wide
// organisation administrator membership. A real deployment must bind that authority to a
// designated compliance officer rather than to the administrator role.
const AUTHORITY_ROLES: Record<
  ApproverAuthority,
  { roles: readonly BranchRole[]; tenantWideOnly: boolean }
> = {
  branch_admin: { roles: ["branch_admin", "org_admin"], tenantWideOnly: false },
  org_admin: { roles: ["org_admin"], tenantWideOnly: true },
  clinical_lead: { roles: ["clinician"], tenantWideOnly: false },
  compliance_officer: { roles: ["org_admin"], tenantWideOnly: true },
};

export const approvalAuthorityDirectory: ApprovalAuthorityDirectory = {
  resolveAuthority(lookup): ApprovalAuthoritySnapshot | null {
    const mapping = AUTHORITY_ROLES[lookup.authority];
    if (!mapping) return null;
    const memberships = workforceMembershipsFor(lookup.tenantId, lookup.accountId).filter(
      (membership) =>
        membership.tenantId === lookup.tenantId &&
        !membership.revoked &&
        mapping.roles.includes(membership.role) &&
        (!mapping.tenantWideOnly || membership.branchId === null),
    );
    const covering = memberships.find((membership) =>
      lookup.branchId === null
        ? membership.branchId === null
        : membership.branchId === null || membership.branchId === lookup.branchId,
    );
    if (!covering) return null;
    return {
      authority: lookup.authority,
      branchId: covering.branchId,
      sourceRef: "workforce-membership-registry",
      resolvedAt: lookup.asOf,
    };
  },
};

// A C1 bounded agent identity supplies the requester state. The collaboration layer never
// invents it: an unknown identity reads as unknown, not as eligible.
export const approvalAgentDirectory: ApprovalAgentDirectory = {
  resolveRequesterState(lookup): ApprovalAgentState {
    const identity = agentIdentityStore.identities.get(lookup.agentIdentityId);
    if (!identity || identity.tenantId !== lookup.tenantId) return "unknown";
    if (identity.branchId !== null && identity.branchId !== lookup.branchId) {
      return "branch_mismatch";
    }
    const asOf = Date.parse(lookup.asOf);
    const effectiveFrom = Date.parse(identity.effectiveFrom);
    if (!Number.isNaN(asOf) && !Number.isNaN(effectiveFrom) && asOf < effectiveFrom) {
      return "not_yet_effective";
    }
    return resolvedStatus(identity, lookup.asOf);
  },
};

const APPROVAL_DEPENDENCIES = {
  authorities: approvalAuthorityDirectory,
  agents: approvalAgentDirectory,
};

// ---------------------------------------------------------------------------
// Route helpers
// ---------------------------------------------------------------------------

const BRANCH_WRITERS: BranchRole[] = ["org_admin", "branch_admin", "clinician", "receptionist"];
const BRANCH_READERS: BranchRole[] = ["org_admin", "branch_admin", "clinician", "receptionist"];
const TENANT_READERS: BranchRole[] = ["org_admin"];
// The authorities that any protected action can require are held by these roles.
const DECIDERS: BranchRole[] = ["org_admin", "branch_admin", "clinician"];
const MANAGERS: BranchRole[] = ["org_admin", "branch_admin"];

function scoped(
  req: FastifyRequest,
  action: string,
  branchId: string | null,
  allowRoles: BranchRole[],
) {
  const { claims } = requestTenant(req);
  const decision = authorize(
    { claims, memberships: workforceMembershipsFor(claims.tenant, claims.sub) },
    {
      action,
      resourceTenant: claims.tenant,
      resourceBranch: branchId,
      requireAssurance: "aal2",
      allowRoles,
    },
  );
  return { claims, decision };
}

function provenance(): CollaborationProvenance {
  return {
    source: "zyara-native",
    sourceRef: "Zyara Network N5/C3 approvals and exception queue API",
    sourceRevision: process.env.ZYARA_BUILD ?? "n5c3-dev",
    observedAt: new Date().toISOString(),
  };
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function malformed(reply: { code(code: number): { send(body: unknown): unknown } }, detail: string) {
  return reply.code(400).send({ error: "APPROVAL_MALFORMED", detail });
}

function approvalFailure(reply: { code(code: number): { send(body: unknown): unknown } }, error: unknown) {
  if (error instanceof ApprovalError) {
    if (
      error.code === "APPROVAL_UNKNOWN_REFERENCE" ||
      error.code === "EXCEPTION_UNKNOWN_REFERENCE"
    ) {
      return reply.code(404).send({ error: error.code });
    }
    if (
      error.code === "APPROVAL_CROSS_TENANT" ||
      error.code === "APPROVAL_CROSS_BRANCH" ||
      error.code === "EXCEPTION_CROSS_TENANT" ||
      error.code === "APPROVAL_SELF_APPROVAL_FORBIDDEN" ||
      error.code === "APPROVAL_AGENT_APPROVER_FORBIDDEN" ||
      error.code === "APPROVAL_APPROVER_AUTHORITY_MISSING" ||
      error.code === "APPROVAL_REQUESTER_AGENT_INELIGIBLE"
    ) {
      return reply.code(403).send({ error: error.code });
    }
    if (
      error.code === "APPROVAL_ALREADY_DECIDED" ||
      error.code === "APPROVAL_APPROVER_AUTHORITY_REVOKED" ||
      error.code === "APPROVAL_TERMINAL_IMMUTABLE" ||
      error.code === "EXCEPTION_TERMINAL_IMMUTABLE"
    ) {
      return reply.code(409).send({ error: error.code });
    }
    return reply.code(400).send({ error: error.code });
  }
  if (error instanceof OpsTaskError) {
    const status = error.code === "TASK_UNKNOWN_REFERENCE" ? 404 : 400;
    return reply.code(status).send({ error: error.code });
  }
  return reply.code(401).send({ error: "UNAUTHENTICATED" });
}

// The stored status is authoritative, but an approval whose window has closed can never be
// read as still actionable. The derived value is reported next to it rather than written
// over history, and execution refuses an expired approval outright.
function effectiveStatus(request: ApprovalRequest, asOf: string): ApprovalStatus {
  if (
    (request.status === "awaiting_approval" || request.status === "approved") &&
    Date.parse(asOf) >= Date.parse(request.expiresAt)
  ) {
    return "expired";
  }
  return request.status;
}

function slaDueFor(openedAt: string, severity: ExceptionSeverity): string {
  return new Date(
    Date.parse(openedAt) + EXCEPTION_SLA_HOURS[severity] * 60 * 60 * 1000,
  ).toISOString();
}

function taskPriority(severity: ExceptionSeverity): OpsTaskPriority {
  if (severity === "critical") return "urgent";
  if (severity === "high") return "high";
  if (severity === "medium") return "normal";
  return "low";
}

function taskStatusOf(caseRecord: ExceptionCase): OpsTaskStatus | null {
  const task = taskStore.tasks.get(caseRecord.workItemTaskId);
  if (!task || task.tenantId !== caseRecord.tenantId) return null;
  return task.status;
}

function workItemView(caseRecord: ExceptionCase) {
  const task = taskStore.tasks.get(caseRecord.workItemTaskId);
  if (!task || task.tenantId !== caseRecord.tenantId) {
    return { workItemTaskId: caseRecord.workItemTaskId, workItem: null };
  }
  return {
    workItemTaskId: caseRecord.workItemTaskId,
    workItem: {
      id: task.id,
      kind: task.kind,
      status: task.status,
      priority: task.priority,
      assigneeAccountId: task.assigneeAccountId,
      assigneeStaffAssignmentId: task.assigneeStaffAssignmentId,
      dueAt: task.dueAt,
      originKind: task.origin.kind,
      updatedAt: task.updatedAt,
    },
  };
}

export function serializeExceptionCase(caseRecord: ExceptionCase, asOf: string) {
  return {
    ...caseRecord,
    slaState: exceptionSlaState(caseRecord, asOf),
    ...workItemView(caseRecord),
  };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

interface ProposalBody {
  id?: unknown;
  branchId?: unknown;
  actionType?: unknown;
  parameters?: unknown;
  ttlMinutes?: unknown;
  correlationId?: unknown;
  idempotencyKey?: unknown;
  requesterAccountId?: unknown;
  requesterKind?: unknown;
  requesterAgentId?: unknown;
  authority?: unknown;
}

export function registerApprovalRoutes(app: FastifyInstance) {
  app.get("/workforce/approvals", async (req, reply) => {
    try {
      const query = (req.query ?? {}) as {
        branchId?: string;
        status?: string;
        actionType?: string;
        requesterAccountId?: string;
      };
      const branchId = query.branchId ?? null;
      const { claims, decision } = scoped(
        req,
        "workforce.approvals.read",
        branchId,
        branchId ? BRANCH_READERS : TENANT_READERS,
      );
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });
      const filter: ApprovalRequestFilter = {};
      if (branchId) filter.branchId = branchId;
      if (query.actionType) filter.actionType = query.actionType;
      if (query.requesterAccountId) filter.requesterAccountId = query.requesterAccountId;
      if (query.status) {
        if (!(APPROVAL_STATUSES as readonly string[]).includes(query.status)) {
          return malformed(reply, "unsupported status filter");
        }
        filter.status = query.status as ApprovalStatus;
      }
      const asOf = new Date().toISOString();
      return approvalStore
        .listRequests(claims.tenant, filter)
        .map((request) => ({ ...request, effectiveStatus: effectiveStatus(request, asOf) }));
    } catch (error) {
      return approvalFailure(reply, error);
    }
  });

  app.get("/workforce/approvals/:id", async (req, reply) => {
    try {
      const params = (req.params ?? {}) as { id?: string };
      const id = text(params.id);
      if (!id) return malformed(reply, "approval request id is required");
      const { claims } = requestTenant(req);
      const request = approvalStore.requests.get(id);
      if (!request || request.tenantId !== claims.tenant) {
        return reply.code(404).send({ error: "APPROVAL_UNKNOWN_REFERENCE" });
      }
      const { decision } = scoped(
        req,
        "workforce.approvals.read",
        request.branchId,
        request.branchId ? BRANCH_READERS : TENANT_READERS,
      );
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });
      const asOf = new Date().toISOString();
      return {
        request: { ...request, effectiveStatus: effectiveStatus(request, asOf) },
        decisions: approvalStore.decisionsFor(id, claims.tenant),
        executions: approvalStore.executionsFor(id, claims.tenant),
        events: approvalStore.eventsFor(id, claims.tenant),
      };
    } catch (error) {
      return approvalFailure(reply, error);
    }
  });

  app.post("/workforce/approvals", async (req, reply) => {
    try {
      const body = (req.body ?? {}) as ProposalBody;
      const id = text(body.id);
      const actionType = text(body.actionType);
      if (!id || !actionType) return malformed(reply, "id and actionType are required");
      // Authority is never supplied by a caller. A body that claims a requester or an
      // authority is refused rather than silently ignored, so the attempt is visible.
      if (
        body.requesterAccountId !== undefined ||
        body.requesterKind !== undefined ||
        body.requesterAgentId !== undefined ||
        body.authority !== undefined
      ) {
        return reply.code(403).send({ error: "APPROVAL_REQUESTER_NOT_AUTHORIZED" });
      }
      if (
        body.parameters === null ||
        typeof body.parameters !== "object" ||
        Array.isArray(body.parameters)
      ) {
        return malformed(reply, "parameters must be an object of protected parameters");
      }
      const branchId = text(body.branchId);
      const { claims, decision } = scoped(
        req,
        "workforce.approvals.propose",
        branchId,
        branchId ? BRANCH_WRITERS : TENANT_READERS,
      );
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });
      const ttlMinutes =
        body.ttlMinutes === undefined || body.ttlMinutes === null
          ? undefined
          : Number(body.ttlMinutes);
      if (ttlMinutes !== undefined && !Number.isInteger(ttlMinutes)) {
        return malformed(reply, "ttlMinutes must be an integer");
      }
      const request = await approvalStore.propose(
        {
          id,
          tenantId: claims.tenant,
          branchId,
          actionType,
          parameters: body.parameters as Record<string, unknown>,
          requester: { kind: "human", accountId: claims.sub },
          proposedAt: new Date().toISOString(),
          ttlMinutes,
          correlationId: text(body.correlationId),
          idempotencyKey: text(body.idempotencyKey),
          provenance: provenance(),
        },
        claims.tenant,
        APPROVAL_DEPENDENCIES,
      );
      await projectApprovalActivity(claims.tenant, request.id);
      return reply.code(201).send(request);
    } catch (error) {
      return approvalFailure(reply, error);
    }
  });

  app.post("/workforce/approvals/:id/decision", async (req, reply) => {
    try {
      const params = (req.params ?? {}) as { id?: string };
      const id = text(params.id);
      if (!id) return malformed(reply, "approval request id is required");
      const body = (req.body ?? {}) as {
        outcome?: unknown;
        reasonCode?: unknown;
        evidenceRef?: unknown;
        idempotencyKey?: unknown;
        approverAccountId?: unknown;
        authority?: unknown;
      };
      if (body.approverAccountId !== undefined || body.authority !== undefined) {
        return reply.code(403).send({ error: "APPROVAL_APPROVER_NOT_AUTHORIZED" });
      }
      const outcome = text(body.outcome);
      const reasonCode = text(body.reasonCode);
      if (!outcome || !reasonCode) return malformed(reply, "outcome and reasonCode are required");
      if (outcome !== "approved" && outcome !== "rejected") {
        return malformed(reply, "outcome must be approved or rejected");
      }
      if (!(APPROVAL_DECISION_REASON_CODES as readonly string[]).includes(reasonCode)) {
        return malformed(reply, "unsupported reasonCode");
      }
      const { claims } = requestTenant(req);
      const request = approvalStore.requests.get(id);
      if (!request || request.tenantId !== claims.tenant) {
        return reply.code(404).send({ error: "APPROVAL_UNKNOWN_REFERENCE" });
      }
      const { decision } = scoped(
        req,
        "workforce.approvals.decide",
        request.branchId,
        DECIDERS,
      );
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });
      const actor: ApprovalActor = { kind: "human", accountId: claims.sub };
      const result = approvalStore.decide(
        id,
        {
          outcome: outcome as ApprovalDecisionOutcome,
          reasonCode: reasonCode as ApprovalDecisionReasonCode,
          evidenceRef: text(body.evidenceRef),
          decidedAt: new Date().toISOString(),
          idempotencyKey: text(body.idempotencyKey),
        },
        actor,
        claims.tenant,
        APPROVAL_DEPENDENCIES,
      );
      await projectApprovalActivity(claims.tenant, id);
      return result;
    } catch (error) {
      return approvalFailure(reply, error);
    }
  });

  app.post("/workforce/approvals/:id/executions", async (req, reply) => {
    try {
      const params = (req.params ?? {}) as { id?: string };
      const id = text(params.id);
      if (!id) return malformed(reply, "approval request id is required");
      const body = (req.body ?? {}) as {
        outcome?: unknown;
        parametersDigest?: unknown;
        receiptRef?: unknown;
        evidenceRef?: unknown;
        idempotencyKey?: unknown;
      };
      const outcome = text(body.outcome);
      const parametersDigest = text(body.parametersDigest);
      if (!outcome || !parametersDigest) {
        return malformed(reply, "outcome and parametersDigest are required");
      }
      if (!(APPROVAL_EXECUTION_OUTCOMES as readonly string[]).includes(outcome)) {
        return malformed(reply, "unsupported execution outcome");
      }
      const { claims } = requestTenant(req);
      const request = approvalStore.requests.get(id);
      if (!request || request.tenantId !== claims.tenant) {
        return reply.code(404).send({ error: "APPROVAL_UNKNOWN_REFERENCE" });
      }
      const { decision } = scoped(
        req,
        "workforce.approvals.execute",
        request.branchId,
        // A tenant-wide protected action is not executable by a branch-scoped operator: the
        // executor of a tenant-wide action must hold a tenant-level operational role.
        request.branchId === null ? DECIDERS : BRANCH_WRITERS,
      );
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });
      const actor: ApprovalActor = { kind: "human", accountId: claims.sub };
      const input: Omit<ApprovalExecutionInput, "outcome"> = {
        parametersDigest,
        receiptRef: text(body.receiptRef),
        evidenceRef: text(body.evidenceRef),
        occurredAt: new Date().toISOString(),
        idempotencyKey: text(body.idempotencyKey),
      };
      const result =
        outcome === "unknown"
          ? approvalStore.recordUnknownOutcome(id, input, actor, claims.tenant, APPROVAL_DEPENDENCIES)
          : approvalStore.execute(
              id,
              { ...input, outcome: outcome as ApprovalExecutionOutcome },
              actor,
              claims.tenant,
              APPROVAL_DEPENDENCIES,
            );
      await projectApprovalActivity(claims.tenant, id);
      return result;
    } catch (error) {
      return approvalFailure(reply, error);
    }
  });

  // Expiry is time-driven truth, not a read side effect. The sweep is an explicit,
  // tenant-wide administrator action, and it can only move an unused approval to `expired`.
  app.post("/workforce/approvals/expiry-sweep", async (req, reply) => {
    try {
      const { claims, decision } = scoped(req, "workforce.approvals.sweep", null, TENANT_READERS);
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });
      const expired = approvalStore.expireDue(claims.tenant, new Date().toISOString());
      for (const request of expired) {
        await projectApprovalActivity(claims.tenant, request.id);
      }
      return { expired: expired.map((request) => request.id) };
    } catch (error) {
      return approvalFailure(reply, error);
    }
  });

  // -------------------------------------------------------------------------
  // Human exception queue
  // -------------------------------------------------------------------------

  app.get("/workforce/exceptions", async (req, reply) => {
    try {
      const query = (req.query ?? {}) as {
        branchId?: string;
        status?: string;
        kind?: string;
        severity?: string;
      };
      const branchId = query.branchId ?? null;
      const { claims, decision } = scoped(
        req,
        "workforce.exceptions.read",
        branchId,
        branchId ? BRANCH_READERS : TENANT_READERS,
      );
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });
      const filter: ExceptionFilter = {};
      if (branchId) filter.branchId = branchId;
      if (query.status) {
        if (!(EXCEPTION_STATUSES as readonly string[]).includes(query.status)) {
          return malformed(reply, "unsupported status filter");
        }
        filter.status = query.status as ExceptionStatus;
      }
      if (query.kind) {
        if (!(EXCEPTION_KINDS as readonly string[]).includes(query.kind)) {
          return malformed(reply, "unsupported kind filter");
        }
        filter.kind = query.kind as ExceptionKind;
      }
      if (query.severity) {
        if (!(EXCEPTION_SEVERITIES as readonly string[]).includes(query.severity)) {
          return malformed(reply, "unsupported severity filter");
        }
        filter.severity = query.severity as ExceptionSeverity;
      }
      const asOf = new Date().toISOString();
      return approvalStore
        .listExceptions(claims.tenant, filter)
        .map((caseRecord) => serializeExceptionCase(caseRecord, asOf));
    } catch (error) {
      return approvalFailure(reply, error);
    }
  });

  app.get("/workforce/exceptions/:id", async (req, reply) => {
    try {
      const params = (req.params ?? {}) as { id?: string };
      const id = text(params.id);
      if (!id) return malformed(reply, "exception case id is required");
      const { claims } = requestTenant(req);
      const caseRecord = approvalStore.exceptions.get(id);
      if (!caseRecord || caseRecord.tenantId !== claims.tenant) {
        return reply.code(404).send({ error: "EXCEPTION_UNKNOWN_REFERENCE" });
      }
      const { decision } = scoped(
        req,
        "workforce.exceptions.read",
        caseRecord.branchId,
        BRANCH_READERS,
      );
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });
      return {
        case: serializeExceptionCase(caseRecord, new Date().toISOString()),
        events: approvalStore.exceptionEventsFor(id, claims.tenant),
      };
    } catch (error) {
      return approvalFailure(reply, error);
    }
  });

  app.post("/workforce/exceptions", async (req, reply) => {
    try {
      const body = (req.body ?? {}) as {
        id?: unknown;
        branchId?: unknown;
        kind?: unknown;
        severity?: unknown;
        subjectId?: unknown;
        approvalRequestId?: unknown;
        workItemTaskId?: unknown;
        correlationId?: unknown;
        idempotencyKey?: unknown;
        originKind?: unknown;
      };
      const id = text(body.id);
      const branchId = text(body.branchId);
      const kind = text(body.kind);
      const severity = text(body.severity);
      if (!id || !branchId || !kind || !severity) {
        return malformed(reply, "id, branchId, kind and severity are required");
      }
      if (!(EXCEPTION_KINDS as readonly string[]).includes(kind)) {
        return malformed(reply, "unsupported exception kind");
      }
      if (!(EXCEPTION_SEVERITIES as readonly string[]).includes(severity)) {
        return malformed(reply, "unsupported exception severity");
      }
      const { claims, decision } = scoped(
        req,
        "workforce.exceptions.write",
        branchId,
        BRANCH_WRITERS,
      );
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });

      const approvalRequestId = text(body.approvalRequestId);
      const declaredOrigin = text(body.originKind);
      if (declaredOrigin !== null && declaredOrigin !== "human" && declaredOrigin !== "automation") {
        return malformed(reply, "originKind must be human or automation");
      }
      // No verified service identity exists yet, so a client-declared automation origin is
      // refused. The one automation-sourced path is a case opened from a C3 request that the
      // server itself has placed in `needs_human`.
      if (declaredOrigin === "automation" && approvalRequestId === null) {
        return reply.code(403).send({ error: "EXCEPTION_ORIGIN_NOT_AUTHORIZED" });
      }

      let linkedRequest: ApprovalRequest | null = null;
      if (approvalRequestId !== null) {
        const request = approvalStore.requests.get(approvalRequestId);
        if (!request || request.tenantId !== claims.tenant) {
          return reply.code(404).send({ error: "APPROVAL_UNKNOWN_REFERENCE" });
        }
        if (request.branchId !== null && request.branchId !== branchId) {
          return reply.code(403).send({ error: "APPROVAL_CROSS_BRANCH" });
        }
        if (request.status !== "needs_human") {
          return malformed(
            reply,
            "an exception may only be linked to a request whose outcome needs a human",
          );
        }
        linkedRequest = request;
      }

      const idempotencyKey = text(body.idempotencyKey);
      if (idempotencyKey !== null) {
        const existing = approvalStore
          .listExceptions(claims.tenant)
          .find((candidate) => candidate.idempotencyKey === idempotencyKey);
        if (existing) {
          return reply
            .code(200)
            .send(serializeExceptionCase(existing, new Date().toISOString()));
        }
      }

      const openedAt = new Date().toISOString();
      const slaDueAt = slaDueFor(openedAt, severity as ExceptionSeverity);
      const correlationId = text(body.correlationId) ?? linkedRequest?.correlationId ?? null;
      const originKind = linkedRequest ? "automation" : "human";
      const workItemTaskId = text(body.workItemTaskId) ?? `w3-exception-${id}`;
      const task = taskStore.tasks.get(workItemTaskId);
      if (task && task.tenantId === claims.tenant) {
        if (task.branchId !== branchId) {
          return malformed(reply, "the linked work item belongs to another branch");
        }
      } else {
        // The W3 work item is created first, because it is what owns the human follow-up.
        taskStore.createTask(
          {
            id: workItemTaskId,
            tenantId: claims.tenant,
            branchId,
            kind: "automation_handoff",
            title: `Human exception case: ${kind}`,
            detail: "",
            requesterAccountId: claims.sub,
            // The origin names what actually stopped: the C3 request the automation was
            // executing when it gave up, or the human operator that raised the case.
            origin: {
              kind: originKind,
              ref: linkedRequest ? `approval:${linkedRequest.id}` : claims.sub,
            },
            // The W3 work item carries W3 provenance; C3 provenance stays on the case.
            provenance: {
              source: "zyara-native",
              sourceRef: "Zyara Network N5/C3 exception queue work item",
              sourceRevision: process.env.ZYARA_BUILD ?? "n5c3-dev",
              observedAt: openedAt,
            },
            createdAt: openedAt,
            priority: taskPriority(severity as ExceptionSeverity),
            subjectType: "none",
            subjectRef: null,
            dueAt: slaDueAt,
            correlationId,
            idempotencyKey: null,
          },
          claims.tenant,
        );
      }
      const caseRecord = await approvalStore.openException(
        {
          id,
          tenantId: claims.tenant,
          branchId,
          kind: kind as ExceptionKind,
          severity: severity as ExceptionSeverity,
          workItemTaskId,
          subjectId: text(body.subjectId) ?? linkedRequest?.id ?? null,
          correlationId,
          openedAt,
          idempotencyKey,
          provenance: provenance(),
        },
        claims.tenant,
        { kind: "human", accountId: claims.sub },
      );
      await projectExceptionActivity(claims.tenant, caseRecord.id);
      return reply.code(201).send(serializeExceptionCase(caseRecord, openedAt));
    } catch (error) {
      return approvalFailure(reply, error);
    }
  });

  app.post("/workforce/exceptions/:id/assign", async (req, reply) => {
    try {
      const params = (req.params ?? {}) as { id?: string };
      const id = text(params.id);
      if (!id) return malformed(reply, "exception case id is required");
      const body = (req.body ?? {}) as {
        assigneeAccountId?: unknown;
        assigneeStaffAssignmentId?: unknown;
      };
      const assigneeAccountId = text(body.assigneeAccountId);
      const assigneeStaffAssignmentId = text(body.assigneeStaffAssignmentId);
      if (!assigneeAccountId || !assigneeStaffAssignmentId) {
        return malformed(reply, "assigneeAccountId and assigneeStaffAssignmentId are required");
      }
      const { claims } = requestTenant(req);
      const caseRecord = approvalStore.exceptions.get(id);
      if (!caseRecord || caseRecord.tenantId !== claims.tenant) {
        return reply.code(404).send({ error: "EXCEPTION_UNKNOWN_REFERENCE" });
      }
      const { decision } = scoped(
        req,
        "workforce.exceptions.assign",
        caseRecord.branchId,
        MANAGERS,
      );
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });
      const at = new Date().toISOString();
      // W3 owns the assignment; C3 mirrors that a human owner now exists.
      const task = taskStore.assign(
        caseRecord.workItemTaskId,
        { accountId: assigneeAccountId, staffAssignmentId: assigneeStaffAssignmentId },
        claims.tenant,
        workforceStore,
        { kind: "human", accountId: claims.sub },
        at,
      );
      const updated = approvalStore.assignException(
        id,
        {
          assigneeAccountId,
          assigneeStaffAssignmentId,
          workItemStatus: task.status,
          at,
        },
        { kind: "human", accountId: claims.sub },
        claims.tenant,
      );
      await projectExceptionActivity(claims.tenant, id);
      return serializeExceptionCase(updated, at);
    } catch (error) {
      return approvalFailure(reply, error);
    }
  });

  app.post("/workforce/exceptions/:id/transition", async (req, reply) => {
    try {
      const params = (req.params ?? {}) as { id?: string };
      const id = text(params.id);
      if (!id) return malformed(reply, "exception case id is required");
      const body = (req.body ?? {}) as {
        status?: unknown;
        resolutionCode?: unknown;
        evidenceRef?: unknown;
        reasonCode?: unknown;
      };
      const status = text(body.status);
      const reasonCode = text(body.reasonCode);
      if (!status || !reasonCode) return malformed(reply, "status and reasonCode are required");
      if (!(EXCEPTION_STATUSES as readonly string[]).includes(status)) {
        return malformed(reply, "unsupported exception status");
      }
      if (status === "assigned") {
        return malformed(reply, "assignment is performed by the assign route");
      }
      const { claims } = requestTenant(req);
      const caseRecord = approvalStore.exceptions.get(id);
      if (!caseRecord || caseRecord.tenantId !== claims.tenant) {
        return reply.code(404).send({ error: "EXCEPTION_UNKNOWN_REFERENCE" });
      }
      const roles = status === "closed" || status === "escalated" ? MANAGERS : BRANCH_WRITERS;
      const { decision } = scoped(
        req,
        "workforce.exceptions.transition",
        caseRecord.branchId,
        roles,
      );
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });
      const actor: ApprovalActor = { kind: "human", accountId: claims.sub };
      const at = new Date().toISOString();
      const resolutionCode = text(body.resolutionCode);

      // The owned work item and the exception case must not drift apart: the case can only
      // move when the W3 work item that owns the human follow-up has moved with it.
      const taskId = caseRecord.workItemTaskId;
      const taskStatus = taskStatusOf(caseRecord);
      if (taskStatus === null) {
        return reply.code(409).send({ error: "EXCEPTION_WORK_ITEM_MISSING" });
      }
      if (status === "in_review" || status === "resolved") {
        if (taskStatus === "open") {
          taskStore.transition(
            taskId,
            "in_progress",
            { kind: "human", accountId: claims.sub },
            claims.tenant,
            { at, reason: `exception_case_${status}` },
          );
        }
        if (status === "resolved") {
          taskStore.transition(
            taskId,
            "resolved",
            { kind: "human", accountId: claims.sub },
            claims.tenant,
            {
              at,
              reason: "exception_case_resolved",
              // A derived code, never caller prose.
              resolutionNote: `exception_case_resolved:${resolutionCode ?? "unspecified"}`,
            },
          );
        }
      }
      if (status === "cancelled") {
        if (taskStatus !== "cancelled" && taskStatus !== "resolved") {
          taskStore.transition(
            taskId,
            "cancelled",
            { kind: "human", accountId: claims.sub },
            claims.tenant,
            { at, reason: "exception_case_cancelled" },
          );
        }
      }
      if (status === "closed" && taskStatus !== "resolved") {
        return reply.code(409).send({ error: "EXCEPTION_WORK_ITEM_OPEN" });
      }

      const updated = approvalStore.transitionException(
        id,
        {
          status: status as ExceptionStatus,
          resolutionCode: (resolutionCode as ExceptionResolutionCode | null) ?? null,
          evidenceRef: text(body.evidenceRef),
          reasonCode,
          at,
        },
        actor,
        claims.tenant,
      );
      await projectExceptionActivity(claims.tenant, id);
      return serializeExceptionCase(updated, at);
    } catch (error) {
      return approvalFailure(reply, error);
    }
  });
}
