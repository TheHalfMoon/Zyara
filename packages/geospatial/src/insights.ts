// Zyara geospatial GEO-09: spatial insights (aggregated views only).
//
// Authority: docs/canonical/ZYARA_GEOSPATIAL_PLATFORM_PLAN_2026-09-22.md §§3, 16, 16A, 22 and
// docs/evidence/GEO/GEO-09/WORK_PACKET.md. SpatialAnalyticsCell != IndividualPatientLocation:
// points become coarse cell ids in memory and are discarded; every person-derived count is
// suppressed below its minimum cohort (with complementary suppression until no small group can
// be derived from the released total), windows sit on a fixed grid so they cannot overlap, and no
// output carries a coordinate, subject reference or event id.

import { GeoContractError, type GeoContractErrorCode, type GeoPoint, validateGeoPoint } from "./assertion.js";

// Grid resolutions in degrees; nothing finer than 0.05° (about 5.5 km) exists.
export const INSIGHT_RESOLUTIONS = [0.05, 0.1, 0.25, 0.5] as const;
export type InsightResolution = (typeof INSIGHT_RESOLUTIONS)[number];
export const PERSON_MIN_COHORT = 11;
export const SENSITIVE_MIN_COHORT = 20;
export const SENSITIVE_MIN_RESOLUTION: InsightResolution = 0.1;
export const INSIGHT_MAX_WINDOW_DAYS = 366;
export const INSIGHT_MAX_RETENTION_DAYS = 400;
// The only facility-derived metric; every other metric is person-derived.
export const SUPPLY_METRIC_ID = "SUPPLY_BY_CELL";

export type InsightSubjectKind = "PERSON" | "FACILITY";
export type InsightValueKind = "COUNT" | "RATIO";

export interface SpatialMetricDefinition {
  metricId: string;
  tenantId: string;
  branchId: string | null;
  subjectKind: InsightSubjectKind;
  valueKind: InsightValueKind;
  numerator: string;
  denominator: string | null;
  source: string;
  purpose: string;
  windowDays: number;
  resolution: InsightResolution;
  minCohort: number;
  sensitive: boolean;
  missingness: "REPORTED";
  retentionDays: number;
}

export interface SpatialEvent {
  tenantId: string;
  branchId: string | null;
  occurredAt: string;
  // Opaque person or facility reference, so each counts once per cell. Never output.
  subjectRef: string;
  // At most one of point (coarsened then discarded) or an already-coarse cellId; neither means
  // the location is missing.
  point: GeoPoint | null;
  cellId: string | null;
}

export interface SpatialWindow {
  start: string;
  end: string;
}

export interface AggregatedCell {
  cellId: string;
  count: number;
}

export interface SpatialAggregate {
  metricId: string;
  window: SpatialWindow;
  resolution: InsightResolution;
  cells: AggregatedCell[];
  missing: number;
}

export type ReleaseReason = "SUPPRESSED_LOW_COUNT" | "SUPPRESSED_COMPLEMENTARY" | "SUPPRESSED_NUMERATOR" | "NO_SUPPLY";

export interface ReleasedCell {
  cellId: string;
  value: number | null;
  suppressed: boolean;
  reason: ReleaseReason | null;
}

// A release carries the governance it was produced under, so a consumer (capacity gap, export)
// can re-check it. `total` is the number of released units: a person counts once per cell and
// once in missing.
export interface SpatialRelease {
  metricId: string;
  subjectKind: InsightSubjectKind;
  valueKind: InsightValueKind;
  minCohort: number;
  window: SpatialWindow;
  resolution: InsightResolution;
  cells: ReleasedCell[];
  total: number | null;
  missing: number | null;
}

const CODE = /^[a-z][a-z0-9_]{1,63}$/;
const METRIC_ID = /^[A-Z][A-Z0-9_]{1,63}$/;
const OPAQUE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
const CELL_ID = /^g(5|10|25|50):(-?\d{1,5}):(-?\d{1,5})$/;
const DAY_MS = 24 * 60 * 60 * 1000;

function fail(code: GeoContractErrorCode, message: string): never {
  throw new GeoContractError(code, message);
}

