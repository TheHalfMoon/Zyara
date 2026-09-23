# Zyara AI Operating Fabric — Source Adoption Matrix

Initial date: 2026-09-22  
Amended: 2026-09-23  
Initial base Zyara main: `7caa5da39bbf6d1157f42d183280b0e4682bdcf5`  
2026-09-23 hardening base: `c17b654f6836997751967157728c664227b3e7e2`

This document converts the founder-supplied source list and relevant TheHalfMoon repositories into implementation decisions for the AI Operating Fabric.

Permission to reuse code does not remove provenance, security, privacy, dependency, NOTICE, or update obligations.

## Admission vocabulary

- `REFERENCE` — study design/behavior only.
- `DEPENDENCY` — consume as a normal dependency after qualification.
- `ADAPT` — reimplement selected concepts in Zyara-native contracts.
- `COPY_SELECTIVE` — copy bounded source after exact path/revision/license/permission review.
- `QUALIFY` — benchmark or threat-test before adoption.
- `REJECT_DEFAULT` — do not admit unless a later bounded decision reverses it.

## Founder-supplied external sources

| Source | Verified revision / state | Public license observed | Zyara role | Decision | Admission notes |
|---|---|---|---|---|---|
| `google/ax` | `d8ed0fe38bceb7842d3c47817d53d16ccdfcb601` | Apache-2.0 | AgentRun/Workspace/Gateway/Model separation; workload limits; suspend/resume; egress fencing | REFERENCE / ADAPT | Project warns its concepts/specs may still break before stable. Do not make Kubernetes mandatory for clinic deployments. |
| `superdesigndev/treg` | `6e667a4c6f7c70c448ea6574c5a038ba8f14bc5f` | Apache-2.0 plus additional hosted-service restriction | capability/tool registry, server-side credential injection, tool health, team scoping, audit | ADAPT / COPY_SELECTIVE | Founder states explicit permission to use/copy. Preserve evidence of that permission before direct commercial embedding because the public license contains additional hosted/embedded-service restrictions. Never expose raw secrets to agents. |
| `TheoLeeCJ/SemIf` | `1f2dea3e25379f9dfc98cb83c324f00ab5deda37` | MIT | fast bounded semantic decisions | QUALIFY / optional DEPENDENCY | Only admit per task class after calibration, Arabic/code-switch testing where relevant, abstention tests, resource measurement and security review. Never policy authority. |
| `Mapika/decider` | `104b844b4b8b5d6993523af8cba1e62ef0c9c2e1` | Apache-2.0 | typed probability/decision routing | QUALIFY / REFERENCE | Good fit for constrained option selection. Do not use patient Arabic workflows until independently benchmarked. No clinical authority. |
| `tinyfish-io/agentql` | `418ba8ad1c69dfac134a6833369a01dfba5a24a7` | MIT | structured browser extraction/interaction primitive | QUALIFY / DEPENDENCY candidate | Must sit behind Zyara browser policy, allowlists, credentials and receipt verification. |
| `tinyfish-io/tinyfish-cookbook` | `8615317f6db58ae776dd53817ac30668c1db5ef8` | MIT | browser-agent patterns, multi-step workflows, structured outputs | REFERENCE / test-fixture inspiration | Cookbook/examples are not production authority. |
| `tinyfish-io/bigset-oss` | `73b5fd0289d17bf99f14e770eabc6b7ec7406bc5` | AGPL-3.0 observed | large-scale web/data execution patterns | REJECT_DEFAULT / REFERENCE | Do not create a mandatory runtime dependency without explicit architecture + licensing decision. Founder permission may permit separate reuse, but exact scope must be documented before code admission. |
| `laya.aay.sh` | website/source supplied by founder; exact canonical source repo not verified in this pass | not asserted here | Action Center UX, pre-researched action cards, human approval, operations briefing | REFERENCE_PENDING_SOURCE_PIN | Do not copy code until exact repository/revision/license/permission artifact is captured. Product patterns may inform Zyara-native UI immediately. |
| `desktopcommander.app` | product/source supplied by founder; exact source repo not verified in this pass | not asserted here | bounded local-machine bridge patterns | REFERENCE_PENDING_SOURCE_PIN | Never translate generic desktop control into unrestricted care-agent shell/filesystem authority. |
| Bespoke Nimble 9B | Hugging Face model `bespokelabs/Bespoke-Nimble-9B`; metadata observed 2026-09-22: Apache-2.0, structured-prediction/evidence-grounding tags | Apache-2.0 metadata | structured evidence extraction / candidate decision support | QUALIFY | Model output remains candidate evidence. Benchmark healthcare domain, privacy, hallucination, calibration, latency and Arabic applicability before use. |
| `mizorewww/laya-coreml` | `4619e0483f07adf39068532e85b42ec2347edb83` | Apache-2.0 + NOTICE | local typed decisions on Apple Silicon/Core ML; calibration/provenance patterns | QUALIFY / ADAPT / optional DEPENDENCY | Founder states explicit permission. Strong candidate for local administrative decision classes only after Saudi Arabic/domain benchmark. Preserve upstream NOTICE and model-bundle provenance. No silent cloud fallback. |
| `caio0452/jev_search` | `ea073f6db48f5bff73ae4b9f2240d2d302fb9dc1` | no public LICENSE observed in this pass | two-stage semantic search/prefilter pattern | REFERENCE / SELECTIVE_ADAPT | Founder states explicit permission. README warns it is AI-generated and not production-ready. Do not admit its OpenRouter path for PHI; adapt only behind Zyara auth/privacy/decision contracts. |
| `unreallabsai/unreal-agent` | `df8b0ba560da17fd705d941cbeb75eff86c74a1e` | MIT | durable session/inbox/context/tool-translation/serializable-operation runtime semantics | ADAPT_HIGH_PRIORITY / COPY_SELECTIVE | Founder states explicit permission. Preserve pure translator/no-I/O separation, versioned sessions/operations, recovery semantics; add Zyara tenant/authority/approval/receipt boundaries. |
| `mrmps/classifier-dev` / `classifier.dev` | `8f2bb2b84a0d51ad1c9ed3436b64155908354f75` | MIT | batch typed-classification gateway, uncertainty review, versioning/eval/cost patterns | ADAPT / SELF-HOST PATTERN / DEV_ONLY_HOSTED | Founder states explicit permission. Hosted service forwards content to model providers; public endpoint is not a PHI production path. Prefer a Zyara-owned provider-neutral batch gateway. |

