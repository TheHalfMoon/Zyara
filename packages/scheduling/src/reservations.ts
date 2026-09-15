// Atomic resource holds with expiry invariants (M015).
// Double-booking protection lives in PostgreSQL exclusion constraints; this
// module is the typed state machine around that authority. No Redis-only
// lock exists here; no now()-based index predicate; DB time rules expiry.
// An expired hold cannot be redeemed even when the expiry worker never ran:
// redeem() reaps inline against injected DB time before any other check.

export type HoldState =
  | "proposed"
  | "held"
  | "expired"
  | "committed"
  | "cancelled";

export const TERMINAL_HOLD_STATES: readonly HoldState[] = ["expired", "committed", "cancelled"];

export function isTerminalHoldState(state: HoldState): boolean {
  return (TERMINAL_HOLD_STATES as readonly string[]).includes(state);
}

export interface HoldItemRequest {
  unitId: string;
  /** Half-open UTC ISO instants [start, end). Equal start/end is invalid. */
  startUtc: string;
  endUtc: string;
}

export interface HoldRequest {
  tenantId: string;
  actorId: string;
  serviceId: string;
  /** Client-supplied idempotency key, opaque, max 128 chars. */
  idempotencyKey: string;
  items: HoldItemRequest[];
  scheduleId: string;
  scheduleVersion: number;
  recipeId: string;
  recipeVersion: number;
  /** Requested hold lifetime in minutes. */
  ttlMin: number;
  maxExtensions: number;
}

export interface HoldRecord {
  id: string;
  tenantId: string;
  actorId: string;
  serviceId: string;
  idempotencyKey: string;
  /** Stable digest of the material request; replays must match it. */
  requestDigest: string;
  state: HoldState;
  items: HoldItemRequest[];
  /** Ascending unit lock order assigned at propose time. */
  lockOrder: string[];
  scheduleId: string;
  scheduleVersion: number;
  recipeId: string;
  recipeVersion: number;
  ttlMin: number;
  maxExtensions: number;
  extensionsUsed: number;
  createdAtDb: string;
  heldAtDb: string | null;
  expiresAtDb: string | null;
  decidedAtDb: string | null;
  /** Machine reason for the last transition, e.g. HOLD_EXPIRED. */
  lastReason: string | null;
}

export interface HoldCaps {
  maxItemsPerHold: number;
  minTtlMin: number;
  maxTtlMin: number;
  /** Expiry can never extend beyond created + maxTotalMin. */
  maxTotalMin: number;
  maxExtensions: number;
  /** Abuse guard: active holds per verified actor/service. */
  maxActivePerActorService: number;
}

/** Pinned pilot caps. Raised only by accountable decision, never by callers. */
export const DEFAULT_HOLD_CAPS: HoldCaps = {
  maxItemsPerHold: 8,
  minTtlMin: 2,
  maxTtlMin: 30,
  maxTotalMin: 60,
  maxExtensions: 2,
  maxActivePerActorService: 5,
};

