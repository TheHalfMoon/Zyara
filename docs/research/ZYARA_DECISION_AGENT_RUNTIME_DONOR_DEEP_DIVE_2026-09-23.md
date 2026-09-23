# Zyara Decision + Agent Runtime Donor Deep Dive — 2026-09-23

**Mode:** PLAN-ONLY source qualification and architecture hardening  
**Planning base:** `c17b654f6836997751967157728c664227b3e7e2`  
**Applies to:** Zyara AI Operating Fabric / AIF-03 + AIF-04 + retrieval prefiltering  
**Founder authorization:** explicit permission stated to copy/use source code from all four supplied sources

## 1. Qualified source pins

| Source | Exact revision | Public license observed | Initial Zyara decision |
|---|---|---|---|
| `mizorewww/laya-coreml` | `4619e0483f07adf39068532e85b42ec2347edb83` | Apache-2.0 + NOTICE | QUALIFY / ADAPT / optional DEPENDENCY for Apple-Silicon local decisions |
| `caio0452/jev_search` | `ea073f6db48f5bff73ae4b9f2240d2d302fb9dc1` | no public LICENSE file observed in this pass | REFERENCE / SELECTIVE_ADAPT only after path-level provenance review |
| `unreallabsai/unreal-agent` | `df8b0ba560da17fd705d941cbeb75eff86c74a1e` | MIT | HIGH-PRIORITY ADAPT for durable agent runtime semantics |
| `mrmps/classifier-dev` | `8f2bb2b84a0d51ad1c9ed3436b64155908354f75` | MIT | ADAPT / SELF-HOST PATTERN / DEV-ONLY public endpoint |

Founder permission is not a replacement for exact provenance, dependency review, third-party model terms, privacy review, NOTICE preservation, or task-specific qualification.

## 2. Why these sources matter together

These sources strengthen two weak points that generic agent frameworks often leave vague:

1. very fast typed decisions before a large reasoner is needed;
2. durable, replay-safe agent execution after a model proposes a tool call.

The preferred Zyara shape is:

```text
authorized context
      |
      v
retrieval candidate prefilter
      |
      v
deterministic rules
      |
      v
typed local / batch decision provider
      |
      +------ uncertain ------> stronger reasoner / human
      |
      v
bounded agent/tool proposal
      |
      v
pure tool translation
      |
      v
persisted serializable operation
      |
      v
execution adapter
      |
      v
receipt + verification + activity/audit
```

The fast decision plane never grants healthcare authority. The runtime never converts model output directly into an untracked side effect.

## 3. Laya-CoreML

### 3.1 What it provides

The supplied repository implements Laya typed decisions on Apple Silicon using Core ML.

Observed source characteristics at the qualified pin:

- local Core ML inference after model download;
- typed `choice`, ordinal `score`, and boolean-like `noul` decisions;
- no autoregressive text generation for the typed decision call;
- published multilingual model variants;
- Apple Neural Engine-specific short-context variants;
- CPU/GPU general-purpose variants;
- model/tokenizer/config bundle provenance and checksums;
- explicit calibration handling;
- benchmark and conversion evidence;
- Apache-2.0 NOTICE with upstream Laya/laya-mlx provenance.

The README explicitly distinguishes conversion fidelity from general task accuracy. Zyara must preserve that distinction.

### 3.2 Best Zyara role

Laya-CoreML is a candidate provider for **local low-latency typed decisions** on Apple-Silicon clinic/doctor workstations.

Strong candidate decision classes:

- administrative intent routing;
- voice command vs non-command;
- workflow category;
- task ownership;
- document routing;
- retry-safe vs review-required hints;
- notification routing;
- UI/action-card prioritization;
- local semantic prefiltering.

It is not an authority for:

- diagnosis;
- prescribing;
- clinical signing;
- insurance eligibility truth;
- appointment truth;
- payment truth;
- credential/privilege truth.

### 3.3 Runtime profiles

Do not define one global "Laya provider".

Use distinct qualified profiles, for example:

```text
LayaCoreML.ShortANE
LayaCoreML.GeneralGPU
LayaCoreML.OfflineRequired
```

Every profile must record:

- exact repository/runtime release;
- exact model bundle/revision/digest;
- tokenizer/config digest;
- compute-unit policy;
- maximum context;
- calibration profile;
- temperature raw/effective behavior where relevant;
- allowed task classes;
- locale qualification;
- device requirements;
- latency/energy benchmark;
- fallback policy.

### 3.4 Calibration invariant

