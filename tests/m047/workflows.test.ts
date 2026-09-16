// M047 synthetic qualification.
import assert from "node:assert";
import { describe, it } from "node:test";
import {
  delegateNursingTask,
  displayResult,
  recordResult,
  transitionOrder,
  type ServiceOrder,
} from "@zyara/clinical-workflows";

function order(over = {}): ServiceOrder {
  return {
    id: "o1", tenantId: "t1", patientId: "p1", kind: "laboratory",
    referralId: "ref-1", state: "ordered", result: "pending",
    resultPayload: null, ...over,
  };
}

describe("M047 clinical workflows", () => {
  it("enforces the order lifecycle", () => {
    const o = order();
    assert.equal("error" in transitionOrder(o, "resulted"), true);
    const s = transitionOrder(o, "scheduled");
    assert.equal("error" in s, false);
    if (!("error" in s)) {
      const c = transitionOrder(s, "collected");
      assert.equal("error" in c, false);
    }
  });
  it("distinguishes preliminary from final results", () => {
    const collected = { ...order(), state: "collected" as const };
    const prelim = recordResult(collected, "preliminary", "payload-1");
    assert.equal("error" in prelim, false);
    if (!("error" in prelim)) {
      assert.equal(displayResult(prelim).final, false);
      assert.ok(displayResult(prelim).label.includes("Preliminary"));
      const fin = { ...prelim, result: "final" as const };
      assert.equal(displayResult(fin).final, true);
    }
    assert.equal("error" in recordResult(order(), "final", "x"), true);
    assert.equal("error" in recordResult(collected, "final", null), true);
  });
  it("guards nursing delegation to licensed roles", () => {
    assert.equal("error" in delegateNursingTask(
      { id: "n1", licensedOnly: true, assigneeRole: "registered-nurse" }, "assistant"), true);
    const ok = delegateNursingTask(
      { id: "n2", licensedOnly: false, assigneeRole: "registered-nurse" }, "assistant");
    assert.equal("error" in ok, false);
  });
  it("retains referral linkage", () => {
    assert.equal(order().referralId, "ref-1");
    assert.equal(order({ referralId: null }).referralId, null);
  });
});
