# GEO-09 Security and Privacy Review

- **No patient dots.**
  - Points become coarse cell ids (0.05° or coarser) in memory and are then discarded.
  - No output, export or table carries a coordinate, subject reference or event id. The smoke checks the tables for geometry and identity columns.
  - The export validates every cell id.
- **Small-cohort suppression.**
  - Person-derived counts need a cohort of at least 11; sensitive care intent needs at least 20 on a grid of at least 0.10°.
  - Suppressed cells, small missing counts and small totals are withheld.
  - Complementary suppression loops until the hidden mass is 0 or at least k, or the total is withheld.
  - The database re-checks each of these: CHECKs on cells, totals and missing counts, and an inline hidden-mass check in the single publish function, which a constraint-deferral setting cannot postpone.
- **Differencing defences.**
  - Windows sit on a fixed UTC grid.
  - Sources are registered by the migrator and map to populations. The database allows one person-derived release per population over any overlapping time span, so another source (including a subset or renamed source), grid, scope, metric id, numerator or window length over the same people is refused (exclusion constraint).
  - Releases are written atomically by one function; no cell can be added later.
  - Ratios are computed on read and never stored.
  - The retention purge tombstones headers, so a purged slot is never re-released.
- **Governance.**
  - Every metric declares numerator, denominator (ratios), source, purpose, window, grid, cohort, missingness (`REPORTED`) and retention (at most 400 days).
  - Only `SUPPLY_BY_CELL` is facility-derived, and it is pinned to the branch-location count.
- **Scope.**
  - Foreign tenant or branch events make aggregation fail closed.
  - FORCE RLS; the application has no SELECT on the base tables and reads tenant-filtered, retention-filtered `security_barrier` views.
  - The purge is scoped to `app.current_tenant`.
- **Integrity.** Append-only for the application (column-level INSERT; `computed_at` and `purged_at` are not insertable), and the purge is the only removal path.

Residual risks:

- **Thresholds are a policy choice.** The cohort thresholds (11 and 20) are a Zyara policy choice under the plan, not a regulator-certified standard. They need a re-identification review before production dashboards (plan §22).
- **Totals are units, not distinct people.** `total` counts released units: a person seen in two cells counts twice. Suppression reasoning uses the same unit arithmetic.
- **Population mapping is reviewed.** The population exclusion is only as good as the migrator's source → population mapping. Registering a new source is a reviewed migration.
- **Writing path not built.** No live writer exists yet. The first production writer must use these functions and run under the tenant context.
