// W3 scoped clinic helpdesk / internal task queue API.
//
// Administrative coordination only: these routes never define or mutate
// clinical, scheduling, insurance or financial state, and they never grant
// workforce membership. Tenant identity derives only from verified session
// claims; a request-body tenantId is ignored. Automation-originated work is
// refused here until a verified service identity (agent identities, later
// slice) exists, so writes stay deny-by-default.
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { BranchRole } from "@zyara/authorization";
import {
  OpsTaskError,
  OpsTaskStore,
  OPS_TASK_STATUSES,
  type OpsTask,
  type OpsTaskFilter,
  type OpsTaskKind,
  type OpsTaskPriority,
  type OpsTaskStatus,
  type OpsTaskSubjectType,
  type WorkforceProvenance,
} from "@zyara/enterprise-access";
import { authorize, requestTenant } from "./auth.js";
import { workforceMembershipsFor, workforceStore } from "./workforce.js";

export const taskStore = new OpsTaskStore();

const BRANCH_READERS: BranchRole[] = ["org_admin", "branch_admin", "clinician", "receptionist"];
const BRANCH_WRITERS: BranchRole[] = ["org_admin", "branch_admin", "clinician", "receptionist"];
const BRANCH_MANAGERS: BranchRole[] = ["org_admin", "branch_admin"];

