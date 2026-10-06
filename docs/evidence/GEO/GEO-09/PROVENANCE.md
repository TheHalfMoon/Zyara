# GEO-09 Provenance

| Component | Decision | Source | Notes |
| --- | --- | --- | --- |
| `packages/geospatial/src/insights.ts` | Zyara-native | this repository | No donor code. The coarse lat/lon grid, governed metric definitions, cohort and complementary suppression, and the export are written here. There is no H3/S2 dependency. |
| Migration `050_geo_spatial_insights.sql` | Zyara-native | this repository | Additive. |
| `btree_gist` | **DEPENDENCY (PostgreSQL contrib)** | PostgreSQL 16 contrib, trusted extension | Used for the person-release exclusion constraint (text equality in a GiST index). It ships with PostgreSQL; no new package. |
| Complementary small-cell suppression | REFERENCE | `packages/analytics/src/metrics.ts` (`suppressSmallCells`) | The same principle, extended to a loop over hidden mass and missingness. |
| Cohort thresholds (person 11, sensitive 20) | Zyara decision | plan §§16A, 22 | Stricter than the partner-analytics k = 5 precedent, because these are location-linked health aggregates; the sensitive-intent stronger threshold comes from plan §16A. The values are recorded here for review and can be raised by a later migration. |

All test and smoke data is synthetic (Riyadh-area points, invented subject refs). SBOM impact: none.
