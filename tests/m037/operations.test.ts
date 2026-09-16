// M037 synthetic qualification.
import assert from "node:assert";
import { describe, it } from "node:test";
import {
  OperationLog,
  executeOperation,
  guardCancel,
  reconcileUnknown,
} from "@zyara/adapter-ops";

const WRITER = { adapterId: "w", certified: new Set(["create", "cancel", "reschedule"] as const) };
const READER = { adapterId: "r", certified: new Set(["read"] as const) };

describe("M037 external operations", () => {
  it("refuses uncertified capabilities", async () => {
    const log = new OperationLog();
    const res = await executeOperation(
      log, READER, { id: "o1", tenantId: "t1", kind: "create", idempotencyKey: "k1" },
      () => ({ outcome: "CONFIRMED", externalId: "ext-1", error: null }),
    );
    assert.equal("error" in res, true);
  });
  it("replays idempotent keys without re-issuing the write", async () => {
    const log = new OperationLog();
    let calls = 0;
    const input = { id: "o1", tenantId: "t1", kind: "create" as const, idempotencyKey: "k1" };
    const first = await executeOperation(log, WRITER, input, () => {
      calls += 1;
      return { outcome: "CONFIRMED" as const, externalId: "ext-1", error: null };
    });
    const second = await executeOperation(log, WRITER, { ...input, id: "o2" }, () => {
      calls += 1;
      return { outcome: "CONFIRMED" as const, externalId: "ext-2", error: null };
    });
    assert.equal(calls, 1);
    assert.deepEqual(first, second);
  });
  it("records UNKNOWN and reconciles without blind retry", async () => {
    const log = new OperationLog();
    const done = await executeOperation(
      log, WRITER, { id: "o1", tenantId: "t1", kind: "create", idempotencyKey: "k1" },
      () => ({ outcome: "UNKNOWN", externalId: null, error: "timeout-after-write" }),
    );
    assert.equal("error" in done, false);
    if (!("error" in done)) {
      assert.equal(done.state, "UNKNOWN");
      const rec = reconcileUnknown(log, "o1", { exists: true, externalId: "ext-9" }, 2);
      assert.equal("error" in rec, false);
      if (!("error" in rec)) {
        assert.equal(rec.state, "CONFIRMED");
        assert.equal(rec.externalId, "ext-9");
      }
      const twice = reconcileUnknown(log, "o1", { exists: true, externalId: "ext-9" }, 3);
      assert.equal("error" in twice, true);
    }
  });
  it("cancel verifies confirmed state first", () => {
    assert.equal(guardCancel("CONFIRMED").ok, true);
    assert.equal(guardCancel("UNKNOWN").ok, false);
    assert.equal(guardCancel("FAILED").ok, false);
  });
});