## TheHalfMoon source priority

The founder authorizes use of founder-owned repositories. Reuse must still be pinned at the task that actually admits code.

### Tier 1 — direct operating-fabric donors

| Repository | Capability to reuse | Decision |
|---|---|---|
| `TheHalfMoon/Sentrdel` | monotonic policy, evidence/coverage, ALLOW/ASK/DENY/UNDECIDABLE, secret redaction, local-first guard gateway | ADAPT_HIGH_PRIORITY |
| `TheHalfMoon/Ecra` | intent-to-tool gateway, trust graph, safe digital actions, reusable procedures/receipts | ADAPT_HIGH_PRIORITY |
| `TheHalfMoon/Kodac` | sandbox execution approval binding, backend evidence, runtime admission | ADAPT_HIGH_PRIORITY |
| `TheHalfMoon/Golam` | sandbox enforcement, workload descriptors, execution/receipt discipline | ADAPT_HIGH_PRIORITY |
| `TheHalfMoon/MedScale` | local model fabric, privacy gates, governed browse, evidence-bearing agent boundaries, native analytics patterns | ADAPT_HIGH_PRIORITY |
| `TheHalfMoon/MESC` | model/process isolation evidence, challenge/qualification patterns, medical-model governance | REFERENCE / ADAPT |
| `TheHalfMoon/Qdrat` | clinic workforce/teams/tasks/helpdesk/operational reporting patterns already used by W1-W4 | ADAPT_EXISTING |
| `TheHalfMoon/kernux` | orchestration, agent fleet/context, local privacy, compare/evidence patterns | REFERENCE / ADAPT |
| `TheHalfMoon/Winds` | delegation/relay/result envelopes, agent lifecycle, donor audit methods | REFERENCE / ADAPT |
| `TheHalfMoon/Delethos` | delegation/harness/verification methodology and negative-case corpora | REFERENCE |

### Tier 2 — healthcare/data/voice supporting donors

