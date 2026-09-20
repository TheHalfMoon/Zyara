// Zyara Network W1: clinic organization/workforce graph.
//
// Qdrat semantic donor reference:
// TheHalfMoon/Qdrat@e2d288940aab52af881786678b2fc86dfa5c272a.
// This file adapts domain ideas only; it does not copy Qdrat/Horilla code.
//
// Workforce records are operational administration, not clinical authority.
// Practitioner/PractitionerRole remain the healthcare identity/privilege model.

export type WorkforceId = string;

export interface WorkforceProvenance {
  source: "zyara-native" | "qdrat-adapted";
  sourceRef: string;
  sourceRevision: string;
  observedAt: string;
}

export interface Department {
  id: WorkforceId;
  tenantId: string;
  organizationId: string;
  branchId: string | null;
  parentDepartmentId: WorkforceId | null;
  labels: Record<string, string>;
  active: boolean;
  provenance: WorkforceProvenance;
}

export interface Team {
  id: WorkforceId;
  tenantId: string;
  organizationId: string;
  branchId: string | null;
  departmentId: WorkforceId | null;
  labels: Record<string, string>;
  active: boolean;
  provenance: WorkforceProvenance;
}

export interface StaffAssignment {
  id: WorkforceId;
  tenantId: string;
  accountId: string;
  organizationId: string;
  branchId: string | null;
  departmentId: WorkforceId | null;
  teamId: WorkforceId | null;
  practitionerRoleId: string | null;
  operationalRole: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  provenance: WorkforceProvenance;
}

export type ShiftStatus = "planned" | "cancelled";

export interface Shift {
  id: WorkforceId;
  tenantId: string;
  staffAssignmentId: WorkforceId;
  branchId: string;
  startsAt: string;
  endsAt: string;
  status: ShiftStatus;
  provenance: WorkforceProvenance;
}

export type LeaveRequestStatus = "requested" | "approved" | "rejected" | "cancelled";

export interface LeaveRequest {
  id: WorkforceId;
  tenantId: string;
  staffAssignmentId: WorkforceId;
  branchId: string;
  startsOn: string;
  endsOn: string;
  status: LeaveRequestStatus;
  approverAccountId: string | null;
  provenance: WorkforceProvenance;
}

export type WorkforceErrorCode =
  | "WORKFORCE_DUPLICATE_ID"
  | "WORKFORCE_CROSS_TENANT"
  | "WORKFORCE_CROSS_BRANCH"
  | "WORKFORCE_UNKNOWN_REFERENCE"
  | "WORKFORCE_INVALID_INTERVAL";

export class WorkforceError extends Error {
  code: WorkforceErrorCode;

