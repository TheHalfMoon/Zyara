# Zyara AI Operating Fabric — Implementation Handoff

Initial date: 2026-09-22  
Amended: 2026-09-23  
Initial planning base: `7caa5da39bbf6d1157f42d183280b0e4682bdcf5`  
2026-09-23 hardening base: `c17b654f6836997751967157728c664227b3e7e2`  
Authority: `docs/canonical/ZYARA_AI_OPERATING_FABRIC_PLAN_2026-09-22.md`

This handoff is implementation-ready but does not authorize big-bang delivery. Each leaf must be revalidated against live main before branch creation.

## 1. Live-state rule

Before every leaf:

1. fetch canonical `main`;
2. inspect open PRs;
3. inspect current migrations;
4. inspect affected packages;
5. re-evaluate whether another canonical slice already solved part of the problem;
6. branch from exact main;
7. use the next available migration number;
8. preserve PR #94 or its successor unless separately reconciled.

N6 Connect remains independently executable. Do not stall N6 while implementing AIF foundations.

## 2. Existing Zyara primitives to reuse

The fabric must compose the existing system rather than replace it.

| Existing package | Reuse |
|---|---|
| `@zyara/authorization` | tenant/branch/human-role authorization |
| `@zyara/collaboration` | agent identity, activity, approvals/exceptions, audit chain |
| `@zyara/adapter-harness` | certified external adapter capability concepts |
| `@zyara/adapter-ops` | durable external operation + UNKNOWN/reconciliation semantics |
| `@zyara/integration-ops` | staged rollout and reconciliation |
| `@zyara/action-confirmation` | exact challenge binding |
| `@zyara/consent-boundaries` | purpose-bound consent |
| `@zyara/events` | versioned minimal-PHI events/outbox semantics |
| `@zyara/navigation-safety` | existing safe-navigation policy where applicable |
| `@zyara/navigation-tools` | existing typed AI/navigation tools |
| `@zyara/analytics` / `@zyara/partner-analytics` | metrics and governed exports |

Do not create a second authorization system, second approval system, second outbox, or second exception queue.

## 3. Dependency graph

```text
AIF-01A Capability contract
  -> AIF-01B registry/resolver
      -> AIF-02A data/egress policy
      -> AIF-02B credential mediation
          -> AIF-03A model/prompt registry
              -> AIF-03B decision provider qualification
              -> AIF-03C decision batch gateway
              -> AIF-03D retrieval/RAG context plane
          -> AIF-04A durable session/input substrate
              -> AIF-04B context builder + pure tool translation
                  -> AIF-04C operation manager + recovery
                      -> AIF-04D fork/compare
          -> AIF-05 browser bridge
          -> AIF-06 local bridge
              -> AIF-07 action center execution controls
              -> AIF-08 operations insights
                  -> AIF-09 whole-fabric qualification
```

Parallelism:

- N6 may run in parallel with AIF-01/AIF-02.
- AIF-03 and AIF-04 may proceed in parallel after AIF-02 contracts stabilize.
- AIF-05 and AIF-06 require AIF-01/AIF-02.
- AIF-07 read-only views can begin after C2/C3/C4; action execution waits for AIF-01.
- AIF-08 can start metric-contract work early but external BI admission waits for privacy-approved views.
- AIF-09 requires all enabled fabric classes.

## 4. AIF-01A — Capability contract

### Goal

Create the provider-neutral contract that all AI/workflow/browser/local execution must use.

### Preferred repository shape

New package candidate:

`packages/capability-gateway`

It should **compose**, not replace, `adapter-harness`.

Minimum types:

- `CapabilityId`
- `CapabilityVersion`
- `CapabilityDefinition`
- `CapabilityInvocation`
- `CapabilityGrant`
- `CapabilityRiskClass`
- `CapabilityAuthorityClass`
- `CapabilityDataClass`
- `CredentialBindingRef`
- `EgressPolicyRef`
- `InvocationReceipt`
- `VerificationContract`

### Closed authority classes

Reuse the AI-era automation model:

```text
A0_OBSERVE
A1_DRAFT
A2_PREPARE
A3_EXECUTE_LOW
A4_EXECUTE_MED
A5_HUMAN_ONLY
```

