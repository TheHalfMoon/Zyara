// M033 synthetic qualification.
import assert from "node:assert";
import { describe, it } from "node:test";
import {
  cancelPlan,
  completeClinically,
  createPlan,
  declinePlan,
  isDuplicatePlan,
  recordBooking,
  shouldReopenAfterMiss,
  supersedePlan,
  suppressesWork,
  type CreatePlanInput,
} from "@zyara/recall-plans";

function base(): CreatePlanInput {
  return {
    id: "plan-1", tenantId: "t1", patientId: "p1",
    issuerId: "clin-1", issuerRole: "clinician", source: "visit-note-7",
    template: "follow-up", serviceId: "svc-gen",
    windowStartUtc: "2026-10-01T00:00:00.000Z",
    windowEndUtc: "2026-10-31T00:00:00.000Z",
  };
}

describe("M033 recall plans", () => {
  it("rejects unauthorized issuers and bad windows", () => {
    const bad = createPlan({ ...base(), issuerRole: "receptionist" });
    assert.equal("error" in bad, true);
    const win = createPlan({
      ...base(), windowStartUtc: "2026-10-31T00:00:00.000Z", windowEndUtc: "2026-10-01T00:00:00.000Z",
    });
    assert.equal("error" in win, true);
    const ok = createPlan(base());
    assert.equal("error" in ok, false);
  });
  it("booking does not close clinical completion", () => {
    const plan = createPlan(base());
    assert.equal("error" in plan, false);
    if (!("error" in plan)) {
      const booked = recordBooking(plan, "appt-1");
      assert.equal("error" in booked, false);
      if (!("error" in booked)) {
        assert.equal(booked.bookedAppointmentId, "appt-1");
        assert.equal(booked.clinicallyCompleted, false);
        assert.equal(booked.state, "active");
        const done = completeClinically(booked, "clinician");
        assert.equal("error" in done, false);
      }
      const lay = completeClinically(plan, "receptionist");
      assert.equal("error" in lay, true);
    }
  });
  it("supersede versions and suppresses obsolete work", () => {
    const plan = createPlan(base());
    const next = createPlan({ ...base(), id: "plan-2" });
    assert.equal("error" in plan, false);
    assert.equal("error" in next, false);
    if (!("error" in plan) && !("error" in next)) {
      const { current, replacement } = supersedePlan(plan, next);
      assert.equal(current.state, "superseded");
      assert.equal(replacement.version, 2);
      assert.equal(replacement.supersedesId, "plan-1");
      assert.equal(suppressesWork(current), true);
      assert.equal(suppressesWork(cancelPlan(plan)), true);
      assert.equal(suppressesWork(plan), false);
    }
  });
  it("missed visit reopens only inside window and active state", () => {
    const plan = createPlan(base());
    assert.equal("error" in plan, false);
    if (!("error" in plan)) {
      assert.equal(shouldReopenAfterMiss(plan, "2026-10-15T00:00:00.000Z"), true);
      assert.equal(shouldReopenAfterMiss(plan, "2026-11-15T00:00:00.000Z"), false);
      assert.equal(shouldReopenAfterMiss(cancelPlan(plan), "2026-10-15T00:00:00.000Z"), false);
      assert.equal(declinePlan(plan, "patient declined").state, "declined");
    }
  });
  it("detects duplicate active plans", () => {
    const plan = createPlan(base());
    assert.equal("error" in plan, false);
    if (!("error" in plan)) {
      assert.equal(isDuplicatePlan(base(), [plan]), true);
      assert.equal(isDuplicatePlan({ ...base(), serviceId: "other" }, [plan]), false);
    }
  });
});
