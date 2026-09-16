// M040 synthetic qualification.
import assert from "node:assert";
import { describe, it } from "node:test";
import { OperationLog, executeOperation } from "@zyara/adapter-ops";
import {
  decideRolloutStage,
  rekeyExternalId,
  sweepUnknown,
} from "@zyara/integration-ops";

const FULL = {
  adapterId: "w",
  certified: new Set(["create", "cancel", "conflict-enforcement"] as const),
};
const PARTIAL = {
  adapterId: "p",
  certified: new Set(["read"] as const),
};

describe("M040 rollout and reconciliation", () => {
  it("gates stages: synthetic, certified, production-blocked", () => {
    const gated = decideRolloutStage(PARTIAL, ["create"], false);
    assert.equal(gated.stage, "synthetic");
    const blocked = decideRolloutStage(FULL, ["create"], false);
    assert.equal(blocked.stage, "production-blocked");
    assert.ok(blocked.reason.includes("M028-M030"));
    const ready = decideRolloutStage(FULL, ["create"], true);
    assert.equal(ready.stage, "certified");
  });
  it("sweeps UNKNOWN ops and leaves truth-less ops UNKNOWN", async () => {
    const log = new OperationLog();
    for (const [id, key] of [["o1", "k1"], ["o2", "k2"]] as const) {
      await executeOperation(
        log, FULL, { id, tenantId: "t1", kind: "create", idempotencyKey: key },
        () => ({ outcome: "UNKNOWN" as const, externalId: null, error: "timeout" }),
      );
    }
    const o1 = log.get("o1");
    const o2 = log.get("o2");
    assert.ok(o1 && o2);
    const res = sweepUnknown(log, [o1!, o2!], [
      { opId: "o1", exists: true, externalId: "ext-1" },
    ], 2);
    assert.deepEqual(res.reconciled, ["o1"]);
    assert.equal(res.errors.length, 1);
    assert.equal(log.get("o1")?.state, "CONFIRMED");
    assert.equal(log.get("o2")?.state, "UNKNOWN");
  });
  it("re-keys external ids only on exact match", async () => {
    const log = new OperationLog();
    await executeOperation(
      log, FULL, { id: "o1", tenantId: "t1", kind: "create", idempotencyKey: "k1" },
      () => ({ outcome: "CONFIRMED" as const, externalId: "ext-old", error: null }),
    );
    const bad = rekeyExternalId(log, "o1", "ext-wrong", "ext-new");
    assert.equal("error" in bad, true);
    const ok = rekeyExternalId(log, "o1", "ext-old", "ext-new");
    assert.equal("error" in ok, false);
    assert.equal(log.get("o1")?.externalId, "ext-new");
  });
});
