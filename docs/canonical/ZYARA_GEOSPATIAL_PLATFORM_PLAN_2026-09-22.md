# Zyara Geospatial Platform Plan — 2026-09-22

**Status:** canonical planning amendment candidate  
**Mode:** PLAN-ONLY  
**Planning base:** `bd352bdebc3c0361ffeb8e3970eed38c2bdaf65e`  
**Primary surface:** Zyara Maps / Healthcare Spatial Intelligence  
**Existing Zyara foundations:** Provider Graph, PostgreSQL/PostGIS, Search/Discovery, AI Operating Fabric  
**Primary source pins:**  
- `maplibre/maplibre-gl-js@a2c78ece5c70c429ae94b2f97ec0c30ad0c11441`
- `hyperknot/openfreemap@3fff2d80673c0481c4bb2da34df0293f4462a55a`
- `bilawalsidhu/gods-eye-view@f01b6a5d8462c182e03c94493fa24098c1ac3771`

## 1. Product thesis

Maps are a first-class healthcare access and operations subsystem, not a decorative widget.

The target is **Zyara Maps / Healthcare Spatial Intelligence**:

```text
Authoritative healthcare facts
Provider Graph + PostGIS
          |
          v
   Zyara Geo Domain
          |
    +-----+---------------------+
    |                           |
    v                           v
2D map/list                 Optional 3D
MapLibre renderer           GEV-inspired scene UX
OpenFreeMap basemap         qualified imagery/terrain
    |                           |
    +-------------+-------------+
                  |
                  v
     Patient / Clinic / Insights / AI
```

MapLibre renders. OpenFreeMap supplies a strong open basemap/tile path. God's Eye View contributes selective scene/layer/navigation patterns. None of them owns provider, clinical, insurance, appointment or patient truth.

## 2. Permanent authority invariants

```text
ProviderGraphLocation != BasemapFeature
VerifiedEntrance != BuildingCentroid
StraightLineDistance != RouteDistance != TravelTime != TrafficAwareETA
MapPin != ProviderTruth
MapLayer != Authorization
Viewport != SearchAuthority
BrowserGeolocation != PatientAddress
PublicFacilityCoordinate != PrivatePatientLocation
3DScene != ClinicalFact
SatelliteImagery != VerifiedAccessibility
SpatialAnalyticsCell != IndividualPatientLocation
AIMapAction != HealthcareDomainMutation
```

All healthcare facts continue to resolve through the existing Zyara domains.

## 3. Product outcomes

### Patient

Support:

- synchronized map/list discovery;
- search by provider, clinic, hospital, specialty, service, district and landmark;
- optional current location;
- manually entered city/district/address;
- nearby-care filtering;
- exact/approximate location disclosure;
- opening-hours context;
- insurance filtering with current Zyara caveats;
- accessibility and entrance facts when verified;
- availability overlays where authoritative;
- route/directions when qualified;
- compare locations;
- branch-aware Call / WhatsApp / Directions / Book;
- privacy-safe share state;
- Arabic, English and code-switching;
- full non-map fallback.

### Clinic

Support governed management of:

- branch coordinates;
- entrances;
- parking/drop-off;
- accessibility;
- public arrival instructions;
- provider-attested corrections;
- location freshness;
- service areas where relevant;
- multi-branch network visualization.

### Insights

Later support privacy-safe views of:

- demand by coarse geography;
- supply by specialty/service;
- access gaps;
- travel burden;
- capacity gaps;
- branch catchment;
- referral flows;
- search-to-book conversion;
- location-data freshness;
- routing/geocoder health.

No ordinary operational surface exposes patient-level precise location.

### AI

Expose only typed capabilities, for example:

```text
geo.resolve_place
geo.search_care
geo.find_nearby
geo.compare_locations
geo.get_route
geo.get_accessibility
geo.set_view
geo.set_layers
geo.highlight_entity
geo.create_share_state
```

AI cannot promote geocoder output into verified provider truth.

## 4. Canonical geo ownership

### Provider Graph

Existing organization/location/practitioner/service identities remain canonical.

### PostGIS

PostgreSQL + PostGIS remains geometry truth for:

- healthcare location points;
- entrances;
- service areas;
- proximity;
- spatial indexes;
- coarse analytical projections.

Map clusters, search documents and tile overlays are rebuildable projections.

### Coordinate reference system

Canonical stored public points use WGS84 longitude/latitude with explicit SRID.

