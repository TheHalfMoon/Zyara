// M060 synthetic qualification.
import assert from "node:assert";
import { describe, it } from "node:test";
import { currentProgramState, decideExpansion } from "@zyara/expansion-decision";

describe("M060 expansion decision", () => {
  it("vetoes go on any pending real-evidence gate", () => {
    const out = decideExpansion({
      safety: "pending", measuredAccess: "pending",
      economics: "pending", riskReview: "pending",
      unresolvedRisks: ["pilot-unrun"],
    });
    assert.equal(out.decision, "iterate");
    assert.ok(out.reasons.length > 0);
  });
  it("stops on failed gates", () => {
    const out = decideExpansion({
      safety: "failed", measuredAccess: "pending",
      economics: "pending", riskReview: "pending",
      unresolvedRisks: [],
    });
    assert.equal(out.decision, "stop");
  });
  it("goes only on all-satisfied with no unresolved risks", () => {
    const out = decideExpansion({
      safety: "satisfied", measuredAccess: "satisfied",
      economics: "satisfied", riskReview: "satisfied",
      unresolvedRisks: [],
    });
    assert.equal(out.decision, "go");
  });
  it("reports the honest program state", () => {
    const state = currentProgramState();
    assert.equal(state["PRODUCT_IMPLEMENTATION_COMPLETE"], true);
    assert.equal(state["ZYARA_PROJECT_COMPLETE"], false);
    assert.equal(state["REAL_EXPANSION_READY"], false);
  });
});
