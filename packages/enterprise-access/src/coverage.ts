// Zyara Network W2: shift/leave conflict detection and coverage exceptions.
// Qdrat semantic donor reference: TheHalfMoon/Qdrat@e2d2889.
// No Qdrat/Horilla code is copied. Advisory only: never mutates
// appointments, encounters, prescriptions, orders, claims or payments.
import type { WorkforceProvenance, WorkforceStore } from "./workforce.js";
export type CoverageId = string;
export type CoverageKind = "shift_overlap" | "leave_conflict" | "coverage_gap";
export type CoverageStatus = "open" | "acknowledged" | "resolved";
export interface CoverageException {
  id: CoverageId;
  tenantId: string;
  branchId: string;
  staffAssignmentId: CoverageId | null;
  shiftId: CoverageId | null;
  leaveRequestId: CoverageId | null;
  kind: CoverageKind;
  detail: string;
  status: CoverageStatus;
  provenance: WorkforceProvenance;
}
export type CoverageErrorCode =
  | "COVERAGE_DUPLICATE_ID"
  | "COVERAGE_CROSS_TENANT"
  | "COVERAGE_CROSS_BRANCH"
  | "COVERAGE_UNKNOWN_REFERENCE"
  | "COVERAGE_MISSING_REFERENCE"
  | "COVERAGE_INVALID_KIND"
  | "COVERAGE_INVALID_STATUS"
  | "COVERAGE_INVALID_TRANSITION";
