// Versioned recurring schedules (M014).
// A schedule is weekly local-time rules plus dated exceptions, frozen as an
// immutable revision. Hard blocks (block/leave/holiday/closure) always dominate
// opens; conflicting overrides are rejected at authoring, never ordered
// silently. Expansion is bounded by effective dates and the booking horizon.
import { assertValidZone, runtimeTzdbLabel, weekdayOfDate, minutesOf } from "./time.js";

export type ExceptionKind = "open" | "block" | "leave" | "holiday" | "closure";

export const HARD_BLOCK_KINDS: readonly ExceptionKind[] = ["block", "leave", "holiday", "closure"];

export interface DayInterval {
  /** Local wall time HH:MM, minute precision. */
  start: string;
  /** Local wall time HH:MM; must be strictly after start. */
  end: string;
}

export interface WeeklyRule {
  /** 0 = Sunday .. 6 = Saturday. */
  weekday: number;
  opens: readonly DayInterval[];
}

export interface DatedException {
  /** ISO date YYYY-MM-DD in the schedule zone. */
  date: string;
  kind: ExceptionKind;
  /**
   * Wall intervals the exception covers. Omitted on a hard-block kind means
   * the whole day. Omitted on an open kind means closed (rejected at publish).
   */
  intervals?: DayInterval[];
  /** Stable machine code, e.g. "EID_AL_FITR", "SICK_LEAVE". */
  code: string;
  /** Provenance source, e.g. "provider-calendar", "national-holiday-list". */
  source: string;
}

export interface SchedulePolicy {
  minNoticeMin: number;
  /** Provider-configurable horizon; pilot maximum 90 days. */
  horizonDays: number;
  /** Same-day wall cutoff HH:MM: no same-day candidates after this local time. */
  sameDayCutoff: string;
  /** Candidate starts align to this minute grid from local midnight. */
  slotAlignmentMin: number;
  /** Preparation minutes reserved before every appointment on each unit. */
  prepMin: number;
  /** Cleanup minutes reserved after every appointment on each unit. */
  cleanupMin: number;
  /** Optional cap on bookable candidates per civil day. */
  perDayLimit: number | null;
  /** Hard cap on candidates per generation request (combinatorial guard). */
  maxCandidates: number;
}

export interface ScheduleVersion {
  id: string;
  /** Immutable revision, assigned at publish; never mutated afterwards. */
  version: number;
  tenantId: string;
  serviceId: string;
  branchId: string | null;
  timeZone: string;
  /** tzdb provenance label; a tzdb change triggers impact review, never silent moves. */
  tzdb: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  weekly: readonly WeeklyRule[];
  exceptions: readonly DatedException[];
  policy: SchedulePolicy;
}

export type ScheduleDraft = Omit<ScheduleVersion, "version" | "tzdb"> & { tzdb?: string };

function assertIntervals(label: string, intervals: readonly DayInterval[]): DayInterval[] {
  const sorted = [...intervals].sort((a, b) => (a.start < b.start ? -1 : 1));
  for (const iv of sorted) {
    const s = minutesOf(iv.start);
    const e = minutesOf(iv.end);
    if (!(e > s)) throw new Error(`${label}_INTERVAL_INVALID:${iv.start}-${iv.end}`);
  }
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1] as DayInterval;
    const cur = sorted[i] as DayInterval;
    if (minutesOf(cur.start) < minutesOf(prev.end)) throw new Error(`${label}_INTERVAL_OVERLAP`);
  }
  return sorted.map((iv) => ({ ...iv }));
}

