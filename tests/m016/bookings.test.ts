// M016 booking proofs (synthetic only): propose/replay/conflict, commit
// ordering, material reconfirmation, duplicate guard, resume stability.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  proposeBookingOperation, commitBooking, resumeBooking, materialChangeCode,
  digestBookRequest, validateBookRequest, patientDuplicateHit,
  DEFAULT_BOOKING_CAPS,
} from "@zyara/scheduling";
import { T0, SLOT_A, SLOT_B, bookReq, visibleEmpty, commitChecksOk } from "./fixtures.js";

test("propose allocates pending; digest is stable across key change", () => {
  const req = bookReq();
  const out = proposeBookingOperation(req, T0, visibleEmpty("op-1"));
  assert.equal(out.ok, true);
  if (out.ok) {
    assert.equal(out.replayed, false);
    assert.equal(out.operation.state, "pending");
    assert.equal(out.operation.appointmentId, null);
  }
  assert.equal(digestBookRequest(req), digestBookRequest({ ...req, idempotencyKey: "other" }));
});

test("acceptance 2: same key plus same digest replays; changed body conflicts", () => {
  const req = bookReq();
  const first = proposeBookingOperation(req, T0, visibleEmpty("op-1"));
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const replay = proposeBookingOperation(req, T0, {
    byKey: first.operation, pendingForPatientService: 1, duplicateAppointmentId: null, nextId: "op-2",
  });
  assert.equal(replay.ok, true);
  if (replay.ok) {
    assert.equal(replay.replayed, true);
    assert.equal(replay.operation.id, "op-1");
  }
  const changed = proposeBookingOperation(
    { ...req, candidate: { ...req.candidate, scheduleVersion: 2 } }, T0,
    { byKey: first.operation, pendingForPatientService: 1, duplicateAppointmentId: null, nextId: "op-3" },
  );
  assert.deepEqual(changed, { ok: false, code: "IDEMPOTENCY_CONFLICT", existingId: "op-1" });
});

test("abuse cap and request caps reject before allocating", () => {
  const capped = proposeBookingOperation(bookReq(), T0, {
    byKey: null, pendingForPatientService: 3, duplicateAppointmentId: null, nextId: "op-x",
  });
  assert.deepEqual(capped, { ok: false, code: "BOOKING_LIMIT_REACHED" });
  assert.throws(() => validateBookRequest(bookReq({ items: [] })), /BOOKING_ITEMS_INVALID/);
  assert.throws(
    () => validateBookRequest(bookReq({ items: [{ unitId: "u", startUtc: SLOT_A.endUtc, endUtc: SLOT_A.startUtc }] })),
    /BOOKING_INTERVAL_EMPTY/,
  );
  assert.equal(DEFAULT_BOOKING_CAPS.maxPendingPerPatientService, 3);
});

test("acceptance 1: booked response follows committed appointment only", () => {
  const req = bookReq({ holdId: null });
  const proposed = proposeBookingOperation(req, T0, visibleEmpty("op-1"));
  assert.equal(proposed.ok, true);
  if (!proposed.ok) return;
  const committed = commitBooking(proposed.operation, T0, commitChecksOk(), "appt-1");
  assert.equal(committed.ok, true);
  if (!committed.ok) return;
  assert.equal(committed.operation.state, "booked");
  assert.equal(committed.operation.appointmentId, "appt-1");
  assert.equal(committed.appointment.id, "appt-1");
  assert.equal(committed.appointment.operationId, "op-1");
  assert.equal(committed.appointment.state, "booked");
  // Resume returns the same stable result (lost-response safety).
  const resumed = resumeBooking(committed.operation);
  assert.deepEqual(resumed, {
    state: "booked", appointmentId: "appt-1", operationId: "op-1", reason: "BOOKING_COMMITTED",
  });
});

