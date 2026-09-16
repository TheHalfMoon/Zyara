import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  METRIC_DICTIONARY, dedupeEvents, summarize, computeKpis, suppressSmallCells,
  type CountedEvent,
} from "@zyara/analytics";

function ev(id: string, kind: CountedEvent["kind"]): CountedEvent {
  return {
    eventId: id, kind, tenantId: "t1", dayUtc: "2026-09-20",
    channel: "inapp", locale: "ar", appointmentId: null,
  };
}

describe("M024 minimized operational metrics", () => {
  it("every KPI declares grain, denominator, source, and coverage", () => {
    assert.ok(METRIC_DICTIONARY.length >= 5);
    for (const m of METRIC_DICTIONARY) {
      assert.ok(m.grain && m.denominator && m.source && m.coverage);
    }
  });
  it("duplicate events never double-count", () => {
    const t = summarize([ev("e1", "booking_started"), ev("e1", "booking_started"), ev("e2", "booking_committed")]);
    assert.deepEqual([t.started, t.committed], [1, 1]);
    assert.equal(dedupeEvents([ev("e1", "click"), ev("e1", "click")]).length, 1);
  });
  it("no-show excludes unknown outcomes", () => {
    const t = summarize([
      ev("a", "attendance_completed"), ev("b", "attendance_no_show"),
      ev("c", "attendance_unknown"), ev("d", "external_unknown"),
    ]);
    const k = computeKpis(t);
    assert.equal(k.noShowRate, 0.5);
    assert.equal(k.unknownShare, 0.5);
  });
  it("reschedule counts as retained, not lost", () => {
    const t = summarize([ev("a", "change_cancelled"), ev("b", "change_rescheduled"), ev("c", "change_rescheduled")]);
    assert.equal(computeKpis(t).retainedAfterChange, 2 / 3);
  });
  it("empty denominators yield null, never fabricated zeros", () => {
    const k = computeKpis(summarize([]));
    assert.deepEqual([k.bookingConversion, k.noShowRate, k.retainedAfterChange, k.unknownShare], [null, null, null, null]);
  });
  it("small cells suppressed including complementary cells", () => {
    const cells = [{ key: "ar", count: 12 }, { key: "fr", count: 2 }];
    const out = suppressSmallCells(cells, 5);
    assert.deepEqual(out.map((c) => c.count), [null, null]);
    const ok = suppressSmallCells(
      [{ key: "ar", count: 12 }, { key: "en", count: 9 }, { key: "fr", count: 2 }], 5,
    );
    assert.deepEqual(ok.map((c) => c.count), [12, 9, null]);
  });
});
