# GEO-03A — Shared Synthetic Map/List Discovery Work Packet

## Objective

Build the single typed, pure projection that lets the map and accessible results list share one authorized search result set. Do not introduce a new network API, geocoder, router or basemap; reuse the established `BranchPin` and `MapListFilter` types in `@zyara/geospatial`.

This is the **contract grain** of canonical GEO-03, not the full user-facing map UI.

## Acceptance dimensions

- One source-ranked ID set drives the accessible list and its eligible map pins; stable ordering and deterministic clusters.
- Public/hidden/disputed status controls visibility. Unknown, inaccurate, approximate or unverified coordinates never become precise pins.
- Speciality, insurer, accessibility and optional local near filtering feed the same list and pin projection.
- A viewport move is pending only; only explicit `searchDiscoveryArea` commits it, with no automatic reranking.
- Selection is shared by branch ID; filtered-away selection is cleared.
- `mapAvailable=false` retains the accessible list and suppresses map pins.
- No user precise-location permission is required; optional near filtering runs locally and never asserts driving time or route ETA.
- Synthetic fixtures only; tests must cover these boundaries deterministically.

## Out of scope

No MapLibre marker wiring, viewport React state/hooks, interactive selection control, cluster rendering, production search API, provider data, real clinic claims, patient data or third-party egress. GEO-03B owns UI wiring; GEO-03C owns deployed browser/mobile/AT parity and visual acceptance.

## Evidence / governance

Implementation head `05a48b5f9f7c0d6c5e6c7e143b83e392bcfcc5b7`, PR #139. Qualify with existing `geo01a-ci`, `m012-ci`, `m001-ci`, Jev, OCR delegate and Graft. Normal merge with exact head only.
