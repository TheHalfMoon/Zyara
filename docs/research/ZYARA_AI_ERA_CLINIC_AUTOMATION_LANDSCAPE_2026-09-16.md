# Zyara AI-Era Clinic Automation Landscape

**Research date:** 2026-09-16
**Purpose:** give Astro a current public-feature teardown of GenHealth and Plena Health and convert the observed patterns into a Zyara clinic-automation planning floor.
**Important:** public competitor behavior is a product reference only. No proprietary implementation, trade dress, private workflow logic or non-public data is authorized by this document.

## Research sources

GenHealth official material checked:

- <https://genhealth.ai/>
- <https://genhealth.ai/automate>
- <https://genhealth.ai/automate/flows>
- <https://genhealth.ai/technology/automated-workflows>
- <https://genhealth.ai/technology/browser-recorder>
- <https://genhealth.ai/technology/ocr>
- <https://genhealth.ai/technology/ai-chat>
- <https://genhealth.ai/for/providers-health-systems>
- <https://genhealth.ai/for/health-insurance-plans-payers>
- <https://genhealth.ai/docs>

Plena Health official material checked:

- <https://www.plena.health/>
- <https://www.plena.health/platform>
- <https://www.plena.health/workflows/patient-communications>
- <https://www.plena.health/workflows/procedure-lifecycle>
- <https://www.plena.health/workflows/authorizations>
- <https://www.plena.health/workflows/visibility-control>
- <https://www.plena.health/about>

Claims such as customer counts, automation rates or time savings remain competitor-reported unless independently validated. Astro may use feature existence/patterns as research input without repeating marketing performance claims as Zyara assumptions.

## 1. GenHealth — workflow automation pattern

GenHealth publicly positions itself around healthcare operations and RCM automation across existing applications rather than replacing the EHR/billing stack.

Observed capability families:

### Multi-system execution

- web applications, payer portals, EHRs and billing systems;
- fax/document ingestion;
- phone outreach;
- workflows that cross several systems/channels while retaining case context;
- deterministic approved workflow execution with exception handoff.

### Workflow capture and compilation

GenHealth describes a browser-recorder/onboarding pattern where teams demonstrate manual work, repetitive paths are identified, canonical flows are built/tested, and approved flows run in the background.

Zyara should study this pattern for its own governed workflow discovery but must prefer typed/API integrations over pixel-level replay whenever possible.

### Intake and documents

Observed features include:

- fax, e-prescribe, upload and email-attachment intake;
- OCR/document extraction;
- structured demographics, insurance, codes, products/orders and ordering-provider fields;
- source citations from extracted values back to document/page/context;
- confidence/review path before filing;
- creation/update of downstream EHR/billing records after validation.

### Medical necessity and policy intelligence

Observed patterns include:

- selecting applicable payer policy/guideline/customer SOP;
- criterion-by-criterion evidence evaluation;
- met/unmet requirements;
- documentation-gap identification;
- evidence-linked next actions;
- policy/coverage search.

For Zyara, any analogous clinical/insurance rule assistance must preserve exact policy version/source and avoid giving an LLM final adjudication authority.

### Eligibility and benefits

Observed patterns include:

- carrier-specific path selection;
- API/clearinghouse/portal automation;
- structured benefits extraction;
- deductible/coinsurance/out-of-pocket/plan-rule capture;
- result attachment/writeback;
- ad-hoc, scheduled or event-driven verification.

For Saudi Arabia, Astro must translate this capability family into NPHIES and qualified payer/provider integration rather than copying US carrier assumptions.

### Prior authorization

Observed features include:

- payer-specific packet assembly;
- policy/record evidence gathering;
- submission through portals/other channels;
- status polling;
- approval/denial/additional-document handling;
- auth-number/unit writeback;
- evidence/audit history;
- team notification/escalation.

### Referrals and order management

GenHealth publicly describes structured referral intake/tracking and follow-up actions. Zyara should treat referral completion as a durable workflow with missing-document, patient-contact, insurance, appointment and receiving-provider states.

