# Zyara AI Operating Fabric Plan — 2026-09-22

**Status:** canonical planning amendment candidate  
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
- founder-owned repositories: preferred sources for authority, privacy, sandbox, workflow, analytics, voice, evidence and verification patterns.

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
