# Zyara Network — Whole-Product Vision

**Founder direction: 2026-09-16**
**Planning scope: whole product, not only the discovery launch wedge**

## Product thesis

> **Zyara — Your health partner.**
>
> When a person needs care, they start with Zyara. When a clinic needs to operate, communicate, schedule, document, coordinate and understand its care delivery, it can run through Zyara Network.

`Zyara Network` is the umbrella product. Discovery remains the first market-entry wedge, but it is no longer the ceiling of the product plan. The architecture and roadmap must converge toward a coherent patient + clinician + clinic network rather than a collection of disconnected features.

The target is not a cosmetic Doctolib clone, an isolated EHR, or a generic ERP with healthcare labels. Zyara should connect discovery, access, operations, clinical continuity, communications, insurance workflows and patient-owned care navigation around one evidence-aware healthcare graph.

## Naming decision

Use the following product hierarchy unless later product research disproves it:

- **Zyara Network** — the full ecosystem and platform.
- **Zyara** — the patient-facing product and primary public brand.
- **Zyara Clinic** — clinic/practice operating workspace.
- **Zyara Doctor** — clinician workspace for schedule, patient context and clinical work.
- **Zyara Connect** — secure communications, telehealth, remote collaboration and synchronous/asynchronous care communications.
- **Zyara Insights** — operational, access, financial and governed aggregate analytics.
- **Zyara AI** — cross-surface navigation/copilot layer operating through typed tools and explicit authority.
- **My Health** — the patient navigation label for the longitudinal personal health area inside Zyara; avoid unnecessary sub-branding.

Do **not** use `Terminal` or `Gate` as the umbrella customer-facing product name. They imply technical execution or access control rather than a health relationship. `Connect` is the strongest name for the communications/telehealth subsystem.

## Versioning direction

`Zyara Network 1.0` is the whole-system target. It may be delivered through dependency-ordered internal releases, pilots and early-access slices, but Astro must plan the complete 1.0 picture before implementation is fragmented.

The current discovery-first V1 work is preserved as the **Network access/discovery foundation**. Earlier statements that EHR, prescribing, telehealth, claims or broad clinic operations are “not V1” are superseded as a **whole-product planning ceiling**. They may still be deferred to later implementation slices inside the Network 1.0 program when dependency, safety, regulatory or integration evidence requires it.

## Primary users

### Patient / caregiver

A patient should be able to use Zyara to:

1. find appropriate doctors, clinics, hospitals, labs, imaging, pharmacies and services;
2. compare distance, hours, insurance context, availability, doctor reputation and facility reputation;
3. call, WhatsApp, message, request, book, reschedule, defer or cancel care;
4. join a telehealth visit and communicate securely with the care team;
5. see upcoming visits, past visits and follow-up actions;
6. access permitted visit summaries, prescriptions, medications, lab results, imaging reports, referrals, vaccinations, allergies, conditions, documents and care plans with source/provenance labels;
7. manage insurance information, eligibility state where authoritative, prior-authorization status and patient financial responsibilities where available;
8. manage family/dependent/delegate access under explicit authority;
9. receive reminders through configured channels and preferences;
10. ask Zyara AI natural-language questions about navigation and their authorized record, with grounded answers and visible source boundaries;
11. keep a coherent **My Health** timeline across Zyara-native care and consented imported records without silently rewriting source clinical truth.

### Doctor / clinician

A clinician should have one focused workspace that supports:

- today/week schedule and personal availability;
- multiple clinic/location roles without duplicating clinician identity;
- pre-visit patient context and outstanding tasks;
- start/join telehealth;
- visit documentation and specialty templates;
- vitals/history/problem/allergy/medication review as permitted;
- orders for labs/imaging/referrals where legally and operationally supported;
- clinician-authorized prescriptions and refill workflows;
- results review and patient communication;
- inbox/tasks/referrals/authorization work;
- leave, schedule exceptions and availability proposals;
- clear audit of changes made by clinic staff to the clinician's schedule;
- mobile-friendly access for high-frequency workflows.

AI may draft, summarize, retrieve or propose. It must not become the independent clinical signing authority.

