# Zyara Geospatial Readiness Checklist — 2026-09-22

**Purpose:** prove that the geospatial plan has no known architectural gap that blocks bounded implementation.

Legend:

- `COVERED` — explicitly planned with owner/boundary/gate.
- `EXTERNAL_GATE` — design exists but evidence/authority must come from outside the repository.
- `DEFERRED_BY_DESIGN` — intentionally not required for the first implementation leaf.

| # | Dimension | State | Evidence / decision |
|---:|---|---|---|
| 1 | Provider Graph remains healthcare truth | COVERED | canonical plan §4 |
| 2 | PostGIS remains geometry truth | COVERED | §4 |
| 3 | WGS84/SRID contract | COVERED | §4 |
| 4 | Invalid coordinate rejection | COVERED | §4/§34 |
| 5 | Precision classes | COVERED | §5 |
| 6 | Coordinate provenance/freshness | COVERED | §5 |
| 7 | Assertion supersession/history | COVERED | §5/§6 |
| 8 | Entrance separate from centroid | COVERED | §17 |
| 9 | Service area != availability | COVERED | §6 |
| 10 | MapLibre renderer boundary | COVERED | §7 |
| 11 | MapLibre license/NOTICE | COVERED | §7/source adoption |
| 12 | MapLibre package pin/SBOM | COVERED | handoff GEO-02A |
| 13 | WebGL unavailable fallback | COVERED | §25/§34 |
| 14 | Renderer bundle/performance budget | COVERED | §28 |
| 15 | RTL/Arabic renderer qualification | COVERED | §27/§34 |
| 16 | OpenFreeMap role | COVERED | §8 |
| 17 | OpenFreeMap explicit limitations | COVERED | §8 |
| 18 | Public endpoint not assumed SLA | COVERED | §8 |
| 19 | Self-host isolation | COVERED | §8 |
| 20 | Tile update/rollback | COVERED | §25 |
| 21 | Tile/style versioning | COVERED | §8/§30 |
| 22 | OSM/OpenMapTiles rights separate | COVERED | §9 |
| 23 | Attribution | COVERED | §9/§35 |
| 24 | ODbL derivative-data review | COVERED | §9 |
| 25 | Third-party tile privacy | COVERED | §8 |
| 26 | Geocoder separate from basemap | COVERED | §10 |
| 27 | Provider-neutral geocoder contract | COVERED | §10 |
| 28 | Saudi Arabic address benchmark | COVERED | §11 |
| 29 | Transliteration/numeral cases | COVERED | §11 |
| 30 | Official Saudi address source gate | EXTERNAL_GATE | §11 |
| 31 | Geocoder storage/terms boundary | COVERED | §10 |
| 32 | Reverse-geocode privacy | COVERED | §10 |
| 33 | Router separate from geocoder | COVERED | §12 |
| 34 | Straight-line != route != ETA | COVERED | §12 |
| 35 | Traffic-aware disclosure | COVERED | §12 |
| 36 | Router privacy/egress | COVERED | §13 |
| 37 | Saudi urban/rural routing benchmark | COVERED | §12/handoff |
| 38 | Production routing provider | EXTERNAL_GATE | §39 |
| 39 | Map/list parity | COVERED | §14 |
| 40 | Explicit Search-this-area | COVERED | §14 |
| 41 | Clustering presentation-only | COVERED | §14 |
| 42 | Location permission optional | COVERED | §15 |
| 43 | Manual area search | COVERED | §15 |
| 44 | No background location tracking | COVERED | §16 |
| 45 | No precise location in ordinary telemetry | COVERED | §16 |
| 46 | No precise location in public share URL | COVERED | §20 |
| 47 | Patient home inference prohibited by default | COVERED | §16 |
| 48 | Location retention/expiry | COVERED | §16 |
| 49 | Entrance/accessibility provenance | COVERED | §17 |
| 50 | No AI/imagery accessibility inference | COVERED | §17 |
| 51 | GEV exact source pin | COVERED | §18 |
| 52 | GEV selective adaptation only | COVERED | §18 |
| 53 | Surveillance features rejected | COVERED | §18 |
| 54 | GEV third-party data/assets isolated | COVERED | §18/source adoption |
| 55 | Scene/layer state | COVERED | §19/hand-off GEO-07 |
| 56 | Layer authorization before query | COVERED | §19 |
| 57 | Share-state privacy | COVERED | §20 |
| 58 | Optional 3D only | COVERED | §21 |
| 59 | 3D provider rights separate | COVERED | §21 |
| 60 | 3D accessibility fallback | COVERED | §21 |
| 61 | Spatial analytics coarse aggregation | COVERED | §22 |
| 62 | Minimum-cohort suppression | COVERED | §22 |
| 63 | No patient dots | COVERED | §22 |
| 64 | Cross-tenant analytics isolation | COVERED | §22/§34 |
| 65 | AI geo typed capabilities | COVERED | §23 |
| 66 | AI cannot verify geocoder output | COVERED | §23 |
| 67 | Emergency-dispatch boundary | COVERED | §24 |
| 68 | Basemap degraded mode | COVERED | §25 |
| 69 | Geocoder degraded mode | COVERED | §25 |
| 70 | Router degraded mode | COVERED | §25 |
| 71 | 3D degraded mode | COVERED | §25 |
| 72 | Unsafe provider fallback prohibited | COVERED | §25 |
| 73 | Style/GeoJSON XSS | COVERED | §26 |
| 74 | SSRF/provider URL allowlist | COVERED | §26 |
| 75 | Credential leakage | COVERED | §26 |
| 76 | Malicious 3D assets | COVERED | §26 |
| 77 | Prompt injection from map metadata | COVERED | §26 |
| 78 | Low-count spatial re-identification | COVERED | §26 |
| 79 | Tile crawler/cost exhaustion | COVERED | §26 |
| 80 | Keyboard/list accessibility | COVERED | §27 |
| 81 | Screen-reader textual alternative | COVERED | §27 |
| 82 | Reduced motion/high contrast | COVERED | §27 |
| 83 | Bidi-safe addresses | COVERED | §27 |
| 84 | Low/mid-tier mobile performance | COVERED | §28 |
| 85 | 3D lazy load | COVERED | §28 |
| 86 | Constrained-network policy | COVERED | §29 |
| 87 | Offline full navigation not overclaimed | COVERED | §29 |
| 88 | Zyara-owned style/version/rollback | COVERED | §30 |
| 89 | Fact-specific freshness | COVERED | §31 |
| 90 | PHI-light geo observability | COVERED | §32 |
| 91 | Geospatial ranking neutrality | COVERED | §33 |
| 92 | Paid status excluded from ranking | COVERED | §33 |
| 93 | Domain/DB test matrix | COVERED | §34 |
| 94 | Geocoder benchmark matrix | COVERED | §34 |
| 95 | Router benchmark matrix | COVERED | §34 |
| 96 | Privacy tests | COVERED | §34 |
| 97 | Renderer tests | COVERED | §34 |
| 98 | 3D tests if admitted | COVERED | §34 |
| 99 | Feature flags/kill switches | COVERED | §35 |
| 100 | First bounded implementation leaf | COVERED | §38 |
| 101 | Production tile SLA | EXTERNAL_GATE | §39 |
| 102 | Real provider coordinates | EXTERNAL_GATE | §39 |
| 103 | Real entrance/accessibility validation | EXTERNAL_GATE | §39 |
| 104 | Production geocoder access | EXTERNAL_GATE | §39 |
| 105 | Production routing/traffic access | EXTERNAL_GATE | §39 |
| 106 | 3D imagery rights | EXTERNAL_GATE | §39 |
| 107 | Privacy/legal production signoff | EXTERNAL_GATE | §39 |
| 108 | Real clinic/patient validation | EXTERNAL_GATE | §39 |
| 109 | PR #94 separation/reconciliation | COVERED | implementation handoff |
| 110 | N6 independence | COVERED | implementation handoff |
| 111 | AIF prerequisite for AI geo tools | COVERED | GEO-10 |
| 112 | Evidence packet convention | COVERED | implementation handoff |
| 113 | Direct donor copy provenance | COVERED | source adoption |
| 114 | Provider-specific kill switch | COVERED | §35 |
| 115 | Historical tile/style attribution | COVERED | source adoption/§31 |
| 116 | Schema migration compatibility | COVERED | GEO-01/GEO-11 |
| 117 | Antimeridian/polar correctness | COVERED | §26/§34 |
| 118 | Cache poisoning | COVERED | §26 |
| 119 | Private route-origin cache isolation | COVERED | §6/§13 |
| 120 | Search viewport does not bypass ranking policy | COVERED | §14/§33 |

