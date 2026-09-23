# Zyara AI Operating Fabric Plan — 2026-09-22

**Status:** canonical planning amendment candidate  
**Amended:** 2026-09-23 — decision/runtime donor hardening  
**Mode:** planning only; no production-code authority by this document alone  
**Base main:** `7caa5da39bbf6d1157f42d183280b0e4682bdcf5`  
**Depends on:** canonical N5 closure, Zyara AI-era automation principles, Zyara Network master plan  
**Purpose:** make Zyara's AI-era operating model implementable without turning models, browsers, tools, or agents into healthcare authority.

## 1. Product thesis

Zyara should not become a clinic system with a chatbot attached.

The target is a healthcare operating network in which repetitive work can be understood, prepared, executed, verified, escalated, and measured under explicit authority.

The reusable operating loop is:

```text
EVENT / REQUEST
  -> authoritative context
  -> privacy + consent + policy
  -> decision/risk classification
  -> bounded workflow
  -> tool/browser/local action through an approved capability
  -> human approval when required
  -> typed Zyara domain operation
  -> external/provider receipt
  -> outcome verification
  -> activity + audit + analytics
  -> completion OR owned human exception
```

The collaboration plane already canonicalized in N5 is the authority/control substrate:

- C1: bounded agent identity;
- C2: derived activity;
- C3: approval + human exception queue;
- C4: audit-chain reconstruction.

This plan adds the execution fabric that sits below those controls and above external systems.

## 2. Permanent authority rules

These separations are non-negotiable:

```text
Account != StaffAssignment != AgentIdentity != Practitioner != PractitionerRole != ClinicalPrivilege

AuthoritativeDomainEvent != DerivedActivityEvent

AgentProposal != Approval != ExecutedAction

ToolCall != DomainMutation

BrowserSuccess != BusinessOutcome

ModelScore != PolicyDecision

MessageDelivered != PatientAcknowledged

Appointment != TelehealthSession != Encounter

InsuranceAcceptance != Eligibility != PriorAuthorization != Claim != Payment
```

A model, browser run, tool call, or local automation may produce evidence or a proposal. It does not become the owner of healthcare truth.

## 3. Architectural shape

```text
                    ZYARA ACTION CENTER
           staff / doctor / operator control surface
                            |
                            v
                N5 CONTROL + AUTHORITY PLANE
      AgentIdentity | Activity | Approval | Exception | Audit
                            |
                            v
                 ZYARA DECISION PLANE
     deterministic policy -> fast semantic classifier ->
        evidence-grounded reasoner -> human escalation
                            |
                            v
                 ZYARA CAPABILITY GATEWAY
       typed tools | schemas | credentials | policy | receipts
              /             |                 \
             /              |                  \
            v               v                   v
   ZYARA RUNTIME     GOVERNED BROWSER      LOCAL BRIDGE
  bounded workload   legacy web portals   clinic workstation
 sandbox/limits      API-last fallback    files/devices/apps
            \               |                  /
             \              |                 /
              +--------------+----------------+
                             |
                             v
                   TYPED ZYARA OPERATIONS
   booking | comms | tasks | FHIR | insurance | clinical admin
                             |
                             v
               RECEIPT + OUTCOME VERIFICATION
                             |
                 +-----------+-----------+
                 v                       v
              ACTIVITY                  AUDIT
                 |
                 v
                INSIGHTS
```

## 4. Subsystems

### 4.1 Zyara Capability Gateway

This is the mandatory mediation layer between an agent/workflow and a tool.

A capability definition must include:

```text
Capability
  id
  version
  owner_domain
  input_schema
  output_schema
  read_or_write
  risk_class
  authority_class
  data_class
  tenant_scope
  branch_scope
  consent_requirement
  credential_binding
  egress_policy
  idempotency_contract
  timeout
  retry_policy
  dry_run_support
  expected_receipt
  verification_method
  observability_policy
```

Rules:

- callers request a capability, never raw credentials;
- secrets remain server-side and are referenced by opaque ids;
- every write-capability has an authority class and idempotency contract;
- every consequential external call has an expected receipt and verification method;
- unsupported, stale, or unverified capabilities fail closed;
- provider-specific adapters remain behind a provider-neutral capability contract;
- a capability cannot widen the caller's authority.

Initial capability families:

- scheduling and booking;
- communications;
- provider graph;
- staff/tasks;
- telehealth session operations;
- patient administrative actions;
- document/form operations;
- FHIR/partner adapters;
- insurance/NPHIES;
- analytics reads;
- external browser adapters.

### 4.2 Privacy and Egress Gate

Every model/tool/browser/local boundary must be classified before data leaves its current trust zone.

Minimum classes:

```text
PUBLIC
INTERNAL
PII
PHI
FINANCIAL
CREDENTIAL
SECURITY_SENSITIVE
CLINICAL_SIGNING_REQUIRED
```

