// W3 scoped ops-task API (non-clinical only).
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { BranchRole, Membership } from "@zyara/authorization";
import {
  OpsTaskError,
  OpsTaskStore,
  type OpsTask,
  type WorkforceProvenance,
} from "@zyara/enterprise-access";
import { authorize, requestTenant } from "./auth.js";
export const opsTaskStore = new OpsTaskStore();
function provenance(): WorkforceProvenance {
  return {
    source: "zyara-native",
    sourceRef: "Zyara Network W3 ops-task API",
    sourceRevision: "w3-dev",
    observedAt: "2026-09-20T00:00:00Z",
  };
}
function scoped(req: FastifyRequest, action: string, branchId: string | null) {
  const { claims } = requestTenant(req);
  const decision = authorize(
    { claims, memberships: [] as Membership[] },
    { action, resourceTenant: claims.tenant, resourceBranch: branchId, requireAssurance: "aal2", allowRoles: ["org_admin", "branch_admin"] as BranchRole[] },
  );
  return { claims, decision };
}
function sendError(reply: { code(c: number): { send(b: unknown): unknown } }, error: unknown) {
  if (error instanceof OpsTaskError) return reply.code(400).send({ error: error.code });
  return reply.code(401).send({ error: "UNAUTHENTICATED" });
}
export function registerOpsTaskRoutes(app: FastifyInstance) {
  app.get("/workforce/ops-tasks", async (req, reply) => {
    try {
      const q = (req.query ?? {}) as { branchId?: string };
      if (!q.branchId) return reply.code(400).send({ error: "OPS_TASK_MALFORMED" });
      const { claims, decision } = scoped(req, "workforce.ops-tasks.read", q.branchId);
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });
      return opsTaskStore.list(claims.tenant, q.branchId);
    } catch (error) {
      return sendError(reply, error);
    }
  });
  app.post("/workforce/ops-tasks", async (req, reply) => {
    try {
      const body = (req.body ?? {}) as Partial<OpsTask>;
      if (!body.id || !body.branchId || !body.kind || !body.title) {
        return reply.code(400).send({ error: "OPS_TASK_MALFORMED" });
      }
      const { claims, decision } = scoped(req, "workforce.ops-tasks.write", body.branchId);
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });
      const task: OpsTask = {
        id: body.id,
        tenantId: claims.tenant,
        branchId: body.branchId,
        coverageExceptionId: body.coverageExceptionId ?? null,
        kind: body.kind,
        title: body.title,
        detail: body.detail ?? "",
        status: "open",
        assigneeAccountId: body.assigneeAccountId ?? null,
        provenance: provenance(),
      };
      opsTaskStore.create(task, claims.tenant);
      return reply.code(201).send(task);
    } catch (error) {
      return sendError(reply, error);
    }
  });
  app.post("/workforce/ops-tasks/:id/acknowledge", async (req, reply) => {
    try {
      const p = (req.params ?? {}) as { id?: string };
      if (!p.id) return reply.code(400).send({ error: "OPS_TASK_MALFORMED" });
      const cur = opsTaskStore.tasks.get(p.id);
      if (!cur) return reply.code(404).send({ error: "OPS_TASK_UNKNOWN_REFERENCE" });
      const { claims, decision } = scoped(req, "workforce.ops-tasks.write", cur.branchId);
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });
      return opsTaskStore.acknowledge(p.id, claims.tenant);
    } catch (error) {
      return sendError(reply, error);
    }
  });
  app.post("/workforce/ops-tasks/:id/resolve", async (req, reply) => {
    try {
      const p = (req.params ?? {}) as { id?: string };
      if (!p.id) return reply.code(400).send({ error: "OPS_TASK_MALFORMED" });
      const cur = opsTaskStore.tasks.get(p.id);
      if (!cur) return reply.code(404).send({ error: "OPS_TASK_UNKNOWN_REFERENCE" });
      const { claims, decision } = scoped(req, "workforce.ops-tasks.write", cur.branchId);
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });
      return opsTaskStore.resolve(p.id, claims.tenant);
    } catch (error) {
      return sendError(reply, error);
    }
  });
}
