// W1 synthetic qualification for the clinic workforce graph.
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  WorkforceError,
  WorkforceStore,
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
      startsOn: "2026-09-22",
      endsOn: "2026-09-23",
      status: "requested",
      approverAccountId: null,
      provenance,
    }, "t1");
    const leave = store.leaveRequests.get("leave-1");
    assert.equal(leave?.status, "requested");
    assert.equal(leave?.provenance.source, "qdrat-adapted");
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
});