The current source explicitly clamps suspicious fitted calibration temperatures into a bounded range and retains raw values.

Zyara must not throw that information away.

A decision receipt from any calibrated provider should retain enough identity to reconstruct:

- model revision;
- runtime revision;
- calibration artifact/version;
- threshold version;
- selected option;
- scores/probabilities where meaningful;
- whether calibration was transformed/clamped;
- abstention/escalation state.

A high probability is not authority.

### 3.5 Privacy behavior

If a workflow is `LOCAL_ONLY`, an unavailable local Laya runtime must return an explicit unavailable/abstain state.

It must never silently fall back to classifier.dev, TypeSafe, OpenRouter, or another remote provider.

### 3.6 Mobile boundary

The current repository is a Python/macOS package targeting Apple Silicon. It does not by itself prove a production iOS/Android runtime.

Any future iOS use requires a separate native integration/qualification task.

## 4. Jev Search

### 4.1 What it provides

The repository implements a two-phase semantic directory search:

1. discover text/source files and rank likely files/chunks;
2. send prioritized chunks through Jev/OpenRouter Decisions against natural-language criteria.

It supports:

- AND/OR/parenthesized criteria;
- quoted phrases;
- file-extension filtering;
- chunking;
- high-priority-first evaluation;
- parallel decision calls;
- confidence thresholding.

The README itself warns that the project is AI-generated and should not be used in production.

No public LICENSE file was observed at the qualified pin in this pass. Founder permission is recorded, but any direct copied path still requires explicit provenance documentation.

### 4.2 Best Zyara role

Do not adopt the CLI as a healthcare runtime.

Adapt the **search-shaping pattern**:

```text
authorize sources
-> lexical / metadata candidate narrowing
-> chunk
-> cheap typed semantic filter
-> preserve source refs
-> send only surviving evidence to expensive retrieval/reranking/reasoning
```

Possible Zyara uses:

- authorized clinic knowledge search;
- policy/SOP search;
- operations backlog filtering;
- document-routing candidate discovery;
- developer/repository search during engineering;
- RAG prefiltering over already-authorized content.

### 4.3 Required changes before runtime use

- remove direct dependency on OpenRouter;
- route decisions through Zyara Decision Plane;
- enforce tenant/branch/patient/project authorization before reading/chunking;
- preserve evidence/source identifiers;
- no raw PHI in logs/output files;
- no arbitrary filesystem crawl;
- no symlink traversal outside approved roots;
- cancellation and bounded work;
- deterministic chunk identity;
- deletion/revocation propagation;
- prompt-injection treatment for retrieved content.

### 4.4 Security rule

The search provider may answer:

`this chunk probably matches the criterion`

It may not answer:

`this chunk is authorized for the caller`.

Authorization must happen before candidate discovery and again before disclosure.

## 5. classifier.dev

### 5.1 What it provides

At the qualified source pin, classifier.dev is an open-source zero-shot classification service and gateway.

Public documentation/current source shows patterns for:

- batched classification;
- up to large input batches;
- single-label and multi-label classification;
- calibrated confidence where available;
- confidence-null handling;
- uncertain-item review;
- "fast" vs escalation/"smart" patterns;
- API versioning;
- MCP/CLI/SDK surfaces;
- model/provider identity in responses;
- per-request usage/cost accounting;
- rate limits/backpressure;
- privacy-aware logging/pseudonymization;
- evaluation/benchmark harnesses.

The hosted service can forward request content to model providers. It must not be considered local/private merely because the service itself says request content is not stored.

### 5.2 Best Zyara role

Use the source as a pattern for an internal **Decision Batch Gateway**, not as a required public dependency.

Preferred architecture:

```text
Zyara DecisionBatchRequest
  -> privacy/egress gate
  -> admitted provider:
       deterministic
       local Laya/Jev
       approved remote provider
  -> ordered results
  -> uncertain subset
  -> stronger provider / human review
```

Good high-volume uses:

- inbound admin document routing;
- clinic inbox categorization;
- helpdesk/task triage;
- operational event labeling;
- analytics taxonomy enrichment;
- de-identified bulk research/admin categorization;
- semantic prefiltering.

### 5.3 Hosted endpoint rule

The public `classifier.dev` endpoint is not approved for PHI by this planning packet.

It may only be used for:

- public data;
- synthetic fixtures;
- explicitly de-identified/approved inputs after an egress decision;
- development benchmarks.

A production PHI path requires a separately qualified private/self-hosted deployment and a separately qualified model backend.