The gate decides:

- whether the operation is allowed;
- whether local execution is required;
- whether redaction/minimization is required;
- whether de-identification is permitted and sufficient;
- whether an explicit consent or purpose grant is required;
- whether remote model/tool use is permitted;
- which provider may receive which fields;
- retention policy;
- whether the action must be human-reviewed.

No silent cloud fallback is permitted for a path whose policy requires local execution.

Secrets and credentials are never model input.

### 4.3 Decision Plane

The Decision Plane selects workflow/risk/routing outcomes without conflating model confidence with authority.

Preferred cascade:

```text
deterministic rules
  -> bounded semantic classifier
  -> evidence-grounded structured model
  -> larger reasoner if policy allows
  -> human when confidence/authority/evidence is insufficient
```

Good uses:

- intent category;
- workflow routing;
- urgency category for administrative handling;
- retry-safe vs not-safe;
- approval-required vs not-required;
- document type;
- missing-field classification;
- exception ownership;
- provider/tool selection among already-authorized alternatives.

Prohibited uses as independent authority:

- diagnosis;
- treatment selection;
- prescription issuance;
- clinical-signing decisions;
- insurance truth;
- payment truth;
- credential/privilege truth.

Every model-assisted decision must carry:

- model/runtime identity;
- prompt/policy version;
- structured options;
- score/probability where available;
- threshold/policy version;
- source evidence references;
- abstention state;
- downstream authority decision.

No majority vote or model consensus may override policy.

### 4.4 Agent Workload Runtime

The runtime is inspired by task/workspace/gateway/model separation.

Each `AgentRun` must bind:

```text
run_id
tenant_id
branch_id
agent_identity_id
human_sponsor_id
workflow_version
workspace_profile
model_profile
capability_grants
network_egress_allowlist
data_class_ceiling
cpu/memory/time budget
model/token/cost budget
parallelism ceiling
checkpoint policy
approval binding
correlation_id
```

Required controls:

- isolated workspace;
- finite execution budget;
- explicit network egress;
- no inherited host secrets;
- no unrestricted shell/filesystem for care agents;
- cancellation;
- suspend/resume only when state can be restored safely;
- deterministic terminal states;
- orphan-run cleanup;
- loop/cost protection;
- full action receipts;
- no agent-generated capability widening.

The runtime backend must remain pluggable:

1. local bounded process/container;
2. stronger sandbox where required;
3. cluster execution later if scale justifies it.

Kubernetes/cluster operation must not become a requirement for a small clinic installation.

### 4.5 Governed Browser Bridge

Browser automation is a last-mile integration adapter, not the primary integration architecture.

Priority order:

```text
native Zyara operation
-> documented API/FHIR/NPHIES
-> supported partner adapter
-> governed browser automation
-> human-only exception
```

A browser run must bind:

- exact allowed host(s);
- credential reference;
- tenant/branch;
- purpose;
- capability/action;
- start state;
- bounded page/action count;
- download policy;
- upload policy;
- prompt-injection policy;
- screenshot/DOM evidence policy;
- expected final evidence;
- outcome verification rule.

Web content is untrusted input.

A page instruction can never grant new tool, network, credential, filesystem, or healthcare authority.

Browser success is not business success. A portal submission must be reconciled against a reference number/status or remain `UNKNOWN`.

### 4.6 Local Bridge

Some clinics will require access to local files, printers, scanners, legacy desktop software, PACS launchers, or local network endpoints.

The Local Bridge must expose named capabilities rather than arbitrary machine control.

Examples:

- scan document;
- print approved document;
- read from an approved import folder;
- export an approved file to an approved destination;
- open a deep link into a local app;
- call a bounded local service;
- observe a specific device health endpoint.

Forbidden by default:

- arbitrary shell;
- arbitrary filesystem traversal;
- credential-store access;
- ambient screen capture;
- unrestricted process launch;
- clipboard harvesting.

Every local capability requires explicit path/process/device allowlists and receipts.

### 4.7 Zyara Action Center

The Action Center is the operator-facing surface for the fabric.

It is not another generic inbox.

It should answer:

- what needs attention now?
- what did automation already finish?
- what is waiting for approval?
- what failed or is unknown?
- what can safely be retried?
- what is overdue?
- what did the system change?
- what evidence supports the state?
- what workflow is causing repeated friction?

Primary cards:

- approval required;
- exception needs owner;
- external status unknown;
- communication failure;
- schedule conflict;
- eligibility/auth pending;
- provider-data freshness issue;
- automation paused;
- repeated manual pattern candidate;
- SLA/anomaly alert.

Every card must resolve to authoritative source records and C3/C4 evidence.

Action Center must never present a derived AI summary as the only evidence for a consequential action.

### 4.8 Operations Insights

Operational analytics must be derived from privacy-approved events/materialized views.

