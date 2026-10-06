# GEO-01B Work Packet — Entrances + Service-Area Geometry

Base: `main` @ `89dea445ccbc4c9d0f24a20a5973a9d33186ae5d`.
Branch: `feat/zyara-network-geo01b-access-geometry`.
Authority: geospatial plan §§2, 6 (`geo_entrances`, `geo_service_areas`), §17 (entrances, accessibility and final-100 m care access); geospatial handoff §3 (GEO-01B).
Exit marker: `GEO_01B_ACCESS_GEOMETRY_QUALIFIED = TRUE`.

## Placement

GEO-01B belongs to "GEO-01 — Geo truth" with GEO-01A. It extends `@zyara/geospatial` (`access.ts`). Its tests live in `tests/geo01a` and its database checks extend the GEO-01 PostGIS smoke, so the existing `geo01a-ci` workflow runs them. Migration: `048_geo_access_geometry.sql`.

## Entrances (`GeoEntrance`)

- Kinds (plan §6): `MAIN`, `ACCESSIBLE`, `EMERGENCY`, `DROPOFF`, `PARKING`, `SERVICE`.
- Fields:
  - id, tenant and branch;
  - kind and point (WGS84 via GEO-01A `validateGeoPoint`, with launch-market swap detection);
  - `publicLabel` (`{ ar?, en? }`, each ≤ 120 characters, at least one present);
  - `floor` (optional, −10..200) and arrival instructions (`{ ar?, en? }`, ≤ 500 characters);
  - accessibility facts and source (the GEO-01A `GeoSourceRef`, mandatory);
  - `verificationState` (GEO-01A), `observedAt`, `expiresAt`, `status` (`ACTIVE` or `INACTIVE`) and `supersedesId`.
- **Accessibility facts** (plan §17): `stepFree`, `lift`, `accessibleToilet` and `accessibleParking`, each `YES`, `NO` or `UNKNOWN`.
  - **Never inferred.** A fact from `EXTERNAL_DATASET` can only be `UNKNOWN`. Imagery, 3D and AI are not sources (plan §17), and the source kinds have no such member.
  - An `ACCESSIBLE` entrance requires `stepFree = YES` from `PROVIDER_ATTESTATION` or `ZYARA_VERIFICATION`.
  - Any `YES` fact requires a verification state of `PROVIDER_ATTESTED` or `VERIFIED`.
- **Lifecycle.** An entrance correction appends a superseding row (one successor per entrance), within the same tenant and branch. `INACTIVE` (a closed entrance) is a superseding row too. **Current entrances** are chain heads that are `ACTIVE` and unexpired at `now`. Inactive, superseded or expired entrances are never current and never displayed.
- **Plausibility.** `entranceNearFacility(entrance, facilityAssertion, maxMeters = 1000)` checks the entrance against the branch's current GEO-01A point (haversine). A far entrance is refused as `GEO_ENTRANCE_TOO_FAR`.

## Service areas (`GeoServiceArea`)

For home or mobile care only, linked to a branch's care service.

- Fields:
  - id, tenant, branch and `serviceId`;
  - `geometry`: GeoJSON `Polygon` or `MultiPolygon`, WGS84;
  - source (mandatory), `observedAt`, `expiresAt`, `status` and `supersedesId`.
- **Validity.**
  - In TypeScript: every ring is closed with ≥ 4 positions, at most 10 000 positions in total, all coordinates finite and in range, and the type is exactly `Polygon` or `MultiPolygon`.
  - In PostGIS: `ST_IsValid` (no self-intersection), SRID 4326, 2D, and area ≤ 50 000 km² (`ST_Area(geography)`).
- **Cross-branch linkage.** The service must belong to the same tenant and branch, enforced by a composite FK to `care_services(id, tenant_id, branch_id)` through a new unique index on that table (additive).
- **No availability inference.** `withinServiceArea(area, point)` returns `{ inside, availabilityImplied: false }`. The type has no availability field and `availabilityImplied` is the literal `false`. Being inside a polygon never means a slot exists (plan §6).

## Plausibility and text hygiene

- **Entrance distance.** With a current GEO-01A facility point (any class except `UNKNOWN` or `PRIVATE_HIDDEN`), an entrance more than 1 000 m away is refused as `GEO_ENTRANCE_TOO_FAR`. Without a usable facility point, an entrance is accepted only when its own verification state is `VERIFIED` (a site check). Otherwise it is refused as `GEO_ENTRANCE_NO_FACILITY`.
- **Service-area plausibility.** When launch-market bounds are supplied (GEO-01A `SAUDI_ARABIA_BOUNDS`), every vertex must lie inside them. With a usable facility point, the area's bounding box must lie within 100 km of it (`GEO_SERVICE_AREA_IMPLAUSIBLE`). A service area far from its branch is a data error, not a coverage claim.
- **Labels and instructions.** Public labels and arrival instructions are public facility wayfinding text only, and never patient data: no patient name, appointment or visit detail. They must not carry an e-mail address, a phone-like digit run (9+ digits after removing separators) or an all-digit identifier. Contact details belong to the branch contact model, not to geometry. A violation is refused as `GEO_TEXT_NOT_PUBLIC_SAFE`.

## Database (`048_geo_access_geometry.sql`, additive)

- `geo_entrances` and `geo_service_areas`:
  - append-only (`SELECT` plus column-level `INSERT` for `zyara_app`), so `recorded_at` is database time;
  - FORCE RLS on `app.current_tenant`;
  - composite branch FK and same-branch supersession FK, with one successor per row;
  - CHECKs mirroring the contract rules;
  - GIST indexes.
- A `security_invoker` view `geo_current_entrances` shows ACTIVE chain heads.
- A unique index on `care_services(id, tenant_id, branch_id)` (additive; existing rows already satisfy it, since `id` is the primary key).

## Required tests (handoff)

- polygon validity: unclosed ring, too few points, self-intersection (PostGIS), wrong SRID, wrong type and range;
- cross-branch linkage: a service of another branch or tenant is refused (FK in the smoke, check in TypeScript);
- inactive and superseded entrance behaviour: not current and not displayed; history kept;
- no service-area-equals-availability inference: the type and result carry `availabilityImplied: false` only.

Plus:

- accessibility is never inferred from an external dataset;
- an `ACCESSIBLE` entrance needs attested step-free access;
- an entrance far from the facility is refused;
- RLS isolation and append-only (smoke).
