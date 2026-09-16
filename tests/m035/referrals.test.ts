// M035 synthetic qualification.
import assert from "node:assert";
import { describe, it } from "node:test";
import {
  createReferral,
  isDuplicateReferral,
  orderQueue,
  sweepExpired,
  transitionReferral,
} from "@zyara/referrals";

function ref(id: string, over = {}) {
  const r = createReferral({
    id, tenantId: "t1", patientId: "p1", sourceId: "clin-1",
    sourceRole: "clinician", serviceId: "svc-cardio", orderId: "ord-" + id,
    urgency: "routine", expiresAtUtc: "2026-11-01T00:00:00.000Z",
    createdAtUtc: "2026-09-01T00:00:00.000Z", ...over,
  });
  assert.equal("error" in r, false);
  if ("error" in r) throw new Error("fixture");
  return r;
}

describe("M035 referrals", () => {
  it("rejects unauthorized sources and bad expiry", () => {
    assert.equal("error" in createReferral({
      id: "x", tenantId: "t1", patientId: "p1", sourceId: "s",
      sourceRole: "receptionist", serviceId: "svc", orderId: "o",
      urgency: "routine", expiresAtUtc: "2026-11-01T00:00:00.000Z",
      createdAtUtc: "2026-09-01T00:00:00.000Z",
    }), true);
  });
  it("expired referrals never schedule; sweep expires them with audit", () => {
    const r = ref("a");
    const late = transitionReferral(r, "scheduled", "op-1", "booked", "2026-12-01T00:00:00.000Z");
    assert.equal("error" in late, true);
    const swept = sweepExpired([r], "2026-12-01T00:00:00.000Z");
    assert.equal(swept[0].state, "expired");
    assert.equal(swept[0].transitions.length, 1);
    const ok = transitionReferral(r, "scheduled", "op-1", "booked appt-9", "2026-09-02T00:00:00.000Z");
    assert.equal("error" in ok, false);
  });
  it("suppresses duplicates and orders deterministically", () => {
    const a = ref("a", { urgency: "routine", createdAtUtc: "2026-09-01T00:00:00.000Z" });
    assert.equal(isDuplicateReferral(
      { tenantId: "t1", patientId: "p1", serviceId: "svc-cardio", orderId: "ord-a" }, [a]), true);
    assert.equal(isDuplicateReferral(
      { tenantId: "t1", patientId: "p1", serviceId: "svc-cardio", orderId: "ord-z" }, [a]), false);
    const urgent = ref("u", { urgency: "urgent", createdAtUtc: "2026-09-05T00:00:00.000Z" });
    const soon = ref("s", { urgency: "soon", createdAtUtc: "2026-09-02T00:00:00.000Z" });
    assert.deepEqual(orderQueue([a, soon, urgent]).map((r) => r.id), ["u", "s", "a"]);
  });
  it("terminal referrals are immutable and transitions need reasons", () => {
    const r = ref("a");
    assert.equal("error" in transitionReferral(r, "declined", "op", " ", "2026-09-02T00:00:00.000Z"), true);
    const done = transitionReferral(r, "cancelled", "op", "duplicate order", "2026-09-02T00:00:00.000Z");
    assert.equal("error" in done, false);
    if (!("error" in done)) {
      assert.equal("error" in transitionReferral(done, "scheduled", "op", "x", "2026-09-03T00:00:00.000Z"), true);
    }
  });
});
