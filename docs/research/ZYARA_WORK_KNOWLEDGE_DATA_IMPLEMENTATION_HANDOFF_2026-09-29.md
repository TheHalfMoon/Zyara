# Zyara Work / Knowledge / Data Plane — Implementation Handoff

**Date:** 2026-09-29  
**Planning base:** `56eb66d8b828b4d9412047c1cd64dec0c64b7d76`  
**Authority:** `docs/canonical/ZYARA_WORK_KNOWLEDGE_DATA_PLANE_PLAN_2026-09-29.md`

This handoff is implementation-ready but does not authorize a big-bang merge.

## 1. Execution discipline

Before every WKD leaf:

1. reverify live `main` and open PRs;
2. inspect current AIF/N5/W3 migrations and packages;
3. branch from exact main;
4. reconcile exact source paths if copying/adapting donor code;
5. keep scope bounded;
6. run Jev where available as independent challenge/qualification;
7. run Alibaba Open Code Review where available for code review/accounting;
8. do not use CodeRabbit/Qodo/Cubic as qualification evidence;
9. run targeted tests plus real PostgreSQL smoke where persistence/RLS is involved;
10. exact-head CI before merge;
11. normal merge commit;
12. reverify fresh main and post-merge gates;
13. continue only to dependency-authorized next leaf.

PR #94 remains separate unless explicitly reconciled.

## 2. Program dependency graph

```text
AIF-01A Capability Contract
   |
   +--> AIF-01B Registry/Resolver
            |
            +--> WKD-01A Module Descriptor
            |       |
            |       +--> WKD-01B Provider Readiness
            |       |       |
            |       |       +--> WKD-02A PlanGraph Schema/Validator
            |       |               |
            |       |               +--> WKD-02B Plan Compiler
            |       |                       |
            |       |                       +--> WKD-03 Work/Liveness
            |       |                               |
            |       |                               +--> WKD-04 Durable Interactions
            |       |                               +--> WKD-05 Routines/Budgets
            |       |
AIF-02 Privacy/Egress + Secrets
            |       +--> WKD-06 Knowledge/Connector Binding
            |
            +--> WKD-07 Curated Data Gateway
                      |
                      +--> WKD-08 Human Data Workspace

AIF-06 Local Bridge + WKD-01A
            +--> WKD-09 Sidecar/Plugin Integrity

WKD-02..09
            +--> WKD-10 Action Center + Whole-Plane Qualification
```

Additional required AIF prerequisite edges (canonical plan §28); a WKD slice may not start until each listed AIF package is qualified:

```text
AIF-03A Model + Prompt Registry             --> WKD-01B Provider Readiness
AIF-02  Privacy/Egress + Secrets            --> WKD-02B Plan Compiler
AIF-04B Context Builder + Tool Translation  --> WKD-02B Plan Compiler
AIF-04A Durable Session + Input Substrate   --> WKD-03 Work/Liveness
AIF-04C Operation Manager + Recovery        --> WKD-03 Work/Liveness
AIF-03D Permission-first Retrieval / RAG    --> WKD-06 Knowledge/Connector Binding
AIF-08  Operations Insights                 --> WKD-07 Curated Data Gateway
AIF-02  Privacy/Egress + Secrets            --> WKD-09 Sidecar/Plugin Integrity
AIF-07  Action Center                       --> WKD-10 Action Center + Whole-Plane Qualification
```

The overall AIF first leaf remains `AIF-01A`.

## 3. WKD-01A — Integration module descriptor

### Scope

Create Zyara-native contracts only:

- `IntegrationModuleDescriptor`;
- `ModuleHealthState`;
- `ModuleAdmissionState`;
- stable module id/version/digest;
- configured-by refs;
- capability ids;
- route/service ids;
- data classes;
- egress hosts;
- credential binding kinds;
- sidecar declaration;
- health probe declaration;
- license/NOTICE refs.

### Invariants

- module declaration != caller permission;
- duplicate module ids rejected;
- descriptor construction has no remote side effect;
- `configured` and `health` are separate;
- disabled/revoked module cannot serve new capability resolution;
- historical receipts remain interpretable;
- no raw secrets in descriptors.

