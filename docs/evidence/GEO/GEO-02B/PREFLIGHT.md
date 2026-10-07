# GEO-02B Preflight — OpenFreeMap Basemap Adapter

Status: planning / non-admitted. GEO-02A MapLibre must be canonical before implementation or provider use. This packet does not authorize network requests or production traffic.

## Scope

Introduce a provider-neutral basemap configuration, using OpenFreeMap only as the first separately qualified candidate. Keep MapLibre as a renderer, Provider Graph/PostGIS as healthcare geo truth, and geocoder/router outside this leaf.

Canonical source: `docs/research/ZYARA_GEOSPATIAL_IMPLEMENTATION_HANDOFF_2026-09-22.md` §4 (GEO-02B) and `docs/canonical/ZYARA_GEOSPATIAL_PLATFORM_PLAN_2026-09-22.md` §§7–8, 25–29, 34–35.

## Verified public-source preflight (2026-10-08)

- Project: https://github.com/hyperknot/openfreemap (self-host/source reference).
- Public style example: `https://tiles.openfreemap.org/styles/liberty` (https://openfreemap.org/quick_start/).
- Current OpenFreeMap terms: https://openfreemap.org/tos/ (updated 2026-09-09). Free service, supplied as-is, with no warranty; no production SLA can be assumed.
- Current privacy policy: https://openfreemap.org/privacy/ (updated 2026-10-04). Ordinary access logs are described as anonymized/no default IP; error logs may contain IP and requested URL for up to seven days, and incident-specific logging may continue up to 30 days.
- Attribution source: https://github.com/hyperknot/openfreemap#attribution. Include OpenMapTiles / OpenStreetMap attribution and preserve renderer display. Do not assume a fork of a style grants data rights.
- Public style and map data have layered upstream licenses (including OSM ODbL). Track exact style/asset/version and license provenance separately from MapLibre BSD-3-Clause.
- The public endpoint provides no contractual SLA, routing, geocoding, satellite imagery or healthcare data source.

These statements are public documentation observations, not a provider approval or a legal opinion.

## Configuration contract to implement

A versioned `BasemapDescriptor` should declare:

- stable `id`, provider/adapter ID, `styleVersion`, `tileVersion`, `styleDigest` or explicit mutable-version status;
- exact allowed style/tile/glyph/sprite/asset origins, no arbitrary redirect escape;
- required attribution text and corresponding data/style license references;
- admission status (`disabled | development_only | admitted`), per-provider kill switch, health/failure state and deterministic fallback;
- egress/privacy classification, retention/provider terms, cache controls, max requests, timeout and unavailable semantics;
- no API key or patient/visit/search-intent parameters in URLs, headers or logs.

Do not admit a mutable remote style until its recursively referenced sources, glyphs, sprites, redirects and licenses have been inspected.

## Privacy and delivery rules

- Public MapLibre tile requests disclose a viewed map area through the `z/x/y` tile path. Do not infer such egress is location-anonymous merely because raw GPS is absent.
- Start with a city/area-level, user-intended viewport. Never send precise patient, home, appointment or care-intent coordinates to an unqualified public basemap.
- No silent fallback to another tile host, no CDN override and no third-party worker or logger.
- A basemap outage leaves the already-qualified accessible list/cards/actions intact. Visible attribution must not be removed when a rendered basemap uses licensed data.
- No production dependency decision until privacy/DPIA, terms, operational reliability and regional data-transfer review.

## Minimal acceptance tests

1. Admitted configuration is versioned and fails closed if disabled, unknown or stale.
2. Remote style references and redirects are constrained to an explicit origin allowlist; disallowed style/sprite/glyph/tile URLs are refused.
3. Provider kill switch disables new requests immediately without affecting list discovery.
4. Attribution is mandatory and persists across error/fallback states as applicable.
5. Health, timeout, and upstream unavailability produce explicit unknown/unavailable state rather than fake tiles or ETA.
6. No patient/intent/session/token parameter reaches a tile URL, telemetry or share state.
7. MapLibre worker remains same-origin; GEO-02B cannot expand the GEO-02A worker boundary.
8. Deterministic synthetic tests cover fallback and network policy, plus bounded development-only browser smoke after separate admission.

## Out of scope

No production OpenFreeMap enablement, no self-hosted planet deployment, no geocoder/router, no real patients or clinic coordinate mutation. Self-hosting is a separate GEO-02C operational decision with explicit compute/storage/bandwidth proof.

Next executable step after GEO-02A closure: add the provider-neutral contract and fake-adapter tests under a narrow reviewed GEO-02B implementation PR.
