// N5/C1 scoped agent-identity API for Zyara Clinic collaboration.
//
// Agent identities are bounded service principals for clinic operations. These
// routes register, scope, expire, suspend, revoke and audit them. They never
// grant clinical, scheduling, insurance or financial authority, they never
// create a Practitioner/PractitionerRole, and they never expose secret material:
// an agent credential is addressed only by an opaque secret-manager reference.
//
// Tenant identity derives only from verified session claims; a request-body
// tenantId is ignored. Until a verified agent-credential path exists, no route
// here lets an agent identity act as an authenticated caller: registration and
// authority changes stay human-owned, AAL2, org-admin-only and deny-by-default.
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { BranchRole } from "@zyara/authorization";
import {
  AGENT_IDENTITY_KINDS,
  AGENT_IDENTITY_STATUSES,
  AgentIdentityError,
  AgentIdentityStore,
  type AgentCapability,
  type AgentIdentity,
  type AgentIdentityFilter,
  type AgentIdentityKind,
  type AgentProvenance,
  type AgentIdentityStatus,
  type HumanSponsorDirectory,
  type HumanSponsorLookup,
} from "@zyara/collaboration";
import { authorize, requestTenant } from "./auth.js";
import { workforceMembershipsFor } from "./workforce.js";

export const agentIdentityStore = new AgentIdentityStore();

const AGENT_READERS: BranchRole[] = ["org_admin", "branch_admin"];
// Authority changes are tenant-level acts: only an organisation administrator
// with strong assurance may create or re-scope an agent identity.
const AGENT_ADMINS: BranchRole[] = ["org_admin"];

const SPONSOR_ROLES: BranchRole[] = ["org_admin", "branch_admin", "clinician", "receptionist"];

// Sponsorship is resolved from the trusted server-side membership registry that
// W1/W3 already use. A patient membership can never sponsor an agent identity.
export const workforceSponsorDirectory: HumanSponsorDirectory = {
  isEligibleHumanSponsor(lookup: HumanSponsorLookup): boolean {
    const memberships = workforceMembershipsFor(lookup.tenantId, lookup.accountId);
    return memberships.some(
      (membership) =>
        membership.tenantId === lookup.tenantId &&
        !membership.revoked &&
        SPONSOR_ROLES.includes(membership.role),
    );
  },
};

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

