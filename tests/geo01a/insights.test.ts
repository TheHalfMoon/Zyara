// GEO-09 synthetic qualification: spatial insights (aggregated views only).
//
// Proves, with synthetic Riyadh-area events only, that person-derived counts are suppressed
// below their minimum cohort (including complementary cells and missingness), that foreign
// events fail closed, that outputs carry coarse cell ids only and never coordinates or subjects,
// and that aggregation is deterministic.
import assert from "node:assert";
import { describe, it } from "node:test";
import {
  GeoContractError,
  PERSON_MIN_COHORT,
  aggregateSpatialMetric,
  cellIdFor,
  exportSpatialInsight,
  parseCellId,
  releaseCapacityGap,
  releaseSpatialCells,
  validateMetricDefinition,
  type GeoContractErrorCode,
  type SpatialEvent,
  type SpatialMetricDefinition,
} from "@zyara/geospatial";

// 30-day windows sit on a fixed grid of 30-day steps from the epoch.
const WINDOW = { start: "2026-09-04T00:00:00.000Z", end: "2026-10-04T00:00:00.000Z" };
const INSIDE = "2026-09-15T10:00:00.000Z";
// Two Riyadh-area points in different 0.05° cells, and one in a third cell.
const OLAYA = { lon: 46.6753, lat: 24.7136 };
const MALAZ = { lon: 46.7302, lat: 24.6624 };
const DIRAH = { lon: 46.7125, lat: 24.6312 };

function expectCode(run: () => unknown, code: GeoContractErrorCode): void {
  assert.throws(run, (error: unknown) => error instanceof GeoContractError && error.code === code, `expected ${code}`);
}

function demandMetric(overrides: Partial<SpatialMetricDefinition> = {}): SpatialMetricDefinition {
  return {
    metricId: "DEMAND_BY_CELL",
    tenantId: "t1",
    branchId: null,
    subjectKind: "PERSON",
    valueKind: "COUNT",
    numerator: "distinct_people_with_care_request",
    denominator: null,
    source: "care_request_events",
    purpose: "network_planning",
    windowDays: 30,
    resolution: 0.05,
    minCohort: PERSON_MIN_COHORT,
    sensitive: false,
    missingness: "REPORTED",
    retentionDays: 365,
    ...overrides,
  };
}

function people(count: number, point: SpatialEvent["point"], prefix: string, overrides: Partial<SpatialEvent> = {}): SpatialEvent[] {
  return Array.from({ length: count }, (_, i) => ({ tenantId: "t1", branchId: null, occurredAt: INSIDE, subjectRef: `${prefix}-${i}`, point, cellId: null, ...overrides }));
}

function expectNoLocation(value: unknown): void {
  const json = JSON.stringify(value);
  assert.ok(!/"(lat|lon|lng|latitude|longitude|point|coordinates|subjectRef|subject|eventId)"/.test(json), `export must carry no location or subject fields: ${json}`);
  assert.ok(!json.includes("46.67") && !json.includes("24.71"), "export must not contain raw coordinates");
  assert.ok(!json.includes("olaya-") && !json.includes("malaz-"), "export must not contain subject references");
}