test("commit order: hold expiry, eligibility, reconfirmation, duplicate, occupancy", () => {
  const base = proposeBookingOperation(bookReq(), T0, visibleEmpty("op-1"));
  assert.equal(base.ok, true);
  if (!base.ok) return;
  const expired = commitBooking(base.operation, T0, commitChecksOk({ holdState: "held_expired" }), "appt-x");
  assert.deepEqual(expired, { ok: false, code: "HOLD_EXPIRED" });
  const missing = commitBooking(base.operation, T0, commitChecksOk({ holdState: "hold_missing" }), "appt-x");
  assert.deepEqual(missing, { ok: false, code: "HOLD_MISSING" });
  const denied = commitBooking(base.operation, T0, commitChecksOk({ eligibilityOutcome: "DENY" }), "appt-x");
  assert.deepEqual(denied, { ok: false, code: "ELIGIBILITY_BLOCKED" });
  const stale = commitBooking(base.operation, T0, commitChecksOk({ currentScheduleVersion: 2 }), "appt-x");
  assert.deepEqual(stale, { ok: false, code: "NEEDS_RECONFIRMATION" });
  const busy = commitBooking(base.operation, T0, commitChecksOk({ occupancyFree: false }), "appt-x");
  assert.deepEqual(busy, { ok: false, code: "OCCUPANCY_CONFLICT" });
  const dup = commitBooking(base.operation, T0, commitChecksOk({ patientDuplicateAppointmentId: "appt-old" }), "appt-x");
  assert.deepEqual(dup, { ok: false, code: "PATIENT_DUPLICATE", existingId: "appt-old" });
});

test("acceptance 3: material changes require renewed confirmation", () => {
  assert.equal(materialChangeCode(
    { acceptedScheduleVersion: 1, acceptedRecipeVersion: 1, acceptedStartUtc: SLOT_A.startUtc, acceptedEndUtc: SLOT_A.endUtc, acceptedDurationMin: 40, challenge: "SLOT-7A" },
    { scheduleVersion: 1, recipeVersion: 1, startUtc: SLOT_A.startUtc, endUtc: SLOT_A.endUtc, durationMin: 40 },
  ), "BOOKED_OK");
  assert.equal(materialChangeCode(
    { acceptedScheduleVersion: 1, acceptedRecipeVersion: 1, acceptedStartUtc: SLOT_A.startUtc, acceptedEndUtc: SLOT_A.endUtc, acceptedDurationMin: 40, challenge: "SLOT-7A" },
    { scheduleVersion: 2, recipeVersion: 1, startUtc: SLOT_A.startUtc, endUtc: SLOT_A.endUtc, durationMin: 40 },
  ), "NEEDS_RECONFIRMATION_VERSION");
  assert.equal(materialChangeCode(
    { acceptedScheduleVersion: 1, acceptedRecipeVersion: 1, acceptedStartUtc: SLOT_A.startUtc, acceptedEndUtc: SLOT_A.endUtc, acceptedDurationMin: 40, challenge: "SLOT-7A" },
    { scheduleVersion: 1, recipeVersion: 1, startUtc: SLOT_B.startUtc, endUtc: SLOT_B.endUtc, durationMin: 40 },
  ), "NEEDS_RECONFIRMATION_TIME");
  assert.equal(materialChangeCode(
    { acceptedScheduleVersion: 1, acceptedRecipeVersion: 1, acceptedStartUtc: SLOT_A.startUtc, acceptedEndUtc: SLOT_A.endUtc, acceptedDurationMin: 40, challenge: "SLOT-7A" },
    { scheduleVersion: 1, recipeVersion: 1, startUtc: SLOT_A.startUtc, endUtc: SLOT_A.endUtc, durationMin: 30 },
  ), "NEEDS_RECONFIRMATION_DURATION");
});

test("patient duplicate guard is per patient plus service plus overlap", () => {
  const existing = [
    { id: "appt-old", patientId: "patient-1", serviceId: "derm", startUtc: SLOT_A.startUtc, endUtc: SLOT_A.endUtc },
  ];
  assert.equal(patientDuplicateHit("patient-1", "derm", SLOT_A.startUtc, SLOT_A.endUtc, existing), "appt-old");
  assert.equal(patientDuplicateHit("patient-2", "derm", SLOT_A.startUtc, SLOT_A.endUtc, existing), null);
  assert.equal(patientDuplicateHit("patient-1", "dental", SLOT_A.startUtc, SLOT_A.endUtc, existing), null);
  assert.equal(patientDuplicateHit("patient-1", "derm", SLOT_B.startUtc, SLOT_B.endUtc, existing), null);
  // Propose with a duplicate already booked returns the existing id.
  const dup = proposeBookingOperation(bookReq({ idempotencyKey: "new-key" }), T0, {
    byKey: null, pendingForPatientService: 0, duplicateAppointmentId: "appt-old", nextId: "op-9",
  });
  assert.deepEqual(dup, { ok: false, code: "PATIENT_DUPLICATE", existingId: "appt-old" });
});
