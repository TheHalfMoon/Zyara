# Voice, Agent Runtime, and Secure AI Execution

This document defines how Zyara should use voice, agent orchestration, retrieval, and sandboxed execution without weakening healthcare safety, privacy, or trust.

## Product goal

A patient should be able to press a microphone button and say naturally, in Arabic, English, French, German, or Spanish, what they need.

Example:

> I have had lower-back pain for two weeks and I need someone near me who accepts my insurance after 6 PM.

The voice experience must feed the same canonical intent, safety, search, ranking, provider-graph, booking, and provenance pipeline as typed input.

Voice is an input modality, not a separate clinical reasoning system.

## Core architecture

```text
Microphone
  -> consent + visible recording state
  -> audio capture
  -> ASR provider abstraction
       -> local/on-device ASR when practical
       -> approved cloud ASR when explicitly configured
  -> transcript + language + confidence + provenance
  -> transcript confirmation/correction when confidence is weak
  -> Zyara intent/safety pipeline
  -> structured provider/search tools
  -> explainable results
  -> optional spoken response
```

### Privacy defaults

- Do not retain raw patient audio by default when the transcript is sufficient.
- Treat audio and transcripts that contain health information as sensitive health data.
- Make recording state visible and unambiguous.
- Require explicit consent for optional audio retention, quality-improvement use, or model-training use.
- Record ASR provider/model/version and whether transcription occurred locally or remotely.
- Separate operational telemetry from transcript content.
- Never send a patient's complete health timeline to an ASR provider merely to improve transcription.

## Source roles

### OpenWhispr

Upstream: https://github.com/OpenWhispr/openwhispr

Why it matters:

- cross-platform privacy-first voice-to-text patterns;
- local Whisper/Parakeet-style transcription;
- optional cloud/BYOK model adapters;
- multilingual dictation and translation patterns;
- meeting/audio import, semantic notes and MCP/API patterns;
- local-vs-cloud user choice.

Use it primarily as a donor/reference for:

- microphone/audio capture UX;
- local ASR lifecycle and model management;
- ASR provider abstraction;
- transcript streaming/finalization;
- multilingual voice workflows;
- privacy controls around local transcription.

Do not inherit general desktop-agent behavior into Zyara clinical routing without Zyara's own safety layer.

### OpenSuperWhisper

Upstream: https://github.com/Starmel/OpenSuperWhisper

Why it matters:

- simple real-time recording/transcription patterns;
- Whisper and Parakeet engine switching;
- local model downloads;
- push/hold-to-record interaction;
- microphone selection;
- language autodetection;
- audio-file transcription queue patterns.

Use it as a focused reference for low-friction local dictation, especially native/mobile/desktop capture patterns and engine abstraction.

Its current upstream implementation is macOS-focused, so Zyara must not make macOS-specific assumptions in its cross-platform patient architecture.

### OpenSandbox

Upstream: https://github.com/opensandbox-group/OpenSandbox

Why it matters:

- general-purpose isolated sandbox lifecycle;
- Docker/Kubernetes execution;
- command/filesystem/code-interpreter APIs;
- ingress/egress controls;
- credential injection without exposing raw secrets to workloads;
- stronger isolation options such as gVisor/Kata/Firecracker patterns;
- MCP and agent execution integration.

Use it as the primary reference/donor candidate for **non-clinical AI tool execution isolation**.

Potential Zyara uses:

- document conversion or extraction jobs;
- controlled provider-data enrichment tasks;
- integration adapter testing;
- agent-assisted internal operations;
- safe code/data transformation on synthetic or explicitly authorized inputs;
- evaluation runners.

Never grant a general AI sandbox unrestricted access to:

- production databases;
- patient clinical stores;
- provider production credentials;
- unrestricted internet egress;
- secrets that are not necessary for the task.

All sandbox workloads require explicit input/output contracts, timeouts, network policy, credential scope, audit logs and cleanup guarantees.

### Munder Difflin

Upstream: https://github.com/chaitanyagiri/munder-difflin

Why it matters:

- multi-agent orchestration patterns;
- supervisor/router model;
- agent mailboxes and shared blackboard patterns;
- persistent memory concepts;
- human approval gates;
- circuit-breaker behavior;
- per-agent isolation/worktree ideas;
- telemetry and budget controls.

Use it as a reference/donor for Zyara's **internal operations agent framework**, not as the medical recommendation engine.

Possible internal agents:

- Provider Data Agent
- Verification Operations Agent
- Integration Diagnostics Agent
- Translation QA Agent
- Search Quality Evaluation Agent
- Analytics Report Agent
- Support Operations Agent

Any agent that influences patient-facing healthcare recommendations must operate through typed tools and policy gates. Free-form agent-to-agent consensus is not clinical evidence.

### fullstack-agent

Upstream: https://github.com/jaredrhod/fullstack-agent

Why it matters:

- composable agent stack concept;
- persistent memory + voice + interface integration;
- conversational installation/configuration patterns;
- replaceable/adoptable components rather than one monolith.

Use it as a reference for modular assembly of AI capabilities, especially voice and memory boundaries.