function instant(value: unknown, label: string): number {
  const parsed = typeof value === "string" && ISO_INSTANT.test(value) ? Date.parse(value) : Number.NaN;
  if (Number.isNaN(parsed) || new Date(parsed).toISOString().slice(0, 10) !== (value as string).slice(0, 10)) {
    fail("GEO_TIME_INVALID", `${label} must be an ISO-8601 UTC instant`);
  }
  return parsed;
}

function integerIn(value: unknown, min: number, max: number, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) fail("GEO_INSIGHT_METRIC_INVALID", `${label} must be an integer in [${min}, ${max}]`);
  return value;
}

// ---------------------------------------------------------------------------
// Cells
// ---------------------------------------------------------------------------

function centiDegrees(resolution: InsightResolution): number {
  return Math.round(resolution * 100);
}

export function cellIdFor(point: GeoPoint, resolution: InsightResolution): string {
  if (!(INSIGHT_RESOLUTIONS as readonly number[]).includes(resolution)) fail("GEO_INSIGHT_METRIC_INVALID", "resolution is not an allowed coarse grid");
  const valid = validateGeoPoint(point);
  // Integer micro-degree arithmetic avoids floating-point drift at cell edges.
  const step = centiDegrees(resolution) * 1e4;
  const latIndex = Math.floor(Math.round(valid.lat * 1e6) / step);
  const lonIndex = Math.floor(Math.round(valid.lon * 1e6) / step);
  return `g${centiDegrees(resolution)}:${latIndex}:${lonIndex}`;
}

export function parseCellId(cellId: string): { resolution: InsightResolution; latIndex: number; lonIndex: number } {
  const match = typeof cellId === "string" ? CELL_ID.exec(cellId) : null;
  if (match === null) fail("GEO_INSIGHT_CELL_INVALID", "cell id must be g{5|10|25|50}:{latIndex}:{lonIndex}");
  const cdeg = Number(match[1]);
  const latIndex = Number(match[2]);
  const lonIndex = Number(match[3]);
  // Bounds in integer centi-degrees.
  if (latIndex * cdeg < -9000 || (latIndex + 1) * cdeg > 9000 || lonIndex * cdeg < -18000 || (lonIndex + 1) * cdeg > 18000) {
    fail("GEO_INSIGHT_CELL_INVALID", "cell lies outside the globe");
  }
  return { resolution: (cdeg / 100) as InsightResolution, latIndex, lonIndex };
}

// ---------------------------------------------------------------------------
// Metric definitions and windows
// ---------------------------------------------------------------------------

