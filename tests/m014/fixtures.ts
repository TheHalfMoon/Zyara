// M014 shared synthetic fixtures (no tests in this module).
import type { ScheduleDraft, CandidateQuery, ResourceRecipe } from "@zyara/scheduling";
import type { ResourceUnit } from "@zyara/scheduling";

export const NOW = "2026-10-01T06:00:00.000Z"; // 09:00 Riyadh

export function draft(): ScheduleDraft {
  return {
    id: "sched-1",
    tenantId: "t1",
    serviceId: "derm",
    branchId: "b1",
    timeZone: "Asia/Riyadh",
    effectiveFrom: "2026-10-01",
    effectiveTo: null,
    weekly: [
      { weekday: 4, opens: [{ start: "09:00", end: "13:00" }] },
      { weekday: 5, opens: [{ start: "09:00", end: "13:00" }] },
    ],
    exceptions: [],
    policy: {
      minNoticeMin: 60, horizonDays: 30, sameDayCutoff: "12:00",
      slotAlignmentMin: 20, prepMin: 5, cleanupMin: 5,
      perDayLimit: null, maxCandidates: 200,
    },
  };
}

export function recipe40(): Omit<ResourceRecipe, "version"> {
  return {
    id: "derm-init", serviceId: "derm", typeId: "t-init", durationMin: 40,
    items: [
      {
        slot: "clinician", kindsAllowed: ["practitioner"], requiredQualifications: ["DERM"],
        quantity: 1, substitutable: false, durationMin: 40,
      },
      {
        slot: "room", kindsAllowed: ["room"], requiredQualifications: ["EXAM_ROOM"],
        quantity: 1, substitutable: false, durationMin: 40,
      },
    ],
  };
}

export function units(): ResourceUnit[] {
  return [
    { id: "doc-1", kind: "practitioner", qualifications: ["DERM"], capacity: 1, active: true },
    { id: "room-1", kind: "room", qualifications: ["EXAM_ROOM"], capacity: 1, active: true },
  ];
}

export function query(over: Partial<CandidateQuery> = {}): CandidateQuery {
  return {
    tenantId: "t1", serviceId: "derm", typeId: "t-init", branchId: "b1",
    fromDate: "2026-10-01", toDate: "2026-10-03", nowUtcIso: NOW, ...over,
  };
}