### Requirements

- immutable definition version;
- trusted registration authority; agents cannot self-register capabilities;
- content digest over the admitted definition/schema;
- exact JSON-compatible input/output schema reference;
- tenant/branch scope;
- read/write declaration;
- data classification;
- authority class;
- consent purpose;
- credential reference only;
- egress policy reference;
- idempotency contract;
- timeout/retry;
- receipt/verification contract;
- explicit owner domain.

### Tests

- duplicate capability version rejected;
- unknown capability denied;
- write cannot be registered as A0/A1;
- A5 cannot be granted to an AgentIdentity;
- tenant/branch widening rejected;
- credential plaintext rejected;
- unsupported data class rejected;
- version mismatch rejected.

### Non-goals

No external provider call. No model. No browser. No secret store.

### Exit

`CAPABILITY_CONTRACT_QUALIFIED = TRUE`

## 5. AIF-01B — Registry + deny-by-default resolver

### Goal

Resolve a requested capability against actor, tenant, branch, workflow, approval and certification state.

### Integration

Use:

- human membership from `authorization`;
- agent identity/capability from `collaboration`;
- C3 approval for protected actions;
- adapter certification from `adapter-harness`;
- exact confirmations from `action-confirmation` where required.

### Decision output

```text
ALLOW
ASK
DENY
UNDECIDABLE
```

Every decision must carry stable reason codes and an audit/activity-safe receipt.

### Tests

- body-supplied tenant ignored/rejected;
- revoked agent denied;
- expired agent denied;
- cross-branch denied;
- stale approval denied;
- wrong parameter digest denied;
- uncertified adapter denied;
- human-only denied for agent;
- unknown state returns UNDECIDABLE rather than ALLOW.

### DB

Use the next available migration number. Add only the minimum registry/version/grant tables needed for durable qualification, with RLS and append-only history where appropriate.

### Exit

`CAPABILITY_RESOLVER_QUALIFIED = TRUE`

## 6. AIF-02A — Privacy and egress policy

### Goal

Make data movement explicit before any model/tool/browser/local invocation.

### Candidate package

`packages/privacy-egress`

### Must model

- data class;
- source trust zone;
- destination/provider;
- purpose;
- consent requirement;
- minimization transform;
- retention;
- local-only flag;
- egress allow/deny;
- reason;
- policy version.

### Required rule

`CREDENTIAL` is never exportable as payload.

### Tests

- PHI to unapproved provider denied;
- no-silent-cloud-fallback;
- missing purpose denied;
- revoked consent denied;
- minimization happens before egress receipt;
- logs never contain redacted source values;
- local-only class refuses remote provider.

### Exit

`PRIVACY_EGRESS_GATE_QUALIFIED = TRUE`

## 7. AIF-02B — Credential mediation

### Goal

Resolve an opaque `CredentialBindingRef` only inside the execution adapter.

### Contract

The gateway sees metadata; the adapter receives a short-lived resolved secret through a bounded process boundary; the agent/model never receives it.

### Requirements

- tenant ownership;
- branch/provider scope;
- credential subject binding (tenant, branch, human delegate, service account, or external integration);
- rotation;
- expiry;
- least-privilege metadata;
- no secret serialization;
- no secret in events/traces;
- redacted failure messages;
- credential health without exposing value.

### Tests

- wrong tenant denied;
- wrong branch denied;
- expired credential denied;
- rotation invalidates old binding;
- logs/receipts contain only opaque refs;
- model/tool payload serialization fails if secret-like field is attempted.

### Exit

`CREDENTIAL_MEDIATION_QUALIFIED = TRUE`

## 8. AIF-03 — Model / prompt / decision / retrieval plane

### AIF-03A — Model and prompt registry

Before admitting model-backed decisions, implement provider-neutral model and prompt profiles.

Must bind exact model identity/revision where observable, deployment location, data-class ceiling, task-class admission, license/terms reference, runtime/provider health, prompt/template version, structured-output schema, safety policy version, rollout state and evaluation bundle digest.

Tests must prove:

- remote provider alias alone is insufficient for production identity;
- fallback cannot silently widen residency/data-use boundaries;
- patient-agent and clinic-agent profiles cannot exchange capabilities;
- revoked/suspended model profiles cannot execute new work;
- prompt version changes do not mutate historical receipts;
- kill switch works without invoking the affected provider.

Exit:

`MODEL_PROMPT_REGISTRY_QUALIFIED = TRUE`

### AIF-03B — Decision provider qualification

### Goal

Select bounded operational options with explicit uncertainty, never authority.

Every model candidate is admitted per task class only after a versioned evaluation bundle and staged rollout (offline -> shadow -> canary -> admitted).

### Candidate package

`packages/decision-plane`

### Providers

Start with a provider SPI. Deterministic rules are provider zero.

Benchmark candidates separately:

- SemIf;
- Decider;
- Laya-CoreML local typed-decision profiles;
- structured-prediction local models;
- existing approved remote/local model providers.

### Evaluation dimensions

- exact option accuracy;
- calibration;
- abstention quality;
- false confident unsafe routing;
- Arabic;
- Saudi Arabic;
- Arabic/English code switching;
- latency;
- CPU/GPU/RAM;
- cost;
- privacy;
- adversarial prompt resistance;
- structured-output validity.

### Rule

A provider is admitted **per decision class**, not globally.

### Receipt

`DecisionReceipt` must include:

- task class;
- options;
- selected option;
- score/probability if meaningful;
- abstained;
- evidence refs;
- provider/model/version;
- policy/threshold version;
- downstream authorization outcome.

### Exit

At least deterministic provider qualified. Model providers remain optional until benchmarked.

`DECISION_PLANE_FOUNDATION_QUALIFIED = TRUE`

### AIF-03C — Decision class registry + batch gateway

Before batch execution, implement versioned `DecisionClassSpec` definitions with explicit labels/options, unknown/none semantics, thresholds, locale policy, escalation policy and evaluation bundle.

Build a provider-neutral batching layer after at least one decision provider is qualified.

Required contracts:

- `DecisionBatchRequest`;
- stable per-item `input_id`;
- ordered `DecisionBatchItemResult`;
- confidence-availability flag;
- abstention/uncertain state;
- optional escalation marker;
- per-item error;
- provider/model/revision;
- usage/cost;
- timeout/cancellation;
- partial-failure semantics.

Source pattern:

- classifier.dev at the pinned source revision for batch/version/eval/escalation ideas.

Rules:

- hosted classifier.dev is not a PHI production path;
- local-only work cannot fall back to hosted/remote classification;
- uncertain results may escalate only to an already-authorized provider or human;
- a null/unavailable confidence cannot be treated as above threshold;
- batch order/result count must be stable;
- one failed item cannot silently truncate the batch.

Tests:

- decision-class version retained in historical receipts;
- label-set change requires new version;
- required UNKNOWN/none path cannot be forced into a label;
- thresholds are class/provider/locale scoped;
- 1/10/100/1000 synthetic item batches;
- order preserved;
- duplicate input id rejected or deterministically deduplicated by contract;
- null confidence routes to review;
- provider outage;
- partial failure;
- cancellation;
- backpressure;
- cost/usage accounting;
- PHI-to-unapproved-provider denied.

Exit:

`DECISION_CLASS_AND_BATCH_GATEWAY_QUALIFIED = TRUE`

### AIF-03D — Retrieval / RAG context plane

Implement permission-first retrieval contracts only after AIF-02 privacy/egress rules are canonical.

Required concepts:

- `RetrievalPlan`;
- `RetrievalSource`;
- `RetrievalReceipt`;
- source/evidence refs;
- freshness;
- tenant/branch/patient/project scope;
- index/embedding projection identity;
- deletion/revocation propagation;
- prompt-injection handling for retrieved content.

Rules:

- authorize before retrieval;
- canonical truth stays in domain stores;
- indexes/embeddings/summaries/caches remain rebuildable projections;
- no cross-tenant retrieval leakage;
- stale/contradictory evidence remains visible;
- retrieved text cannot grant capabilities.

Exit:

`RETRIEVAL_CONTEXT_PLANE_QUALIFIED = TRUE`

