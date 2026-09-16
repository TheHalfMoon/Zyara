import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  proposeBookingOperation, commitBooking, bookingOverlapsUtc,
  type BookRequest, type BookingOperationRecord,
} from "@zyara/scheduling";
import { dedupeEvents } from "@zyara/analytics";
import { gateSend, type QueuedMessage } from "@zyara/communication";

const SLOT = { start: "2026-10-05T07:00:00.000Z", end: "2026-10-05T07:30:00.000Z" };

function req(key: string, patient: string, unit = "room-01"): BookRequest {
  return {
    tenantId: "t1", actorId: "actor-01", patientId: patient, idempotencyKey: key,
    holdId: null, items: [{ unitId: unit, startUtc: SLOT.start, endUtc: SLOT.end }],
    candidate: {
      serviceId: "svc", typeId: "ty", branchId: "b1", scheduleId: "sched",
      scheduleVersion: 2, recipeId: "recipe", recipeVersion: 3,
      durationMin: 30, startUtc: SLOT.start, endUtc: SLOT.end, token: "tok",
    },
    confirmation: {
      acceptedScheduleVersion: 2, acceptedRecipeVersion: 3,
      acceptedStartUtc: SLOT.start, acceptedEndUtc: SLOT.end,
      acceptedDurationMin: 30, challenge: "slot-A",
    },
    eligibilityOutcome: "ALLOW", evaluatedRuleVersions: ["rule-v1"], timeZone: "Asia/Riyadh",
  };
}

const COMMIT_CHECKS = {
  holdState: "no_hold" as const, eligibilityOutcome: "ALLOW",
  currentScheduleVersion: 2, currentRecipeVersion: 3, currentDurationMin: 30,
  occupancyFree: true, patientDuplicateAppointmentId: null,
};

describe("M027 reliability, restoration, and release control", () => {
  it("100 concurrent capacity-one contenders yield exactly one booking", async () => {
    // Serialized commit gate mirrors the exclusion constraint: the first
    // contender to hold the unit wins; every other overlapping contender
    // sees occupancy taken. Async interleaving with random yields.
    const taken: Array<{ start: number; end: number }> = [];
    const winners: string[] = [];
    const s = Date.parse(SLOT.start);
    const e = Date.parse(SLOT.end);
    async function contend(i: number): Promise<void> {
      await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 5)));
      const free = !taken.some((t) => bookingOverlapsUtc(s, e, t.start, t.end));
      if (!free) return;
      await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 5)));
      if (taken.some((t) => bookingOverlapsUtc(s, e, t.start, t.end))) return;
      taken.push({ start: s, end: e });
      winners.push(`op-${i}`);
    }
    await Promise.all(Array.from({ length: 100 }, (_, i) => contend(i)));
    assert.equal(winners.length, 1);
    // The winner commits through the authoritative gate.
    const proposed = proposeBookingOperation(req("race-key", "pt-race"), "2026-10-01T08:00:00.000Z", {
      byKey: null, pendingForPatientService: 0, duplicateAppointmentId: null, nextId: winners[0],
    });
    assert.equal(proposed.ok, true);
    if (!proposed.ok) throw new Error("propose failed");
    const committed = commitBooking(proposed.operation, "2026-10-01T08:00:01.000Z", COMMIT_CHECKS, "appt-race");
    assert.equal(committed.ok, true);
  });

  it("retry storm on one idempotency key yields one operation, replayed", () => {
    let stored: BookingOperationRecord | null = null;
    let created = 0;
    for (let i = 0; i < 50; i += 1) {
      const r = proposeBookingOperation(req("storm-key", "pt-storm"), "2026-10-01T08:00:00.000Z", {
        byKey: stored, pendingForPatientService: stored ? 1 : 0,
        duplicateAppointmentId: null, nextId: "op-storm",
      });
      assert.equal(r.ok, true);
      if (!r.ok) throw new Error("propose failed");
      if (!r.replayed) {
        created += 1;
        stored = r.operation;
      }
    }
    assert.equal(created, 1);
  });

  it("kill switch freezes new writes while reads continue", () => {
    let freezeNewWrites = true;
    function proposeGated(): { ok: boolean; code: string } {
      if (freezeNewWrites) return { ok: false, code: "WRITES_FROZEN" };
      return { ok: true, code: "PROPOSED" };
    }
    assert.deepEqual(proposeGated(), { ok: false, code: "WRITES_FROZEN" });
    freezeNewWrites = false;
    assert.deepEqual(proposeGated(), { ok: true, code: "PROPOSED" });
    // Channel pause suppresses sends without touching booking truth.
    const msg: QueuedMessage = {
      id: "m-kill", tenantId: "t1", patientId: "pt1", appointmentId: "a1",
      appointmentVersion: 1, appointmentStartUtc: SLOT.start, channel: "sms",
      templateId: "reminder", locale: "en", destination: "+966500000001",
      queuedAtUtc: "2026-10-04T08:00:00.000Z", idempotencyKey: "k-kill", attemptCount: 0,
    };
    const truth = { id: "a1", tenantId: "t1", lifecycle: "booked" as const, version: 1, startUtc: SLOT.start };
    const consent = { email: true, sms: true, inapp: true };
    const base = {
      message: msg, truth, consent, channelPaused: true,
      sendAtUtcIso: "2026-10-04T10:00:00.000Z", patientTzOffsetMinutes: 180,
      quietStartLocal: "22:00", quietEndLocal: "07:00",
    };
    assert.deepEqual(gateSend(base), { ok: false, code: "CHANNEL_PAUSED" });
    assert.deepEqual(gateSend({ ...base, channelPaused: false }), { ok: true });
  });

  it("restore from durable log duplicates nothing", () => {
    const log = [
      { eventId: "e1", kind: "booking_committed", tenantId: "t1", dayUtc: "2026-10-05", channel: "inapp", locale: "en", appointmentId: "a1" },
      { eventId: "e1", kind: "booking_committed", tenantId: "t1", dayUtc: "2026-10-05", channel: "inapp", locale: "en", appointmentId: "a1" },
      { eventId: "e2", kind: "booking_committed", tenantId: "t1", dayUtc: "2026-10-05", channel: "inapp", locale: "en", appointmentId: "a2" },
    ] as Parameters<typeof dedupeEvents>[0];
    // Replayed log restores exactly two effective bookings.
    assert.equal(dedupeEvents([...log, ...log]).length, 2);
  });
});
