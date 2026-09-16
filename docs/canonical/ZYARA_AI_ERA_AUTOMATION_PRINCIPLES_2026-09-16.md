# Zyara AI Era Automation Principles

**Founder direction:** 2026-09-16
**Status:** whole-product planning authority for the Astro master-plan pass.
**Scope:** patient, clinic, clinician, communications, insurance/revenue-cycle, interoperability, analytics and AI automation across Zyara Network.

## North star

> **Zyara should be the healthcare operating network built for the AI era.**
>
> Patients should experience Zyara as a health partner. Clinics should experience Zyara as an operating system that removes repetitive work, keeps people in control, and continuously improves the path from demand to care to follow-up.

The product objective is not to add a chatbot to legacy clinic software. The objective is to redesign clinic work around a governed automation substrate.

## The automation thesis

Every repeated clinic workflow is a candidate for one of four outcomes:

```text
ELIMINATE
AUTOMATE
ASSIST
KEEP_HUMAN
```

Astro must classify work by risk, authority, reversibility, evidence quality and integration capability rather than by whether an LLM can technically attempt it.

The preferred operating model is:

```text
EVENT / REQUEST
-> acquire authoritative context
-> classify workflow + risk
-> deterministic policy / authorization
-> structured plan or approved workflow version
-> typed actions across Zyara and external systems
-> receipts + source evidence
-> outcome verification
-> exception / human handoff when needed
-> analytics + workflow improvement
```

A model may help understand, draft, extract, classify, summarize or propose. Models do not grant themselves authority.

## AI-native clinic experience

A clinic should be able to say or configure outcomes such as:

- process every inbound referral and route incomplete cases;
- clear the fax/document queue;
- verify coverage before upcoming visits;
- identify appointments that need prior authorization and complete the routine submission path;
- chase pending authorizations and surface only exceptions;
- answer routine calls and messages at any hour;
- book, confirm, cancel and reschedule within clinic policy;
- fill a cancellation from an eligible waitlist;
- run recall campaigns and book due patients;
- send procedure-preparation instructions and verify completion;
- follow up after visits/procedures and escalate configured red flags;
- route refill requests to the responsible clinician with context;
- reconcile external schedule changes;
- prepare charts and administrative pre-visit context;
- ingest documents, extract fields with provenance and file validated data;
- follow outstanding claims, post payments and identify reconciliation gaps;
- prepare denial/appeal work packets from authoritative records and policies;
- generate operational reports with denominators, exceptions and missingness;
- detect workflow backlogs, SLA breaches and unusual failure patterns;
- suggest automation opportunities discovered from repeated manual work.

This list is a floor, not a ceiling. Astro must inventory the real clinic work graph end to end.

## Automation must be workflow-shaped, not chatbot-shaped

Zyara should expose named workflow steps, explicit states and inspectable actions. Long-running operations need durable state, retries, reconciliation and terminal outcomes.

Every material automated workflow must define:

- trigger;
- owner;
- actor/service account;
- required context;
- policy and consent checks;
- authoritative source systems;
- allowed actions;
- timeout/retry/idempotency rules;
- external correlation IDs;
- human decision points;
- exception queue;
- completion evidence;
- rollback or correction path;
- audit retention;
- metrics and quality indicators.

## Automation authority classes

Astro must define a reusable authority model at least as strict as:

```text
A0 OBSERVE      read permitted state only
A1 DRAFT        produce a draft/proposal for review
A2 PREPARE      assemble a complete work packet but do not submit
A3 EXECUTE_LOW  reversible administrative action under policy
A4 EXECUTE_MED  consequential operational action with explicit confirmation or standing authority
A5 HUMAN_ONLY   clinician/legal/financial authority that automation may support but not own
```

Examples:

- summarize a referral -> A1;
- populate a prior-auth packet -> A2;
- send an approved appointment reminder -> A3;
- reschedule a patient after explicit accepted offer and policy checks -> A4;
- sign a prescription or clinical order -> A5.

The exact classes may change, but the distinction must remain explicit and enforceable.

## Human handoff is a first-class product surface

Automation is not successful merely because an agent stops running. Every workflow needs a defined exception path.

The clinic should have one coherent work queue that can show:

- what the automation was trying to do;
- the patient/appointment/order/claim context permitted for that operator;
- source evidence;
- completed steps;
- failed/blocked step;
- proposed next action;
- deadline/SLA;
- who owns the exception;
- safe resume/retry/cancel controls.