### 5.4 Confidence/escalation rule

Preserve these semantics:

- confidence may be unavailable/null;
- no calibrated score means no threshold-based automatic path;
- uncertainty should route to review/stronger provider;
- provider/model updates can change answers;
- "smart" escalation is not deterministic truth;
- no confidence threshold may override human-only authority.

### 5.5 Batch integrity

A batch result must preserve:

- input stable id;
- original ordering;
- per-item outcome;
- provider/model;
- confidence/score;
- abstention/uncertain state;
- escalation marker;
- usage/cost;
- partial failure state.

One failed item must not silently truncate the batch.

## 6. Unreal Agent

### 6.1 What it provides

Unreal Agent is an async-first agent harness.

High-value invariants observed at the qualified pin:

- caller-supplied stable input IDs across redelivery;
- session-scoped input deduplication;
- append-only persisted session history;
- explicit operation state;
- session recovery/fork concepts;
- I/O-pure context builder;
- explicit record of omitted/truncated/compacted context;
- tool registry;
- tool translator that validates a model tool call and produces serializable operations;
- translator performs no I/O;
- operation execution tracked separately;
- operation manager abstraction;
- versioned serializable operations;
- recovery tests around partially completed work.

### 6.2 Best Zyara role

This is a high-value donor for **AIF-04 Agent Runtime**.

Zyara should adapt the separation:

```text
LLM tool call
   |
   v
pure translator
   |
   +--> validation error
   |
   v
serializable operation specification
   |
   v
persist operation + call status atomically
   |
   v
operation manager
   |
   v
bounded execution adapter
   |
   v
result
   |
   v
translation to model-facing result + receipt
```

This separation is safer than letting the model-facing tool implementation perform I/O directly.

### 6.3 Zyara-specific additions

Unreal Agent is generic. Zyara must add:

- tenant/branch scope;
- human sponsor;
- N5 agent identity;
- capability grants;
- authority class;
- data ceiling;
- privacy/egress decision;
- credential binding refs;
- approval binding;
- idempotency class;
- external reconciliation state;
- immutable execution receipt;
- healthcare truth boundary.

### 6.4 Context omission manifest

Adopt a first-class `ContextBuildReceipt` containing:

- source refs considered;
- source refs included;
- omitted refs;
- truncation;
- compaction/summarization;
- token/budget reason;
- authorization reason where safe;
- context-builder version.

A model should not act as if it saw data that was omitted.

### 6.5 Session fork rule

Session/runtime forks are useful for:

- comparing plans;
- simulation;
- alternative workflow proposals;
- safe replay.

Forks must not duplicate external side effects.

A fork inherits read context only as authorized. Write operations need new idempotency/capability/approval checks.

### 6.6 Input redelivery/idempotency

Caller input IDs are distinct from external action idempotency keys.

Zyara needs both:

- `input_id` prevents duplicate accepted events;
- `operation_idempotency_key` prevents duplicate external side effects.

Neither may be inferred solely from natural-language content.

## 7. Combined architecture

These donors fit together without becoming four mandatory runtimes:

```text
                 ZYARA CONTROL / AUTHORITY
             N5 + Capability Gateway + Privacy
                           |
                           v
                   AIF DECISION PLANE
                           |
       +-------------------+-------------------+
       |                   |                   |
       v                   v                   v
deterministic       local Laya/Jev        other admitted
rules               typed decisions       providers
                           |
                           v
                 DecisionBatch Gateway
          classifier.dev-inspired interface
                           |
            uncertain ----+----> stronger/human
                           |
                           v
                 RETRIEVAL PREFILTER
             jev_search-inspired pattern
                           |
                           v
                    AGENT RUNTIME
                           |
                    Unreal-inspired
             session / context / translator
                      / operations
                           |
                           v
               typed Zyara capability adapter
                           |
                           v
               receipt + verification + audit
```

Zyara owns every contract in this diagram.

## 8. Required contract additions

### DecisionBatchRequest

```text
batch_id
task_class
items[{input_id, text_ref_or_minimized_text}]
labels/options
instructions_ref
provider_profile
threshold_policy
data_class
purpose
tenant/branch scope
```

### DecisionBatchItemResult

```text
input_id
selected
scores
confidence
confidence_available
abstained
uncertain
escalated
provider/model/revision
calibration_ref
latency
error
```

### AgentSession

```text
session_id
run_id
tenant_id
branch_id
agent_identity_id
human_sponsor_id
session_version
parent_session_id?
fork_reason?
created_at
terminal_state
```

