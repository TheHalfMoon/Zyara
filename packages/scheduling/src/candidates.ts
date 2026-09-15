// Hybrid candidate generation (M014): read-only and non-authoritative.
// Precompute what is patient-independent (weekly rules, blocks, alignment);
// dynamically recheck what is authoritative (versions, occupancy, policy) at
// commit time (M015 owns the ledger). A cached candidate never books.
import type { ResourceRecipe, ResourceUnit } from "./resources.js";
import { qualifies } from "./resources.js";
import type { ScheduleVersion } from "./schedules.js";
import { statusForDate, bufferedFitsOpen } from "./schedules.js";
import {
  addDays, addMinutesCivil, civilFromUtc, minutesOf, resolveLocalToUtc,
} from "./time.js";

export interface BusyInterval {
  unitId: string;
  /** Half-open UTC ISO instants [start, end). */
  startUtc: string;
  endUtc: string;
}

export interface CandidateQuery {
  tenantId: string;
  serviceId: string;
  typeId: string;
  branchId: string | null;
  /** First civil date (inclusive) in the schedule zone. */
  fromDate: string;
  /** Last civil date (inclusive) in the schedule zone. */
  toDate: string;
  /** Authoritative now (UTC ISO): anchors notice/horizon/cutoff. */
  nowUtcIso: string;
  /** Explicit fold choice (offset minutes) when the caller disambiguates. */
  foldOffsetMin?: number;
}

export interface CandidateSlot {
  slot: string;
  unitIds: string[];
}

export interface AvailabilityCandidate {
  tenantId: string;
  serviceId: string;
  typeId: string;
  branchId: string | null;
  scheduleId: string;
  scheduleVersion: number;
  recipeId: string;
  recipeVersion: number;
  durationMin: number;
  timeZone: string;
  date: string;
  time: string;
  startUtc: string;
  endUtc: string;
  offsetMin: number;
  offsetLabel: string;
  foldDisambiguated: boolean;
  slots: CandidateSlot[];
  /** Stable token binding versions + instant; commit rechecks it, never trusts it. */
  token: string;
  observedAt: string;
}

export type SkipReason =
  | "BLOCKED_DAY" | "DST_GAP" | "DST_FOLD_NEEDS_CHOICE" | "OFFSET_CHOICE_INVALID"
  | "BELOW_MIN_NOTICE" | "PAST_CUTOFF" | "BEYOND_HORIZON" | "OUTSIDE_EFFECTIVE"
  | "NO_RESOURCE_FIT" | "DAY_LIMIT" | "BUFFER_OVERFLOW";

export interface CandidateResult {
  candidates: AvailabilityCandidate[];
  scannedDays: number;
  startsEvaluated: number;
  skipped: Partial<Record<SkipReason, number>>;
  /** True when maxCandidates truncated output: narrow the window, do not page past truth. */
  truncated: boolean;
  elapsedMs: number;
}

export interface RecheckInput {
  busy: BusyInterval[];
  nowUtcIso: string;
  currentScheduleVersion: number;
  currentRecipeVersion: number;
  currentDurationMin: number;
  foldOffsetMin?: number;
}

export type RecheckVerdict =
  | { ok: true; candidate: AvailabilityCandidate }
  | { ok: false; code: "STALE_VERSION" | "DURATION_CHANGED" | "NO_LONGER_FITS" | "POLICY_FAILED" };

export function candidateToken(parts: {
  tenantId: string; serviceId: string; typeId: string; scheduleId: string;
  scheduleVersion: number; recipeId: string; recipeVersion: number;
  startUtc: string; endUtc: string;
}): string {
  const raw = [
    parts.tenantId, parts.serviceId, parts.typeId, parts.scheduleId,
    `sched-v${parts.scheduleVersion}`, parts.recipeId, `recipe-v${parts.recipeVersion}`,
    parts.startUtc, parts.endUtc,
  ].join("|");
  let h = 2166136261;
  for (let i = 0; i < raw.length; i += 1) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `cand_${(h >>> 0).toString(16).padStart(8, "0")}`;
}

function bump(skipped: Partial<Record<SkipReason, number>>, reason: SkipReason): void {
  skipped[reason] = (skipped[reason] ?? 0) + 1;
}

function startLabel(start: number): string {
  return `${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`;
}

