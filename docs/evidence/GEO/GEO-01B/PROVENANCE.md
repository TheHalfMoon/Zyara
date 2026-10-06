# GEO-01B Provenance

| Component | Decision | Source | Notes |
| --- | --- | --- | --- |
| `packages/geospatial/src/access.ts` | Zyara-native | this repository | No donor code. Segment-intersection, ray-casting and spherical-area routines are standard computational geometry, written here. |
| PostGIS (`ST_IsValid`, `ST_Area(geography)`, GIST) | **DEPENDENCY** | CI `postgis/postgis:16-3.4` (observed PostGIS 3.4.3) | GPL-2.0-or-later database extension, already admitted in GEO-01A. No new dependency. |
| GEO-01A contract (`validateGeoPoint`, source and verification vocabularies, `SAUDI_ARABIA_BOUNDS`) | REUSE | this repository | Imported. |
| Entrance kinds and accessibility facts | REFERENCE | geospatial plan §§6, 17 | Vocabulary from the canonical plan. |

All geometry is synthetic (Riyadh, Jeddah and Cairo test shapes). No real facility, entrance or service-area data is used. SBOM impact: none, because the existing package is extended.