Core measures:

- workflow volume;
- automation rate;
- human handoff rate;
- false/unsafe proposal rate;
- retry rate;
- unknown-outcome rate;
- approval latency;
- exception age;
- external-provider failure rate;
- time saved estimate with methodology;
- cost per workflow;
- model/tool cost;
- tool/provider reliability;
- queue SLA;
- patient communication success;
- scheduling recovery;
- eligibility/prior-auth turnaround where implemented.

Automation rate is not a quality metric by itself.

Advanced BI tools such as Superset may be optional self-hosted adapters over approved analytical views. They must not query unrestricted PHI transactional tables.

## 5. Workflow compilation

Zyara should be able to turn repeated clinic work into governed workflows without granting ambient authority.

```text
observe repeated manual work
-> minimize/redact capture
-> define desired outcome
-> map steps to typed capabilities
-> define policy/consent/authority
-> define receipts + verification
-> define exception states
-> simulate on synthetic fixtures
-> human review
-> versioned activation
-> canary/staged rollout
-> monitor
-> revise or disable
```

A workflow version is immutable after activation. Changes create a new version.

## 6. Execution semantics

Every durable workflow must define:

- trigger;
- owner;
- correlation id;
- actor;
- authority;
- current state;
- next safe action;
- retry count;
- deadline;
- idempotency key;
- external references;
- evidence refs;
- approval refs;
- result;
- unknown state;
- compensation/correction path.

Standard terminal states:

```text
SUCCEEDED
FAILED_TERMINAL
CANCELLED
EXPIRED
NEEDS_HUMAN
UNKNOWN_EXTERNAL_OUTCOME
```

Unknown external outcomes must never be converted into success merely to close a queue.

## 7. Security and abuse model

The implementation must explicitly test:

- prompt injection from webpages/documents/messages;
- tool schema manipulation;
- capability confused-deputy attacks;
- body-supplied tenant/branch authority;
- cross-tenant credential use;
- cross-branch credential use;
- stale approval reuse;
- changed-parameter approval reuse;
- agent self-approval;
- model output attempting to widen scope;
- secret exfiltration;
- browser redirect to non-allowlisted hosts;
- download/upload abuse;
- local path traversal;
- symlink/reparse-point escape where relevant;
- shell metacharacter injection;
- infinite-loop/cost burn;
- replay;
- duplicate external submission;
- missing receipt;
- forged receipt;
- stale provider state;
- data-retention bypass;
- analytics re-identification;
- PHI leakage into logs/traces.

## 8. Reliability

Required cross-cutting properties:

- outbox-backed durable intent;
- idempotent writes;
- at-least-once event tolerance;
- backoff;
- dead-letter/exception ownership;
- cancellation;
- timeout;
- reconciliation;
- safe resume;
- orphan cleanup;
- provider circuit breakers;
- explicit partial/unknown states;
- health checks;
- versioned capability contracts;
- rollback/correction, not hidden history rewrite.

## 9. Deployment profiles

### Clinic Standard

- Zyara cloud or self-hosted tenant services;
- no local bridge required;
- approved remote models/tools only through the gateway.

### Clinic Private

- local bridge and selected local models;
- stricter no-egress classes;
- optional self-hosted supporting services.

### Enterprise / Hospital Network

- stronger sandbox/worker pool;
- central policy;
- SSO;
- per-site egress;
- institutional connectors;
- high-availability supporting services.

The product model stays the same across profiles.

## 10. Source-use decisions

The detailed source matrix lives in:
`docs/research/ZYARA_AI_OPERATING_FABRIC_SOURCE_ADOPTION_2026-09-22.md`.

High-level roles:

- Google AX: architecture reference for Task/Workspace/Gateway/Model separation and workload lifecycle;
- Treg: selective adaptation/copy candidate for server-side tool registry, secret mediation, health and audit patterns;
- SemIf/Decider: qualification candidates for bounded semantic decision routing;
- TinyFish/AgentQL: governed browser integration references/components;
- Laya: Action Center / human-approval / daily-operations UX reference pending exact source pin;
- Desktop Commander: Local Bridge product/reference pattern pending exact source pin;
- Bespoke Nimble: structured evidence-grounding candidate only after healthcare/privacy benchmarks;
- Laya-CoreML: local typed-decision provider candidate for Apple-Silicon deployments after task/locale calibration;
- classifier.dev: batch-classification/versioning/evaluation pattern; hosted public endpoint is not a PHI production path;
- Jev Search: search-shaping/prefilter pattern only, never authorization;
- Unreal Agent: high-priority durable session, pure tool-translation and serializable-operation runtime donor;
- founder-owned repositories: preferred sources for authority, privacy, sandbox, workflow, analytics, voice, evidence and verification patterns.

Detailed 2026-09-23 donor deep dive:

`docs/research/ZYARA_DECISION_AGENT_RUNTIME_DONOR_DEEP_DIVE_2026-09-23.md`

## 11. Dependency insertion into the Zyara roadmap

This plan does **not** block the already-authorized N6 Connect program.

Use a cross-cutting `AIF` program:

```text
N5 complete
  |
  +--> N6 Connect ------------------------------+
  |                                             |
  +--> AIF-01 Capability Gateway Contracts      |
        -> AIF-02 Privacy/Egress + Secrets      |
        -> AIF-03 Decision Plane Qualification  |
        -> AIF-04 Agent Runtime                  |
        -> AIF-05 Governed Browser Bridge -------+--> N8 external portal fallbacks
        -> AIF-06 Local Bridge                   |
        -> AIF-07 Action Center                  |
        -> AIF-08 Operations Insights            |
        -> AIF-09 End-to-end qualification ------+--> N9 automation-scale
```

Dependency rules:

- N6 media/session work may proceed without the full AIF.
- N7 clinical-domain work may proceed, but new remote-model paths must honor AIF privacy/egress contracts once admitted.
- N8 API/NPHIES work may proceed independently.
- N8 browser-portal automation requires AIF-01, AIF-02 and AIF-05.
- N9 broad agent automation requires AIF-01 through AIF-06.
- Action Center execution controls require C3/C4 plus AIF-01; read-only operational views may arrive earlier.
- production authorization requires AIF-09 for every enabled AI/tool/browser/local execution class.

## 12. Implementation packages

### AIF-01 — Capability Gateway Contracts

Deliver:

- capability registry contract;
- schema/version model;
- risk/authority/data classes;
- credential-ref contract;
- egress policy reference;
- idempotency/retry/receipt contract;
- provider adapter SPI;
- deny-by-default resolver.

Exit:

- an agent/workflow can request only a named capability;
- no raw secret path exists;
- authority narrowing is enforced;
- synthetic and DB-backed scope tests pass.

### AIF-02 — Privacy / Egress / Secret Mediation

Deliver:

- data classification;
- purpose/consent binding;
- provider data-boundary manifests;
- redaction/minimization pipeline;
- local-only/no-egress policy;
- secret resolver;
- egress enforcement contract;
- trace/log redaction.

Exit:

- every model/tool/browser/local invocation produces an egress decision receipt;
- secrets cannot enter model/tool payloads;
- no-silent-cloud-fallback tests pass.

### AIF-03 — Decision Plane Qualification

Deliver:

- deterministic rules;
- model adapter contract;
- typed option/result schema;
- abstention;
- thresholds;
- calibration/evaluation harness;
- Arabic/Saudi Arabic/code-switch fixtures where the use case involves patient/staff language;
- decision receipt.

Exit:

- model output cannot grant authority;
- uncertainty is explicit;
- benchmark determines whether SemIf, Decider, another local model, or no model is admitted per task class.

### AIF-04 — Agent Runtime

Deliver:

- AgentRun lifecycle;
- workspace profile;
- network policy;
- model profile;
- capability grants;
- time/cost/parallelism budgets;
- cancellation;
- checkpoint/suspend only where safe;
- cleanup receipt;
- local sandbox backend.

Exit:

- bounded run cannot exceed declared egress/capability/budget;
- cancellation and cleanup are proven;
- no unrestricted host secret/filesystem inheritance.

### AIF-05 — Governed Browser Bridge

Deliver:

- host-scoped browser profile;
- credential mediation;
- prompt-injection isolation;
- bounded navigation/actions;
- download/upload policy;
- structured extraction;
- evidence capture;
- outcome verifier;
- unknown-result reconciliation.

Exit:

- synthetic hostile-page campaign passes;
- redirect and exfiltration attempts fail closed;
- duplicate submissions are prevented;
- browser completion cannot falsely confirm a business outcome.

### AIF-06 — Local Bridge

Deliver:

- named local capabilities;
- path/device/process allowlists;
- platform-specific isolation;
- scanner/print/import/export pilot capabilities;
- receipts;
- local-only policy.

Exit:

- arbitrary shell/filesystem access remains unavailable;
- traversal/symlink/reparse escape tests pass;
- platform capability differences are explicit.

### AIF-07 — Action Center

Deliver:

- unified attention feed;
- approval queue;
- exception queue;
- automation status;
- receipts/evidence drill-down;
- pause/resume/disable controls;
- workflow version view;
- provider/tool health.

Exit:

- every action resolves to authoritative state;
- no derived summary is the sole basis for a protected action;
- accessibility/i18n/RTL gates pass.

### AIF-08 — Operations Insights

Deliver:

- privacy-approved event model;
- curated materialized views;
- workflow/tool/model cost and reliability;
- queue/SLA metrics;
- optional BI adapter contract.

Exit:

- no unrestricted PHI analytics path;
- denominators/missingness visible;
- export is audited;
- external BI sees only approved views.

### AIF-09 — Whole-Fabric Qualification

Deliver:

- cross-domain threat campaign;
- recovery/replay campaign;
- cost-loop tests;
- provider outage tests;
- security review;
- privacy review;
- restore/reconciliation drills;
- exact coverage matrix.

Exit:

- every enabled capability has authority, data, egress, receipt, verification and failure semantics;
- unsupported areas remain explicit;
- no production-readiness claim without external evidence.

## 12A. Model, prompt, retrieval, and lifecycle closure

The initial execution-fabric design is not implementation-ready unless the model lifecycle, retrieval context, rollout controls, retention, and schema evolution are explicit.

### 12A.1 Model Fleet Registry

Zyara must own a provider-neutral registry for every model runtime that may influence an operational workflow.

A `ModelProfile` must bind:

```text
model_profile_id
provider
model_id
model_revision_or_digest
runtime_class
deployment_location
license_or_terms_ref
data_residency
allowed_data_classes
allowed_task_classes
context_limit
tool_use_allowed
structured_output_contract
cost_policy
latency_class
health_state
admission_state
evaluation_bundle_digest
```

Rules:

- no model is admitted globally; admission is per task class and data class;
- local and remote models use the same contract;
- exact weights/revision/digest are recorded for local models where possible;
- remote provider aliases such as `latest` cannot be the only production identity;
- fallback must never silently widen data residency, provider data-use, retention, or PHI policy;
- model health may choose only among already-authorized alternatives;
- model license/terms and update strategy are recorded before production admission.

### 12A.2 Prompt / policy / schema registry

Prompts are executable policy-adjacent artifacts and must be versioned.

Every production prompt/template records:

- immutable prompt/template id + version;
- owning task class;
- expected structured-output schema;
- allowed tools/capabilities;
- instruction digest;
- localization variant;
- model compatibility;
- safety policy version;
- evaluation bundle;
- rollout state;
- rollback target.

Prompt edits must not silently change action authority.

### 12A.3 Retrieval / RAG context plane

RAG is context, not authority.

Every retrieval plan binds:

- tenant;
- branch/project/patient scope;
- requester/agent identity;
- purpose;
- source collections;
- source authorization;
- source freshness;
- retrieval method;
- reranker/model version;
- maximum context budget;
- evidence refs;
- data class;
- retention.

Rules:

- authorize before retrieval, not after ranking;
- vector indexes, graph projections, embeddings, summaries and caches are rebuildable projections;
- canonical healthcare truth remains in Zyara domain stores;
- deletion/revocation propagates to indexes/caches;
- cross-tenant index leakage is prohibited;
- retrieved documents/web pages are untrusted input and may contain prompt injection;
- consequential outputs link to evidence or explicitly state evidence insufficiency;
- stale/contradictory evidence remains visible.

Prefer Morize/MedScale patterns for local-first retrieval and provenance.

### 12A.4 Evaluation, regression, and drift

Every admitted model/prompt/decision class requires a versioned evaluation bundle.

Minimum categories:

- structured-output validity;
- task accuracy;
- abstention quality;
- false-confident unsafe outcomes;
- Arabic;
- Saudi Arabic;
- Arabic/English code switching where relevant;
- PHI leakage;
- prompt injection;
- capability escalation attempts;
- long-context degradation;
- stale-context handling;
- latency;
- resource use;
- cost;
- deterministic regression fixtures;
- red-team cases.

Lifecycle:

```text
candidate
-> offline qualification
-> shadow
-> limited canary
-> monitored rollout
-> admitted
-> degraded / suspended / revoked
```

A new provider/model revision is a new candidate until qualified.

Track drift signals such as structured-output failures, abstention, human override/correction, unsafe proposals, latency/cost shifts, and provider/model-version changes.

Drift may trigger review but must not autonomously rewrite thresholds or policy.

### 12A.5 Agent-class separation

Do not use one generic `Zyara AI` authority profile.

At minimum distinguish:

- patient-navigation agent;
- clinic-operations agent;
- clinician-assist agent;
- analytics/research agent;
- integration/browser agent.

Each has its own data ceiling, capability ceiling, retention, approval policy and UI disclosure.

A patient-facing agent cannot inherit clinic-operations capabilities merely because the same model backend is used.

A clinician-assist agent may prepare clinical material but cannot sign, prescribe, or mint clinical truth.

### 12A.6 Feature flags, kill switches, and rollback

Every executable AI/tool/browser capability supports:

- staged activation;
- tenant/branch feature flag;
- emergency global disable;
- provider-specific disable;
- model-specific disable;
- capability-specific disable;
- rollback to last-known-qualified version;
- defined in-flight behavior when disabled;
- auditable activation changes.

Emergency disable must not depend on the failing provider/model/tool.

