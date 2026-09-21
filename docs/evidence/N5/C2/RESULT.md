# N5/C2 Result — Derived Human + Agent Activity

- Base SHA: `01bb1da071429f7ab2f8f7e843fa67531327ff81` (fresh `origin/main`; the N5/C1 post-merge closure, PR #104).
- Branch: `feat/zyara-network-n5c2-activity-derived`.
- Implementation commit: `4b3b4295621c71e438c389d1932ac03bd20aa562`.
- Review/tests commit: `7481ed4b8af7df5397e2cd506add76544b879d2f`.
- Pull request: `#105` (`feat(network): add N5/C2 derived human and agent activity`).
- Merge SHA: recorded in the post-merge evidence update.

Live truth was reverified before starting: `origin/main` was `01bb1da0…`, the only open
pull request was `#94` (`ui/zyara-v1-patient-experience`, failing `m012`, preserved and
intentionally separate), and the master plan still listed `C2 activity-derived` as the
next dependency-authorized slice after C1.

## Behavior delivered

Activity is a derived projection, never authority.

- **Closed registries.** Actor kind (`human`/`agent`/`system`/`external`), source domain
  (`workforce.tasks`, `identity.agents`, `communications.whatsapp`), category, action,
  result, subject type, sensitivity class and visibility scope are closed enumerations
  enforced both in `packages/collaboration` and as database `CHECK` constraints. An
  unknown source domain or an unsupported actor type is refused rather than stored.
- **Explicit actor typing.** A `human` actor resolves to a server-authoritative account
  id; an `agent` actor resolves to a bounded C1 `agent_identities` row (and is a composite
  foreign key at the storage layer); `system` and `external` actors carry a namespaced
  reference. A free-text actor name cannot satisfy the model.
- **Stale authority cannot be implied.** The agent's authority state is recorded at
  projection time, and `impliesCurrentAgentAuthority()` re-reads the live registry, so a
  revoked, suspended, expired or sponsor-less agent never reads as a live grant. Revoked
  history stays readable.
- **References are minted, never accepted.** The projector derives every stored reference
  as a deterministic tenant-scoped pseudonym, so a caller-supplied identifier is never
  written verbatim. Source-owned metadata must satisfy a reference shape that excludes
  whitespace, `@`, `+` and long digit runs, in addition to credential patterns.
- **No prose exists in a record.** A record holds closed codes, opaque references, small
  integers and timestamps. Readable titles are derived from the enumerations at read time,
  so a feed title can never carry patient text.
- **Minimised payload.** The payload is a flat JSON object drawn from a closed key
  allow-list with per-key closed vocabularies and bounded integers; the database enforces
  the same shape, size bound and secret refusal.
- **Deterministic replay.** Uniqueness on `(tenant, source domain, source event id,
  projection version)` plus a content fingerprint makes a replay idempotent (including
  interleaved delivery) and a divergent replay an explicit conflict.
- **Append-only history.** Corrections append a superseding record; the application role
  holds `SELECT, INSERT` only, so no update or delete path exists for it.
- **Derivation, not a second bus.** W3 task events, C1 identity events and W4 verified
  webhook receipts are projected on the server-side call path immediately after the
  authoritative operation. A projection failure is recorded in
  `activityProjectionFailures` and never fails or rolls back the authoritative operation.
- **No public write route.** A client-declared "authoritative event" would fabricate
  source-domain authority, so only read routes are registered.
- **Separation of sensitivity and visibility.** Operations readers receive `operational`
  activity only; `restricted` activity requires an explicit clinical role resolved from
  the trusted membership registry and is refused, not downgraded, for an operations
  administrator.

## Files changed

28 files, +3922 / -33.

| Area | Change |
| --- | --- |
| `packages/collaboration/src/activity.ts` | new; 827 lines: registries, projector, store, read gate, pseudonyms |
| `packages/collaboration/src/index.ts` | additive export |
| `db/migrations/043_activity_events.sql` | new; 176 lines: table, closed registries, reference shape, RLS, grants |
| `apps/api/src/activity.ts` | new; 395 lines: read routes, source projections, audience derivation |
| `apps/api/src/tasks.ts`, `agents.ts`, `whatsapp.ts` | additive projection calls only |
| `apps/api/src/index.ts` | additive route registration |
| `apps/api/scripts/n5c2-activity-rls-smoke.mjs` | new; real-PostgreSQL smoke |
| `apps/api/scripts/n5c2-activity-http-smoke.ts` | new; reusable authenticated Fastify `inject()` harness |
| `tests/n5c2/**` | new; 14 qualification cases |
| `.github/workflows/n5c2-ci.yml` | new; the slice CI |
| `pnpm-lock.yaml` | additive importer for `tests/n5c2` |
| `docs/evidence/N5/C2/**` | this packet |

## Database migration

`db/migrations/043_activity_events.sql` is additive: one new table, one unique dedupe
index and four lookup indexes. No existing table, column, policy, grant or route was
modified. Rollback is the commented `DROP TABLE IF EXISTS activity_events;` footer plus
reverting this branch. The smoke owns only this table and recreates it from the migration
so the run is repeatable.

## Tests

Synthetic qualification on the repository toolchain (Node 24.19.0 in this environment;
CI pins Node 22.12.0):

- `tests/n5c2/activity.test.ts` — 14 pass, 0 fail.
  Covers all fifteen required behaviours plus: interleaved-delivery determinism,
  reference minting versus a direct identifier, source/action mismatch, unknown agent
  identity, superseded-record immutability, payload vocabulary closure and the static
  assertion that the domain module has no handle to any domain store.
- Regression: `tests/n5c1` — 13 pass; `tests/m020` (W4) — 21 pass; `tests/m056` (W1–W3) —
  25 pass.
- `tsc -p packages/collaboration/tsconfig.json --noEmit` — clean;
  `tsc -p apps/api/tsconfig.json --noEmit` — clean.
- `eslint packages/collaboration/src`, `eslint apps/api/src`, `eslint tests/n5c2` — clean.
- `node scripts/check-boundaries.mjs` — passed.

This environment's `pnpm` is a runtime shim (pnpm 11 against a lockfile pinned to 9.12.0),
so the equivalent package scripts were executed directly against the workspace toolchain;
CI runs the real `pnpm` 9.12.0 path.

## Real PostgreSQL smoke

PostgreSQL 16 (local Docker) and the CI `postgres:16` service, `DATABASE_URL` set. The
application-role section runs under `SET ROLE zyara_app`, not only as the owner.

`node apps/api/scripts/n5c2-activity-rls-smoke.mjs`:

> N5/C2 activity DB smoke PASS: tenant isolation, closed registries, identifier-refusing
> references, secret-free metadata, payload minimisation, deterministic deduplication,
> agent attribution and an append-only trail verified

The smoke proves, against a live database: cross-tenant insert refused by the RLS
`WITH CHECK` (42501); a source domain, category, action, actor kind, payload key, payload
vocabulary, sensitivity or visibility value outside its registry refused (23514); a
nested, prose, over-long or credential-shaped payload refused (23514); an unminted actor
reference and prose or credential-shaped metadata refused (23514); a long digit run
refused (23514); a human actor carrying an agent reference and an agent record without a
resolved authority state refused (23514); an agent reference to a non-existent identity
refused (23503); a replayed canonical event refused by the unique dedupe index (23505);
`UPDATE`/`DELETE` refused for the application role (42501); tenant read isolation holds;
the application role's privileges are exactly `SELECT, INSERT`; no secret-bearing column
exists; and no stored row contains prose.

Smoke isolation was verified rather than assumed. Each of the four database smokes was
run in its own freshly created database, and all four passed:
`n5c2-activity` (fresh), `n5c1-agent` (fresh), `w3-task` (fresh), `w4-whatsapp` (fresh).
In a shared database the W3 smoke collides on the `branch_locations` fixture whenever an
earlier smoke seeded branch `b2` under a different organization — the same pre-existing
fixture artefact recorded in the N5/C1 result and reproducible by running W4 before W3,
with no C2 involvement. C2's own rows are created and removed inside its smoke, so C2
does not add a new interference class: `n5c2 → n5c1` and `n5c2 → w4` both pass in a shared
database.

## HTTP route harness

`apps/api/scripts/n5c2-activity-http-smoke.ts` closes the reusable-harness gap this
repository has repeatedly recorded. It is `buildServer()` plus Fastify `inject()` with
real synthetic OIDC bearer tokens and server-side memberships, and it exercises W3, C1,
W4 and C2 end to end:

> N5/C2 activity HTTP smoke passed.

It proves over HTTP: no read without a verified session (401) and none at AAL1 (403); no
public activity write route (404); a W3 task operation derives a readable feed row with
the expected source event, correlation id, derived title and payload; a cross-branch
operator is refused (403); a branch operator cannot list tenant-wide (403); a
foreign-tenant operator sees an empty feed and a 404 by direct id; an operations
administrator cannot obtain restricted activity (403 `ACTIVITY_RESTRICTED_DENIED`) while
a clinician can (200); malformed filters are refused (400); a verified W4 webhook derives
exactly one communication row containing no phone number or contact name; a replayed
provider event adds no second row; C1 agent identity and capability events are derived
with human attribution and a derived title; and `activityProjectionFailures` is empty.

## Exact-head CI

Head `7481ed4b8af7df5397e2cd506add76544b879d2f`, observed live:

| Check | Conclusion | Run |
| --- | --- | --- |
| `derived-activity` (N5/C2 CI, includes the PostgreSQL smoke and the HTTP smoke) | pass | `35637009527` (pull request), `35636981973` (push) |
| `agent-identities` (N5/C1 CI) | pass | `35637009417` |
| `workforce` (W1 CI) | pass | `35637009603` |
| `coverage` (W2 CI) | pass | `35637009354` |
| `helpdesk` (W3 CI) | pass | `35637009439` |
| `whatsapp` (W4 CI) | pass | `35637009667` |
| `foundation` (m001 CI) | pass | `35637009486`, `35636982049` |
| `m002` | pass | `35637009609` |
| `m008` | pass | `35637009441` |
| `m016` (booking smoke, PostgreSQL service) | pass | `35637009468` |
| `CodeRabbit` | pass (review skipped: manual review required for this OSS repository) | n/a |
| `cubic · AI code reviewer` | skipping (no verdict) | n/a |

## Review evidence actually produced

- **Jev (TypeSafe, `jev-1.13.0`): executed.** The environment was re-evaluated rather than
  assumed from the C1 packet: the Jev CLI ships with the skill and runs under the bundled
  Python 3.12.14 runtime, and `TYPESAFE_API_KEY` is present. Three design rounds, a
  targeted privacy triage, four scoped exact-diff runs and a test-gap triage were run
  with the exact specs preserved in `jev/`. Verdicts, including the one finding that
  changed the design and the residual that remains disclosed, are in `JEV_REVIEW.md`.
  Overall residual scores: database contract 1.48 (low), API boundary 1.20 (low,
  confidence 0.78), domain module 1.68 (low/moderate, confidence 0.50).
- **Findings fixed.** The design review raised one finding (privacy controls `no 0.35`),
  triaged it to caller-supplied references (`residual_vector 0.66`,
  `no_direct_identifier no 0.15`), and the design was changed to mint references; the
  re-challenge passed at `0.64` and `0.92`. The test review then flagged interleaved
  delivery as the most material missing assertion; it was added, and the pick moved from
  `0.40` to `0.15`.
- **Deferred / disclosed findings.** Metadata inference remains (a stable pseudonym
  correlates events inside a tenant, and an operations reader learns that a non-clinical
  event occurred): `residual_vector metadata_inference 0.99`, accepted and disclosed, not
  closed. `db_reference_shape 0.65` is the weakest passing verdict and is recorded as
  such. The final test-gap pick is the diffuse `other` bucket at confidence 0.34.
- **alibaba/open-code-review: not executed.** The tool is not installed and neither `npm`
  nor `npx` is available in this runtime, so it could not be fetched or invoked. See
  `OCR_REVIEW.md`. No OCR verdict is claimed.

## Negative evidence and residual limits

- **No agent credential verification path exists.** There is still no service token,
  mTLS, SPIFFE/SPIRE or workload identity, so no route lets an agent authenticate and no
  agent-originated HTTP write is enabled. Agent attribution is exercised at the domain
  and projection layers against the C1 registry, not through a verified agent caller.
- **Synthetic and local-database qualification only.** No real clinic, provider, patient
  or PHI data; no production identity provider, secret manager, queue or broker.
- **The stores are in-process.** W3, C1, W4 and C2 use in-memory stores in this build, so
  the projection path was not exercised against a durable event outbox. The database
  contract, RLS behavior and append-only grants are proven against real PostgreSQL.
- **No public write route is a deliberate limitation, not a gap:** a bounded internal
  projection API for a future durable consumer is not defined here.
- **Clinical content is not representable.** The closed source registry admits no
  clinical domain in this slice, so `restricted` sensitivity exists in the model and its
  gate is proven, but no clinical projection source is wired.
- **No search.** Activity is not indexed; a later slice owns search and must search only
  the derived projection.
- **No C3/C4.** Approvals, the human exception queue and audit-chain qualification remain
  unbuilt; C2 is a prerequisite for them, not a substitute.
- **No cryptographic immutability claim.** Append-only is enforced by revoked privileges
  and forced RLS, which is not the same as tamper-evidence; C4 owns that question.
- **No production readiness, security qualification, clinical authority or external
  validation is claimed.**

## Completion semantics

`REPOSITORY_IMPLEMENTATION_COMPLETE` for this bounded slice: after merge.
`SYNTHETIC_QUALIFICATION_COMPLETE`: yes for this slice.
`REAL_CLINIC_VALIDATION_COMPLETE`, `REAL_PROVIDER_VALIDATION_COMPLETE`,
`REAL_NPHIES_VALIDATION_COMPLETE`, `COMMERCIAL_VALIDATION_COMPLETE`,
`PRODUCTION_AUTHORIZED` and `ZYARA_PROJECT_COMPLETE`: not claimed.

## Rollback

Additive only. Revert this branch's commits and run the documented
`DROP TABLE IF EXISTS activity_events;` footer. The four additive call sites in
`apps/api/src/tasks.ts`, `agents.ts` and `whatsapp.ts` revert with the branch. No data
migration or backfill is involved.
