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

## Windows

- A window starts at UTC midnight on a multiple of `windowDays` days since the epoch, and its UTC length is exact, independent of the session time zone. This is enforced in TypeScript (`validateWindow`) and in the database.
- In the database, **one person-derived release per source covers any overlapping time span**, whatever the window length, grid, scope, metric id or numerator (`EXCLUDE USING gist`, `btree_gist`). Nested or overlapping releases of the same people can therefore never be differenced. A distinct metric over the same people needs its own source code, and only if it does not overlap.
## Release (`releaseSpatialCells`)

- **Small cells.** A cell below `minCohort` is suppressed: its value is null and its reason is `SUPPRESSED_LOW_COUNT`. A missing count with 0 < missing < k is suppressed too.
- **Complementary suppression.** While the total is released and the hidden mass (suppressed cells plus a suppressed missing count) is greater than 0 but below k, the smallest visible cell is also suppressed (`SUPPRESSED_COMPLEMENTARY`). If no visible cell is left, the total is withheld.
- **Totals.** The total is released only if it is at least `minCohort`. `total` counts released units: a person counts once per cell and once in missing.
- **Governance travels with the release.** A release carries `subjectKind`, `valueKind` and `minCohort`.
- **Ratios (`releaseCapacityGap`).**
  - A ratio is computed on read from released demand and supply and is **never stored**; a stored ratio would be another release of demand.
  - Demand must be a released person count with at least the gap metric's cohort, and supply must be `SUPPLY_BY_CELL` on the same window, grid and branch scope.
  - A suppressed demand cell stays suppressed (`SUPPRESSED_NUMERATOR`).
  - Zero supply gives `NO_SUPPLY` with a null value; it is never infinite.
- **Only supply is facility-derived.** `SUPPLY_BY_CELL` is pinned to the `current_branch_locations` numerator from `geo_current_location_assertions`. Every other metric is person-derived, so a person count cannot be relabelled to escape its cohort. Every event needs an opaque `subjectRef`, so duplicates never double-count.

## Export (`exportSpatialInsight`)

- **What it contains.** Governance (metric id, subject and value kind, cohort, window, resolution), `{ cellId, value, suppressed, reason }` cells, the released total and the released missing count.
- **Re-checks.** It validates every cell id. It refuses a facility label on any metric other than supply, a person release with a cohort below 11, a released total that leaves a hidden mass greater than 0 but below k, an unsuppressed person count below the cohort, a small total or missing count, and implicit suppression. A hand-built small count therefore cannot be exported.
- **What it never contains.** No coordinates, subjects or events.

## Database (`050_geo_spatial_insights.sql`, additive)

Only released **counts** are stored. Ratios are never stored, and there is no value-kind column.

- **`geo_insight_releases`** (one header per tenant, metric and window) holds:
  - the governance: subject kind, numerator, source, purpose, sensitive, cohort and retention;
  - the grid, the scope (optional branch, composite FK) and the fixed-grid window;
  - the released `total` and `missing`.

  Its CHECKs enforce:
  - the cohort rules: person ≥ 11, and sensitive ≥ 20 on a grid of at least 0.10°;
  - supply is the only facility-derived metric, and it is pinned;
  - a released total or missing count is never small;
  - the UTC window grid and length.

  The person-release exclusion constraint is described under Windows.
- **`geo_insight_cells`:**
  - One row per cell, pinned to its header by a composite FK on grid, subject kind and cohort, so a cell cannot relabel its governance.
  - The cell id prefix must match the grid.
  - Suppression is explicit (`suppressed` ⇔ a null value ⇔ a reason). The true count of a suppressed cell is never stored.
  - An unsuppressed person count is at least the cohort.
- **Sealed releases.** Cells are written only in the transaction that created their release; a trigger compares the header's `computed_at` with `now()`.
- **Complementary suppression in the database.** At commit, a deferred constraint trigger requires that a released total leaves a hidden mass (total − visible cells − released missing) of 0 or at least the cohort.
- **Access.**
  - FORCE RLS on both tables; append-only (column-level `INSERT`, with `computed_at` as database time).
  - The application has **no SELECT on the base tables**. It reads the `geo_insight_*_live` views, which filter by `app.current_tenant`, retention and purge state (`security_barrier`).
- **Retention.** `geo_purge_expired_insights()` (`SECURITY DEFINER`, pinned `search_path`, current tenant only) deletes expired cells and **tombstones** the header (counts cleared, key kept). A purged slot can never be re-released.
- **No location columns.** Neither table has a geometry, coordinate, patient, subject, account or session column.
## Required tests (handoff)

- low-count suppression, including the complementary (multi-cell) and missingness cases in TypeScript, and the database refusing unsuppressed small cells, totals and missing counts;
- cross-tenant isolation: a foreign event fails closed, and in the smoke RLS hides rows and refuses cross-tenant inserts;
- no patient dots: outputs carry cell ids only, with no finer-than-0.05° grid;
- no raw-coordinate dashboard export: the exported JSON has no coordinates or subject references;
- stable aggregation: the output is identical under input permutation and duplicate events.

Plus:

- the metric definition validation rules;
- the ratio's `NO_SUPPLY` case and its suppression propagation;
- the window and branch scope;
- fixed window grid, one release per person numerator and window, cells pinned to release governance, view-only reads, scoped retention purge and append-only storage (smoke).
