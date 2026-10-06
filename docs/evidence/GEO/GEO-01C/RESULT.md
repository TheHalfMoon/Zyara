# GEO-01C Result — External Spatial Identity + Conflation

Base: `main` @ `c20f90c4` (GEO-01B merge). Branch: `feat/zyara-network-geo01c-conflation`. PR: TheHalfMoon/Zyara#128. Scope: `WORK_PACKET.md`.
The exit marker `GEO_01C_CONFLATION_QUALIFIED = TRUE` is recorded in the closure after exact-head CI and merge.

## Delivered

- `conflation.ts`:
  - `SEEDED_EXTERNAL_NAMESPACES` and `validateExternalObservation`: namespace-bound ids, public-safe names, presence and point rules;
  - `normalizeFacilityName`: equality only, Arabic and English;
  - `assessLinkCandidates`: `DETERMINISTIC` (provider-declared exact id), `REVIEW` (spatial **and** name), `AMBIGUOUS`, `NO_MATCH`, `NOT_LINKABLE`;
  - `validateLinkEvent` and `activeLinks`: audited LINK/UNLINK, one active link per id and per branch/namespace, `SYSTEM` only for deterministic links;
  - `detectCoordinateConflict` and `validateConflictResolution`: conflicts never overwrite;
  - `validateSupersession`, `anchorPoint` and `validateCoordinateCorrection`: source authority, the dispute rule, the audited and reviewed anchors, and the material, large and bulk gates.
- Migration `049_geo_conflation.sql` (additive):
  - six tables: namespaces (reference data), observations, links, corrections, conflicts and resolutions;
  - guard triggers;
  - `geo_anchor_point`;
  - authority and deferred move-audit triggers on `geo_location_assertions` (migration 047 is unchanged);
  - FORCE RLS, `security_invoker` views, and append-only grants with database-measured `moved_m` and `distance_m`.
- Tests are in `tests/geo01a/conflation.test.ts`, and the GEO-01 PostGIS smoke has a GEO-01C section, so the existing `geo01a-ci` runs both.

## Handoff tests → proof

| Handoff test | Unit (`tests/geo01a/conflation.test.ts`) | PostGIS smoke (GEO-01C section) |
| --- | --- | --- |
| nearby same-name facilities remain distinct without stronger evidence | two same-name branches 81 m apart → `AMBIGUOUS`; distance-only and name-only → `NO_MATCH`; `SYSTEM` cannot act on `REVIEW` | `SYSTEM` + reviewed evidence refused (CHECK); one active link per id and per branch/namespace, including under concurrency (second session proven waiting on the lock, then 23514) |
| exact external id can link only within allowed source namespace | declared id → `DETERMINISTIC`; other namespace → no match; geocoder → `NOT_LINKABLE`; unknown namespace and malformed ids refused | malformed id and unknown namespace refused; geocoder id never linkable; geocoder namespace cannot be linkable; app cannot add namespaces |
| conflicting coordinates remain unresolved rather than overwritten | mismatch detected, assertion untouched; within tolerance or unlinked → none | conflict measured by the database (~5 km), client distance refused (42501), head unchanged; stays in `geo_open_coordinate_conflicts` until resolved once |
| unlink preserves history | unlink keeps both rows; double unlink and `SYSTEM` unlink refused; relink allowed | history 2 rows / 0 active; second unlink 23505; mismatched unlink 23503; relink |
| low-authority external feed cannot overwrite a verified assertion | external over VERIFIED or ATTESTED refused; provider over VERIFIED refused; dispute allowed but not materially moving; a disputed head needs Zyara | external-dataset and provider supersession of a verified head refused; moving dispute refused; provider cannot resolve a dispute |
| material coordinate move records evidence and actor | > 50 m requires a correction by a provider or admin with evidence; `SYSTEM` refused | move without a correction fails at commit; correction records actor, evidence and database-measured `moved_m` |
| bulk malicious edits are rate-limited/reviewable | 11th correction in 24 h needs a reviewer; > 1 000 m (step or total since the last review) needs a distinct reviewer | 11th correction refused without a reviewer; large move, reviewer = actor, UNKNOWN detour, small-step walk, UNKNOWN root and cumulative drift all enforced |