### Tests

- duplicate id/version conflict;
- digest mismatch;
- disabled module capability resolution denied;
- configured=false but health unknown;
- configured=true but health degraded;
- route/capability projection consistent;
- descriptor cannot declare unknown data class/authority class;
- tenant-specific enablement cannot alter global descriptor identity.

### Exit

`WKD_01A_MODULE_DESCRIPTOR_QUALIFIED = TRUE`

## 4. WKD-01B — Provider readiness snapshot

### Scope

Add:

- `ProviderReadinessSnapshot`;
- health TTL/staleness;
- explicit invalidation after provider/model config change;
- local model artifact presence state;
- capability projection;
- read-only readiness endpoint/service.

### Rules

- read path never repairs/writes provider configuration;
- auto-repair, if later supported, is a separate audited command;
- `configured`, `reachable`, `artifact_present`, `admitted`, `enabled` are independent;
- provider/model picker sees only combinations currently usable for the caller/task/data class;
- stale health is shown as stale/unknown, not healthy.

### Tests

- health snapshot stale-after behavior;
- invalidation after key/model change;
- no DB write from GET/readiness path;
- revoked model disappears from new-task picker;
- existing historical receipt still resolves model identity;
- local-only provider unavailable => no cloud fallback;
- health success does not bypass task/data admission.

### Exit

`WKD_01B_PROVIDER_READINESS_QUALIFIED = TRUE`

## 5. WKD-02A — PlanGraph schema + deterministic validator

### Scope

Implement non-executing types:

- `PlanGraph`;
- `PlanNode`;
- schema version;
- planner profile/version refs;
- node capability ids;
- dependency edges;
- reply node;
- hard size/depth/fan-out bounds.

### Validation

Reject:

- unknown/ungranted capability;
- duplicate node id;
- self-dependency;
- unknown dependency;
- cycle;
- too many nodes;
- excessive depth/fan-out;
- invalid reply node;
- raw credential reference;
- unsupported schema;
- human-only authority encoded as automatic execution.

### Tests

- golden one-node plan;
- 2-4 node DAG;
- cycle;
- duplicate id;
- missing dependency;
- too many nodes;
- denied capability;
- invalid nested params;
- malicious provider/model override;
- deterministic serialization/digest.

### Exit

`WKD_02A_PLAN_GRAPH_VALIDATOR_QUALIFIED = TRUE`

## 6. WKD-02B — PlanGraph compiler

### Scope

Compile a validated `PlanGraph` proposal into either:

- executable AIF `OperationSpec` nodes;
- human/approval steps;
- exception/unsupported steps;
- or an explicit compilation failure.

### Re-resolution per node

- identity;
- tenant/branch/patient scope;
- purpose/consent;
- capability version;
- authority/data class;
- approval;
- credential binding;
- egress;
- provider readiness;
- budget;
- idempotency/reconciliation;
- current module health.

### Rules

- no authority copied blindly from model plan;
- model-selected provider hint is advisory only;
- compilation output is persisted before dispatch;
- stale plan must recompile or fail before consequential execution;
- fallback to single-step path only where task contract explicitly says it is safe.

### Tests

- capability revoked after planning;
- approval expires before compilation;
- provider becomes degraded;
- data-class conflict;
- module disabled;
- budget exhausted;
- safe fallback allowed;
- fallback prohibited for protected action.

### Exit

`WKD_02B_PLAN_COMPILER_QUALIFIED = TRUE`

## 7. WKD-03A — WorkItem state contract

### Scope

Implement `AutomationWorkItem` as an execution/coordination projection linked to an authoritative workflow/task/source object.

States:

```text
BACKLOG
READY
IN_PROGRESS
WAITING_HUMAN
WAITING_EXTERNAL
BLOCKED
IN_REVIEW
UNKNOWN_EXTERNAL_OUTCOME
DONE
CANCELLED
EXPIRED
```

