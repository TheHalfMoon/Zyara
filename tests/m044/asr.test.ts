// M044 synthetic qualification.
import assert from "node:assert";
import { describe, it } from "node:test";
import {
  EVAL_LOCALES,
  gradeEngine,
  scoreEngine,
  wordErrorRate,
  type FixtureUtterance,
} from "@zyara/voice-eval";

const FIXTURES: FixtureUtterance[] = [
  { id: "u1", locale: "ar", referenceText: "أريد موعد أسنان صباحا", critical: false },
  { id: "u2", locale: "ar-EG", referenceText: "عايز احجز يوم الاتنين", critical: true },
  { id: "u3", locale: "en", referenceText: "book dental monday morning", critical: false },
  { id: "u4", locale: "ur", referenceText: "دانتوں کا اپائنٹمنٹ چاہیے", critical: false },
  { id: "u5", locale: "tl", referenceText: "gusto kong magpabook ng dental", critical: false },
];

describe("M044 ASR evaluation", () => {
  it("covers five locales with Arabic RTL first", () => {
    assert.deepEqual([...EVAL_LOCALES], ["ar", "ar-EG", "en", "ur", "tl"]);
    assert.deepEqual([...new Set(FIXTURES.map((f) => f.locale))].sort(), ["ar", "ar-EG", "en", "tl", "ur"]);
  });
  it("scores word-error rate correctly", () => {
    assert.equal(wordErrorRate("a b c", "a b c"), 0);
    assert.equal(wordErrorRate("a b c", "a x c"), 1 / 3);
    assert.equal(wordErrorRate("", ""), 0);
    assert.equal(wordErrorRate("أريد موعد", "أريد موعد"), 0);
  });
  it("gates engines on accuracy plus privacy evidence", () => {
    const scored = scoreEngine(
      FIXTURES,
      FIXTURES.map((f) => ({ engineId: "e1", utteranceId: f.id, hypothesisText: f.referenceText })),
      { engineId: "e1", privacy: "on-device", dataFlowRef: null, werThreshold: 0.25 },
    );
    assert.equal(scored.gate.pass, true);
    assert.deepEqual(scored.criticalFlagged, ["u2"]);
    const ungraded = gradeEngine(
      { engineId: "e2", privacy: "ungraded", dataFlowRef: null, werThreshold: 0.25 }, [0.1],
    );
    assert.equal(ungraded.pass, false);
    const noFlow = gradeEngine(
      { engineId: "e3", privacy: "approved-cloud-with-flow", dataFlowRef: null, werThreshold: 0.25 }, [0.1],
    );
    assert.equal(noFlow.pass, false);
    const badWer = gradeEngine(
      { engineId: "e4", privacy: "on-device", dataFlowRef: null, werThreshold: 0.25 }, [0.9],
    );
    assert.equal(badWer.pass, false);
  });
});