### RCM and claims operations

Observed capability families include:

- medical billing;
- clean-claim preparation/submission;
- payment posting;
- remittance reconciliation;
- claims follow-up;
- status checks and resubmissions;
- denials and appeals;
- aging-bucket workflows;
- secondary/tertiary follow-up where applicable;
- concurrent review;
- stock-and-bill workflows for relevant settings;
- operational analytics/reporting.

Zyara must map only locally valid Saudi workflows and external authority. NPHIES messages/evidence own payer transaction truth where applicable.

### Grounded operational chat

GenHealth describes AI chat that can:

- combine context from records, policies, documents and workflow history;
- produce cited answers tied to source records;
- coordinate actions across connected systems;
- maintain governed access and activity history.

This is directly relevant to the `Zyara Clinic` copilot pattern: grounded Q&A plus typed actions under policy, not a free-form model with credentials.

### Workflow developer surface

GenHealth's public developer documentation exposes workflow resources, versions/runs and many public actions. Astro should therefore treat a versioned workflow/action catalog as a first-class platform requirement, not an internal implementation detail.

## 2. Plena Health — operating-layer pattern

Plena publicly positions itself as an operating layer between doctors, staff, patients and existing EHR/EMR systems, with workflows rather than isolated AI products.

Observed platform concepts:

- Phone Agent;
- workflow automation / Autoflow;
- Smart Scheduler;
- authorization and RCM automation;
- native EHR integration without requiring a parallel patient chart;
- named workflow steps with logged actions;
- human escalation rather than unbounded autonomy.

### Documents and referrals

Observed patterns include:

- fax-queue processing;
- classification;
- patient extraction/matching;
- referral routing;
- push/writeback to EHR;
- backlog processing and same-day outreach patterns.

### Patient communications

Observed capabilities include:

- inbound voice;
- outbound voice campaigns;
- SMS/text;
- chat;
- multilingual interaction;
- new-patient intake;
- appointment confirmation;
- cancel/reschedule;
- procedure-prep guidance;
- missed-call/voicemail recovery;
- refill-request routing;
- recall/follow-up outreach;
- after-hours coverage;
- smart escalation with full context;
- threaded two-way SMS handoff to staff;
- call/transcript analytics and configurable routing.

For Zyara, WhatsApp must be treated as a first-class Saudi/regional channel where legally/provider-contractually supported, behind the same consent and conversation model.

### Procedure lifecycle

Plena publicly describes an end-to-end specialty-procedure arc including:

- pre-procedure screening;
- medication/allergy/anesthesia questions;
- prep-instruction coaching;
- timed reminders;
- day-before confirmation;
- escort/ride verification where required;
- cancellation backfill;
- after-hours prep questions;
- post-procedure follow-up;
- surveillance recall;
- overdue recall campaigns;
- direct schedule/EMR writeback under configured workflow rules.

Astro should generalize this into a `Care/Procedure Journey` workflow family, with specialty-specific protocols and clinician-owned escalation rules rather than hard-coded GI-only behavior.

### Scheduling, waitlist and capacity

Plena publicly describes booking, waitlists, recalls and cancellation backfill. Zyara should plan eligibility-aware slot matching, policy-constrained offers, temporary offer/hold semantics, first-accepted allocation, patient consent and reconciliation with external calendar authority.

### Prior authorization

Observed Plena features include:

- requirement detection;
- submission assembly;
- payer portal filing;
- fax fallback;
- status polling;
- peer-to-peer prompt handling/scheduling;
- approval filing/writeback;
- denial routing and appeal packet assembly;
- order-to-approval audit.

### Control plane and governance

Plena's public control-plane material is especially relevant to Zyara's AI-era direction. Observed features include:

- live activity across agents/workflows/locations;
- weekly performance rollups;
- anomaly alerts;
- pause/resume controls;
- script/workflow A/B testing;
- SLA monitoring;
- per-location rollups;
- compliance/audit export;
- staff handoff queue;
- transcript review;
- related EHR writes attached to interaction history;
- role-based access;
- per-agent guardrails and escalation rules.

