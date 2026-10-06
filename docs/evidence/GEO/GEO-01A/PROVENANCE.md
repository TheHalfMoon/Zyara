# GEO-01A Provenance

## Source decisions

| Component | Decision | Revision / version | License | Notes |
| --- | --- | --- | --- | --- |
| PostGIS (database extension) | **DEPENDENCY** | CI: `postgis/postgis:16-3.4` service image (PostGIS 3.4 on PostgreSQL 16). Local qualification: PostGIS 3.6.4 via Debian `postgresql-16-postgis-3` on `postgres:16` | GPL-2.0-or-later | Used as a server-side extension through `CREATE EXTENSION postgis`. No PostGIS source is copied or linked into Zyara code, and nothing is redistributed by this repository. The geo plan §4 names PostGIS as the geometry truth. |
| MapLibre, OpenFreeMap, God's Eye View | **not used in this slice** | — | — | Renderer, basemap and scene donors start at GEO-02/GEO-07. |
| Existing M012 geospatial helpers | **REUSE** | this repository | — | `visiblePins` (100 m pin rule) is the parity reference for `displayGeoAssertion`. |

No donor source code was copied or adapted. Every line is Zyara-native.

## Data

All coordinates are synthetic, for example a Riyadh-area point (46.6753, 24.7136) and deliberately invalid values. No real provider, facility, patient or address data is used, and no geocoder, basemap or router is called.

## Upgrade strategy

- PostGIS minor and major upgrades follow the PostgreSQL image upgrade. The migration uses only `GeometryType`, `ST_SRID`, `ST_X`, `ST_Y`, `ST_IsEmpty` and a GIST index, which are stable across PostGIS 3.x. CI pins `16-3.4`, and local qualification on 3.6.4 showed the same behaviour.
- PostGIS ships as a database extension, not in the application bundle, so the application SBOM is unchanged. The database image's own SBOM covers it.
