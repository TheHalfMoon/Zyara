# GEO-01A Work Packet — Geo Assertion + Precision Contract

Base: `main` @ `436590dfe8c81e78a5e4b72bf0de6760d528dff0`.
Branch: `feat/zyara-network-geo01a-assertion-contract`.
Authority: Geospatial plan §§2, 4, 5, 6 (`geo_location_assertions`); geospatial handoff §3 (GEO-01A, "first executable leaf").
Exit marker: `GEO_01A_ASSERTION_CONTRACT_QUALIFIED = TRUE`.
External credentials, real patient data or real provider data required: **none** (synthetic only).

## Scope

1. `@zyara/geospatial` gains `assertion.ts`, a pure contract for:
   - `GeoPoint` validation;
   - precision classes, verification states and source refs;
   - the cross-field rules of a `GeoLocationAssertion`;
   - supersession-chain resolution;
   - the display rule (exact pin or not).

   The existing M012 helpers stay unchanged.
2. Migration `047_geo_location_assertions.sql` (the next free number after 046, which is in review in PR AIF-01B; it is re-checked against live `main` before merge):
   - enables PostGIS and creates an append-only `geo_location_assertions` table with `geometry(Point, 4326)`, a GIST index, tenant RLS (`FORCE`), and a composite FK to `branch_locations(id, tenant_id)`;
   - supersession stays inside the same tenant and branch;
   - a `security_invoker` view `geo_current_location_assertions` exposes the head of each chain.
3. A real PostGIS smoke and synthetic unit tests.

Non-goals: entrances and service areas (GEO-01B), external POI conflation (GEO-01C), the public discovery projection and map UI (GEO-02/03), geocoding and routing (GEO-04/05). No basemap, tile, geocoder or router call. No patient location of any kind: this table holds facility points only.

## Invariants (geo plan §2, enforced here)

- `ProviderGraphLocation != BasemapFeature`: a point from an external dataset can never be verified or provider-attested; it may only be `APPROXIMATE_AREA` or `UNKNOWN`.
- `VerifiedEntrance != BuildingCentroid`: `VERIFIED_ENTRANCE`, `VERIFIED_PARCEL` and `VERIFIED_BUILDING_CENTROID` are distinct classes. A verified class needs verification state `VERIFIED`, a verification method and an evidence ref.
- `MapPin != ProviderTruth`: only `VERIFIED_*` and `PROVIDER_ATTESTED_POINT` with accuracy ≤ 100 m may render as an exact pin (consistent with M012 `visiblePins`). An approximate area renders as an area, never as a pin.
- `PublicFacilityCoordinate != PrivatePatientLocation`: the table stores facility points keyed to `branch_locations`. There is no patient, account or session column.

## Contract

`GeoPoint { lon, lat }` in WGS84, with fields named explicitly; the order is never positional. Rejected:

- non-finite numbers;
- latitude outside [-90, 90] and longitude outside [-180, 180];
- a likely swap: a point outside the launch market's plausibility bounds whose swapped form falls inside them. The Saudi Arabia bounds are lat 16.0–32.5 and lon 34.4–55.8, supplied as `GeoPlausibilityBounds`. Without bounds, no swap check is claimed.

Precision classes (geo plan §5): `VERIFIED_ENTRANCE`, `VERIFIED_PARCEL`, `VERIFIED_BUILDING_CENTROID`, `PROVIDER_ATTESTED_POINT`, `APPROXIMATE_AREA`, `PRIVATE_HIDDEN`, `UNKNOWN`.

Verification states: `UNVERIFIED`, `PROVIDER_ATTESTED`, `VERIFIED`, `DISPUTED`.

Source kinds: `PROVIDER_ATTESTATION`, `ZYARA_VERIFICATION`, `REGULATOR_REGISTRY`, `EXTERNAL_DATASET`.

Each assertion records:

- id, tenant, branch;
- point (null only for `UNKNOWN`) and `accuracyM`;
- precision, verification state, verification method and evidence ref;
- source kind, source ref and source revision (mandatory provenance);
- `observedAt` and `expiresAt` (after `observedAt`);
- `visibility` (`PUBLIC_DIRECTORY` eligible or `TENANT_INTERNAL`);
- `supersedesId`.

Cross-field rules:

1. A verified precision requires state `VERIFIED`, a verification method and an evidence ref. State `VERIFIED` requires a verified precision.
2. `PROVIDER_ATTESTED_POINT` requires state `PROVIDER_ATTESTED` (or `DISPUTED`), and source `PROVIDER_ATTESTATION` or `ZYARA_VERIFICATION`. A dispute removes verified status: a disputed assertion can never carry a verified precision (rule 1), so disputing a verified point appends an assertion with a lower precision and state `DISPUTED`.
3. `EXTERNAL_DATASET` allows only `APPROXIMATE_AREA` or `UNKNOWN`.
4. `APPROXIMATE_AREA` requires `accuracyM`.
5. `UNKNOWN` has no point. Every other class has one.
6. `PRIVATE_HIDDEN` is `TENANT_INTERNAL`. It is never public-directory eligible.
7. `DISPUTED` is never `PUBLIC_DIRECTORY` and never renders as an exact pin.

8. `accuracyM`, when present, is in (0, 50 000] metres.

Supersession: a correction or dispute appends a new assertion that `supersedes` the previous one, in the same tenant and branch. Each assertion has at most one successor, and each branch has at most one root (an assertion that supersedes nothing). A branch therefore has exactly one chain and one current assertion, its head. A dispute is resolved by appending a further assertion with a non-disputed state (for example `VERIFIED` after re-verification). History is never rewritten: the table has no UPDATE or DELETE grant.

Display rule (`displayAs(assertion, now)`): `EXACT_PIN` only for a verified or provider-attested point that is not disputed, not expired at `now`, and has an `accuracyM` of at most 100. `AREA` for `APPROXIMATE_AREA`, and for any point that fails one of those conditions but still has a point and a radius. `LIST_ONLY` otherwise (`UNKNOWN`, `PRIVATE_HIDDEN`, or a point without a radius). An expired assertion stays listable, but it never renders as an exact pin.

## Required tests

Handoff list:

- invalid lat/lon rejected;
- swapped and out-of-range cases;
- SRID enforced;
- cross-tenant insert and read rejected;
- branch FK integrity;
- supersession preserves history;
- approximate assertion cannot claim verified entrance;
- provenance mandatory;
- append-only trail.

Hardening:

- an external dataset cannot be verified;
- `UNKNOWN` has no point;
- a hidden point is never public;
- a disputed point is never an exact pin;
- a supersession chain cannot fork or cross a branch;
- the display rule agrees with M012 `visiblePins`;
- an expired assertion is never an exact pin;
- a second root for a branch is refused;
- an out-of-range accuracy is refused.
