# Zyara Work / Knowledge / Data Plane Plan — 2026-09-29

**Status:** canonical planning amendment candidate  
**Mode:** PLAN-ONLY  
**Planning base:** `56eb66d8b828b4d9412047c1cd64dec0c64b7d76`  
**Program:** cross-cutting `WKD` amendment to AIF + N9  
**Purpose:** make Zyara's agent work coordination, model/knowledge routing, integrations, and analytics/data exploration implementable without creating a second authority plane or exposing raw healthcare data to agents.  
**AIF precedence:** this plan extends [`ZYARA_AI_OPERATING_FABRIC_PLAN_2026-09-22.md`](ZYARA_AI_OPERATING_FABRIC_PLAN_2026-09-22.md); on any conflict AIF wins. WKD creates no second approval system, prompt registry, memory store, or action center.  
**Co-authoritative addendum:** [`../research/ZYARA_WORK_KNOWLEDGE_DATA_FINAL_HARDENING_2026-09-29.md`](../research/ZYARA_WORK_KNOWLEDGE_DATA_FINAL_HARDENING_2026-09-29.md) (H01-H28). Where the addendum is stricter or more specific than this plan, the addendum wins; neither overrides AIF.

## 1. Product and architecture thesis

Zyara already has the healthcare authority/control foundations:

- Provider Graph and domain services own healthcare facts;
- N5 owns bounded agent identity, activity, approvals/exceptions, and audit;
- AIF owns capabilities, privacy/egress, model/decision/runtime execution, browser/local bridges, Action Center, and Insights;
- W3 owns human operational tasks/helpdesk;
- PostgreSQL/PostGIS and typed domain services remain systems of record.

The three new donors improve **how work is coordinated, how capabilities/models are discovered and planned, and how authorized data is explored**.

They do not replace those Zyara-owned foundations.

```text
                     ZYARA AUTHORITY
        domain truth + N5 + policy + human authority
                            |
                            v
                  AIF CAPABILITY GATEWAY
                            |
             +--------------+---------------+
             |              |               |
             v              v               v
       PROVIDER /       PLAN GRAPH      MODULE / TOOL
       CAPABILITY       COMPILER        INVENTORY
       READINESS        (bounded)       (configured/healthy)
       Synaplan         Synaplan        Synaplan + DBX
             |              |               |
             +--------------+---------------+
                            |
                            v
                 DURABLE WORK ORCHESTRATION
                 Paperclip-inspired liveness
                            |
               +------------+-------------+
               |                          |
               v                          v
        DURABLE HUMAN                 AIF RUNTIME
        INTERACTIONS               serializable ops
        Paperclip                        |
                                        v
                              receipts / verification
                                        |
                 +----------------------+------------------+
                 |                                         |
                 v                                         v
           ACTION CENTER                            DATA WORKSPACE
                                                    DBX-inspired
                                             curated/read-only access
```

## 2. Permanent invariants

```text
agent org chart != healthcare authority
work ownership != permission
work status != healthcare truth
model availability != model admission
configured provider != healthy provider
healthy provider != allowed data class
task plan != executable authority
planner node != capability grant
retrieved knowledge != authorization
plugin/module declaration != host permission
readOnlyHint != proof of read-only behavior
AI-generated SQL != approved data access
analytics view != clinical record
blocked text != routable blocker
heartbeat != permission to act
budget availability != authority to spend/execute
external chat button != sufficient approval for protected action
```

## 3. Qualified donor pins

- `t8y2/dbx@4269a61e2cf6c19afdcaba41fed1e57d6e5e3512`
  - root license observed: Apache-2.0;
  - founder states explicit permission to copy/use the source code;
  - strongest use: bounded data workspace, read-only query/tool grants, plugin/sidecar safety, schema/data-explorer UX.
- `paperclipai/paperclip@24beb005755465f71a19ec92a85da0958d1b9740`
  - root license observed: MIT;
  - founder states explicit permission to copy/use the source code;
  - strongest use: durable work/liveness semantics, atomic checkout, blockers vs hierarchy, routines/budgets, human-agent interactions, work-product provenance.
- `metadist/synaplan@e81eb3431deb3e242c3a114e8cbf08e2fbfd1e88`
  - root license observed: Apache-2.0;
  - founder states explicit permission to copy/use the source code;
  - strongest use: provider/capability readiness, bounded task-plan DAG validation, local/self-hosted model patterns, knowledge/connectors, optional feature modules.