/** Stable digest of the material request: distinguishes replay from change. */
export function digestHoldRequest(req: {
  tenantId: string; actorId: string; serviceId: string;
  items: HoldItemRequest[]; scheduleId: string; scheduleVersion: number;
  recipeId: string; recipeVersion: number; ttlMin: number;
}): string {
  const canon = JSON.stringify({
    tenantId: req.tenantId,
    actorId: req.actorId,
    serviceId: req.serviceId,
    items: [...req.items]
      .sort((a, b) => (a.unitId < b.unitId ? -1 : 1))
      .map((i) => [i.unitId, i.startUtc, i.endUtc]),
    scheduleId: req.scheduleId,
    scheduleVersion: req.scheduleVersion,
    recipeId: req.recipeId,
    recipeVersion: req.recipeVersion,
    ttlMin: req.ttlMin,
  });
  let h = 2166136261;
  for (let i = 0; i < canon.length; i += 1) {
    h ^= canon.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `holdreq_${(h >>> 0).toString(16).padStart(8, "0")}`;
}

function assertInterval(item: HoldItemRequest): { startMs: number; endMs: number } {
  const s = Date.parse(item.startUtc);
  const e = Date.parse(item.endUtc);
  if (Number.isNaN(s) || Number.isNaN(e)) throw new Error("HOLD_INTERVAL_INVALID");
  if (!(e > s)) throw new Error("HOLD_INTERVAL_EMPTY");
  if (!item.unitId || item.unitId.length > 128) throw new Error("HOLD_UNIT_INVALID");
  return { startMs: s, endMs: e };
}

/** Deterministic resource lock order: ascending unit IDs, deduped. */
export function lockOrderFor(items: HoldItemRequest[]): string[] {
  return [...new Set(items.map((i) => i.unitId))].sort();
}

export function validateHoldRequest(req: HoldRequest, caps: HoldCaps = DEFAULT_HOLD_CAPS): void {
  if (!req.tenantId || !req.actorId || !req.serviceId) throw new Error("HOLD_PARTY_INVALID");
  if (!req.idempotencyKey || req.idempotencyKey.length > 128) throw new Error("HOLD_KEY_INVALID");
  if (req.items.length < 1 || req.items.length > caps.maxItemsPerHold) throw new Error("HOLD_ITEMS_INVALID");
  for (const item of req.items) assertInterval(item);
  if (!Number.isInteger(req.ttlMin) || req.ttlMin < caps.minTtlMin || req.ttlMin > caps.maxTtlMin) {
    throw new Error("HOLD_TTL_INVALID");
  }
  if (!Number.isInteger(req.maxExtensions) || req.maxExtensions < 0 || req.maxExtensions > caps.maxExtensions) {
    throw new Error("HOLD_EXTENSIONS_INVALID");
  }
}

/** Half-open UTC overlap: [aStart,aEnd) vs [bStart,bEnd). Shared with M014. */
export function holdOverlapsUtc(aStartMs: number, aEndMs: number, bStartMs: number, bEndMs: number): boolean {
  return aStartMs < bEndMs && bStartMs < aEndMs;
}

export type ProposeOutcome =
  | { ok: true; hold: HoldRecord; replayed: boolean }
  | { ok: false; code: "IDEMPOTENCY_CONFLICT" | "HOLD_LIMIT_REACHED"; existingId?: string };

/**
 * Propose a hold: pure decision step over the visible ledger state.
 * - Same key + same digest -> replay the existing hold (no new allocation).
 * - Same key + different digest -> conflict, never a second allocation.
 * - Per actor/service active-hold abuse cap enforced before allocating.
 * Callers then persist the returned hold and its items in ONE transaction
 * with the exclusion constraint as the final arbiter (see migration 015).
 */
export function proposeHold(
  req: HoldRequest,
  nowDbIso: string,
  visible: { byKey: HoldRecord | null; activeForActorService: number; nextId: string },
  caps: HoldCaps = DEFAULT_HOLD_CAPS,
): ProposeOutcome {
  validateHoldRequest(req, caps);
  if (visible.byKey) {
    const existing = visible.byKey;
    const digest = digestHoldRequest(req);
    if (existing.requestDigest === digest) return { ok: true, hold: existing, replayed: true };
    return { ok: false, code: "IDEMPOTENCY_CONFLICT", existingId: existing.id };
  }
  if (visible.activeForActorService >= caps.maxActivePerActorService) {
    return { ok: false, code: "HOLD_LIMIT_REACHED" };
  }
  const nowMs = Date.parse(nowDbIso);
  if (Number.isNaN(nowMs)) throw new Error("DB_TIME_INVALID");
  const createdAtDb = new Date(nowMs).toISOString();
  const hold: HoldRecord = {
    id: visible.nextId,
    tenantId: req.tenantId,
    actorId: req.actorId,
    serviceId: req.serviceId,
    idempotencyKey: req.idempotencyKey,
    requestDigest: digestHoldRequest(req),
    state: "held",
    items: req.items.map((i) => ({ ...i })),
    lockOrder: lockOrderFor(req.items),
    scheduleId: req.scheduleId,
    scheduleVersion: req.scheduleVersion,
    recipeId: req.recipeId,
    recipeVersion: req.recipeVersion,
    ttlMin: req.ttlMin,
    maxExtensions: req.maxExtensions,
    extensionsUsed: 0,
    createdAtDb,
    heldAtDb: createdAtDb,
    expiresAtDb: new Date(nowMs + req.ttlMin * 60000).toISOString(),
    decidedAtDb: null,
    lastReason: "HOLD_CREATED",
  };
  return { ok: true, hold, replayed: false };
}

/**
 * Inline expiry sweep: reap every held record whose expires_at <= DB now.
 * Runs inside the commit transaction (never worker-only): returns the IDs to
 * mark expired plus the event rows to append. DB time only — never the
 * application clock, never a now()-based index predicate.
 */
export function sweepExpired(held: HoldRecord[], nowDbIso: string): { expiredIds: string[]; atDb: string } {
  const nowMs = Date.parse(nowDbIso);
  if (Number.isNaN(nowMs)) throw new Error("DB_TIME_INVALID");
  const expiredIds = held
    .filter((h) => h.state === "held" && h.expiresAtDb !== null && Date.parse(h.expiresAtDb) <= nowMs)
    .map((h) => h.id)
    .sort();
  return { expiredIds, atDb: new Date(nowMs).toISOString() };
}

export type RedeemOutcome =
  | { ok: true; hold: HoldRecord }
  | { ok: false; code: "HOLD_EXPIRED" | "HOLD_NOT_HELD" | "HOLD_STALE_VERSION" | "HOLD_TENANT_MISMATCH" };

/**
 * Authoritative redeem gate: the ONLY path from held to committed.
 * Order is load-bearing:
 * 1. inline expiry against DB time FIRST — an expired hold dies here even
 *    when the expiry worker never ran (acceptance 3);
 * 2. state must still be held;
 * 3. versions must match the candidate the holder accepted.
 */
export function redeemHold(
  hold: HoldRecord,
  nowDbIso: string,
  current: { scheduleVersion: number; recipeVersion: number },
): RedeemOutcome {
  const nowMs = Date.parse(nowDbIso);
  if (Number.isNaN(nowMs)) throw new Error("DB_TIME_INVALID");
  if (hold.expiresAtDb !== null && Date.parse(hold.expiresAtDb) <= nowMs) {
    return { ok: false, code: "HOLD_EXPIRED" };
  }
  if (hold.state !== "held") return { ok: false, code: "HOLD_NOT_HELD" };
  if (hold.scheduleVersion !== current.scheduleVersion || hold.recipeVersion !== current.recipeVersion) {
    return { ok: false, code: "HOLD_STALE_VERSION" };
  }
  return {
    ok: true,
    hold: {
      ...hold,
      state: "committed",
      decidedAtDb: new Date(nowMs).toISOString(),
      lastReason: "HOLD_REDEEMED",
    },
  };
}

export type ExtendOutcome =
  | { ok: true; hold: HoldRecord }
  | { ok: false; code: "HOLD_EXPIRED" | "HOLD_NOT_HELD" | "HOLD_EXTENSION_EXHAUSTED" | "HOLD_TOTAL_EXCEEDED" };

/**
 * Bounded extension: the holder may extend while still held and unexpired.
 * Total lifetime can never exceed created + maxTotalMin; used-up extensions
 * reject. Expiry is rechecked first, same as redeem.
 */
export function extendHold(
  hold: HoldRecord,
  nowDbIso: string,
  extraMin: number,
  caps: HoldCaps = DEFAULT_HOLD_CAPS,
): ExtendOutcome {
  const nowMs = Date.parse(nowDbIso);
  if (Number.isNaN(nowMs)) throw new Error("DB_TIME_INVALID");
  if (hold.expiresAtDb !== null && Date.parse(hold.expiresAtDb) <= nowMs) {
    return { ok: false, code: "HOLD_EXPIRED" };
  }
  if (hold.state !== "held") return { ok: false, code: "HOLD_NOT_HELD" };
  if (hold.extensionsUsed >= hold.maxExtensions || hold.extensionsUsed >= caps.maxExtensions) {
    return { ok: false, code: "HOLD_EXTENSION_EXHAUSTED" };
  }
  if (!Number.isInteger(extraMin) || extraMin < 1 || extraMin > caps.maxTtlMin) {
    throw new Error("HOLD_EXTENSION_INVALID");
  }
  const createdMs = Date.parse(hold.createdAtDb);
  const currentExpiryMs = hold.expiresAtDb === null ? nowMs : Date.parse(hold.expiresAtDb);
  const nextExpiry = Math.max(currentExpiryMs, nowMs) + extraMin * 60000;
  if (nextExpiry - createdMs > caps.maxTotalMin * 60000) return { ok: false, code: "HOLD_TOTAL_EXCEEDED" };
  return {
    ok: true,
    hold: {
      ...hold,
      expiresAtDb: new Date(nextExpiry).toISOString(),
      extensionsUsed: hold.extensionsUsed + 1,
      lastReason: "HOLD_EXTENDED",
    },
  };
}

/**
 * All-or-none check for multi-resource holds: every item must be free across
 * its buffered window against the visible active ledger before ANY item is
 * written. The exclusion constraint re-verifies this atomically at INSERT;
 * this function is the pre-check that keeps error messages typed.
 */
export function allItemsFree(
  items: HoldItemRequest[],
  active: HoldItemRequest[],
  prepMin: number,
  cleanupMin: number,
): boolean {
  for (const item of items) {
    const w = assertInterval(item);
    const start = w.startMs - prepMin * 60000;
    const end = w.endMs + cleanupMin * 60000;
    for (const other of active) {
      if (other.unitId !== item.unitId) continue;
      const o = assertInterval(other);
      if (holdOverlapsUtc(start, end, o.startMs, o.endMs)) return false;
    }
  }
  return true;
}

/** Privacy-safe telemetry: counts, versions and codes only. Never clinical. */
export function telemetryForHolds(input: {
  proposed: number; replayed: number; conflicts: number; expired: number;
  redeemed: number; deadlocks: number; versions: string[];
}): {
  proposed: number; replayed: number; conflicts: number; expired: number;
  redeemed: number; deadlocks: number; versions: string[];
} {
  return { ...input, versions: [...input.versions] };
}



