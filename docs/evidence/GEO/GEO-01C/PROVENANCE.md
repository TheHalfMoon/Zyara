# GEO-01C Provenance

| Component | Decision | Source | Notes |
| --- | --- | --- | --- |
| `packages/geospatial/src/conflation.ts` | Zyara-native | this repository | No donor code. Equality-only name normalization, candidate classification, link/conflict/correction rules and the anchor walk are written here. |
| Migration `049_geo_conflation.sql` | Zyara-native | this repository | Additive. Two new triggers on the GEO-01A `geo_location_assertions` table; migration 047 is unchanged. |
| PostGIS (`ST_Distance(geography)`) | **DEPENDENCY** | CI `postgis/postgis:16-3.4` (observed PostGIS 3.4.3 in earlier GEO-01 runs) | Already admitted in GEO-01A. No new dependency. |
| PostgreSQL advisory locks, deferred constraint triggers, recursive CTE | platform | PostgreSQL 16 | Built-in features. |
| GEO-01A/B contract (`validateGeoPoint`, `haversineMeters`, `isPublicSafeText`, `geo_public_text_ok`) | REUSE | this repository | Imported. |
| External namespaces `osm-node`, `osm-way`, `osm-relation` | REFERENCE | source adoption §6 (OpenStreetMap ecosystem) | Identifier namespaces only. No OSM data is imported, copied or bundled; OSM rights and attribution remain with the basemap/geocoder qualification. No geocoder namespace is seeded (source adoption §7: no geocoder admitted). |
| Conflation workflow and rules | REFERENCE | geospatial plan §§13A, 23; handoff §3 GEO-01C | |

All data in tests and the smoke is synthetic (Riyadh-area points, invented facility names and ids such as `osm-node:123456789`). No real facility, external POI or coordinate data is used. SBOM impact: none. The local SQL parse check used `libpg-query` 18.1.5 in a scratch directory only; it is not a project dependency.
