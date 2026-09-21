// W3 synthetic qualification for the clinic helpdesk / internal task queue.
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  OpsTaskError,
  OpsTaskStore,
  WorkforceStore,
  type OpsTaskErrorCode,
  type OpsTaskInput,
  type WorkforceProvenance,
} from "@zyara/enterprise-access";

const NOW = "2026-09-21T10:00:00Z";

const provenance: WorkforceProvenance = {
  source: "qdrat-adapted",
  sourceRef: "TheHalfMoon/Qdrat",
  sourceRevision: "e2d288940aab52af881786678b2fc86dfa5c272a",
  observedAt: "2026-09-21T00:00:00Z",
};

function expectCode(fn: () => unknown, code: OpsTaskErrorCode): void {
  assert.throws(
    fn,
    (error: unknown) => error instanceof OpsTaskError && error.code === code,
    `expected ${code}`,
  );
}

function seededWorkforce(): WorkforceStore {
  const workforce = new WorkforceStore();
  workforce.addDepartment(
    {
      id: "dept-1",
      tenantId: "t1",
      organizationId: "org-1",
      branchId: "branch-1",
      parentDepartmentId: null,
      labels: { en: "Front Desk" },
      active: true,
      provenance,
    },
    "t1",
  );
  workforce.addStaffAssignment(
    {
      id: "assignment-1",
      tenantId: "t1",
      accountId: "account-1",
      organizationId: "org-1",
      branchId: "branch-1",
      departmentId: "dept-1",
      teamId: null,
      practitionerRoleId: null,
      operationalRole: "receptionist",
      effectiveFrom: "2026-09-01",
      effectiveTo: null,
      provenance,
    },
    "t1",
  );
  workforce.addStaffAssignment(
    {
      id: "assignment-expired",
      tenantId: "t1",
      accountId: "account-2",
      organizationId: "org-1",
      branchId: "branch-1",
      departmentId: null,
      teamId: null,
      practitionerRoleId: null,
      operationalRole: "receptionist",
      effectiveFrom: "2026-01-01",
      effectiveTo: "2026-02-01",
      provenance,
    },
    "t1",
  );
  workforce.addStaffAssignment(
    {
      id: "assignment-branch-2",
      tenantId: "t1",
      accountId: "account-3",
      organizationId: "org-1",
      branchId: "branch-2",
      departmentId: null,
      teamId: null,
      practitionerRoleId: null,
      operationalRole: "receptionist",
      effectiveFrom: "2026-09-01",
      effectiveTo: null,
      provenance,
    },
    "t1",
  );
  return workforce;
}

function baseTask(overrides: Partial<OpsTaskInput> = {}): OpsTaskInput {
  return {
    id: "task-1",
    tenantId: "t1",
    branchId: "branch-1",
    kind: "facility_helpdesk",
    title: "Exam room 2 air conditioning",
    requesterAccountId: "account-1",
    origin: { kind: "human", ref: "account-1" },
    provenance,
    createdAt: NOW,
    ...overrides,
  };
}