Astro must design this as a core Zyara Clinic surface. Automation without operator visibility/control is not acceptable.

## 3. Zyara parity floor derived from GenHealth + Plena

Astro must reconcile every row below against existing implementation and produce `PRESERVE / BUILD / ADAPT / INTEGRATE / DEFER / REJECT` plus dependency and evidence gates.

| Capability | GenHealth signal | Plena signal | Zyara target |
|---|---|---|---|
| Workflow capture/discovery | Browser recorder/manual-flow learning | Forward-deployed workflow optimization | Governed workflow discovery/compiler with review before activation |
| Multi-system actions | Web/portal/EHR/billing | EHR/phone/SMS/fax/scheduling/payor systems | Typed connector/action plane; browser fallback only when needed |
| Fax/document intake | OCR + source citations | Fax/referral automation | Provenance-first document intake and exception queue |
| Referral automation | Intake/referral tracking | Referral backlog processing | Referral state machine through booked/closed/returned/incomplete |
| Eligibility | API/clearinghouse/portal | Authorization/payor context | Saudi NPHIES/payer adapter with truthful evidence |
| Medical necessity | Policy criteria + cited evidence | Submission packet preparation | Policy-versioned evidence work packet; human/authority boundary |
| Prior authorization | assemble/submit/poll/writeback | detect/file/poll/P2P/approval/denial | Durable authorization workflow + NPHIES/external adapters |
| Patient phone | outbound/information gathering | inbound/outbound/after-hours | Zyara Connect Voice administrative agent, separately gated |
| SMS/chat | workflow notifications | two-way SMS/chat | Unified conversation contract + WhatsApp/SMS/in-app/email adapters |
| Scheduling | connected workflow actions | Smart Scheduler | Native Zyara scheduling ledger + external reconciliation |
| Waitlist/backfill | workflow-capable | cancellation backfill/recall | Eligibility-aware waitlist/earlier-slot offers with atomic allocation |
| Procedure journey | adjacent workflow support | full procedure lifecycle | Specialty-configured preparation/confirmation/follow-up/recall engine |
| Refill request handling | patient/provider outreach | refill request routing | Route request + context; clinician authorization remains human |
| Claims/billing | billing/claims follow-up | Auth & RCM / down-code recovery patterns | Saudi-valid RCM/claim workflow, never US semantics by assumption |
| Payment posting | posting/reconciliation | RCM operating layer | Payment/remittance reconciliation where Zyara owns scope |
| Denials/appeals | denial diagnosis/appeals | denial routing/appeal work | Evidence-backed appeal preparation and tracking |
| Analytics | RCM/ops reporting | per-agent/location/workflow reporting | Zyara Insights: workflow + access + clinic + financial metrics |
| Grounded ops chat | cited Q&A + coordinated actions | operator context/control | Clinic copilot with source citations and typed tool invocation |
| Human handoff | exception routing | staff handoff queue | Unified exception inbox with resumable workflow state |
| Audit/action log | tracked executions | complete action/transcript logs | Immutable/append-only action receipts + export policy |
| Agent guardrails | governed access | per-agent controls | Deterministic policy, scoped identities, authority classes |
| Pause/resume | workflow management | explicit operator controls | Required at workflow/location/connector scopes |
| A/B/canary | batch testing/approval concept | script A/B testing | Safe staged rollout; no unsafe experimentation on clinical decisions |
| SLA/anomaly monitoring | reporting/exception model | SLA + anomaly alerts | Operational observability with privacy-safe metrics |

## 4. Zyara clinic workflow library Astro must plan

### Access and front desk

- answer routine calls/messages;
- new-patient registration/intake;
- demographic/insurance collection;
- identity/deduplication review;
- schedule/book/reschedule/cancel;
- appointment confirmation;
- waitlist/earlier slot/cancellation backfill;
- referral intake and conversion;
- missing-document chase;
- check-in preparation;
- queue/delay communication;
- no-show/cancel follow-up;
- recall campaigns.