## 9. AIF-04 — Agent runtime

### Candidate package

`packages/agent-runtime`

Unreal Agent at `df8b0ba560da17fd705d941cbeb75eff86c74a1e` is a high-priority runtime-semantics donor. Zyara owns the contracts and adds healthcare authority/privacy boundaries.

### AIF-04A — Durable session + input substrate

Implement:

- `AgentSession`;
- versioned append-only session history;
- stable caller-supplied `input_id`;
- input redelivery deduplication;
- terminal state;
- parent/fork lineage;
- session version compatibility;
- recovery metadata.

Rules:

- input deduplication is not external action idempotency;
- unsupported session versions fail explicitly;
- cross-tenant/branch session resume is denied;
- session persistence contains no raw secrets.

Tests:

- duplicate redelivery;
- crash after accepted input;
- restart/resume;
- unsupported session version;
- revoked agent on resume;
- cross-tenant resume denial.

Exit:

`AGENT_SESSION_SUBSTRATE_QUALIFIED = TRUE`

### AIF-04B — Context builder + pure tool translation

Implement an I/O-pure context builder and tool translator.

`ContextBuildReceipt` records included/omitted/truncated/compacted refs and the budget/version that caused the decision.

A tool translator:

- validates a model-produced call;
- resolves only named capability metadata, never raw secret values;
- performs no external I/O;
- emits a validation error or versioned serializable `OperationSpec[]`;
- cannot self-approve;
- cannot widen capability/tenant/branch/data scope.

Persist model response + tool-call status + operation specs before dispatch.

Tests:

- malformed tool call;
- unavailable capability;
- omitted context is visible;
- translator attempts I/O are structurally impossible/by-contract rejected;
- operation serialization round-trip;
- parameter digest stable;
- stale approval rejected before dispatch.

Exit:

`AGENT_TRANSLATION_SUBSTRATE_QUALIFIED = TRUE`

### AIF-04C — Operation manager + recovery

Runtime contract:

- create run;
- mint an ephemeral workload identity narrower than the sponsoring AgentIdentity;
- start;
- observe;
- dispatch persisted operations;
- cancel;
- suspend/resume only if backend supports safe checkpointing;
- terminate;
- cleanup;
- retrieve receipts;
- reconcile unknown external outcomes;
- claim work with leases/fencing;
- respect explicit operation dependencies;
- dispatch only committed outbox/durable intent;
- emit integrity-bound execution receipts.

Mandatory limits:

- time;
- model/token/cost;
- CPU/memory where backend supports;
- parallelism;
- delegation depth;
- capability count;
- egress hosts.

Backend 1:

Use the smallest bounded local/container backend that can be proven in the current CI environment.

Do not introduce Kubernetes just to imitate AX.

Recovery campaign:

- concurrent claim attempts prove one current fence;
- stale worker result commit rejected;
- dependency predecessor failure/UNKNOWN blocks unsafe successor;
- crash after model response;
- crash after operation persistence before dispatch;
- crash after external side effect before receipt;
- crash after receipt before model-facing result;
- resume without duplicate side effect;
- UNKNOWN external outcome requires reconciliation.

Required negative tests:

- child capability > parent capability;
- host secret inheritance;
- non-allowlisted network;
- timeout ignored;
- cancellation race;
- orphan process;
- runaway loop/cost;
- replay of completed write;
- unpersisted operation dispatch;
- outbox commit without dispatch then recovery;
- duplicate at-least-once dispatch reconciles safely.

Exit:

`AGENT_OPERATION_MANAGER_QUALIFIED = TRUE`

### AIF-04D — Fork / compare

Add bounded session forks only after AIF-04C.

Use cases:

- compare plans;
- simulation;
- synthetic replay;
- alternative model/provider strategy.

Rules:

- parent lineage preserved;
- current authorization re-evaluated;
- completed external side effects are not replayed;
- stale approvals are not inherited;
- child capability ceiling <= current parent/sponsor ceiling;
- comparison output is evidence, never authority.

Exit:

`AGENT_FORK_COMPARE_QUALIFIED = TRUE`
- workspace escape;
- stale approval;
- agent attempts to modify its own policy.