export function validateMetricDefinition(input: SpatialMetricDefinition): SpatialMetricDefinition {
  if (typeof input.metricId !== "string" || !METRIC_ID.test(input.metricId)) fail("GEO_INSIGHT_METRIC_INVALID", "metricId must be an upper-case metric code");
  if (typeof input.tenantId !== "string" || !OPAQUE.test(input.tenantId)) fail("GEO_INSIGHT_METRIC_INVALID", "tenantId must be an opaque id");
  if (input.branchId !== null && (typeof input.branchId !== "string" || !OPAQUE.test(input.branchId))) fail("GEO_INSIGHT_METRIC_INVALID", "branchId must be an opaque id or null");
  if (input.subjectKind !== "PERSON" && input.subjectKind !== "FACILITY") fail("GEO_INSIGHT_METRIC_INVALID", "subjectKind is PERSON or FACILITY");
  // Only supply is facility-derived, so a person count cannot be relabelled to escape its cohort.
  if ((input.subjectKind === "FACILITY") !== (input.metricId === SUPPLY_METRIC_ID)) fail("GEO_INSIGHT_METRIC_INVALID", `only ${SUPPLY_METRIC_ID} is facility-derived`);
  if (input.valueKind !== "COUNT" && input.valueKind !== "RATIO") fail("GEO_INSIGHT_METRIC_INVALID", "valueKind is COUNT or RATIO");
  for (const [label, value] of [["numerator", input.numerator], ["source", input.source], ["purpose", input.purpose]] as const) {
    if (typeof value !== "string" || !CODE.test(value)) fail("GEO_INSIGHT_METRIC_INVALID", `${label} must be a code`);
  }
  if (input.denominator !== null && (typeof input.denominator !== "string" || !CODE.test(input.denominator))) fail("GEO_INSIGHT_METRIC_INVALID", "denominator must be a code or null");
  if (input.valueKind === "RATIO" && input.denominator === null) fail("GEO_INSIGHT_METRIC_INVALID", "a ratio needs a denominator");
  integerIn(input.windowDays, 1, INSIGHT_MAX_WINDOW_DAYS, "windowDays");
  integerIn(input.retentionDays, 1, INSIGHT_MAX_RETENTION_DAYS, "retentionDays");
  if (!(INSIGHT_RESOLUTIONS as readonly number[]).includes(input.resolution)) fail("GEO_INSIGHT_METRIC_INVALID", "resolution is not an allowed coarse grid");
  if (input.missingness !== "REPORTED") fail("GEO_INSIGHT_METRIC_INVALID", "missingness must be REPORTED");
  if (typeof input.sensitive !== "boolean") fail("GEO_INSIGHT_METRIC_INVALID", "sensitive must be declared");
  integerIn(input.minCohort, 1, 1000, "minCohort");
  if (input.subjectKind === "PERSON" && input.minCohort < PERSON_MIN_COHORT) fail("GEO_INSIGHT_SUPPRESSION_TOO_WEAK", `a person-derived metric needs minCohort >= ${PERSON_MIN_COHORT}`);
  if (input.sensitive) {
    if (input.subjectKind !== "PERSON") fail("GEO_INSIGHT_METRIC_INVALID", "only person-derived metrics carry sensitive care intent");
    if (input.minCohort < SENSITIVE_MIN_COHORT) fail("GEO_INSIGHT_SUPPRESSION_TOO_WEAK", `a sensitive metric needs minCohort >= ${SENSITIVE_MIN_COHORT}`);
    if (input.resolution < SENSITIVE_MIN_RESOLUTION) fail("GEO_INSIGHT_SUPPRESSION_TOO_WEAK", `a sensitive metric needs a resolution of at least ${SENSITIVE_MIN_RESOLUTION}°`);
  }
  return Object.freeze({ ...input });
}

