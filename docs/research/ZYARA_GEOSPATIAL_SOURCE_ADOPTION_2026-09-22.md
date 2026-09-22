# Zyara Geospatial Source Adoption — 2026-09-22

**Mode:** source qualification / planning  
**Planning base:** `bd352bdebc3c0361ffeb8e3970eed38c2bdaf65e`

## 1. Adoption rule

Founder permission to reuse source code is planning authority, not a substitute for provenance.

Every admitted component must record:

- source repository;
- exact revision;
- exact copied/adapted paths;
- license/NOTICE obligations;
- third-party assets/data rights;
- target Zyara subsystem;
- mode: `REFERENCE / DEPENDENCY / ADAPT / COPY / REJECT`;
- security/privacy impact;
- transitive dependencies;
- update strategy;
- rollback strategy;
- proof required before production admission.

## 2. maplibre/maplibre-gl-js

**Pin:** `a2c78ece5c70c429ae94b2f97ec0c30ad0c11441`  
**Observed package:** `maplibre-gl`  
**Observed license:** BSD-3-Clause with embedded notices  
**Recommended mode:** `DEPENDENCY`

### Best Zyara use

- primary 2D web renderer;
- vector/raster source rendering;
- symbols/labels;
- clustering and custom data layers;
- terrain/building features where later justified;
- style-spec ecosystem;
- worker-based rendering;
- feature querying.

### Why dependency instead of copy

MapLibre is an actively maintained renderer with extensive browser/render tests. Copying renderer internals would create an unnecessary fork burden.

### Admission requirements

- pin an exact released package version;
- retain notices;
- SBOM/dependency review;
- CSP/network-source review;
- WebGL/device compatibility;
- Arabic/RTL label qualification;
- accessibility around non-canvas controls;
- bundle/performance budget;
- render regression tests;
- style-spec compatibility;
- browser support matrix.

### Boundaries

MapLibre does not grant:

- tile rights;
- OSM rights;
- geocoding rights;
- routing rights;
- imagery rights;
- healthcare-data rights.

Do not pull code from incompatible proprietary Mapbox GL JS versions.

## 2A. maplibre/maplibre-native

**Research pin:** `72ec5f5fff701d3db657d4727d8c38c30843e0b6`  
**Observed license:** BSD-2-Clause  
**Recommended mode:** `REFERENCE / LATER DEPENDENCY QUALIFICATION`

Purpose:

- future native iOS/Android renderer family;
- avoid coupling mobile healthcare contracts to the web renderer;
- reuse common style/tile concepts where compatible.

Not admitted yet.

Mobile qualification must cover:

- native SDK/binding choice;
- app-store privacy disclosures;
- background-location policy;
- battery/network;
- offline/cache;
- accessibility;
- attribution;
- release/update cadence;
- React Native compatibility if selected.

## 3. hyperknot/openfreemap

**Pin:** `3fff2d80673c0481c4bb2da34df0293f4462a55a`  
**Observed repo license:** MIT  
**Recommended mode:** `DEPENDENCY/REFERENCE` for public service during qualification, `ADAPT` for self-hosted infrastructure if selected

### Best Zyara use

- open vector basemap;
- OpenStreetMap/OpenMapTiles/Planetiler operational pattern;
- tile versioning;
- style/assets;
- self-host candidate;
- low-vendor-lock-in basemap path.

### Explicit upstream limitations

OpenFreeMap does not provide:

- geocoding;
- routing;
- navigation/directions;
- satellite imagery;
- static image service;
- elevation;
- custom Zyara dataset hosting.

### Self-hosting observations

Verified upstream docs currently describe:

- Ubuntu 24.04+;
- clean/dedicated host expectation;
- substantial storage;
- privileged deployment scripts;
- nginx/system modifications;
- active/candidate version transitions;
- optional tile generation with much larger compute/storage.

Therefore Zyara must not run those scripts on shared production application nodes.

### Data/license obligations

Independently track:

- OpenStreetMap ODbL;
- OpenMapTiles code/design terms;
- style licenses;
- fonts;
- icons/sprites;
- Natural Earth;
- any other included data/assets.

Founder source-code permission does not override third-party data licenses.

### Production proof

Before using a public OpenFreeMap endpoint as production dependency:

- availability/SLA decision;
- privacy review;
- egress/network review;
- attribution;
- rate/crawler risk;
- fallback.

Preferred long-term options:

- dedicated/self-hosted Zyara tiles after operational qualification;
- or an admitted contracted tile service behind the same basemap adapter.

## 4. bilawalsidhu/gods-eye-view

**Pin:** `f01b6a5d8462c182e03c94493fa24098c1ac3771`  
**Observed code license:** MIT  
**Recommended mode:** `REFERENCE / SELECTIVE_ADAPT / SELECTIVE_COPY`

### High-value areas

Evaluate exact components around:

- `src/maps/controller.js`;
- `src/maps/catalog.js`;
- map-source availability/fallback patterns;
- layer-state architecture;
- scene/camera state;
- share restoration;
- navigation race/supersession handling;
- entity selection/highlighting;
- location/search abstractions;
- typed voice/map actions;
- optional Cesium composition;
- responsive map control surfaces.