// Pick deterministic units per recipe slot; buffers must fit the opening.
function fitResources(
  recipe: ResourceRecipe,
  units: ResourceUnit[],
  branchId: string | null,
  startUtc: string,
  endCivil: { date: string; time: string },
  zone: string,
): CandidateSlot[] | null {
  void branchId;
  void startUtc;
  void endCivil;
  void zone;
  const byId = [...units].sort((a, b) => (a.id < b.id ? -1 : 1));
  const used = new Set<string>();
  const slots: CandidateSlot[] = [];
  for (const item of recipe.items) {
    const picked: string[] = [];
    for (const u of byId) {
      if (picked.length >= item.quantity) break;
      if (used.has(u.id) || !u.active) continue;
      if (qualifies(u, item)) {
        picked.push(u.id);
        used.add(u.id);
      }
    }
    if (picked.length < item.quantity) return null;
    if (!item.substitutable && picked.some((id) => {
      const u = byId.find((x) => x.id === id);
      return !u || !item.kindsAllowed.slice(0, 1).includes(u.kind);
    })) {
      return null;
    }
    slots.push({ slot: item.slot, unitIds: picked });
  }
  return slots;
}

// Generate patient-independent candidates: bounded expansion, blocks,
// alignment, buffers, notice/horizon/cutoff, multi-resource fit.
export function generateCandidates(
  schedule: ScheduleVersion,
  recipe: ResourceRecipe,
  units: ResourceUnit[],
  query: CandidateQuery,
): CandidateResult {
  const t0 = Date.now();
  const skipped: Partial<Record<SkipReason, number>> = {};
  const candidates: AvailabilityCandidate[] = [];
  let scannedDays = 0;
  let startsEvaluated = 0;
  let truncated = false;

  const nowMs = Date.parse(query.nowUtcIso);
  if (Number.isNaN(nowMs)) throw new Error("NOW_UTC_INVALID");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(query.fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(query.toDate)) {
    throw new Error("QUERY_RANGE_INVALID");
  }
  if (query.toDate < query.fromDate) throw new Error("QUERY_RANGE_EMPTY");
  if (query.tenantId !== schedule.tenantId) throw new Error("TENANT_MISMATCH");
  if (schedule.serviceId !== query.serviceId) throw new Error("SERVICE_MISMATCH");
  if (schedule.branchId !== null && schedule.branchId !== query.branchId) throw new Error("BRANCH_MISMATCH");
  if (recipe.serviceId !== query.serviceId || recipe.typeId !== query.typeId) throw new Error("RECIPE_MISMATCH");
  if (recipe.durationMin <= 0) throw new Error("RECIPE_DURATION_INVALID");

  const policy = schedule.policy;
  const nowCivil = civilFromUtc(schedule.timeZone, query.nowUtcIso);
  const horizonEnd = addDays(nowCivil.date, policy.horizonDays);
  const perDay = new Map<string, number>();

  let date = query.fromDate;
  for (;;) {
    if (date > query.toDate || date > horizonEnd) break;
    scannedDays += 1;
    if (date < schedule.effectiveFrom || (schedule.effectiveTo !== null && date > schedule.effectiveTo)) {
      bump(skipped, "OUTSIDE_EFFECTIVE");
      date = addDays(date, 1);
      continue;
    }
    const status = statusForDate(schedule, date);
    if (status.kind === "blocked") {
      bump(skipped, "BLOCKED_DAY");
      date = addDays(date, 1);
      continue;
    }
    if ((perDay.get(date) ?? 0) >= (policy.perDayLimit ?? Number.MAX_SAFE_INTEGER)) {
      bump(skipped, "DAY_LIMIT");
      date = addDays(date, 1);
      continue;
    }
    for (const open of status.intervals) {
      const openStart = minutesOf(open.start);
      const openEnd = minutesOf(open.end);
      const first = Math.ceil(openStart / policy.slotAlignmentMin) * policy.slotAlignmentMin;
      for (let start = first; start + recipe.durationMin <= openEnd; start += policy.slotAlignmentMin) {
        if (!bufferedFitsOpen(open, start, start + recipe.durationMin, policy.prepMin, policy.cleanupMin)) {
          bump(skipped, "BUFFER_OVERFLOW");
          continue;
        }
        const label = startLabel(start);
        const resolved = resolveLocalToUtc(
          schedule.timeZone, { date, time: label }, { offsetMin: query.foldOffsetMin },
        );
        startsEvaluated += 1;
        if (resolved.status === "gap") {
          bump(skipped, "DST_GAP");
          continue;
        }
        if (resolved.status === "ambiguous") {
          bump(skipped, "DST_FOLD_NEEDS_CHOICE");
          continue;
        }
        const startMs = Date.parse(resolved.point.utcIso);
        if (startMs - nowMs < policy.minNoticeMin * 60000) {
          bump(skipped, "BELOW_MIN_NOTICE");
          continue;
        }
        const endCivil = addMinutesCivil({ date, time: label }, recipe.durationMin);
        if (endCivil.date > horizonEnd) {
          bump(skipped, "BEYOND_HORIZON");
          continue;
        }
        if (date === nowCivil.date && nowCivil.time >= policy.sameDayCutoff) {
          bump(skipped, "PAST_CUTOFF");
          continue;
        }
        const fit = fitResources(recipe, units, query.branchId, resolved.point.utcIso, endCivil, schedule.timeZone);
        if (!fit) {
          bump(skipped, "NO_RESOURCE_FIT");
          continue;
        }
        const endResolved = resolveLocalToUtc(schedule.timeZone, endCivil, { offsetMin: query.foldOffsetMin });
        if (endResolved.status !== "ok") {
          bump(skipped, endResolved.status === "gap" ? "DST_GAP" : "DST_FOLD_NEEDS_CHOICE");
          continue;
        }
        const cand: AvailabilityCandidate = {
          tenantId: query.tenantId, serviceId: query.serviceId, typeId: query.typeId,
          branchId: query.branchId, scheduleId: schedule.id, scheduleVersion: schedule.version,
          recipeId: recipe.id, recipeVersion: recipe.version, durationMin: recipe.durationMin,
          timeZone: schedule.timeZone, date, time: label,
          startUtc: resolved.point.utcIso, endUtc: endResolved.point.utcIso,
          offsetMin: resolved.point.offsetMin, offsetLabel: resolved.point.offsetLabel,
          foldDisambiguated: resolved.point.disambiguated,
          slots: fit,
          token: candidateToken({
            tenantId: query.tenantId, serviceId: query.serviceId, typeId: query.typeId,
            scheduleId: schedule.id, scheduleVersion: schedule.version,
            recipeId: recipe.id, recipeVersion: recipe.version,
            startUtc: resolved.point.utcIso, endUtc: endResolved.point.utcIso,
          }),
          observedAt: query.nowUtcIso,
        };
        candidates.push(cand);
        perDay.set(date, (perDay.get(date) ?? 0) + 1);
        if (candidates.length >= policy.maxCandidates) {
          truncated = true;
          return { candidates, scannedDays, startsEvaluated, skipped, truncated, elapsedMs: Date.now() - t0 };
        }
        if ((perDay.get(date) ?? 0) >= (policy.perDayLimit ?? Number.MAX_SAFE_INTEGER)) {
          bump(skipped, "DAY_LIMIT");
          break;
        }
      }
    }
    date = addDays(date, 1);
  }
  return { candidates, scannedDays, startsEvaluated, skipped, truncated, elapsedMs: Date.now() - t0 };
}

