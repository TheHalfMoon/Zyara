# N5/C4 Result — Audit-Chain Qualification

- Base SHA: `463cdc2827f9d232515cda3aed8ab00af786bdb4` (fresh `origin/main`; the N5/C3 merge).
- Branch: `feat/zyara-network-n5c4-audit-chain`.
- Implementation and evidence commit: `93f19fec78d8dab5d50013903a39696662248f0c`.
- Pull request: `#109` (`feat(network): add N5/C4 audit-chain qualification`).
- Exact qualified head: `93f19fec78d8dab5d50013903a39696662248f0c`.
- Merge SHA: `be032440a67634f588a8f7bc5ea7f857cb34d3fb`.

## Behavior delivered

C4 is a reader and a qualifier, never an authority. It adds no audit table, no second event
bus and no write path to any slice.

- **Twelve named chain steps** in a closed registry: initiator, identity, scope, authority,
  policy decision, human approval, typed action, external action, receipt, canonical outcome,
  derived activity, failure/retry.
- **Four declared profiles** (approval-driven, external-action-driven, exception-driven,
  task-only) state which steps a chain must be able to answer. A required step with no
  evidence is reported as a gap and makes the chain not reconstructable; a step outside the
  profile is explicitly `not_applicable` rather than a silent omission.
- **The profile cannot under-declare the evidence.** The implication of each source domain is
  derived from a closed map, and a weaker profile is refused
  (`AUDIT_CHAIN_PROFILE_UNDER_SPECIFIED`) with the profile the evidence actually requires.
  This closed a real defect the review's `completeness` signal pointed at.
- **Scope- and correlation-bound evidence.** Every entry declares the tenant and branch of the
  record it names. A foreign tenant, a foreign branch, a foreign correlation id, or a reader
  that attributes evidence to a source domain it does not own is refused instead of widening
  the chain.
- **No prose, no identifiers, no secrets.** A record reference, actor reference or outcome
  code must be a bounded token; prose, a direct identifier and credential material are
  refused. A source field that cannot satisfy the shape becomes `unknown` rather than a quoted
  payload, and a provider free-text status is reduced to a closed code.
- **Deterministic order and a reproducibility fingerprint.** Evidence is ordered by step,
  then time, then owning record, so reader order cannot change the result. The fingerprint is
  a digest over that ordered evidence and is explicitly documented as reproducibility, never
  as a signature, hash chain, Merkle proof or WORM evidence.
- **A closed, owned gap register** travels with every report so a reconstruction cannot be
  mistaken for a chain of custody.
- **A read-only reconstruction surface.** `audit_chain_entries` is one `security_invoker` view
  over the existing append-only trails, granted `SELECT` only, with no write path; row-level
  security of the querying role still applies through it.
- **Administrator-only HTTP surface.** Reconstruction is tenant-wide and `org_admin`-only at
  AAL2; a branch-scoped operator is refused rather than silently narrowed, and a clinical role
  alone is not audit authority. There is no write route.

## Gaps found in earlier slices

| Gap | Status | Disposition in this slice |
| --- | --- | --- |
| W2 coverage exceptions carried no correlation reference | closed by C4 | optional shape-checked column (`db/migrations/045_audit_chain.sql`), optional domain field, API passthrough |
| W4 verified inbound provider events carried no Zyara correlation reference | closed by C4 | deterministic boundary-minted reference (tenant + account + provider event key), stored in a new shape-checked column |
| W2 coverage routes passed an empty membership list, so every W2 write was denied by accident | closed by C4 | the route now uses the trusted membership registry used by the other workforce routes |
| W1 staff assignments, shifts and leave requests carry no correlation id | open | recorded; chains reference them by record reference |
| No durable outbox in this build | open | recorded |
| No cryptographic tamper-evidence | open | recorded explicitly; C4 claims none |
| No verified agent credential path | open | recorded |
| Approval metadata is operational-level activity, including critical-risk actions | open | recorded; needs a compliance-sensitivity class |

## Files changed

20 files, +3103 / -29 between the base and the merge.

| Area | Change |
| --- | --- |
| `packages/collaboration/src/audit-chain.ts` | new; step and profile registries, evidence validation, assembly, fingerprint, gap register |
| `packages/enterprise-access/src/coverage.ts` | additive optional correlation field |
| `packages/communication/src/whatsapp.ts` | additive optional receipt correlation reference and a tenant-wide receipt read |
| `apps/api/src/audit-chain.ts` | new; one reader per source domain, the read-only route, the fingerprint route |
| `apps/api/src/coverage.ts`, `whatsapp.ts`, `index.ts` | the W2 wiring fix, boundary correlation minting, route registration |
| `db/migrations/045_audit_chain.sql` | new; two additive columns with shape checks, the `security_invoker` view, `SELECT`-only grant |
| `apps/api/scripts/n5c4-audit-chain-rls-smoke.mjs`, `n5c4-audit-chain-http-smoke.ts` | new; real-PostgreSQL and authenticated HTTP smokes |
| `tests/n5c4/**` | new; 10 qualification cases |
| `.github/workflows/n5c4-ci.yml`, `pnpm-lock.yaml` | the slice CI and the additive importer |
| `docs/evidence/N5/C4/**` | this packet |

## Database migration

Additive and forward-only: two optional columns with explicit shape constraints, two partial
indexes, one read-only view and one grant. No existing column, constraint, row, policy or
grant was modified and no row was rewritten. Rollback is the commented footer.

