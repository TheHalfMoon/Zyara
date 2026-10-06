# GEO-01C Work Packet — External Spatial Identity + Conflation

Base: `main` @ `c20f90c407eb4af34ed37ef2f276e9a2f0d6fb72` (GEO-01B merge, PR #127).
Branch: `feat/zyara-network-geo01c-conflation`.
Authority: geospatial plan §13A (external POI conflation and duplicate prevention), §23 ("provider coordinate correction is a separate admin command", "geocoder output never self-verifies"); geospatial handoff §3 (GEO-01C); source adoption §§6–7 (no geocoder is admitted).
Exit marker: `GEO_01C_CONFLATION_QUALIFIED = TRUE`.

## Placement

GEO-01C closes "GEO-01 — Geo truth". It extends `@zyara/geospatial` with `conflation.ts`. Its tests live in `tests/geo01a`, and its database checks extend the GEO-01 PostGIS smoke, so the existing `geo01a-ci` workflow runs them. Migration: `049_geo_conflation.sql`.

## Principle

Basemap and geocoder POIs are **external observations**, not Zyara provider identities. They never create a Zyara facility, never move a Zyara point, and never delete Zyara truth. The flow is:

1. external observation;
2. computed candidate;
3. deterministic identifier, or spatial and name evidence;
4. human or provider review where material;
5. audited canonical link;
6. provenance.

Coordinates change only through a GEO-01A superseding assertion plus an audited correction record.

## External namespaces (`geo_external_namespaces`, reference data)

- Each namespace has:
  - a `namespace` code (`^[a-z][a-z0-9-]{1,31}$`);
  - an `authority` (`OPEN_DATA`, `REGULATOR` or `GEOCODER`);
  - an `id_pattern` (an anchored regex for that namespace's external ids);
  - `link_allowed`.
- Only the migrator manages namespaces. The application can only `SELECT` them.
- Seeded: `osm-node`, `osm-way` and `osm-relation` (`OPEN_DATA`, ids `^[1-9][0-9]{0,15}$`, linkable). OSM is the only external ecosystem with an adoption record (source adoption §6).
- No geocoder namespace is seeded, because no geocoder is admitted (source adoption §7). A geocoder namespace, when admitted, must have `link_allowed = FALSE`: geocoder output never self-verifies (§23). The database enforces this with `CHECK (authority <> 'GEOCODER' OR NOT link_allowed)`.
- An external id is accepted only when it matches its namespace's pattern, in TypeScript and in the database (trigger).

## External observations (`GeoExternalObservation`, append-only)

- Fields:
  - id, tenant, namespace and `externalId`;
  - `presence`: `PRESENT`, or `ABSENT` (the POI disappeared from the feed);
  - `point` (WGS84, required when `PRESENT`, null when `ABSENT`);
  - `name` (public facility name, ≤ 200 characters, GEO-01B public-safe text);
  - `sourceRevision`, `observedAt` and `recordedAt` (database time).
- An observation is evidence only. It has no branch column and cannot modify an assertion, an entrance or a link.
- **Disappearance never deletes Zyara truth.** An `ABSENT` observation for a linked id opens an `EXTERNAL_ABSENT` conflict for review. The link and the assertion stay as they are.

## Candidates (`assessLinkCandidates`, computed, not persisted)

`assessLinkCandidates(observation, branches, namespaces)` compares one observation against the tenant's branch profiles. Each profile has the branch id, its current GEO-01A assertion, its names, and the external ids that the provider declared in a provider-attested record. It returns one decision:

- **`DETERMINISTIC`**: the namespace is linkable, the id matches its pattern, and exactly one branch declared this exact `(namespace, externalId)`. Only this decision may be linked by the `SYSTEM` actor. If two branches declare the same id, the result is `AMBIGUOUS`.
- **`REVIEW`**: exactly one branch has both spatial evidence (within 250 m of a usable current point) and name evidence (equal normalized name). This is a proposal only. Linking it needs a human or provider actor with evidence.
- **`AMBIGUOUS`**: more than one branch qualifies on spatial and name evidence (nearby same-name facilities). No link is proposed. The facilities stay distinct.
- **`NO_MATCH`**: distance alone or name alone is never enough (plan §13A). A same-name branch 5 km away, or a nearby branch with a different name, is `NO_MATCH`.
- **`NOT_LINKABLE`**: the namespace is unknown or not linkable, or the observation is `ABSENT`.

**Name normalization** (Arabic and English):

- NFKC, then lower case;
- Arabic diacritics (U+064B–U+065F, U+0670) and tatweel removed;
- alef variants → ا, ة → ه, ى → ي;
- punctuation → space, whitespace collapsed.

Normalized names are compared for equality only. There is no fuzzy score that could drift into "name-only" matching.

## Canonical links (`geo_external_links`, append-only event rows)

- A `LINK` row binds `(tenant, namespace, externalId)` to one branch.
- An `UNLINK` row references the `LINK` row it ends (`unlinks_id`, unique, with the same tenant, branch, namespace and id by composite FK).
- History is never deleted. **Unlink preserves history.**
- Each row has:
  - `basis`: `DETERMINISTIC_ID` or `REVIEWED_EVIDENCE`;
  - `actor_kind`: `SYSTEM`, `PROVIDER` or `ZYARA_ADMIN`, plus an opaque `actor_ref`;
  - `evidence_ref` (mandatory) and `reason_code`.
- **Rules**, enforced in TypeScript (`validateLinkEvent`) and in the database (CHECK plus trigger):
  - `SYSTEM` may only `LINK` with basis `DETERMINISTIC_ID`, and never unlinks.
  - `REVIEWED_EVIDENCE` and every `UNLINK` need a `PROVIDER` or `ZYARA_ADMIN` actor.
  - The namespace must exist and be linkable, and the id must match its pattern.
  - **One active link** per `(tenant, namespace, externalId)`, and one active link per `(tenant, branch, namespace)`. The trigger takes a transaction advisory lock on both keys, so concurrent links cannot both pass.
  - The current link state is the set of `LINK` rows without an `UNLINK` row (`geo_active_external_links` view, `security_invoker`).
- **Cross-tenant scope.** Links are tenant-scoped and never affect another tenant's facilities. The same external id linked by two tenants is a cross-tenant collision. GEO-03 search projection must treat it as unresolved and must not collapse it (forward requirement, recorded in the closure).

## Coordinate conflicts (`geo_coordinate_conflicts`, append-only)

`detectCoordinateConflict(assertion, observation)`:

- A `PRESENT` observation of a linked id whose point lies more than `max(150 m, assertion.accuracyM)` from the current Zyara point opens a `COORDINATE_MISMATCH` conflict with `distance_m`.
- An `ABSENT` observation opens `EXTERNAL_ABSENT`.
- **Conflicts never overwrite.** They stay open (`geo_open_coordinate_conflicts` view) until a `RESOLVE` row references them. Each conflict can be resolved once.
- Resolution values:
  - `KEEP_ZYARA`;
  - `CORRECTED` (references the superseding assertion);
  - `EXTERNAL_ERROR`.
- Resolution needs a `PROVIDER` or `ZYARA_ADMIN` actor with evidence.

## Coordinate corrections (`geo_coordinate_corrections`, append-only)

- A correction is a GEO-01A superseding assertion (`to_assertion_id` supersedes `from_assertion_id`, in the same tenant and branch) plus one correction record.
- The record holds actor kind and ref, an optional `reviewer_ref`, `evidence_ref` (mandatory), a `reason_code`, and `moved_m`.
- The database computes `moved_m` from the two stored points (geography distance). It is never supplied by the client. A move to or from a null point records null.
- `validateCoordinateCorrection(from, to, meta, recentCorrections, now)` enforces the same rules in TypeScript:
  1. **Authority.** Source rank is `EXTERNAL_DATASET` = 1, `PROVIDER_ATTESTATION` = 2, `REGULATOR_REGISTRY` = 2 and `ZYARA_VERIFICATION` = 3. A head that is `VERIFIED` needs rank 3, and a head that is `PROVIDER_ATTESTED` needs rank ≥ 2. A low-authority external feed cannot supersede a verified or attested assertion (`GEO_CORRECTION_AUTHORITY_TOO_LOW`). A provider relocation of a verified site goes through Zyara verification (§23, separate admin command).
  2. **Material move.** A move of more than 50 m needs a `PROVIDER` or `ZYARA_ADMIN` actor, and the evidence and actor are recorded. `SYSTEM` cannot correct coordinates.
  3. **Large move.** A move of more than 1 000 m needs a `reviewer_ref` that differs from `actor_ref` (`GEO_CORRECTION_REVIEW_REQUIRED`).
  4. **Bulk control.** In any 24-hour window an actor may record at most 10 corrections in a tenant without a reviewer. Beyond that, every further correction needs a distinct reviewer (`GEO_CORRECTION_RATE_LIMITED`). The database enforces the same rule with a trigger that counts the actor's recent rows, using database time, under a per-actor advisory lock.
- The trigger also checks that `to.supersedes_id = from.id`, that both assertions belong to the row's tenant and branch, and that `from` was the head. One correction per `to_assertion_id`.

## Database (`049_geo_conflation.sql`, additive)

- Five tables:
  - `geo_external_namespaces` (reference data; `SELECT` for the application);
  - `geo_external_observations`, `geo_external_links`, `geo_coordinate_conflicts` and `geo_coordinate_corrections` (append-only; `SELECT` plus column-level `INSERT`).
- FORCE RLS on `app.current_tenant` for the four tenant tables.
- Composite tenant and branch FKs, and CHECKs mirroring the rules.
- Guard triggers with pinned `search_path`.
- `security_invoker` views `geo_active_external_links` and `geo_open_coordinate_conflicts`.
- No patient, account or session location.

## Required tests (handoff)

- nearby same-name facilities remain distinct without stronger evidence;
- an exact external id can link only within an allowed source namespace;
- conflicting coordinates remain unresolved rather than overwritten;
- unlink preserves history;
- a low-authority external feed cannot overwrite a verified assertion;
- a material coordinate move records evidence and actor;
- bulk malicious edits are rate-limited or reviewable.

Plus:

- distance alone and name alone never produce a link;
- external disappearance does not delete the link or the assertion;
- the database computes `moved_m`;
- `SYSTEM` cannot correct or unlink;
- one active link per id (concurrent-safe);
- RLS isolation and append-only (smoke).
