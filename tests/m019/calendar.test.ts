import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  projectCalendar, visibleFieldsForRole, assertNoClinicalLeak, resolveDragDrop,
  previewBulkAbsence, executeBulkAbsence, checkIn, decideRequest, statusLabel,
  CALENDAR_LOCALES, telemetryForCalendar, type CalendarAppointment,
} from "@zyara/scheduling";

function rows(): CalendarAppointment[] {
  return [
    { id: "a1", tenantId: "t1", branchId: "b1", practitionerId: "p1", resourceId: "r1", patientId: "pt1", patientDisplayName: "Sara Ahmed", serviceId: "svc1", typeId: "ty1", startUtc: "2026-09-20T08:00:00.000Z", endUtc: "2026-09-20T08:30:00.000Z", version: 3, lifecycle: "booked", attendance: "scheduled", requestPending: false },
    { id: "a2", tenantId: "t1", branchId: "b1", practitionerId: "p1", resourceId: "r1", patientId: "pt2", patientDisplayName: "Jean Dupont", serviceId: "svc1", typeId: "ty1", startUtc: "2026-09-20T09:00:00.000Z", endUtc: "2026-09-20T09:30:00.000Z", version: 1, lifecycle: "booked", attendance: "checked_in", requestPending: true },
    { id: "a3", tenantId: "t1", branchId: "b2", practitionerId: "p2", resourceId: "r2", patientId: "pt3", patientDisplayName: "Maria Garcia", serviceId: "svc2", typeId: "ty2", startUtc: "2026-09-20T10:00:00.000Z", endUtc: "2026-09-20T10:30:00.000Z", version: 1, lifecycle: "cancelled", attendance: "cancelled", requestPending: false },
  ];
}

const base = { tenantId: "t1", view: "day" as const, rangeStartUtc: "2026-09-20T00:00:00.000Z", rangeEndUtc: "2026-09-21T00:00:00.000Z" };

describe("M019 provider calendar", () => {
  it("role matrix: reception sees operational fields, no clinical leak", () => {
    const fields = visibleFieldsForRole("receptionist", false);
    assertNoClinicalLeak(fields);
    assert.ok(!fields.includes("clinicalNotes"));
    const priv = visibleFieldsForRole("receptionist", true);
    assert.ok(priv.includes("patientDisplayName")); // present but masked to bullets at projection
  });
  it("branch scope enforced for reception", () => {
    const out = projectCalendar(rows(), { ...base }, "receptionist", false, "t1", "b1");
    assert.deepEqual(out.map((e) => e.id), ["a1", "a2"]);
    assert.throws(() => projectCalendar(rows(), { ...base }, "receptionist", false, "other", "b1"), /TENANT/);
  });
  it("privacy mode masks patient name", () => {
    const out = projectCalendar(rows(), { ...base }, "receptionist", true, "t1", null);
    assert.equal(out[0].fields["patientDisplayName"], "•••");
  });
  it("filters by practitioner/resource/status", () => {
    const out = projectCalendar(rows(), { ...base, practitionerId: "p1", status: "checked_in" }, "branch_manager", false, "t1", null);
    assert.deepEqual(out.map((e) => e.id), ["a2"]);
  });
  it("drag/drop requires confirmation and rejects stale version", () => {
    const cur = { tenantId: "t1", patientId: "pt1", version: 3, startUtc: "2026-09-20T08:00:00.000Z" };
    const stale = resolveDragDrop({ appointmentId: "a1", tenantId: "t1", actorId: "s", patientId: "pt1", fromVersion: 2, fromStartUtc: "2026-09-20T08:00:00.000Z", newStartUtc: "2026-09-20T09:00:00.000Z", newEndUtc: "2026-09-20T09:30:00.000Z", confirmed: true, idempotencyKey: "k1" }, cur);
    assert.equal(stale.ok, false);
    const unconfirmed = resolveDragDrop({ appointmentId: "a1", tenantId: "t1", actorId: "s", patientId: "pt1", fromVersion: 3, fromStartUtc: "2026-09-20T08:00:00.000Z", newStartUtc: "2026-09-20T09:00:00.000Z", newEndUtc: "2026-09-20T09:30:00.000Z", confirmed: false, idempotencyKey: "k1" }, cur);
    assert.deepEqual((unconfirmed as { code: string }).code, "CONFIRMATION_REQUIRED");
    const ok = resolveDragDrop({ appointmentId: "a1", tenantId: "t1", actorId: "s", patientId: "pt1", fromVersion: 3, fromStartUtc: "2026-09-20T08:00:00.000Z", newStartUtc: "2026-09-20T09:00:00.000Z", newEndUtc: "2026-09-20T09:30:00.000Z", confirmed: true, idempotencyKey: "k1" }, cur);
    assert.equal(ok.ok, true);
  });
  it("bulk absence preview plus partial failure outcomes", () => {
    const preview = previewBulkAbsence(rows(), { branchId: "b1", rangeStartUtc: "2026-09-20T00:00:00.000Z", rangeEndUtc: "2026-09-21T00:00:00.000Z" });
    assert.equal(preview.length, 2);
    const results = executeBulkAbsence(preview, (item) => {
      if (item.appointmentId === "a1") throw new Error("OCCUPANCY_CONFLICT");
      return "changed";
    });
    const byId = Object.fromEntries(results.map((r) => [r.appointmentId, r.outcome]));
    assert.equal(byId["a1"], "failed");
    assert.equal(byId["a2"], "needs_review");
  });
  it("check-in transitions and request decisions", () => {
    assert.equal(checkIn("scheduled").next, "checked_in");
    assert.equal(checkIn("cancelled").ok, false);
    assert.equal(decideRequest("approve", 10).code, "REQUEST_APPROVED_VIA_BOOKING_COMMAND");
  });
  it("five locales plus RTL status labels", () => {
    assert.equal(CALENDAR_LOCALES.length, 5);
    assert.equal(statusLabel("scheduled", "ar"), "مجدول");
    assert.equal(statusLabel("scheduled", "de"), "Geplant");
    assert.equal(statusLabel("no_show", "es"), "Ausente");
  });
  it("telemetry is counts only", () => {
    const t = telemetryForCalendar({ projected: 2, conflicts: 1, staleRejections: 1, bulkChanged: 0, bulkFailed: 1, checkIns: 1 });
    assert.equal(t.bulkFailed, 1);
  });
});