describe("GEO-09 metric governance", () => {
  it("every metric declares its governance and person metrics are suppressed", () => {
    assert.strictEqual(validateMetricDefinition(demandMetric()).minCohort, 11);
    expectCode(() => validateMetricDefinition(demandMetric({ minCohort: 5 })), "GEO_INSIGHT_SUPPRESSION_TOO_WEAK");
    expectCode(() => validateMetricDefinition(demandMetric({ sensitive: true })), "GEO_INSIGHT_SUPPRESSION_TOO_WEAK");
    expectCode(() => validateMetricDefinition(demandMetric({ sensitive: true, minCohort: 20 })), "GEO_INSIGHT_SUPPRESSION_TOO_WEAK");
    assert.strictEqual(validateMetricDefinition(demandMetric({ sensitive: true, minCohort: 20, resolution: 0.1 })).sensitive, true);
    expectCode(() => validateMetricDefinition(demandMetric({ valueKind: "RATIO" })), "GEO_INSIGHT_METRIC_INVALID");
    expectCode(() => validateMetricDefinition(demandMetric({ source: "" })), "GEO_INSIGHT_METRIC_INVALID");
    expectCode(() => validateMetricDefinition(demandMetric({ retentionDays: 0 })), "GEO_INSIGHT_METRIC_INVALID");
    expectCode(() => validateMetricDefinition(demandMetric({ retentionDays: 401 })), "GEO_INSIGHT_METRIC_INVALID");
    expectCode(() => validateMetricDefinition(demandMetric({ windowDays: 400 })), "GEO_INSIGHT_METRIC_INVALID");
    expectCode(() => validateMetricDefinition(demandMetric({ resolution: 0.01 as never })), "GEO_INSIGHT_METRIC_INVALID");
    expectCode(() => validateMetricDefinition(demandMetric({ missingness: "DROPPED" as never })), "GEO_INSIGHT_METRIC_INVALID");
    // A person count cannot be relabelled as facility-derived to escape its cohort.
    expectCode(() => validateMetricDefinition(demandMetric({ subjectKind: "FACILITY", minCohort: 1 })), "GEO_INSIGHT_METRIC_INVALID");
    expectCode(() => validateMetricDefinition(demandMetric({ metricId: "SUPPLY_BY_CELL" })), "GEO_INSIGHT_METRIC_INVALID");
  });
});

describe("GEO-09 cells: no patient dots", () => {
  it("points become coarse cell ids; nothing finer than 0.05° exists", () => {
    const cell = cellIdFor(OLAYA, 0.05);
    assert.strictEqual(cell, "g5:494:933");
    assert.deepStrictEqual(parseCellId(cell), { resolution: 0.05, latIndex: 494, lonIndex: 933 });
    assert.strictEqual(cellIdFor({ lon: -0.01, lat: -0.01 }, 0.1), "g10:-1:-1");
    expectCode(() => cellIdFor(OLAYA, 0.001 as never), "GEO_INSIGHT_METRIC_INVALID");
    expectCode(() => parseCellId("g1:2471:4667"), "GEO_INSIGHT_CELL_INVALID");
    expectCode(() => parseCellId("24.7136,46.6753"), "GEO_INSIGHT_CELL_INVALID");
    expectCode(() => parseCellId("g50:200:0"), "GEO_INSIGHT_CELL_INVALID");
  });
});