### Exit

`AGENT_RUNTIME_LOCAL_BACKEND_QUALIFIED = TRUE`

## 10. AIF-05 — Governed browser bridge

### Candidate package

`packages/browser-bridge`

### Build order

1. deterministic browser session contract;
2. allowlisted navigation;
3. credential mediation;
4. structured extraction;
5. bounded actions;
6. evidence capture;
7. outcome verification;
8. optional semantic selector/extraction layer after benchmark.

### Threat campaign

- prompt injection in page text;
- hidden instructions;
- redirect to foreign domain;
- download malware/unexpected type;
- upload from unapproved path;
- form-action mismatch;
- duplicate submit;
- ambiguous confirmation;
- DOM changed after approval;
- session expired;
- MFA/human-takeover required without credential capture;
- provider returns success page without business receipt;
- screenshot/HTML contains PHI beyond retention policy.

### Admission candidates

AgentQL/TinyFish patterns may be admitted only after this deterministic contract exists.

### Exit

`GOVERNED_BROWSER_SYNTHETIC_QUALIFIED = TRUE`

Real portal qualification remains separate.

## 11. AIF-06 — Local bridge

### Candidate package/service

`packages/local-bridge-contracts` plus a separately isolated runtime if implementation requires OS access.

### Device trust

The bridge instance is a paired device/service identity with revocation, key/certificate rotation, explicit tenant/branch ownership and health state.

### First capabilities

Choose only two or three for qualification, e.g.:

- approved import folder read;
- approved document print;
- approved scanner ingest.

### Required platform tests

Windows first if that is the clinic/development target; explicitly record unsupported semantics on other platforms rather than pretending equivalence.

### Security campaign

- path traversal;
- symlink/reparse escape;
- UNC/network path widening;
- device path;
- hidden file;
- oversized file;
- file-type confusion;
- command injection;
- arbitrary executable path;
- secret-store access.

### Exit

`LOCAL_BRIDGE_BOUNDED_CAPABILITIES_QUALIFIED = TRUE`

## 12. AIF-07 — Action Center

### Backend contract first

Action Center is a projection of:

- C2 activity;
- C3 approvals/exceptions;
- workflow runs;
- capability receipts;
- provider/integration health;
- SLA/anomaly state.

### UI groups

- Needs attention;
- Waiting for approval;
- Automation running;
- Unknown outcomes;
- Failed/retryable;
- Provider/integration issues;
- Data freshness;
- Recently completed.

### Required interaction

Every protected action opens:

1. authoritative context;
2. proposed exact action;
3. evidence;
4. approval/confirmation;
5. result receipt.

No one-click mutation from an AI summary.

### UX gates

- Arabic/English;
- RTL;
- keyboard;
- screen reader;
- mobile/responsive;
- loading/error/unknown;
- no PHI in notification preview by default.

### Exit

`ACTION_CENTER_OPERATIONAL_QUALIFIED = TRUE`

## 13. AIF-08 — Operations Insights

### Reuse

Extend existing `analytics` / `partner-analytics` rather than creating a second metric authority.

### New metric families

- workflow;
- agent;
- tool;
- model;
- approval;
- exception;
- provider reliability;
- cost;
- unknown outcomes.

### Governed analytical views

Every analytical view must define:

- owner;
- purpose;
- source events;
- data classes;
- joins;
- suppression;
- retention;
- denominator;
- missingness;
- refresh lag.

### Optional Superset

Only through an adapter to approved views. No direct raw transactional DB credentials.

### Exit

`AI_OPERATIONS_ANALYTICS_QUALIFIED = TRUE`

## 12A. Additional runtime admission gates

Before AIF-09, qualify:

- model artifact checksum/signature and rollback;
- exact local model/runtime/toolchain provenance;
- decision-class/label-set versioning;
- locale-specific thresholds;
- fairness/operational-harm review where a decision can affect access/priority/review burden;
- session event ordering and causal lineage;
- operation dependency graphs;
- leases/fencing under concurrent workers;
- transactional outbox/durable dispatch intent;
- receipt integrity/digest chaining or equivalent;
- human-intent binding for consequential actions;
- hard parser/fan-out/amplification limits;
- session retention/compaction/legal-hold semantics;
- governed non-authoritative long-term memory and deletion propagation;
- trusted server-time/clock-skew semantics for leases, approvals and expiry;
- model/provider/runtime incident quarantine, kill switch, forensics and re-admission.

