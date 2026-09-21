# N5/C1 Result — Bounded Agent Identities

- Base SHA: `34aa637048afef225adbdcc7fdd71f9558423a17` (fresh `origin/main`; the W4 merge from PR #102).
- Branch: `feat/zyara-network-n5c1-agent-identities`.
- Implementation commit: `bf64187053e7dca2cb415e1d04ac2fe37464d9d7`.
- Pull request: `#103` (`feat(network): add N5/C1 bounded agent identities`).
- Exact qualified head: `f7b61caa105a2b1605c9e33544313ce23ad375f7`.
- Merge SHA: `09b646262d3cf65a8a064740e8e588d9e336a808`.

## Post-merge verification

Fresh `origin/main` after the merge: `09b646262d3cf65a8a064740e8e588d9e336a808`.

Post-merge workflow conclusions observed live on that commit:

| Check | Conclusion |
| --- | --- |
| `foundation` (m001 CI) | pass |
| `m002` | pass |
| `m008` | pass |
| `m016` (PostgreSQL service) | pass |

The N5/C1 workflow is bound to its feature branch and to pull-request paths, so it
does not re-run on a main push by design; its exact-head runs are recorded above.

Post-merge local re-verification on the merged tree (`09b6462`):

- `tests/n5c1/agent-identity.test.ts` — 13 pass, 0 fail;
- regression: `tests/m020` (W4) — 21 pass, 0 fail; `tests/m056` (W1–W3) — 25 pass, 0 fail;
- `tsc` for `packages/collaboration` and `apps/api` — clean;
- `node scripts/check-boundaries.mjs` — passed;
- live PostgreSQL smokes, each in its own freshly created database so that fixtures
  cannot interfere (a shared database makes the W3 and W4 fixtures collide on
  `branch_locations`, which is a fixture artefact, not a defect):
  - `n5c1-agent-rls-smoke.mjs` — PASS;
  - `w3-task-rls-smoke.mjs` — PASS;
  - `w4-whatsapp-rls-smoke.mjs` — PASS.

Open pull requests after the merge: `#94` only (preserved, unabsorbed).

## Behavior delivered

- `AgentIdentityStore` with a bounded lifecycle: `active`, `suspended`, `revoked`,
  plus a derived `expired` state computed from `expiresAt` so a clock change can
  never leave a stale stored status;
- registration requires an idempotency-aware, cross-tenant-refusing create that
  names a **live human sponsor** resolved from the trusted server-side membership
  registry; an agent identity cannot sponsor another agent identity;
- the capability set is **closed**: `workforce.tasks.read`, `workforce.tasks.raise`,
  `workforce.tasks.comment`, `communications.outbound.propose`, `reporting.read`;
  clinical, encounter, prescription, refill, result, lab, referral, insurance,
  NPHIES, claim, payment, billing, appointment, scheduling, availability, hold,
  audit, identity, credential, secret, role, membership, filesystem, file, shell,
  process, network, HTTP, SQL, database, code, deploy and infrastructure
  namespaces are refused as non-delegable;
- `resolveAuthority` is the single deny-by-default decision point and denies
  unknown, cross-tenant, cross-branch, suspended, revoked, expired,
  not-yet-effective, ungranted and sponsor-less agents, emitting an audit record
  for both allow and deny;
- a branch-scoped identity is confined to its branch; a tenant-wide identity may
  act on any branch of its own tenant, matching the existing `authorize()`
  contract where the caller resolves the resource inside the tenant first;
- sponsor liveness and expiry are re-evaluated at action time, so an agent stops
  acting when its sponsor leaves, even before an administrator reacts;
- credential material is never stored: only an opaque `secret://` reference and a
  rotation timestamp move, so rotation cannot rewrite identity or event history;
- capability removal, suspension, reactivation and revocation all require a
  recorded reason; the lifecycle trail is append-only with server-generated ids;
- `agentTaskActor()` maps an agent onto the existing W3 `automation` actor kind,
  so agents may raise and comment on operational work but cannot resolve or
  cancel it, and no second authorization path is created;
- scoped Fastify routes deriving the tenant from verified claims with AAL2,
  org-admin-only authority changes and deny-by-default memberships;
- additive migration with tenant RLS, `FORCE ROW LEVEL SECURITY`, separate
  select/insert/update policies carrying `WITH CHECK`, a closed capability
  `CHECK`, a bounded-TTL `CHECK`, a recorded-revocation `CHECK`, an opaque
  credential-reference `CHECK`, and `SELECT, INSERT`-only grants on the trail.

## Evidence

Local qualification on `bf64187053e7dca2cb415e1d04ac2fe37464d9d7` (repository
`pnpm` 9.12.0 toolchain, Node 22). This environment's `pnpm` binary is a sandbox
shim, so the equivalent package scripts were executed directly against the
workspace toolchain; `pnpm install --frozen-lockfile` was additionally run to
confirm lockfile parity:

- `tsc -p packages/collaboration/tsconfig.json --noEmit` — clean;
- `tsc -p apps/api/tsconfig.json --noEmit` — clean;
- `tests/n5c1/agent-identity.test.ts` — 13 pass, 0 fail;
- regression: `tests/m020` (W4) — 21 pass, 0 fail; `tests/m056` (W1–W3) — 25 pass, 0 fail;
- `eslint` on `packages/collaboration/src`, `apps/api/src`, `tests/n5c1` — clean;
- `node scripts/check-boundaries.mjs` — passed;
- `pnpm install --frozen-lockfile` — up to date; the `pnpm-lock.yaml` delta is
  purely additive (two new importers and one new dependency edge).

Real database qualification (PostgreSQL 16, `DATABASE_URL` set, run as the
non-superuser `zyara_app` role):

- `node apps/api/scripts/n5c1-agent-rls-smoke.mjs` —
  `N5/C1 agent identity DB smoke PASS: RLS, branch integrity, bounded authority,
  closed capability set, secret-free descriptors and append-only trail verified`.
  The smoke proves, against a live database: a cross-tenant branch reference is
  refused (23503); a lifetime beyond the maximum bounded TTL is refused (23514);
  an inverted authority window is refused (23514); a raw credential value does
  not satisfy the credential-reference shape (23514); revocation without a
  timestamp and reason is refused (23514); a clinical capability cannot be
  persisted (23514); a capability action without a capability is refused (23514);
  duplicate agent idempotency keys are refused (23505); the trail is append-only
  for the application role (42501 on `UPDATE` and `DELETE`); a financial
  capability cannot be persisted even by the application role (23514);
  cross-tenant inserts are refused by the RLS `WITH CHECK` (42501); tenant read
  isolation holds; no secret-bearing column exists; and the application role's
  privileges on the trail are exactly `SELECT, INSERT`.

CI on exact head `bf64187053e7dca2cb415e1d04ac2fe37464d9d7` (observed live):

| Check | Conclusion | Run |
| --- | --- | --- |
| `agent-identities` (N5/C1 CI, includes the PostgreSQL 16 database smoke) | pass | `35627814098` (push), `35627844610` (pull request) |
| `foundation` (m001 CI) | pass | `35627813761`, `35627844599` |
| `m002` | pass | `35627844423` |
| `m008` | pass | `35627844347` |
| `m016` (booking smoke, PostgreSQL service) | pass | `35627844407` |
| `workforce` (W1 CI) | pass | `35627844565` |
| `coverage` (W2 CI) | pass | `35627844541` |
| `helpdesk` (W3 CI) | pass | `35627844361` |
| `whatsapp` (W4 CI) | pass | `35627844561` |
| `cubic · AI code reviewer` | neutral (completed, no verdict) | n/a |

Pull request merge state on that head: `MERGEABLE` / `CLEAN`, base
`34aa6370`. This evidence file was additionally added after those runs; the same
pull request re-runs the required workflows on the updated head and their
conclusions are visible on `#103`.

## Review evidence actually produced

- **Jev**: not executed. The CLI cannot start in this environment (no usable
  Python interpreter; `uv` trampolines fail) and no `TYPESAFE_API_KEY` or
  `OPENROUTER_API_KEY` is present. See `JEV_REVIEW.md`.
- **alibaba/open-code-review**: not executed. The tool is not installed in this
  environment. See `OCR_REVIEW.md`.
- Compensating discipline: a pre-implementation threat list, one synthetic test
  per threat, negative cases for each denial code, a live PostgreSQL role-level
  smoke, and a manual diff review of every changed file.

No third-party automated review verdict is claimed for this slice.

## Negative evidence and residual limits

- synthetic and local-database qualification only: no real clinic, provider,
  patient or PHI data, and no production identity provider or secret manager;
- **no agent credential verification path exists** (no service token, mTLS or
  workload identity), so no route lets an agent authenticate and no
  agent-originated API write is enabled; W3 automation writes stay refused at the
  API boundary, and the agent path is exercised at the domain layer;
- no HTTP-level route test harness exists in this repository, so the route
  contract is guarded by source-level assertions plus the database smoke rather
  than by an end-to-end request test;
- no independent deterministic code review was performed (see the Jev/OCR notes);
- no agent conversation surface, no unified inbox, no agent-authored clinical or
  patient content, and no Nostr/Buzz transport, relay or key material;
- C2 (derived human + agent activity), C3 (approvals / human exception queue) and
  C4 (audit-chain qualification) remain unbuilt; agent identity is a prerequisite
  for them, not a substitute;
- no production authorization, credential provisioning or real-provider
  validation is claimed.

## Rollback

Additive only: no existing table, route, package export or workflow was modified
except two additive imports, one additive workspace dependency and one additive
lockfile edge. Rollback is the documented
`DROP TABLE IF EXISTS agent_identity_events, agent_identities;` footer in
`db/migrations/042_agent_identities.sql`, plus reverting this branch's commits. No
data migration or backfill is involved.