Application contracts must reject:

- swapped latitude/longitude;
- NaN/Infinity;
- latitude outside [-90, 90];
- longitude outside [-180, 180];
- geometry without expected SRID.

Projected coordinate systems may be used internally for analysis only with explicit conversion.

## 5. Location precision and provenance

Minimum precision classes:

```text
VERIFIED_ENTRANCE
VERIFIED_PARCEL
VERIFIED_BUILDING_CENTROID
PROVIDER_ATTESTED_POINT
APPROXIMATE_AREA
PRIVATE_HIDDEN
UNKNOWN
```

Each assertion records:

- source;
- source ref;
- observed/verified time;
- precision class;
- verification method;
- evidence ref;
- expiry/freshness;
- correction/dispute state;
- supersession link.

The UI must never render an approximate area as an exact entrance.

## 6. Data-model delta

Prefer additive extension around existing `branch_locations`.

### `geo_location_assertions`

- id;
- branch/location id;
- geometry;
- precision class;
- source/ref;
- observed_at;
- expires_at;
- evidence ref;
- verification state;
- supersedes id.

### `geo_entrances`

Entrance kinds:

- main;
- accessible;
- emergency;
- dropoff;
- parking;
- service.

Store point, public label, source, freshness and accessibility metadata.

### `geo_service_areas`

For home/mobile care only where valid:

- branch/service;
- polygon/multipolygon;
- validity;
- source;
- provenance.

A polygon never guarantees actual appointment availability.

### `geo_address_assertions`

Store:

- original text;
- normalized structured components;
- Arabic/English labels;
- official/postal identifiers where authorized;
- linked geometry;
- source/provenance;
- precision;
- validity.

Never overwrite the source spelling.

### `RouteEstimate`

Derived/cache record:

- origin token/scope;
- destination branch/entrance;
- mode;
- departure time;
- provider;
- distance;
- duration;
- traffic-aware flag;
- observed_at;
- expires_at;
- provider ref;
- uncertainty/unknown state.

Private origin coordinates must not become shared/public cache keys.

## 7. MapLibre renderer decision

Use MapLibre GL JS as the preferred 2D renderer dependency candidate.

Verified pin:

`maplibre/maplibre-gl-js@a2c78ece5c70c429ae94b2f97ec0c30ad0c11441`

Current upstream package reports BSD-3-Clause and GPU-accelerated vector-tile rendering.

Adoption rules:

- prefer dependency over copying renderer internals;
- pin a qualified release, not `latest`;
- preserve license notices;
- qualify CSP/WebGL/browser compatibility;
- qualify worker/bundle behavior;
- qualify RTL and Arabic labels;
- qualify accessibility around map controls;
- qualify style-spec compatibility;
- test render regressions;
- do not backport code from non-compatible proprietary Mapbox GL JS versions;
- tile/geocoder/router/data rights remain separate from renderer rights.

MapLibre is a renderer, not a tile provider or healthcare-data authority.

## 7A. Native mobile renderer strategy

MapLibre GL JS is the web renderer. It must not be treated as the automatic mobile architecture.

For future native iOS/Android clients, evaluate the MapLibre Native ecosystem separately.

Current research pin:

`maplibre/maplibre-native@72ec5f5fff701d3db657d4727d8c38c30843e0b6`

Observed upstream license at that pin: BSD-2-Clause.

Rules:

- no mobile renderer is admitted by this planning packet;
- preserve the same Zyara Geo domain contracts across web and mobile;
- do not put healthcare truth into platform-specific map SDK state;
- compare native SDK vs React Native binding options when the mobile implementation phase begins;
- qualify offline/cache behavior, background location, battery use, app-store privacy declarations, attribution and native accessibility separately;
- do not use a WebView map merely to avoid native qualification if it degrades accessibility/performance;
- do not enable background location unless a separately authorized product requirement exists.

The web implementation may proceed without deciding the final native mobile renderer.

## 8. OpenFreeMap basemap decision

Verified pin:

`hyperknot/openfreemap@3fff2d80673c0481c4bb2da34df0293f4462a55a`

Use as:

- default open basemap candidate;
- vector-tile infrastructure reference;
- OpenStreetMap/OpenMapTiles/Planetiler operational reference;
- self-hosting candidate;
- style/asset delivery reference;
- tile-version/update reference.

OpenFreeMap explicitly does not provide:

- geocoding;
- routing/directions;
- satellite imagery;
- static images;
- elevation;
- custom Zyara datasets.

Do not pretend otherwise.

### Public instance

May be used for development/non-sensitive qualification after attribution review.

No production SLA is inferred from the free public instance.

### Self-hosted candidate

Upstream currently expects clean Ubuntu 24.04+ and substantial disk for a planet deployment. The deployment scripts modify system/nginx state and require privileged operations.

Therefore:

- never run donor deployment scripts on shared Zyara application hosts;
- isolate map infrastructure;
- qualify storage, bandwidth, updates, rollback and monitoring;
- evaluate whether Saudi-only regional generation is operationally preferable before adopting full-planet hosting;
- preserve an approved fallback;
- record active tile/style version.

### Privacy

Third-party basemap requests can reveal IP + viewed tile area.

For sensitive/authenticated maps prefer:

- self-hosting;
- approved proxying;
- or a provider with accepted privacy terms.

Do not send patient identity, search text or clinical context in tile URLs.

## 9. OpenFreeMap / OSM data rights

Code permission is separate from map-data rights.

Record and satisfy applicable obligations for:

- OpenFreeMap code;
- OpenStreetMap data / ODbL;
- OpenMapTiles code/design;
- styles;
- fonts;
- sprites/icons;
- Natural Earth;
- any other bundled asset.

Attribution must remain visible and accessible.

Before generating or distributing a derived geospatial database, legal/provenance review must determine ODbL share-alike implications.

## 10. Geocoding contract

OpenFreeMap does not solve geocoding.

Create provider-neutral `Geocoder`.

### Request

- query;
- locale;
- country bias;
- optional bounds;
- forward/reverse mode;
- place types;
- privacy classification.

### Response

- candidate id;
- formatted address;
- structured components;
- point/bounds;
- source;
- precision;
- defined confidence;
- observed_at;
- attribution/terms ref.

Rules:

- authorize/store according to provider terms;
- do not retain full vendor payloads by default;
- geocoder candidates are not provider truth;
- private-address queries are excluded from ordinary logs;
- failure returns UNKNOWN/UNAVAILABLE;
- branch correction requires verification/attestation.

## 11. Saudi address qualification

Maintain a synthetic/judged Saudi benchmark covering:

- Arabic and English;
- Arabic/Western numerals;
- diacritics/no-diacritics;
- transliteration variants;
- city/district/street;
- building/unit;
- landmark searches;
- duplicate street names;
- urban and rural cases;
- national/postal identifiers where authorized.

Official Saudi/SPL/National Address sources may be integrated only after live terms/API/access qualification.

No vendor is preselected by this plan.

## 12. Routing and ETA contract

Create provider-neutral `Router`.

### Request

- origin;
- destination entrance/branch;
- mode;
- departure time;
- supported avoidances/preferences;
- privacy classification.

### Response

- route ref;
- distance;
- duration;
- route geometry when licensed;
- traffic-aware flag;
- provider;
- observed_at;
- expires_at;
- limitations;
- attribution.

Truth rule:

```text
straight-line distance
!= road-route distance
!= travel time
!= traffic-aware ETA
```

UI must label the actual metric.

If routing fails:

- preserve list/search;
- show straight-line distance only when available and labeled;
- offer an approved external directions link;
- never invent ETA.

Self-hosted OSRM/Valhalla/GraphHopper-class systems may be evaluated, but none is preselected.

## 13. Route-provider privacy

Routing queries can expose sensitive origin/destination patterns.

Rules:

- minimize exact patient-origin retention;
- never attach patient id to third-party routing calls unless explicitly necessary and approved;
- prefer server-side opaque request correlation;
- avoid embedding private origins into URLs;
- document provider retention/training/data-use terms;
- patient route queries require a data-egress decision under the AI/Privacy control plane where applicable.

## 14. Map/list parity

Map and list are two views of one result contract.

They share:

- eligibility;
- filters;
- ranking intent;
- provider truth;
- insurance caveats;
- open-now semantics;
- freshness;
- unknown states.

Viewport movement does not silently rerank.

`Search this area` is an explicit query action.

Clustering is presentation only.

Pin selection maps to the same result entity.

## 15. Nearby-care behavior

Precise GPS is optional.

Support:

- current location;
- manual city/district/address;
- map-selected area;
- saved coarse location preference when consented.

Do not require location permission to use discovery.