### Clinic / practice

A clinic should be able to run its outpatient operations through Zyara Clinic:

- organization, branches, departments, rooms and resources;
- staff, practitioner roles, privileges and credentials;
- public profile, media, services, specialties, accepted insurance assertions and contact channels;
- appointment types, durations, buffers, resource recipes and eligibility rules;
- calendars, recurring templates, exceptions, leave, holidays, holds and controlled overbooking;
- patient booking, staff booking, request queues, waitlists, recalls, earlier-slot offers, cancellation, reschedule and defer/follow-up workflows;
- check-in, queue, delayed-provider and branch-change operations;
- email, SMS, WhatsApp, push and in-app communication with templates, consent/preferences and delivery state;
- unified patient communications/inbox with internal assignment/notes and audit;
- intake, questionnaires, consents and document/e-sign workflows;
- telehealth waiting room, calls, secure chat and remote collaboration;
- clinical charting, encounter documentation, medication/prescription workflows, labs, imaging, referrals, documents and care plans where in scope;
- insurance eligibility, prior authorization and claims workflows through qualified Saudi integrations such as NPHIES rather than invented local truth;
- patient invoicing/payment and revenue-cycle work where implemented;
- reviews and replies without provider-controlled deletion of compliant negative feedback;
- operations, access, demand, utilization, communication, financial and quality-governed analytics;
- exports, audit, retention, role administration, integration status and business continuity.

## Product surfaces

```text
Zyara Network
|
+-- Zyara (Patient)
|   +-- Discover
|   +-- Appointments
|   +-- Connect
|   +-- My Health
|   +-- Insurance & Billing
|   +-- Family / Delegates
|   +-- Messages & Notifications
|
+-- Zyara Clinic
|   +-- Front Desk
|   +-- Calendar & Capacity
|   +-- Patient Operations
|   +-- Communications
|   +-- Clinical Operations
|   +-- Insurance & Revenue Cycle
|   +-- Staff / Roles / Credentials
|   +-- Reviews & Reputation
|   +-- Insights
|
+-- Zyara Doctor
|   +-- Schedule
|   +-- Patient Context
|   +-- Encounter / Notes
|   +-- Orders / Results / Rx
|   +-- Inbox / Tasks
|   +-- Telehealth
|
+-- Zyara Connect
|   +-- Secure Messaging
|   +-- Video / Audio Visits
|   +-- Waiting Room
|   +-- Group Care / Tele-expertise
|   +-- Channel Orchestration
|
+-- Network Platform
    +-- Healthcare Graph
    +-- Scheduling Authority
    +-- Clinical Data & FHIR
    +-- Identity / Consent / Delegation
    +-- NPHIES / Payer Adapters
    +-- Notifications
    +-- Analytics Event Plane
    +-- Audit / Provenance / Security
    +-- Public / Partner APIs
    +-- AI / Voice Tool Plane
```

## Patient My Health contract

`My Health` is a longitudinal, source-aware view, not an unqualified claim that Zyara owns every clinical truth.

Minimum target categories:

- upcoming and past appointments;
- attended visits/encounters;
- visit summaries and clinician-authored notes exposed to the patient;
- medications and prescriptions, with source and status;
- allergies and intolerances;
- conditions/problem list with source;
- lab orders/results and trends;
- imaging orders/reports and optional governed image viewing;
- vaccinations;
- referrals and service requests;
- care plans and follow-up tasks;
- patient documents;
- insurance cards/policies and verified eligibility observations;
- bills, receipts and payment state where supported;
- consent/sharing history;
- patient-entered observations clearly labeled as patient-entered;
- connected-device/wearable data only through explicit opt-in and a separate provenance class.

Never silently convert document extraction, AI inference, patient text or review content into clinician-authored clinical truth.

## Scheduling contract

Scheduling is an authoritative state machine, not UI-only calendar mutation.

The plan must support:

- search availability;
- staff/manual booking;
- patient self-booking;
- request-based booking;
- temporary holds;
- confirmation;
- cancel;
- reschedule;
- defer a follow-up/recall to a later window;
- waitlist/ASAP state;
- earlier-slot offers;
- recurring appointments when clinically/operationally appropriate;
- provider leave and exceptions;
- clinic-initiated schedule changes with patient notification and audit;
- resource conflicts across clinician, room, machine and service capacity;
- external calendar/EHR synchronization with reconciliation rather than optimistic fiction.

No schedule change is silently lost. Patient-visible state must distinguish requested, pending, booked, cancelled, rescheduled and unresolved external outcomes.

## Communications contract

Communication is a product platform, not a collection of ad-hoc API calls.

Target channels:

- in-app inbox;
- email;
- SMS;
- official WhatsApp channel;
- push notifications;
- secure care-team messaging;
- voice/phone automation only after separate safety and quality gates.

The orchestration layer must support localized templates, preferences/consent, transactional versus marketing purpose, quiet hours, delivery receipts, retries, deduplication, escalation, opt-out rules, channel fallback and audit. Sensitive clinical detail must not be sprayed across insecure channels merely because a provider API supports them.

## Zyara Connect contract

Zyara Connect should be designed from mature real-time communication patterns rather than building a raw WebRTC stack from scratch.

Target capabilities:

- authenticated waiting room;
- pre-call device check;
- patient/clinician identity and appointment binding;
- 1:1 and approved multi-party video/audio;
- secure chat and file/document exchange;
- screen sharing where justified;
- reconnect and degraded-network behavior;
- explicit call lifecycle and attendance evidence;
- caregiver/interpreter participation under authorization;
- group-care and tele-expertise modes;
- clinician handoff/escalation;
- recording/transcription **off by default** unless explicitly authorized, consented and retained under a governed policy;
- no emergency-care substitution claim.

`Zyara Connect` should expose a stable domain contract so the real-time engine can be LiveKit, Jitsi or another qualified provider without owning clinical state.

## Clinical workflow and prescriptions

The full plan must cover outpatient clinical work while preserving hard authority boundaries.

Target clinical capabilities include:

- encounter/visit record;
- configurable note templates;
- vitals and history;
- conditions/problems;
- allergy/intolerance reconciliation;
- medication list;
- clinician-authorized prescription and refill workflows;
- drug/allergy/interaction checks through deterministic or authoritative services;
- lab and imaging orders/results;
- referrals and care coordination;
- documents and signed forms;
- follow-up/recall tasks;
- care plans;
- patient-facing summaries.

AI may prepare a note or proposed order/prescription text, but **a qualified human clinician and the authoritative prescribing/order system own the signed action**. Do not treat commandMed, an LLM or a transcription model as prescribing authority.

## Saudi insurance and financial workflows

Treat these as separate concepts:

```text
Directory insurance acceptance
!= Patient eligibility
!= Benefit detail
!= Prior authorization
!= Claim adjudication
!= Payment/remittance
```

Saudi planning must explicitly qualify NPHIES. The current NPHIES financial-services implementation guide uses FHIR R4.0.1 exchanges for eligibility, prior authorization, claims, cancellation/supporting information and payment-related workflows. Zyara must use qualified adapters and preserve external transaction/reference identities; it must never convert a listed insurer logo into a guaranteed-coverage claim.

Target financial/insurance capabilities include:

- payer/network/product configuration;
- patient coverage capture;
- eligibility checks and evidence;
- benefit detail where supported;
- prior authorization work queue and supporting documents;
- claim generation/submission/status;
- rejection/denial work queue;
- remittance/reconciliation;
- patient responsibility and statements;
- online payment/refund/receipt where approved;
- fee schedules and charge capture where the product owns them;
- complete audit/provenance.

## Analytics contract

Zyara Insights should answer operational questions without turning analytics into unsafe clinical authority.

Families include:

- discovery demand and zero-result demand;
- profile/action conversion;
- time to next appointment;
- calendar utilization and resource bottlenecks;
- cancellation/reschedule/no-show/attendance;
- waitlist fill and released-capacity recovery;
- communication delivery/response;
- queue and request turnaround;
- provider/facility reputation trends;
- insurance eligibility/authorization/claim operational state;
- revenue-cycle aging and denial categories where supported;
- patient portal adoption and follow-up completion;
- telehealth operational quality;
- data freshness/completeness and integration health.