describe("GEO-09 low-count suppression", () => {
  it("suppresses small cells, their complement, and small missingness", () => {
    const events = [...people(30, OLAYA, "olaya"), ...people(15, MALAZ, "malaz"), ...people(4, DIRAH, "dirah")];
    const aggregate = aggregateSpatialMetric(demandMetric(), events, WINDOW);
    const release = releaseSpatialCells(demandMetric(), aggregate);
    const byCell = Object.fromEntries(release.cells.map((cell) => [cell.cellId, cell]));
    assert.strictEqual(byCell[cellIdFor(DIRAH, 0.05)].reason, "SUPPRESSED_LOW_COUNT");
    // One hidden cell with a released total: the smallest visible cell (15) is hidden too.
    assert.strictEqual(byCell[cellIdFor(MALAZ, 0.05)].reason, "SUPPRESSED_COMPLEMENTARY");
    assert.strictEqual(byCell[cellIdFor(OLAYA, 0.05)].value, 30);
    assert.strictEqual(release.total, 49);
    assert.strictEqual(release.missing, 0);
  });

  it("a small missing count is suppressed and complemented", () => {
    const events = [...people(30, OLAYA, "olaya"), ...people(15, MALAZ, "malaz"), ...people(3, null, "nolocation")];
    const release = releaseSpatialCells(demandMetric(), aggregateSpatialMetric(demandMetric(), events, WINDOW));
    assert.strictEqual(release.missing, null);
    assert.strictEqual(release.cells.find((cell) => cell.cellId === cellIdFor(MALAZ, 0.05))?.reason, "SUPPRESSED_COMPLEMENTARY");
  });

  it("withholds the total when a single hidden value has no visible complement", () => {
    const events = [...people(5, OLAYA, "olaya"), ...people(12, null, "nolocation")];
    const release = releaseSpatialCells(demandMetric(), aggregateSpatialMetric(demandMetric(), events, WINDOW));
    assert.strictEqual(release.cells[0].suppressed, true);
    assert.strictEqual(release.missing, 12);
    assert.strictEqual(release.total, null);
  });

  it("several small hidden cells are complemented until their sum is not small", () => {
    const events = [...people(30, OLAYA, "olaya"), ...people(1, MALAZ, "malaz"), ...people(1, DIRAH, "dirah")];
    const release = releaseSpatialCells(demandMetric(), aggregateSpatialMetric(demandMetric(), events, WINDOW));
    // Hidden mass 2 < 11: the only visible cell is hidden too, so nothing small is derivable.
    assert.ok(release.cells.every((cell) => cell.suppressed));
    assert.strictEqual(release.total, 32);
    const mixed = [...people(30, OLAYA, "olaya"), ...people(25, MALAZ, "malaz"), ...people(1, DIRAH, "dirah"), ...people(2, null, "nolocation")];
    const second = releaseSpatialCells(demandMetric(), aggregateSpatialMetric(demandMetric(), mixed, WINDOW));
    assert.strictEqual(second.missing, null);
    assert.strictEqual(second.cells.find((cell) => cell.cellId === cellIdFor(MALAZ, 0.05))?.reason, "SUPPRESSED_COMPLEMENTARY");
    assert.strictEqual(second.cells.find((cell) => cell.cellId === cellIdFor(OLAYA, 0.05))?.value, 30);
  });

  it("a total below the cohort is never released", () => {
    const release = releaseSpatialCells(demandMetric(), aggregateSpatialMetric(demandMetric(), people(6, OLAYA, "olaya"), WINDOW));
    assert.deepStrictEqual([release.total, release.cells[0].value], [null, null]);
  });

  it("capacity gap keeps demand suppression and never divides by zero", () => {
    const demand = releaseSpatialCells(demandMetric(), aggregateSpatialMetric(demandMetric(), [...people(30, OLAYA, "olaya"), ...people(22, MALAZ, "malaz"), ...people(2, DIRAH, "dirah")], WINDOW));
    const supplyMetric = demandMetric({ metricId: "SUPPLY_BY_CELL", subjectKind: "FACILITY", numerator: "current_branch_locations", source: "geo_current_location_assertions", minCohort: 1 });
    const supply = aggregateSpatialMetric(supplyMetric, [{ tenantId: "t1", branchId: null, occurredAt: INSIDE, subjectRef: "b1", point: OLAYA, cellId: null }, { tenantId: "t1", branchId: null, occurredAt: INSIDE, subjectRef: "b2", point: OLAYA, cellId: null }], WINDOW);
    const gapMetric = demandMetric({ metricId: "CAPACITY_GAP_BY_CELL", valueKind: "RATIO", denominator: "current_branch_locations" });
    const gap = releaseCapacityGap(gapMetric, demand, supply);
    const byCell = Object.fromEntries(gap.cells.map((cell) => [cell.cellId, cell]));
    assert.strictEqual(byCell[cellIdFor(OLAYA, 0.05)].value, 15);
    assert.strictEqual(byCell[cellIdFor(DIRAH, 0.05)].reason, "SUPPRESSED_NUMERATOR");
    assert.strictEqual(byCell[cellIdFor(MALAZ, 0.05)].reason, "SUPPRESSED_NUMERATOR");
  });

  it("capacity gap reports NO_SUPPLY instead of an infinite ratio", () => {
    const demand = releaseSpatialCells(demandMetric(), aggregateSpatialMetric(demandMetric(), [...people(30, OLAYA, "olaya"), ...people(25, MALAZ, "malaz")], WINDOW));
    const supply = { metricId: "SUPPLY_BY_CELL", window: WINDOW, resolution: 0.05 as const, cells: [{ cellId: cellIdFor(OLAYA, 0.05), count: 3 }], missing: 0 };
    const gap = releaseCapacityGap(demandMetric({ metricId: "CAPACITY_GAP_BY_CELL", valueKind: "RATIO", denominator: "current_branch_locations" }), demand, supply);
    assert.deepStrictEqual(gap.cells.find((cell) => cell.cellId === cellIdFor(MALAZ, 0.05)), { cellId: cellIdFor(MALAZ, 0.05), value: null, suppressed: false, reason: "NO_SUPPLY" });
    assert.strictEqual(gap.cells.find((cell) => cell.cellId === cellIdFor(OLAYA, 0.05))?.value, 10);
  });
});