### Documents and records operations

- fax ingestion;
- email attachment ingestion;
- classification;
- OCR/extraction with source citations;
- patient/chart matching;
- record filing after confidence/permission checks;
- external record requests;
- duplicate detection;
- document retention/deletion handling;
- staff review queue for ambiguous cases.

### Insurance and RCM

- acceptance/coverage discovery;
- eligibility inquiry;
- benefit context;
- authorization requirement detection;
- prior-auth packet preparation/submission/status/reconciliation;
- supporting-document requests;
- denial/appeal preparation;
- claim creation/submission/status;
- payment/remittance posting and reconciliation;
- outstanding claim follow-up;
- underpayment/variance detection where supported;
- patient-balance workflow where lawful/owned;
- complete transaction provenance.

### Procedure and care operations

- pre-visit/pre-procedure forms;
- preparation instruction delivery;
- confirmation;
- escort/transport checks where configured;
- medication hold question routing, never autonomous clinical instruction generation;
- cancellation backfill;
- post-visit/procedure check-in;
- configured symptom/red-flag escalation;
- surveillance/follow-up recall;
- referral loop closure;
- lab/imaging result receipt/task routing.

### Clinician support

- pre-visit context preparation;
- chart/document summarization with citations;
- ambient/dictation draft documentation;
- code/problem/order suggestions for clinician review;
- result inbox triage assistance;
- refill request packet preparation;
- prior-auth work packet preparation;
- patient instruction draft;
- follow-up task preparation;
- unsigned-work and stale-task reminders.

### Operations leadership

- backlog detection;
- capacity and utilization visibility;
- staff/automation workload split;
- SLA breaches;
- error/retry/reconciliation trends;
- channel performance;
- cancellation/no-show/waitlist performance;
- authorization/claim cycle time;
- integration health;
- workflow cost/volume;
- quality review sampling;
- automation opportunity recommendations grounded in actual workflow evidence.

## 5. Architecture implications for Astro

Astro should compare existing Zyara architecture with a control-plane pattern similar to:

```text
Workflow Trigger / Request
        |
        v
Context + Provenance Resolver
        |
        v
Policy / Consent / Authority Gate
        |
        v
Workflow Version + State Machine
        |
        +--> AI helper: classify / extract / draft / plan
        |
        v
Typed Action Router
   |      |       |       |       |
 Zyara   FHIR   NPHIES   Channel  Browser/Fax/Phone fallback
   |      |       |       |       |
        v
Action Receipts + Correlation IDs
        |
        v
Outcome Verification / Reconciliation
        |
   +----+-----+
   |          |
Complete   Human Exception Queue
        |
        v
Audit + Analytics + Workflow Improvement
```

This should be one shared automation substrate used by clinic operations, communications, scheduling and RCM rather than a different ad-hoc agent loop for every feature.

## 6. Non-negotiable differentiation

Zyara should not copy competitor positioning as a generic US healthcare RPA vendor. The desired differentiation is:

- Saudi-first and NPHIES-aware;
- patient + clinic + clinician in one network;
- Arabic/Saudi Arabic and English/code-switch operation;
- healthcare graph/provenance/freshness as product foundations;
- native scheduling and care-access authority rather than only automating legacy EHR clicks;
- unified patient `My Health` continuity;
- `Zyara Connect` communications/telehealth;
- open/standards-based FHIR/SMART boundaries;
- inspectable automation authority, receipts and human handoff;
- ability to run native Zyara workflows directly and automate external legacy systems only where necessary.

## 7. Astro deliverable required from this research

Astro must produce a repository-native matrix covering every observed GenHealth/Plena feature family with:

```text
feature
public evidence URL/date
patient/clinic/clinician job
current Zyara state
PRESERVE / BUILD / ADAPT / INTEGRATE / DEFER / REJECT
native vs external workflow
AI involvement
required authority class
source system of truth
failure/exception path
privacy/security impact
Saudi/NPHIES localization impact
tests/evidence
phase/slice/task
```

No feature may be marked complete from planning prose alone.
