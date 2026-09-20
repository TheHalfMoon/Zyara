// W2 scoped coverage API (advisory only).
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { BranchRole, Membership } from "@zyara/authorization";
import {
  CoverageError,
  CoverageStore,
  detectLeaveConflicts,
  detectShiftOverlaps,
  type CoverageException,
  type WorkforceProvenance,
} from "@zyara/enterprise-access";
import { authorize, requestTenant } from "./auth.js";
import { workforceStore } from "./workforce.js";
export const coverageStore = new CoverageStore();
function provenance(): WorkforceProvenance {
  return {
    source: "zyara-native",
    sourceRef: "Zyara Network W2 coverage API",
    sourceRevision: "w2-dev",
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
  if (error instanceof CoverageError) return reply.code(400).send({ error: error.code });
  return reply.code(401).send({ error: "UNAUTHENTICATED" });
}
export function registerCoverageRoutes(app: FastifyInstance) {
  app.get("/workforce/coverage", async (req, reply) => {
    try {
      const q = (req.query ?? {}) as { branchId?: string };
      if (!q.branchId) return reply.code(400).send({ error: "COVERAGE_MALFORMED" });
      const { claims, decision } = scoped(req, "workforce.coverage.read", q.branchId);
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });
      return coverageStore.list(claims.tenant, q.branchId);
    } catch (error) {
      return sendError(reply, error);
    }
  });
  app.get("/workforce/conflicts", async (req, reply) => {
    try {
      const q = (req.query ?? {}) as { branchId?: string };
      const { claims } = requestTenant(req);
      void q;
      return {
        shiftOverlaps: detectShiftOverlaps(workforceStore, claims.tenant),
        leaveConflicts: detectLeaveConflicts(workforceStore, claims.tenant),
      };
    } catch (error) {
      return sendError(reply, error);
    }
  });
  app.post("/workforce/coverage", async (req, reply) => {
    try {
      const body = (req.body ?? {}) as Partial<CoverageException>;
      if (!body.id || !body.branchId || !body.kind) return reply.code(400).send({ error: "COVERAGE_MALFORMED" });
      const { claims, decision } = scoped(req, "workforce.coverage.write", body.branchId);
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });
      const e: CoverageException = {
        id: body.id,
        tenantId: claims.tenant,
        branchId: body.branchId,
        staffAssignmentId: body.staffAssignmentId ?? null,
        shiftId: body.shiftId ?? null,
        leaveRequestId: body.leaveRequestId ?? null,
        kind: body.kind,
        detail: body.detail ?? "",
        status: "open",
        provenance: provenance(),
      };
      coverageStore.record(e, claims.tenant, workforceStore);
      return reply.code(201).send(e);
    } catch (error) {
      return sendError(reply, error);
    }
  });
  app.post("/workforce/coverage/:id/acknowledge", async (req, reply) => {
    try {
      const p = (req.params ?? {}) as { id?: string };
      if (!p.id) return reply.code(400).send({ error: "COVERAGE_MALFORMED" });
      const cur = coverageStore.exceptions.get(p.id);
      if (!cur) return reply.code(404).send({ error: "COVERAGE_UNKNOWN_REFERENCE" });
      const { claims, decision } = scoped(req, "workforce.coverage.write", cur.branchId);
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });
      return coverageStore.acknowledge(p.id, claims.tenant);
    } catch (error) {
      return sendError(reply, error);
    }
  });
  app.post("/workforce/coverage/:id/resolve", async (req, reply) => {
    try {
      const p = (req.params ?? {}) as { id?: string };
      if (!p.id) return reply.code(400).send({ error: "COVERAGE_MALFORMED" });
      const cur = coverageStore.exceptions.get(p.id);
      if (!cur) return reply.code(404).send({ error: "COVERAGE_UNKNOWN_REFERENCE" });
      const { claims, decision } = scoped(req, "workforce.coverage.write", cur.branchId);
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });
      return coverageStore.resolve(p.id, claims.tenant);
    } catch (error) {
      return sendError(reply, error);
    }
  });
}