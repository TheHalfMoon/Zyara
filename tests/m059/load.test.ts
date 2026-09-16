// M059 synthetic qualification.
import assert from "node:assert";
import { describe, it } from "node:test";
import { measureSortLoad, percentile, summarizeLoad } from "@zyara/scale-qual";

describe("M059 scale qualification", () => {
  it("computes percentiles honestly", () => {
    assert.equal(percentile([], 95), 0);
    assert.equal(percentile([10, 20, 30, 40], 50), 20);
    assert.equal(percentile([10, 20, 30, 40], 95), 40);
  });
  it("measures sort load and names the bottleneck", () => {
    const samples = [measureSortLoad(200), measureSortLoad(200)];
    const report = summarizeLoad(
      [...samples, { op: "offer-accept", durationMs: 3 }],
      "synthetic-local-N200",
    );
    assert.equal(report.operations, 3);
    assert.equal(report.scope, "synthetic-local-N200");
    assert.ok(["waitlist-sort", "offer-accept"].includes(report.bottleneckOp));
    assert.ok(report.p95Ms >= report.p50Ms);
  });
  it("scopes claims to measured work only", () => {
    const report = summarizeLoad([], "synthetic-local-N0");
    assert.equal(report.operations, 0);
    assert.equal(report.bottleneckOp, "none");
  });
});
