# Zyara Geospatial Implementation Handoff — 2026-09-22

**Authority:** `docs/canonical/ZYARA_GEOSPATIAL_PLATFORM_PLAN_2026-09-22.md`  
**Mode:** bounded implementation handoff  
**Planning base:** `bd352bdebc3c0361ffeb8e3970eed38c2bdaf65e`

## 1. Execution rule

Implement GEO in small dependency-ordered slices.

Do not big-bang maps, geocoder, routing, 3D, analytics and AI into one PR.

For each slice:

1. reverify live `main`;
2. inspect concurrent PRs;
3. branch from exact main;
4. define bounded work packet;
5. implement;
6. run targeted tests;
7. run real PostgreSQL smoke where relevant;
8. run renderer/browser tests where relevant;
9. preserve negative evidence;
10. exact-head CI;
11. merge only after qualification;
12. reverify fresh main;
13. continue to next dependency-authorized slice.

PR #94 remains separate unless explicitly reconciled.

## 2. Dependency graph

```text
GEO-01 Geo truth
  |
  +--> GEO-02 Renderer + basemap
  |       |
  |       +--> GEO-03 Map/list discovery
  |               |
  |               +--> GEO-04 Geocoder
  |               |       |
  |               |       +--> GEO-05 Routing
  |               |               |
  |               |               +--> GEO-06 Entrances/access
  |               |
  |               +--> GEO-07 Scene/layer/share
  |                       |
  |                       +--> GEO-08 Optional 3D
  |
  +--> GEO-09 Spatial Insights

AIF-01 Capability Contract
  |
  +--> GEO-10 AI/voice geo tools

GEO-02..10
  |
  +--> GEO-11 Hardening/closure
```

N6 Connect can proceed independently.

## 3. GEO-01 — Geo truth

### GEO-01A — Geo assertion + precision contract

**First executable leaf.**

Implement:

- geo domain package/contract;
- coordinate validation;
- precision class;
- source/provenance;
- supersession;
- additive PostGIS migration;
- RLS/public-vs-tenant scope;
- branch/location foreign keys;
- spatial indexes;
- real PostgreSQL smoke;
- synthetic tests.

Suggested concepts:

- `GeoPoint`;
- `GeoPrecision`;
- `GeoLocationAssertion`;
- `GeoSourceRef`;
- `GeoVerificationState`.

Tests:

- invalid lat/lon rejected;
- swapped/out-of-range cases;
- SRID expected;
- cross-tenant insert/read rejected;
- branch FK integrity;
- supersession preserves history;
- approximate assertion cannot claim verified entrance;
- provenance mandatory;
- append-only evidence trail where chosen.

Exit:

`GEO_01A_ASSERTION_CONTRACT_QUALIFIED = TRUE`

### GEO-01B — Entrances + service-area geometry

Implement:

- entrance types;
- accessibility-linked facts;
- service-area polygon/multipolygon;
- geometry validity;
- provenance;
- branch/service linkage.

Tests:

- polygon validity;
- cross-branch linkage;
- inactive/superseded entrance behavior;
- no service-area == availability inference.

Exit:

`GEO_01B_ACCESS_GEOMETRY_QUALIFIED = TRUE`

### GEO-01C — External spatial identity/conflation

Implement only after GEO-01A:

- external spatial source identifiers;
- candidate link model;
- conflict state;
- audited canonical link/unlink;
- no distance/name-only auto-merge.

Tests:

- nearby same-name facilities remain distinct without stronger evidence;
- exact external id can link only within allowed source namespace;
- conflicting coordinates remain unresolved rather than overwritten;
- unlink preserves history.

Exit:

`GEO_01C_CONFLATION_QUALIFIED = TRUE`

## 4. GEO-02 — Renderer + basemap

### GEO-02A — MapLibre qualification

Pin a released `maplibre-gl` package after license/SBOM review.

Implement only the minimum renderer shell.

Tests:

- map initializes;
- no-map fallback;
- RTL UI shell;
- keyboard/list remains usable;
- CSP/network origin allowlist;
- WebGL unavailable fallback;
- bundle budget;
- cleanup/unmount.

Exit:

`GEO_02A_MAPLIBRE_QUALIFIED = TRUE`

### GEO-02B — OpenFreeMap basemap adapter

Implement a provider-neutral basemap config with OpenFreeMap as the first adapter.

Must include:

- style/tile version;
- attribution;
- health state;
- fallback;
- no patient/context data in tile URLs;
- provider-specific kill switch.

Do not self-host yet unless separately qualified.

Exit:

`GEO_02B_BASEMAP_QUALIFIED = TRUE`

### GEO-02C — self-host qualification

Only when needed.

Produce evidence for:

- isolated host design;
- disk/bandwidth;
- update/rollback;
- integrity;
- monitoring;
- regional-vs-planet decision;
- OSM/OpenMapTiles attribution/data obligations.

No production self-host claim without deployment evidence.

## 5. GEO-03 — Map/list discovery

Implement one shared result contract.

Required:

- synchronized list/pins;
- same filtering;
- same ranking intent;
- explicit `Search this area`;
- clustering;
- selected entity synchronization;
- map unavailable state;
- accessibility list;
- mobile behavior;
- synthetic provider fixtures only until real data gates.

Tests:

- list/map entity parity;
- filter parity;
- viewport does not silently rerank;
- no precise-location requirement;
- no pin generated for hidden/unknown coordinate;
- approximate coordinate rendered with appropriate disclosure.

Exit:

`GEO_03_DISCOVERY_MAP_QUALIFIED = TRUE`

## 6. GEO-04 — Geocoder

### GEO-04A — provider-neutral contract

Create:

- `GeocodeRequest`;
- `GeocodeCandidate`;
- `GeocoderAdapter`;
- terms/privacy metadata;
- timeout/unknown semantics.

Do not admit a real provider merely to satisfy the contract.

### GEO-04B — Saudi benchmark

Create judged synthetic fixtures.

Minimum dimensions:

- Arabic;
- English;
- transliteration;
- numerals;
- districts;
- landmarks;
- repeated street names;
- urban/rural.

Report:

- top-1;
- top-3;
- no-result;
- ambiguity;
- precision;
- latency;
- locale gaps.

### GEO-04C — provider admission

Admit only after:

- exact provider/version;
- terms;
- privacy;
- retention;
- benchmark;
- operational evidence.

Exit:

`GEO_04_GEOCODER_QUALIFIED = TRUE`

## 7. GEO-05 — Routing / ETA

### GEO-05A — router contract

Create:

- `RouteRequest`;
- `RouteEstimate`;
- `RouterAdapter`;
- expiry;
- traffic-aware flag;
- unknown semantics.

### GEO-05B — route benchmark

Synthetic Saudi fixtures for:

- urban;
- suburban;
- rural;
- branch entrances;
- car;
- walk where supported.

Verify:

- route/distance distinction;
- traffic disclosure;
- timeout;
- stale expiry;
- fallback.

### GEO-05C — production candidate

Admission requires terms/privacy/operations evidence.

Exit:

`GEO_05_ROUTING_QUALIFIED = TRUE`

## 8. GEO-06 — Healthcare access details

Implement:

- main/accessibility/emergency/parking/drop-off entrances;
- arrival instructions;
- source/freshness;
- provider-attested corrections;
- independent accessibility facts.

Never infer accessibility from 3D or AI.

Tests:

- stale fact disclosure;
- entrance/centroid distinction;
- correction supersession;
- branch isolation.

Exit:

`GEO_06_LOCAL_ACCESS_QUALIFIED = TRUE`

### GEO-06B — Campus / indoor wayfinding

Optional bounded slice after verified entrances exist.

Plan/implement only with provider-approved facility geometry.

Must preserve:

- floor/building scope;
- accessibility edges;
- restricted-area filtering;
- textual fallback;
- provider freshness.

Do not implement emergency evacuation guidance under this slice.

Exit if admitted:

`GEO_06B_INDOOR_WAYFINDING_QUALIFIED = TRUE`

## 9. GEO-07 — Scene, layers and share state

Adapt GEV patterns selectively.

Required:

- provider-neutral source controller;
- layer registry;
- layer authorization before query;
- selected entity state;
- camera/view state;
- race-safe navigation generations;
- privacy-safe share serialization;
- restoration failures are explicit.

Tests:

- concurrent navigation supersession;
- invalid layer id;
- denied analytical layer;
- public share redaction;
- stale selected entity;
- basemap failure fallback.

Exit:

`GEO_07_SCENE_LAYER_QUALIFIED = TRUE`

## 10. GEO-08 — Optional 3D

Do not start until GEO-07 is stable.

Qualification spike must answer:

- actual healthcare value;
- device support;
- bundle/load cost;
- imagery/terrain rights;
- credential isolation;
- 2D accessibility fallback;
- hospital campus use case.

Possible outcomes:

`ADMIT / DEFER / REJECT`

No requirement to admit 3D.

Exit if admitted:

`GEO_08_3D_QUALIFIED = TRUE`

or record canonical defer/reject decision.

## 11. GEO-09 — Spatial Insights

Implement only aggregated views.

Start with native Zyara metrics.

Potential derived tables:

- demand by coarse cell;
- supply by coarse cell;
- capacity gap;
- travel burden;
- branch catchment;
- referral flows.

Every metric requires:

- numerator/denominator;
- source;
- time window;
- aggregation;
- suppression threshold;
- missingness;
- retention.

Tests:

- low-count suppression;
- cross-tenant isolation;
- no patient dots;
- no raw-coordinate dashboard export;
- stable aggregation.

Exit:

`GEO_09_SPATIAL_INSIGHTS_QUALIFIED = TRUE`

## 12. GEO-10 — AI / voice geo capabilities

Requires canonical AIF-01 capability contract.

Register typed capabilities only.

Tests:

- unauthorized capability denied;
- model coordinates untrusted;
- stale result ids rejected;
- public share state strips private fields;
- voice changes view only, not provider truth;
- geocoder output cannot update branch coordinate without admin command.

Exit:

`GEO_10_AI_GEO_QUALIFIED = TRUE`

## 13. GEO-11 — hardening

Qualify:

- privacy;
- location retention;
- CSP;
- SSRF;
- XSS;
- malicious styles/GeoJSON;
- attribution;
- provider fallback;
- performance;
- low-tier mobile;
- RTL;
- keyboard/screen reader;
- constrained network;
- observability;
- kill switches;
- rollback;
- backup/schema compatibility;
- web/mobile renderer contract portability;
- native renderer qualification only when the mobile phase starts.

Exit:

`GEO_PLATFORM_QUALIFIED = TRUE`

## 14. Evidence packet convention

For each leaf create:

```text
docs/evidence/GEO/<slice>/
  WORK_PACKET.md
  PROVENANCE.md
  SECURITY_PRIVACY_REVIEW.md
  RESULT.md
```

Add `JEV_REVIEW.md` / `OCR_REVIEW.md` when those tools are actually available or explicitly required.

Never fabricate review execution.

## 15. Donor provenance

### MapLibre

Prefer package dependency.

Record:

- exact npm version;
- package lock;
- license/NOTICE;
- SBOM;
- browser support;
- render tests.

### OpenFreeMap

If public endpoint:

- style/tile URLs;
- active upstream version;
- attribution;
- privacy/availability decision.

If self-host:

- exact source pin;
- copied/adapted deployment paths;
- infrastructure plan;
- data licenses;
- active tile version.

### God's Eye View

For every adapted/copied source file:

- exact source path;
- exact source SHA;
- target path;
- modification summary;
- dependency inventory;
- third-party data scan.

## 16. First handoff

Start only after re-verifying live main.

If GEO remains authorized and no newer plan supersedes it:

```text
NEXT_TASK = GEO-01A
TITLE = Geo assertion and precision contract
MODE = bounded implementation
EXTERNAL_CREDENTIALS_REQUIRED = NO
REAL_PATIENT_DATA_REQUIRED = NO
REAL_PROVIDER_DATA_REQUIRED = NO
```

Do not begin MapLibre/OpenFreeMap UI work before GEO-01A truth contracts are canonical.

`ZYARA_GEO_IMPLEMENTATION_HANDOFF_READY = YES`
