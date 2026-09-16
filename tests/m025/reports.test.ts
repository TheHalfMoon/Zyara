import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { summarize, type CountedEvent } from "@zyara/analytics";
import {
  buildMonthlyReport, entitlementsFor, appointmentAccessPreserved,
  recordInvoicePayment, formatSar, reportTitle, COMMERCE_LOCALES,
} from "@zyara/commerce";

function ev(id: string, kind: CountedEvent["kind"]): CountedEvent {
  return {
    eventId: id, kind, tenantId: "t1", dayUtc: "2026-09-20",
    channel: "inapp", locale: "ar", appointmentId: null,
  };
}

describe("M025 provider reports and entitlements", () => {
  it("report totals reconcile to metric fixtures", () => {
    const totals = summarize([
      ev("s1", "booking_started"), ev("s2", "booking_started"), ev("c1", "booking_committed"),
      ev("r1", "change_rescheduled"), ev("x1", "change_cancelled"),
    ]);
    const report = buildMonthlyReport({ tenantId: "t1", monthUtc: "2026-09", totals, subscription: "active" });
    assert.deepEqual([report.totals.started, report.totals.committed], [2, 1]);
    assert.equal(report.recommendations.length, 3);
    assert.ok(report.coverage.length > 10);
  });
  it("subscription state cannot change rank or reviews", () => {
    const keys = ["subscription", "entitlements"];
    for (const state of ["trial", "active", "past_due", "lapsed"] as const) {
      const report = buildMonthlyReport({
        tenantId: "t1", monthUtc: "2026-09",
        totals: summarize([]), subscription: state,
      });
      const payload = JSON.stringify(report);
      assert.ok(!payload.includes("score") && !payload.includes("rank_boost"));
      assert.ok(keys.every((k) => k in report));
    }
    assert.deepEqual(entitlementsFor("lapsed"), []);
    assert.ok(entitlementsFor("active").includes("api_access"));
  });
  it("lapsed billing preserves existing patient appointment access", () => {
    for (const state of ["trial", "active", "past_due", "lapsed"] as const) {
      assert.equal(appointmentAccessPreserved(state), true);
    }
  });
  it("manual invoices track without automation", () => {
    const paid = recordInvoicePayment({ id: "i1", tenantId: "t1", monthUtc: "2026-09", amountSar: 499, state: "issued" });
    assert.equal(paid.state, "paid");
    assert.throws(
      () => recordInvoicePayment({ id: "i1", tenantId: "t1", monthUtc: "2026-09", amountSar: 499, state: "paid" }),
      /STATE/,
    );
  });
  it("five locales plus SAR formatting", () => {
    assert.equal(COMMERCE_LOCALES.length, 5);
    for (const locale of COMMERCE_LOCALES) assert.ok(reportTitle(locale).length > 3);
    const sarAr = formatSar(499, "ar-SA");
    const sarEn = formatSar(499, "en-US");
    assert.ok(sarAr.length > 3 && sarEn.includes("499"));
  });
});