Exact source-use decisions live in `docs/research/ZYARA_WORK_KNOWLEDGE_DATA_SOURCE_ADOPTION_2026-09-29.md`.

## 4. Donor adoption strategy

### 4.1 DBX

Adopt or reimplement selectively:

- one explicit data grant per module/integration/scope;
- revoke-able access;
- read-only query risk classification;
- single-statement rules where raw SQL is ever admitted;
- maximum rows, timeout, result compaction;
- connection/session binding owned by the host, not chosen through raw model arguments;
- approval by default for non-read-only tools;
- untrusted tool outputs;
- plugin manifest identity/protocol matching;
- bounded sidecars;
- package integrity/signature/review patterns;
- schema browser, schema diff, lineage and SQL-preview UX patterns.

Reject as a Zyara product direction:

- turning Zyara into a general-purpose 100-database client;
- allowing an agent to browse arbitrary production schemas;
- giving patient-care agents unrestricted SQL;
- treating a SQL classifier as the only data-security boundary.

### 4.2 Paperclip

Adopt or reimplement selectively:

- separate hierarchy, dependency, ownership, and execution;
- atomic agent work claim / checkout semantics;
- explicit blocker relationships;
- routable blocked state;
- agent-owned `in_progress` requires a live or recoverable execution path;
- persistent run/task context;
- routine/schedule wake semantics;
- per-agent/workflow/model budgets and hard stops;
- durable questions/confirmations/permissions;
- opaque callback/action tokens for external channels;
- configuration-incomplete as pre-dispatch state rather than a failed run;
- stale-lock recovery and compare-and-clear behavior;
- work products with run provenance;
- provider adapter/runtime abstraction.

Reject as Zyara authority:

- AI corporate reporting lines as a permission model;
- autonomous business-goal hierarchy as healthcare authority;
- unrestricted agent hiring/self-modification;
- one generic agent task system replacing W3 human tasks, C3 approvals, or clinical workflows.

### 4.3 Synaplan

Adopt or reimplement selectively:

- `configured` vs `healthy/available` capability distinction;
- live capability inventory;
- provider readiness snapshot and cache invalidation;
- read paths do not mutate provider defaults/config;
- model/provider capability catalog;
- validated small task-plan DAG;
- allowed-capability validation;
- cycle rejection;
- bounded node count/fan-out;
- safe single-step fallback where the plan is invalid and the task permits fallback;
- shadow-mode/evaluation before planner execution;
- per-node model/cost visibility;
- local/Ollama-style runtime as an optional provider family;
- optional feature-module descriptors;
- knowledge/RAG and connector patterns;
- self-hosted / air-gapped deployment patterns.

Reject as authority:

- planner-selected capabilities without AIF authorization;
- provider availability as authorization;
- automatic provider default repair from a GET/read path;
- connector content entering RAG without source ACL and deletion propagation;
- broad chat/plugin features becoming hidden clinical actions.

## 5. Provider readiness and capability inventory

AIF-03A gains a live `ProviderReadinessSnapshot` and AIF-01 gains an installation/module inventory.

### 5.1 Provider readiness

Minimum state:

```text
provider_id
provider_profile_id
model_profile_id          # AIF §12A.1 ModelProfile; source of admission/data/task classes
configured
credential_present
credential_validated_at
runtime_reachable
model_artifact_present
model_revision
capabilities[]
allowed_data_classes[]
allowed_task_classes[]
admission_state
health_state
health_observed_at
stale_after
failure_reason_code
kill_switch_state
incident_state            # AIF §12C.14: HEALTHY | DEGRADED | QUARANTINED | SUSPENDED | REVOKED
```

Rules:

- the snapshot is a read-only projection over the AIF §12A.1 `ModelProfile`; `allowed_data_classes`, `allowed_task_classes` and `admission_state` are copied from it and never written by WKD;
- `incident_state` is the AIF §12C.14 state; only `HEALTHY` (or `DEGRADED` where the ModelProfile policy allows it) is usable for new work, and `QUARANTINED`/`SUSPENDED`/`REVOKED` never are;
- configuration, health, and authorization are separate;
- `healthy` does not override task/data admission;
- an unavailable provider is not shown as usable for new work;
- historical receipts retain the provider/model identity even after removal;
- availability snapshots are invalidated after relevant admin changes;
- cached health has a TTL and explicit staleness;
- a read operation does not rewrite configuration or silently switch the default provider;
- any auto-repair of a broken default is a separate, audited admin/maintenance operation;
- local provider readiness includes artifact presence and runtime/device support.