function assertPolicy(p: SchedulePolicy): void {
  if (!Number.isInteger(p.minNoticeMin) || p.minNoticeMin < 0) throw new Error("POLICY_NOTICE_INVALID");
  if (!Number.isInteger(p.horizonDays) || p.horizonDays < 1 || p.horizonDays > 90) {
    throw new Error("POLICY_HORIZON_INVALID");
  }
  minutesOf(p.sameDayCutoff);
  if (!Number.isInteger(p.slotAlignmentMin) || p.slotAlignmentMin < 1 || p.slotAlignmentMin > 120) {
    throw new Error("POLICY_ALIGNMENT_INVALID");
  }
  if (p.prepMin < 0 || p.cleanupMin < 0 || !Number.isInteger(p.prepMin) || !Number.isInteger(p.cleanupMin)) {
    throw new Error("POLICY_BUFFER_INVALID");
  }
  if (p.perDayLimit !== null && (!Number.isInteger(p.perDayLimit) || p.perDayLimit < 1)) {
    throw new Error("POLICY_DAY_LIMIT_INVALID");
  }
  if (!Number.isInteger(p.maxCandidates) || p.maxCandidates < 1 || p.maxCandidates > 5000) {
    throw new Error("POLICY_MAX_CANDIDATES_INVALID");
  }
}
export function publishSchedule(draft: ScheduleDraft, prior: readonly ScheduleVersion[]): ScheduleVersion {
  assertValidZone(draft.timeZone);
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(draft.id)) throw new Error("SCHEDULE_ID_INVALID");
  if (draft.effectiveTo !== null && draft.effectiveTo < draft.effectiveFrom) {
    throw new Error("SCHEDULE_EFFECTIVE_INVALID");
  }
  const weekdays = new Set<number>();
  for (const rule of draft.weekly) {
    if (!Number.isInteger(rule.weekday) || rule.weekday < 0 || rule.weekday > 6) {
      throw new Error("SCHEDULE_WEEKDAY_INVALID");
    }
    if (weekdays.has(rule.weekday)) throw new Error("SCHEDULE_WEEKDAY_DUPLICATE");
    weekdays.add(rule.weekday);
    assertIntervals(`WEEKLY_${rule.weekday}`, rule.opens);
  }
  const seenDates = new Map<string, ExceptionKind[]>();
  for (const ex of draft.exceptions) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ex.date)) throw new Error("EXCEPTION_DATE_INVALID");
    weekdayOfDate(ex.date);
    if (ex.code.trim() === "" || ex.code.length > 80) throw new Error("EXCEPTION_CODE_INVALID");
    if (ex.source.trim() === "") throw new Error("EXCEPTION_SOURCE_MISSING");
    const list = seenDates.get(ex.date) ?? [];
    list.push(ex.kind);
    seenDates.set(ex.date, list);
    if (ex.kind === "open") {
      if (!ex.intervals || ex.intervals.length === 0) throw new Error("EXCEPTION_OPEN_EMPTY");
      assertIntervals(`EXCEPTION_${ex.date}`, ex.intervals);
    } else if (ex.intervals !== undefined) {
      assertIntervals(`EXCEPTION_${ex.date}`, ex.intervals);
    }
  }
  // Conflicting overrides are rejected at authoring: two different hard-block
  // kinds on the same date, or an open plus a hard block, must be resolved by
  // the author into one dated record, never ordered silently.
  for (const [date, kinds] of seenDates) {
    const uniq = [...new Set(kinds)];
    if (uniq.length > 1) throw new Error(`EXCEPTION_CONFLICT:${date}`);
  }
  assertPolicy(draft.policy);
  const version = prior.length + 1;
  return Object.freeze({
    ...draft,
    tzdb: draft.tzdb ?? runtimeTzdbLabel(),
    weekly: Object.freeze(draft.weekly.map((r) => ({ ...r, opens: Object.freeze([...r.opens]) }))),
    exceptions: Object.freeze(draft.exceptions.map((e) => ({ ...e }))),
    policy: Object.freeze({ ...draft.policy }),
    version,
  });
}

/** Immutable revision registry: publish appends a frozen new version. */
export class ScheduleRegistry {
  private history = new Map<string, ScheduleVersion[]>();

  publish(draft: ScheduleDraft): ScheduleVersion {
    const prior = this.history.get(draft.id) ?? [];
    const versioned = publishSchedule(draft, prior);
    this.history.set(draft.id, [...prior, versioned]);
    return versioned;
  }

  versions(id: string): readonly ScheduleVersion[] {
    return this.history.get(id) ?? [];
  }

  latest(id: string): ScheduleVersion | null {
    const list = this.history.get(id);
    return list && list.length > 0 ? (list[list.length - 1] as ScheduleVersion) : null;
  }
}

export type DayStatus =
  | { kind: "open"; intervals: DayInterval[] }
  | { kind: "blocked"; blockKind: ExceptionKind; code: string; source: string };

/**
 * Resolve one civil date to its open intervals or its dominating hard block.
 * Weekly rules supply the default; a dated exception replaces the whole day:
 * hard blocks (block/leave/holiday/closure) close the day, an approved open
 * replaces weekly hours for that date.
 */
export function statusForDate(schedule: ScheduleVersion, date: string): DayStatus {
  const ex = schedule.exceptions.find((e) => e.date === date);
  if (ex) {
    if (ex.kind !== "open") {
      return { kind: "blocked", blockKind: ex.kind, code: ex.code, source: ex.source };
    }
    return { kind: "open", intervals: [...(ex.intervals ?? [])] };
  }
  const weekly = schedule.weekly.find((r) => r.weekday === weekdayOfDate(date));
  if (!weekly) return { kind: "blocked", blockKind: "closure", code: "NO_WEEKLY_RULE", source: "schedule" };
  if (weekly.opens.length === 0) {
    return { kind: "blocked", blockKind: "closure", code: "WEEKLY_CLOSED", source: "schedule" };
  }
  return { kind: "open", intervals: [...weekly.opens] };
}

/** True when the buffered block [start-prep, end+cleanup) fits one opening. */
export function bufferedFitsOpen(
  open: DayInterval,
  startMin: number,
  endMin: number,
  prepMin: number,
  cleanupMin: number,
): boolean {
  return startMin - prepMin >= minutesOf(open.start) && endMin + cleanupMin <= minutesOf(open.end);
}

export function formatGregorianDisplay(date: string, time: string, timeZone: string): string {
  return `${date} ${time} (${timeZone})`;
}

/** Labeled Hijri display: never parsed, always paired with the Gregorian date. */
export function formatHijriDisplay(date: string): string {
  try {
    const fmt = new Intl.DateTimeFormat("ar-SA-u-ca-islamic", {
      day: "numeric", month: "long", year: "numeric",
    });
    return fmt.format(new Date(`${date}T00:00:00Z`));
  } catch {
    return "";
  }
}

