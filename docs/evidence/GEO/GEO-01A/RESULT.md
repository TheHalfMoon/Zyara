# GEO-01A Result — Geo Assertion + Precision Contract

Base: `main` @ `436590d`, merged forward with `main` @ `f18aabc9` (AIF-01B), so migration 047 follows 046. Branch: `feat/zyara-network-geo01a-assertion-contract`.
Scope: `WORK_PACKET.md`. The exit marker `GEO_01A_ASSERTION_CONTRACT_QUALIFIED = TRUE` is recorded after exact-head CI and merge.

## Delivered

- `packages/geospatial/src/assertion.ts`:
  - `validateGeoPoint`: finite, in range, and swap detection inside the Saudi launch bounds;
  - `validateGeoAssertion`: eight cross-field rules;
  - `currentGeoAssertion`: one chain per branch; refuses forks, second roots, cycles, dangling links and cross-branch links;
  - `displayGeoAssertion`: exact pin only for live, undisputed, verified or attested points within 100 m, matching M012.
- Migration `047_geo_location_assertions.sql`:
  - PostGIS;
  - append-only assertions with explicit Point/SRID 4326/2D CHECKs (no silent SRID-0 coercion);
  - mirrored rule CHECKs;
  - one root and one successor per branch (tenant-scoped);
  - same-branch supersession FK;
  - GIST index;
  - FORCE RLS;
  - column-level insert;
  - a `security_invoker` current-head view.
- Workflow `geo01a-ci`, using the `postgis/postgis:16-3.4` service.

## Handoff tests → proof

| Handoff test | Unit (`tests/geo01a`) | PostGIS smoke |
| --- | --- | --- |
| invalid lat/lon | non-finite, string, array, range | lat 91, lon 181 |
| swapped / out-of-range | swap inside KSA bounds; none claimed without bounds | range only (DB is market-agnostic) |
| SRID expected | — | SRID 3857 and SRID 0 refused (not coerced), non-point and 3D refused |
| cross-tenant insert/read | — | RLS insert refusal, zero rows in the table and the view under another tenant |
| branch FK integrity | — | other-tenant branch, nonexistent branch, delete RESTRICT |
| supersession preserves history | chain of 3 resolved | 3 rows kept; the view shows the head |
| approximate cannot claim verified entrance | yes | yes |
| provenance mandatory | ref, revision, source, times | ref NULL, revision empty |
| append-only trail | — | UPDATE, DELETE and backdated `recorded_at` refused for `zyara_app` |

## Runs (candidate content `8360175`)

- `@zyara/geo01a-tests`: 12/12.
- `@zyara/m012-tests` (shared helpers): 7/7.
- After the merge with main: `@zyara/aif01b-tests` 50/50.
- Typecheck, lint and boundaries: clean.
- PostGIS smoke: PASS on PostgreSQL 16 + PostGIS 3.6.4 (local, ARM-compatible image built from `postgres:16` plus the Debian `postgresql-16-postgis-3`, because the official `postgis/postgis` image failed with `exec format error` here). CI uses `postgis/postgis:16-3.4`.

## Reviews

- **Jev** (`jev/design.spec.json`, jev-1.13.0). The design challenge closed four gaps before code (stale display 0.15→0.96, two chain heads 0.14→0.68, accuracy bounds 0.06→0.60, dispute resolution 0.11→0.97). Post-implementation, all five blocking questions are "no" on every file. The final maximum is `invalid_coordinates` 0.30, which reflects the market-agnostic database swap check recorded below.
- **Alibaba Open Code Review v1.12.12, delegate mode.** OCR selected 7 of 12 files: the workflow, smoke, migration, Jev spec, `assertion.ts`, `index.ts` and the test `package.json`. It excluded the three Markdown files (unsupported_ext), `pnpm-lock.yaml` and `assertion.test.ts` (default_path). The host agent applied the resolved rule groups (default SQL, TS/JS, workflows): no nested ternary, `any`, `var`, `==`, injection or secret findings. The workflow tag pin (`pnpm/action-setup@v4`) is deferred repo-wide. No OCR-model verdict is claimed.
- **pstack** (two fresh-context judges: correctness+security, and parsimony+product): **no must-fix code defects**. Must-fix evidence items, now written: PROVENANCE, SECURITY_PRIVACY_REVIEW, RESULT, and the packet drift. Worth-considering items applied: 2D-only points, a tenant-scoped successor index, calendar round-trip, unused export and duplicate check removed, extra branch-FK smoke cases, an honest GIST claim. Not applied, with rationale:
  - named-constraint assertions in the smoke: each case uses a single, distinct violating input;
  - a dev-only guard on the smoke's DROP: same convention as the existing N5 smokes;
  - the global `id` primary key: repo-wide convention since 042; a residual risk below.
- **Graft** 0.21.1, local graph only, telemetry off: `graft callers visiblePins` and `applyFilter` show only `tests/m012` and `tests/geo01a` as consumers, so the M012 regression suite was run.

## Residual risks

- Swaps are detected by the TypeScript contract against market bounds. The database checks only the global range.
- `visibility` records eligibility only. The GEO-02/03 projection must filter by visibility, staleness and dispute. `displayGeoAssertion` is a precision rule, not an audience rule.
- A global `id` primary key (as in 042–046) lets a uniqueness error reveal that an id exists in some tenant. Ids should be random (UUIDs) at the API layer.
- Registry/regulator onboarding of facility coordinates is an external gate.
