// W1 synthetic qualification for the clinic workforce graph.
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  CoverageError,
  CoverageStore,
  WorkforceError,
  WorkforceStore,
  detectLeaveConflicts,
  detectShiftOverlaps,
  transitionCoverageStatus,
  type WorkforceProvenance,
} from "@zyara/enterprise-access";


const provenance: WorkforceProvenance = {
  source: "qdrat-adapted",
  sourceRef: "TheHalfMoon/Qdrat",
  sourceRevision: "e2d288940aab52af881786678b2fc86dfa5c272a",
  observedAt: "2026-09-20T00:00:00Z",
};

function seededStore(): WorkforceStore {
  const store = new WorkforceStore();
  store.addDepartment({
    id: "dept-1",
    tenantId: "t1",
    organizationId: "org-1",
    branchId: "branch-1",
    parentDepartmentId: null,
    labels: { en: "Front Desk" },
    active: true,
    provenance,
  }, "t1");
  store.addTeam({
    id: "team-1",
    tenantId: "t1",
    organizationId: "org-1",
    branchId: "branch-1",
    departmentId: "dept-1",
    labels: { en: "Reception" },
    active: true,
    provenance,
  }, "t1");
  store.addStaffAssignment({
    id: "assignment-1",
    tenantId: "t1",
    accountId: "account-1",
    organizationId: "org-1",
    branchId: "branch-1",
    departmentId: "dept-1",
    teamId: "team-1",
    practitionerRoleId: null,
    operationalRole: "receptionist",
    effectiveFrom: "2026-09-01",
    effectiveTo: null,
    provenance,
  }, "t1");
  return store;
}

