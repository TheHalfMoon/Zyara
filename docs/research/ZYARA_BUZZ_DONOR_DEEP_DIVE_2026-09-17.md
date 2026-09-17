# Zyara donor deep dive — block/buzz

**Research date:** 2026-09-17
**Snapshot evaluated:** `block/buzz@4ab4f786085a23fe6126529861840eff6048ceee`
**Public license observed:** Apache-2.0
**Founder authorization:** the founder states permission to copy/use the source for Zyara.
**Purpose:** identify reusable human-agent collaboration, workflow, audit, identity and real-time workspace patterns for Zyara Clinic without making Buzz or Nostr the canonical healthcare record.

## Why Buzz matters to Zyara

Buzz is designed around a strong idea that maps well to AI-era clinic operations: humans, agents, workflows and system events can participate in the same workspace while retaining explicit identity and an inspectable audit trail.

At the evaluated snapshot, the repository exposes:

- channels, threads and direct messages;
- presence and typing state;
- media and canvases;
- full-text search;
- workflow triggers/actions;
- agent identities and agent-first CLI surfaces;
- ACP/MCP integration;
- audit-chain infrastructure;
- multi-community tenant scoping;
- desktop/web/mobile surfaces;
- workflow approval infrastructure that is still explicitly incomplete in parts;
- Git/project collaboration features that are not directly relevant to patient care but demonstrate the shared-event model.

## Core Zyara insight

Zyara Clinic should have an **operations collaboration plane** where authorized staff and authorized agents can participate in the same work context:

```text
Clinic workspace
  -> Front desk room
  -> Referral / authorization queue
  -> Billing / claims queue
  -> Clinical support room
  -> Facility operations room
  -> Automation exception room
```

Each human or agent actor should have a distinct identity, scoped membership, allowed actions and audit history.

However:

> The collaboration/event plane must not become the canonical source of clinical, scheduling, insurance or financial truth.

FHIR-aligned clinical records, appointments, claims, prescriptions and other authoritative domain state remain in their bounded systems. Collaboration events can reference and explain that state; they do not replace it.

## Highest-value Buzz adaptations

### 1. Human and agent identities in the same workspace

Buzz treats agents as participants rather than invisible cron jobs. This is a strong pattern for Zyara's AI-era clinic experience.

Zyara should adapt the principle so that an operator can see:

- which agent handled a referral;
- which staff member reviewed it;
- which automated steps ran;
- what evidence was used;
- where authority changed from automation to human;
- who approved/resumed/rejected a step.

Agent identity must be implemented through Zyara's healthcare authorization model, not copied as a generic Nostr key model without analysis.

Recommended disposition: **ADAPT PRINCIPLE / SELECTIVE COMPONENT REUSE**.

### 2. Unified event/activity stream

Buzz's event-oriented workspace and activity concepts are useful for a clinic operations feed:

```text
09:03 referral received
09:03 document extraction completed
09:04 coverage verification started
09:06 coverage response received
09:07 authorization requirement detected
09:07 Zyara AI assembled work packet
09:08 human approval requested
09:12 staff approved submission
09:13 external submission receipt recorded
```

This can make automation legible and trustworthy.

Zyara should implement this as a derived operational activity stream over authoritative domain events and action receipts. Do not use a chat/event log as the only durable representation of healthcare state.

Recommended disposition: **ADAPT**.

### 3. Scoped community/tenant boundaries

Buzz's multi-community design explicitly scopes observable state by community and propagates tenant identity into storage/search/workflow/audit boundaries.

This is useful as a reference for Zyara organization/branch tenancy and for proving that search, workflow state, presence and audit records cannot cross clinic tenants.

Healthcare tenancy is stricter than collaboration tenancy, so Zyara's existing authorization/consent model remains authoritative.

Recommended disposition: **REFERENCE + TEST-PATTERN ADAPTATION**.

### 4. Tamper-evident audit-chain concepts

`buzz-audit` uses tenant-bound hash chaining for audit entries. This is relevant to Zyara's action-receipt and audit-export design.

Potential Zyara use:

- tamper-evident automation action logs;
- workflow execution receipts;
- approval/resume/reject history;
- operator/export verification.

Do not treat a hash chain as a substitute for access control, retention policy, database integrity, legal audit requirements or external attestation.

Recommended disposition: **SELECTIVE ADAPTATION CANDIDATE** after cryptographic/security review.

### 5. Workflow engine patterns

`buzz-workflow` provides triggers, conditions, step outputs, template resolution, webhooks, delay concepts and approval-step machinery.

Useful patterns:

- trigger context;
- named sequential steps;
- condition evaluation;
- structured step outputs;
- explicit approval requests;
- resumable execution model direction;
- execution trace concepts;
- community fence checks before side effects.

But Buzz itself documents incomplete approval persistence/wiring at the evaluated snapshot, and the workflow model is not designed around healthcare transactions, NPHIES, prescriptions, clinical authority or long-running revenue-cycle reconciliation.

Zyara therefore must not adopt Buzz's workflow engine wholesale as the clinical/financial automation runtime without qualification against Temporal/current Zyara jobs and the AI-era automation requirements.

Recommended disposition: **REFERENCE / COMPONENT QUALIFICATION, NOT DEFAULT CORE RUNTIME**.

### 6. ACP/MCP agent composition