### 5.2 Capability inventory

Define `ModuleCapabilityReport` for the current installation/user/tenant:

```text
module_id
configured
health
capability_ids[]
route/surface availability
required_config_refs[]
admin_hint
data_boundary
local_or_remote
observed_at
```

A missing optional capability should disappear or become explicitly unavailable; the UI must not expose controls that can never succeed.

## 6. Bounded PlanGraph compiler

Synaplan's validated task-plan DAG is useful, but Zyara needs a stricter healthcare-safe boundary.

### 6.1 Separation

```text
Model-proposed PlanGraph
        !=
OperationSpec DAG
```

`PlanGraph` is a **proposal/explanation graph**. It names capabilities and dependencies but grants no authority.

It must pass a deterministic compiler before any node can become an AIF `OperationSpec`.

### 6.2 PlanGraph contract

```text
plan_id
tenant_id                 # server-derived, never body-supplied
branch_id?                # from the requesting work context; null only for an explicitly tenant-wide request
schema_version
planner_profile
prompt_version
purpose
language
reply_node?
nodes[]
created_at
```

Each node:

```text
node_id
capability_id
intent
input_refs[]
depends_on[]
params_digest
expected_output_schema
model_profile_hint?
```

### 6.3 Validation

Reject plans with:

- unknown capability;
- capability outside current grant;
- capability outside current data/authority ceiling;
- duplicate node ids;
- self-reference;
- missing dependency;
- cycles;
- excessive node count;
- excessive fan-out/depth;
- unsupported schema version;
- invalid reply node;
- raw secret references;
- hidden provider/model overrides;
- clinical/human-only actions represented as automatically executable.

### 6.4 Compilation

For every executable node the compiler re-resolves:

- current capability version;
- current caller/agent identity;
- tenant/branch/patient scope;
- purpose/consent;
- authority class;
- data class;
- approval requirement;
- credential binding refs;
- egress policy;
- budget;
- provider readiness;
- idempotency/reconciliation contract.

If any precondition changes, compilation fails or the node becomes an explicit human/exception step.

### 6.5 Fallback

A safe single-step fallback is allowed only for tasks whose contract declares fallback safe.

A failed plan for a protected action must not silently degrade to a generic model/tool execution path.

## 7. Durable work orchestration and liveness

Paperclip's strongest contribution is the separation of work semantics.

Zyara should preserve four independent concepts:

```text
STRUCTURE   parent/child or workflow decomposition
DEPENDENCY  blocked-by / prerequisite edges
OWNERSHIP   human / team / agent responsible now
EXECUTION   active/recoverable runtime path
```

Never infer one from another.

## 8. WorkItem contract

Do not create a second human helpdesk system.

Use one `AutomationWorkItem`/execution projection linked to authoritative Zyara workflow/task objects.

Minimum contract:

```text
work_item_id
tenant_id
branch_id
source_type
source_id
parent_work_item_id?
owner_type
owner_id
status
blocked_by[]
unblock_descriptor?
approval_ref?
interaction_ref?
active_run_id?
claim_run_id?
budget_policy_ref
purpose
data_scope
created_at
updated_at
terminal_at?
```

Suggested states:

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

Mapping onto AIF §6 standard terminal states of the linked operation(s):

```text
AIF SUCCEEDED                -> DONE (only when every linked operation SUCCEEDED and verification passed)
AIF FAILED_TERMINAL          -> BLOCKED with a routable unblock descriptor (owner + repair path), or CANCELLED by an authorized actor
AIF CANCELLED                -> CANCELLED
AIF EXPIRED                  -> EXPIRED
AIF NEEDS_HUMAN              -> WAITING_HUMAN
AIF UNKNOWN_EXTERNAL_OUTCOME -> UNKNOWN_EXTERNAL_OUTCOME
```

`UNKNOWN_EXTERNAL_OUTCOME` can never close as `DONE`; it leaves that state only through an AIF reconciliation receipt that proves the external outcome, and is never converted into success to close a queue.

A clinical domain status is never copied into this state machine as authority.

## 9. Work-state invariants