Patient free text, symptoms and cross-provider identity trails must not become routine provider analytics. Use minimized, pseudonymized and small-cell-suppressed aggregate reporting according to the privacy plan.

## Workforce scope

Zyara Clinic needs healthcare workforce operations but should not blindly become a full generic HR/payroll suite.

Core Network 1.0 planning should include:

- staff directory;
- roles and permissions;
- branch/team assignment;
- practitioner credentials/privileges;
- availability, shifts, leave and schedule exceptions;
- onboarding/offboarding access lifecycle;
- workload/capacity views;
- audit and delegated administration.

Payroll, recruitment and broad HR may be native later or integrated. Qdrat/Horilla patterns can inform workflows, but healthcare identity, privilege and audit semantics remain Zyara-owned.

## Architecture principles

1. **Modular domain architecture, not a giant feature monolith.** Keep bounded modules with stable contracts.
2. **FHIR at boundaries, explicit operational semantics internally.** Do not force every transactional invariant into generic FHIR persistence.
3. **One person can hold multiple roles.** Account, Patient, Practitioner, staff actor, delegate and organization membership are distinct authorities.
4. **One practitioner can work in many organizations/locations.** Preserve `PractitionerRole`.
5. **One authoritative operation owner per state transition.** Avoid dual-write ambiguity in appointments, claims, prescriptions or messages.
6. **Event/outbox and idempotency by default** for external communication and integrations.
7. **Evidence and provenance travel with facts.** Source, validity, observed time and freshness remain visible.
8. **No AI-owned clinical truth.** Structured systems and authorized humans own facts/actions.
9. **Local/private-friendly where practical, deployable for regulated production where qualified.** Do not confuse local-first research projects with production healthcare authorization.
10. **Saudi-first, standards-aware, internationally extensible.** Country-specific policy lives in adapters/configuration rather than contaminating core identities.
11. **Patient and provider channels share one network but not one permission model.** Least privilege and tenant isolation are mandatory.
12. **Do not copy entire donor platforms.** Prefer narrow adaptation/dependency patterns with exact provenance and upgrade strategy.

## Delivery strategy

Astro must plan the complete Network 1.0 end state, then decompose implementation into dependency-ordered releases. A suggested planning shape to challenge, not blindly accept:

1. **Network Foundation** — identity, graph, security, provenance, FHIR/adapters, event/outbox, design system.
2. **Access** — discovery, specialties/services, maps, trust, reviews, profile claims, booking access.
3. **Clinic Operations** — calendars, capacity/resources, front desk, waitlist, cancellations/reschedules, roster, staff permissions.
4. **Communications** — notifications, unified inbox, forms/consent, document workflows.
5. **Zyara Connect** — telehealth and remote collaboration.
6. **My Health** — longitudinal patient timeline, documents, labs/results, medications/prescriptions, insurance and delegate access.
7. **Clinical Workspace** — doctor charting, orders, results, prescribing, referrals, tasks and visit summaries.
8. **Insurance & Revenue Cycle** — NPHIES qualification, eligibility, authorizations, claims, denials, payments/reconciliation.
9. **Insights** — operations, access, financial and integration analytics.
10. **AI/Voice** — grounded patient assistant, provider copilot, phone/voice surfaces, each behind measured safety/quality gates.
11. **Network Qualification** — security, privacy, interoperability, resilience, disaster recovery, accessibility, real-provider validation and production authorization.

Astro may change the sequence where the live repository and dependency graph justify it, but cannot omit a capability merely because it belongs later in the sequence.

## Explicit full-picture requirement

The next canonical plan must answer both questions:

1. **What is the smallest safe next implementation unit?**
2. **How does that unit fit into the complete Zyara Network product we intend to build?**

A plan that optimizes only discovery V1 while leaving clinic operations, clinician workflows, patient longitudinal health, telehealth, insurance/revenue cycle and communications as vague “future” bullets is incomplete.