When permission is denied/revoked, manual search remains first-class.

## 16. Precise patient-location privacy

Precise location is sensitive.

Default:

- request only for active purpose;
- no background tracking;
- no continuous collection;
- keep client-side/ephemeral when possible;
- no raw lat/lon in ordinary analytics;
- no precise location in share URLs;
- no inferred home address from repeated activity;
- short retention;
- coarse geographic cells for analytics.

Location telemetry must have its own allowlist.

## 17. Entrances, accessibility and final-100m care access

Model independently:

- main entrance;
- accessible entrance;
- emergency entrance;
- parking entrance;
- drop-off;
- building/floor;
- lift;
- step-free access;
- accessible toilet;
- parking accessibility;
- arrival instructions.

Do not infer accessibility from imagery, 3D geometry or AI.

Every claim has source/freshness.

## 18. God's Eye View selective adaptation

Verified pin:

`bilawalsidhu/gods-eye-view@f01b6a5d8462c182e03c94493fa24098c1ac3771`

High-value patterns/components to evaluate:

- map-source controller lifecycle;
- provider-neutral source catalog;
- source availability/error/fallback state;
- scene/camera state;
- layer-state coordination;
- share restoration;
- entity selection/highlighting;
- navigation generation/race handling;
- contextual map tools;
- voice action schemas;
- location/search abstraction;
- optional Cesium/3D composition;
- responsive panel/layer UX.

Reject or remove:

- military/spy visual identity;
- aircraft/ship/satellite/CCTV/ALPR/radio features;
- bundled non-health datasets;
- provider keys;
- third-party assets without independent rights;
- any surveillance framing.

Code permission does not grant third-party dataset or asset rights.

## 19. Healthcare-native layers

Patient-safe examples:

- hospitals;
- clinics;
- practitioners;
- specialties;
- services;
- labs;
- imaging centers;
- pharmacies where in scope;
- open now;
- insurer/network;
- availability;
- accessibility;
- telehealth-capable;
- verification/freshness.

Clinic/Insights examples using authorized aggregates:

- demand;
- supply;
- capacity;
- access gap;
- referral network;
- communication performance;
- data freshness.

Layer visibility never grants authorization.

## 20. Shareable scene state

Public-safe state may encode:

- public map center/zoom;
- public layers;
- public filters;
- selected public provider ids;
- comparison ids;
- style/view mode.

Never place in a public URL:

- precise patient location;
- patient/account id;
- appointment id;
- member/insurance identifiers;
- symptom text;
- clinical context;
- private search history;
- internal analytics filters.

Private collaboration later uses authenticated opaque expiring tokens.

## 21. Optional 3D

3D is an enhancement, not a prerequisite.

Potential value:

- hospital campuses;
- large multi-building facilities;
- entrances/drop-off orientation;
- landmark context;
- network planning.

Rules:

- lazy-load;
- keep 2D/list complete;
- no 3D vendor without terms/privacy qualification;
- 3D geometry is not verified access truth;
- no booking flow depends on WebGL/3D;
- provide accessible alternative.

Cesium may be evaluated because GEV demonstrates the pattern, but renderer/terrain/imagery terms are independently gated.

## 22. Spatial analytics privacy

Spatial analytics remain Zyara Insights outputs.

Before producing a heatmap define:

- source events;
- purpose;
- spatial aggregation;
- minimum cohort/suppression;
- time window;
- denominator;
- missingness;
- retention;
- tenant/branch scope;
- re-identification review.

Low-volume cells are suppressed or merged.

Discard raw coordinates after aggregation when no longer required.

Do not display patient dots to clinic operators.

## 23. AI + voice integration

Geo capabilities enter the AI Operating Fabric through AIF-01 capability contracts.

Rules:

- authorization server-side;
- model coordinates untrusted;
- entity ids must resolve to current tool outputs;
- retrieved map metadata cannot grant capability;
- voice map actions use typed schemas;
- provider coordinate correction is a separate admin command;
- geocoder output never self-verifies.

## 24. Emergency boundary

Zyara Maps is not emergency dispatch.

Do not:

- claim live ED capacity without authority;
- promise ambulance routing;
- infer closest == clinically appropriate;
- delay emergency guidance for map services.

Existing clinical-safety rules remain authoritative.

## 25. Reliability and degraded mode

### Basemap outage
- list/cards/actions remain usable;
- map shows explicit unavailable state.