State mapping onto AIF terminal states follows canonical plan §8; `UNKNOWN_EXTERNAL_OUTCOME` can never close as `DONE` without an AIF reconciliation receipt.

### Required dimensions

- structural parent;
- blocker edges;
- current owner;
- current execution run;
- claim run;
- structured unblock descriptor;
- approval/interaction refs;
- purpose/data scope;
- budget ref.

### Rules

- hierarchy != dependency;
- owner != execution;
- agent `IN_PROGRESS` => live or recoverable execution path;
- `BLOCKED` must be routable;
- cancelled blocker does not automatically satisfy dependency;
- terminal transitions are append-only/superseded, not silently rewritten.

### Tests

- invalid prose-only block;
- parent child without blocker still independently executable;
- blocker resolution wakes eligibility once;
- cancelled blocker remains unresolved;
- human-owned in-progress requires no heartbeat;
- agent-owned in-progress without run/recovery rejected.

### Exit

`WKD_03A_WORK_STATE_QUALIFIED = TRUE`

## 8. WKD-03B — Atomic claim + liveness recovery

### Scope

Add atomic claim/check-out semantics around agent-owned work.

### Rules

- one current agent run owns execution rights;
- current live claim conflict returns conflict and stops retry loop;
- stale/terminal claim can be compare-and-cleared;
- cleanup cannot clear a successor's claim;
- pre-dispatch conditions rechecked after claim;
- configuration-incomplete becomes typed waiting state.

### Recovery tests

- 100-way claim race -> exactly one winner;
- crash after claim before run dispatch;
- successor claim after terminal run;
- old worker tries to clear successor claim;
- stale claim recovery;
- live conflict no blind retry.

### Exit

`WKD_03B_WORK_CLAIM_LIVENESS_QUALIFIED = TRUE`

## 9. WKD-03C — Pre-dispatch configuration gate

Check before dispatch:

- agent active;
- sponsor active if needed;
- capability current;
- approval current;
- credentials configured;
- provider/model ready;
- module/integration healthy;
- local bridge ready;
- blockers resolved;
- workspace/resource available;
- privacy/egress resolved;
- budget available.

Failure produces a typed wait with owner/action.

Do not consume a provider/model attempt for a condition known to be impossible before dispatch.

### Exit

`WKD_03C_PREDISPATCH_GATE_QUALIFIED = TRUE`

## 10. WKD-04A — Durable interaction object

### Scope

Implement:

- `InteractionRequest`;
- kinds: QUESTION/CONFIRMATION/APPROVAL/PERMISSION/MISSING_CONFIGURATION/HUMAN_HANDOFF/REVIEW;
- addressee;
- options;
- parameter digest (mandatory for APPROVAL/CONFIRMATION);
- tenant/branch scope inherited from the work item;
- APPROVAL/CONFIRMATION: mandatory `approval_ref` to an existing N5/C3 approval plus AIF §12C.9 human-intent binding fields; no separate settlement;
- expiry;
- terminal statuses;
- result;
- work/run link.

### Tests

- duplicate answer;
- expired answer;
- superseded question;
- wrong addressee;
- changed parameter digest invalidates prior confirmation;
- cancellation after work terminal;
- settlement survives restart.

### Exit

`WKD_04A_INTERACTION_OBJECT_QUALIFIED = TRUE`

## 11. WKD-04B — External interaction publication

### Scope

Publish only safe projections to approved channels.

Use opaque action token, not canonical ids.

### Rules

- publication receipt != answer settlement;
- failure/timeout visible;
- callback token short-lived/replay-resistant;
- protected tool/credential/clinical approvals remain in Zyara UI when channel cannot preserve full semantics;
- external channel never receives raw PHI/capability scope in action token.

### Tests

- callback forgery;
- replay;
- expired token;
- publication fails after canonical interaction persisted;
- answer settles but continuation fails;
- stale target;
- newer interaction supersedes old controls.

### Exit

`WKD_04B_EXTERNAL_INTERACTION_QUALIFIED = TRUE`

## 12. WKD-05A — Routine trigger contract

Implement:

