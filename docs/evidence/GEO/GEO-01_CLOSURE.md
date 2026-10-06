# GEO-01 Closure — Geo Truth (01A + 01B + 01C)

| Slice | PR | Merge | Migration | Marker |
| --- | --- | --- | --- | --- |
| GEO-01A geo assertion + precision contract | TheHalfMoon/Zyara#118 | `bbbbf2fa` | 047 | `GEO_01A_ASSERTION_CONTRACT_QUALIFIED = TRUE` |
| GEO-01B entrances + service-area geometry | TheHalfMoon/Zyara#127 | `c20f90c4` | 048 | `GEO_01B_ACCESS_GEOMETRY_QUALIFIED = TRUE` |
| GEO-01C external spatial identity + conflation | TheHalfMoon/Zyara#128 | `808ac11a` | 049 | `GEO_01C_CONFLATION_QUALIFIED = TRUE` |

Each slice was merged with a normal merge commit pinned to its qualified head (`--match-head-commit`). Each passed exact-head CI with the real PostGIS smoke, and post-merge `main` CI. Per-slice details are in `GEO-01A/CLOSURE.md`, `GEO-01B/CLOSURE.md` and `GEO-01C/CLOSURE.md`.

**GEO-01 Geo truth is qualified.** Facility location truth now has:

- precision, provenance and supersession (01A);
- entrances, accessibility facts and service areas (01B);
- governed external identity, conflicts and audited coordinate corrections (01C).

Across all three: facility data only, no patient location, append-only, tenant RLS.

## What this closure does not claim

- No real facility, entrance, accessibility, service-area or external POI data. Everything is synthetic.
- No public directory projection, renderer, basemap, geocoder or router.
- No production map surface.
- Alibaba Open Code Review ran in delegate mode only for all three slices, with no OCR-model verdict.

## Next GEO frontier

Per the GEO handoff dependency graph (§2), these are now dependency-ready:

- **GEO-02** (renderer and basemap; GEO-02A is the MapLibre qualification). It needs a released `maplibre-gl` pin after license and SBOM review.
- **GEO-09** (spatial insights). It depends only on GEO-01.
- **GEO-10** (AI and voice geo tools). In the graph it follows AIF-01, which is qualified.

GEO-03 (map/list discovery) follows GEO-02 and must honour the GEO-01C forward requirements.

New CI workflows remain blocked until the GitHub token has the `workflow` scope (see AIF-03A, PR TheHalfMoon/Zyara#126).