### AgentInput

```text
input_id
source
received_at
payload_ref
payload_digest
accepted/rejected
dedup_state
```

### ToolTranslation

```text
tool_call_id
capability_id
translator_version
validation_outcome
operation_specs[]
reason_codes[]
```

### OperationSpec

```text
operation_id
operation_version
capability_id
parameters_digest
authority_class
idempotency_key
approval_binding
credential_binding_refs
egress_policy_ref
timeout/retry
expected_receipt
verification_method
```

### ContextBuildReceipt

```text
context_builder_version
included_refs[]
omitted_refs[]
truncated_refs[]
compacted_refs[]
budget
authorization_scope
prompt/model profile
```

## 9. New qualification suites

### Local decision benchmark

For each Laya/CoreML profile:

- exact answer accuracy;
- calibration;
- abstention;
- Arabic;
- Saudi Arabic;
- Arabic/English code switching;
- healthcare administrative terminology;
- adversarial instructions;
- latency;
- energy;
- RAM;
- device compatibility;
- offline behavior;
- no-silent-cloud fallback.

### Decision batch benchmark

For a classifier.dev-inspired gateway:

- ordering;
- 1/10/100/1000 item behavior;
- partial failure;
- null confidence;
- escalation;
- backpressure;
- cancellation;
- cost accounting;
- provider outage;
- privacy redaction;
- retry semantics.

### Retrieval prefilter benchmark

For Jev-search-inspired filtering:

- recall before compression;
- evidence preservation;
- tenant leakage;
- revoked-document exclusion;
- prompt injection;
- symlink/path escape;
- cancellation;
- large corpus performance;
- Arabic matching.

### Agent runtime recovery campaign

For Unreal-inspired semantics:

- duplicate input redelivery;
- crash after input persist;
- crash after model response;
- crash after tool translation;
- crash after operation persist before dispatch;
- crash after external side effect before receipt;
- resume;
- cancel;
- fork;
- stale approval;
- revoked capability;
- translator version migration;
- unsupported session version.

## 10. Frozen decisions

1. Unreal Agent is a runtime-semantics donor, not the healthcare authority.
2. Tool translation is pure and performs no external I/O.
3. Tool-call status and operation specs must be durable before dispatch.
4. Operations are versioned and serializable.
5. Context omission/truncation is observable.
6. Model tool calls never execute directly.
7. Laya-CoreML may be admitted per decision class only.
8. Local-only decisions never silently fall back to remote.
9. classifier.dev public service is not a PHI production path.
10. classifier.dev patterns may be adapted into an internal batch gateway.
11. Jev Search is not admitted as-is; only bounded search-shaping concepts survive.
12. No decision confidence grants healthcare authority.
13. No majority vote of decision models can bypass policy.
14. Forked agent sessions cannot replay completed side effects.

## 11. Roadmap insertion

Update AIF sequencing to:

```text
AIF-01 Capability contract + resolver
  -> AIF-02 Privacy / egress / credentials
      -> AIF-03A Model + prompt registry
          -> AIF-03B Typed decision providers
          -> AIF-03C Decision batch gateway
          -> AIF-03D Permission-first retrieval/prefilter
      -> AIF-04A Durable session + input substrate
          -> AIF-04B Pure tool translation + serializable operations
              -> AIF-04C Operation manager + recovery
                  -> AIF-04D Fork/compare + context omission receipts
```

AIF-05 onward remains unchanged.

## 11A. Final implementation-readiness hardening

The final gap pass adds constraints that are not donor-specific but are required before implementation should be called architecture-complete:

- versioned `DecisionClassSpec` / label-set contracts;
- explicit UNKNOWN/none semantics;
- per-class/provider/locale thresholds;
- operational-harm/fairness evaluation for routing that can affect access or review burden;
- local model artifact digests, conversion-toolchain provenance, quarantine and rollback;
- canonical session sequence/causal lineage;
- explicit operation dependency DAGs;
- worker leases/fencing;
- transactional outbox/durable dispatch intent;
- no exactly-once execution claim;
- integrity-bound execution receipts;
- human-intent + normalized parameter digest binding;
- session retention/compaction/legal-hold rules;
- hard tool-call/operation/fan-out parser limits.

These constraints are now incorporated into the canonical AIF plan and implementation handoff rather than left as future runtime design work.

## 12. Admission status

`ZYARA_DECISION_AGENT_DONOR_DEEP_DIVE_READY = YES`