describe("W3 clinic helpdesk task queue", () => {
  it("lets automation raise work but never close it", () => {
    const workforce = seededWorkforce();
    const store = new OpsTaskStore();
    const task = store.createTask(
      baseTask({ id: "task-auto", kind: "automation_handoff", origin: { kind: "automation", ref: "agent:refill-router" } }),
      "t1",
      workforce,
    );
    assert.equal(task.status, "open");
    assert.equal(task.origin.kind, "automation");

    store.transition("task-auto", "in_progress", { kind: "human", accountId: "account-1" }, "t1", { at: NOW });
    expectCode(
      () =>
        store.transition("task-auto", "resolved", { kind: "automation", accountId: "agent:refill-router" }, "t1", {
          at: NOW,
          resolutionNote: "auto-closed",
        }),
      "TASK_AUTOMATION_CANNOT_CLOSE",
    );
    expectCode(
      () => store.transition("task-auto", "cancelled", { kind: "automation", accountId: "agent:refill-router" }, "t1", { at: NOW }),
      "TASK_AUTOMATION_CANNOT_CLOSE",
    );
    const closed = store.transition("task-auto", "resolved", { kind: "human", accountId: "account-1" }, "t1", {
      at: NOW,
      resolutionNote: "facility vendor scheduled",
    });
    assert.equal(closed.status, "resolved");
    assert.equal(closed.resolutionNote, "facility vendor scheduled");
    assert.equal(closed.resolvedAt, NOW);
  });

  it("requires recorded outcome evidence before closure", () => {
    const store = new OpsTaskStore();
    store.createTask(baseTask(), "t1");
    expectCode(
      () => store.transition("task-1", "resolved", { kind: "human", accountId: "account-1" }, "t1", { at: NOW }),
      "TASK_INVALID_TRANSITION",
    );
    store.transition("task-1", "in_progress", { kind: "human", accountId: "account-1" }, "t1", { at: NOW });
    expectCode(
      () => store.transition("task-1", "resolved", { kind: "human", accountId: "account-1" }, "t1", { at: NOW, resolutionNote: "   " }),
      "TASK_MISSING_RESOLUTION_NOTE",
    );
    const resolved = store.transition("task-1", "resolved", { kind: "human", accountId: "account-1" }, "t1", {
      at: NOW,
      resolutionNote: "replaced filter",
    });
    assert.equal(resolved.status, "resolved");
  });

  it("freezes terminal work and only reopens resolved work with a reason", () => {
    const store = new OpsTaskStore();
    store.createTask(baseTask({ id: "task-cancel" }), "t1");
    store.transition("task-cancel", "cancelled", { kind: "human", accountId: "account-1" }, "t1", { at: NOW });
    expectCode(
      () => store.transition("task-cancel", "open", { kind: "human", accountId: "account-1" }, "t1", { at: NOW }),
      "TASK_TERMINAL_IMMUTABLE",
    );
    expectCode(
      () =>
        store.addComment(
          {
            id: "comment-cancel",
            tenantId: "t1",
            taskId: "task-cancel",
            author: { kind: "human", accountId: "account-1" },
            body: "still working on it",
            createdAt: NOW,
          },
          "t1",
        ),
      "TASK_TERMINAL_IMMUTABLE",
    );

    store.createTask(baseTask({ id: "task-resolved" }), "t1");
    store.transition("task-resolved", "in_progress", { kind: "human", accountId: "account-1" }, "t1", { at: NOW });
    store.transition("task-resolved", "resolved", { kind: "human", accountId: "account-1" }, "t1", {
      at: NOW,
      resolutionNote: "closed for now",
    });
    expectCode(
      () =>
        store.addComment(
          {
            id: "comment-resolved",
            tenantId: "t1",
            taskId: "task-resolved",
            author: { kind: "human", accountId: "account-1" },
            body: "extra note",
            createdAt: NOW,
          },
          "t1",
        ),
      "TASK_TERMINAL_IMMUTABLE",
    );
    expectCode(
      () => store.transition("task-resolved", "open", { kind: "human", accountId: "account-1" }, "t1", { at: NOW }),
      "TASK_INVALID_TRANSITION",
    );
    expectCode(
      () => store.transition("task-resolved", "in_progress", { kind: "human", accountId: "account-1" }, "t1", { at: NOW }),
      "TASK_INVALID_TRANSITION",
    );
    expectCode(
      () =>
        store.assign(
          "task-resolved",
          { accountId: "account-1", staffAssignmentId: "assignment-1" },
          "t1",
          seededWorkforce(),
          { kind: "human", accountId: "account-1" },
          NOW,
        ),
      "TASK_TERMINAL_IMMUTABLE",
    );
    const reopened = store.transition("task-resolved", "open", { kind: "human", accountId: "account-1" }, "t1", {
      at: NOW,
      reason: "tenant reported the room is still warm",
    });
    assert.equal(reopened.status, "open");
    assert.equal(reopened.resolutionNote, null);
    assert.equal(reopened.resolvedAt, null);
  });

  it("assigns work only to an active staff assignment in the same tenant and branch", () => {
    const workforce = seededWorkforce();
    const store = new OpsTaskStore();
    store.createTask(baseTask(), "t1");

    expectCode(
      () => store.assign("task-1", { accountId: "account-9", staffAssignmentId: "assignment-9" }, "t1", workforce, { kind: "human", accountId: "account-1" }, NOW),
      "TASK_ASSIGNEE_NOT_ELIGIBLE",
    );
    expectCode(
      () => store.assign("task-1", { accountId: "account-2", staffAssignmentId: "assignment-1" }, "t1", workforce, { kind: "human", accountId: "account-1" }, NOW),
      "TASK_ASSIGNEE_NOT_ELIGIBLE",
    );
    expectCode(
      () => store.assign("task-1", { accountId: "account-3", staffAssignmentId: "assignment-branch-2" }, "t1", workforce, { kind: "human", accountId: "account-1" }, NOW),
      "TASK_ASSIGNEE_NOT_ELIGIBLE",
    );
    expectCode(
      () => store.assign("task-1", { accountId: "account-2", staffAssignmentId: "assignment-expired" }, "t1", workforce, { kind: "human", accountId: "account-1" }, NOW),
      "TASK_ASSIGNEE_NOT_ELIGIBLE",
    );
    expectCode(
      () => store.createTask(baseTask({ id: "task-bad-assignee", assigneeAccountId: "account-3", assigneeStaffAssignmentId: "assignment-branch-2" }), "t1", workforce),
      "TASK_ASSIGNEE_NOT_ELIGIBLE",
    );
    expectCode(
      () => store.createTask(baseTask({ id: "task-half-assignee", assigneeAccountId: "account-1" }), "t1", workforce),
      "TASK_ASSIGNEE_NOT_ELIGIBLE",
    );

    const assigned = store.assign(
      "task-1",
      { accountId: "account-1", staffAssignmentId: "assignment-1" },
      "t1",
      workforce,
      { kind: "human", accountId: "account-1" },
      NOW,
    );
    assert.equal(assigned.assigneeAccountId, "account-1");
    assert.equal(assigned.assigneeStaffAssignmentId, "assignment-1");
  });

  it("rejects cross-tenant composition and hides other tenants on read", () => {
    const store = new OpsTaskStore();
    store.createTask(baseTask(), "t1");
    expectCode(() => store.createTask(baseTask({ id: "task-t2", tenantId: "t2" }), "t1"), "TASK_CROSS_TENANT");
    expectCode(() => store.listComments("task-1", "t2"), "TASK_UNKNOWN_REFERENCE");
    expectCode(
      () => store.transition("task-1", "in_progress", { kind: "human", accountId: "account-1" }, "t2", { at: NOW }),
      "TASK_UNKNOWN_REFERENCE",
    );
    expectCode(
      () =>
        store.addComment(
          {
            id: "comment-t2",
            tenantId: "t2",
            taskId: "task-1",
            author: { kind: "human", accountId: "account-1" },
            body: "cross tenant",
            createdAt: NOW,
          },
          "t1",
        ),
      "TASK_CROSS_TENANT",
    );
    assert.equal(store.listTasks("t2").length, 0);
    assert.equal(store.listTasks("t1").length, 1);
  });

  it("keeps creation idempotent per tenant and rejects key reuse with different content", () => {
    const store = new OpsTaskStore();
    const first = store.createTask(baseTask({ idempotencyKey: "wa-msg-4471" }), "t1");
    const replay = store.createTask(baseTask({ idempotencyKey: "wa-msg-4471" }), "t1");
    assert.equal(replay.id, first.id);
    assert.equal(store.tasks.size, 1);
    assert.equal(store.listEvents("task-1", "t1").length, 1);

    expectCode(
      () => store.createTask(baseTask({ idempotencyKey: "wa-msg-4471", title: "different request" }), "t1"),
      "TASK_IDEMPOTENCY_CONFLICT",
    );
    expectCode(() => store.createTask(baseTask({ id: "task-1" }), "t1"), "TASK_DUPLICATE_ID");
  });

  it("replays an accepted request safely even after the assignment has expired", () => {
    const workforce = new WorkforceStore();
    workforce.addStaffAssignment(
      {
        id: "assignment-fixed-term",
        tenantId: "t1",
        accountId: "account-1",
        organizationId: "org-1",
        branchId: "branch-1",
        departmentId: null,
        teamId: null,
        practitionerRoleId: null,
        operationalRole: "receptionist",
        effectiveFrom: "2026-09-01",
        effectiveTo: "2026-12-31",
        provenance,
      },
      "t1",
    );
    const store = new OpsTaskStore();
    const request = baseTask({
      id: "task-retry",
      idempotencyKey: "wa-msg-retry",
      assigneeAccountId: "account-1",
      assigneeStaffAssignmentId: "assignment-fixed-term",
    });
    const first = store.createTask(request, "t1", workforce);
    assert.equal(first.id, "task-retry");

    // The client retries long after the fixed-term assignment ended. The retry
    // must return the original record instead of failing or creating new work.
    const replay = store.createTask({ ...request, createdAt: "2030-05-05T00:00:00Z" }, "t1", workforce);
    assert.equal(replay.id, "task-retry");
    assert.equal(store.tasks.size, 1);

    // A genuinely new request for the same expired assignment is still refused.
    expectCode(
      () =>
        store.createTask(
          { ...request, id: "task-late", idempotencyKey: "wa-msg-late", createdAt: "2030-05-05T00:00:00Z" },
          "t1",
          workforce,
        ),
      "TASK_ASSIGNEE_NOT_ELIGIBLE",
    );
  });

  it("rejects malformed kinds, priorities, subjects and origins", () => {
    const store = new OpsTaskStore();
    expectCode(
      () => store.createTask(baseTask({ kind: "clinical_note" as OpsTaskInput["kind"] }), "t1"),
      "TASK_INVALID_KIND",
    );
    expectCode(
      () => store.createTask(baseTask({ priority: "stat" as OpsTaskInput["priority"] }), "t1"),
      "TASK_INVALID_PRIORITY",
    );
    expectCode(() => store.createTask(baseTask({ subjectType: "result" }), "t1"), "TASK_MALFORMED_SUBJECT");
    expectCode(
      () => store.createTask(baseTask({ subjectType: "none", subjectRef: "result-9" }), "t1"),
      "TASK_MALFORMED_SUBJECT",
    );
    expectCode(
      () => store.createTask(baseTask({ subjectType: "unknown" as OpsTaskInput["subjectType"] }), "t1"),
      "TASK_MALFORMED_SUBJECT",
    );
    expectCode(() => store.createTask(baseTask({ title: "   " }), "t1"), "TASK_MALFORMED");
    expectCode(
      () => store.createTask(baseTask({ origin: { kind: "robot" as OpsTaskInput["origin"]["kind"], ref: "x" } }), "t1"),
      "TASK_INVALID_ORIGIN",
    );
  });

  it("keeps pointers opaque and never mutates the referenced domains", () => {
    const workforce = seededWorkforce();
    const before = workforce.staffAssignments.get("assignment-1");
    const store = new OpsTaskStore();
    store.createTask(
      baseTask({ subjectType: "prescription_request", subjectRef: "refill-request-not-in-this-store" }),
      "t1",
      workforce,
    );
    store.assign(
      "task-1",
      { accountId: "account-1", staffAssignmentId: "assignment-1" },
      "t1",
      workforce,
      { kind: "human", accountId: "account-1" },
      NOW,
    );
    store.transition("task-1", "in_progress", { kind: "human", accountId: "account-1" }, "t1", { at: NOW });
    store.addComment(
      {
        id: "comment-1",
        tenantId: "t1",
        taskId: "task-1",
        author: { kind: "human", accountId: "account-1" },
        body: "called the pharmacy",
        createdAt: NOW,
      },
      "t1",
    );
    assert.deepEqual(workforce.staffAssignments.get("assignment-1"), before);
    assert.equal(workforce.staffAssignments.size, 3);
    assert.equal(workforce.departments.size, 1);
    assert.equal(workforce.shifts.size, 0);
    assert.equal(workforce.leaveRequests.size, 0);
  });

  it("records an append-only lifecycle trail and tenant-scoped comments", () => {
    const store = new OpsTaskStore();
    store.createTask(baseTask(), "t1");
    store.assign(
      "task-1",
      { accountId: "account-1", staffAssignmentId: "assignment-1" },
      "t1",
      seededWorkforce(),
      { kind: "human", accountId: "account-1" },
      NOW,
    );
    store.transition("task-1", "in_progress", { kind: "human", accountId: "account-1" }, "t1", { at: NOW });
    store.addComment(
      {
        id: "comment-a",
        tenantId: "t1",
        taskId: "task-1",
        author: { kind: "human", accountId: "account-1" },
        body: "vendor contacted",
        createdAt: NOW,
      },
      "t1",
    );
    const events = store.listEvents("task-1", "t1");
    assert.deepEqual(
      events.map((event) => event.action),
      ["created", "assigned", "transitioned"],
    );
    assert.equal(events[0]?.fromStatus, null);
    assert.equal(events[0]?.toStatus, "open");
    assert.equal(events[2]?.fromStatus, "open");
    assert.equal(events[2]?.toStatus, "in_progress");
    assert.equal(new Set(events.map((event) => event.id)).size, events.length);
    assert.equal(store.listComments("task-1", "t1").length, 1);
    expectCode(
      () =>
        store.addComment(
          {
            id: "comment-a",
            tenantId: "t1",
            taskId: "task-1",
            author: { kind: "human", accountId: "account-1" },
            body: "duplicate id",
            createdAt: NOW,
          },
          "t1",
        ),
      "TASK_DUPLICATE_ID",
    );
  });

  it("migration keeps tasks tenant-isolated, append-only for trail tables and non-clinical", () => {
    const sql = readFileSync(new URL("../../db/migrations/040_ops_tasks.sql", import.meta.url), "utf8");
    for (const token of [
      "ops_tasks",
      "ops_task_comments",
      "ops_task_events",
      "ENABLE ROW LEVEL SECURITY",
      "FORCE ROW LEVEL SECURITY",
      "WITH CHECK",
      "FOR SELECT",
      "FOR INSERT",
      "FOR UPDATE",
      "idempotency_key",
      "origin_kind",
      "REFERENCES staff_assignments",
      "FOR UPDATE",
      "GRANT SELECT, INSERT ON ops_task_comments",
      "GRANT SELECT, INSERT ON ops_task_events",
    ]) {
      assert.ok(sql.includes(token), token);
    }
    assert.ok(!/GRANT[^;]*UPDATE[^;]*ops_task_(comments|events)/.test(sql), "trail tables must stay append-only");
    for (const table of ["appointments", "encounters", "prescriptions", "claims", "payments", "results"]) {
      assert.ok(!sql.includes(`REFERENCES ${table}`), table);
      assert.ok(!sql.includes(`ALTER TABLE ${table}`), table);
    }
    for (const forbidden of ["payroll", "biometric", "face_recognition", "geofence"]) {
      assert.ok(!sql.includes(forbidden), forbidden);
    }
  });

  // Route-level regression guard. This repository has no HTTP test harness for
  // the workforce surface yet, so the API contract is asserted at source level:
  // tenant identity must keep coming from verified claims, automation origin
  // must stay refused, and no route may read a tenant id from the request body.
  it("task routes keep tenant authority server-side and refuse unverified automation origin", () => {
    const api = readFileSync(new URL("../../apps/api/src/tasks.ts", import.meta.url), "utf8");
    for (const token of [
      'requireAssurance: "aal2"',
      "workforceMembershipsFor",
      "TASK_ORIGIN_NOT_AUTHORIZED",
      "requestTenant(req)",
      'kind: "human"',
    ]) {
      assert.ok(api.includes(token), token);
    }
    assert.ok(!/body\.tenantId/.test(api), "the task API must never read a tenant id from the body");
    assert.ok(!/authorize\(\s*\{[^}]*memberships:\s*\[\]/s.test(api), "task routes must use the membership registry");
  });
});
