# GEO-01B Result — Entrances + Service-Area Geometry

Base: `main` @ `89dea445`. Branch: `feat/zyara-network-geo01b-access-geometry`. Scope: `WORK_PACKET.md`.
The exit marker `GEO_01B_ACCESS_GEOMETRY_QUALIFIED = TRUE` is recorded after exact-head CI and merge.

## Delivered

- `access.ts`:
  - `validateEntrance`: sourced entrances; accessibility never inferred; attested ACCESSIBLE; within 1 km of a usable facility point or site-verified; public-safe labels;
  - `currentEntrances`;
  - `validateServiceArea`: closed and bounded Polygon/MultiPolygon, self-intersection, area cap, same-branch service, launch-market and per-part branch plausibility;
  - `withinServiceArea`: `availabilityImplied: false` only;
  - `isPublicSafeText` and `haversineMeters`.
- Migration `048_geo_access_geometry.sql`:
  - append-only `geo_entrances` and `geo_service_areas` with mirrored CHECKs and PostGIS validity;
  - `geo_public_text_ok`;
  - the `care_services(id, tenant_id, branch_id)` unique index and FK;
  - RLS, GIST indexes and the `geo_current_entrances` view.
- The GEO-01 smoke and tests are extended, so the existing `geo01a-ci` runs them.

## Handoff tests → proof

| Handoff test | Unit (`tests/geo01a/access.test.ts`) | PostGIS smoke (GEO-01B section) |
| --- | --- | --- |
| polygon validity | open ring, too few points, wrong type, out of range, bowtie, oversized | bowtie (`ST_IsValid`), line, SRID 0, >50 000 km² |
| cross-branch linkage | other branch or tenant service refused; facility for another branch refused | service of another branch or tenant (23503); entrance on another tenant's branch; cross-branch supersession |
| inactive or superseded entrance behaviour | `currentEntrances` returns only active, unexpired heads; history kept | `geo_current_entrances` = [ent-2, ent-floors]; history preserved; one successor |
| no service-area-equals-availability inference | `withinServiceArea` returns exactly `{ inside, availabilityImplied: false }` | — (no availability column exists) |

## Runs

- Local: GEO-01 suite 23/23 (GEO-01A 12 + GEO-01B 11), M012 7/7. Typecheck, lint, boundaries and smoke syntax: clean.
- **CI at `29e9daa`:** `geo01a-ci` passed: 23/23 tests, and the PostGIS smoke on **PostGIS 3.4.3** printed both the GEO-01A and the GEO-01B PASS lines (verified in the run log). The candidate head is re-run by CI before merge.
- Local PostGIS: Docker became unresponsive during this slice, so the database proof is the CI run.

## Reviews

- **Jev:** the design challenge closed 3 gaps before code (plausibility, missing facility point, public-text hygiene). Post-implementation it flagged `invalid_geometry` 0.53 on `access.ts`, which was fixed with TypeScript self-intersection and area checks. All blocking questions are now "no" (`invalid_geometry` 0.48: rings over 2 000 positions intentionally rely on PostGIS).
- **Alibaba Open Code Review v1.12.12, delegate mode:** files `access.ts`, `index.ts`, `assertion.ts` (union only), migration 048, smoke and Jev spec. Excluded: Markdown (unsupported_ext) and the test file (default_path). Findings:
  - the duplicated small helpers (`fail`, `opaque`, `instant`) across `assertion.ts` and `access.ts` are kept local, to avoid widening the package API;
  - otherwise clean: no `any`, `var`, `==`, nested ternary or injection.

  No OCR-model verdict is claimed.
- **pstack:** a full-in-one panel found one must-fix (Arabic-Indic and Persian digits bypassed the identifier check), which is fixed, plus worth-considering items applied: per-field SQL check, blank and all-digit text, vertex dedupe, per-part plausibility, disputed facility not usable, packet name. The delta re-review (cycle 1) closed all 7 items with **no must-fix**. Its two parity suggestions are applied: whitespace-only labels and no-break spaces inside phone numbers are refused in SQL as in TypeScript, with smoke cases.
- **Graft** (local): the `access.ts` exports have no production caller yet. GEO-03 (directory projection) and the GEO-06 access UI are the intended consumers.

## Residual risks

See SECURITY_PRIVACY_REVIEW: cross-ring validity is DB-only, plausibility is TypeScript-only, and public exposure is GEO-03.
