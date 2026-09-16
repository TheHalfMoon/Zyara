// M041 synthetic qualification.
import assert from "node:assert";
import { describe, it } from "node:test";
import { auditDecision, decideIntent, mentionsSymptoms } from "@zyara/navigation-safety";

describe("M041 navigation safety", () => {
  it("allows typed intents with sufficient confidence", () => {
    assert.equal(decideIntent("navigate", "find a dentist nearby", 0.9).allowed, true);
    assert.equal(decideIntent("explain", "what does referral mean", 0.8).allowed, true);
    const hand = decideIntent("handoff", "talk to staff", 1);
    assert.equal(hand.allowed, true);
    assert.equal(hand.escalate, true);
  });
  it("refuses every prohibited intent class", () => {
    for (const intent of ["diagnose", "prescribe", "coverage-guarantee", "eligibility-fabrication", "authority-fabrication", "autonomous-clinical-action"] as const) {
      const d = decideIntent(intent, "please help", 0.99);
      assert.equal(d.allowed, false);
      assert.equal(d.escalate, true);
    }
  });
  it("escalates low confidence and symptom-style input", () => {
    const low = decideIntent("navigate", "find care", 0.3);
    assert.equal(low.allowed, false);
    assert.equal(low.escalate, true);
    assert.equal(mentionsSymptoms("I have chest pain"), true);
    assert.equal(mentionsSymptoms("لدي ألم صدر"), true);
    const sym = decideIntent("navigate", "I have chest pain, where next", 0.95);
    assert.equal(sym.allowed, false);
    assert.equal(sym.escalate, true);
  });
  it("audit-logs every decision", () => {
    const d = decideIntent("diagnose", "what is this", 0.9);
    const entry = auditDecision(d, 0.9, "2026-09-20T00:00:00.000Z");
    assert.equal(entry.allowed, false);
    assert.equal(entry.escalated, true);
    assert.equal(entry.intent, "diagnose");
  });
});
