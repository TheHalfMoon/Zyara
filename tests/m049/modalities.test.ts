// M049 synthetic qualification.
import assert from "node:assert";
import { describe, it } from "node:test";
import {
  bookWithModality,
  changeModality,
  reviewHomeVisit,
} from "@zyara/care-modalities";

describe("M049 care modalities", () => {
  it("guards modality eligibility", () => {
    const res = bookWithModality({
      appointmentId: "a1", modality: "telehealth",
      eligibleModalities: ["in-person"],
    });
    assert.equal("error" in res, true);
  });
  it("requires telehealth link plus consent", () => {
    assert.equal("error" in bookWithModality({
      appointmentId: "a1", modality: "telehealth",
      eligibleModalities: ["telehealth"],
    }), true);
    assert.equal("error" in bookWithModality({
      appointmentId: "a1", modality: "telehealth",
      eligibleModalities: ["telehealth"],
      telehealthLink: "https://meet.example/a1", telehealthConsented: false,
    }), true);
    const ok = bookWithModality({
      appointmentId: "a1", modality: "telehealth",
      eligibleModalities: ["telehealth"],
      telehealthLink: "https://meet.example/a1", telehealthConsented: true,
    });
    assert.equal("error" in ok, false);
  });
  it("keeps home visits request-first with staff approval", () => {
    const req = bookWithModality({
      appointmentId: "a2", modality: "home-visit",
      eligibleModalities: ["in-person", "home-visit"],
    });
    assert.equal("error" in req, false);
    if (!("error" in req)) {
      assert.equal(req.homeVisit, "requested");
      const approved = reviewHomeVisit(req, true, "staff-1");
      assert.equal("error" in approved, false);
      if (!("error" in approved)) assert.equal(approved.homeVisit, "approved");
      const declined = reviewHomeVisit(req, false, "staff-1");
      if (!("error" in declined)) assert.equal(declined.homeVisit, "declined");
    }
  });
  it("re-verifies authority on modality change", () => {
    const start = bookWithModality({
      appointmentId: "a3", modality: "in-person",
      eligibleModalities: ["in-person", "telehealth"],
    });
    assert.equal("error" in start, false);
    if (!("error" in start)) {
      assert.equal("error" in changeModality(start, "telehealth", {}), true);
      const ok = changeModality(start, "telehealth", {
        telehealthLink: "https://meet.example/a3", telehealthConsented: true,
      });
      assert.equal("error" in ok, false);
    }
  });
});
