// Minimized operational metric definitions (M024). English only.
//
// Provider ROI needs honest denominators and missingness. Every KPI
// declares grain, denominator, source, and coverage. Request/redirect stays
// separate from authoritative booking; unknown external outcomes stay
// separate from abandonment; missing attendance stays separate from
// no-show. Reschedules count as retained care, never as loss. Small cells
// are suppressed, including complementary cells, to prevent reidentification.

export type FunnelEvent =
  | "impression" | "click" | "availability_view" | "booking_started"
  | "booking_committed" | "request_submitted" | "redirect_followed"
  | "change_cancelled" | "change_rescheduled" | "attendance_completed"
  | "attendance_no_show" | "attendance_unknown" | "external_unknown";

export interface CountedEvent {
  eventId: string;
  kind: FunnelEvent;
  tenantId: string;
  dayUtc: string;
  channel: string;
  locale: string;
  appointmentId: string | null;
}

export interface MetricDefinition {
  kpi: string;
  grain: string;
  denominator: string;
  source: string;
  coverage: string;
}

export const METRIC_DICTIONARY: MetricDefinition[] = [
  { kpi: "booking_conversion", grain: "tenant/day", denominator: "booking_started", source: "booking_operations", coverage: "native bookings only" },
  { kpi: "request_share", grain: "tenant/day", denominator: "booking_started + request_submitted", source: "booking_operations", coverage: "native modes only" },
  { kpi: "no_show_rate", grain: "tenant/day", denominator: "attendance_completed + attendance_no_show", source: "attendance_evidence", coverage: "known outcomes only; unknown excluded" },
  { kpi: "retention_after_change", grain: "tenant/day", denominator: "change_cancelled + change_rescheduled", source: "change records", coverage: "reschedule counts as retained, not lost" },
  { kpi: "attendance_unknown_share", grain: "tenant/day", denominator: "all attendance outcomes", source: "attendance_evidence", coverage: "missingness reported separately" },
];

/** Dedupe by event id: replays never double-count. */
export function dedupeEvents(events: CountedEvent[]): CountedEvent[] {
  const seen = new Set<string>();
  const out: CountedEvent[] = [];
  for (const e of events) {
    if (seen.has(e.eventId)) continue;
    seen.add(e.eventId);
    out.push(e);
  }
  return out;
}

export interface FunnelTotals {
  started: number;
  committed: number;
  requests: number;
  redirects: number;
  cancelled: number;
  rescheduled: number;
  completed: number;
  noShow: number;
  unknown: number;
}

export function summarize(events: CountedEvent[]): FunnelTotals {
  const t: FunnelTotals = {
    started: 0, committed: 0, requests: 0, redirects: 0,
    cancelled: 0, rescheduled: 0, completed: 0, noShow: 0, unknown: 0,
  };
  for (const e of dedupeEvents(events)) {
    if (e.kind === "booking_started") t.started += 1;
    else if (e.kind === "booking_committed") t.committed += 1;
    else if (e.kind === "request_submitted") t.requests += 1;
    else if (e.kind === "redirect_followed") t.redirects += 1;
    else if (e.kind === "change_cancelled") t.cancelled += 1;
    else if (e.kind === "change_rescheduled") t.rescheduled += 1;
    else if (e.kind === "attendance_completed") t.completed += 1;
    else if (e.kind === "attendance_no_show") t.noShow += 1;
    else if (e.kind === "attendance_unknown" || e.kind === "external_unknown") t.unknown += 1;
  }
  return t;
}

export interface KpiOutput {
  bookingConversion: number | null;
  noShowRate: number | null;
  retainedAfterChange: number | null;
  unknownShare: number | null;
}

/** Honest KPIs: null when the denominator is empty, never 0/0 fabrications. */
export function computeKpis(t: FunnelTotals): KpiOutput {
  const bookingConversion = t.started > 0 ? t.committed / t.started : null;
  const known = t.completed + t.noShow;
  const noShowRate = known > 0 ? t.noShow / known : null;
  const changes = t.cancelled + t.rescheduled;
  const retainedAfterChange = changes > 0 ? t.rescheduled / changes : null;
  const all = t.completed + t.noShow + t.unknown;
  const unknownShare = all > 0 ? t.unknown / all : null;
  return { bookingConversion, noShowRate, retainedAfterChange, unknownShare };
}

/** Small-cell suppression with complementary-cell protection. */
export function suppressSmallCells(
  cells: Array<{ key: string; count: number }>,
  threshold: number,
): Array<{ key: string; count: number | null }> {
  const small = cells.filter((c) => c.count < threshold);
  if (small.length === 0) return cells.map((c) => ({ ...c }));
  // If exactly one cell would remain visible, suppress it too: otherwise
  // the hidden values are derivable from the total (complementary cell).
  if (cells.length - small.length <= 1) {
    return cells.map((c) => ({ key: c.key, count: null }));
  }
  return cells.map((c) => ({ key: c.key, count: c.count < threshold ? null : c.count }));
}

export const ANALYTICS_LOCALES = ["ar", "en", "fr", "de", "es"] as const;

/** Counts only: pipeline lag inputs, coverage, reconciliation mismatch. */
export function telemetryForAnalytics(input: {
  events: number; duplicates: number; suppressedCells: number; mismatch: number;
}): Record<string, number> {
  return { ...input };
}
