import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  auditRankInputs, governedAggregate, openFraudCase, decideFraudCase,
  appealFraudCase, rankExplanationLabel, GOVERNANCE_LOCALES, RANK_POLICY_VERSION,
} from "@zyara/trust-governance";

describe("M023 fraud review and ranking governance", () => {
  it("paid tier is absent from the score dependency graph", () => {
    assert.deepEqual(auditRankInputs(["alias_match", "review_confidence"]), { ok: true, code: "RANK_INPUTS_APPROVED" });
    const denied = auditRankInputs(["alias_match", "paid_tier"]);
    assert.equal(denied.ok, false);
    assert.match(denied.code, /paid_tier/);
  });
  it("small samples display uncertainty and count, not confident means", () => {
    const small = governedAggregate({ count: 1, mean: 5.0, oldestDays: 10 });
    assert.deepEqual([small.displayMean, small.uncertainty, small.count], [null, "high", 1]);
    const solid = governedAggregate({ count: 20, mean: 4.6, oldestDays: 10 });
    assert.ok(solid.displayMean !== null && solid.displayMean < 4.6);
    assert.equal(solid.policy, RANK_POLICY_VERSION);
  });
  it("fraud flag routes to review without erasing or denying access", () => {
    const c = openFraudCase("f1", "p1", ["burst_velocity"], "moderator");
    assert.equal(c.state, "flagged");
    assert.throws(() => openFraudCase("f2", "p1", ["burst_velocity"], "sales"), /SEPARATION/);
    assert.throws(() => openFraudCase("f3", "p1", ["burst_velocity"], "provider"), /SEPARATION/);
  });
  it("moderator decides; independent appeal reverses; sales cannot appeal", () => {
    const c = decideFraudCase(openFraudCase("f1", "p1", ["duplicate_text"], "moderator"), "moderator", "confirm");
    assert.equal(c.state, "confirmed");
    assert.throws(() => appealFraudCase(c, "sales"), /SEPARATION/);
    const appealed = appealFraudCase(c, "moderator");
    assert.equal(appealed.state, "under_review");
    assert.throws(() => decideFraudCase(c, "sales", "clear"), /SEPARATION/);
  });
  it("locale fairness labels across five locales", () => {
    assert.equal(GOVERNANCE_LOCALES.length, 5);
    for (const locale of GOVERNANCE_LOCALES) {
      assert.ok(rankExplanationLabel("review_confidence", locale).length > 3);
    }
  });
});
