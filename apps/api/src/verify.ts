import type { FastifyInstance } from "fastify";
import { VerificationQueue } from "@zyara/verification";
import { requestTenant } from "./auth.js";

export const verificationQueue = new VerificationQueue();

export function registerVerifyRoutes(app: FastifyInstance) {
  // Submit a claim for the caller's own tenant only.
  app.post("/claims", async (req, reply) => {
    try {
      const { claims } = requestTenant(req);
      const body = (req.body ?? {}) as { id?: string; branchId?: string; role?: string };
      if (!body.id || !body.branchId) return reply.code(400).send({ error: "CLAIM_MALFORMED" });
      verificationQueue.submit({
        id: body.id,
        tenant: claims.tenant,
        branchId: body.branchId,
        claimantAccount: claims.sub,
        representativeRole: body.role ?? "manager",
        state: "pending",
        evidence: [],
        reviewer: null,
        decidedAt: null,
        disputeOf: null,
      });
      return { id: body.id, state: "pending" };
    } catch {
      return reply.code(401).send({ error: "UNAUTHENTICATED" });
    }
  });

  // Public projection: badge scope + freshness, never private evidence.
  app.get("/claims/:id", async (req) => {
    const { id } = req.params as { id: string };
    return verificationQueue.publicProjection(id) ?? { state: "unverified" };
  });
}