// Half-open UTC overlap: [aStart, aEnd) vs [bStart, bEnd).
export function overlapsUtc(aStartMs: number, aEndMs: number, bStartMs: number, bEndMs: number): boolean {
  return aStartMs < bEndMs && bStartMs < aEndMs;
}

/** Buffered occupancy window [start-prep, end+cleanup) in UTC milliseconds. */
export function bufferedWindowUtc(startUtcIso: string, endUtcIso: string, prepMin: number, cleanupMin: number): {
  startMs: number; endMs: number;
} {
  const s = Date.parse(startUtcIso);
  const e = Date.parse(endUtcIso);
  if (Number.isNaN(s) || Number.isNaN(e) || !(e > s)) throw new Error("CANDIDATE_INTERVAL_INVALID");
  return { startMs: s - prepMin * 60000, endMs: e + cleanupMin * 60000 };
}

/**
 * Authoritative occupancy check: every assigned unit must be free across the
 * full buffered window. Native reservations and authoritative external busy
 * intervals are both represented as BusyInterval rows.
 */
export function fitsBusy(slots: CandidateSlot[], bufStartMs: number, bufEndMs: number, busy: BusyInterval[]): boolean {
  for (const slot of slots) {
    for (const unitId of slot.unitIds) {
      for (const b of busy) {
        if (b.unitId !== unitId) continue;
        const bs = Date.parse(b.startUtc);
        const be = Date.parse(b.endUtc);
        if (Number.isNaN(bs) || Number.isNaN(be) || !(be > bs)) throw new Error("BUSY_INTERVAL_INVALID");
        if (overlapsUtc(bufStartMs, bufEndMs, bs, be)) return false;
      }
    }
  }
  return true;
}