## Tests, database smoke and HTTP smoke

- `tests/n5c4/audit-chain.test.ts` — 10 pass, 0 fail: full reconstruction with named evidence,
  absent versus not-applicable steps, foreign tenant and branch refusal, correlation and
  source-domain misattribution refusal, prose/identifier/credential refusal, fingerprint
  reproducibility and sensitivity, profile under-specification refusal, closed registries,
  the gap register's honesty, and the reader-only property.
- Regression: 77 pass, 0 fail across `tests/n5c4`, `tests/n5c3`, `tests/n5c2`, `tests/n5c1`,
  `tests/m020` and `tests/m056`; `tsc` clean for `packages/collaboration`,
  `packages/enterprise-access`, `packages/communication` and `apps/api`; `eslint` clean;
  `node scripts/check-boundaries.mjs` passed.
- Real PostgreSQL 16 smoke: both join columns accept a legitimate reference and refuse a
  secret-shaped or direct-identifier value (including that a minted digest with a long digit
  run is accepted for the receipt reference), the view returns one chain across six source
  domains in a single query, the view cannot be written (`55000`), the application role holds
  `SELECT` only on it, and row-level security still hides another tenant's chain through it.
- Authenticated HTTP smoke: a real chain is built through the public routes (W1 staff
  assignment and shift, W2 coverage exception, W3 task, C3 protected action approved and
  executed into an unknown outcome, linked C4-visible exception case, C2 derived activity) and
  reconstructed with every required step present and no missing step; the fingerprint route
  recomputes the same value; 401 without a session, 403 at AAL1, 403 for a branch-scoped
  operator, an empty reconstruction for a foreign tenant, 400 for an unknown profile and a
  secret-shaped correlation id, and 404 for a write attempt.

## Exact-head CI

Head `93f19fec78d8dab5d50013903a39696662248f0c`, observed live — all twelve applicable
workflows concluded `success`: `audit-chain` (N5/C4 CI, including the PostgreSQL and HTTP
smokes), `approvals-exceptions` (N5/C3), `derived-activity` (N5/C2), `agent-identities`
(N5/C1), `workforce` (W1), `coverage` (W2), `helpdesk` (W3), `whatsapp` (W4), `foundation`
(m001), `m002`, `m008`, `m016`.

## Post-merge verification

Fresh `origin/main` after the merge: `be032440a67634f588a8f7bc5ea7f857cb34d3fb`.

- post-merge workflows on the merge commit `be03244`: `foundation` (m001), `m002`, `m008` and
  `m016` (PostgreSQL service) all concluded `success`; the N5 workflows are branch/PR-bound by
  design and are recorded by their exact-head runs above;
- post-merge local re-verification on the merged tree: 77 synthetic cases pass, the C3 and C4
  authenticated HTTP smokes pass, and both database smokes pass in freshly created databases
  (`zyara_postmerge_c4`, `zyara_postmerge_c3`);
- open pull requests after the merge: `#94` only (preserved, unabsorbed).

## Review evidence

- **Jev (TypeSafe, CLI 0.3.2, model `jev-1.13.0`): executed.** One design challenge and three
  scoped exact-diff windows; the full record is in `JEV_REVIEW.md`.
- **Findings verified and fixed.** The review's `completeness` signal was triaged to a real
  defect — profile selection was caller-controlled, so a caller could have declared a weak
  chain complete — and fixed with derived evidence implications plus a
  `AUDIT_CHAIN_PROFILE_UNDER_SPECIFIED` refusal and a test.
- **Residual disclosed, not argued away.** The residual score stayed high (2.8–2.41) with
  `completeness` and `privacy` as the strongest picks. The concrete reasons are recorded: a
  reconstruction is only as complete as the wired readers and the in-process stores behind
  them (fail-closed, and carried as an open gap), and the chain reports operational metadata
  to a tenant-wide administrator by design.
- **alibaba/open-code-review: not executed.** Availability was re-probed live; the exact
  probes are in `OCR_REVIEW.md`. No OCR verdict is claimed.

## Negative evidence and residual limits

- no cryptographic immutability, no hash chain, no signature, no Merkle structure, no WORM
  storage: append-only means the application role holds no update or delete path, nothing more;
- the stores are in-process in this build, so a chain is reconstructable only for records that
  survived in the process or in the database tables;
- W1 administrative records have no correlation field;
- no verified agent credential path, so no agent-originated HTTP write is enabled;
- no payload, message body, contact, clinical field, receipt value or credential is exposed by
  the reconstruction;
- synthetic and local-database qualification only; no real clinic, provider, patient, payer or
  NPHIES interaction;
- no production readiness, security qualification, clinical authority or external validation
  is claimed.

## Completion semantics

`REPOSITORY_IMPLEMENTATION_COMPLETE` for this bounded slice: yes — merged into `main` as
`be032440a67634f588a8f7bc5ea7f857cb34d3fb` from qualified head `93f19fec…`.
`SYNTHETIC_QUALIFICATION_COMPLETE`: yes for this slice. All real-world fields remain
`FALSE`.

## Next authorized task

N5 closure (`docs/evidence/N5/N5_CLOSURE.md`), then `N6 — Zyara Connect`, starting with a
bounded media-engine qualification.

## Rollback

Additive only. Revert this branch's commits and run the documented footer in
`db/migrations/045_audit_chain.sql`, which drops the view and the two correlation columns
added by C4 without touching any pre-existing column, constraint or row.