### 12A.7 Retention, deletion, and backup propagation

Define retention/deletion for:

- prompts/responses;
- decision receipts;
- browser evidence/screenshots;
- downloads/uploads;
- tool payloads;
- workflow state;
- activity/audit projections;
- analytics views;
- retrieval indexes/embeddings;
- backups.

Each class defines purpose, min/max retention, legal hold, deletion authority, deletion propagation, and backup/restore implications.

Raw PHI-bearing model prompts/responses are not retained by default merely for observability.

### 12A.8 Service levels and observability

Each execution class defines SLIs/SLOs, such as:

- capability resolution latency;
- success rate;
- UNKNOWN external outcome rate;
- provider timeout rate;
- approval latency;
- exception age;
- browser reconciliation latency;
- structured-output failure rate;
- secret-resolution failure rate;
- cost per successful workflow.

OpenTelemetry-compatible traces may be used only with PHI-light attributes and policy-controlled payload capture.

### 12A.9 Schema evolution and compatibility

Capability, workflow, receipt, decision, and event schemas need explicit compatibility rules.

Every breaking change defines:

- reader/writer compatibility;
- migration path;
- old-version support window;
- replay behavior;
- rollback behavior;
- historical receipt interpretation;
- adapter compatibility.

Historical receipts must remain interpretable after schema evolution.

## 12B. Fast decision throughput and durable agent-runtime closure

The 2026-09-23 donor review adds explicit architecture for high-throughput typed decisions and crash-safe agent execution.

### 12B.1 Typed local decision providers

A local typed-decision provider may optimize latency/cost/privacy, but it does not own policy.

Laya-CoreML is a candidate provider for Apple-Silicon deployments.

Provider admission must bind:

```text
provider_profile_id
runtime_revision
model_bundle_revision_or_digest
tokenizer_config_digest
compute_profile
context_limit
calibration_profile
allowed_task_classes
allowed_locales
device_requirements
offline_required
fallback_policy
evaluation_bundle
```

Rules:

- admission is per task class;
- local-only tasks never silently fall back to remote;
- conversion fidelity is not task accuracy;
- model probability is never healthcare authority;
- calibration transforms/clamps must be represented in provider/evaluation identity;
- current Laya-CoreML Python/macOS support does not prove iOS readiness.

### 12B.2 Decision batch gateway

High-volume low-authority classification should not require one large-model turn per item.

Zyara owns a provider-neutral batch contract inspired by classifier.dev patterns.

A batch must preserve:

- stable item id;
- original ordering;
- per-item result/error;
- confidence availability;
- uncertainty/abstention;
- escalation state;
- provider/model/revision;
- usage/cost;
- cancellation/timeout;
- partial failure.

An uncertainty escalation may call another already-authorized provider or route to a human.

A "smart" or second-pass provider never expands authority.

The public classifier.dev hosted endpoint is not approved for PHI by this plan because request content can be forwarded to upstream model providers. Production PHI use requires a separately qualified private/self-hosted path plus an admitted backend.

### 12B.3 Retrieval semantic prefilter

A cheap semantic filter may reduce retrieval/context cost only after authorization.

Preferred shape:

```text
authorize source set
-> deterministic/metadata narrowing
-> stable chunking
-> cheap typed semantic filtering
-> evidence-preserving survivors
-> rerank/retrieve/reason
```

Jev Search supplies useful search-shaping patterns but is not admitted as a runtime dependency.

Requirements:

- no arbitrary filesystem crawl;
- no symlink/path escape;
- no raw PHI result-file logging;
- deterministic chunk ids;
- source refs retained;
- cancellation/budgets;
- remote decision calls only after egress approval;
- revoked/deleted sources disappear from subsequent retrieval.

### 12B.4 Durable agent session substrate

An `AgentRun` must have a durable session/event substrate, not only a process lifecycle.

Required concepts:

```text
AgentSession
AgentInput
ContextBuildReceipt
ToolTranslation
OperationSpec
OperationState
```

Each externally submitted input has a caller-supplied stable `input_id` for redelivery deduplication.

This is distinct from an operation idempotency key.

### 12B.5 Pure tool translation

A model-facing tool call must never perform external I/O directly.

Preferred boundary:

```text
model tool call
-> pure validation/translation
-> serializable OperationSpec[]
-> atomically persist call status + operations
-> dispatch
-> execute
-> persist result
-> translate result for model
```

The translator:

- performs no external I/O;
- cannot resolve raw credentials;
- cannot bypass approval;
- cannot expand capability scope;
- emits stable reason codes;
- emits versioned serializable operations.

### 12B.6 Recovery ordering

Before dispatching an operation, Zyara must durably persist enough state to recover without guessing.

Crash points to qualify:

- accepted input;
- model response;
- tool translation;
- operation persisted before dispatch;
- external side effect before receipt;
- receipt before model-facing result.