### Geocoder outage
- known provider search remains usable;
- resolved city/district filters remain usable;
- no fabricated place.

### Router outage
- labeled straight-line distance may remain;
- optional external directions;
- no fake ETA.

### 3D outage
- 2D/list fallback.

### Tile update
- integrity/health verification;
- staged deployment;
- previous qualified version retained when practical;
- active version recorded.

### Multi-provider fallback
Fallback cannot silently widen privacy, data-use, licensing or geographic boundaries.

## 26. Security threat model

Qualify at minimum:

- malicious style JSON;
- attribution/label HTML injection;
- GeoJSON property XSS;
- SSRF through configurable source URLs;
- open redirects;
- non-allowlisted map providers;
- credential leakage into browser config;
- oversized feature collections;
- invalid coordinates;
- antimeridian/polar edge cases;
- malicious glTF/3D Tiles;
- prompt injection from provider metadata;
- private coordinates in logs;
- private location in URL/share state;
- cross-tenant analytical layers;
- low-count re-identification;
- stale ETA replay;
- unsafe fallback provider;
- attribution removal;
- cache poisoning;
- tile crawler/cost exhaustion.

Use CSP/network allowlists.

## 27. Accessibility and localization

Map is never the only interface.

Require:

- accessible synchronized list;
- keyboard result navigation;
- screen-reader location cards;
- non-color-only state;
- reduced motion;
- high-contrast qualification;
- RTL chrome;
- Arabic/English labels;
- bidi-safe addresses;
- zoom/reflow;
- mobile touch targets;
- route/distance text equivalent;
- no keyboard-trapping popups;
- 3D alternative.

## 28. Performance budgets

Measure:

- map JS/CSS bundle contribution;
- initialization time;
- tile latency/error rate;
- feature count;
- cluster latency;
- memory;
- CPU/GPU;
- battery/network;
- 3D lazy-load cost.

Do not ship Cesium/photorealistic dependencies in the default patient bundle.

Use viewport-based loading and clustering.

## 29. Offline and constrained-network policy

Do not promise full offline navigation in the first slice.

Support graceful constrained-network behavior:

- cached app shell where existing web policy permits;
- previously loaded public map tiles only according to provider terms/cache headers;
- text/list fallback;
- no stale route presented as current ETA;
- visible freshness.

A future clinic/on-prem regional offline map package requires separate storage/update/licensing qualification.

## 30. Map styling and Zyara brand

Create a Zyara-owned style configuration over qualified data sources.

Requirements:

- healthcare POIs clear but not cluttered;
- strong selected-provider state;
- accessible contrast;
- dark/light themes;
- Arabic label behavior;
- no imitation of military/spy UI;
- no misleading emergency colors;
- support facility density without hiding lower-ranked eligible results.

Styles are versioned artifacts with rollback.

## 31. Data freshness

Different spatial facts age differently.

Examples:

- road/basemap version: upstream tile version;
- branch coordinate: attestation/evidence freshness;
- entrance/accessibility: periodic revalidation;
- opening hours: provider/authoritative source freshness;
- route ETA: short-lived;
- analytics: window/end timestamp.

Never show one generic "verified" badge for all spatial facts.

## 32. Observability

PHI-light metrics:

- map initialization success;
- tile failure;
- geocoder success/ambiguity;
- route success/unknown;
- provider fallback;
- list/map parity violations;
- coordinate correction volume;
- stale-location count;
- average route lookup latency;
- map interaction performance;
- 3D opt-in/load failure;
- suppressed spatial analytics count.

Do not log raw private coordinates by default.

## 33. Search/ranking boundary

Geospatial constraints are ranking inputs, not ranking authority.

Organic ranking must preserve existing policy.

Do not use:

- paid status;
- patient wealth;
- inferred sensitive neighborhood;
- opaque predicted profitability.

Expose explicit views such as:

- Best match;
- Nearest;
- Soonest;

with truthful reasons.

## 34. Testing matrix

### Domain / DB
- valid/invalid coordinates;
- SRID enforcement;
- precision classes;
- supersession;
- tenant boundaries;
- spatial index/query correctness;
- entrance linkage;
- service-area polygon validity.

### Search/list/map
- parity;
- explicit viewport search;
- clustering;
- selection sync;
- Arabic labels;
- zero results;
- unknown distance/ETA.

