import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Membership, BranchRole } from "@zyara/authorization";
import {
  WorkforceError,
  WorkforceStore,
  type Department,
  type LeaveRequest,
  type StaffAssignment,
  type Team,
  type WorkforceProvenance,
  type Shift,
} from "@zyara/enterprise-access";
import { authorize, requestTenant } from "./auth.js";

// W1 scoped workforce API contract.
//
// Memberships must be supplied by a trusted server-side identity/membership
// adapter. There is deliberately no HTTP endpoint that can grant a membership.
// Until that adapter is wired, workforce writes deny by default.
const MEMBERSHIPS = new Map<string, Membership[]>();
export const workforceStore = new WorkforceStore();

function membershipKey(tenantId: string, accountId: string): string {
  return `${tenantId}:${accountId}`;
}

export function replaceWorkforceMemberships(
  tenantId: string,
  accountId: string,
  memberships: readonly Membership[],
): void {
  MEMBERSHIPS.set(membershipKey(tenantId, accountId), [...memberships]);
}

function nativeProvenance(): WorkforceProvenance {
  return {
    source: "zyara-native",
    sourceRef: "Zyara Network W1 workforce API",
    sourceRevision: process.env.ZYARA_BUILD ?? "w1-dev",
    observedAt: new Date().toISOString(),
  };
}

function requireScopedRole(
  req: FastifyRequest,
  action: string,
  branchId: string | null,
  allowRoles: BranchRole[],
) {
  const { claims } = requestTenant(req);
  const memberships = MEMBERSHIPS.get(membershipKey(claims.tenant, claims.sub)) ?? [];
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
  return { claims, decision };
}

function malformed(reply: { code(code: number): { send(body: unknown): unknown } }, detail: string) {
  return reply.code(400).send({ error: "WORKFORCE_MALFORMED", detail });
}

function workforceFailure(
  reply: { code(code: number): { send(body: unknown): unknown } },
  error: unknown,
) {
  if (error instanceof WorkforceError) {
    return reply.code(400).send({ error: error.code });
  }
  return reply.code(401).send({ error: "UNAUTHENTICATED" });
}