Upstream currently identifies its public license as AGPL-3.0-or-later. The founder states permission to copy/use code from this source. If Zyara relies on permission beyond the public AGPL terms, preserve documentary evidence of that permission and its scope in the donor-adoption record before direct incorporation into a differently licensed product.

### OpenRAG

Upstream: https://github.com/langflow-ai/openrag

OpenRAG was already present in the Zyara source landscape before this update. The founder has explicitly re-confirmed permission to copy/use it.

Use it as a reference/donor for:

- ingestion and document processing;
- retrieval pipelines;
- grounded answers over provider policies and approved knowledge;
- evidence-linked internal knowledge assistants;
- evaluation of retrieval quality.

Do not use generic RAG output as authoritative clinical advice. Retrieval for patient navigation must be restricted to approved sources, versioned, provenance-aware, and evaluated.

## Agent boundary model

Zyara should distinguish three AI classes.

### Class A — Patient navigation AI

Can:

- understand patient intent;
- ask clarifying questions;
- identify a reasonable care category;
- detect configured red-flag patterns and escalate;
- query Zyara's structured provider/search tools;
- explain why results matched;
- help book/reschedule/cancel through typed booking tools.

Cannot:

- autonomously diagnose;
- prescribe medication;
- fabricate provider, insurance or availability facts;
- write directly to clinical records without an authorized workflow;
- execute arbitrary code or unrestricted network calls.

### Class B — Provider/admin copilot

Can assist authorized staff with:

- profile completeness;
- analytics summaries;
- operational reporting;
- scheduling/admin workflows;
- integration troubleshooting;
- support drafting.

It must inherit tenant permissions and must not cross provider boundaries.

### Class C — Internal operations agents

Can coordinate longer-running tasks, but only through approved tools and sandboxed workloads.

Use orchestration patterns from Munder Difflin/fullstack-agent here.

Examples:

- verify public provider-data changes;
- run synthetic integration tests;
- evaluate search quality;
- prepare provider monthly reports;
- classify support queues;
- compare source imports.

## Agent execution policy

Every tool available to an agent must declare:

- purpose;
- allowed caller class;
- required scopes;
- patient/tenant data classification;
- input schema;
- output schema;
- idempotency behavior;
- side effects;
- timeout;
- audit fields;
- network destinations;
- secret requirements;
- whether human approval is required.

Destructive, high-impact, financial, credential, or privacy-sensitive operations require explicit approval gates.

## Memory policy

Agent memory is not equivalent to a patient clinical record.

Rules:

- patient facts belong in governed patient/FHIR-aligned stores, not informal agent memory;
- provider facts belong in the provider graph with provenance;
- agent memory may retain operational lessons, task state, evaluation findings and non-sensitive preferences when authorized;
- never rely on an agent's remembered healthcare fact when a canonical structured source exists;
- memory writes must be auditable for privileged/internal agents.

## RAG policy

Approved retrieval collections should be purpose-specific, for example:

- provider/facility policies;
- Zyara product/support documentation;
- integration specifications;
- approved medical navigation content;
- official public regulatory/reference material.

Every retrieved item used for a patient-facing claim should carry source identity, version/freshness and confidence/relevance metadata where possible.

## Voice quality requirements

Evaluate at minimum:

- Arabic Modern Standard Arabic;
- representative Saudi Arabic speech;
- English;
- French;
- German;
- Spanish;
- medical specialty names;
- doctor/facility names;
- insurance names;
- common medication names when they appear in patient history/navigation context;
- code-switching, especially Arabic/English;
- noisy environments;
- low-confidence transcription recovery.

The UI must make it easy to correct a transcript before Zyara acts when the ASR confidence or parsed meaning is uncertain.

## Rollout plan

### Stage 1 — Text-first safe AI

Prove the typed navigation pathway, structured search tools, ranking explanations, red-flag escalation and evaluation harness.

### Stage 2 — Voice capture + transcription

Add microphone input, ASR abstraction, local/private transcription option and transcript confirmation.

### Stage 3 — Voice conversation

Add streaming turn-taking and optional TTS while preserving the same typed internal tool contracts.

### Stage 4 — Sandboxed internal agents

Introduce OpenSandbox-style isolation for non-clinical long-running/internal tasks.

### Stage 5 — Multi-agent operations

Adopt Munder Difflin/fullstack-agent orchestration patterns only where parallel agents measurably improve operational workflows.

Do not introduce multi-agent complexity merely because it is available.

## Acceptance gates

Voice/agent runtime is not production-ready until:

- microphone consent and recording-state UX are clear;
- supported-language ASR benchmarks exist;
- Arabic and Arabic/English code-switching are tested;
- patient text and voice use the same safety/search pipeline;
- raw audio retention behavior is explicitly configured and tested;
- ASR provider provenance is captured;
- tool permissions are least-privilege;
- sandbox network egress is deny-by-default or explicitly allowlisted;
- sandbox credentials are scoped and ephemeral where possible;
- sandbox escape/cleanup/failure cases are tested;
- no agent has untyped unrestricted access to production patient data;
- RAG outputs preserve source provenance;
- human approval gates exist for high-impact operations;
- agent loops/timeouts/budget limits have circuit breakers;
- audit trails can reconstruct sensitive agent actions.