- agent-owned `IN_PROGRESS` requires a current execution path or a bounded recovery action;
- human-owned `IN_PROGRESS` does not imply agent heartbeat execution;
- `BLOCKED` requires a routable blocker, pending interaction/approval, or structured unblock descriptor;
- prose-only blocked state is invalid;
- parent/child structure does not imply execution dependency;
- cancelled dependency does not automatically satisfy the dependency;
- terminal work is immutable except through explicit correction/supersession metadata;
- stale claim/run locks use compare-and-clear and cannot clear a successor's claim;
- a live claim conflict is not a retry loop;
- current policy/approval/capability must be rechecked before dispatch even when work was previously eligible.

## 10. Pre-dispatch gates

Known unsatisfied prerequisites should not start a doomed run.

Pre-dispatch checks include:

- agent identity active;
- human sponsor active where required;
- capability grant active;
- approval current;
- required credential binding configured;
- provider/model ready;
- local bridge paired/healthy if needed;
- workspace/resource available;
- blocker dependencies resolved;
- budget available;
- required external integration configured;
- privacy/egress policy resolved.

Failure returns a typed waiting/configuration state with an owner and repair path.

## 11. Durable human interactions

AIF-07 Action Center gains a first-class `InteractionRequest` rather than treating human questions as chat text.

### 11.1 Interaction kinds

```text
QUESTION
CONFIRMATION
APPROVAL
PERMISSION
MISSING_CONFIGURATION
HUMAN_HANDOFF
REVIEW
```

### 11.2 Contract

```text
interaction_id
tenant_id                 # equals the linked work item's tenant
branch_id?                # equals the linked work item's branch; null only when that work item is explicitly tenant-wide
work_item_id
run_id
kind
addressee_type
addressee_id
prompt/summary
options[]?
parameter_digest?         # MANDATORY for APPROVAL and CONFIRMATION
approval_ref?             # MANDATORY for APPROVAL and CONFIRMATION: existing N5/C3 approval record
authority_scope
expires_at
status
result
created_at
settled_at?
publication_receipts[]
```

APPROVAL and CONFIRMATION kinds additionally carry the AIF §12C.9 human-intent binding fields:

```text
human_actor
action_summary            # human-readable summary actually shown
parameter_digest          # normalized parameters digest (mandatory)
data_recipient_scope
expires_at
use_semantics             # ONE_TIME | REUSABLE
capability_id + capability_version
ui_prompt_version         # where material
```

An APPROVAL/CONFIRMATION `InteractionRequest` is only a presentation and collection surface for the referenced N5/C3 approval. It has no separate settlement: the decision is recorded by the N5/C3 approval, and the interaction mirrors that outcome. Creating one without a valid `approval_ref` is rejected, and a material parameter change invalidates it per AIF §12C.9.

### 11.3 Settlement rules

- settlement is durable before continuation is released;
- duplicate answers are idempotent or rejected explicitly;
- stale/superseded/expired interactions cannot authorize work;
- answer identity and channel are retained;
- a newer work state can invalidate an old question;
- failed external publication does not fabricate a delivered interaction;
- external chat channels may render only interaction shapes proven safe for that channel;
- protected approvals stay in the Zyara governed UI if the external channel cannot preserve complete authority semantics;
- callback/action tokens exposed to channels are opaque and short-lived;
- canonical ids, PHI, credential ids, and raw capability scopes do not travel in callback payloads.

## 12. Routines, schedules, wakeups, and budgets

Paperclip's heartbeat/routine patterns are useful for non-clinical and pre-approved operations.

Define `RoutineDefinition`:

```text
routine_id
tenant_id                 # server-derived, never body-supplied
branch_id?                # null only for an explicitly tenant-wide routine; the justification is recorded on the definition
workflow_version
trigger_type
schedule/webhook/event
timezone
catch_up_policy
concurrency_policy
owner
budget_policy
purpose
enabled
```

Rules:

- every trigger creates or references a durable trigger instance/id;
- duplicate trigger delivery is deduplicated;
- `skip`, `coalesce`, and `catch_up` are explicit policies, not implicit behavior;
- no schedule grants authority that the workflow/capability does not already have;
- missed schedules do not replay time-sensitive healthcare actions blindly;
- budget hard stops prevent new work, but do not abandon an unknown external side effect without reconciliation;
- timezone/DST behavior is tested;
- routine disable/pause is immediate for new dispatch and auditable;
- high-consequence reminders/communications respect consent/channel rules at actual send time.

## 13. Integration module descriptor

