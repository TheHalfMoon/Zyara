# Zyara Work / Knowledge / Data Plane — Final Hardening Addendum

**Date:** 2026-09-29  
**Planning base:** `56eb66d8b828b4d9412047c1cd64dec0c64b7d76`  
**Authority:** co-authoritative with `docs/canonical/ZYARA_WORK_KNOWLEDGE_DATA_PLANE_PLAN_2026-09-29.md`

This addendum records the final adversarial gap pass after the 204-dimension base checklist. It does not widen product authority. It tightens liveness, data governance, connector integrity, extension isolation, and analytics privacy.

## H01 — Work dependency cycle / deadlock

Work-item blocker edges must be acyclic or explicitly represent a separately modeled external wait.

Required:

- reject a new blocker edge that creates a cycle;
- detect legacy/cross-workflow deadlock candidates;
- surface deadlock to an owned exception queue;
- do not auto-delete blocker edges to make work appear healthy;
- parent/child structure remains independent from blockers.

## H02 — Scheduler fairness and backpressure

Agent/routine dispatch needs explicit fairness and pressure controls:

- per-tenant concurrency;
- per-branch concurrency where useful;
- per-provider/model concurrency;
- per-capability limits;
- bounded queue age;
- priority classes with anti-starvation aging;
- no high-volume tenant can starve another tenant;
- no routine flood can starve human-approved urgent work;
- overload creates visible delayed/backpressured state, not silent dropping.

## H03 — Interaction liveness

Pending questions/approvals/permissions need liveness semantics:

- owner/addressee;
- due/expiry;
- reminder/escalation policy;
- terminal handling when the work item closes;
- no infinite pending state without owner;
- stale interaction cannot keep a terminal work item alive.

## H04 — External callback actor binding

Opaque action tokens are necessary but not sufficient.

Where a channel supplies a verified actor identity, settlement must also validate:

- expected addressee/allowed responder;
- channel/account binding;
- interaction current state;
- expiry;
- nonce/token replay status.

Channels that cannot provide sufficient responder identity may render status/questions but must not settle protected approvals.

## H05 — Provider health probe safety

Readiness/health probes must be:

- bounded by short timeout;
- rate-limited/cached;
- free of PHI;
- free of raw-secret logging;
- non-mutating unless the provider has an explicitly documented safe probe action;
- isolated from production model/task accounting where possible;
- circuit-breaker aware.

Health probing must not cause cost storms or provider rate-limit exhaustion.

## H06 — Capability-inventory disclosure

A capability inventory can itself reveal sensitive deployment/integration facts.

Return only what the caller is authorized to know:

- ordinary users see usable product capabilities;
- operators see health needed for their scope;
- security/admin roles see provider/module details;
- credential names, internal hosts, secret refs, and hidden integrations are not broadly disclosed.

## H07 — Connector schema drift

External connector sync must detect structural/source-contract changes.

On incompatible schema/resource changes:

- quarantine affected new data;
- preserve last known-good projection with explicit freshness state where policy permits;
- do not coerce unknown fields into authoritative facts;
- alert an owner;
- require versioned mapping update and replay/backfill plan.

## H08 — Source ACL drift

Permission-first retrieval is continuous, not ingestion-time only.

- re-evaluate current subject/source ACL before disclosure;
- group/role membership changes invalidate cached authorization;
- source permission revocation removes future retrieval eligibility;
- projections/indexes carry enough source identity to apply current ACL;
- caches may not extend access beyond current source authority.

## H09 — Sync transaction boundary

For connector pagination/incremental sync, define a durable boundary between:

- fetched source page/batch;
- validated mutations;
- projection/index work;
- committed cursor/checkpoint.

A crash cannot advance a cursor past uncommitted authoritative/projection state without a defined replay/reconciliation rule.

## H10 — Metric definition registry

Analytics requires versioned semantic definitions, not ad-hoc SQL labels.

`MetricDefinition` is an installation-scoped semantic definition and holds no tenant data; every evaluation of a metric runs under the requesting principal's `tenant_id` and branch scope through the curated data gateway. Every `MetricDefinition` binds:

```text
metric_id
version
label/description
numerator
denominator
dimensions
filters/data source
missingness semantics
suppression policy
time semantics
freshness/source refs
owner
```

