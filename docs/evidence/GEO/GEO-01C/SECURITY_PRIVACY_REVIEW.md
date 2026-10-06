# GEO-01C Security and Privacy Review

- **No patient location.** Observations, links, conflicts, resolutions and corrections carry facility data only, keyed to `branch_locations` and GEO-01A assertions. No table has a patient, account, session, user or device column (smoke check).
- **External data is evidence, never truth.**
  - An observation has no branch column and cannot change an assertion, entrance or link.
  - A disagreement opens a conflict whose distance the database measures.
  - A disappearance opens `EXTERNAL_ABSENT`.
  - Neither overwrites or deletes anything.
  - External names must be public-safe text (`geo_public_text_ok`).
- **No weak-evidence identity.**
  - Distance alone and name alone never produce a candidate.
  - Spatial plus name evidence is a `REVIEW` proposal only.
  - Nearby same-name facilities are `AMBIGUOUS`.
  - The `SYSTEM` actor may only `LINK` with basis `DETERMINISTIC_ID`, and never unlinks or resolves (database CHECKs).
- **Namespace control.**
  - Namespaces are migrator-managed reference data; the application cannot insert them.
  - Patterns are anchored, and geocoder namespaces cannot be linkable (CHECK).
  - Every observation and link id must match its namespace pattern (guard triggers).
- **Authority and audit of coordinates.**
  - A weaker source cannot supersede a stronger head. A dispute cannot materially move a point (more than 50 m from the anchor), and a disputed head needs Zyara verification (trigger on `geo_location_assertions`).
  - Every superseding assertion more than 50 m from the audited anchor commits only with a correction record holding actor and evidence (deferred constraint trigger). The anchor is measured from the root or a correction target, with a fallback to the oldest point. This closes the UNKNOWN-detour and small-step-walk paths.
  - A distance over 1 000 m, whether from the anchor or in total from the last reviewed anchor, needs a distinct reviewer.
  - More than 10 corrections per actor in 24 hours need a distinct reviewer. A per-actor advisory lock and database time keep this exact.
  - `moved_m` and `distance_m` are computed by the database; the application has no INSERT privilege on them.
- **Concurrency.** One active link per `(tenant, namespace, external id)` and per `(tenant, branch, namespace)` is enforced under transaction advisory locks. The smoke proves that a second session waits on the lock and is then refused. A link is ended at most once (unique index), and a conflict is resolved at most once.
- **Tenant isolation and integrity.**
  - FORCE RLS on all five tenant tables.
  - Composite tenant and branch FKs, and an unlink must match the link it ends (composite FK).
  - `security_invoker` views.
  - Append-only: `SELECT` plus column-level `INSERT`, with `recorded_at` set by the database.
  - Guard functions pin `search_path`.
- **Secrets.** None. `evidence_ref`, `actor_ref` and `reviewer_ref` are opaque references, never document contents.

Residual risks (recorded in the work packet as enforcement boundaries and forward requirements):

- **Provider-declared ids are enforced in the application.** The database requires `DETERMINISTIC_ID` and an evidence reference for `SYSTEM` links, but cannot yet check the provider's declaration (Provider Graph has no declared-id store).
- **Reviewer and actor identity.** `reviewer_ref` must differ from `actor_ref`, but is not yet bound to an approved `approval_requests` row. `actor_ref` is only as strong as the service's binding to the authenticated principal. The reviewer gates are therefore recorded second-identity gates, not verified approvals. Forward requirement: the GEO coordinate-correction admin command binds both.
- **Cross-tenant collisions.** Two tenants linking the same external id is invisible to each other under RLS. GEO-03 search projection must treat such a collision as unresolved and never collapse it.
- **Re-verification does not reset the reviewed anchor.** A Zyara re-verification that is not recorded as a reviewed correction does not reset the reviewed anchor, so total drift above 1 000 m from the last reviewed point always needs a reviewer. This is deliberately conservative.
- **Isolation level.** The link and correction guards are exact only under READ COMMITTED, where each statement takes a fresh snapshot after the advisory lock. Under REPEATABLE READ or SERIALIZABLE the snapshot can predate a concurrent commit, and SSI does not track READ COMMITTED writers. Both guards therefore refuse any other level (SQLSTATE 25000; the smoke proves both guards at both levels) instead of failing open.
