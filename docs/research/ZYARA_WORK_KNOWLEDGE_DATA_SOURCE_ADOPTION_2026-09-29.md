# Zyara Work / Knowledge / Data Source Adoption — 2026-09-29

**Mode:** source qualification / planning  
**Planning base:** `56eb66d8b828b4d9412047c1cd64dec0c64b7d76`

## 1. Source-use rule

Founder permission to copy/use source code is recorded as planning authority, but every admitted component still requires:

- exact repository and revision;
- exact copied/adapted paths;
- license/NOTICE obligations;
- third-party dependency/data/model terms;
- security/privacy impact;
- transitive dependencies;
- target Zyara contract;
- update/rollback strategy;
- tests/evidence;
- mode: `REFERENCE / DEPENDENCY / ADAPT / COPY_SELECTIVE / REJECT`.

No whole donor platform becomes a Zyara authority plane.

## 2. t8y2/dbx

**Pin:** `4269a61e2cf6c19afdcaba41fed1e57d6e5e3512`  
**Observed root license:** Apache-2.0  
**Founder authorization:** explicit permission stated to copy/use source code  
**Recommended mode:** `REFERENCE / ADAPT / COPY_SELECTIVE`

### 2.1 High-value source areas

- `src-tauri/src/commands/mcp_bridge.rs`
  - database execution policy;
  - dangerous SQL gating;
  - connection/database policy resolution;
  - batch/statement safety checks.
- `docs/content/docs/plugin-development.mdx`
  - plugin manifest/host boundary;
  - native sidecar protocol;
  - plugin data grants;
  - read-only query rules;
  - AI/MCP tool exposure;
  - approval-by-default for non-read-only tools;
  - host-injected connection identity;
  - bounded results/timeouts;
  - package/path/integrity patterns.
- README/database workspace patterns
  - query editor;
  - data grid;
  - schema browser;
  - schema diff;
  - ER/lineage;
  - import/export UX.

### 2.2 Best Zyara use

- AIF-01 module/tool descriptor hardening;
- AIF-08 curated analytics/data access;
- privileged human Data Workspace UX;
- schema/metric lineage;
- plugin/sidecar packaging/integrity;
- MCP-like bounded analytics capability patterns.

### 2.3 Do not copy as-is

- general connection manager for arbitrary production databases;
- broad SQL execution against operational patient data;
- generic AI agent database access;
- arbitrary shell/SSH/data source plugins in care-agent context;
- DBX Store marketplace semantics unless Zyara later needs an internal extension registry.

### 2.4 Required Zyara strengthening

DBX's SQL risk classifier is useful defense-in-depth, but Zyara requires stronger boundaries:

- isolated analytics/read replica or approved curated schema;
- RLS/tenant isolation below the query UI;
- named `DataAccessGrant`;
- metric/filter DSL as default AI path;
- raw SQL rejected for ordinary agents;
- privileged human read-only SQL only as a separately qualified T3 tier;
- sensitive-column/export policy;
- query resource/cost limits;
- audit and purpose binding.

### 2.5 Direct-copy gate

Before copying any DBX file:

```text
exact source path + digest
license/NOTICE scan
third-party dependency scan
Zyara target path
modification record
security/privacy review
tests
update strategy
= COPY_SELECTIVE candidate
```

No root `NOTICE` file was observed in this source pass; path-level copy still requires checking file headers and third-party notices.

## 3. paperclipai/paperclip

**Pin:** `24beb005755465f71a19ec92a85da0958d1b9740`  
**Observed root license:** MIT  
**Founder authorization:** explicit permission stated to copy/use source code  
**Recommended mode:** `REFERENCE / ADAPT / COPY_SELECTIVE`

### 3.1 High-value source areas

- `README.md`
  - work/task system;
  - atomic checkout;
  - persistent state;
  - budgets;
  - routines/heartbeats;
  - governance;
  - workspace/runtime abstractions;
  - plugins/secrets.
- `doc/execution-semantics.md`
  - structure vs dependency vs ownership vs execution;
  - agent-owned vs human-owned work;
  - blocked/in-review/done semantics;
  - stale-lock recovery;
  - known holds and pre-dispatch configuration gates;
  - blocker resolution;
  - review delegation.
- `server/src/services/chat-interaction-publications.ts`
  - durable questions/confirmations;
  - opaque short callback tokens;
  - expiration/supersession outcomes;
  - safe external-channel projection;
  - protected interactions kept in governed UI.
- current runner/ACP integration at the pin
  - durable interaction/permission foundation;
  - bounded activity/plan presentation;
  - persist-before-publication/recovery patterns.

### 3.2 Best Zyara use

- AIF-04 work/liveness semantics;
- AIF-07 durable interactions and Action Center;
- routine/schedule/budget semantics;
- pre-dispatch configuration gates;
- work-product provenance;
- provider/agent adapter concepts;
- operational liveness monitoring.

### 3.3 Preserve Zyara authority

Do not transplant Paperclip's company/board/agent hierarchy as healthcare authority.

Zyara already owns:

- human tasks/helpdesk in W3;
- agent identity in N5/C1;
- activity in N5/C2;
- approval/exception authority in N5/C3;
- audit in N5/C4;
- capabilities/policy in AIF.

Paperclip contributes execution semantics, not replacements for those domains.

### 3.4 High-value invariants to adapt

```text
parent != blocker
assignee != active execution
blocked != free-text reason only
agent in_progress => live or recoverable execution path
stale lock cleanup != blind retry
configuration missing => pre-dispatch wait, not doomed run
external interaction publication != durable settlement
budget stop != safe abandonment of unknown external side effect
```

