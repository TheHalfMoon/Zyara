# GEO-01A Security and Privacy Review

## Data held

`geo_location_assertions` holds **facility points only**, keyed to `branch_locations`. There is no patient, account, session, user or device column. The smoke asserts that no column name matches those terms. Precise patient location (geo plan §16) is out of scope and is never stored by this slice.

## Tenant isolation

- `FORCE ROW LEVEL SECURITY` with select and insert policies on `app.current_tenant`, as in migrations 042–046.
- The branch FK is tenant-composite (`branch_id, tenant_id`), so an assertion cannot point at another tenant's branch.
- Supersession uses a composite FK on (id, tenant_id, branch_id), so a chain cannot cross a tenant or branch.
- `geo_current_location_assertions` is `security_invoker`, so the querying role's RLS applies to the view as it does to the table (smoke: zero rows under another tenant).

## Public versus tenant scope

`visibility` marks eligibility for the future public directory projection (GEO-03). No public read path exists in this slice: `zyara_app` reads are RLS-bound. `PRIVATE_HIDDEN` and `DISPUTED` assertions are forced to `TENANT_INTERNAL` by CHECKs and by the contract.

## Integrity

- The table is append-only. `zyara_app` has no UPDATE or DELETE grant, and INSERT is column-level, so `recorded_at` is always the database's `now()`.
- One root and at most one successor per branch are enforced by unique indexes, so the history cannot fork.
- SRID 4326 and the Point type are enforced by explicit CHECKs. A `geometry(Point,4326)` typmod would silently coerce an SRID-0 input; the smoke proves the CHECK refuses it.
- Precision cannot be overstated:
  - a verified class needs state `VERIFIED`, a method and evidence;
  - an external dataset is capped at an approximate area;
  - only live, undisputed, verified or attested points within 100 m render as exact pins.

## Egress

No third-party map, geocoder or router request is made, so no care intent or location leaves Zyara (geo plan §16A).

## Residual risks

- Swapped coordinates are detected by the TypeScript contract against the launch market's bounds. The database is market-agnostic and checks only the global range.
- `visibility = PUBLIC_DIRECTORY` is eligibility only. GEO-03 must build the public projection, including staleness and dispute filtering.
- A regulator or registry source can assert `PROVIDER_ATTESTED_POINT` only through Zyara verification. Formal registry onboarding is an external gate.
