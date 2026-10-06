# GEO-01B Security and Privacy Review

- **No patient location.** Entrances and service areas are facility geometry keyed to `branch_locations` and `care_services`. The tables have no patient, account, session or device column.
- **Public text is public-safe.** Labels and arrival instructions refuse e-mail addresses, phone-like digit runs (Latin, Arabic-Indic and Persian digits), all-digit identifiers and blank text, per field, in TypeScript and SQL (`geo_public_text_ok`). The text is never patient data.
- **Accessibility is never inferred.** External datasets can only say UNKNOWN, and any YES needs an attested or verified provider or Zyara source. Imagery, 3D and AI are not sources (plan §17).
- **No availability inference.** `withinServiceArea` returns `availabilityImplied: false` only, and the type has no availability field.
- **Tenant and branch isolation.**
  - FORCE RLS on both tables.
  - Composite branch FKs.
  - Service areas link to a care service of the same tenant and branch (FK via the new `care_services(id, tenant_id, branch_id)` unique index).
  - Supersession cannot cross branches.
  - The `geo_current_entrances` view is `security_invoker`.
- **Integrity.** Both tables are append-only for the application (`SELECT` plus column-level `INSERT`; `recorded_at` is database time), with one successor per row.
- **Geometry abuse.**
  - PostGIS enforces `ST_IsValid`, SRID 4326, 2D, ≤ 10 000 points and ≤ 50 000 km².
  - The TypeScript contract mirrors the structure, size and (for rings ≤ 2 000 positions) self-intersection checks.

Residual risks:

- Self-intersection across rings (a hole crossing its shell) and overlapping multipolygon parts are refused only by PostGIS `ST_IsValid`.
- Facility-distance plausibility is checked in TypeScript only. The database is market-agnostic.
- Public directory exposure is GEO-03.
