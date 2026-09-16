// Bounded recurring and linked-care scheduling (M048).
// Series are always bounded: an end date and a maximum occurrence count
// are both required. Each occurrence commits and cancels independently —
// a series is a convenience, never an atomic block. Linked episodes group
// related appointments under one episode id with an explicit per-
// occurrence cancellation policy and optional recall-plan origin.

export type Recurrence = "weekly" | "fortnightly" | "monthly";

export const MAX_OCCURRENCES = 12;

export interface SeriesSpec {
  seriesId: string;
  tenantId: string;
  patientId: string;
  serviceId: string;
  recurrence: Recurrence;
  firstStartUtc: string;
  durationMin: number;
  endDateUtc: string;
  maxOccurrences: number;
  recallPlanId: string | null;
}

export interface Occurrence {
  seriesId: string;
  index: number;
  startUtc: string;
  endUtc: string;
  state: "proposed" | "booked" | "cancelled";
}

export function planSeries(
  spec: SeriesSpec,
): Occurrence[] | { error: string } {
  if (!spec.endDateUtc) return { error: "Series require an end date." };
  if (spec.maxOccurrences < 1 || spec.maxOccurrences > MAX_OCCURRENCES) {
    return { error: `maxOccurrences must be 1-${MAX_OCCURRENCES}.` };
  }
  const stepDays = spec.recurrence === "weekly" ? 7 : spec.recurrence === "fortnightly" ? 14 : 30;
  const out: Occurrence[] = [];
  let cursor = Date.parse(spec.firstStartUtc);
  const end = Date.parse(spec.endDateUtc);
  if (Number.isNaN(cursor) || Number.isNaN(end) || cursor >= end) {
    return { error: "Invalid series window." };
  }
  for (let i = 0; i < spec.maxOccurrences; i++) {
    if (cursor >= end) break;
    const start = new Date(cursor).toISOString();
    const finish = new Date(cursor + spec.durationMin * 60 * 1000).toISOString();
    out.push({ seriesId: spec.seriesId, index: i, startUtc: start, endUtc: finish, state: "proposed" });
    cursor += stepDays * 24 * 60 * 60 * 1000;
  }
  if (out.length === 0) return { error: "Series window yields no occurrences." };
  return out;
}

export function cancelOccurrence(occ: Occurrence): Occurrence {
  if (occ.state === "booked" || occ.state === "proposed") {
    return { ...occ, state: "cancelled" };
  }
  return occ;
}

export interface CareEpisode {
  episodeId: string;
  tenantId: string;
  patientId: string;
  recallPlanId: string | null;
  appointmentIds: string[];
  /** Explicit policy: cancelling one occurrence never cancels siblings. */
  siblingPolicy: "independent";
}

export function linkEpisode(
  episode: CareEpisode,
  appointmentId: string,
): CareEpisode {
  if (episode.appointmentIds.includes(appointmentId)) return episode;
  return { ...episode, appointmentIds: [...episode.appointmentIds, appointmentId] };
}