### Reject

Do not bring into Zyara:

- military/spy branding;
- surveillance-oriented features;
- aircraft/vessel/satellite/CCTV/ALPR/radio operational feeds;
- tactical HUD semantics;
- bundled unrelated live data.

### Third-party data/assets warning

The upstream license explicitly separates source-code MIT rights from third-party datasets, runtime providers and 3D assets. Some listed assets/datasets have non-commercial terms.

Therefore:

- do not copy bundled datasets/assets by default;
- inventory exact files before any COPY decision;
- remove/reject incompatible third-party data;
- qualify provider terms independently;
- never inherit provider keys.

### Production proof

For every copied component:

- exact path + digest;
- dependency inventory;
- license header preservation;
- tests;
- security review;
- remove domain-specific/surveillance assumptions;
- adapt to Zyara typed healthcare entities;
- prove no third-party data contamination.

## 5. PostGIS

**Existing Zyara status:** already selected geospatial source-of-truth candidate  
**Recommended mode:** `DEPENDENCY`

Use for:

- WGS84 points;
- entrances;
- service areas;
- proximity;
- point-in-polygon;
- spatial indexes;
- aggregation.

Require migration/RLS tests and geometry validity.

## 6. OpenStreetMap ecosystem

**Recommended mode:** data dependency via approved basemap/geocoder/router components

Separate:

- OSM source data;
- OpenFreeMap tiles;
- OpenMapTiles schema/style;
- geocoder index;
- router graph.

Do not assume one license covers the entire chain.

## 7. Geocoder candidates

No geocoder is admitted by this packet.

Evaluate candidate families such as:

- Nominatim;
- Photon;
- Pelias;
- qualified Saudi/official providers.

Decision criteria:

- Saudi coverage;
- Arabic;
- transliteration;
- reverse geocode;
- data freshness;
- storage/retention terms;
- self-host complexity;
- latency;
- rate limits;
- privacy;
- address precision;
- legal attribution.

Mode remains `REFERENCE/QUALIFICATION_CANDIDATE` until evidence exists.

## 8. Routing candidates

No router is admitted by this packet.

Evaluate:

- OSRM-class;
- Valhalla-class;
- GraphHopper-class;
- contracted traffic/routing providers.

Criteria:

- Saudi road coverage;
- rural coverage;
- car/walk modes;
- turn restrictions;
- traffic;
- update cadence;
- privacy;
- route geometry rights;
- operations footprint;
- latency;
- license/terms.

## 9. Cesium / 3D providers

God's Eye View demonstrates Cesium-based 3D patterns but does not authorize any Cesium ion, Google photorealistic tiles, Esri imagery or other provider for Zyara.

Each 3D stack requires:

- exact SDK/provider terms;
- commercial rights;
- credential isolation;
- data residency/privacy;
- cache restrictions;
- attribution;
- device performance;
- accessibility fallback.

Initial recommendation: `REFERENCE_ONLY / LATER_QUALIFICATION`.

## 10. Founder-owned donors

Use where relevant:

### MedScale
- privacy manifests;
- governed analytics;
- model/agent evidence;
- local-first principles.

### Qdrat
- branch/workforce/operational analytics patterns.

### Ecra
- typed intent-to-tool action + receipts.

### Morize
- privacy-preserving location/context retrieval patterns if useful.

### Sentrdel
- deny/ask policy and evidence discipline.

No founder-owned donor replaces Zyara's Provider Graph or Geo authority.

## 11. Source-admission table

| Source | Pin | Mode | Target | Main gate |
|---|---|---|---|---|
| MapLibre GL JS | `a2c78ece...` | DEPENDENCY | web 2D renderer | package/license/perf/accessibility |
| MapLibre Native | `72ec5f5f...` | LATER QUALIFY | native mobile renderer | mobile privacy/offline/accessibility/binding qualification |
| OpenFreeMap | `3fff2d80...` | DEPENDENCY/ADAPT | basemap/tiles | data rights + SLA/privacy + ops |
| God's Eye View | `f01b6a5d...` | REFERENCE/SELECTIVE_ADAPT | scene/layer/share/3D UX | exact-path provenance + no third-party contamination |
| PostGIS | existing Zyara pin | DEPENDENCY | geometry truth | DB/RLS/spatial tests |
| Geocoder | TBD | QUALIFY | address/place resolution | Saudi benchmark + privacy/terms |
| Router | TBD | QUALIFY | route/ETA | Saudi benchmark + privacy/terms |
| Cesium/3D provider | TBD | LATER | optional 3D | terms/perf/accessibility |

## 12. Direct-copy rule

No direct donor code enters Zyara merely because permission exists.

Before COPY:

```text
exact source revision
+ exact source path
+ exact target path
+ license/NOTICE
+ third-party-data scan
+ dependency review
+ security/privacy review
+ modification record
+ tests
+ update strategy
= eligible for COPY decision
```

Otherwise use REFERENCE or ADAPT.

`ZYARA_GEO_SOURCE_ADOPTION_READY = YES`