A crash after an external side effect but before receipt must reconcile instead of blindly retrying.

### 12B.7 Context omission receipt

The context builder must report what the model did **not** see.

`ContextBuildReceipt` records:

- included refs;
- omitted refs;
- truncated refs;
- compacted/summarized refs;
- budget reason;
- builder version;
- authorization scope.

A model may not be presented as having reviewed evidence omitted from context.

### 12B.8 Session forks and compare

Forks may support:

- compare plans;
- simulation;
- alternative agent strategies;
- replay against synthetic fixtures.

Fork rules:

- preserve parent lineage;
- re-evaluate current authorization;
- do not replay completed external side effects;
- use new operation idempotency keys where writes are allowed;
- never reuse stale approvals;
- result comparison is evidence, not authority.

## 12C. Distributed-runtime, label-set, and supply-chain closure

The implementation is not ready until concurrency, failover, label-set semantics, and local model artifact admission are explicit.

### 12C.1 Decision class and label-set registry

A typed classifier must not receive an unversioned ad-hoc label list for consequential workflows.

Define a `DecisionClassSpec`:

```text
decision_class_id
version
purpose
allowed_data_classes
labels/options
label_descriptions
none_or_unknown_semantics
multi_label_policy
threshold_policy
locale_policy
escalation_policy
provider_admission_refs
evaluation_bundle
owner
rollout_state
```

Rules:

- label-set changes create a new version;
- historical receipts retain the exact decision-class version;
- if "none of the above" is a real outcome, the class must model it explicitly;
- providers that force a choice cannot be used when the class requires abstention/unknown;
- thresholds are per decision class/provider/locale, not global;
- label order must not become hidden policy;
- class definitions may not encode protected or clinically inappropriate routing.

### 12C.2 Fairness and operational harm evaluation

Even administrative routing can create access harm.

For decision classes that affect queue priority, access, outreach, scheduling, financial workflows, or human-review burden, evaluation must inspect:

- language/locale performance;
- Saudi Arabic and code-switching;
- demographic proxy leakage;
- disparate false-positive/false-negative patterns where lawful data is available;
- systematic escalation burden;
- denial/deprioritization risk;
- missing-data behavior.

A fairness metric never overrides a clinical/legal policy rule, but material disparities block admission until understood and mitigated.

### 12C.3 Local model artifact supply chain

A local model/runtime bundle is executable supply-chain material.

Admission records:

- source;
- exact revision;
- model artifact digest;
- tokenizer/config digest;
- conversion toolchain;
- conversion source revision;
- license/NOTICE/model-card obligations;
- expected architecture;
- supported device/runtime;
- signature/checksum verification;
- quarantine/rollback state.

Rules:

- artifact hash mismatch fails closed;
- model update is a new candidate, not an in-place silent replacement;
- rollback target remains available where operationally required;
- local model download/update must honor the same egress and provenance controls as remote providers;
- Apple-specific providers remain optional; Zyara contracts must support non-Apple local providers later.

### 12C.4 Session ordering and causal identity

Each durable session uses explicit monotonically increasing event sequence numbers or an equivalent canonical ordering.

Every accepted input, model response, tool translation, operation, result, approval, cancellation, and terminal transition records:

- session id;
- event id;
- causal parent/ref;
- sequence/version;
- correlation id;
- actor;
- observed time.

Concurrent inputs must either:

- serialize through one session coordinator; or
- declare an explicit causal/merge model.

Last-write-wins on consequential agent state is prohibited.

### 12C.5 Operation dependencies

A tool translation may emit more than one operation.

`OperationSpec` therefore supports explicit dependencies:

```text
operation_id
depends_on[]
parallel_group?
join_policy
failure_policy
```

Rules:

- no operation runs before required predecessors are durably successful;
- parallel execution must not violate capability/credential/budget ceilings;
- joins preserve partial/failed/unknown outcomes;
- downstream operations do not run when an upstream outcome is UNKNOWN unless policy explicitly permits it.

### 12C.6 Leases and fencing

Crash recovery must prevent two workers from executing the same durable operation concurrently.

The operation manager requires:

- claim/lease state;
- lease expiry;
- worker identity;
- monotonically increasing fencing token or equivalent compare-and-set generation;
- heartbeat where appropriate;
- bounded takeover;
- terminal-state immutability.

A stale worker with an old fence cannot commit a newer result.

External APIs still require their own idempotency/reconciliation because internal fencing cannot make a third-party side effect exactly-once.

### 12C.7 Transactional dispatch

Use transactional outbox/equivalent durable intent so that:

```text
persist tool-call status
+ persist operation specs
+ persist dispatch intent
= one durable transaction boundary
```

Dispatch happens only from committed intent.

Do not claim exactly-once execution. The target is:

- durable at-least-once dispatch;
- idempotent/reconcilable side effects;
- explicit UNKNOWN when proof is insufficient.

