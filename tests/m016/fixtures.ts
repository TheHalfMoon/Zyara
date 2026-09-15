// M016 shared synthetic fixtures (no tests in this module).
import type { BookRequest } from "@zyara/scheduling";

export const T0 = "2026-10-01T06:00:00.000Z"; // 09:00 Riyadh
export const SLOT_A = { startUtc: "2026-10-01T07:00:00.000Z", endUtc: "2026-10-01T07:40:00.000Z" };
export const SLOT_B = { startUtc: "2026-10-01T08:00:00.000Z", endUtc: "2026-10-01T08:40:00.000Z" };

export function bookReq(over: Partial<BookRequest> = {}): BookRequest {
  return {
    tenantId: "t1",
    actorId: "actor-1",
    patientId: "patient-1",
    idempotencyKey: "book-key-1",
    holdId: "hold-1",
    items: [{ unitId: "room-1", ...SLOT_A }],
    candidate: {
      serviceId: "derm",
      typeId: "derm-init",
      branchId: "b1",
      scheduleId: "sched-1",
      scheduleVersion: 1,
      recipeId: "derm-init",
      recipeVersion: 1,
      durationMin: 40,
      ...SLOT_A,
      token: "cand_00000001",
    },
    confirmation: {
      acceptedScheduleVersion: 1,
      acceptedRecipeVersion: 1,
      acceptedStartUtc: SLOT_A.startUtc,
      acceptedEndUtc: SLOT_A.endUtc,
      acceptedDurationMin: 40,
      challenge: "SLOT-7A",
    },
    eligibilityOutcome: "ALLOW",
    evaluatedRuleVersions: ["age:v1"],
    timeZone: "Asia/Riyadh",
    ...over,
  };
}

export function visibleEmpty(nextId = "op-1"): {
  byKey: null; pendingForPatientService: number; duplicateAppointmentId: string | null; nextId: string;
} {
  return { byKey: null, pendingForPatientService: 0, duplicateAppointmentId: null, nextId };
}

export function commitChecksOk(over: Partial<import("@zyara/scheduling").CommitChecks> = {}): import("@zyara/scheduling").CommitChecks {
  return {
    holdState: "held_valid",
    eligibilityOutcome: "ALLOW",
    currentScheduleVersion: 1,
    currentRecipeVersion: 1,
    currentDurationMin: 40,
    occupancyFree: true,
    patientDuplicateAppointmentId: null,
    ...over,
  };
}