Also: external disappearance opens `EXTERNAL_ABSENT` and leaves the link and assertion intact; the link and correction guards accept READ COMMITTED only (25000 at REPEATABLE READ and SERIALIZABLE); RLS isolation; append-only; no patient columns.

## Runs

- Local:
  - GEO-01 suite 45/45 (GEO-01A 12, GEO-01B 11, GEO-01C 22);
  - `@zyara/geospatial` typecheck and lint clean, `geo01a-tests` lint clean, boundary check passed;
  - smoke syntax OK;
  - migration 049 parsed by the PostgreSQL parser (`libpg-query` 18.1.5): 56 statements, and every PL/pgSQL body parses.
- **CI at `432f61d`:** `geo01a-ci` passed: 45/45 tests, and on **PostGIS 3.4.3** the PostGIS smoke printed the GEO-01A, GEO-01B and GEO-01C PASS lines (verified in run 37535600680's log). The final head is re-run by CI before merge.
- **Earlier CI failures, all fixed:**
  - `34aee85` and `a4187cc`: a patch script's `String.replace` turned `$$` into `$` (syntax error 42601);
  - `5b2e794`: the smoke expected 23503 but PostgreSQL checks the unique index first (23505);
  - `477953d`: a `LANGUAGE sql` function referenced a table created later (42P01).
- Local PostGIS: Docker was unresponsive during this slice, so the database proof is CI.

## Reviews

- **Jev (jev 0.3.2):**
  - The design challenge on the work packet answered all six questions "no" (max p = 0.17).
  - Post-implementation, each source file paired with its tests answers all "no". At the final head, `conflation.ts` + tests: max p = 0.17 (`abuse_controls`). 049 + smoke section: `untested_requirement` 0.39; the candidate cases are TypeScript-only by design.
  - Run alone, the source files report `untested_requirement` "yes", because those files contain no tests.
- **Alibaba Open Code Review v1.12.11 (`a758d9c`), delegate mode:**
  - Files: `conflation.ts`, `assertion.ts` (union only), `index.ts`, migration 049, the smoke and the Jev spec. Excluded: Markdown (unsupported_ext) and the test file (default_path).
  - The host applied the returned rule groups ("system" JS/TS and "system default"):
    - must-fix: the dispute-then-replace path (a DISPUTED head required only rank 2), fixed;
    - must-fix: the race test relied on a sleep, now proven by `pg_locks`;
    - fixed: namespace entries are type-checked before use;
    - kept: the `fail`/`opaque`/`instant` helpers stay local to the module, as in GEO-01B.
  - Clean: no `any`, `var`, `==` or nested ternary. The only dynamic `RegExp` comes from migrator-controlled, anchored namespace patterns.
  - No OCR-model verdict is claimed.
- **pstack:** see `PSTACK_EVIDENCE.md`.
- **Graft 0.21.1 (local; telemetry disabled):**
  - `graft check`: the wiring graph is in sync.
  - `graft callers`: `haversineMeters` is now also called by `assessLinkCandidates`, `detectCoordinateConflict` and `validateSupersession`, and `isPublicSafeText` by `validateExternalObservation`.
  - `graft skeleton` confirmed the exported surface.
  - The conflation exports have no production caller yet. The GEO admin command and GEO-03 projection are the intended consumers.

## Residual risks

See `SECURITY_PRIVACY_REVIEW.md` and the work packet's enforcement boundaries:

- provider-declared ids are enforced in the application;
- reviewer and actor identity are not yet approval-bound;
- cross-tenant collisions must stay unresolved in GEO-03;
- reviewed-anchor conservatism;
- the guards require READ COMMITTED.