## 13A. Cross-cutting lifecycle gates

Before AIF-09, qualify:

- tenant/branch/model/capability kill switches;
- feature-flag and staged-rollout semantics;
- model/prompt rollback;
- credential rotation/revocation;
- retention/deletion propagation to browser evidence, model traces, analytics, retrieval indexes and backups;
- schema/version compatibility and historical receipt interpretability;
- PHI-light observability;
- execution-class SLIs/SLOs;
- model/provider drift monitoring;
- provider/model degradation without authority widening.

No rollout controller may autonomously weaken policy because a provider is degraded.

## 14. AIF-09 — End-to-end qualification

Run representative scenarios:

1. routine appointment reminder;
2. patient reschedule request;
3. external provider timeout;
4. prior-auth administrative preparation;
5. legacy portal browser check using synthetic portal;
6. local document ingest;
7. model classification abstention;
8. approval required;
9. revoked agent during workflow;
10. provider credential rotation;
11. network outage;
12. recovery after worker crash.

For every scenario prove:

- actor;
- authority;
- privacy;
- consent;
- capability;
- credential scope;
- idempotency;
- receipt;
- verification;
- activity;
- audit;
- exception;
- analytics.

### Exit

`AI_OPERATING_FABRIC_SYNTHETIC_QUALIFIED = TRUE`

This does not mean:

- real clinic validated;
- real payer validated;
- real browser portal validated;
- production security approved;
- production authorized.

## 15. Evidence packet convention

Each leaf creates:

`docs/evidence/AIF/<slice>/`

Minimum:

- `WORK_PACKET.md`
- `PROVENANCE.md`
- `THREAT_MODEL.md` or threat delta
- `JEV_REVIEW.md`
- `OCR_REVIEW.md`
- `RESULT.md`

For donor admission add:

- exact revision;
- exact paths;
- license/permission;
- modifications;
- dependencies;
- security/privacy disposition.

## 16. CI conventions

Each slice may add one bounded workflow if existing CI cannot qualify it.

Every final candidate requires:

- package typecheck;
- package lint;
- targeted tests;
- impacted regression tests;
- boundary check;
- database smoke under non-superuser when schema/RLS changes;
- HTTP `Fastify.inject()` tests when API authority changes;
- exact-head CI;
- post-merge verification.

Do not use green CI as proof of external production validity.

## 17. Jev and code review

If Jev is available, use it at design and exact-diff stages.

Challenge especially:

- confused deputy;
- privacy/egress;
- secret exposure;
- stale approval;
- external unknown outcome;
- browser prompt injection;
- sandbox escape;
- analytics re-identification;
- cost loops.

Use Alibaba Open Code Review when genuinely available. Record tool availability truthfully.

Neither tool can override deterministic repository evidence or policy.

## 18. First executable task

After this planning amendment merges, the first AIF task is:

`AIF-01A — Capability contract`.

However, the project-wide next task may still be N6/T1 if the active canonical roadmap prioritizes Connect. The two are dependency-independent and may be executed on separate branches only if repository governance permits concurrent work.

Do not implement AIF-02+ until AIF-01 contracts are canonical.

## 19. Completion matrix

At AIF closure report separately:

```text
AIF_REPOSITORY_IMPLEMENTATION_COMPLETE
AIF_SYNTHETIC_QUALIFICATION_COMPLETE
REAL_BROWSER_PROVIDER_VALIDATION_COMPLETE
REAL_LOCAL_CLINIC_BRIDGE_VALIDATION_COMPLETE
REAL_MODEL_DECISION_VALIDATION_COMPLETE
PRODUCTION_SECURITY_REVIEW_COMPLETE
PRODUCTION_AUTHORIZED
```

No synthetic/local test may set the real-world fields to true.

`ZYARA_AI_OPERATING_FABRIC_IMPLEMENTATION_HANDOFF_READY = YES`
