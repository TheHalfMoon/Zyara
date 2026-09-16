// M048 synthetic qualification.
import assert from "node:assert";
import { describe, it } from "node:test";
import {
  MAX_OCCURRENCES,
  cancelOccurrence,
  linkEpisode,
  planSeries,
  type SeriesSpec,
} from "@zyara/recurring-care";

function spec(over = {}): SeriesSpec {
  return {
    seriesId: "s1", tenantId: "t1", patientId: "p1", serviceId: "svc",
    recurrence: "weekly", firstStartUtc: "2026-10-01T08:00:00.000Z",
    durationMin: 30, endDateUtc: "2026-12-31T00:00:00.000Z",
    maxOccurrences: 4, recallPlanId: "plan-1", ...over,
  };
}

describe("M048 recurring care", () => {
  it("bounds series by end date and max occurrences", () => {
    const out = planSeries(spec());
    assert.equal("error" in out, false);
    if (!("error" in out)) {
      assert.equal(out.length, 4);
      assert.ok(out.every((o) => o.state === "proposed"));
    }
    assert.equal("error" in planSeries(spec({ maxOccurrences: MAX_OCCURRENCES + 1 })), true);
    assert.equal("error" in planSeries(spec({ maxOccurrences: 0 })), true);
    assert.equal("error" in planSeries(spec({ firstStartUtc: "2027-01-01T00:00:00.000Z" })), true);
  });
  it("cancels occurrences independently", () => {
    const out = planSeries(spec());
    assert.equal("error" in out, false);
    if (!("error" in out)) {
      const cancelled = cancelOccurrence({ ...out[0], state: "booked" });
      assert.equal(cancelled.state, "cancelled");
      assert.equal(out[1].state, "proposed");
    }
  });
  it("links episodes with independent sibling policy", () => {
    const ep = linkEpisode(
      { episodeId: "e1", tenantId: "t1", patientId: "p1", recallPlanId: "plan-1", appointmentIds: [], siblingPolicy: "independent" },
      "appt-1",
    );
    assert.deepEqual(ep.appointmentIds, ["appt-1"]);
    assert.equal(linkEpisode(ep, "appt-1").appointmentIds.length, 1);
  });
});