  constructor(code: WorkforceErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function validInstant(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

export class WorkforceStore {
  readonly departments = new Map<WorkforceId, Department>();
  readonly teams = new Map<WorkforceId, Team>();
  readonly staffAssignments = new Map<WorkforceId, StaffAssignment>();
  readonly shifts = new Map<WorkforceId, Shift>();
  readonly leaveRequests = new Map<WorkforceId, LeaveRequest>();

  private fail(code: WorkforceErrorCode, message: string): never {
    throw new WorkforceError(code, message);
  }

  private checkTenant(recordTenant: string, scopeTenant: string): void {
    if (recordTenant !== scopeTenant) {
      this.fail("WORKFORCE_CROSS_TENANT", `cross-tenant write: ${recordTenant} != ${scopeTenant}`);
    }
  }

  private checkBranch(referenceBranch: string | null, recordBranch: string | null): void {
    if (referenceBranch !== null && recordBranch !== null && referenceBranch !== recordBranch) {
      this.fail("WORKFORCE_CROSS_BRANCH", `cross-branch reference: ${referenceBranch} != ${recordBranch}`);
    }
  }

  private ensureUnique(id: WorkforceId): void {
    if (
      this.departments.has(id) ||
      this.teams.has(id) ||
      this.staffAssignments.has(id) ||
      this.shifts.has(id) ||
      this.leaveRequests.has(id)
    ) {
      this.fail("WORKFORCE_DUPLICATE_ID", `duplicate workforce id: ${id}`);
    }
  }

  addDepartment(department: Department, scopeTenant: string): void {
    this.checkTenant(department.tenantId, scopeTenant);
    this.ensureUnique(department.id);
    if (department.parentDepartmentId) {
      const parent = this.departments.get(department.parentDepartmentId);
      if (!parent) this.fail("WORKFORCE_UNKNOWN_REFERENCE", `department parent ${department.parentDepartmentId}`);
      this.checkTenant(parent.tenantId, scopeTenant);
      if (parent.organizationId !== department.organizationId) {
        this.fail("WORKFORCE_UNKNOWN_REFERENCE", "department parent belongs to another organization");
      }
      this.checkBranch(parent.branchId, department.branchId);
    }
    this.departments.set(department.id, department);
  }

  addTeam(team: Team, scopeTenant: string): void {
    this.checkTenant(team.tenantId, scopeTenant);
    this.ensureUnique(team.id);
    if (team.departmentId) {
      const department = this.departments.get(team.departmentId);
      if (!department) this.fail("WORKFORCE_UNKNOWN_REFERENCE", `department ${team.departmentId}`);
      this.checkTenant(department.tenantId, scopeTenant);
      if (department.organizationId !== team.organizationId) {
        this.fail("WORKFORCE_UNKNOWN_REFERENCE", "team department belongs to another organization");
      }
      this.checkBranch(department.branchId, team.branchId);
    }
    this.teams.set(team.id, team);
  }

  addStaffAssignment(assignment: StaffAssignment, scopeTenant: string): void {
    this.checkTenant(assignment.tenantId, scopeTenant);
    this.ensureUnique(assignment.id);
    if (!validDate(assignment.effectiveFrom) || (assignment.effectiveTo !== null && !validDate(assignment.effectiveTo))) {
      this.fail("WORKFORCE_INVALID_INTERVAL", "staff assignment dates must be ISO calendar dates");
    }
    if (assignment.effectiveTo !== null && assignment.effectiveTo < assignment.effectiveFrom) {
      this.fail("WORKFORCE_INVALID_INTERVAL", "staff assignment effectiveTo precedes effectiveFrom");
    }
    if (assignment.departmentId) {
      const department = this.departments.get(assignment.departmentId);
      if (!department) this.fail("WORKFORCE_UNKNOWN_REFERENCE", `department ${assignment.departmentId}`);
      this.checkTenant(department.tenantId, scopeTenant);
      if (department.organizationId !== assignment.organizationId) {
        this.fail("WORKFORCE_UNKNOWN_REFERENCE", "assignment department belongs to another organization");
      }
      this.checkBranch(department.branchId, assignment.branchId);
    }
    if (assignment.teamId) {
      const team = this.teams.get(assignment.teamId);
      if (!team) this.fail("WORKFORCE_UNKNOWN_REFERENCE", `team ${assignment.teamId}`);
      this.checkTenant(team.tenantId, scopeTenant);
      if (team.organizationId !== assignment.organizationId) {
        this.fail("WORKFORCE_UNKNOWN_REFERENCE", "assignment team belongs to another organization");
      }
      this.checkBranch(team.branchId, assignment.branchId);
    }
    // practitionerRoleId is only an opaque linkage. It never grants clinical
    // authority; credential/privilege validation remains in the provider graph.
    this.staffAssignments.set(assignment.id, assignment);
  }

  addShift(shift: Shift, scopeTenant: string): void {
    this.checkTenant(shift.tenantId, scopeTenant);
    this.ensureUnique(shift.id);
    const assignment = this.staffAssignments.get(shift.staffAssignmentId);
    if (!assignment) this.fail("WORKFORCE_UNKNOWN_REFERENCE", `assignment ${shift.staffAssignmentId}`);
    this.checkTenant(assignment.tenantId, scopeTenant);
    if (assignment.branchId !== shift.branchId) {
      this.fail("WORKFORCE_CROSS_BRANCH", "shift branch must match the staff assignment branch");
    }
    if (!validInstant(shift.startsAt) || !validInstant(shift.endsAt) || Date.parse(shift.endsAt) <= Date.parse(shift.startsAt)) {
      this.fail("WORKFORCE_INVALID_INTERVAL", "shift endsAt must be after startsAt");
    }
    // W1 deliberately does not decide overlap/coverage substitution. W2 owns
    // coverage, conflict and appointment-capacity reconciliation.
    this.shifts.set(shift.id, shift);
  }

  addLeaveRequest(request: LeaveRequest, scopeTenant: string): void {
    this.checkTenant(request.tenantId, scopeTenant);
    this.ensureUnique(request.id);
    const assignment = this.staffAssignments.get(request.staffAssignmentId);
    if (!assignment) this.fail("WORKFORCE_UNKNOWN_REFERENCE", `assignment ${request.staffAssignmentId}`);
    this.checkTenant(assignment.tenantId, scopeTenant);
    if (assignment.branchId !== request.branchId) {
      this.fail("WORKFORCE_CROSS_BRANCH", "leave branch must match the staff assignment branch");
    }
    if (!validDate(request.startsOn) || !validDate(request.endsOn) || request.endsOn < request.startsOn) {
      this.fail("WORKFORCE_INVALID_INTERVAL", "leave dates must be valid and ordered");
    }
    this.leaveRequests.set(request.id, request);
  }

  listDepartments(scopeTenant: string, branchId?: string): Department[] {
    return [...this.departments.values()].filter(
      (department) =>
        department.tenantId === scopeTenant &&
        (branchId === undefined || department.branchId === null || department.branchId === branchId),
    );
  }

  listAssignments(scopeTenant: string, branchId?: string): StaffAssignment[] {
    return [...this.staffAssignments.values()].filter(
      (assignment) =>
        assignment.tenantId === scopeTenant &&
        (branchId === undefined || assignment.branchId === branchId),
    );
  }
}
