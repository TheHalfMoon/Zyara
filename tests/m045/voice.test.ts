// M045 synthetic qualification.
import assert from "node:assert";
import { describe, it } from "node:test";
import {
  applyCorrections,
  confirmField,
  readyForConfirmation,
  structureTranscript,
} from "@zyara/voice-booking";

describe("M045 voice booking", () => {
  it("structures transcripts with ambiguity marked, never as truth", () => {
    const cand = structureTranscript("book dental monday", {
      service: "dental",
      date: "monday",
      slot: "morning",
    });
    assert.equal(cand.fields["service"], "dental");
    assert.deepEqual(cand.ambiguous, ["slot"]);
    assert.ok(cand.critical.includes("date"));
  });
  it("requires correction plus per-field critical confirmation", () => {
    const cand = structureTranscript("book dental monday", {
      service: "dental",
      date: "monday",
    });
    const draft = applyCorrections(cand, {});
    assert.equal(readyForConfirmation(cand, draft).ready, false);
    const wrong = confirmField(draft, "date", "tuesday");
    assert.equal("error" in wrong, true);
    const right = confirmField(draft, "date", "monday");
    assert.equal("error" in right, false);
    if (!("error" in right)) {
      assert.equal(readyForConfirmation(cand, right).ready, true);
    }
  });
  it("ambiguous speech fails safe until corrected", () => {
    const cand = structureTranscript("umm book something", {
      service: "dental",
      date: "monday",
    });
    const draft = applyCorrections(cand, {});
    const check = readyForConfirmation(cand, draft);
    assert.equal(check.ready, false);
    assert.ok(check.reason.includes("Ambiguous") || check.reason.includes("Unconfirmed"));
    const fixed = applyCorrections(cand, { service: "dental", date: "monday" });
    const c1 = confirmField(fixed, "date", "monday");
    assert.equal("error" in c1, false);
    if (!("error" in c1)) assert.equal(readyForConfirmation(cand, c1).ready, true);
  });
});