describe("GEO-09 capacity gap guards", () => {
  const gapMetric = demandMetric({ metricId: "CAPACITY_GAP_BY_CELL", valueKind: "RATIO", denominator: "current_branch_locations" });
  const demand = releaseSpatialCells(demandMetric(), aggregateSpatialMetric(demandMetric(), people(30, OLAYA, "olaya"), WINDOW));
  const supply = { metricId: "SUPPLY_BY_CELL", window: WINDOW, resolution: 0.05 as const, cells: [{ cellId: cellIdFor(OLAYA, 0.05), count: 3 }], missing: 0 };

  it("refuses a demand release made under a weaker cohort or another window", () => {
    expectCode(() => releaseCapacityGap({ ...gapMetric, minCohort: 20 }, demand, supply), "GEO_INSIGHT_SUPPRESSION_TOO_WEAK");
    expectCode(() => releaseCapacityGap(gapMetric, demand, { ...supply, window: { start: "2026-08-05T00:00:00.000Z", end: "2026-09-04T00:00:00.000Z" } }), "GEO_INSIGHT_WINDOW_INVALID");
    expectCode(() => releaseCapacityGap(gapMetric, demand, { ...supply, metricId: "OTHER_SUPPLY" }), "GEO_INSIGHT_METRIC_INVALID");
  });
});

describe("GEO-09 scope isolation", () => {
  it("foreign tenant or branch events fail closed instead of being filtered", () => {
    const events = [...people(20, OLAYA, "olaya"), ...people(1, OLAYA, "foreign", { tenantId: "t2" })];
    expectCode(() => aggregateSpatialMetric(demandMetric(), events, WINDOW), "GEO_INSIGHT_SCOPE");
    const branchMetric = demandMetric({ branchId: "b1" });
    expectCode(() => aggregateSpatialMetric(branchMetric, people(20, OLAYA, "olaya", { branchId: "b2" }), WINDOW), "GEO_INSIGHT_SCOPE");
    assert.strictEqual(aggregateSpatialMetric(branchMetric, people(20, OLAYA, "olaya", { branchId: "b1" }), WINDOW).cells[0].count, 20);
  });

  it("only events inside the window count, and the window matches the metric", () => {
    const outside = people(20, OLAYA, "late", { occurredAt: "2026-10-04T00:00:00.000Z" });
    assert.strictEqual(aggregateSpatialMetric(demandMetric(), outside, WINDOW).cells.length, 0);
    expectCode(() => aggregateSpatialMetric(demandMetric(), [], { start: WINDOW.start, end: "2026-09-11T00:00:00.000Z" }), "GEO_INSIGHT_WINDOW_INVALID");
    // An overlapping, shifted window cannot be released, so windows cannot be differenced.
    expectCode(() => aggregateSpatialMetric(demandMetric(), [], { start: "2026-09-05T00:00:00.000Z", end: "2026-10-05T00:00:00.000Z" }), "GEO_INSIGHT_WINDOW_INVALID");
    expectCode(() => aggregateSpatialMetric(demandMetric(), [], { start: "2026-09-04T06:00:00.000Z", end: "2026-10-04T06:00:00.000Z" }), "GEO_INSIGHT_WINDOW_INVALID");
  });
});