Combine Synaplan's feature-module descriptor and DBX/Paperclip plugin boundaries into a Zyara-owned `IntegrationModuleDescriptor`.

```text
module_id
version
digest
publisher/source
configured_by[]
capability_ids[]
route_ids[]
service_ids[]
data_classes[]
egress_hosts[]
credential_binding_kinds[]
local_sidecar?
health_probe
mobile_surface_class
license/notice_refs
admission_state
```

Rules:

- stable unique module id;
- duplicate ids rejected at build/admission;
- descriptor construction performs no remote side effect;
- `configured` is cheap and separate from live `health`;
- module capability declaration does not grant a caller access;
- host permissions/capability grants remain separate;
- disabling a module withdraws new capabilities immediately while preserving historical receipts;
- route/UI availability derives from the module inventory where practical;
- optional modules do not leave dead UI controls.

## 14. Plugin / sidecar safety

For copied/adapted plugin or sidecar patterns:

- protocol version is explicit;
- sidecar module id/version must match the descriptor;
- stdout/protocol and logs are separated where relevant;
- cancellation/timeouts are supported;
- connect/disconnect is idempotent;
- secrets are resolved by the host and are not model arguments;
- no secret is echoed in events/errors;
- sidecar data directories are scoped and not a substitute for the secret store;
- package paths reject traversal/symlinks;
- artifact digest/signature is verified;
- unsigned development packages never become production-admitted by configuration accident;
- native sidecars are treated as local executables with OS-user privilege risk, not as magical sandboxes.

## 15. Connector and knowledge-sync contract

Synaplan's connector/RAG breadth is useful only behind Zyara's permission-first knowledge plane.

Define `KnowledgeSourceBinding`:

```text
binding_id
module_id
tenant_id
branch_scope              # branch_id, or TENANT_WIDE only with a recorded justification
subject_scope
source_type
credential_binding_ref
sync_cursor
allowed_resource_types
purpose
consent/policy_ref
retention_policy
index_policy
health
last_success_at
```

Required sync behavior:

- source ACL checked before ingestion/disclosure;
- incremental cursor/checkpoint;
- idempotent upsert;
- deletion/tombstone propagation;
- revoke/disconnect propagation;
- source provenance on every chunk/document;
- freshness/last-sync shown;
- connector failure does not make old data look current;
- content scanning/type/size controls;
- prompt-injection treatment;
- indexing/embeddings remain rebuildable projections;
- tenant/patient/clinic boundaries preserved in index keys and retrieval filters;
- no cross-tenant global semantic index for PHI.

## 16. Self-hosted / local / air-gapped profile

Synaplan demonstrates a useful product pattern: optional local model and knowledge services should not change the high-level product contract.

Zyara profiles remain:

- Clinic Standard;
- Clinic Private;
- Enterprise / Hospital Network.

For private/air-gapped deployments:

- provider readiness must work without internet;
- no mandatory cloud telemetry;
- local models use exact artifact provenance;
- optional sidecars advertise explicit absent/degraded state;
- software/model updates are controlled artifacts;
- an unavailable local capability fails closed rather than silently egressing PHI;
- connector/sync surfaces explain when internet/external provider access is impossible.

## 17. Zyara Data Workspace / Analytics Gateway

DBX is useful as a data-workspace donor, but Zyara must be substantially stricter.

### 17.1 Data access tiers

```text
T0 METRICS_ONLY
T1 CURATED_VIEW_QUERY
T2 PARAMETERIZED_ANALYTICS_QUERY
T3 PRIVILEGED_HUMAN_READONLY_SQL
T4 DIRECT_OPERATIONAL_DB_SQL = REJECT_DEFAULT
```

AI/agent access defaults to T0-T2.

T3 is an optional privileged human/admin path against an isolated analytics/read replica or explicitly approved curated database, never a general model tool against primary patient-care tables.

### 17.2 Data grant

Define `DataAccessGrant`:

```text
grant_id
subject_type
subject_id
tenant/branch scope
dataset/view ids
query_tier
allowed_columns/metrics
purpose
expires_at
max_rows
max_runtime
export_allowed
approval_ref?
```

Grant is revocable and independently checked per call.

### 17.3 Query contract

Preferred AI query path is a typed metric/filter DSL:

```text
AnalyticsQuery
  metric_ids[]
  dimensions[]
  filters[]
  time_window
  aggregation
  sort
  limit
```

The server compiles it to approved SQL/materialized views.