describe("W1 workforce graph", () => {
  it("models departments, teams and staff assignments without replacing PractitionerRole", () => {
    const store = seededStore();
    store.addStaffAssignment({
      id: "assignment-clinician",
      tenantId: "t1",
      accountId: "account-2",
      organizationId: "org-1",
      branchId: "branch-1",
      departmentId: "dept-1",
      teamId: null,
      practitionerRoleId: "practitioner-role-external-ref",
      operationalRole: "clinician-operations",
      effectiveFrom: "2026-09-01",
      effectiveTo: null,
      provenance,
    }, "t1");

    const assignment = store.staffAssignments.get("assignment-clinician");
    assert.equal(assignment?.practitionerRoleId, "practitioner-role-external-ref");
    assert.equal(assignment?.provenance.sourceRevision, provenance.sourceRevision);
    assert.equal(store.listDepartments("t1", "branch-1").length, 1);
    assert.equal(store.listAssignments("t1", "branch-1").length, 2);
  });

  it("denies cross-tenant and cross-branch composition", () => {
    const store = seededStore();
    assert.throws(
      () => store.addDepartment({
        id: "dept-x",
        tenantId: "t2",
        organizationId: "org-2",
        branchId: null,
        parentDepartmentId: null,
        labels: {},
        active: true,
        provenance,
      }, "t1"),
      (error: unknown) => error instanceof WorkforceError && error.code === "WORKFORCE_CROSS_TENANT",
    );

    assert.throws(
      () => store.addTeam({
        id: "team-x",
        tenantId: "t1",
        organizationId: "org-1",
        branchId: "branch-2",
        departmentId: "dept-1",
        labels: {},
        active: true,
        provenance,
      }, "t1"),
      (error: unknown) => error instanceof WorkforceError && error.code === "WORKFORCE_CROSS_BRANCH",
    );
  });

  it("adds shifts only for the assignment branch and rejects invalid intervals", () => {
    const store = seededStore();
    store.addShift({
      id: "shift-1",
      tenantId: "t1",
      staffAssignmentId: "assignment-1",
      branchId: "branch-1",
      startsAt: "2026-09-21T06:00:00Z",
      endsAt: "2026-09-21T14:00:00Z",
      status: "planned",
      provenance,
    }, "t1");
    assert.equal(store.shifts.size, 1);

    assert.throws(
      () => store.addShift({
        id: "shift-2",
        tenantId: "t1",
        staffAssignmentId: "assignment-1",
        branchId: "branch-2",
        startsAt: "2026-09-21T06:00:00Z",
        endsAt: "2026-09-21T14:00:00Z",
        status: "planned",
        provenance,
      }, "t1"),
      (error: unknown) => error instanceof WorkforceError && error.code === "WORKFORCE_CROSS_BRANCH",
    );

    assert.throws(
      () => store.addShift({
        id: "shift-3",
        tenantId: "t1",
        staffAssignmentId: "assignment-1",
        branchId: "branch-1",
        startsAt: "2026-09-21T14:00:00Z",
        endsAt: "2026-09-21T06:00:00Z",
        status: "planned",
        provenance,
      }, "t1"),
      (error: unknown) => error instanceof WorkforceError && error.code === "WORKFORCE_INVALID_INTERVAL",
    );
  });

  it("keeps leave administrative and provenance-aware", () => {
    const store = seededStore();
    store.addLeaveRequest({
      id: "leave-1",
      tenantId: "t1",
      staffAssignmentId: "assignment-1",
      branchId: "branch-1",
      startsOn: "2026-09-22",
      endsOn: "2026-09-23",
      status: "requested",
      approverAccountId: null,
      provenance,
    }, "t1");
    const leave = store.leaveRequests.get("leave-1");
    assert.equal(leave?.status, "requested");
    assert.equal(leave?.provenance.source, "qdrat-adapted");

    assert.throws(
      () => store.addLeaveRequest({
        id: "leave-cross-branch",
        tenantId: "t1",
        staffAssignmentId: "assignment-1",
        branchId: "branch-2",
        startsOn: "2026-09-24",
        endsOn: "2026-09-24",
        status: "requested",
        approverAccountId: null,
        provenance,
      }, "t1"),
      (error: unknown) => error instanceof WorkforceError && error.code === "WORKFORCE_CROSS_BRANCH",
    );
  });

  it("migration enforces tenant RLS and keeps workforce separate from clinical authority", () => {
    const sql = readFileSync(new URL("../../db/migrations/038_workforce_graph.sql", import.meta.url), "utf8");
    for (const token of [
      "departments",
      "workforce_teams",
      "staff_assignments",
      "workforce_shifts",
      "leave_requests",
      "FORCE ROW LEVEL SECURITY",
      "practitioner_role_id",
      "source_revision",
      "WITH CHECK",
    ]) {
      assert.ok(sql.includes(token), token);
    }
    assert.ok(!sql.includes("payroll"));
    assert.ok(!sql.includes("biometric"));
    assert.ok(!sql.includes("face_recognition"));
  });

  it("detects planned shift overlaps read-only and ignores cancelled shifts", () => {
    const store = seededStore();
    store.addShift({ id: "s-a", tenantId: "t1", staffAssignmentId: "assignment-1", branchId: "branch-1", startsAt: "2026-09-21T06:00:00Z", endsAt: "2026-09-21T14:00:00Z", status: "planned", provenance }, "t1");
    store.addShift({ id: "s-b", tenantId: "t1", staffAssignmentId: "assignment-1", branchId: "branch-1", startsAt: "2026-09-21T10:00:00Z", endsAt: "2026-09-21T18:00:00Z", status: "planned", provenance }, "t1");
    store.addShift({ id: "s-c", tenantId: "t1", staffAssignmentId: "assignment-1", branchId: "branch-1", startsAt: "2026-09-21T10:00:00Z", endsAt: "2026-09-21T18:00:00Z", status: "cancelled", provenance }, "t1");
    const overlaps = detectShiftOverlaps(store, "t1");
    assert.equal(overlaps.length, 1);
    assert.equal(overlaps[0].shiftAId, "s-a");
    assert.equal(overlaps[0].shiftBId, "s-b");
    assert.equal(store.shifts.size, 3);
  });

  it("detects approved leave overlapping planned shifts only", () => {
    const store = seededStore();
    store.addShift({ id: "s-1", tenantId: "t1", staffAssignmentId: "assignment-1", branchId: "branch-1", startsAt: "2026-09-22T06:00:00Z", endsAt: "2026-09-22T14:00:00Z", status: "planned", provenance }, "t1");
    store.addLeaveRequest({ id: "lv-ok", tenantId: "t1", staffAssignmentId: "assignment-1", branchId: "branch-1", startsOn: "2026-09-22", endsOn: "2026-09-22", status: "approved", approverAccountId: "m1", provenance }, "t1");
    store.addLeaveRequest({ id: "lv-req", tenantId: "t1", staffAssignmentId: "assignment-1", branchId: "branch-1", startsOn: "2026-09-22", endsOn: "2026-09-22", status: "requested", approverAccountId: null, provenance }, "t1");
    const conflicts = detectLeaveConflicts(store, "t1");
    assert.equal(conflicts.length, 1);
    assert.equal(conflicts[0].leaveRequestId, "lv-ok");
  });

  it("records advisory coverage with branch integrity and conservative lifecycle", () => {
    const store = seededStore();
    const coverage = new CoverageStore();
    coverage.record({ id: "cov-1", tenantId: "t1", branchId: "branch-1", staffAssignmentId: "assignment-1", shiftId: null, leaveRequestId: null, kind: "coverage_gap", detail: "evening gap", status: "open", provenance }, "t1", store);
    assert.equal(coverage.list("t1", "branch-1").length, 1);
    assert.throws(() => coverage.resolve("cov-1", "t1"), (e: unknown) => e instanceof CoverageError && e.code === "COVERAGE_INVALID_TRANSITION");
    coverage.acknowledge("cov-1", "t1");
    coverage.resolve("cov-1", "t1");
    assert.equal(coverage.exceptions.get("cov-1")?.status, "resolved");
    assert.throws(() => transitionCoverageStatus("open", "resolved"), (e: unknown) => e instanceof CoverageError);
    assert.throws(
      () => coverage.record({ id: "cov-x", tenantId: "t2", branchId: "branch-1", staffAssignmentId: "assignment-1", shiftId: null, leaveRequestId: null, kind: "coverage_gap", detail: "", status: "open", provenance }, "t1", store),
      (e: unknown) => e instanceof CoverageError && e.code === "COVERAGE_CROSS_TENANT",
    );
  });

  it("w2 migration stays advisory with tenant RLS and no clinical mutation", () => {
    const sql = readFileSync(new URL("../../db/migrations/039_coverage_exceptions.sql", import.meta.url), "utf8");
    for (const token of ["coverage_exceptions", "FORCE ROW LEVEL SECURITY", "WITH CHECK", "shift_overlap", "leave_conflict", "coverage_gap"]) {
      assert.ok(sql.includes(token), token);
    }
    for (const table of ["appointments", "encounters", "prescriptions", "claims", "payments"]) {
      assert.ok(!sql.includes(`REFERENCES ${table}`), table);
      assert.ok(!sql.includes(`ALTER TABLE ${table}`), table);
    }
  });
});