describe("GEO-09 export and stability", () => {
  it("no raw-coordinate or subject export", () => {
    const events = [...people(30, OLAYA, "olaya"), ...people(15, MALAZ, "malaz")];
    const exported = exportSpatialInsight(releaseSpatialCells(demandMetric(), aggregateSpatialMetric(demandMetric(), events, WINDOW)));
    expectNoLocation(exported);
    assert.deepStrictEqual(Object.keys(exported).sort(), ["cells", "metricId", "minCohort", "missing", "resolution", "subjectKind", "total", "valueKind", "window"]);
    assert.deepStrictEqual(Object.keys(exported.cells[0]).sort(), ["cellId", "reason", "suppressed", "value"]);
    expectCode(() => exportSpatialInsight({ ...exported, cells: [{ cellId: "24.7136,46.6753", value: 30, suppressed: false, reason: null }] }), "GEO_INSIGHT_CELL_INVALID");
    // A hand-built release cannot smuggle a small count or a weak cohort into an export.
    expectCode(() => exportSpatialInsight({ ...exported, cells: [{ cellId: cellIdFor(OLAYA, 0.05), value: 1, suppressed: false, reason: null }] }), "GEO_INSIGHT_SUPPRESSION_TOO_WEAK");
    expectCode(() => exportSpatialInsight({ ...exported, minCohort: 3 }), "GEO_INSIGHT_SUPPRESSION_TOO_WEAK");
    expectCode(() => exportSpatialInsight({ ...exported, missing: 2 }), "GEO_INSIGHT_SUPPRESSION_TOO_WEAK");
  });

  it("stable aggregation: order and duplicates do not change the output", () => {
    const events = [...people(30, OLAYA, "olaya"), ...people(15, MALAZ, "malaz"), ...people(4, DIRAH, "dirah"), ...people(3, null, "nolocation")];
    const first = aggregateSpatialMetric(demandMetric(), events, WINDOW);
    const reversed = aggregateSpatialMetric(demandMetric(), [...events].reverse(), WINDOW);
    const duplicated = aggregateSpatialMetric(demandMetric(), [...events, ...events.slice(0, 10)], WINDOW);
    assert.deepStrictEqual(reversed, first);
    assert.deepStrictEqual(duplicated, first);
    assert.deepStrictEqual(first.cells.map((cell) => cell.cellId), [...first.cells.map((cell) => cell.cellId)].sort());
  });

  it("pre-coarsened cells must match the metric resolution and an event has one location form", () => {
    const precoarse = people(12, null, "pre", { cellId: "g5:494:933" });
    assert.strictEqual(aggregateSpatialMetric(demandMetric(), precoarse, WINDOW).cells[0].count, 12);
    expectCode(() => aggregateSpatialMetric(demandMetric(), people(1, null, "pre", { cellId: "g10:247:466" }), WINDOW), "GEO_INSIGHT_CELL_INVALID");
    expectCode(() => aggregateSpatialMetric(demandMetric(), people(1, OLAYA, "both", { cellId: "g5:494:933" }), WINDOW), "GEO_INSIGHT_CELL_INVALID");
    expectCode(() => aggregateSpatialMetric(demandMetric(), people(1, OLAYA, "anon", { subjectRef: null as never }), WINDOW), "GEO_INSIGHT_METRIC_INVALID");
  });
});
