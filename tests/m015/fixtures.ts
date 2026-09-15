// M015 shared synthetic fixtures (no tests in this module).
import type { HoldRequest } from "@zyara/scheduling";

export const T0 = "2026-10-01T06:00:00.000Z"; // 09:00 Riyadh
export const SLOT_A = { startUtc: "2026-10-01T07:00:00.000Z", endUtc: "2026-10-01T07:40:00.000Z" };
export const SLOT_B = { startUtc: "2026-10-01T08:00:00.000Z", endUtc: "2026-10-01T08:40:00.000Z" };

export function holdReq(over: Partial<HoldRequest> = {}): HoldRequest {
  return {
    tenantId: "t1",
    actorId: "actor-1",
    serviceId: "derm",
    idempotencyKey: "key-1",
    items: [{ unitId: "room-1", ...SLOT_A }],
    scheduleId: "sched-1",
    scheduleVersion: 1,
    recipeId: "derm-init",
    recipeVersion: 1,
    ttlMin: 10,
    maxExtensions: 2,
    ...over,
  };
}

export function visibleEmpty(nextId = "hold-1"): {
  byKey: null; activeForActorService: number; nextId: string;
} {
  return { byKey: null, activeForActorService: 0, nextId };
}
