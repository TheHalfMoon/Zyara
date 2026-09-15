// Civil-time engine for scheduling (M014).
// Recurrence is authored in LOCAL time; committed truth is stored as UTC plus
// the IANA zone, civil time, offset and tzdb version. This module never invents
// time: DST gaps are rejected, folds require an explicit offset choice, and
// civil time is never silently altered.

export interface CivilPoint {
  /** ISO calendar date YYYY-MM-DD in the schedule zone. */
  date: string;
  /** Local wall time HH:MM (24h, minute precision). */
  time: string;
}

export interface ResolvedPoint {
  utcIso: string;
  offsetMin: number;
  offsetLabel: string;
  /** True only when the caller disambiguated a fold explicitly. */
  disambiguated: boolean;
}

export type LocalResolution =
  | { status: "ok"; point: ResolvedPoint }
  | { status: "ambiguous"; reason: "DST_FOLD"; options: ResolvedPoint[] }
  | { status: "gap"; reason: "DST_GAP"; nearestValidLocal: CivilPoint };

export interface CivilFromUtc extends CivilPoint {
  offsetMin: number;
  offsetLabel: string;
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Cached formatters per zone: stateless w.r.t. time, safe to reuse.
const fmtCache = new Map<string, { probe: Intl.DateTimeFormat; civil: Intl.DateTimeFormat }>();

function fmts(timeZone: string): { probe: Intl.DateTimeFormat; civil: Intl.DateTimeFormat } {
  const hit = fmtCache.get(timeZone);
  if (hit) return hit;
  let probe: Intl.DateTimeFormat;
  let civil: Intl.DateTimeFormat;
  try {
    probe = new Intl.DateTimeFormat("en-US", {
      timeZone, hour12: false, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    civil = new Intl.DateTimeFormat("en-CA", {
      timeZone, hour12: false, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
    probe.format(new Date(0));
  } catch {
    throw new Error(`UNKNOWN_TIME_ZONE:${timeZone}`);
  }
  const pair = { probe, civil };
  fmtCache.set(timeZone, pair);
  return pair;
}

export function assertValidZone(timeZone: string): void {
  fmts(timeZone);
}

function partsOf(fmt: Intl.DateTimeFormat, ms: number): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of fmt.formatToParts(new Date(ms))) {
    if (p.type !== "literal") out[p.type] = p.value;
  }
  // Some ICU builds render midnight as 24:00; normalize to 00:00 same day.
  if (out["hour"] === "24") out["hour"] = "00";
  return out;
}

export function parseCivil(point: CivilPoint): { y: number; mo: number; d: number; h: number; mi: number } {
  const dm = DATE_RE.exec(point.date);
  const tm = TIME_RE.exec(point.time);
  if (!dm || !tm) throw new Error("CIVIL_FORMAT_INVALID");
  const y = Number(dm[1]);
  const mo = Number(dm[2]);
  const d = Number(dm[3]);
  const check = new Date(Date.UTC(y, mo - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) {
    throw new Error("CIVIL_DATE_INVALID");
  }
  return { y, mo, d, h: Number(tm[1]), mi: Number(tm[2]) };
}

/** Wall time interpreted as UTC milliseconds: the neutral arithmetic anchor. */
export function wallAsUtcMs(point: CivilPoint): number {
  const { y, mo, d, h, mi } = parseCivil(point);
  return Date.UTC(y, mo - 1, d, h, mi);
}

/** Zone offset in minutes east of UTC at a UTC instant. */
export function offsetAtUtc(timeZone: string, utcMs: number): number {
  const parts = partsOf(fmts(timeZone).probe, utcMs);
  const asUtc = Date.UTC(
    Number(parts["year"]), Number(parts["month"]) - 1, Number(parts["day"]),
    Number(parts["hour"]), Number(parts["minute"]), Number(parts["second"] ?? "0"),
  );
  return Math.round((asUtc - utcMs) / 60000);
}

export function formatOffsetLabel(offsetMin: number): string {
  const sign = offsetMin < 0 ? "-" : "+";
  const abs = Math.abs(offsetMin);
  return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

export function civilFromUtc(timeZone: string, utcIso: string): CivilFromUtc {
  const ms = Date.parse(utcIso);
  if (Number.isNaN(ms)) throw new Error("UTC_ISO_INVALID");
  const parts = partsOf(fmts(timeZone).civil, ms);
  const offsetMin = offsetAtUtc(timeZone, ms);
  return {
    date: `${parts["year"]}-${parts["month"]}-${parts["day"]}`,
    time: `${parts["hour"]}:${parts["minute"]}`,
    offsetMin,
    offsetLabel: formatOffsetLabel(offsetMin),
  };
}

/** Neutral wall anchor formatting (no zone): used for wall arithmetic. */
function wallParts(wallMs: number): CivilPoint {
  const dt = new Date(wallMs);
  return { date: dt.toISOString().slice(0, 10), time: dt.toISOString().slice(11, 16) };
}

/** Distinct UTC instants whose wall time in `zone` equals the authored wall. */
function matchCore(timeZone: string, wallMs: number, probe: CivilPoint): ResolvedPoint[] {
  const before = offsetAtUtc(timeZone, wallMs - 20 * 3600_000);
  const after = offsetAtUtc(timeZone, wallMs + 20 * 3600_000);
  const out: ResolvedPoint[] = [];
  for (const off of [...new Set([before, after])]) {
    const utcMs = wallMs - off * 60000;
    const back = civilFromUtc(timeZone, new Date(utcMs).toISOString());
    if (back.date === probe.date && back.time === probe.time) {
      const utcIso = new Date(utcMs).toISOString();
      if (!out.some((m) => m.utcIso === utcIso)) {
        out.push({ utcIso, offsetMin: off, offsetLabel: formatOffsetLabel(off), disambiguated: false });
      }
    }
  }
  return out.sort((a, b) => (a.utcIso < b.utcIso ? -1 : 1));
}

/** Add minutes to civil time with date rollover (pure wall arithmetic). */
export function addMinutesCivil(point: CivilPoint, minutes: number): CivilPoint {
  return wallParts(wallAsUtcMs(point) + minutes * 60000);
}

/**
 * Resolve authored local time to a UTC instant.
 * - Exactly one valid instant -> ok.
 * - Zero (spring-forward gap) -> gap with the nearest later valid civil time.
 * - Two (fall-back fold) -> ambiguous unless the caller passes the explicit
 *   offset; never silently picks one.
 */
export function resolveLocalToUtc(
  timeZone: string,
  point: CivilPoint,
  opts?: { offsetMin?: number },
): LocalResolution {
  fmts(timeZone);
  const wallMs = wallAsUtcMs(point);
  const matches = matchCore(timeZone, wallMs, point);
  if (matches.length === 1) {
    const only = matches[0] as ResolvedPoint;
    if (opts?.offsetMin !== undefined && opts.offsetMin !== only.offsetMin) {
      throw new Error("OFFSET_CHOICE_INVALID");
    }
    return { status: "ok", point: only };
  }
  if (matches.length === 0) {
    for (let k = 1; k <= 180; k += 1) {
      const probeMs = wallMs + k * 60000;
      const probeCivil = wallParts(probeMs);
      if (matchCore(timeZone, probeMs, probeCivil).length >= 1) {
        return { status: "gap", reason: "DST_GAP", nearestValidLocal: probeCivil };
      }
    }
    throw new Error("DST_GAP_UNBOUNDED");
  }
  if (opts?.offsetMin !== undefined) {
    const chosen = matches.find((m) => m.offsetMin === opts.offsetMin);
    if (!chosen) throw new Error("OFFSET_CHOICE_INVALID");
    return { status: "ok", point: { ...chosen, disambiguated: true } };
  }
  return { status: "ambiguous", reason: "DST_FOLD", options: matches };
}

/**
 * tzdb label recorded on schedules. JavaScript exposes no tzdata version, so
 * callers pass the ICU version shipping the zone data when known (CI records
 * the real one); otherwise a stable unknown marker is stored. A tzdb change
 * triggers future-booking impact review instead of silent movement of care.
 */
export function runtimeTzdbLabel(icuVersion?: string): string {
  const icu = icuVersion ?? "unknown";
  return `icu-tzdata/${icu}`;
}

/** Weekday of a civil date: 0 = Sunday .. 6 = Saturday (zone-independent). */
export function weekdayOfDate(date: string): number {
  const m = DATE_RE.exec(date);
  if (!m) throw new Error("CIVIL_FORMAT_INVALID");
  const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (Number.isNaN(dt.getTime())) throw new Error("CIVIL_DATE_INVALID");
  return dt.getUTCDay();
}

export function addDays(date: string, n: number): string {
  const m = DATE_RE.exec(date);
  if (!m) throw new Error("CIVIL_FORMAT_INVALID");
  const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) + n * 86_400_000);
  return dt.toISOString().slice(0, 10);
}

export function minutesOf(time: string): number {
  const m = TIME_RE.exec(time);
  if (!m) throw new Error("CIVIL_FORMAT_INVALID");
  return Number(m[1]) * 60 + Number(m[2]);
}

export function timeOfMinutes(min: number): string {
  if (!Number.isInteger(min) || min < 0 || min >= 1440) throw new Error("MINUTES_OUT_OF_DAY");
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