The model does not select raw schemas, credentials, or arbitrary connection ids.

### 17.4 Optional privileged human read-only SQL

If admitted later, require all of:

- dedicated read-only database role;
- analytics/read replica or curated schema;
- tenant/branch enforcement below the UI;
- exactly one statement;
- statement parser/risk classifier;
- no write/DDL/session switch/locking read;
- deny unsafe extensions/functions/file/network primitives;
- max rows;
- statement timeout;
- resource/cost limits;
- SQL preview;
- query audit;
- export audit;
- sensitive-column policy;
- cancellation;
- no secret in query text/history;
- explain/plan guard where appropriate.

A classifier is defense-in-depth, not the authority boundary.

### 17.5 AI/MCP analytics tools

Expose named capabilities such as:

```text
analytics.list_metrics
analytics.describe_metric
analytics.query
analytics.explain_result
analytics.export_approved
```

Do not expose `execute_sql` to ordinary care agents.

Any future MCP surface inherits:

- AIF identity/capability resolution;
- data grants;
- approval by default for non-read-only operations;
- bounded result size;
- timeouts;
- untrusted-result treatment;
- PHI-light logging;
- revocation.

## 18. Schema browser, diff, and lineage

DBX schema UX patterns are useful for engineering/admin data governance.

Potential Zyara internal surfaces:

- approved schema/object tree;
- typed domain-to-table/view mapping;
- schema diff between migrations/releases;
- lineage from metric -> materialized view -> source events/domain records;
- SQL/metric preview;
- export provenance.

This is an engineering/admin tool, not a patient-facing feature and not permission to browse arbitrary PHI tables.

## 19. Action Center additions

AIF-07 should present one coherent operator view over:

- work item;
- owner;
- current execution/run;
- blocker/unblock owner;
- pending interaction/approval;
- workflow/plan version;
- plan graph;
- operation receipts;
- provider/module readiness;
- budget/cost;
- retries/reconciliation;
- evidence;
- safe pause/cancel/disable.

Do not display an agent "org chart" as if it were healthcare authority. If agent roles are shown, they are operational responsibility labels only.

## 20. Work products and provenance

Agent-generated outputs are first-class `WorkProduct` records only when useful.

```text
work_product_id
tenant_id                 # equals the linked work item's tenant
branch_id?                # equals the linked work item's branch; null only when that work item is explicitly tenant-wide
work_item_id
run_id
kind
content/object ref
digest
source_refs[]
created_by
created_at
verification_state
retention_class
```

Rules:

- generated documents/drafts are not signed clinical records;
- screenshots/files inherit data classification;
- final authoritative write occurs through the owning domain capability;
- work products can be superseded without erasing history;
- exports include provenance where appropriate;
- persistent run/task context and any memory derived from a WorkProduct is stored only as an authoritative domain record or an AIF §12C.12 governed `MemoryObject`; WKD defines no separate memory store.

## 21. Skill / instruction injection

Paperclip's runtime skill injection is useful only when versioned and governed.

Define `SkillBundle`:

```text
skill_id
version
digest
publisher/source
allowed_agent_classes
required_capabilities
prompt_registry_refs[]    # AIF §12A.2 prompt/template id + version; not a parallel registry
data classes
admission/evaluation refs
```

Rules:

- skill prompts/instructions live in the AIF §12A.2 prompt/policy/schema registry; `SkillBundle` only groups references to them and is not a second prompt registry;
- runtime cannot self-modify an admitted skill;
- skill cannot widen capability or egress;
- skill version is part of the run/receipt context;
- untrusted project/document content is not promoted into system skill/instruction scope;
- revocation blocks new runs.

## 22. Costs, budgets, and accounting

Track costs by:

- tenant;
- branch;
- workflow/routine;
- agent identity;
- work item;
- run;
- model/provider;
- capability/tool;
- external integration where measurable.

Budget behavior:

- warn threshold;
- hard stop for new discretionary work;
- reserved budget where necessary for safe completion/reconciliation;
- no hidden provider fallback that changes cost/privacy profile;
- cost does not become the only optimization target;
- quality/safety gates dominate cost optimization.

## 23. Security threat model additions

Test at minimum:

- planner inserts ungranted capability;
- planner cycle/dependency explosion;
- model chooses unavailable/unadmitted provider;
- stale capability inventory;
- plugin declares capability but lacks host permission;
- malicious plugin/sidecar identity mismatch;
- sidecar secret exfiltration through logs/errors;
- plugin package traversal/symlink;
- fake read-only hint around a write;
- SQL multi-statement smuggling;
- SQL comment/CTE/function bypass;
- expensive read-only denial-of-service query;
- cross-tenant analytics query;
- sensitive-column export;
- external callback token forgery/replay;
- stale interaction approval;
- duplicate routine wake;
- catch-up storm;
- budget race;
- stale work claim;
- dependency cancellation incorrectly unlocking work;
- prompt injection in connector/RAG content;
- disconnected source still retrieved from stale index;
- skill injection from untrusted content;
- work product incorrectly promoted to clinical truth.

## 24. Privacy additions

- no raw PHI in model/provider readiness logs;
- module health must be PHI-free;
- work-item operational metadata minimizes patient detail;
- external chat publications are minimized;
- analytics queries/exports are purpose-bound;
- query history retention is explicit;
- dataset access is revocable;
- connector disconnect triggers retention/deletion evaluation;
- RAG indexes honor source deletion and consent revocation;
- cost/accounting records avoid raw prompt/document content;
- local/private profile never silently egresses on failure.

## 25. Reliability and recovery additions

- work claim/checkout is atomic;
- stale claims use fencing/compare-and-clear;
- blocked work always has a route to attention;
- configuration-incomplete is distinct from runtime failure;
- routine wake is idempotent;
- provider/module health is cached with explicit freshness;
- health change invalidates usable-provider projections;
- plan graph is persisted/versioned before execution if used for consequential work;
- operation DAG remains the execution truth after compilation;
- interaction settlement survives restart;
- external publication has a receipt;
- query cancellation/timeouts are enforced server-side;
- connector sync resumes from durable cursor;
- disconnected/revoked sources cannot continue indexing;
- failure preserves evidence rather than fabricating completion.

## 26. Data-model delta

Additive concepts, final names subject to exact existing-schema reconciliation:

```text
provider_readiness_snapshots
module_descriptors
module_health_snapshots
plan_graphs
plan_graph_nodes
automation_work_items
work_item_dependencies
interaction_requests
interaction_publications
routine_definitions
routine_trigger_instances
work_products
skill_bundles
data_access_grants
analytics_query_receipts
knowledge_source_bindings
connector_sync_receipts
```

Reuse existing N5/C3/C4 tables and AIF session/operation/event tables rather than duplicating approvals, audit, identities, or receipts.

## 27. Implementation program

### WKD-01 — Module + readiness contracts

- `IntegrationModuleDescriptor`;
- configured vs healthy;
- `ProviderReadinessSnapshot`;
- capability inventory projection;
- invalidation/freshness;
- tests.

### WKD-02 — PlanGraph compiler

- bounded DAG schema;
- deterministic validation;
- capability/grant compiler;
- safe fallback contract;
- shadow-mode/evaluation harness.

### WKD-03 — Work/liveness contract

- `AutomationWorkItem`;
- structure vs dependency vs ownership vs execution;
- atomic claim;
- blocker/unblock contract;
- pre-dispatch gate;
- stale-claim recovery.

### WKD-04 — Durable interactions

- question/confirmation/approval/permission objects;
- settlement;
- publication receipts;
- opaque callback actions;
- Action Center integration.

### WKD-05 — Routines + budgets

- schedule/event/webhook trigger instance;
- concurrency/catch-up;
- idempotency;
- budget accounting/hard stops;
- timezone/DST tests.

### WKD-06 — Knowledge source/connector contract

- module binding;
- source ACL;
- cursor/deletion/revocation;
- provenance/freshness;
- permission-first RAG ingestion.

### WKD-07 — Curated Data Gateway

- `DataAccessGrant`;
- metric/filter DSL;
- curated views;
- query receipts;
- row/runtime limits;
- export policy.

### WKD-08 — Human Data Workspace

- metric/schema explorer;
- query preview;
- lineage;
- optional privileged read-only SQL qualification;
- no agent raw-SQL path by default.

### WKD-09 — Plugin/sidecar packaging + integrity

- module/protocol identity;
- package digest/signature;
- dev-vs-prod admission;
- secret/error redaction;
- cancellation/restart campaign.

### WKD-10 — Action Center + end-to-end hardening

- work/interaction/plan/provider/module/budget views;
- accessibility/RTL;
- threat campaign;
- recovery;
- privacy;
- performance;
- exact coverage matrix.

## 28. Dependency graph