// Windows sit on a fixed grid: they start at UTC midnight on a multiple of windowDays days since
// the epoch, so two releases of a metric never overlap and cannot be differenced.
export function validateWindow(window: SpatialWindow, windowDays: number): { start: number; end: number } {
  const start = instant(window.start, "window.start");
  const end = instant(window.end, "window.end");
  if (end - start !== windowDays * DAY_MS) fail("GEO_INSIGHT_WINDOW_INVALID", "the window length must equal windowDays");
  if (start % DAY_MS !== 0 || (start / DAY_MS) % windowDays !== 0) fail("GEO_INSIGHT_WINDOW_INVALID", "the window must start on the metric's fixed window grid");
  return { start, end };
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

export function aggregateSpatialMetric(definition: SpatialMetricDefinition, events: readonly SpatialEvent[], window: SpatialWindow): SpatialAggregate {
  const metric = validateMetricDefinition(definition);
  const { start, end } = validateWindow(window, metric.windowDays);

  const subjectsByCell = new Map<string, Set<string>>();
  const missingSubjects = new Set<string>();
  for (const event of events) {
    // Fail closed: a foreign event means the caller's scoping is wrong.
    if (event.tenantId !== metric.tenantId) fail("GEO_INSIGHT_SCOPE", "an event of another tenant reached this metric");
    if (metric.branchId !== null && event.branchId !== metric.branchId) fail("GEO_INSIGHT_SCOPE", "an event of another branch reached this branch metric");
    const at = instant(event.occurredAt, "occurredAt");
    if (at < start || at >= end) continue;
    if (typeof event.subjectRef !== "string" || !OPAQUE.test(event.subjectRef)) fail("GEO_INSIGHT_METRIC_INVALID", "every event needs an opaque subjectRef");
    if (event.point !== null && event.cellId !== null) fail("GEO_INSIGHT_CELL_INVALID", "an event carries a point or a cell id, not both");
    let cellId: string | null = null;
    if (event.point !== null) {
      cellId = cellIdFor(event.point, metric.resolution);
    } else if (event.cellId !== null) {
      if (parseCellId(event.cellId).resolution !== metric.resolution) fail("GEO_INSIGHT_CELL_INVALID", "a pre-coarsened cell must use the metric's resolution");
      cellId = event.cellId;
    }
    if (cellId === null) {
      missingSubjects.add(event.subjectRef);
      continue;
    }
    const subjects = subjectsByCell.get(cellId) ?? new Set<string>();
    subjects.add(event.subjectRef);
    subjectsByCell.set(cellId, subjects);
  }
  const cells = [...subjectsByCell.entries()]
    .map(([cellId, subjects]) => ({ cellId, count: subjects.size }))
    .sort((a, b) => (a.cellId < b.cellId ? -1 : a.cellId > b.cellId ? 1 : 0));
  return { metricId: metric.metricId, window: { start: window.start, end: window.end }, resolution: metric.resolution, cells, missing: missingSubjects.size };
}

// ---------------------------------------------------------------------------
// Release
// ---------------------------------------------------------------------------

export function releaseSpatialCells(definition: SpatialMetricDefinition, aggregate: SpatialAggregate): SpatialRelease {
  const metric = validateMetricDefinition(definition);
  if (metric.valueKind !== "COUNT") fail("GEO_INSIGHT_METRIC_INVALID", "releaseSpatialCells releases counts; use releaseCapacityGap for ratios");
  if (aggregate.metricId !== metric.metricId || aggregate.resolution !== metric.resolution) fail("GEO_INSIGHT_METRIC_INVALID", "the aggregate does not belong to this metric");
  validateWindow(aggregate.window, metric.windowDays);
  const k = metric.minCohort;
  const person = metric.subjectKind === "PERSON";
  const released: ReleasedCell[] = aggregate.cells.map((cell): ReleasedCell =>
    cell.count < k ? { cellId: cell.cellId, value: null, suppressed: true, reason: "SUPPRESSED_LOW_COUNT" } : { cellId: cell.cellId, value: cell.count, suppressed: false, reason: null },
  );
  const sum = aggregate.cells.reduce((acc, cell) => acc + cell.count, 0) + aggregate.missing;
  const missingSuppressed = person && aggregate.missing > 0 && aggregate.missing < k;
  let totalReleased = sum >= k;
  if (person && totalReleased) {
    // Complementary suppression: with a released total, the hidden mass (suppressed cells plus a
    // suppressed missing count) is derivable by subtraction. Keep hiding the smallest visible
    // cell until that mass is zero or at least k; if no cell is left, withhold the total.
    let hiddenMass = released.reduce((acc, cell, index) => acc + (cell.suppressed ? aggregate.cells[index].count : 0), 0) + (missingSuppressed ? aggregate.missing : 0);
    while (hiddenMass > 0 && hiddenMass < k) {
      const smallest = released
        .map((cell, index) => ({ cell, index, count: aggregate.cells[index].count }))
        .filter((item) => !item.cell.suppressed)
        .sort((a, b) => a.count - b.count || (a.cell.cellId < b.cell.cellId ? -1 : 1))[0];
      if (smallest === undefined) {
        totalReleased = false;
        break;
      }
      released[smallest.index] = { cellId: smallest.cell.cellId, value: null, suppressed: true, reason: "SUPPRESSED_COMPLEMENTARY" };
      hiddenMass += smallest.count;
    }
  }
  return {
    metricId: metric.metricId,
    subjectKind: metric.subjectKind,
    valueKind: metric.valueKind,
    minCohort: k,
    window: { ...aggregate.window },
    resolution: metric.resolution,
    cells: released,
    total: totalReleased ? sum : null,
    missing: missingSuppressed ? null : aggregate.missing,
  };
}

// Capacity gap: released demand ÷ supply per cell over the same window and grid. A suppressed
// demand cell stays suppressed, demand must have been released under at least the gap metric's
// cohort, and zero supply is NO_SUPPLY rather than an infinite ratio.
export function releaseCapacityGap(definition: SpatialMetricDefinition, demand: SpatialRelease, supply: SpatialAggregate): SpatialRelease {
  const metric = validateMetricDefinition(definition);
  if (metric.valueKind !== "RATIO") fail("GEO_INSIGHT_METRIC_INVALID", "a capacity gap is a ratio metric");
  if (demand.subjectKind !== "PERSON" || demand.valueKind !== "COUNT") fail("GEO_INSIGHT_METRIC_INVALID", "demand must be a released person count");
  if (demand.minCohort < metric.minCohort) fail("GEO_INSIGHT_SUPPRESSION_TOO_WEAK", "demand was released under a weaker cohort than the gap metric requires");
  if (supply.metricId !== SUPPLY_METRIC_ID) fail("GEO_INSIGHT_METRIC_INVALID", `supply must be ${SUPPLY_METRIC_ID}`);
  if (demand.resolution !== metric.resolution || supply.resolution !== metric.resolution) fail("GEO_INSIGHT_METRIC_INVALID", "demand and supply must share the metric's resolution");
  validateWindow(demand.window, metric.windowDays);
  if (demand.window.start !== supply.window.start || demand.window.end !== supply.window.end) fail("GEO_INSIGHT_WINDOW_INVALID", "demand and supply must share one window");
  const supplyByCell = new Map(supply.cells.map((cell) => [cell.cellId, cell.count]));
  const cells: ReleasedCell[] = demand.cells.map((cell): ReleasedCell => {
    if (cell.suppressed || cell.value === null) return { cellId: cell.cellId, value: null, suppressed: true, reason: "SUPPRESSED_NUMERATOR" };
    const available = supplyByCell.get(cell.cellId) ?? 0;
    if (available === 0) return { cellId: cell.cellId, value: null, suppressed: false, reason: "NO_SUPPLY" };
    return { cellId: cell.cellId, value: Math.round((cell.value / available) * 100) / 100, suppressed: false, reason: null };
  });
  return {
    metricId: metric.metricId,
    subjectKind: "PERSON",
    valueKind: "RATIO",
    minCohort: demand.minCohort,
    window: { ...demand.window },
    resolution: metric.resolution,
    cells,
    total: null,
    missing: demand.missing,
  };
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

// The only dashboard/export shape: governance, cell ids and released values. There is no field
// that could carry a coordinate, a subject or an event, and the cohort is re-checked, so neither
// a patient-dot layer nor a hand-built small count can be exported.
export function exportSpatialInsight(release: SpatialRelease): SpatialRelease {
  const person = release.subjectKind === "PERSON";
  if (person && release.minCohort < PERSON_MIN_COHORT) fail("GEO_INSIGHT_SUPPRESSION_TOO_WEAK", "a person-derived release needs a cohort of at least 11");
  const k = release.minCohort;
  for (const cell of release.cells) {
    parseCellId(cell.cellId);
    if (cell.suppressed !== (cell.value === null && cell.reason !== "NO_SUPPLY")) fail("GEO_INSIGHT_SUPPRESSION_TOO_WEAK", "suppression must be explicit");
    if (person && release.valueKind === "COUNT" && cell.value !== null && cell.value < k) fail("GEO_INSIGHT_SUPPRESSION_TOO_WEAK", "an unsuppressed person count is below the cohort");
  }
  if (person && release.total !== null && release.total < k) fail("GEO_INSIGHT_SUPPRESSION_TOO_WEAK", "a released total is below the cohort");
  if (person && release.missing !== null && release.missing > 0 && release.missing < k) fail("GEO_INSIGHT_SUPPRESSION_TOO_WEAK", "a released missing count is below the cohort");
  return {
    metricId: release.metricId,
    subjectKind: release.subjectKind,
    valueKind: release.valueKind,
    minCohort: release.minCohort,
    window: { start: release.window.start, end: release.window.end },
    resolution: release.resolution,
    cells: release.cells.map((cell): ReleasedCell => ({ cellId: cell.cellId, value: cell.value, suppressed: cell.suppressed, reason: cell.reason })),
    total: release.total,
    missing: release.missing,
  };
}
