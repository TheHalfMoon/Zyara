# GEO-09 Result — Spatial Insights (aggregated views only)

Base: `main` @ `fded04b8`. Branch: `feat/zyara-network-geo09-spatial-insights`. PR: TheHalfMoon/Zyara#131. Scope: `WORK_PACKET.md`.
The exit marker `GEO_09_SPATIAL_INSIGHTS_QUALIFIED = TRUE` is recorded in the closure after exact-head CI and merge.

## Delivered

- `insights.ts`:
  - coarse cells (0.05° and coarser): `cellIdFor` and `parseCellId`;
  - governed metric definitions: `validateMetricDefinition` (person cohort ≥ 11, sensitive ≥ 20 on ≥ 0.10°, supply pinned);
  - a fixed window grid: `validateWindow`;
  - fail-closed, distinct-subject, deterministic aggregation: `aggregateSpatialMetric`;
  - cohort, complementary and missingness suppression: `releaseSpatialCells`;
  - capacity gap, computed on read: `releaseCapacityGap`;
  - a coordinate-free, cohort-re-checking export: `exportSpatialInsight`.
- Migration `050_geo_spatial_insights.sql`:
  - a source → population registry;
  - release headers and cells with cohort, grid and window CHECKs;
  - a `btree_gist` exclusion allowing one person release per population over any overlapping span;
  - the single write path `geo_publish_insight()`, with an inline hidden-mass check;
  - tenant-filtered live views;
  - the tombstoning purge `geo_purge_expired_insights()`;
  - FORCE RLS, and no table privileges for the application.

## Handoff tests → proof

| Handoff test | Unit (`tests/geo01a/insights.test.ts`) | PostGIS smoke (GEO-09 section) |
| --- | --- | --- |
| low-count suppression | small cells; complementary suppression (one and several hidden cells); small missing counts; withheld total; small total | unsuppressed small counts, totals and missing refused; hidden mass checked inline (also under `SET CONSTRAINTS ALL IMMEDIATE`) |
| cross-tenant isolation | a foreign tenant or branch event fails closed | publish only for the current tenant; foreign branch refused; t2 sees nothing; no base-table access |
| no patient dots | cells only, at 0.05° or coarser; coordinates and fine grids refused | coordinate-shaped and fine-grid cell ids refused; no geometry or identity columns |
| no raw-coordinate dashboard export | exported JSON has no coordinates or subjects; a hand-built small count, weak cohort, small hidden mass or facility relabel is refused | live views expose cell ids and released values only |
| stable aggregation | identical output under permutation and duplicates; sorted by cell id | fixed window grid; one person release per population over any overlapping span (grid, scope, numerator, nested window, subset source); tombstoned slots not re-released |

## Runs

- **CI at `0e0544d`:** `geo01a-ci` passed: 60/60 tests (typecheck and lint clean), and on PostGIS 3.4.3 the PostGIS smoke printed the GEO-01A, GEO-01B, GEO-01C and GEO-09 PASS lines (run 37544434741). The final head is re-run by CI before merge.
- **Earlier CI:** `d50c5ef` failed on the smoke's own column guard (`subject_kind`), which was fixed in `f9238a4`. Every later head was green.
- **Working method.** Per the founder's instruction not to depend on local state, this slice was authored in scratch files and committed only through the GitHub API. Tests, typecheck, lint and the database proof ran in CI. The migration was syntax-checked locally with the PostgreSQL parser (`libpg-query` 18.1.5).

## Reviews

- **Jev 0.3.2:**
  - The design challenge on the work packet answered all "no" (max p = 0.14).
  - Final post-implementation: `insights.ts` + tests all "no" (max p = 0.10); 050 + smoke section all "no" (max `reidentification` p = 0.22).
- **Alibaba Open Code Review v1.12.11, delegate mode:**
  - The rules ran in a throwaway git repo in scratch: rule group "system" JS/TS for `insights.ts` and the smoke, and "system default" for migration 050.
  - The host applied them. One violation, a nested ternary in the cell sort, was fixed. Otherwise there is no `any`, `var`, `==` or injection.
  - No OCR-model verdict is claimed.
- **pstack:** see `PSTACK_EVIDENCE.md`. Six must-fix re-identification and bypass findings across three cycles are all closed; the final cycle had no must-fix.
- **Graft 0.21.1 (scratch subset):**
  - `graft build` ran on the changed files only.
  - `graft callers`: `validateWindow` is used by aggregation, release and gap, and `validateGeoPoint` is now also called by `cellIdFor`.
  - The insights exports have no production caller yet; the Insights dashboards are the intended consumers.

## Residual risks

See `SECURITY_PRIVACY_REVIEW.md`:

- the threshold policy needs a re-identification review before production;
- totals are units, not distinct people;
- the source → population mapping is a reviewed migration;
- there is no live writer yet;
- per-branch and multi-length releases over one population are an accepted product cost.
