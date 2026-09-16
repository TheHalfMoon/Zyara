// M036 synthetic qualification.
import assert from "node:assert";
import { describe, it } from "node:test";
import {
  bookingWriteAuthorized,
  capabilityMatrix,
  certifyAdapter,
  requireCapability,
} from "@zyara/adapter-harness";

describe("M036 adapter harness", () => {
  it("certifies only capabilities that pass synthetic contracts", async () => {
    const { certified, results } = await certifyAdapter(
      { adapterId: "fake-ehr", vendor: "synthetic", claimed: ["read", "create", "atomic-hold"] },
      async (_id, cap) => cap !== "atomic-hold",
    );
    assert.deepEqual(certified, ["read", "create"]);
    assert.equal(results.find((r) => r.capability === "atomic-hold")?.passed, false);
  });
  it("refuses uncertified capabilities at call time", () => {
    const adapter = { adapterId: "a", certified: new Set(["read"] as const) };
    assert.equal(requireCapability(adapter, "read").ok, true);
    const refused = requireCapability(adapter, "create");
    assert.equal(refused.ok, false);
  });
  it("FHIR read never implies booking-write authority", () => {
    const reader = { adapterId: "r", certified: new Set(["read", "availability"] as const) };
    assert.equal(bookingWriteAuthorized(reader), false);
    const writer = { adapterId: "w", certified: new Set(["create", "conflict-enforcement"] as const) };
    assert.equal(bookingWriteAuthorized(writer), true);
    const half = { adapterId: "h", certified: new Set(["create"] as const) };
    assert.equal(bookingWriteAuthorized(half), false);
  });
  it("reports an explicit per-adapter capability matrix", () => {
    const matrix = capabilityMatrix([
      { adapterId: "a", certified: new Set(["read"] as const) },
      { adapterId: "b", certified: new Set(["read", "cancel"] as const) },
    ]);
    assert.deepEqual(matrix, { a: ["read"], b: ["read", "cancel"] });
  });
});