| 121 | Web renderer separated from native mobile renderer | COVERED | canonical plan §7A |
| 122 | MapLibre Native treated as later qualification, not automatic dependency | COVERED | §7A/source adoption |
| 123 | Native background-location policy | COVERED | §7A |
| 124 | Native offline/cache/app-store privacy/accessibility gates | COVERED | §7A/source adoption |

| 125 | External POI != canonical provider identity | COVERED | canonical plan §13A |
| 126 | Distance/name-only auto-merge prohibited | COVERED | §13A |
| 127 | Coordinate conflict/reconciliation state | COVERED | §13A/GEO-01C |
| 128 | External POI disappearance cannot delete provider truth | COVERED | §13A |
| 129 | Campus/indoor maps separated from public basemap | COVERED | §17A |
| 130 | Indoor restricted areas protected | COVERED | §17A |
| 131 | Indoor accessibility uses verified edges | COVERED | §17A |
| 132 | Emergency evacuation routing excluded absent separate authority | COVERED | §17A |

## Readiness verdict

Known architectural boundaries are covered.

External gates are intentionally not converted into implementation success.

The first implementation leaf, `GEO-01A`, requires no real patient data, production map credential, routing provider, geocoder provider or 3D provider.

`ZYARA_GEOSPATIAL_GAP_REVIEW = PASS_FOR_BOUNDED_IMPLEMENTATION`