- `RoutineDefinition`;
- schedule/event/webhook trigger type;
- timezone;
- catch-up policy;
- concurrency policy;
- workflow version;
- owner;
- purpose;
- budget policy;
- enabled state.

### Tests

- duplicate webhook trigger;
- DST transition;
- missed interval with SKIP;
- COALESCE;
- bounded CATCH_UP;
- disabled routine;
- workflow version superseded.

### Exit

`WKD_05A_ROUTINE_TRIGGER_QUALIFIED = TRUE`

## 13. WKD-05B — Budget and cost accounting

Track by tenant/branch/workflow/agent/work item/run/model/capability.

### Rules

- warning and hard-stop thresholds;
- reserve safe completion/reconciliation budget where needed;
- budget hard-stop blocks new discretionary work;
- it does not discard an UNKNOWN external side effect;
- cost fallback never changes privacy/data residency silently;
- quality/safety dominates cost optimization.

### Tests

- concurrent budget race;
- threshold crossing;
- hard stop before model call;
- unknown external operation reconciliation still allowed under reserved safety budget;
- cost attribution correct under retries.

### Exit

`WKD_05B_BUDGET_ACCOUNTING_QUALIFIED = TRUE`

## 14. WKD-06A — Knowledge source binding

Implement `KnowledgeSourceBinding` with:

- module/credential binding;
- tenant/subject scope;
- purpose;
- allowed resources;
- cursor;
- retention/index policy;
- health/freshness.

### Tests

- cross-tenant source denied;
- revoked source denied;
- disconnected source no new sync;
- current stale status visible;
- credential rotation;
- no secret in receipt.

### Exit

`WKD_06A_KNOWLEDGE_SOURCE_BINDING_QUALIFIED = TRUE`

## 15. WKD-06B — Sync + RAG projection lifecycle

Implement:

- durable cursor/checkpoint;
- idempotent upsert;
- tombstone/deletion propagation;
- source provenance;
- freshness;
- content scanning/type/size gates;
- rebuildable chunk/embedding projection;
- prompt-injection marking.

### Tests

- duplicate page batch;
- deletion/tombstone;
- consent/source revocation;
- crash after cursor persist boundary;
- stale index removed;
- chunk provenance preserved;
- malicious document cannot add capability/instruction authority.

### Exit

`WKD_06B_KNOWLEDGE_SYNC_QUALIFIED = TRUE`

## 16. WKD-07A — DataAccessGrant

Implement named data access grants independent of model/tool grants.

Minimum:

- subject;
- tenant/branch;
- datasets/views;
- query tier;
- allowed metrics/columns;
- purpose;
- expiry;
- row/runtime limits;
- export policy;
- approval ref where required.

### Tests

- expired grant;
- cross-tenant grant;
- view not allowed;
- export denied;
- limit widening denied;
- revoked grant stops new query.

### Exit

`WKD_07A_DATA_GRANT_QUALIFIED = TRUE`

## 17. WKD-07B — Typed analytics query gateway

Implement a metric/filter DSL, not free-form SQL.

Server compiles only to approved metric definitions/materialized views.

### Tests

- unknown metric;
- dimension not allowed;
- sensitive filter combination;
- row/time limit;
- cancellation;
- missing denominator/freshness surfaced;
- result provenance;
- query receipt.

### Exit

`WKD_07B_ANALYTICS_GATEWAY_QUALIFIED = TRUE`

## 18. WKD-08A — Human Data Workspace

UI / API for privileged human analytics:

- metric catalog;
- approved dataset/view browser;
- schema/field descriptions;
- metric lineage;
- query builder;
- result table;
- export controls;
- audit trail.

No raw patient-care DB browsing by default.

### Exit

`WKD_08A_DATA_WORKSPACE_QUALIFIED = TRUE`

## 19. WKD-08B — Optional human read-only SQL spike

This slice is optional and may end `DEFER` or `REJECT`.

If evaluated, use isolated analytics/read replica only.

Require:

