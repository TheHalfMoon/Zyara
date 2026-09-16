// Provenance-labeled patient timeline (M053).
// Every entry carries source, effective time, freshness, external ids and
// provenance. Corrections append new versions; history is never
// rewritten. Ordering is deterministic by (effective time, version).
// Timeline reads require M051 care consent.

import { isConsented, type ConsentGrant } from "@zyara/consent-boundaries";

export interface TimelineEntry {
  entryId: string;
  patientId: string;
  kind: string;
  source: string;
  effectiveTimeUtc: string;
  recordedAtUtc: string;
  freshness: "current" | "stale" | "superseded";
  externalIds: string[];
  provenance: string;
  version: number;
  supersedesId: string | null;
  summary: string;
}

export function labelFreshness(
  entry: TimelineEntry,
  nowUtc: string,
  staleAfterDays: number,
): TimelineEntry {
  if (entry.freshness === "superseded") return entry;
  const ageDays =
    (Date.parse(nowUtc) - Date.parse(entry.effectiveTimeUtc)) / 86_400_000;
  if (ageDays > staleAfterDays) return { ...entry, freshness: "stale" };
  return entry;
}

export function correctEntry(
  entry: TimelineEntry,
  correctionSummary: string,
  recordedAtUtc: string,
): { current: TimelineEntry; correction: TimelineEntry } {
  const current: TimelineEntry = { ...entry, freshness: "superseded" };
  const correction: TimelineEntry = {
    ...entry,
    entryId: `${entry.entryId}-v${entry.version + 1}`,
    recordedAtUtc,
    freshness: "current",
    version: entry.version + 1,
    supersedesId: entry.entryId,
    summary: correctionSummary,
  };
  return { current, correction };
}

export function orderTimeline(
  entries: readonly TimelineEntry[],
): TimelineEntry[] {
  return [...entries].sort((a, b) =>
    a.effectiveTimeUtc < b.effectiveTimeUtc ? -1
    : a.effectiveTimeUtc > b.effectiveTimeUtc ? 1
    : a.version - b.version,
  );
}

export function timelineAllowed(
  grants: readonly ConsentGrant[],
  nowUtc: string,
): boolean {
  return isConsented(grants, "care", nowUtc);
}
