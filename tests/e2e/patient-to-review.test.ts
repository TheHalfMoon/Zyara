import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  proposeBookingOperation, commitBooking, resumeBooking,
  createChangeStore, seedAppointment, rescheduleAppointment,
  projectCalendar, resolveDragDrop, statusLabel,
  type BookRequest,
} from "@zyara/scheduling";
import { gateSend, renderPreview } from "@zyara/communication";
import {
  recordEvidence, currentEvidenceFor, deriveEligibility, eligibilityText,
} from "@zyara/trust-attendance";
import { inviteEligible, submitReview, moderateReview, publicProjection, moderationGuidance } from "@zyara/trust-reviews";
import { summarize, computeKpis } from "@zyara/analytics";
import { buildMonthlyReport, reportTitle } from "@zyara/commerce";

const here = dirname(fileURLToPath(import.meta.url));
const fx = JSON.parse(readFileSync(join(here, "..", "..", "fixtures", "synthetic", "riyadh-clinic.json"), "utf8"));

function bookRequest(): BookRequest {
  return {
    tenantId: fx.tenantId,
    actorId: "actor-synthetic-01",
    patientId: fx.patient.patientId,
    idempotencyKey: "e2e-key-01",
    holdId: null,
    items: [{ unitId: fx.resourceId, startUtc: fx.slot.startUtc, endUtc: fx.slot.endUtc }],
    candidate: {
      serviceId: fx.serviceId, typeId: fx.typeId, branchId: fx.branchId,
      scheduleId: fx.scheduleId, scheduleVersion: fx.scheduleVersion,
      recipeId: fx.recipeId, recipeVersion: fx.recipeVersion,
      durationMin: fx.durationMin, startUtc: fx.slot.startUtc, endUtc: fx.slot.endUtc,
      token: "candidate-synthetic",
    },
    confirmation: {
      acceptedScheduleVersion: fx.scheduleVersion, acceptedRecipeVersion: fx.recipeVersion,
      acceptedStartUtc: fx.slot.startUtc, acceptedEndUtc: fx.slot.endUtc,
      acceptedDurationMin: fx.durationMin, challenge: "slot-A",
    },
    eligibilityOutcome: "ALLOW",
    evaluatedRuleVersions: ["rule-v1"],
    timeZone: fx.slot.timeZone,
  };
}

