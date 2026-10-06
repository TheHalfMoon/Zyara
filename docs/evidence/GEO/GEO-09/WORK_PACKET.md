# GEO-09 Work Packet — Spatial Insights (aggregated views only)

Base: `main` @ `fded04b8cf4d44e60f23a8cc0434664628a8d902`.
Branch: `feat/zyara-network-geo09-spatial-insights`.
Authority: geospatial plan §3 (Insights), §16 (precise patient-location privacy), §16A (sensitive care intent), §22 (spatial analytics privacy) and the invariant `SpatialAnalyticsCell != IndividualPatientLocation`; geospatial handoff §11 (GEO-09). Precedents: `packages/analytics/src/metrics.ts` (complementary small-cell suppression) and `packages/partner-analytics` (k = 5).
Exit marker: `GEO_09_SPATIAL_INSIGHTS_QUALIFIED = TRUE`.

## Placement

GEO-09 depends only on GEO-01 (handoff §2). It extends `@zyara/geospatial` with `insights.ts`, puts its tests in `tests/geo01a`, and adds its database checks to the GEO PostGIS smoke, so the existing `geo01a-ci` runs them. Migration: `050_geo_spatial_insights.sql`.

## Scope

"Implement only aggregated views. Start with native Zyara metrics."

Three native metrics are in scope:

- **`DEMAND_BY_CELL`:** distinct people with a care request (search or booking intent) per cell. Person-derived.
- **`SUPPLY_BY_CELL`:** current branch locations per cell. Facility-derived.
- **`CAPACITY_GAP_BY_CELL`:** demand ÷ supply per cell. A ratio over person-derived demand.

Travel burden, catchment and referral flows are later slices. They need routing (GEO-05) and referral sources.

## Coarse cells

- **Grid.** A fixed lat/lon grid. The resolutions allowed are 0.05°, 0.10°, 0.25° and 0.50°; nothing finer than 0.05° (about 5.5 km) exists.
- **Cell id.** The format is `g{centi-degrees}:{latIndex}:{lonIndex}`, where `latIndex = floor(lat / res)` and `lonIndex = floor(lon / res)`. For example, `g5:494:933`.
- **Coordinates are discarded.** A point is turned into its cell id in memory and then dropped. No coordinate, subject reference or event id is ever part of an output.

## Metric definition (every field required)

Each `SpatialMetricDefinition` has:

- `metricId`, `tenantId` and an optional `branchId` scope;
- `subjectKind` (`PERSON` or `FACILITY`) and `valueKind` (`COUNT` or `RATIO`);
- `numerator` and `denominator` (a description code, or null for a pure count);
- `source` (an event or projection code) and `purpose` (a code);
- `windowDays` (1–366) and `resolution`;
- `minCohort`, `sensitive` and `missingness` (`REPORTED`: the count of events without a usable location is part of the release, under the same suppression);
- `retentionDays` (1–400).

**Rules:**

- A `PERSON` metric needs `minCohort ≥ 11`.
- A `sensitive` metric (care intent in plan §16A) needs `minCohort ≥ 20` and a resolution of at least 0.10°.
- A `FACILITY` metric needs `minCohort ≥ 1`.
- A `RATIO` needs a denominator.

## Aggregation (`aggregateSpatialMetric`)

- **Input.** Events with a `tenantId`, an `occurredAt`, an optional `subjectRef` (an opaque id, required for `PERSON`), and either a `point` or an already-coarse `cellId`.
- **Scope.** An event from another tenant, or from another branch when the metric is branch-scoped, makes the run **fail closed**. Such events are never silently filtered out.
- **Window.** Events outside `[windowStart, windowEnd)` are excluded. The window length must equal `windowDays`.
- **Distinct people.** For `PERSON` metrics a cell counts distinct subjects, so one person counts at most once per cell.
- **Missing locations.** An event without a usable location is counted in `missing`; it is never dropped silently.
- **Determinism.** The output is sorted by cell id and does not depend on input order.

## Release (`releaseSpatialCells`)

- **Small cells.** A cell with a count below `minCohort` is suppressed: its value is null.
- **Complementary suppression.** If exactly one cell is suppressed while the total is released, the smallest visible cell is also suppressed, so the hidden value cannot be derived. The same applies to `missing`.
- **Totals.** The total is released only if it is at least `minCohort`.
- **Ratios.** A ratio cell is suppressed when its numerator cell is suppressed. With zero supply the value is null with reason `NO_SUPPLY`; it is never infinite.

## Export (`exportSpatialInsight`)

- **What it contains.** Only the metric id, window, resolution, `{ cellId, value, suppressed, reason }` cells, the released total and the released missing count.
- **What it never contains.** No coordinates, subjects or events. Exporting a patient-dot or raw-point layer is impossible by construction, and the test asserts it.

## Database (`050_geo_spatial_insights.sql`, additive)

`geo_insight_cells` is the released aggregate store:

- **Rows.** One row per tenant, metric, window and cell. It is append-only (`SELECT` plus column-level `INSERT`), and `computed_at` is database time.
- **Columns.** There is no geometry, coordinate, patient, subject, account or session column.
- **CHECKs.** They enforce:
  - the cell id pattern, with a prefix that matches the resolution;
  - `suppressed = (value IS NULL)`;
  - a `PERSON` minimum cohort of at least 11, and at least 20 plus a coarse resolution when sensitive;
  - an unsuppressed `PERSON` `COUNT` value of at least `min_cohort`;
  - a window of at most 366 days;
  - `expires_at` within 400 days of `computed_at`.
- **Integrity.** FORCE RLS on `app.current_tenant`, and a composite branch FK when the metric is branch-scoped.

## Required tests (handoff)

- low-count suppression, including the complementary and missingness cases, both in TypeScript and as a database CHECK;
- cross-tenant isolation: a foreign event fails closed, and in the smoke RLS hides rows and refuses cross-tenant inserts;
- no patient dots: outputs carry cell ids only, with no finer-than-0.05° grid;
- no raw-coordinate dashboard export: the exported JSON has no coordinates or subject references;
- stable aggregation: the output is identical under input permutation and duplicate events.

Plus:

- the metric definition validation rules;
- the ratio's `NO_SUPPLY` case and its suppression propagation;
- the window and branch scope;
- append-only storage and one row per cell per window (smoke).