### 12C.8 Receipt integrity and result provenance

An `ExecutionReceipt` binds:

- operation spec digest;
- capability definition/version digest;
- approval binding;
- credential binding refs (opaque);
- adapter/version;
- worker/runtime identity;
- external reference ids;
- start/end times;
- result/status;
- verification result;
- evidence refs;
- previous receipt if correcting/reconciling.

High-consequence receipts should be tamper-evident through append-only storage plus digest chaining or equivalent integrity controls.

### 12C.9 Human-intent binding

For user-initiated consequential actions, approval/confirmation must bind to what the person actually saw.

The confirmation record includes:

- human actor;
- human-readable action summary;
- normalized parameters digest;
- data/recipient scope;
- expiry;
- one-time/reusable semantics;
- capability/version;
- UI/prompt version where material.

Material parameter changes invalidate the confirmation.

### 12C.10 Session retention, compaction, and legal hold

Session history may contain PHI/PII even when tool receipts are minimized.

Define separately:

- canonical audit events;
- model context snapshots;
- raw prompts/responses;
- compacted summaries;
- operation payload refs;
- attachments.

Compaction can reduce model context but cannot rewrite canonical audit history.

Deletion/legal-hold propagation follows the retention policy while preserving the minimum immutable evidence required by law/policy.

### 12C.11 Hard parser and amplification limits

Untrusted model/provider outputs need structural limits before they become runtime objects.

Enforce:

- maximum tool calls per turn;
- maximum operations per tool call;
- maximum nesting/depth;
- maximum argument bytes;
- maximum batch items;
- maximum label/options count;
- maximum context refs;
- maximum fan-out/delegation;
- schema additional-property policy;
- numeric/string length bounds.

Oversized/invalid output fails safely before persistence or dispatch.

## 13. First implementation leaf

The first implementation leaf after this plan is accepted is:

`AIF-01A — capability contract + deny-by-default registry resolver`

It should be small and non-invasive:

- no browser;
- no new model;
- no cluster runtime;
- no external credentials;
- no PHI;
- no Action Center UI.

It creates the typed boundary all later fabric components depend on.

N6/T1 media-engine qualification remains independently executable in parallel.

## 14. Definition of ready

This plan is implementation-ready when:

- authority boundaries are explicit;
- every external execution path is mediated;
- secret handling is explicit;
- privacy/egress is explicit;
- retries/idempotency/outcome verification are explicit;
- browser/local execution is bounded;
- model decisions cannot grant authority;
- human approval/exception integration is explicit;
- observability/cost/quality are explicit;
- source adoption has exact pins or a mandatory pin-before-copy gate;
- roadmap dependencies do not unnecessarily block N6/N7;
- every slice has an evidence-based exit gate.

## 15. Frozen architecture decisions

These decisions close ambiguity before implementation:

1. **Zyara owns the capability contract.** Donor registries/runtimes may implement adapters; they do not own Zyara authorization.
2. **Capability definitions are deployment/admin authority, never agent-authored runtime state.** Registration/change requires explicit trusted authority, versioning and a content digest.
3. **N5 remains the approval/audit authority plane.** AIF does not invent another approval or exception system.
4. **Existing outbox + durable-operation semantics are the default workflow substrate.** Qualify a larger engine such as Temporal only when a measured workflow need exceeds the current substrate.
5. **Every runtime run receives an ephemeral workload identity.** It must be narrower than the sponsoring AgentIdentity and expire with the run.
6. **Credentials are subject-scoped.** A credential binding must identify whether it belongs to the tenant, branch, human delegate, service account, or external integration and may not be reused across subjects by convenience.
7. **Browser automation is API-last.** Human takeover/MFA is an explicit state, not a reason to capture a human password or second factor.
8. **The Local Bridge is a paired device/service identity.** Pairing, certificate/key rotation, revocation and device health are part of its trust contract.
9. **Models are untrusted decision-support components.** Model/package/provider identity, exact version and data-boundary manifest are part of every admitted ModelProfile.
10. **No agent may register a new tool, widen a schema, change policy, alter its evaluator, or raise its own budget/capabilities during a run.**
11. **Backpressure is explicit.** Per-tenant/provider concurrency, rate limits and circuit breakers must prevent one workflow from exhausting a clinic or provider.
12. **Analytics is downstream.** Operational metrics never become healthcare authority and must tolerate delayed/missing events honestly.
13. **External provider terms and automation rights are qualification inputs.** Technical browser success does not authorize use of a portal.
14. **Local/private modes fail closed on unavailable local capability.** They do not silently route PHI to cloud services.
15. **Donor code is replaceable.** Public Zyara contracts and evidence remain stable even when a donor library/runtime changes.

`ZYARA_AI_OPERATING_FABRIC_PLAN_READY = YES`