/**
 * Patient-free projection cache key. Binds tenant/service/type/branch,
 * schedule + recipe versions, requested range and fold choice. Never carries
 * patient identifiers, symptoms or insurer member IDs (M013 stays private).
 */
export function projectionCacheKey(parts: {
  tenantId: string; serviceId: string; typeId: string; branchId: string | null;
  scheduleId: string; scheduleVersion: number; recipeId: string; recipeVersion: number;
  fromDate: string; toDate: string; foldOffsetMin?: number;
}): string {
  return [
    parts.tenantId, parts.serviceId, parts.typeId, parts.branchId ?? "-",
    parts.scheduleId, `sched-v${parts.scheduleVersion}`,
    parts.recipeId, `recipe-v${parts.recipeVersion}`,
    parts.fromDate, parts.toDate,
    parts.foldOffsetMin === undefined ? "fold-auto" : `fold-${parts.foldOffsetMin}`,
  ].join("|");
}

/** Privacy-safe telemetry: counts, versions and latency only. Never clinical content. */
export function telemetryForCandidates(result: CandidateResult): {
  candidateCount: number; scannedDays: number; startsEvaluated: number;
  skipped: Partial<Record<SkipReason, number>>; truncated: boolean; elapsedMs: number;
} {
  return {
    candidateCount: result.candidates.length,
    scannedDays: result.scannedDays,
    startsEvaluated: result.startsEvaluated,
    skipped: { ...result.skipped },
    truncated: result.truncated,
    elapsedMs: result.elapsedMs,
  };
}

/**
 * Authoritative recheck: the gate every booking commit (M015) must call.
 * A cached candidate is never authority. Stale versions, a changed duration,
 * newly arrived occupancy, or a policy failure all reject the candidate and
 * require fresh generation — never a silent booking.
 */
export function recheckCandidate(
  schedule: ScheduleVersion,
  recipe: ResourceRecipe,
  candidate: AvailabilityCandidate,
  input: RecheckInput,
): RecheckVerdict {
  if (candidate.scheduleVersion !== input.currentScheduleVersion) {
    return { ok: false, code: "STALE_VERSION" };
  }
  if (candidate.recipeVersion !== input.currentRecipeVersion) {
    return { ok: false, code: "STALE_VERSION" };
  }
  if (candidate.scheduleVersion !== schedule.version || candidate.recipeVersion !== recipe.version) {
    return { ok: false, code: "STALE_VERSION" };
  }
  if (recipe.durationMin !== candidate.durationMin || input.currentDurationMin !== candidate.durationMin) {
    return { ok: false, code: "DURATION_CHANGED" };
  }
  const policy = schedule.policy;
  const startMs = Date.parse(candidate.startUtc);
  const endMs = Date.parse(candidate.endUtc);
  const nowMs = Date.parse(input.nowUtcIso);
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || Number.isNaN(nowMs)) {
    return { ok: false, code: "POLICY_FAILED" };
  }
  if (startMs - nowMs < policy.minNoticeMin * 60000) return { ok: false, code: "POLICY_FAILED" };
  if (candidate.date < schedule.effectiveFrom ||
    (schedule.effectiveTo !== null && candidate.date > schedule.effectiveTo)) {
    return { ok: false, code: "POLICY_FAILED" };
  }
  const status = statusForDate(schedule, candidate.date);
  if (status.kind === "blocked") return { ok: false, code: "NO_LONGER_FITS" };
  const win = bufferedWindowUtc(candidate.startUtc, candidate.endUtc, policy.prepMin, policy.cleanupMin);
  if (!fitsBusy(candidate.slots, win.startMs, win.endMs, input.busy)) {
    return { ok: false, code: "NO_LONGER_FITS" };
  }
  return { ok: true, candidate };
}

/** Invalidation event payload (string IDs only; goes through the M004 outbox). */
export function invalidationPayload(parts: {
  tenantId: string; scheduleId: string; scheduleVersion: number;
  recipeId?: string; recipeVersion?: number; reason: string;
}): Record<string, string> {
  const payload: Record<string, string> = {
    tenant: parts.tenantId,
    schedule: parts.scheduleId,
    scheduleVersion: String(parts.scheduleVersion),
    reason: parts.reason,
  };
  if (parts.recipeId !== undefined) payload["recipe"] = parts.recipeId;
  if (parts.recipeVersion !== undefined) payload["recipeVersion"] = String(parts.recipeVersion);
  return payload;
}