### 3.5 Direct-copy gate

Any copied Paperclip source must remove/replace assumptions around:

- `company` as tenant authority;
- agent corporate hierarchy;
- generic business automation rights;
- code-workspace/git assumptions where irrelevant;
- provider adapters that bypass AIF.

MIT notice must remain with copied substantial portions.

## 4. metadist/synaplan

**Pin:** `e81eb3431deb3e242c3a114e8cbf08e2fbfd1e88`  
**Observed root license:** Apache-2.0  
**Founder authorization:** explicit permission stated to copy/use source code  
**Recommended mode:** `REFERENCE / ADAPT / COPY_SELECTIVE / DEPENDENCY only after bounded qualification`

### 4.1 High-value source areas

- `backend/src/AI/Credential/ChatReadinessService.php`
  - provider availability/readiness;
  - cached live status;
  - no write-on-read principle;
  - explicit repair path separate from read path.
- `backend/src/Service/SelfAware/CapabilityInventory.php`
- `backend/src/Service/SelfAware/PlatformCapabilityInventory.php`
  - per-install/per-user capability snapshot;
  - explicit absent/alternative capability handling.
- `backend/src/Module/Contract/FeatureModuleInterface.php`
  - optional module descriptor;
  - configured vs live status;
  - capability ids;
  - route/service ownership;
  - mobile impact;
  - cheap construction/no remote side effect.
- `backend/src/Service/Multitask/Plan/TaskPlan.php`
  - immutable validated small DAG;
  - safe single-step fallback.
- `backend/src/Service/Multitask/Plan/TaskPlanValidator.php`
  - version check;
  - bounded node count;
  - unique ids;
  - allowed capability filter;
  - dependency validation;
  - cycle rejection;
  - reply-node validation.
- `backend/src/Service/Multitask/TaskPlanner.php`
- `backend/src/Service/Multitask/TaskPlanExecutor.php`
  - planner/execution separation;
  - plan persistence/presentation;
  - per-plan execution/cost patterns.
- README/deployment/provider setup
  - local/Ollama option;
  - self-hosted/air-gapped pattern;
  - many providers behind one product;
  - RAG/connectors;
  - plugin/MCP/server/client patterns.

### 4.2 Best Zyara use

- AIF-03 model/provider readiness;
- installation capability inventory;
- bounded `PlanGraph` proposal/validation;
- optional integration-module descriptors;
- local/private deployment patterns;
- permission-first RAG/connector ingestion;
- model/capability presentation in admin/Action Center.

### 4.3 Required Zyara strengthening

A Synaplan-style task plan must not execute directly.

Zyara adds a deterministic compile phase:

```text
PlanGraph
-> validate schema/DAG/capability ids
-> re-resolve identity/grants/data/authority/approval/egress/budget/readiness
-> compile to OperationSpec DAG
-> persist
-> dispatch through AIF-04
```

Planner output is untrusted proposal data.

### 4.4 Provider readiness rule

Adopt the distinction:

```text
configured
healthy/reachable
model/artifact available
admitted for task/data class
currently enabled
```

A provider/model picker must not collapse these into one boolean.

### 4.5 Local/self-host rule

Local/Ollama-style support is useful for Clinic Private/Enterprise profiles, but:

- exact model artifact provenance is mandatory;
- device/runtime support is explicit;
- no silent fallback to remote;
- updates are versioned candidates;
- health/readiness does not authorize PHI by itself.

### 4.6 Direct-copy gate

No root `NOTICE` file was observed in this source pass. Apache-2.0 obligations still apply, and exact copied paths need file/dependency notice review.

## 5. Combined role map

| Donor | Zyara role | Mode | Main boundary |
|---|---|---|---|
| DBX | curated data workspace + data grants + plugin/sidecar safety | ADAPT / COPY_SELECTIVE | no general agent SQL / operational DB browsing |
| Paperclip | durable work/liveness + interactions + routines/budgets | ADAPT / COPY_SELECTIVE | no agent org chart as healthcare authority |
| Synaplan | provider readiness + capability inventory + bounded PlanGraph + local/knowledge patterns | ADAPT / COPY_SELECTIVE | plan/provider availability never grants authority |

## 6. Preferred architecture, not platform stacking

Do not embed three full products.

```text
Zyara contracts
   |
   +--> selectively adapt DBX data/plugin patterns
   +--> selectively adapt Paperclip work/liveness/interaction patterns
   +--> selectively adapt Synaplan readiness/plan/module patterns
```

Avoid:

```text
Zyara -> Paperclip -> Synaplan -> DBX
```

That would duplicate identity, tenancy, secrets, approvals, runtime, and audit.

## 7. Dependency / package policy

Prefer:

1. Zyara-native contract;
2. small dependency if it cleanly implements the contract;
3. selective adaptation;
4. selective copy only when adaptation would be wasteful and provenance is complete;
5. whole-platform dependency only with explicit architecture decision.

For these three donors, the default is **not** whole-platform dependency.

## 8. Security / privacy admission checklist per copied component

- no hidden telemetry;
- no raw secret logging;
- no broad filesystem/shell/network capability;
- no cross-tenant implicit key;
- no provider-default mutation on read;
- no raw production DB connection selection by model;
- no unsafe external chat approval;
- bounded inputs/results;
- cancellation/timeouts;
- audit/provenance;
- dependency/SBOM scan;
- update/rollback.

## 9. Completion marker

`ZYARA_WORK_KNOWLEDGE_DATA_SOURCE_ADOPTION_READY = YES`