- dedicated read-only role;
- tenant isolation;
- exactly one statement;
- parser/risk classifier;
- no DDL/write/session switch/locking read;
- unsafe function/extension denylist/allowlist strategy;
- max rows/runtime/resources;
- cancellation;
- SQL preview;
- query/export audit;
- sensitive-column policy.

No model exposure in this slice.

### Possible exits

- `ADMIT_HUMAN_ONLY`
- `DEFER`
- `REJECT`

## 20. WKD-08C — AI/MCP analytics tools

Expose only named tools/capabilities:

- list/describe metric;
- query curated metric;
- explain returned data;
- approved export request.

Do not expose generic `execute_sql` to care agents.

### Tests

- model attempts connection/schema override;
- result-size cap;
- timeout;
- revoked data grant;
- non-read-only tool requires approval;
- result treated as untrusted evidence;
- PHI-light logs.

### Exit

`WKD_08C_AI_ANALYTICS_TOOLS_QUALIFIED = TRUE`

## 21. WKD-09A — Sidecar protocol + identity

Implement only if a real local/connector sidecar is needed.

Contract:

- module id/version/digest;
- protocol version;
- capability list;
- bounded JSON/RPC or equivalent;
- timeout/cancel;
- idempotent connect/disconnect;
- scoped data directory;
- host-resolved secrets;
- health.

### Tests

- module id mismatch;
- version mismatch;
- unsupported protocol;
- secret in error rejected/redacted;
- restart;
- hung sidecar;
- cancellation.

### Exit

`WKD_09A_SIDECAR_PROTOCOL_QUALIFIED = TRUE`

## 22. WKD-09B — Package integrity/admission

If Zyara distributes extension bundles:

- manifest;
- exact source/ref;
- package hash;
- signature/admission state;
- dependency/SBOM;
- declared permissions;
- target/platform;
- unsigned dev mode separated from production.

### Tests

- path traversal;
- symlink escape;
- changed package hash;
- unsigned prod package;
- permission mismatch;
- downgrade/replay package.

### Exit

`WKD_09B_EXTENSION_ADMISSION_QUALIFIED = TRUE`

## 23. WKD-10A — Action Center projection

Show one authoritative operator projection:

- work item status/owner;
- blockers;
- run;
- interaction/approval;
- PlanGraph;
- operation receipts;
- provider/module readiness;
- budget/cost;
- retry/reconciliation;
- evidence.

Actions:

- pause new work;
- cancel where safe;
- disable routine/module/provider;
- answer/approve through proper authority path;
- open evidence;
- route exception.

### Tests

- derived summary cannot authorize protected action;
- stale UI approval rejected server-side;
- RTL/Arabic;
- keyboard/screen reader;
- PHI minimization.

### Exit

`WKD_10A_ACTION_CENTER_QUALIFIED = TRUE`

## 24. WKD-10B — Whole-plane qualification

Run campaigns:

- tenant/branch isolation;
- planner injection/cycles/fan-out;
- provider readiness staleness;
- agent work stranding;
- duplicate trigger;
- budget race;
- interaction replay/stale answer;
- connector deletion/revocation;
- analytics cross-tenant/sensitive export;
- plugin/sidecar identity/integrity;
- outage/recovery;
- privacy/log leakage;
- restore/reconciliation.

Exit only with exact evidence matrix.

`ZYARA_WORK_KNOWLEDGE_DATA_PLANE_QUALIFIED = TRUE`

## 25. First implementation handoff

Do not skip AIF prerequisites.

```text
CURRENT_FIRST_AIF_LEAF = AIF-01A
FIRST_WKD_LEAF = WKD-01A
FIRST_WKD_LEAF_REQUIRES = AIF-01A + AIF-01B canonical
REAL_PHI_REQUIRED = NO
EXTERNAL_CREDENTIAL_REQUIRED = NO
DONOR_CODE_COPY_REQUIRED = NO
```

The first WKD leaf should be implemented Zyara-native. Donor code can be copied only after a later exact-path provenance decision demonstrates value.

`ZYARA_WORK_KNOWLEDGE_DATA_IMPLEMENTATION_HANDOFF_READY = YES`
