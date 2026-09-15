import type { Consumer, EventEnvelope } from "@zyara/events";

// In-memory projection cache for the worker (M014). Keys are patient-free
// (tenant/service/type/branch + schedule/recipe versions + range); values are
// opaque candidate payloads keyed by that binding. A cached entry is never
// booking authority: the commit path (M015) rechecks versions, duration,
// policy and occupancy against current truth.
const projectionCache = new Map<string, { storedAtMs: number; payload: string }>();

export function projectionCacheKeyFor(event: EventEnvelope): string | null {
  if (event.code !== "projection.invalidated") return null;
  const p = event.payload;
  const schedule = p["schedule"];
  const version = p["scheduleVersion"];
  if (!schedule || !version) return null;
  return `${event.tenant}|${schedule}|sched-v${version}`;
}

export function storeProjection(cacheKey: string, payload: string, nowMs: number): void {
  projectionCache.set(cacheKey, { storedAtMs: nowMs, payload });
}

export function readProjection(cacheKey: string): string | null {
  return projectionCache.get(cacheKey)?.payload ?? null;
}

/** Invalidate every cached projection row for a schedule version binding. */
export function invalidateProjectionsFor(event: EventEnvelope): number {
  const prefix = projectionCacheKeyFor(event);
  if (!prefix) return 0;
  let removed = 0;
  for (const key of [...projectionCache.keys()]) {
    if (key === prefix || key.startsWith(`${prefix}|`)) {
      projectionCache.delete(key);
      removed += 1;
    }
  }
  return removed;
}

export function projectionCacheSize(): number {
  return projectionCache.size;
}

export function clearProjectionCache(): void {
  projectionCache.clear();
}

// Scoped consumer registry (M004). Consumers declare codes + tenants;
// dispatch enforces tenant scoping so cross-tenant routing cannot leak.
export const consumers: Consumer[] = [
  {
    name: "audit-writer",
    codes: ["membership.changed", "op.committed", "op.conflicted"],
    tenants: [],
    handle: async () => "ack",
  },
  {
    name: "projection-invalidator",
    codes: ["projection.invalidated"],
    tenants: [],
    handle: async (event) => {
      // String-ID payloads only (M004 envelope rule): tenant + schedule +
      // versions + reason. Invalid bindings reject so poison events quarantine.
      const p = event.payload;
      if (!p["schedule"] || !p["scheduleVersion"] || !p["reason"]) return "reject";
      invalidateProjectionsFor(event);
      return "ack";
    },
  },
];

export function consumersFor(tenant: string): Consumer[] {
  return consumers.filter((c) => c.tenants.length === 0 || c.tenants.includes(tenant));
}

