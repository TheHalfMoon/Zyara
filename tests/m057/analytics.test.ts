// M057 synthetic qualification.
import assert from "node:assert";
import { describe, it } from "node:test";
import {
  RateLimiter,
  analyticsAllowed,
  releaseAggregates,
  tokenAllowed,
} from "@zyara/partner-analytics";

describe("M057 governed analytics", () => {
  it("suppresses small cells and any free text", () => {
    const out = releaseAggregates([
      { key: "a", count: 12, freeText: null },
      { key: "b", count: 3, freeText: null },
      { key: "c", count: 50, freeText: "patient note" },
    ]);
    assert.deepEqual(out, [
      { key: "a", count: 12, suppressed: false },
      { key: "b", count: null, suppressed: true },
      { key: "c", count: null, suppressed: true },
    ]);
  });
  it("scopes partner tokens by purpose", () => {
    const token = { tokenId: "t", purposes: ["operations"], rateLimitPerMin: 60 };
    assert.equal(tokenAllowed(token, "operations"), true);
    assert.equal(tokenAllowed(token, "marketing"), false);
  });
  it("rate-limits per token per minute", () => {
    const limiter = new RateLimiter();
    assert.equal(limiter.allow("t", 2, 0), true);
    assert.equal(limiter.allow("t", 2, 1000), true);
    assert.equal(limiter.allow("t", 2, 2000), false);
    assert.equal(limiter.allow("t", 2, 61_000), true);
  });
  it("requires analytics consent", () => {
    assert.equal(analyticsAllowed([], "2026-09-20T00:00:00.000Z"), false);
    assert.equal(analyticsAllowed([
      { patientId: "p", purpose: "analytics", granted: true, atUtc: "2026-01-01T00:00:00.000Z", revokedAtUtc: null },
    ], "2026-09-20T00:00:00.000Z"), true);
  });
});