```text
AIF-01A Capability Contract
   |
   +--> AIF-01B Registry/Resolver
            |
            +--> WKD-01 Module + Readiness
            |       |
            |       +--> WKD-02 PlanGraph
            |       |       |
            |       |       +--> WKD-03 Work/Liveness
            |       |               |
            |       |               +--> WKD-04 Interactions
            |       |               +--> WKD-05 Routines/Budgets
            |       |
            |       +--> WKD-06 Knowledge/Connectors
            |
AIF-02 Privacy/Egress + Secrets
            |
            +--> WKD-06
            +--> WKD-07 Curated Data Gateway
                      |
                      +--> WKD-08 Human Data Workspace

WKD-01 + AIF-06 Local Bridge
            +--> WKD-09 Plugin/Sidecar Integrity

WKD-02..09
            +--> WKD-10 Action Center/Hardening
```

Additional required AIF prerequisite edges (slice ids as in the implementation handoff; a WKD slice may not start until each listed AIF package is qualified):

```text
AIF-03A Model + Prompt Registry             --> WKD-01B Provider Readiness
AIF-02  Privacy/Egress + Secrets            --> WKD-02B PlanGraph Compiler
AIF-04B Context Builder + Tool Translation  --> WKD-02B PlanGraph Compiler
AIF-04A Durable Session + Input Substrate   --> WKD-03 Work/Liveness
AIF-04C Operation Manager + Recovery        --> WKD-03 Work/Liveness
AIF-03D Permission-first Retrieval / RAG    --> WKD-06 Knowledge/Connectors
AIF-08  Operations Insights                 --> WKD-07 Curated Data Gateway
AIF-02  Privacy/Egress + Secrets            --> WKD-09 Plugin/Sidecar Integrity
AIF-07  Action Center                       --> WKD-10 Action Center/Hardening
```

AIF-03/AIF-04 remain the model/runtime substrate. WKD does not replace them.

## 29. First executable leaves

The repository-wide first AIF leaf remains:

`AIF-01A — Capability contract + deny-by-default resolver`

The first WKD-specific leaf after AIF-01A/B is canonical:

`WKD-01A — IntegrationModuleDescriptor + ProviderReadinessSnapshot contracts`

Only the descriptor portion (handoff WKD-01A) depends solely on AIF-01A/B; the `ProviderReadinessSnapshot` portion (handoff WKD-01B) also waits for AIF-03A per §28.

It requires:

- no production provider key;
- no PHI;
- no external connector;
- no model download;
- no direct SQL;
- no browser automation.

Acceptance:

- stable module id/version/digest;
- configured vs health separated;
- capability ids projected but do not grant authority;
- provider readiness has freshness/staleness;
- read path cannot mutate provider configuration;
- disabled/revoked module disappears from new capability resolution;
- synthetic tests + database smoke where persisted.

## 30. Explicit external gates

Not solvable by repository planning alone:

- production provider credentials/contracts;
- production PHI model/provider approval;
- real clinic connector authorization;
- official external system automation rights;
- production BI/data-export approval;
- real user acceptance of Action Center/workflow UX;
- legal/privacy approval for analytics datasets;
- enterprise/on-prem infrastructure evidence;
- clinical governance for any workflow touching clinical authority.

These are not architecture gaps and must not be fabricated as complete.

## 31. Definition of implementation-ready

This amendment is implementation-ready only when:

- source pins and adoption modes are exact;
- authority ownership is unchanged;
- provider readiness and model admission are separate;
- model plan and executable operations are separate;
- work hierarchy/dependency/ownership/execution are separate;
- blocked/waiting work is routable;
- durable interactions exist;
- routine/budget semantics are explicit;
- module/plugin permissions are explicit;
- connector/RAG deletion and ACL propagation are explicit;
- data access tiers and grants are explicit;
- agent raw SQL is rejected by default;
- optional privileged SQL has defense-in-depth controls;
- local/private/no-egress behavior fails closed;
- observability, recovery, security, privacy and retention are explicit;
- first implementation leaf is bounded and dependency-correct;
- the readiness checklist (dimensions 1-204) and the co-authoritative final-hardening addendum (H01-H28, dimensions 205-232) both pass; the base checklist alone is not sufficient, and any later-found gap reopens readiness until it is closed in one of them.

`ZYARA_WORK_KNOWLEDGE_DATA_PLANE_PLAN_COMPLETE = YES`