Historical reports retain the exact metric version.

## H11 — Snapshot / as-of semantics

Every analytics result includes:

- query/metric version;
- data observed-through / `as_of` time;
- source freshness;
- snapshot/transaction identity where available;
- incomplete/late-source flags.

Never compare two periods as equivalent if data completeness differs materially without disclosure.

## H12 — Row-level AI result policy

AI-facing analytics should prefer aggregate outputs.

Row-level PHI/PII results require a separate explicit data grant and task need. A model cannot request row-level expansion merely because an aggregate answer is insufficient.

## H13 — Small-cell / re-identification suppression

Curated analytics must support dataset-specific privacy controls such as:

- minimum cohort/cell size;
- complementary suppression where required;
- coarse time/geography;
- rare-category merging;
- export restrictions;
- repeated-query differencing protection where material.

The exact method is dataset/purpose-specific; do not claim one threshold protects all healthcare analytics.

## H14 — Query/result cache isolation

Any analytics query/result cache must bind:

- tenant;
- branch/dataset scope;
- DataAccessGrant or equivalent policy generation;
- metric/query version;
- data snapshot/freshness;
- expiry.

Grant revocation or relevant policy/data-version change invalidates future cache reuse.

## H15 — Export safety

Exports require independent controls:

- authorization at export time;
- purpose and dataset scope;
- row/cell/privacy rules;
- audit receipt;
- bounded size;
- safe file name/content type;
- CSV/spreadsheet formula-injection neutralization;
- no hidden metadata containing disallowed identifiers;
- retention/expiry for generated files;
- signed/authenticated download where private.

## H16 — Analytics import staging

If a future Data Workspace imports CSV/TSV/JSON/Excel for analytics/research:

- upload to quarantine;
- malware/type/size checks;
- encoding/locale/type inference is preview-only;
- mapping is explicit;
- source/provenance retained;
- no direct writes into operational patient-care tables;
- formula/macro content is not executed;
- import errors are row-addressable;
- commit is atomic/idempotent or has an explicit partial-import model.

This is a later capability; it is not required for WKD-01A.

## H17 — External BI boundary

Superset/Metabase/other BI adapters, if used, receive:

- approved analytical views only;
- dedicated credentials/service identity;
- tenant/organization scope;
- row/column/privacy controls;
- query/runtime limits;
- audited export/sharing;
- no credential path to unrestricted transactional schemas.

## H18 — Privileged SQL extra defenses

If WKD-08B is ever admitted:

- prefer a physically/logically isolated analytics replica;
- deny `SECURITY DEFINER`/unsafe function paths by role policy;
- control `search_path` and extension access;
- deny file/network/server-program primitives;
- no `EXPLAIN ANALYZE` or equivalent if it can execute an untrusted expensive query;
- enforce server-side read-only transaction and statement timeout;
- terminate orphaned queries;
- do not rely only on text parsing.

## H19 — Sidecar egress/filesystem policy

Because a native sidecar runs with OS-user privileges unless separately sandboxed, admission must declare:

- filesystem roots;
- network egress allowlist;
- process-launch policy;
- environment-variable policy;
- device access;
- local secret access path;
- resource limits.

A plugin manifest declaration is not an OS sandbox.

## H20 — Plugin UI isolation

Optional plugin UI must be isolated from the host application:

- restrictive CSP;
- no ambient host DOM/token/session access;
- explicit postMessage/RPC schema if used;
- origin/source validation;
- bounded asset/package URLs;
- no arbitrary navigation/top-frame takeover;
- theme/locale APIs expose no secrets;
- untrusted HTML rendered safely.

## H21 — Module/API compatibility and rolling upgrade

Every module/sidecar protocol and persisted descriptor has a compatibility version.

Upgrade rules:

- older compatible clients/runtimes remain readable during rolling upgrade where supported;
- incompatible module version stays disabled rather than guessed;
- database migration order is explicit;
- rollback limits after irreversible migrations are documented;
- historical receipts resolve old module/capability versions.

## H22 — PlanGraph PHI minimization

A `PlanGraph` should carry opaque refs/digests where possible instead of copying raw patient text or documents into every node.