function scoped(req: FastifyRequest, action: string, branchId: string | null, allowRoles: BranchRole[]) {
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

function provenance(): WorkforceProvenance {
  return {
    source: "zyara-native",
    sourceRef: "Zyara Network W3 task queue API",
    sourceRevision: process.env.ZYARA_BUILD ?? "w3-dev",
    observedAt: new Date().toISOString(),
  };
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function malformed(reply: { code(code: number): { send(body: unknown): unknown } }, detail: string) {
  return reply.code(400).send({ error: "TASK_MALFORMED", detail });
}

function taskFailure(reply: { code(code: number): { send(body: unknown): unknown } }, error: unknown) {
  if (error instanceof OpsTaskError) {
    const status = error.code === "TASK_UNKNOWN_REFERENCE" ? 404 : 400;
    return reply.code(status).send({ error: error.code });
  }
  return reply.code(401).send({ error: "UNAUTHENTICATED" });
}

interface TaskBody {
  id?: unknown;
  branchId?: unknown;
  kind?: unknown;
  title?: unknown;
  detail?: unknown;
  priority?: unknown;
  subjectType?: unknown;
  subjectRef?: unknown;
  dueAt?: unknown;
  correlationId?: unknown;
  idempotencyKey?: unknown;
  assigneeAccountId?: unknown;
  assigneeStaffAssignmentId?: unknown;
  origin?: { kind?: unknown; ref?: unknown } | undefined;
}

export function registerTaskRoutes(app: FastifyInstance) {
  app.get("/workforce/tasks", async (req, reply) => {
    try {
      const query = (req.query ?? {}) as { branchId?: string; assigneeAccountId?: string; status?: string };
      const branchId = query.branchId ?? null;
      const { claims, decision } = scoped(
        req,
        "workforce.tasks.read",
        branchId,
        branchId ? BRANCH_READERS : ["org_admin"],
      );
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });
      const filter: OpsTaskFilter = {};
      if (branchId) filter.branchId = branchId;
      if (query.assigneeAccountId) filter.assigneeAccountId = query.assigneeAccountId;
      if (query.status) {
        if (!OPS_TASK_STATUSES.includes(query.status as OpsTaskStatus)) {
          return malformed(reply, "unsupported status filter");
        }
        filter.status = query.status as OpsTaskStatus;
      }
      return taskStore.listTasks(claims.tenant, filter);
    } catch (error) {
      return taskFailure(reply, error);
    }
  });

  app.get("/workforce/tasks/:id", async (req, reply) => {
    try {
      const params = (req.params ?? {}) as { id?: string };
      const id = text(params.id);
      if (!id) return malformed(reply, "task id is required");
      const { claims } = requestTenant(req);
      const task = taskStore.tasks.get(id);
      if (!task || task.tenantId !== claims.tenant) {
        return reply.code(404).send({ error: "TASK_UNKNOWN_REFERENCE" });
      }
      const { decision } = scoped(req, "workforce.tasks.read", task.branchId, BRANCH_READERS);
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });
      return {
        task,
        comments: taskStore.listComments(id, claims.tenant),
        events: taskStore.listEvents(id, claims.tenant),
      };
    } catch (error) {
      return taskFailure(reply, error);
    }
  });

  app.post("/workforce/tasks", async (req, reply) => {
    try {
      const body = (req.body ?? {}) as TaskBody;
      const id = text(body.id);
      const branchId = text(body.branchId);
      const kind = text(body.kind);
      const title = text(body.title);
      if (!id || !branchId || !kind || !title) {
        return malformed(reply, "id, branchId, kind and title are required");
      }
      const origin = body.origin ?? {};
      const originKind = text(origin.kind) ?? "human";
      if (originKind !== "human" && originKind !== "automation") {
        return malformed(reply, "origin.kind must be human or automation");
      }
      if (originKind === "automation") {
        // No verified service identity exists yet in this build. Accepting a
        // client-declared automation origin would fabricate agent authority.
        return reply.code(403).send({ error: "TASK_ORIGIN_NOT_AUTHORIZED" });
      }
      const { claims, decision } = scoped(req, "workforce.tasks.write", branchId, BRANCH_WRITERS);
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });
      const now = new Date().toISOString();
      const task: OpsTask = taskStore.createTask(
        {
          id,
          tenantId: claims.tenant,
          branchId,
          kind: kind as OpsTaskKind,
          title,
          requesterAccountId: claims.sub,
          origin: { kind: originKind, ref: text(origin.ref) ?? claims.sub },
          provenance: provenance(),
          createdAt: now,
          priority: (text(body.priority) ?? "normal") as OpsTaskPriority,
          detail: text(body.detail) ?? "",
          assigneeAccountId: text(body.assigneeAccountId),
          assigneeStaffAssignmentId: text(body.assigneeStaffAssignmentId),
          subjectType: (text(body.subjectType) ?? "none") as OpsTaskSubjectType,
          subjectRef: text(body.subjectRef),
          dueAt: text(body.dueAt),
          correlationId: text(body.correlationId),
          idempotencyKey: text(body.idempotencyKey),
        },
        claims.tenant,
        workforceStore,
      );
      return reply.code(201).send(task);
    } catch (error) {
      return taskFailure(reply, error);
    }
  });

  app.post("/workforce/tasks/:id/assign", async (req, reply) => {
    try {
      const params = (req.params ?? {}) as { id?: string };
      const id = text(params.id);
      if (!id) return malformed(reply, "task id is required");
      const body = (req.body ?? {}) as { assigneeAccountId?: unknown; assigneeStaffAssignmentId?: unknown };
      const assigneeAccountId = text(body.assigneeAccountId);
      const assigneeStaffAssignmentId = text(body.assigneeStaffAssignmentId);
      if (!assigneeAccountId || !assigneeStaffAssignmentId) {
        return malformed(reply, "assigneeAccountId and assigneeStaffAssignmentId are required");
      }
      const { claims } = requestTenant(req);
      const task = taskStore.tasks.get(id);
      if (!task || task.tenantId !== claims.tenant) {
        return reply.code(404).send({ error: "TASK_UNKNOWN_REFERENCE" });
      }
      const { decision } = scoped(req, "workforce.tasks.assign", task.branchId, BRANCH_MANAGERS);
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });
      return taskStore.assign(
        id,
        { accountId: assigneeAccountId, staffAssignmentId: assigneeStaffAssignmentId },
        claims.tenant,
        workforceStore,
        { kind: "human", accountId: claims.sub },
        new Date().toISOString(),
      );
    } catch (error) {
      return taskFailure(reply, error);
    }
  });

  app.post("/workforce/tasks/:id/transition", async (req, reply) => {
    try {
      const params = (req.params ?? {}) as { id?: string };
      const id = text(params.id);
      if (!id) return malformed(reply, "task id is required");
      const body = (req.body ?? {}) as { status?: unknown; reason?: unknown; resolutionNote?: unknown };
      const status = text(body.status);
      if (!status) return malformed(reply, "status is required");
      const { claims } = requestTenant(req);
      const task = taskStore.tasks.get(id);
      if (!task || task.tenantId !== claims.tenant) {
        return reply.code(404).send({ error: "TASK_UNKNOWN_REFERENCE" });
      }
      const { decision } = scoped(req, "workforce.tasks.transition", task.branchId, BRANCH_WRITERS);
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });
      return taskStore.transition(id, status as OpsTaskStatus, { kind: "human", accountId: claims.sub }, claims.tenant, {
        at: new Date().toISOString(),
        reason: text(body.reason) ?? "",
        resolutionNote: text(body.resolutionNote),
      });
    } catch (error) {
      return taskFailure(reply, error);
    }
  });

  app.post("/workforce/tasks/:id/comments", async (req, reply) => {
    try {
      const params = (req.params ?? {}) as { id?: string };
      const id = text(params.id);
      if (!id) return malformed(reply, "task id is required");
      const body = (req.body ?? {}) as { id?: unknown; body?: unknown; authorKind?: unknown };
      const commentId = text(body.id);
      const commentBody = text(body.body);
      if (!commentId || !commentBody) return malformed(reply, "id and body are required");
      const authorKind = text(body.authorKind) ?? "human";
      if (authorKind !== "human") return malformed(reply, "comments are attributed to the verified human actor");
      const { claims } = requestTenant(req);
      const task = taskStore.tasks.get(id);
      if (!task || task.tenantId !== claims.tenant) {
        return reply.code(404).send({ error: "TASK_UNKNOWN_REFERENCE" });
      }
      const { decision } = scoped(req, "workforce.tasks.comment", task.branchId, BRANCH_WRITERS);
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });
      return taskStore.addComment(
        {
          id: commentId,
          tenantId: claims.tenant,
          taskId: id,
          author: { kind: "human", accountId: claims.sub },
          body: commentBody,
          createdAt: new Date().toISOString(),
        },
        claims.tenant,
      );
    } catch (error) {
      return taskFailure(reply, error);
    }
  });
}