| Repository | Capability | Decision |
|---|---|---|
| `TheHalfMoon/commandF` | FHIR compatibility/interoperability guardrails | ADAPT / REFERENCE |
| `TheHalfMoon/commandMed` | medical model safety/evaluation patterns | REFERENCE / ADAPT |
| `TheHalfMoon/Himsat` | local-first audio/transcription, evidence-linked capture | REFERENCE / later ADAPT |
| `TheHalfMoon/Wispral` | voice control, interruption, permission, local-first agent steering | REFERENCE / later ADAPT |
| `TheHalfMoon/Signthos` | consent/forms/signature/document workflow patterns | REFERENCE / ADAPT |
| `TheHalfMoon/MSTR` | evidence/governance patterns where relevant | REFERENCE |
| `TheHalfMoon/SpecGrain` | bounded task decomposition | ENGINEERING_REFERENCE |
| `TheHalfMoon/Diffcipline` | exact-diff/evidence-before-done discipline | ENGINEERING_REFERENCE |
| `TheHalfMoon/Ascout` | test/security/review orchestration patterns | ENGINEERING_REFERENCE |
| `TheHalfMoon/wepld` | donor/delegation qualification patterns | ENGINEERING_REFERENCE |
| `TheHalfMoon/Morize` | local retrieval/provenance; indexes as rebuildable projections | REFERENCE |
| `TheHalfMoon/Pluma` | local knowledge/event-journal/graph design patterns | REFERENCE |

## Selective donor mapping by AIF slice

### AIF-01 Capability Gateway

Study/adapt:

- Treg: registry, server-side secret mediation, tool health, org scoping;
- Ecra: intent-to-capability mapping and action receipts;
- Sentrdel: deny-by-default enforcement and coverage;
- existing Zyara adapter harnesses.

Do not copy Treg wholesale. Preserve Zyara domain authority and provider-neutral schemas.

### AIF-02 Privacy/Egress

Study/adapt:

- Sentrdel: redaction/coverage/monotonic policy;
- MedScale: privacy/data-boundary manifests;
- Kernux: no-silent-cloud-fallback and local privacy;
- existing Zyara consent/privacy packages.

### AIF-03 Decision Plane

Qualify:

- deterministic rules first;
- SemIf;
- Decider;
- Laya-CoreML as a local Apple-Silicon typed-decision candidate;
- a Zyara-owned classifier.dev-inspired batch gateway;
- Bespoke Nimble or other structured-prediction models;
- current approved model providers/local model runtimes.

Selection must be task-specific. There is no single global "best model."

### AIF-04 Agent Runtime

Study/adapt:

- Unreal Agent session/inbox/context/translator/operation separation;
- Google AX resource separation;
- Kodac/Golam sandbox and approval binding;
- MedScale/MESC process isolation;
- Winds/Kernux delegation/run envelopes.

Do not require a cluster for the default path.

### AIF-05 Browser Bridge

Study/qualify:

- AgentQL;
- TinyFish cookbook/patterns;
- Playwright already present in broader source research;
- Ecra browser/action concepts.

Browser execution remains an adapter behind the Capability Gateway.

### AIF-06 Local Bridge

Study:

- Desktop Commander product patterns;
- Kodac/Golam sandbox controls;
- MedScale OS sandbox work;
- platform-native primitives only after qualification.

The Local Bridge is capability-specific, never "remote shell for an agent."

### AIF-07 Action Center

Study/adapt:

- Laya product interaction patterns;
- Qdrat task/helpdesk/team patterns;
- N5 C2/C3/C4;
- Buzz collaboration patterns already qualified in Zyara research.

### AIF-08 Operations Insights

Study/adapt:

- existing Zyara partner analytics;
- MedScale native-analytics-first design;
- Qdrat operational reporting;
- Superset/PostHog patterns already in Zyara source research.

Superset remains an optional adapter over approved views, not the authority plane.

## Delegation and multi-agent sources

TheHalfMoon repositories already contain research on `amElnagdy/delegate-skills` and agent-fleet patterns.

For Zyara:

- delegation is an implementation technique, not a healthcare authority;
- delegated work must preserve parent run, child run, capability grant, budget, correlation, touched resources, result envelope and cancellation;
- a delegate's result remains agent-reported evidence until verified;
- child agents may not inherit broader capabilities than the parent;
- delegation depth and parallelism must be bounded;
- no delegate may self-approve protected work.

Any direct admission of delegate-skills requires a fresh exact pin/license/path audit.

## Additional model / retrieval / lifecycle donor mapping

### Model fleet, evaluation, and prompt governance

Prefer adapting:

- `TheHalfMoon/MedScale` — model fleet, compare/evaluation, privacy manifests, local model packaging, evidence-bearing run records;
- `TheHalfMoon/MESC` — model/process isolation, evaluation evidence and medical-model authority boundaries;
- `TheHalfMoon/commandMed` — medical-model safety/evaluation patterns;
- `TheHalfMoon/Sentrdel` — lower-authority model output, coverage, deterministic policy ceiling.

External model candidates such as Bespoke Nimble are evaluation subjects, not platform authorities.

Do not adopt a model runtime merely because it performs well on one benchmark. Admission is per task class, data class, locale, deployment profile and authority ceiling.

### Retrieval / RAG

Prefer adapting:

- `TheHalfMoon/Morize` — authorize-before-disclosure, provenance, rebuildable indexes, local-first retrieval;
- `TheHalfMoon/MedScale` — governed retrieval/evidence objects, Research OS retrieval contracts;
- `TheHalfMoon/Pluma` — durable knowledge/event-journal/graph separation where useful.

External OpenRAG/Onyx/AnythingLLM-class systems remain optional workers/references rather than canonical data stores.

### Rollout, kill-switch, and runtime admission

Prefer adapting:

- `TheHalfMoon/Kodac` — approval binding and runtime admission;
- `TheHalfMoon/Golam` — execution descriptors/receipts and bounded enforcement;
- `TheHalfMoon/Sentrdel` — monotonic deny/ask policy;
- `TheHalfMoon/SpecGrain` + `Diffcipline` — bounded rollout and exact evidence discipline.

### Observability and analytics

Zyara metric definitions remain native.

Use:
- existing Zyara analytics/event packages;
- MedScale native-analytics-first patterns;
- Qdrat operational reporting patterns;
- Superset/PostHog only over approved privacy-preserving views.

No donor may introduce raw-PHI session replay or unrestricted analytics credentials.

## 2026-09-23 Decision/runtime donor amendment

Detailed source qualification and contract additions are in:

`docs/research/ZYARA_DECISION_AGENT_RUNTIME_DONOR_DEEP_DIVE_2026-09-23.md`

Preferred combined interpretation:

```text
Laya-CoreML = local typed-decision provider candidate
classifier.dev = batch-classification gateway/eval/escalation pattern
Jev Search = permission-first semantic prefilter pattern
Unreal Agent = durable session + pure translator + serializable operation runtime donor
```

None of these sources becomes healthcare authority.

## Source conflicts and preferred resolution

### Overlapping agent runtimes

Do not install AX + a separate agent framework + a second sandbox framework as mandatory stacks.

Preferred resolution:

- Zyara owns contracts;
- one minimal default runtime backend;
- optional stronger backend later;
- donors provide patterns/components, not platform authority.

### Overlapping browser engines

Prefer Playwright-compatible deterministic control plus one qualified semantic extraction layer if benchmarks justify it.

Do not bundle multiple browser-agent stacks.

### Overlapping decision models

Run an evidence-driven benchmark. Keep deterministic rules as the first tier. Admit only models that materially improve the relevant task.

### Overlapping analytics systems

Zyara owns metric definitions and privacy-approved views. Optional BI adapters may visualize them.

## Permission and provenance rule

Before `COPY_SELECTIVE`:

1. capture founder permission scope;
2. pin exact revision;
3. list exact source files;
4. capture original license/header/NOTICE;
5. record whether public license has additional terms;
6. record modifications;
7. dependency/SBOM review;
8. security review;
9. privacy/PHI review;
10. define update strategy;
11. add regression tests that protect Zyara's authority boundaries.

For Treg specifically, the repository's public license includes an additional hosted/embedded-service restriction. Because the founder states separate permission exists, direct reuse is permitted only after that permission is preserved as project evidence; do not rely on an oral/chat assertion inside release engineering.

## Rejected shortcuts

- "permission" as a substitute for provenance;
- model consensus as policy;
- direct browser mutation without typed action/receipt;
- raw provider keys in agent contexts;
- copying an entire donor platform into Zyara;
- generic remote desktop/shell as a care-agent feature;
- AGPL runtime admission without deliberate architecture/legal decision;
- analytics dashboards over raw transactional PHI;
- using an external tool registry as the owner of Zyara authorization.

## Implementation admission checklist

A source component may enter production code only when all are true:

- exact revision pinned;
- exact component identified;
- no native Zyara primitive already satisfies the need;
- license/permission state documented;
- data boundary understood;
- security review complete;
- dependency footprint accepted;
- failure mode bounded;
- rollback/update strategy defined;
- tests enforce the intended authority ceiling.
