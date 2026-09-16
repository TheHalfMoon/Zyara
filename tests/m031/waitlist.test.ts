// M031 synthetic qualification: preference/eligibility, duplicates,
// quiet hours, original-appointment preservation, FIFO fairness.
import assert from "node:assert";
import { describe, it } from "node:test";
import {
  checkEligibility,
  compareEnrollments,
  isQuietHourUtc,
  sortWaitlist,
  validateEnrollmentRequest,
  type EnrollmentRecord,
  type EnrollmentRequest,
} from "@zyara/waitlist";

function baseRequest(): EnrollmentRequest {
  return {
    tenantId: "t1",
    patientId: "p1",
    originalAppointmentId: "appt-orig-1",
    serviceId: "svc-gen",
    typeId: "type-followup",
    window: {
      timeZone: "Asia/Riyadh",
      windows: [{ startLocal: "08:00", endLocal: "12:00" }],
    },
    clinicians: { required: ["clin-a"], alternates: ["clin-b"] },
    locations: { required: [], alternates: ["loc-2"] },
    accessibilityNeeds: ["step-free"],
    language: "ar",
    consents: [{ channel: "sms", consented: true }],
    allowAutoSwitch: false,
    idempotencyKey: "m031-key-1",
    priorityBand: "routine",
    priorityReason: "Patient requested earlier slot; clinician triaged routine.",
  };
}

describe("M031 enrollment validation", () => {
  it("accepts a well-formed request", () => {
    assert.deepEqual(validateEnrollmentRequest(baseRequest(), new Set()), {
      ok: true,
    });
  });
  it("rejects duplicates, missing consent, missing reason, bad tz/time", () => {
    assert.equal(
      validateEnrollmentRequest(baseRequest(), new Set(["m031-key-1"])).ok,
      false,
    );
    const noConsent = { ...baseRequest(), idempotencyKey: "k2", consents: [] };
    assert.equal(validateEnrollmentRequest(noConsent, new Set()).ok, false);
    const noReason = { ...baseRequest(), idempotencyKey: "k3", priorityReason: " " };
    assert.equal(validateEnrollmentRequest(noReason, new Set()).ok, false);
    const badTz = {
      ...baseRequest(),
      idempotencyKey: "k4",
      window: { timeZone: "Mars/Olympus", windows: [{ startLocal: "08:00", endLocal: "09:00" }] },
    };
    assert.equal(validateEnrollmentRequest(badTz, new Set()).ok, false);
    const badTime = {
      ...baseRequest(),
      idempotencyKey: "k5",
      window: { timeZone: "Asia/Riyadh", windows: [{ startLocal: "12:00", endLocal: "08:00" }] },
    };
    assert.equal(validateEnrollmentRequest(badTime, new Set()).ok, false);
  });
  it("rejects overlapping required/alternate sets", () => {
    const req = {
      ...baseRequest(),
      idempotencyKey: "k6",
      clinicians: { required: ["clin-a"], alternates: ["clin-a"] },
    };
    const res = validateEnrollmentRequest(req, new Set());
    assert.equal(res.ok, false);
  });
});

describe("M031 eligibility and quiet hours", () => {
  it("enforces hard constraints, flags alternates", () => {
    const ok = checkEligibility(
      { clinicianId: "clin-a", locationId: "loc-1" },
      ["clin-a"],
      ["clin-b"],
      [],
      ["loc-2"],
    );
    assert.equal(ok.eligible, true);
    assert.equal(ok.matchedHard, true);
    const alt = checkEligibility(
      { clinicianId: "clin-a", locationId: "loc-2" },
      ["clin-a"],
      ["clin-b"],
      [],
      ["loc-2"],
    );
    assert.equal(alt.eligible, true);
    assert.equal(alt.matchedAlternate, true);
    const bad = checkEligibility(
      { clinicianId: "clin-z", locationId: "loc-1" },
      ["clin-a"],
      ["clin-b"],
      [],
      [],
    );
    assert.equal(bad.eligible, false);
  });
  it("suppresses first contact inside quiet hours", () => {
    // 22:30 Asia/Riyadh = 19:30Z
    assert.equal(
      isQuietHourUtc("2026-09-20T19:30:00.000Z", "Asia/Riyadh", {
        startLocal: "21:00",
        endLocal: "08:00",
      }),
      true,
    );
    assert.equal(
      isQuietHourUtc("2026-09-20T07:00:00.000Z", "Asia/Riyadh", {
        startLocal: "21:00",
        endLocal: "08:00",
      }),
      false,
    );
  });
});

describe("M031 fairness ordering", () => {
  function entry(id: string, band: "urgent-clinical" | "routine", at: string, seq: number): EnrollmentRecord {
    return {
      id, tenantId: "t1", patientId: "p-" + id, originalAppointmentId: "appt-" + id,
      serviceId: "svc", typeId: "type",
      window: { timeZone: "Asia/Riyadh", windows: [{ startLocal: "08:00", endLocal: "09:00" }] },
      clinicians: { required: [], alternates: [] },
      locations: { required: [], alternates: [] },
      accessibilityNeeds: [], language: "ar", consents: [{ channel: "sms", consented: true }],
      allowAutoSwitch: false, idempotencyKey: "k-" + id,
      priorityBand: band, priorityReason: "reason",
      enrolledAtUtc: at, sequence: seq, state: "waiting",
    };
  }
  it("orders by band then FIFO and preserves original appointment id", () => {
    const lateUrgent = entry("u", "urgent-clinical", "2026-09-20T10:00:00Z", 3);
    const earlyRoutine = entry("r1", "routine", "2026-09-20T08:00:00Z", 1);
    const laterRoutine = entry("r2", "routine", "2026-09-20T09:00:00Z", 2);
    const sorted = sortWaitlist([laterRoutine, earlyRoutine, lateUrgent]);
    assert.deepEqual(sorted.map((e) => e.id), ["u", "r1", "r2"]);
    assert.equal(compareEnrollments(earlyRoutine, laterRoutine) < 0, true);
    for (const e of sorted) assert.ok(e.originalAppointmentId.startsWith("appt-"));
  });
});