Buzz's `buzz-agent`, `buzz-acp`, `buzz-dev-mcp` and agent-first CLI demonstrate clean protocol boundaries between agent clients, model loops and tools.

This can inform Zyara's internal agent architecture:

```text
Model / agent runtime
  -> typed tool protocol
     -> policy/authority gate
        -> Zyara domain action
```

Zyara must keep healthcare actions behind typed domain services and policy. Generic shell/file-edit MCP surfaces are engineering tools and must never be exposed to a production clinic agent with PHI or unrestricted host access.

Recommended disposition: **REFERENCE for protocol separation / REJECT generic shell tooling in care runtime**.

### 7. Search across operational history

Buzz's unified search model supports searching conversations/events/workflows. Zyara can adapt this for clinic operations:

- search patient-access conversations under authorization;
- search task/exception history;
- search workflow receipts;
- search facility operations conversations;
- find prior non-clinical resolution patterns.

Patient/clinical search requires purpose-scoped access, consent/delegation rules, minimum-necessary exposure and PHI-safe indexing.

Recommended disposition: **ADAPT WITH HEALTHCARE AUTHORIZATION**.

### 8. Presence, channels and live collaboration

Presence, typing, rooms and huddles can inspire real-time clinic collaboration and Zyara Connect operator experiences.

Do not assume Buzz huddles are production telehealth infrastructure. Telehealth media remains governed by the separate Zyara Connect media-engine qualification and consent/security requirements.

Recommended disposition: **UX/PATTERN REFERENCE**.

## What not to copy as Zyara architecture

### Nostr as the healthcare canonical data plane

Buzz's signed-event/Nostr model is appropriate to its collaboration goals. Zyara should not make Nostr events the authoritative representation of FHIR clinical records, appointments, claims, prescriptions or insurance transactions.

Recommended disposition: **REJECT AS HEALTHCARE SOURCE-OF-TRUTH MODEL**.

### Generic agent shell access

The engineering agent stack intentionally gives agents powerful developer tools. This is incompatible with default production clinic-agent authority.

Recommended disposition: **REJECT FOR PRODUCTION CARE/ADMIN AGENTS; ENGINEERING-ONLY**.

### Assuming incomplete features are production-ready

The evaluated Buzz docs explicitly distinguish implemented, being-wired and future functionality. Astro must verify current code/tests before reusing any workflow approval, huddle, push, rate-limit or agent-control capability.

Recommended disposition: **QUALIFY EXACT COMPONENTS ONLY**.

## Proposed Buzz-to-Zyara mapping

| Buzz capability | Zyara target | Initial decision |
|---|---|---|
| Community isolation | Clinic/tenant isolation tests | REFERENCE / ADAPT TESTS |
| Channels/threads | Clinic operations collaboration | ADAPT |
| Human + agent membership | AI-era clinic control plane | ADAPT |
| Signed/event activity | Operational activity stream | ADAPT CONCEPT |
| `buzz-audit` hash chain | Tamper-evident action receipts | QUALIFY / ADAPT |
| Workflow triggers/steps | Automation UX/runtime patterns | REFERENCE / QUALIFY |
| Approval requests | Human exception/approval queue | ADAPT PATTERN |
| Agent CLI / ACP / MCP | Agent/tool protocol separation | REFERENCE |
| Search | Operations history search | ADAPT WITH PHI CONTROLS |
| Presence/typing | Staff collaboration presence | OPTIONAL ADAPT |
| Media/huddles | Connect collaboration UX | REFERENCE ONLY |
| Desktop/mobile clients | Doctor/clinic client lifecycle patterns | REFERENCE |
| Nostr relay as canonical store | Healthcare domain state | REJECT |
| Generic shell/file MCP | Production clinic agents | REJECT |

## Combined role with Qdrat

Buzz and Qdrat solve different problems and should not be collapsed into one donor:

```text
Qdrat
  -> workforce structure
  -> shifts / leave / staff lifecycle
  -> WhatsApp / notifications
  -> helpdesk / reports / HR operations

Buzz
  -> human-agent collaboration
  -> shared activity context
  -> agent identities
  -> workflow/audit/control-plane patterns
```

Together they can inform a strong `Zyara Clinic` operating surface, while healthcare-specific domains remain owned by Zyara.

## Required Astro outputs for Buzz

Astro must:

1. pin exact Buzz revision(s) considered for reuse;
2. identify exact crates/files for any candidate copy/adaptation;
3. distinguish working code from documented/incomplete/future features;
4. compare `buzz-workflow` against Temporal/current Zyara job architecture before admission;
5. compare `buzz-audit` against Zyara's audit/provenance requirements;
6. define healthcare tenant and agent-identity mapping without inheriting unsafe assumptions;
7. preserve the rule that collaboration events are not canonical clinical/financial truth;
8. prohibit generic shell/file tools in production care/clinic agents;
9. document license/NOTICE/SBOM/security/update strategy for copied components;
10. map every adopted concept to a bounded Zyara task and acceptance gate.

## Bottom line

Buzz is a **high-value source for the human-agent operations layer of Zyara Clinic**, especially transparent agent identity, collaboration context, operational activity, workflow approval patterns and tamper-evident audit concepts. Its collaboration substrate should complement Zyara's healthcare domain systems, not replace them.