- plan storage has its own data classification/retention;
- prompt/plan observability is PHI-light;
- planner input is minimized;
- node outputs passed to downstream nodes are typed/minimized;
- plan visualization does not expose unauthorized patient data.

## H23 — Skill supply-chain integrity

`SkillBundle` admission also requires:

- exact source revision;
- digest/signature where distributed;
- prompt/instruction files enumerated;
- dependency/tool requirements;
- evaluation bundle;
- owner;
- rollback/revocation;
- no runtime self-rewrite of admitted files.

## H24 — Work-product file safety

File-bearing WorkProducts inherit document controls:

- type/size allowlist;
- malware scanning/quarantine;
- metadata stripping policy where needed;
- content provenance/digest;
- signed private access;
- no automatic execution of embedded active content;
- no automatic promotion to clinical record.

## H25 — Cost accounting provenance

Cost records include:

- provider/model/capability;
- usage unit;
- price-card/version or measured cost source;
- currency;
- observed time;
- estimated-vs-billed state.

A stale price estimate must not be presented as reconciled financial truth.

## H26 — Data residency and connector locality

Each provider/module/connector records processing/storage region where knowable and relevant.

A fallback/sync route cannot silently change:

- region;
- subprocessor;
- retention;
- training/data-use policy;
- local-only requirement.

## H27 — Restore/replay closure

Backups/restore must preserve or safely reconstruct:

- module/provider registry versions;
- work-item dependencies;
- interactions/settlement;
- routine trigger identities;
- data grants;
- connector cursors/tombstones;
- metric definitions;
- plan/operation/receipt lineage.

After restore, new dispatch remains blocked until reconciliation determines which external side effects may already have occurred.

## H28 — Observability cardinality / PHI guard

Metrics/traces/logs must not put patient ids, raw queries, prompts, document text, external callback tokens, credentials, or arbitrary high-cardinality payloads into metric labels/tags.

Use opaque correlation ids and approved dimensions, with controlled drill-down through authorized evidence stores.

## Hardening readiness matrix

| # | Hardening dimension | State |
|---:|---|---|
| 205 | Work blocker cycle/deadlock handling | COVERED |
| 206 | Scheduler fairness/backpressure/anti-starvation | COVERED |
| 207 | Interaction owner/SLA/expiry liveness | COVERED |
| 208 | External callback responder binding | COVERED |
| 209 | Bounded non-mutating provider health probes | COVERED |
| 210 | Capability inventory disclosure minimization | COVERED |
| 211 | Connector schema-drift quarantine | COVERED |
| 212 | Continuous source ACL re-evaluation | COVERED |
| 213 | Connector cursor/commit transaction boundary | COVERED |
| 214 | Versioned MetricDefinition semantics | COVERED |
| 215 | Analytics snapshot/as-of/freshness | COVERED |
| 216 | Row-level AI result policy | COVERED |
| 217 | Small-cell/re-identification suppression | COVERED |
| 218 | Query/result cache tenant/policy isolation | COVERED |
| 219 | Safe/audited export including formula injection | COVERED |
| 220 | Staged analytics import/no operational writes | COVERED |
| 221 | External BI approved-view boundary | COVERED |
| 222 | Privileged SQL function/network/search-path defenses | COVERED |
| 223 | Sidecar egress/filesystem/process policy | COVERED |
| 224 | Plugin UI CSP/origin isolation | COVERED |
| 225 | Module/protocol rolling compatibility | COVERED |
| 226 | PlanGraph PHI minimization | COVERED |
| 227 | Skill supply-chain integrity | COVERED |
| 228 | Work-product file quarantine | COVERED |
| 229 | Cost accounting price/currency provenance | COVERED |
| 230 | Data residency / connector locality | COVERED |
| 231 | Restore/replay reconciliation | COVERED |
| 232 | Observability cardinality/PHI guard | COVERED |

## Final verdict

The base checklist plus this hardening pass covers **232 planning dimensions**.

No currently known architecture gap blocks bounded implementation of the declared first leaves. External credentials, production PHI authority, real connector rights, real users, legal/privacy approval, and clinical governance remain external evidence gates and are not converted into repository success.

`ZYARA_WORK_KNOWLEDGE_DATA_FINAL_GAP_REVIEW = PASS_FOR_BOUNDED_IMPLEMENTATION`