### Geocoder
- Saudi Arabic/English benchmark;
- ambiguous place;
- reverse lookup;
- no-result;
- stale candidate;
- terms-compliant storage.

### Router
- urban/rural fixtures;
- straight-line vs route distinction;
- traffic-aware flag;
- timeout;
- expired estimate;
- fallback.

### Privacy
- denied location permission;
- no precise location telemetry;
- share-state redaction;
- third-party egress;
- low-count heatmap suppression.

### Renderer
- MapLibre render smoke;
- style version;
- RTL;
- keyboard/list parity;
- low/mid-tier mobile;
- WebGL unavailable.

### 3D
- lazy load;
- unsupported device fallback;
- no 3D dependency in booking;
- provider/asset rights.

## 35. Rollout and kill switches

Independent feature flags:

- map;
- public OpenFreeMap;
- self-hosted basemap;
- geocoder provider;
- router provider;
- 3D;
- spatial analytics;
- AI geo capabilities.

Each supports:

- staged activation;
- tenant/branch scope where relevant;
- provider-specific disable;
- rollback;
- auditable changes.

List discovery remains the emergency product fallback.

## 36. Implementation program

### GEO-01 — Geo truth contract
PostGIS assertions, precision, provenance, entrances, tests.

### GEO-02 — 2D renderer + basemap
MapLibre dependency qualification + OpenFreeMap adapter + attribution + health/fallback.

### GEO-03 — Map/list discovery
Synchronized result contract, clustering, selection, explicit viewport query, accessibility.

### GEO-04 — Geocoder
Provider-neutral contract + Saudi benchmark + privacy/storage rules.

### GEO-05 — Routing
Provider-neutral contract + distance/ETA semantics + benchmark + fallback.

### GEO-06 — Local access
Entrances, parking, accessibility, arrival instructions and correction workflow.

### GEO-07 — Scene/layer/share
GEV-inspired provider-neutral source controller, layer state, privacy-safe share state.

### GEO-08 — Optional 3D
Bounded qualification; no default-bundle dependency.

### GEO-09 — Spatial Insights
Aggregated demand/supply/capacity/access maps with suppression.

### GEO-10 — AI/voice geo capabilities
AIF contracts, typed schemas, no authority escalation.

### GEO-11 — Hardening
Security, privacy, constrained network, attribution, observability, performance, localization, recovery.

## 37. Dependency graph

```text
GEO-01
  |
  +--> GEO-02 --> GEO-03
  |                |
  |                +--> GEO-04 --> GEO-05 --> GEO-06
  |                |
  |                +--> GEO-07 --> GEO-08
  |
  +-------------------------------> GEO-09

AIF-01 capability contract
  +-------------------------------> GEO-10

GEO-02..10
  +-------------------------------> GEO-11
```

GEO-01 may proceed independently of N6 Connect.

GEO-10 requires the AIF capability contract. N9 broad spatial analytics should consume GEO-09 rather than invent a second geo stack.

## 38. First executable leaf

`GEO-01A — Geo assertion and precision contract`

Scope:

- types/contracts;
- additive PostGIS migration;
- precision enum/check;
- source/provenance;
- supersession;
- tenant/public boundary;
- synthetic tests;
- real PostgreSQL smoke.

Explicitly out of scope:

- MapLibre UI;
- tiles;
- geocoder;
- routing;
- 3D;
- live provider data;
- patient coordinates.

This leaf is implementation-ready without external map-provider credentials.

## 39. External gates

Still external / not claimable from repository tests:

- production tile-hosting SLA;
- geocoder commercial/official access;
- routing/traffic provider access;
- Saudi official-address access;
- production privacy/legal signoff;
- real provider coordinate verification;
- real accessibility/entrance validation;
- 3D imagery rights;
- real clinic/patient validation.

Repository implementation must continue independently where possible.

## 40. Completion marker

The geospatial plan is implementation-ready only when:

- source-adoption packet is pinned;
- renderer/basemap/geocoder/router boundaries are separate;
- location privacy is explicit;
- healthcare truth ownership is explicit;
- Saudi address benchmark is specified;
- map/list parity is explicit;
- accessibility/non-map fallback is explicit;
- data rights and attribution are explicit;
- 3D is optional;
- spatial analytics suppression is explicit;
- AI tools are typed and bounded;
- rollout/kill switches exist;
- first executable task is bounded.

`ZYARA_GEOSPATIAL_PLATFORM_PLAN_COMPLETE = YES`