Do not force staff to reconstruct agent context from logs.

## Automation control plane

Zyara Clinic needs an operator-facing control plane for all automation, whether the executor is deterministic code, an AI-assisted workflow or an external integration.

Minimum planning requirements:

- live and historical workflow activity;
- per-location, per-workflow and per-agent views;
- pause/resume/disable controls;
- explicit permissions and guardrails;
- workflow version and change history;
- transcript/document/source review where applicable;
- handoff and exception queue;
- action receipts and external reference IDs;
- SLA/latency/failure monitoring;
- anomaly alerts;
- safe replay/retry;
- audit export;
- quality sampling/review;
- staged rollout/canary/A-B testing where ethical and appropriate;
- cost/volume/automation-rate reporting without treating automation rate as a quality score.

## Workflow discovery and compilation

Astro must plan a safe way to learn repetitive clinic operations without granting a model ambient authority.

Candidate pattern:

```text
RECORD / OBSERVE MANUAL WORK
-> identify repeated steps
-> redact/minimize sensitive capture
-> human names the desired outcome
-> compile a typed candidate workflow
-> simulate against synthetic/test cases
-> review permissions and failure paths
-> approve a version
-> staged execution
-> measure outcome
-> revise with full version history
```

Prefer API/FHIR/database-safe adapters over UI automation. Browser/portal automation is a fallback for external systems that provide no adequate API and must use scoped credentials, anti-exfiltration controls and explicit coverage limits.

## AI assistant surfaces

### Patient

`Zyara AI` should help the patient find care, understand permitted record content, manage appointments and complete administrative actions through typed tools. It should never silently rewrite the record or become an unsupervised diagnosis/prescribing authority.

### Clinic staff

The staff copilot should answer grounded questions across permitted clinic systems, summarize queues, prepare work and invoke authorized workflows. Answers that depend on records or policies should link to their source evidence.

### Clinician

The clinician copilot may prepare visit context, draft documentation, stage orders, summarize results and prepare follow-up actions. Clinician-signing boundaries remain explicit.

### Operations leadership

The operations copilot should explain bottlenecks, automation failures, capacity, demand, cancellations, unresolved claims and SLA breaches from governed metrics rather than inventing causal stories.

## Channel automation

The same workflow may cross multiple channels:

- in-app;
- web;
- email;
- SMS;
- WhatsApp;
- voice/phone;
- fax;
- payer/provider portals;
- FHIR/REST APIs;
- external scheduling/EHR/RCM systems.

Conversation history, consent/preferences, locale, template version, delivery state and actor identity must remain coherent across channels.

## Safety boundaries

Automation must not:

- invent clinical facts;
- issue clinician-only prescriptions/orders;
- hide an unresolved booking/auth/claim state as success;
- bypass patient consent or communication preferences;
- use broad shared credentials when scoped identities are available;
- continue acting after authority is revoked;
- train on PHI by default;
- expose raw secrets to model context when mediation is possible;
- treat browser success as proof of downstream business completion without verification;
- let a workflow edit its own policy/evaluator to make itself pass;
- suppress exceptions to improve an automation KPI.

## Product experience principle

The AI-era advantage should be visible as **less work**, not more AI chrome.

Patients should see faster access, clearer next steps and continuity. Staff should see smaller queues, fewer repetitive calls/clicks and better exception context. Clinicians should spend less time on administrative preparation and documentation. Leaders should see trustworthy operational state and control.

## Mandatory Astro output

The master plan must include:

1. clinic work inventory from first contact through follow-up/revenue cycle;
2. automation opportunity map with `ELIMINATE / AUTOMATE / ASSIST / KEEP_HUMAN`;
3. workflow runtime/control-plane architecture;
4. authority-class model;
5. typed action/connector model;
6. browser/fax/phone/document automation boundary;
7. human handoff/exception architecture;
8. workflow recorder/discovery/compilation strategy;
9. audit/receipt/verification model;
10. rollout/monitoring/quality-review model;
11. GenHealth and Plena feature reconciliation;
12. competitor/source adoption matrix;
13. phased task graph that can deliver automation safely without blocking discovery/booking value.

The product target is complete clinic automation where it is safe and useful, not autonomy for its own sake.
