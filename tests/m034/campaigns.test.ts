// M034 synthetic qualification.
import assert from "node:assert";
import { describe, it } from "node:test";
import {
  applyStopCondition,
  enqueueCampaign,
  type CampaignRun,
  type CampaignTarget,
} from "@zyara/recall-campaigns";
import { createPlan } from "@zyara/recall-plans";

const QUIET = { startLocal: "21:00", endLocal: "08:00" };

function plan(id: string, state: "active" | "cancelled" = "active") {
  const p = createPlan({
    id, tenantId: "t1", patientId: "p-" + id,
    issuerId: "clin-1", issuerRole: "clinician", source: "visit-1",
    template: "follow-up", serviceId: "svc",
    windowStartUtc: "2026-10-01T00:00:00.000Z",
    windowEndUtc: "2026-10-31T00:00:00.000Z",
  });
  assert.equal("error" in p, false);
  if ("error" in p) throw new Error("fixture");
  return state === "active" ? p : { ...p, state } as typeof p;
}

function target(id: string, over: Partial<CampaignTarget> = {}): CampaignTarget {
  return {
    plan: plan(id), patientId: "p-" + id, timeZone: "Asia/Riyadh",
    consentedChannel: "sms", declined: false, ...over,
  };
}

const RUN: CampaignRun = {
  id: "camp-1", tenantId: "t1", template: "follow-up",
  stopConditions: ["safety-pause"], stopped: false, stopReason: null,
};

describe("M034 campaigns", () => {
  it("enqueues eligible targets with quiet-hour deferral", () => {
    const { tasks, skipped } = enqueueCampaign(
      RUN, [target("a")], "2026-09-20T19:30:00.000Z", QUIET, new Set(),
    );
    assert.equal(tasks.length, 1);
    assert.equal(skipped.length, 0);
    assert.ok(tasks[0].firstContactAtUtc > "2026-09-20T19:30:00.000Z");
    assert.equal(tasks[0].idempotencyKey, "camp-1:a:sms");
  });
  it("suppresses terminal plans, declines, missing consent, duplicates", () => {
    const { tasks, skipped } = enqueueCampaign(
      RUN,
      [
        target("t", { plan: plan("t", "cancelled") }),
        target("d", { declined: true }),
        target("n", { consentedChannel: null }),
      ],
      "2026-09-20T07:00:00.000Z",
      QUIET,
      new Set(),
    );
    assert.equal(tasks.length, 0);
    assert.deepEqual(
      skipped.map((s) => s.reason).sort(),
      ["no-consented-channel", "patient-declined", "plan-cancelled"],
    );
    const again = enqueueCampaign(
      RUN, [target("a")], "2026-09-20T07:00:00.000Z", QUIET,
      new Set(["camp-1:a:sms"]),
    );
    assert.equal(again.tasks.length, 0);
    assert.equal(again.skipped[0].reason, "duplicate-suppressed");
  });
  it("stop conditions halt outreach", () => {
    const stopped = applyStopCondition(RUN, "safety-pause", "incident-7");
    assert.equal(stopped.stopped, true);
    const { tasks } = enqueueCampaign(
      stopped, [target("a")], "2026-09-20T07:00:00.000Z", QUIET, new Set(),
    );
    assert.equal(tasks.length, 0);
    const unknown = applyStopCondition(RUN, "nope", "x");
    assert.equal(unknown.stopped, false);
  });
});
