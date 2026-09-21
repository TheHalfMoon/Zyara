// Zyara Network N5/C1: human-administered agent identity registry.
//
// C1 creates identities and scoped capability grants only. Agents cannot
// authenticate through these routes and cannot act as human users. Runtime
// service authentication is a later boundary; no secret/token is accepted here.
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { BranchRole } from "@zyara/authorization";
import {
  AGENT_CAPABILITIES,
  AgentAuthorityError,
  AgentAuthorityStore,
  type AgentCapability,
  type AgentIdentity,
  type AgentKind,
  type AgentStatus,
} from "@zyara/agent-authority";
import { authorize, requestTenant } from "./auth.js";
import { workforceMembershipsFor } from "./workforce.js";

export const agentAuthorityStore = new AgentAuthorityStore();

const READERS: BranchRole[] = ["org_admin", "branch_admin"];
const WRITERS: BranchRole[] = ["org_admin"];

function scoped(req: FastifyRequest, action: string, branchId: string | null, roles: BranchRole[]) {
  const { claims } = requestTenant(req);
  const decision = authorize(
    { claims, memberships: workforceMembershipsFor(claims.tenant, claims.sub) },
    {
      action,
      resourceTenant: claims.tenant,
      resourceBranch: branchId,
      requireAssurance: "aal2",
      allowRoles: roles,
    },
  );
  return { claims, decision };
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function failure(reply: { code(code: number): { send(body: unknown): unknown } }, error: unknown) {
  if (error instanceof AgentAuthorityError) {
    const status = error.code === "AGENT_UNKNOWN" ? 404 : 400;
    return reply.code(status).send({ error: error.code });
  }
  return reply.code(401).send({ error: "UNAUTHENTICATED" });
}

interface CreateAgentBody {
  id?: unknown;
  branchId?: unknown;
  kind?: unknown;
  displayName?: unknown;
  purpose?: unknown;
  tenantId?: unknown;
  credential?: unknown;
  token?: unknown;
  secret?: unknown;
}

interface GrantBody {
  id?: unknown;
  branchId?: unknown;
  capability?: unknown;
  requiresHumanApproval?: unknown;
  effectiveFrom?: unknown;
  effectiveTo?: unknown;
  reasonCode?: unknown;
}

export function registerAgentAuthorityRoutes(app: FastifyInstance) {
  app.get("/agents", async (req, reply) => {
    try {
      const query = (req.query ?? {}) as { branchId?: string };
      const branchId = query.branchId ?? null;
      const { claims, decision } = scoped(
        req,
        "agents.read",
        branchId,
        branchId ? READERS : ["org_admin"],
      );
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });
      return agentAuthorityStore.listIdentities(claims.tenant, query.branchId);
    } catch (error) {
      return failure(reply, error);
    }
  });

  app.get("/agents/:id", async (req, reply) => {
    try {
      const { id } = (req.params ?? {}) as { id?: string };
      const agentId = text(id);
      if (!agentId) return reply.code(400).send({ error: "AGENT_INVALID_ID" });
      const { claims } = requestTenant(req);
      const identity = agentAuthorityStore.identities.get(agentId);
      if (!identity || identity.tenantId !== claims.tenant) {
        return reply.code(404).send({ error: "AGENT_UNKNOWN" });
      }
      const { decision } = scoped(req, "agents.read", identity.branchId, READERS);
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });
      return {
        identity,
        grants: agentAuthorityStore.listGrants(agentId, claims.tenant),
        events: agentAuthorityStore.listEvents(agentId, claims.tenant),
      };
    } catch (error) {
      return failure(reply, error);
    }
  });

  app.post("/agents", async (req, reply) => {
    try {
      const body = (req.body ?? {}) as CreateAgentBody;
      const branchId = text(body.branchId);
      const { claims, decision } = scoped(req, "agents.create", branchId, WRITERS);
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });
      // Secret-bearing input is categorically rejected, not ignored, and only
      // after caller authentication/authorization has succeeded.
      if (body.credential !== undefined || body.token !== undefined || body.secret !== undefined) {
        return reply.code(400).send({ error: "AGENT_SECRET_INPUT_REJECTED" });
      }
      const id = text(body.id);
      const kind = text(body.kind);
      const displayName = text(body.displayName);
      const purpose = text(body.purpose);
      if (!id || !kind || !displayName || !purpose) {
        return reply.code(400).send({ error: "AGENT_MALFORMED" });
      }
      const now = new Date().toISOString();
      const identity: AgentIdentity = {
        id,
        tenantId: claims.tenant,
        branchId,
        kind: kind as AgentKind,
        displayName,
        purpose,
        status: "draft",
        createdByAccountId: claims.sub,
        sourceRef: "Zyara Network C1 agent authority API",
        sourceRevision: process.env.ZYARA_BUILD ?? "c1-dev",
        createdAt: now,
        updatedAt: now,
      };
      return reply.code(201).send(agentAuthorityStore.createIdentity(identity, claims.tenant));
    } catch (error) {
      return failure(reply, error);
    }
  });

  app.post("/agents/:id/status", async (req, reply) => {
    try {
      const { id } = (req.params ?? {}) as { id?: string };
      const body = (req.body ?? {}) as { next?: unknown; reasonCode?: unknown };
      const agentId = text(id);
      const next = text(body.next);
      const reasonCode = text(body.reasonCode);
      if (!agentId || !next || !reasonCode) {
        return reply.code(400).send({ error: "AGENT_MALFORMED" });
      }
      const { claims } = requestTenant(req);
      const identity = agentAuthorityStore.identities.get(agentId);
      if (!identity || identity.tenantId !== claims.tenant) {
        return reply.code(404).send({ error: "AGENT_UNKNOWN" });
      }
      const { decision } = scoped(req, "agents.status.write", identity.branchId, WRITERS);
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });
      return agentAuthorityStore.transitionIdentity(
        agentId,
        claims.tenant,
        next as AgentStatus,
        new Date().toISOString(),
        claims.sub,
        reasonCode,
      );
    } catch (error) {
      return failure(reply, error);
    }
  });

  app.post("/agents/:id/grants", async (req, reply) => {
    try {
      const { id } = (req.params ?? {}) as { id?: string };
      const body = (req.body ?? {}) as GrantBody;
      const agentId = text(id);
      if (!agentId) return reply.code(400).send({ error: "AGENT_GRANT_MALFORMED" });
      const { claims } = requestTenant(req);
      const identity = agentAuthorityStore.identities.get(agentId);
      if (!identity || identity.tenantId !== claims.tenant) {
        return reply.code(404).send({ error: "AGENT_UNKNOWN" });
      }
      const { decision } = scoped(req, "agents.grants.write", identity.branchId, WRITERS);
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });
      const grantId = text(body.id);
      const capability = text(body.capability);
      const reasonCode = text(body.reasonCode);
      const effectiveFrom = text(body.effectiveFrom);
      const effectiveTo = text(body.effectiveTo);
      const branchId = text(body.branchId);
      if (!grantId || !capability || !reasonCode || !effectiveFrom) {
        return reply.code(400).send({ error: "AGENT_GRANT_MALFORMED" });
      }
      if (!(AGENT_CAPABILITIES as readonly string[]).includes(capability)) {
        return reply.code(400).send({ error: "AGENT_INVALID_CAPABILITY" });
      }
      return reply.code(201).send(agentAuthorityStore.grant({
        id: grantId,
        tenantId: claims.tenant,
        agentId,
        branchId,
        capability: capability as AgentCapability,
        requiresHumanApproval: body.requiresHumanApproval === true,
        effectiveFrom,
        effectiveTo,
        grantedByAccountId: claims.sub,
        revokedAt: null,
        revokedByAccountId: null,
        reasonCode,
        createdAt: new Date().toISOString(),
      }, claims.tenant));
    } catch (error) {
      return failure(reply, error);
    }
  });

  app.post("/agents/:id/grants/:grantId/revoke", async (req, reply) => {
    try {
      const params = (req.params ?? {}) as { id?: string; grantId?: string };
      const agentId = text(params.id);
      const grantId = text(params.grantId);
      if (!agentId || !grantId) {
        return reply.code(400).send({ error: "AGENT_GRANT_MALFORMED" });
      }
      const { claims } = requestTenant(req);
      const identity = agentAuthorityStore.identities.get(agentId);
      if (!identity || identity.tenantId !== claims.tenant) {
        return reply.code(404).send({ error: "AGENT_UNKNOWN" });
      }
      const { decision } = scoped(req, "agents.grants.revoke", identity.branchId, WRITERS);
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });
      const grant = agentAuthorityStore.grants.get(grantId);
      if (!grant || grant.agentId !== agentId || grant.tenantId !== claims.tenant) {
        return reply.code(404).send({ error: "AGENT_UNKNOWN" });
      }
      return agentAuthorityStore.revokeGrant(
        grantId,
        claims.tenant,
        claims.sub,
        new Date().toISOString(),
      );
    } catch (error) {
      return failure(reply, error);
    }
  });
}