function provenance(): AgentProvenance {
  return {
    source: "zyara-native",
    sourceRef: "Zyara Network N5/C1 agent identity API",
    sourceRevision: process.env.ZYARA_BUILD ?? "n5c1-dev",
    observedAt: new Date().toISOString(),
  };
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function malformed(reply: { code(code: number): { send(body: unknown): unknown } }, detail: string) {
  return reply.code(400).send({ error: "AGENT_MALFORMED", detail });
}

function agentFailure(reply: { code(code: number): { send(body: unknown): unknown } }, error: unknown) {
  if (error instanceof AgentIdentityError) {
    const status = error.code === "AGENT_UNKNOWN_REFERENCE" ? 404 : 400;
    return reply.code(status).send({ error: error.code });
  }
  return reply.code(401).send({ error: "UNAUTHENTICATED" });
}

interface AgentBody {
  id?: unknown;
  branchId?: unknown;
  displayName?: unknown;
  kind?: unknown;
  humanSponsorAccountId?: unknown;
  effectiveFrom?: unknown;
  expiresAt?: unknown;
  credentialRef?: unknown;
  correlationId?: unknown;
  idempotencyKey?: unknown;
}

export function registerAgentRoutes(app: FastifyInstance) {
  app.get("/workforce/agents", async (req, reply) => {
    try {
      const query = (req.query ?? {}) as {
        branchId?: string;
        status?: string;
        kind?: string;
        humanSponsorAccountId?: string;
      };
      const branchId = query.branchId ?? null;
      const { claims, decision } = scoped(
        req,
        "workforce.agents.read",
        branchId,
        branchId ? AGENT_READERS : AGENT_ADMINS,
      );
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });
      const filter: AgentIdentityFilter = {};
      if (branchId) filter.branchId = branchId;
      if (query.humanSponsorAccountId) filter.humanSponsorAccountId = query.humanSponsorAccountId;
      if (query.status) {
        if (!AGENT_IDENTITY_STATUSES.includes(query.status as AgentIdentityStatus)) {
          return malformed(reply, "unsupported status filter");
        }
        filter.status = query.status as AgentIdentityStatus;
      }
      if (query.kind) {
        if (!AGENT_IDENTITY_KINDS.includes(query.kind as AgentIdentityKind)) {
          return malformed(reply, "unsupported kind filter");
        }
        filter.kind = query.kind as AgentIdentityKind;
      }
      return agentIdentityStore
        .listIdentities(claims.tenant, filter)
        .map((identity) => ({
          ...identity,
          capabilities: agentIdentityStore.capabilitiesOf(identity.id, claims.tenant),
        }));
    } catch (error) {
      return agentFailure(reply, error);
    }
  });

  app.get("/workforce/agents/:id", async (req, reply) => {
    try {
      const params = (req.params ?? {}) as { id?: string };
      const id = text(params.id);
      if (!id) return malformed(reply, "agent id is required");
      const { claims } = requestTenant(req);
      const identity = agentIdentityStore.identities.get(id);
      if (!identity || identity.tenantId !== claims.tenant) {
        return reply.code(404).send({ error: "AGENT_UNKNOWN_REFERENCE" });
      }
      const { decision } = scoped(req, "workforce.agents.read", identity.branchId, AGENT_READERS);
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });
      return {
        identity,
        capabilities: agentIdentityStore.capabilitiesOf(id, claims.tenant),
        events: agentIdentityStore.listEvents(id, claims.tenant),
      };
    } catch (error) {
      return agentFailure(reply, error);
    }
  });

  app.post("/workforce/agents", async (req, reply) => {
    try {
      const body = (req.body ?? {}) as AgentBody;
      const id = text(body.id);
      const displayName = text(body.displayName);
      const kind = text(body.kind);
      const humanSponsorAccountId = text(body.humanSponsorAccountId);
      const effectiveFrom = text(body.effectiveFrom);
      const expiresAt = text(body.expiresAt);
      const credentialRef = text(body.credentialRef);
      if (!id || !displayName || !kind || !humanSponsorAccountId || !effectiveFrom || !expiresAt) {
        return malformed(
          reply,
          "id, displayName, kind, humanSponsorAccountId, effectiveFrom and expiresAt are required",
        );
      }
      if (!credentialRef) {
        return malformed(reply, "credentialRef (an opaque secret-manager reference) is required");
      }
      const branchId = text(body.branchId);
      const { claims, decision } = scoped(req, "workforce.agents.write", branchId, AGENT_ADMINS);
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });
      const identity: AgentIdentity = agentIdentityStore.register(
        {
          id,
          tenantId: claims.tenant,
          branchId,
          displayName,
          kind: kind as AgentIdentityKind,
          humanSponsorAccountId,
          effectiveFrom,
          expiresAt,
          credentialRef,
          provenance: provenance(),
          correlationId: text(body.correlationId),
          idempotencyKey: text(body.idempotencyKey),
        },
        claims.tenant,
        workforceSponsorDirectory,
      );
      return reply.code(201).send(identity);
    } catch (error) {
      return agentFailure(reply, error);
    }
  });

  app.post("/workforce/agents/:id/capabilities", async (req, reply) => {
    try {
      const params = (req.params ?? {}) as { id?: string };
      const id = text(params.id);
      if (!id) return malformed(reply, "agent id is required");
      const body = (req.body ?? {}) as { capability?: unknown; action?: unknown; reason?: unknown };
      const capability = text(body.capability);
      const action = text(body.action);
      if (!capability || !action) return malformed(reply, "capability and action are required");
      if (action !== "grant" && action !== "revoke") {
        return malformed(reply, "action must be grant or revoke");
      }
      const { claims } = requestTenant(req);
      const identity = agentIdentityStore.identities.get(id);
      if (!identity || identity.tenantId !== claims.tenant) {
        return reply.code(404).send({ error: "AGENT_UNKNOWN_REFERENCE" });
      }
      const { decision } = scoped(req, "workforce.agents.authority", identity.branchId, AGENT_ADMINS);
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });
      const at = new Date().toISOString();
      const actor = { kind: "human" as const, accountId: claims.sub };
      if (action === "grant") {
        return agentIdentityStore.grantCapability(id, capability as AgentCapability, actor, claims.tenant, {
          at,
          reason: text(body.reason) ?? "",
        });
      }
      return agentIdentityStore.revokeCapability(id, capability as AgentCapability, actor, claims.tenant, {
        at,
        reason: text(body.reason) ?? "",
      });
    } catch (error) {
      return agentFailure(reply, error);
    }
  });

  app.post("/workforce/agents/:id/suspend", async (req, reply) => {
    return lifecycle(req, reply, (id, tenant, actor, body) =>
      agentIdentityStore.suspend(id, actor, tenant, {
        at: new Date().toISOString(),
        reason: text(body.reason) ?? "",
      }));
  });

  app.post("/workforce/agents/:id/reactivate", async (req, reply) => {
    return lifecycle(req, reply, (id, tenant, actor, body) =>
      agentIdentityStore.reactivate(id, actor, tenant, {
        at: new Date().toISOString(),
        reason: text(body.reason) ?? "",
      }));
  });

  app.post("/workforce/agents/:id/revoke", async (req, reply) => {
    return lifecycle(req, reply, (id, tenant, actor, body) =>
      agentIdentityStore.revoke(id, actor, tenant, {
        at: new Date().toISOString(),
        reason: text(body.reason) ?? "",
      }));
  });

  app.post("/workforce/agents/:id/credential-rotation", async (req, reply) => {
    return lifecycle(req, reply, (id, tenant, actor, body) => {
      const credentialRef = text(body.credentialRef);
      if (!credentialRef) {
        throw new AgentIdentityError(
          "AGENT_CREDENTIAL_REF_INVALID",
          "credentialRef (an opaque secret-manager reference) is required",
        );
      }
      return agentIdentityStore.rotateCredential(id, credentialRef, actor, tenant, {
        at: new Date().toISOString(),
        reason: text(body.reason) ?? "",
      });
    });
  });

  // Read-only authority probe for administrators. It evaluates the same
  // deny-by-default resolver that operational surfaces use; it never mutates
  // state and it never performs the action it is asked about.
  app.get("/workforce/agents/:id/authority", async (req, reply) => {
    try {
      const params = (req.params ?? {}) as { id?: string };
      const id = text(params.id);
      if (!id) return malformed(reply, "agent id is required");
      const query = (req.query ?? {}) as { capability?: string; branchId?: string; at?: string };
      const capability = text(query.capability);
      if (!capability) return malformed(reply, "capability is required");
      const at = text(query.at) ?? new Date().toISOString();
      const { claims } = requestTenant(req);
      const identity = agentIdentityStore.identities.get(id);
      if (!identity || identity.tenantId !== claims.tenant) {
        return reply.code(404).send({ error: "AGENT_UNKNOWN_REFERENCE" });
      }
      const { decision } = scoped(
        req,
        "workforce.agents.authority.read",
        identity.branchId,
        AGENT_ADMINS,
      );
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });
      return agentIdentityStore.resolveAuthority(
        id,
        claims.tenant,
        { capability: capability as AgentCapability, branchId: text(query.branchId), at },
        workforceSponsorDirectory,
      );
    } catch (error) {
      return agentFailure(reply, error);
    }
  });

}

function lifecycle(
  req: FastifyRequest,
  reply: { code(code: number): { send(body: unknown): unknown } },
  act: (
    id: string,
    tenant: string,
    actor: { kind: "human"; accountId: string },
    body: { reason?: unknown; credentialRef?: unknown },
  ) => AgentIdentity,
) {
  try {
    const params = (req.params ?? {}) as { id?: string };
    const id = text(params.id);
    if (!id) return malformed(reply, "agent id is required");
    const body = (req.body ?? {}) as { reason?: unknown; credentialRef?: unknown };
    const { claims } = requestTenant(req);
    const identity = agentIdentityStore.identities.get(id);
    if (!identity || identity.tenantId !== claims.tenant) {
      return reply.code(404).send({ error: "AGENT_UNKNOWN_REFERENCE" });
    }
    const { decision } = scoped(req, "workforce.agents.authority", identity.branchId, AGENT_ADMINS);
    if (!decision.allow) return reply.code(403).send({ error: decision.denial });
    return act(id, claims.tenant, { kind: "human", accountId: claims.sub }, body);
  } catch (error) {
    return agentFailure(reply, error);
  }
}