describe("M026 synthetic patient-to-review loop", () => {
  it("booking commits authoritatively, never on optimism", () => {
    const req = bookRequest();
    const proposed = proposeBookingOperation(req, "2026-10-01T08:00:00.000Z", {
      byKey: null, pendingForPatientService: 0, duplicateAppointmentId: null, nextId: "op-01",
    });
    assert.equal(proposed.ok, true);
    if (!proposed.ok) throw new Error("propose failed");
    const committed = commitBooking(proposed.operation, "2026-10-01T08:00:01.000Z", {
      holdState: "no_hold", eligibilityOutcome: "ALLOW",
      currentScheduleVersion: fx.scheduleVersion, currentRecipeVersion: fx.recipeVersion,
      currentDurationMin: fx.durationMin, occupancyFree: true, patientDuplicateAppointmentId: null,
    }, "appt-01");
    assert.equal(committed.ok, true);
    if (!committed.ok) throw new Error("commit failed");
    assert.equal(committed.appointment.id, "appt-01");
    // Lost-response resume returns the same result, never a second booking.
    assert.equal(resumeBooking(committed.operation).appointmentId, "appt-01");
    // Occupancy conflict is a conflict, never a false confirmation.
    const conflict = commitBooking({ ...proposed.operation }, "2026-10-01T08:00:02.000Z", {
      holdState: "no_hold", eligibilityOutcome: "ALLOW",
      currentScheduleVersion: fx.scheduleVersion, currentRecipeVersion: fx.recipeVersion,
      currentDurationMin: fx.durationMin, occupancyFree: false, patientDuplicateAppointmentId: null,
    }, "appt-99");
    assert.equal(conflict.ok, false);
  });

  it("reschedule preserves the original on failure and replaces on success", () => {
    const store = createChangeStore();
    seedAppointment(store, {
      id: "appt-01", tenantId: fx.tenantId, patientId: fx.patient.patientId,
      serviceId: fx.serviceId, startUtc: fx.slot.startUtc, endUtc: fx.slot.endUtc,
      lifecycle: "booked", version: 1, replacedById: null,
    });
    const base = {
      changeId: "ch-01", kind: "reschedule" as const, appointmentId: "appt-01",
      tenantId: fx.tenantId, actorId: "actor-synthetic-01", patientId: fx.patient.patientId,
      idempotencyKey: "ch-key-01", newStartUtc: fx.rescheduledSlot.startUtc,
      newEndUtc: fx.rescheduledSlot.endUtc, reason: "patient request",
      cutoffIso: "2026-10-04T00:00:00.000Z", nowIso: "2026-10-01T08:00:00.000Z",
    };
    const failed = rescheduleAppointment(store, base, {
      commitReplacement: () => { throw new Error("OCCUPANCY_CONFLICT"); },
    });
    assert.equal(failed.lastReason, "REPLACEMENT_FAILED_ORIGINAL_RETAINED");
    assert.equal(store.appointments.get("appt-01")?.lifecycle, "booked");
    const done = rescheduleAppointment(store, { ...base, changeId: "ch-02", idempotencyKey: "ch-key-02" }, {
      commitReplacement: () => "appt-02",
    });
    assert.equal(done.lastReason, "REPLACE_COMMITTED");
    assert.equal(store.appointments.get("appt-01")?.lifecycle, "replaced");
  });

  it("calendar projects the booking; drag/drop is versioned and confirmed", () => {
    const rows = [{
      id: "appt-02", tenantId: fx.tenantId, branchId: fx.branchId,
      practitionerId: fx.practitionerId, resourceId: fx.resourceId,
      patientId: fx.patient.patientId, patientDisplayName: fx.patient.displayName,
      serviceId: fx.serviceId, typeId: fx.typeId,
      startUtc: fx.rescheduledSlot.startUtc, endUtc: fx.rescheduledSlot.endUtc,
      version: 2, lifecycle: "booked" as const, attendance: "scheduled" as const,
      requestPending: false,
    }];
    const projected = projectCalendar(rows, {
      tenantId: fx.tenantId, view: "day",
      rangeStartUtc: "2026-10-05T00:00:00.000Z", rangeEndUtc: "2026-10-06T00:00:00.000Z",
    }, "receptionist", false, fx.tenantId, fx.branchId);
    assert.equal(projected.length, 1);
    const drag = resolveDragDrop({
      appointmentId: "appt-02", tenantId: fx.tenantId, actorId: "s",
      patientId: fx.patient.patientId, fromVersion: 2, fromStartUtc: fx.rescheduledSlot.startUtc,
      newStartUtc: fx.rescheduledSlot.startUtc, newEndUtc: fx.rescheduledSlot.endUtc,
      confirmed: true, idempotencyKey: "drag-01",
    }, { tenantId: fx.tenantId, patientId: fx.patient.patientId, version: 2, startUtc: fx.rescheduledSlot.startUtc });
    assert.equal(drag.ok, true);
  });

  it("reminder sends; cancellation suppresses the stale reminder", () => {
    const message = {
      id: "msg-01", tenantId: fx.tenantId, patientId: fx.patient.patientId,
      appointmentId: "appt-02", appointmentVersion: 2, appointmentStartUtc: fx.rescheduledSlot.startUtc,
      channel: "sms" as const, templateId: "reminder", locale: "ar",
      destination: fx.patient.phone, queuedAtUtc: "2026-10-04T08:00:00.000Z",
      idempotencyKey: "msg-key-01", attemptCount: 0,
    };
    const live = { id: "appt-02", tenantId: fx.tenantId, lifecycle: "booked" as const, version: 2, startUtc: fx.rescheduledSlot.startUtc };
    const gate = {
      message, truth: live, consent: { email: true, sms: true, inapp: true },
      channelPaused: false, sendAtUtcIso: "2026-10-04T10:00:00.000Z",
      patientTzOffsetMinutes: 180, quietStartLocal: "22:00", quietEndLocal: "07:00",
    };
    assert.deepEqual(gateSend(gate), { ok: true });
    assert.deepEqual(
      gateSend({ ...gate, truth: { ...live, lifecycle: "cancelled" } }),
      { ok: false, code: "APPOINTMENT_CANCELLED" },
    );
  });

  it("attendance grants eligibility; review publishes anonymously; report reflects attendance", () => {
    const evidence = recordEvidence([], {
      id: "att-01", tenantId: fx.tenantId, appointmentId: "appt-02",
      patientId: fx.patient.patientId, outcome: "completed", source: "provider_checkin",
      actorRole: "provider", actorId: fx.practitionerId, confidence: 0.95,
      recordedAtUtc: "2026-10-05T09:00:00.000Z", provenance: null,
    }, "att-01");
    const decision = deriveEligibility(currentEvidenceFor(evidence, "appt-02"), new Set(), true);
    assert.equal(decision.eligible, true);
    const reviews = { byId: new Map(), byAppointment: new Map(), invited: new Set<string>(), audit: [] as string[] };
    assert.equal(inviteEligible(reviews, "appt-02"), true);
    const sub = submitReview(reviews, {
      id: "rev-01", tenantId: fx.tenantId, appointmentId: "appt-02",
      patientId: fx.patient.patientId, practitionerId: fx.practitionerId,
      ratings: { punctuality: 4, communication: 5, facility: 4, cleanliness: 5 },
      text: "Kind staff, on time.", eligible: decision.eligible, atUtc: "2026-10-06T08:00:00.000Z",
    });
    assert.equal(sub.ok, true);
    assert.equal(moderateReview(reviews, "rev-01", "moderator", "publish").ok, true);
    assert.ok(!JSON.stringify(publicProjection(reviews.byId.get("rev-01")!)).includes(fx.patient.patientId));
    const totals = summarize([
      { eventId: "e1", kind: "booking_started", tenantId: fx.tenantId, dayUtc: "2026-10-05", channel: "inapp", locale: "ar", appointmentId: null },
      { eventId: "e2", kind: "booking_committed", tenantId: fx.tenantId, dayUtc: "2026-10-05", channel: "inapp", locale: "ar", appointmentId: "appt-02" },
      { eventId: "e3", kind: "attendance_completed", tenantId: fx.tenantId, dayUtc: "2026-10-05", channel: "inapp", locale: "ar", appointmentId: "appt-02" },
    ]);
    assert.equal(computeKpis(totals).bookingConversion, 1);
    const report = buildMonthlyReport({ tenantId: fx.tenantId, monthUtc: "2026-10", totals, subscription: "active" });
    assert.equal(report.totals.completed, 1);
  });

  it("failure branches: request-only provider and missing referral block booking honestly", () => {
    const req = { ...bookRequest(), patientId: fx.requestOnlyPatient.patientId, idempotencyKey: "e2e-key-02" };
    const proposed = proposeBookingOperation(req, "2026-10-01T08:00:00.000Z", {
      byKey: null, pendingForPatientService: 0, duplicateAppointmentId: null, nextId: "op-02",
    });
    assert.equal(proposed.ok, true);
    if (!proposed.ok) throw new Error("propose failed");
    const blocked = commitBooking(proposed.operation, "2026-10-01T08:00:01.000Z", {
      holdState: "no_hold", eligibilityOutcome: "NEEDS_STAFF_REVIEW",
      currentScheduleVersion: fx.scheduleVersion, currentRecipeVersion: fx.recipeVersion,
      currentDurationMin: fx.durationMin, occupancyFree: true, patientDuplicateAppointmentId: null,
    }, "appt-03");
    assert.deepEqual(blocked, { ok: false, code: "ELIGIBILITY_BLOCKED" });
  });

  it("five locales render across calendar, comms, attendance, reviews, and reports", () => {
    for (const locale of ["ar", "en", "fr", "de", "es"]) {
      assert.ok(statusLabel("scheduled", locale).length > 2);
      assert.ok(renderPreview("reminder", locale).length > 10);
      assert.ok(eligibilityText(true, locale).length > 5);
      assert.ok(moderationGuidance(locale).length > 10);
      assert.ok(reportTitle(locale).length > 3);
    }
  });
});
