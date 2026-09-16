// M053 synthetic qualification.
import assert from "node:assert";
import { describe, it } from "node:test";
import {
  correctEntry,
  labelFreshness,
  orderTimeline,
  timelineAllowed,
  type TimelineEntry,
} from "@zyara/patient-timeline";

function entry(id: string, at: string): TimelineEntry {
  return {
    entryId: id, patientId: "p1", kind: "visit", source: "visit-note-1",
    effectiveTimeUtc: at, recordedAtUtc: at, freshness: "current",
    externalIds: ["ext-1"], provenance: "zyara-visit",
    version: 1, supersedesId: null, summary: "visit",
  };
}

describe("M053 patient timeline", () => {
  it("labels freshness from effective time", () => {
    const fresh = labelFreshness(entry("e1", "2026-09-19T00:00:00.000Z"), "2026-09-20T00:00:00.000Z", 30);
    assert.equal(fresh.freshness, "current");
    const stale = labelFreshness(entry("e1", "2020-01-01T00:00:00.000Z"), "2026-09-20T00:00:00.000Z", 30);
    assert.equal(stale.freshness, "stale");
  });
  it("appends corrections without rewriting history", () => {
    const { current, correction } = correctEntry(entry("e1", "2026-09-19T00:00:00.000Z"), "fixed time", "2026-09-20T00:00:00.000Z");
    assert.equal(current.freshness, "superseded");
    assert.equal(correction.version, 2);
    assert.equal(correction.supersedesId, "e1");
    assert.equal(correction.summary, "fixed time");
  });
  it("orders deterministically by effective time then version", () => {
    const b = entry("b", "2026-09-02T00:00:00.000Z");
    const a = entry("a", "2026-09-01T00:00:00.000Z");
    assert.deepEqual(orderTimeline([b, a]).map((e) => e.entryId), ["a", "b"]);
  });
  it("requires care consent", () => {
    assert.equal(timelineAllowed([], "2026-09-20T00:00:00.000Z"), false);
    assert.equal(timelineAllowed([
      { patientId: "p1", purpose: "care", granted: true, atUtc: "2026-01-01T00:00:00.000Z", revokedAtUtc: null },
    ], "2026-09-20T00:00:00.000Z"), true);
  });
});
