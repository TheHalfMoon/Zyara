# GEO-03A Security, Privacy and Accessibility

- The projection is pure and performs **no network I/O**, no tile requests, no geocoding/routing and no data persistence.
- Inputs reuse existing geospatial `BranchPin` entities and map/list filter types. Invalid source rank and duplicate entity IDs fail closed instead of misaligning map and list.
- Hidden or disputed records never reach public list or map. Coordinates are supplied only for a public, provider-attested, finite, <=100m-accuracy, precise-location record. Inaccurate, unknown and approximate locations remain listable with explicit disclosure but never become precise pins.
- Source-ranked result order cannot be changed by merely panning the map. A separate explicit user action commits a viewport; approximate/unknown listings are retained with uncertainty disclosure.
- Optional local near filtering rejects invalid bounds/radius and operates entirely in memory; there is no mandatory precise-location permission.
- Map availability state does not alter the accessible result list; selection uses the same stable branch IDs.

## Residual gates

- Real authoritative entity extraction/auth checks and patient context are not part of this synthetic-only contract. Production callers must only supply tenant-authorized, publishable branches.
- The existing map UI still contains synthetic decorative pins/cards and an unwired `Search this area` button. These are **not** claimed as complete GEO-03 behavior; GEO-03B must wire live client state to the shared contract or hide inaccessible controls.
- GEO-03B must label demo data visibly, avoid presenting synthetic ETA/open-now/availability as live facts, and preserve RTL and keyboard reachability.
- Low-end mobile, screen-reader and deployed browser acceptance remain GEO-03C gates.
