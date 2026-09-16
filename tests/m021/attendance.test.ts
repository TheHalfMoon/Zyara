import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  recordEvidence, currentEvidenceFor, deriveEligibility, reviewDispute,
  eligibilityText, noShowText, ATTENDANCE_LOCALES,
  type AttendanceEvidence,
} from "@zyara/trust-attendance";

function ev(over: Partial<AttendanceEvidence> = {}): Omit<AttendanceEvidence, "superseded"> {
  return {
    id: "e1", tenantId: "t1", appointmentId: "a1", patientId: "pt1",
    outcome: "completed", source: "provider_checkin", actorRole: "provider",
    actorId: "p1", confidence: 0.9, recordedAtUtc: "2026-09-20T09:00:00.000Z",
    provenance: null, ...over,
  };
}

describe("M021 attendance evidence and eligibility", () => {
  it("completed evidence grants one-visit eligibility; reminder never grants it", () => {
    const all = recordEvidence([], ev(), "e1");
    const cur = currentEvidenceFor(all, "a1");
    const granted = new Set<string>();
    const d1 = deriveEligibility(cur, granted, true);
    assert.equal(d1.eligible, true);
    granted.add("a1");
    const d2 = deriveEligibility(cur, granted, true);
    assert.deepEqual([d2.eligible, d2.code], [false, "DUPLICATE_VISIT"]);
  });
  it("no-show and unknown never grant eligibility", () => {
    const ns = recordEvidence([], ev({ outcome: "no_show" }), "e2");
    assert.equal(deriveEligibility(currentEvidenceFor(ns, "a1"), new Set(), false).code, "NO_SHOW_INELIGIBLE");
    const un = recordEvidence([], ev({ outcome: "unknown" }), "e3");
    assert.equal(deriveEligibility(currentEvidenceFor(un, "a1"), new Set(), true).eligible, false);
    assert.equal(deriveEligibility(null, new Set(), true).eligible, false);
  });
  it("correction supersedes and re-evaluates eligibility", () => {
    let all = recordEvidence([], ev({ outcome: "no_show" }), "e1");
    assert.equal(deriveEligibility(currentEvidenceFor(all, "a1"), new Set(), false).eligible, false);
    all = recordEvidence(all, ev({ id: "e2", outcome: "completed", source: "reviewer_correction", actorRole: "trust_reviewer" }), "e2");
    const cur = currentEvidenceFor(all, "a1");
    assert.equal(cur?.id, "e2");
    assert.equal(deriveEligibility(cur, new Set(), false).eligible, true);
    assert.equal(all.find((e) => e.id === "e1")?.superseded, true);
  });
  it("patient can appeal provider no-show via independent reviewer", () => {
    const dispute = reviewDispute(
      { id: "d1", appointmentId: "a1", patientId: "pt1", raisedBy: "patient", reason: "I attended", reviewer: "trust_reviewer", outcome: null },
      "trust_reviewer", "corrected",
    );
    assert.equal(dispute.outcome, "corrected");
    assert.throws(
      () => reviewDispute(
        { id: "d2", appointmentId: "a1", patientId: "pt1", raisedBy: "patient", reason: "x", reviewer: "provider", outcome: null },
        "provider", "rejected",
      ),
      /SEPARATION/,
    );
  });
  it("cross-patient evidence injection is rejected", () => {
    const all = recordEvidence([], ev(), "e1");
    assert.throws(
      () => recordEvidence(all, ev({ id: "e9", patientId: "pt-other" }), "e9"),
      /PATIENT_MISMATCH/,
    );
  });
  it("imported attendance requires provenance", () => {
    assert.throws(
      () => recordEvidence([], ev({ source: "imported", provenance: null }), "e9"),
      /PROVENANCE/,
    );
    const all = recordEvidence([], ev({ source: "imported", provenance: "his:enc-42" }), "e9");
    assert.equal(currentEvidenceFor(all, "a1")?.provenance, "his:enc-42");
  });
  it("five locales with non-accusatory wording", () => {
    assert.equal(ATTENDANCE_LOCALES.length, 5);
    for (const locale of ATTENDANCE_LOCALES) {
      assert.ok(eligibilityText(true, locale).length > 5);
      assert.ok(noShowText(locale).length > 5);
    }
    assert.ok(!noShowText("en").toLowerCase().includes("fault"));
  });
});