export class CoverageError extends Error {
  code: CoverageErrorCode;
  constructor(code: CoverageErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}
export interface ShiftOverlap {
  staffAssignmentId: CoverageId;
  shiftAId: CoverageId;
  shiftBId: CoverageId;
}
export interface LeaveConflict {
  staffAssignmentId: CoverageId;
  shiftId: CoverageId;
  leaveRequestId: CoverageId;
}
function shiftDay(value: string): string {
  return new Date(Date.parse(value)).toISOString().slice(0, 10);
}
export function detectShiftOverlaps(store: WorkforceStore, scopeTenant: string): ShiftOverlap[] {
  const overlaps: ShiftOverlap[] = [];
  const byAssignment = new Map<string, { id: string; starts: number; ends: number }[]>();
  for (const shift of store.shifts.values()) {
    if (shift.tenantId !== scopeTenant) continue;
    if (shift.status !== "planned") continue;
    const starts = Date.parse(shift.startsAt);
    const ends = Date.parse(shift.endsAt);
    if (Number.isNaN(starts) || Number.isNaN(ends)) continue;
    const list = byAssignment.get(shift.staffAssignmentId) ?? [];
    list.push({ id: shift.id, starts, ends });
    byAssignment.set(shift.staffAssignmentId, list);
  }
  for (const [staffAssignmentId, list] of byAssignment) {
    const ordered = [...list].sort((a, b) => a.starts - b.starts);
    for (let i = 1; i < ordered.length; i += 1) {
      if (ordered[i].starts < ordered[i - 1].ends) {
        overlaps.push({ staffAssignmentId, shiftAId: ordered[i - 1].id, shiftBId: ordered[i].id });
      }
    }
  }
  return overlaps;
}
export function detectLeaveConflicts(store: WorkforceStore, scopeTenant: string): LeaveConflict[] {
  const conflicts: LeaveConflict[] = [];
  for (const shift of store.shifts.values()) {
    if (shift.tenantId !== scopeTenant) continue;
    if (shift.status !== "planned") continue;
    const assignment = store.staffAssignments.get(shift.staffAssignmentId);
    if (!assignment || assignment.tenantId !== scopeTenant) continue;
    const sDay = shiftDay(shift.startsAt);
    const eDay = shiftDay(shift.endsAt);
    for (const leave of store.leaveRequests.values()) {
      if (leave.tenantId !== scopeTenant) continue;
      if (leave.staffAssignmentId !== shift.staffAssignmentId) continue;
      if (leave.status !== "approved") continue;
      if (sDay <= leave.endsOn && leave.startsOn <= eDay) {
        conflicts.push({ staffAssignmentId: shift.staffAssignmentId, shiftId: shift.id, leaveRequestId: leave.id });
      }
    }
  }
  return conflicts;
}
export function transitionCoverageStatus(current: CoverageStatus, next: CoverageStatus): CoverageStatus {
  if (current === "open" && next === "acknowledged") return next;
  if (current === "acknowledged" && next === "resolved") return next;
  throw new CoverageError("COVERAGE_INVALID_TRANSITION", `invalid transition: ${current} -> ${next}`);
}
export class CoverageStore {
  readonly exceptions = new Map<CoverageId, CoverageException>();
  private fail(code: CoverageErrorCode, message: string): never {
    throw new CoverageError(code, message);
  }
  record(e: CoverageException, scopeTenant: string, workforce?: WorkforceStore): void {
    if (e.tenantId !== scopeTenant) this.fail("COVERAGE_CROSS_TENANT", "cross-tenant write");
    if (this.exceptions.has(e.id)) this.fail("COVERAGE_DUPLICATE_ID", `duplicate coverage id: ${e.id}`);
    if (e.kind !== "shift_overlap" && e.kind !== "leave_conflict" && e.kind !== "coverage_gap") {
      this.fail("COVERAGE_INVALID_KIND", `unsupported kind: ${e.kind}`);
    }
    if (e.status !== "open") this.fail("COVERAGE_INVALID_STATUS", "new exceptions must start open");
    if (e.staffAssignmentId === null && e.shiftId === null && e.leaveRequestId === null) {
      this.fail("COVERAGE_MISSING_REFERENCE", "exception must reference assignment, shift or leave");
    }
    if (workforce) this.checkBranch(e, workforce, scopeTenant);
    this.exceptions.set(e.id, e);
  }
  private checkBranch(e: CoverageException, workforce: WorkforceStore, scopeTenant: string): void {
    const branches = new Set<string>();
    if (e.staffAssignmentId !== null) {
      const a = workforce.staffAssignments.get(e.staffAssignmentId);
      if (!a || a.tenantId !== scopeTenant) this.fail("COVERAGE_UNKNOWN_REFERENCE", "unknown assignment");
      if (a.branchId !== null) branches.add(a.branchId);
    }
    if (e.shiftId !== null) {
      const s = workforce.shifts.get(e.shiftId);
      if (!s || s.tenantId !== scopeTenant) this.fail("COVERAGE_UNKNOWN_REFERENCE", "unknown shift");
      branches.add(s.branchId);
    }
    if (e.leaveRequestId !== null) {
      const l = workforce.leaveRequests.get(e.leaveRequestId);
      if (!l || l.tenantId !== scopeTenant) this.fail("COVERAGE_UNKNOWN_REFERENCE", "unknown leave");
      branches.add(l.branchId);
    }
    branches.add(e.branchId);
    if (branches.size > 1) this.fail("COVERAGE_CROSS_BRANCH", "references span branches");
  }
  acknowledge(id: CoverageId, scopeTenant: string): CoverageException {
    return this.step(id, scopeTenant, "acknowledged");
  }
  resolve(id: CoverageId, scopeTenant: string): CoverageException {
    return this.step(id, scopeTenant, "resolved");
  }
  private step(id: CoverageId, scopeTenant: string, next: CoverageStatus): CoverageException {
    const cur = this.exceptions.get(id);
    if (!cur || cur.tenantId !== scopeTenant) this.fail("COVERAGE_UNKNOWN_REFERENCE", `coverage ${id}`);
    const c = this.exceptions.get(id) as CoverageException;
    const updated: CoverageException = { ...c, status: transitionCoverageStatus(c.status, next) };
    this.exceptions.set(id, updated);
    return updated;
  }
  list(scopeTenant: string, branchId?: string): CoverageException[] {
    return [...this.exceptions.values()].filter(
      (x) => x.tenantId === scopeTenant && (branchId === undefined || x.branchId === branchId),
    );
  }
}