export function registerWorkforceRoutes(app: FastifyInstance) {
  app.get("/workforce/departments", async (req, reply) => {
    try {
      const query = (req.query ?? {}) as { branchId?: string };
      const branchId = query.branchId ?? null;
      const allowRoles: BranchRole[] = branchId
        ? ["org_admin", "branch_admin", "clinician", "receptionist"]
        : ["org_admin"];
      const { claims, decision } = requireScopedRole(req, "workforce.departments.read", branchId, allowRoles);
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });
      return workforceStore.listDepartments(claims.tenant, query.branchId);
    } catch (error) {
      return workforceFailure(reply, error);
    }
  });

  app.get("/workforce/staff-assignments", async (req, reply) => {
    try {
      const query = (req.query ?? {}) as { branchId?: string };
      const branchId = query.branchId ?? null;
      const allowRoles: BranchRole[] = branchId
        ? ["org_admin", "branch_admin"]
        : ["org_admin"];
      const { claims, decision } = requireScopedRole(req, "workforce.assignments.read", branchId, allowRoles);
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });
      return workforceStore.listAssignments(claims.tenant, query.branchId);
    } catch (error) {
      return workforceFailure(reply, error);
    }
  });

  app.post("/workforce/departments", async (req, reply) => {
    try {
      const body = (req.body ?? {}) as Partial<Department> & { tenantId?: string };
      if (!body.id || !body.organizationId) return malformed(reply, "id and organizationId are required");
      const branchId = body.branchId ?? null;
      const { claims, decision } = requireScopedRole(
        req,
        "workforce.departments.write",
        branchId,
        branchId ? ["org_admin", "branch_admin"] : ["org_admin"],
      );
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });
      const department: Department = {
        id: body.id,
        tenantId: claims.tenant,
        organizationId: body.organizationId,
        branchId,
        parentDepartmentId: body.parentDepartmentId ?? null,
        labels: body.labels ?? {},
        active: body.active ?? true,
        provenance: nativeProvenance(),
      };
      workforceStore.addDepartment(department, claims.tenant);
      return reply.code(201).send(department);
    } catch (error) {
      return workforceFailure(reply, error);
    }
  });

  app.post("/workforce/teams", async (req, reply) => {
    try {
      const body = (req.body ?? {}) as Partial<Team> & { tenantId?: string };
      if (!body.id || !body.organizationId) return malformed(reply, "id and organizationId are required");
      const branchId = body.branchId ?? null;
      const { claims, decision } = requireScopedRole(
        req,
        "workforce.teams.write",
        branchId,
        branchId ? ["org_admin", "branch_admin"] : ["org_admin"],
      );
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });
      const team: Team = {
        id: body.id,
        tenantId: claims.tenant,
        organizationId: body.organizationId,
        branchId,
        departmentId: body.departmentId ?? null,
        labels: body.labels ?? {},
        active: body.active ?? true,
        provenance: nativeProvenance(),
      };
      workforceStore.addTeam(team, claims.tenant);
      return reply.code(201).send(team);
    } catch (error) {
      return workforceFailure(reply, error);
    }
  });

  app.post("/workforce/staff-assignments", async (req, reply) => {
    try {
      const body = (req.body ?? {}) as Partial<StaffAssignment> & { tenantId?: string };
      if (!body.id || !body.accountId || !body.organizationId || !body.operationalRole || !body.effectiveFrom) {
        return malformed(reply, "id, accountId, organizationId, operationalRole and effectiveFrom are required");
      }
      const branchId = body.branchId ?? null;
      const { claims, decision } = requireScopedRole(
        req,
        "workforce.assignments.write",
        branchId,
        branchId ? ["org_admin", "branch_admin"] : ["org_admin"],
      );
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });
      const assignment: StaffAssignment = {
        id: body.id,
        tenantId: claims.tenant,
        accountId: body.accountId,
        organizationId: body.organizationId,
        branchId,
        departmentId: body.departmentId ?? null,
        teamId: body.teamId ?? null,
        practitionerRoleId: body.practitionerRoleId ?? null,
        operationalRole: body.operationalRole,
        effectiveFrom: body.effectiveFrom,
        effectiveTo: body.effectiveTo ?? null,
        provenance: nativeProvenance(),
      };
      workforceStore.addStaffAssignment(assignment, claims.tenant);
      return reply.code(201).send(assignment);
    } catch (error) {
      return workforceFailure(reply, error);
    }
  });

  app.post("/workforce/shifts", async (req, reply) => {
    try {
      const body = (req.body ?? {}) as Partial<Shift> & { tenantId?: string };
      if (!body.id || !body.staffAssignmentId || !body.branchId || !body.startsAt || !body.endsAt) {
        return malformed(reply, "id, staffAssignmentId, branchId, startsAt and endsAt are required");
      }
      const { claims, decision } = requireScopedRole(
        req,
        "workforce.shifts.write",
        body.branchId,
        ["org_admin", "branch_admin"],
      );
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });
      const shift: Shift = {
        id: body.id,
        tenantId: claims.tenant,
        staffAssignmentId: body.staffAssignmentId,
        branchId: body.branchId,
        startsAt: body.startsAt,
        endsAt: body.endsAt,
        status: "planned",
        provenance: nativeProvenance(),
      };
      workforceStore.addShift(shift, claims.tenant);
      return reply.code(201).send(shift);
    } catch (error) {
      return workforceFailure(reply, error);
    }
  });

  app.post("/workforce/leave-requests", async (req, reply) => {
    try {
      const body = (req.body ?? {}) as Partial<LeaveRequest> & { tenantId?: string; branchId?: string };
      if (!body.id || !body.staffAssignmentId || !body.startsOn || !body.endsOn || !body.branchId) {
        return malformed(reply, "id, staffAssignmentId, branchId, startsOn and endsOn are required");
      }
      const { claims, decision } = requireScopedRole(
        req,
        "workforce.leave.write",
        body.branchId,
        ["org_admin", "branch_admin"],
      );
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });
      const leave: LeaveRequest = {
        id: body.id,
        tenantId: claims.tenant,
        staffAssignmentId: body.staffAssignmentId,
        branchId: body.branchId,
        startsOn: body.startsOn,
        endsOn: body.endsOn,
        status: "requested",
        approverAccountId: null,
        provenance: nativeProvenance(),
      };
      workforceStore.addLeaveRequest(leave, claims.tenant);
      return reply.code(201).send(leave);
    } catch (error) {
      return workforceFailure(reply, error);
    }
  });
}
