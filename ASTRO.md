# Astro Master Planning Brief — Zyara Network

Use English only for all repository, GitHub, technical, planning, evidence, task, review and implementation-facing content.

## Mode

**MASTER PLAN FIRST / PLAN-ONLY IN THIS PASS.**

Do not implement production product code during this planning pass. Build the complete executable canonical plan for **Zyara Network**, then produce an implementation handoff that can drive dependency-ordered execution without rediscovering the product thesis.

This pass must cover the whole intended product, not only the current discovery launch wedge.

All material planning artifacts, source decisions, architecture decisions, task graphs, acceptance gates and handoff material must live in the repository. Do not leave important decisions only in local notes or chat output.

Do not stop until the whole-product planning completion gate is genuinely satisfied.

## Product authority

The product authority is **Zyara**, not Astro or another agent.

The product promise is:

> **Zyara — Your health partner.**
>
> When a person needs care, they start with Zyara. When a clinic needs to operate, communicate, schedule, document, coordinate and understand care delivery, it can run through Zyara Network.

The umbrella product is **Zyara Network**.

Preferred product surfaces:

- `Zyara` — patient product;
- `Zyara Clinic` — clinic/practice operating workspace;
- `Zyara Doctor` — clinician workspace;
- `Zyara Connect` — communications, telehealth and remote collaboration;
- `Zyara Insights` — analytics;
- `Zyara AI` — grounded navigation/copilot layer;
- `My Health` — patient longitudinal health area inside Zyara.

`Connect` is the preferred name for the real-time/communications subsystem. Do not use `Terminal` or `Gate` as the customer-facing umbrella name unless new product research proves a materially stronger reason.

## Critical scope correction

Earlier V1 planning deliberately defined V1 as discovery + trust + access and treated broad EHR, telehealth, prescribing, claims and full clinic operations as later work.

**That is no longer the whole-product planning ceiling.**

Preserve the discovery-first work as the first market-entry foundation, but now plan the complete `Zyara Network 1.0` target across:

- discovery and access;
- booking and scheduling;
- clinic operations;
- doctor workspace;
- patient My Health longitudinal record;
- communications and notifications;
- telehealth / Zyara Connect;
- outpatient clinical documentation;
- labs, imaging, referrals and care plans;
- clinician-authorized prescriptions/refills;
- Saudi insurance eligibility/prior authorization/claims integration;
- patient billing/payments where owned;
- provider/clinic analytics;
- AI/voice/call-assistant capabilities;
- FHIR/SMART/partner interoperability;
- security, privacy, provenance, audit and disaster recovery.

Plan the complete target first, then phase delivery according to dependency, safety, regulation, integration and evidence. Do **not** collapse everything into one unsafe implementation sprint.

## Live-truth rule

Before planning:

1. Reverify exact `main` SHA.
2. Reverify all open PRs and relevant branches.
3. Reverify the state of PR #94 (`feat(web): complete Zyara V1 discovery UI`) or its successor; do not plan as if concurrent UI work does not exist.
4. Reverify canonical authority, task/evidence state, migrations, implementation, tests and CI.
5. Treat live repository/GitHub truth as authoritative over stale handoff language.
6. Preserve proven completed work; do not rebuild correct systems merely because the product scope expanded.
7. Never fabricate tests, CI, provider data, patient data, insurance evidence, regulatory authority, pilots, contracts, clinical validation, commercial validation or production readiness.
8. Never force-push, rebase, rewrite shared history, bypass governance or weaken gates.

## Required reading order

Read these first:

1. `README.md`
2. `docs/canonical/ZYARA_NETWORK_MASTER_VISION_2026-09-16.md`
3. `docs/canonical/ZYARA_NETWORK_CAPABILITY_MAP_2026-09-16.md`
4. `docs/research/ZYARA_NETWORK_SOURCE_CATALOG_2026-09-16.md`
5. `docs/research/ZYARA_NETWORK_COMPETITOR_CAPABILITY_MAP_2026-09-16.md`
6. `docs/research/ZYARA_NETWORK_PLANNING_COMPLETION_CHECKLIST_2026-09-16.md`
7. `docs/canonical/ZYARA_PROVIDER_PLATFORM_PLAN.md`
8. `docs/canonical/ZYARA_APPOINTMENT_SYSTEM_PLAN.md`
9. `docs/canonical/ZYARA_DATA_AND_FHIR_MODEL.md`
10. `docs/canonical/ZYARA_AI_SEARCH_VOICE_PLAN.md`
11. `docs/canonical/ZYARA_PRIVACY_SECURITY_COMPLIANCE_PLAN.md`
12. `docs/canonical/ZYARA_ARCHITECTURE_PLAN.md`
13. `docs/canonical/ZYARA_PRODUCT_REQUIREMENTS.md`
14. `docs/canonical/ZYARA_CANONICAL_BUILD_PLAN.md`
15. `docs/canonical/ZYARA_TEST_AND_EVIDENCE_PLAN.md`
16. `docs/canonical/ZYARA_ROADMAP.md`
17. `docs/canonical/ZYARA_SOURCE_QUALIFICATION.md`
18. current V1 founder/scope/canonicalization documents;
19. `docs/VOICE_AGENT_RUNTIME.md`
20. `docs/COMPETITORS.md`
21. `docs/SOURCES.md`

Then inspect actual product code, schemas/migrations, APIs, packages, tests, patient/provider UI, open PRs and evidence before deciding what is missing.

## Founder decisions that remain binding

- Saudi Arabia is the launch market.
- The patient product is free; no patient booking fee.
- Core monetization is B2B SaaS, integrations and enterprise capabilities.
- Arabic is first-class RTL; preserve the existing multilingual architecture.
- Practitioner identity is independent from facility identity.
- `PractitionerRole` models where/how a practitioner works.
- One practitioner may work at multiple clinics/hospitals simultaneously.
- Doctor reputation and facility reputation are independent trust objects.
- A valid `Doctor 4.9 / Facility 2.2` state must be representable.
- Insurance acceptance is scoped by payer/network/product + branch + service + practitioner role + validity/evidence/freshness.
- Phone, booking phone, official WhatsApp, website and directions are first-class patient actions.
- Paid status must not improve organic healthcare ranking.
- Providers cannot delete compliant negative reviews merely because they are negative.
- Material provider facts have provenance/freshness and recurring attestation where no stronger source exists.
- FHIR-aligned interoperability, explicit source provenance, consent, auditability and tenant isolation remain binding.
- AI is not autonomous clinical authority.
- **AI may interpret, retrieve, navigate, explain, draft and propose; authorized humans and structured systems own facts and actions.**
- Voice and conversational interfaces use the same typed intent/safety/tool plane as text.
- Prescriptions/orders must remain clinician-authorized and comply with qualified local integration/regulatory constraints.
- Telehealth recording/transcription is not default; it requires explicit governed policy and consent.

## Product-system objective

Astro must design one coherent health network with these primary journeys.

### Patient

```text
Discover care
-> compare trust/access
-> book/request/call/message
-> prepare
-> attend in-person or through Zyara Connect
-> receive summary/results/prescription/follow-up
-> manage insurance/financial actions
-> retain source-aware history in My Health
-> continue care
```

### Clinic

```text
Publish accurate supply
-> configure staff/services/schedules/resources
-> acquire and communicate with patients
-> run front desk/intake/queue
-> deliver in-person/virtual care
-> document/order/prescribe/refer
-> manage insurance/revenue-cycle work
-> follow up/recall
-> understand demand, capacity and operating outcomes
```

### Doctor

```text
See schedule
-> understand patient context
-> deliver care
-> document
-> order/prescribe/refer
-> review results/tasks
-> communicate/follow up
```

## Whole-product capability requirements

Use `ZYARA_NETWORK_CAPABILITY_MAP_2026-09-16.md` as the minimum universe. At minimum, reconcile and plan the following.

### Patient / My Health

- discovery/search/specialties/services/maps;
- booking/request/reschedule/cancel/defer/waitlist/earlier slot;
- upcoming/past visits;
- secure messages;
- notifications/preferences;
- telehealth;
- longitudinal visits/encounters;
- medications and prescriptions/refills;
- allergies and conditions;
- labs/results/trends;
- imaging/reports;
- referrals and care plans;
- documents;
- insurance coverage/eligibility/authorization visibility;
- patient financial state where supported;
- consent/sharing/delegates;
- chart-grounded AI with provenance.

### Zyara Clinic

- organization/branches/departments/rooms/resources;
- staff/roles/permissions;
- practitioner roster, credentials and privileges;
- services/specialties/insurance/contact/media;
- schedule templates/leave/exceptions/holds/resources;
- front desk;
- patient registration/deduplication;
- booking/request/cancel/reschedule/defer/waitlist/recall/check-in/queue;
- intake/forms/consent/e-sign/documents;
- unified communication inbox;
- telehealth operations;
- encounter/charting;
- medications/prescriptions;
- labs/imaging/referrals;
- insurance eligibility/prior auth/claims;
- charge/billing/payment/reconciliation where owned;
- reviews/replies;
- analytics/reporting;
- audit/integration health/data freshness.

### Zyara Doctor

- today/week schedule across workplaces;
- availability/leave under clinic policy;
- clinic schedule-change audit;
- pre-visit context;
- encounter documentation;
- telehealth launch;
- orders/results;
- clinician-authorized prescriptions/refills;
- referrals;
- messages/tasks/prior-authorizations;
- visit completion and patient summary;
- mobile-first high-frequency workflows.

### Zyara Connect

- provider-neutral real-time session contract;
- waiting room/device check;
- 1:1 video/audio;
- approved multi-party/caregiver/interpreter support;
- secure chat/files;
- screen share where justified;
- reconnect/degraded network;
- group care and tele-expertise;
- channel orchestration for in-app/email/SMS/WhatsApp/push;
- unified conversation identity;
- voice/phone assistant as a separately gated capability.

## Scheduling authority

Do not treat calendar UI as the scheduling model.

Plan state and invariants for:

- availability search;
- booking requests;
- holds;
- booked confirmation;
- reschedule;
- cancel;
- deferred follow-up/recall;
- waitlist/ASAP;
- earlier-slot offers;
- recurring care;
- provider leave/exceptions;
- staff changes;
- room/equipment/resource conflicts;
- external source-of-truth synchronization and reconciliation;
- explicit unresolved states.

Clinic staff may manually change schedules only through authorized/audited operations with required patient/provider notifications and conflict checks.

## Clinical authority

Astro must define explicit signing/authority boundaries.

- AI/transcription may draft notes but not silently sign them.
- AI may propose an order or prescription draft but cannot issue it.
- A qualified clinician owns clinician-required signing actions.
- Medication/allergy/interaction checking should use deterministic or authoritative services where practical.
- Patient-entered, imported, extracted and provider-authored facts must remain distinguishable.
- Appointment does not equal Encounter.
- A result summary does not rewrite the result.
- Reviews never become clinical truth.

## Saudi insurance / NPHIES requirement

The full plan must treat NPHIES as a first-class Saudi integration boundary.

Keep these separate:

```text
Directory acceptance
!= eligibility
!= benefits
!= prior authorization
!= claim
!= adjudication
!= remittance/payment
```

Research the current official NPHIES Financial Services Implementation Guide and produce:

- exact supported workflow map;
- FHIR R4.0.1 profile/message boundary;
- eligibility adapter;
- prior-authorization adapter;
- claims lifecycle;
- cancellation/supporting-information flows;
- transaction/reference identity and replay/idempotency;
- error/retry/reconciliation;
- conformance test plan;
- patient/provider truthful state wording;
- credential/onboarding/external-authority gates.

Do not claim NPHIES production connectivity without real authority/evidence.

## Source and donor directive

The founder has explicitly stated permission to copy/use source from these supplied repositories and from founder-owned GitHub repositories:

- `bilawalsidhu/gods-eye-view`
- `openimsdk/openmeeting`
- `suitenumerique/meet`
- Jitsi organization / use `jitsi/jitsi-meet` as the primary evaluated meeting repository unless research selects another exact component;
- `bigbluebutton/bigbluebutton`
- `nextcloud/talk-desktop`
- relevant `TheHalfMoon/*` repositories.

Read `docs/research/ZYARA_NETWORK_SOURCE_CATALOG_2026-09-16.md`.

Permission does not waive exact provenance, license/NOTICE handling, security review, dependency review or upgrade strategy. Do not import whole repositories blindly.

Mandatory source research includes:

- founder-supplied meeting/media sources;
- `TheHalfMoon/MedScale`;
- `TheHalfMoon/MESC`;
- `TheHalfMoon/commandMed`;
- `TheHalfMoon/Himsat`;
- `TheHalfMoon/Wispral`;
- `TheHalfMoon/Qdrat`;
- `TheHalfMoon/Signthos`;
- `TheHalfMoon/Sentrdel`;
- relevant engineering-governance sources (`Kodac`, `Winds`, `Ascout`, `SpecGrain`, `Diffcipline`);
- `openemr/openemr`;
- `medplum/medplum`;
- `openmrs/openmrs-core` / Bahmni references;
- `novuhq/novu`;
- `chatwoot/chatwoot`;
- `calcom/cal.diy` scheduling patterns;
- `OHIF/Viewers`;
- OpenELIS Global 2;
- LiveKit;
- existing Zyara-qualified PostGIS/Keycloak/Synthea/FHIR tooling.

For each source produce `REFERENCE / DEPENDENCY / ADAPT / COPY / REJECT`, exact revision, license/provenance, target boundary, risks and proof before admission.

## Real-time media architecture decision

Do not stack Jitsi + LiveKit + OpenMeeting + BigBlueButton into one video engine.

Astro must either select a preferred `Zyara Connect` media engine or create a bounded qualification experiment. Compare:

- LiveKit/Suite Meet;
- Jitsi;
- OpenMeeting where useful;
- BigBlueButton primarily for group education/collaboration patterns rather than assuming it is the 1:1 telehealth core.

Compare self-hosting, SDKs, mobile/web quality, data residency, encryption/auth, reconnect, recording controls, telephony, observability, license, update cadence and operating complexity.

Keep clinical/appointment state outside the media engine.

## Communications architecture decision

Evaluate distinct layers rather than one giant messaging service:

- notification orchestration — Novu-like patterns;
- human unified inbox — Chatwoot-like patterns;
- secure clinical messaging — Zyara-governed data/authorization contract;
- WhatsApp/SMS/email/push providers — channel adapters;
- voice/phone automation — gated typed-tool client.

Define message purpose, consent/preferences, template/version, locale, delivery state, retries, deduplication, inbound threading, retention and PHI policy.

## Workforce boundary

Clinic operations require staff roles, branch/team assignments, shifts/availability, leave, onboarding/offboarding and credential/privilege lifecycle.

Study `TheHalfMoon/Qdrat`/Horilla patterns where useful.

Do not automatically build full payroll/recruitment/accounting into the healthcare core. Astro must classify each broad ERP function as native Network 1.0, integration, later extension or reject.

## Imaging/labs/documents

Do not reinvent specialized medical systems without reason.

- Evaluate OHIF as the imaging viewer/integration pattern.
- Evaluate OpenELIS as a lab-domain/LIS reference while preferring integration with authoritative labs.
- Evaluate Signthos/Documenso patterns for forms/e-sign/document workflows.
- Keep lab/imaging source systems authoritative for their results and preserve source/version/provenance.

## AI-era requirement

Zyara Network must feel native to the AI era without becoming an unsafe agent wrapper.

Plan:

- patient natural-language search;
- conversational refinement;
- voice search;
- Saudi Arabic/code-switch evaluation;
- My Health chart-grounded assistant;
- clinic administrative copilot;
- clinician documentation copilot;
- result/plain-language explanation boundaries;
- phone assistant for administrative actions;
- proactive reminders/follow-up suggestions based on authorized structured facts;
- typed tools;
- action confirmation;
- source grounding;
- prompt/tool-injection defenses;
- model/provider abstraction;
- local/private inference candidates when useful;
- abstention/escalation.

Never let an LLM directly mint authoritative appointments, claims, prescriptions, results or clinical facts without the typed domain operation and required human/external authority.

## Competitor research directive

Read `docs/research/ZYARA_NETWORK_COMPETITOR_CAPABILITY_MAP_2026-09-16.md`, then refresh material time-sensitive facts.

Minimum comparison set:

- Doctolib;
- Epic / MyChart;
- Tebra;
- NexHealth;
- athenahealth;
- Phreesia;
- Elation Health;
- Zocdoc;
- Healthgrades;
- Vezeeta;
- Solv;
- One Medical where useful.

Do not copy trade dress or proprietary implementation. Each observed capability must map to a Zyara patient/clinician/clinic job and an `ADOPT / ADAPT / DEFER / REJECT` decision.

## Required planning outputs

Before this Astro pass can finish, create/update repository-native artifacts covering all of the following.

### 1. Live repository audit

Exact SHA, open PRs, branches, current canonical authority, code/packages, migrations, tests, CI/evidence and current UI.

### 2. Whole-product preservation matrix

Map current Zyara capabilities to the new full Network target using:

```text
PROVEN_COMPLETE
PRESENT_NEEDS_ADAPTATION
PARTIAL
MISSING
DEPENDENCY_OR_INTEGRATION
DEFERRED_EXTERNAL_VALIDATION
LATER_EXTENSION
REJECT
```

### 3. Revised whole-product requirements

Separate contracts for patient, clinic, doctor, Connect, Insights and AI.

### 4. Network architecture

Bounded domains/modules, authority, identity/tenancy, data ownership, events/outbox, jobs, integration boundaries, FHIR, NPHIES, API strategy, mobile/web/desktop surfaces and deployment/data-residency assumptions.

### 5. Canonical data-model delta

Preserve correct graph/FHIR models and add only justified structures for conversations, documents, encounters/clinical items, prescriptions/orders, coverage/authorization/claims, payments, telehealth sessions, tasks and analytics.

### 6. Patient My Health plan

Timeline, visits, medications/prescriptions, allergies, conditions, labs, imaging, referrals, care plans, documents, insurance, payments, delegates, provenance and patient AI.

### 7. Clinic operating-system plan

Front desk, calendar/capacity, patient operations, staff/roles, communications, forms/consent, telehealth, clinical workflows, insurance/revenue cycle, analytics and integrations.

### 8. Doctor workspace plan

Schedule, context, documentation, telehealth, orders, eRx/refills, results, tasks/messages, follow-up and mobile.

### 9. Zyara Connect architecture

Media engine decision/experiment, waiting room, session lifecycle, multi-party/group/tele-expertise, chat/files, channel orchestration, unified inbox and voice/phone future lane.

### 10. Insurance/revenue-cycle plan

NPHIES mapping, eligibility, prior auth, claims, denials, remittance, patient responsibility/payment and evidence/reconciliation.

### 11. Clinical safety/authority plan

Signing authority, AI boundary, medication safety, terminology, provenance, correction, emergency/escalation and clinical validation gates.

### 12. Source-adoption matrix

Exact source/revision/mode/license/risk/update strategy for all material sources.

### 13. Competitor adoption matrix

Whole-product gap/adoption decisions.

### 14. Analytics/metrics contract

Definitions/denominators/missingness/privacy for discovery, operations, schedule, communications, clinical operations where appropriate, insurance/claims, financial and integration health.

### 15. Security/privacy/resilience plan

Tenant isolation, consent/delegation, audit, encryption/keying, PHI logging rules, backups/restore, deletion/rectification, incident response, data residency, telehealth/communications security and AI security.

### 16. Dependency-ordered Network 1.0 roadmap

Phases -> slices -> bounded tasks -> gates. Cover the complete product even when some tasks are deliberately later in the sequence.

### 17. Task contracts

For each implementation task: purpose, exact scope, dependencies, allowed surfaces, non-goals, migration/data/privacy/source impacts, tests, evidence, rollback/recovery and completion criteria.

### 18. Implementation handoff

A final execution prompt/file that preserves the full product picture while authorizing only the first dependency-ready task.

## Delivery philosophy

Astro must answer two questions at every layer:

1. What is the smallest safe, valuable, independently verifiable next unit?
2. How does it fit into the complete Zyara Network architecture?

Do not create a huge-bang implementation plan. Do not create a narrow discovery-only plan either.

The correct output is a **complete map with small executable steps**.

## Evidence dimensions

Keep these separate:

```text
REPOSITORY_PLANNING
REPOSITORY_IMPLEMENTATION
SYNTHETIC_QUALIFICATION
INTEROPERABILITY_CONFORMANCE
REAL_PROVIDER_VALIDATION
REAL_PATIENT_VALIDATION
REGULATORY_OR_CONTRACTUAL_AUTHORITY
COMMERCIAL_VALIDATION
PRODUCTION_AUTHORIZATION
```

Planning/code cannot prove live NPHIES authority, e-prescribing authorization, real provider credentials, real insurance coverage, real patient safety, commercial willingness to pay or production authorization.

## Repository workflow

- Work on a dedicated planning branch based on freshly verified `main`.
- Keep all repository/GitHub-facing material in English.
- Preserve existing canonical files unless deliberately superseded; document supersession.
- Do not mutate production code just to make planning complete.
- Do not overwrite or absorb concurrent UI work without explicit reconciliation.
- Run available planning/docs/repository checks.
- Open a focused PR.
- Merge only when real required gates are green and no unresolved review block exists.
- Never force-push/rebase shared history.

## Completion gate

Use:

`docs/research/ZYARA_NETWORK_PLANNING_COMPLETION_CHECKLIST_2026-09-16.md`

Do not declare completion until the whole-product plan is internally consistent, repository-native and grounded in exact live truth.

Completion marker:

```text
ZYARA_NETWORK_MASTER_PLAN_COMPLETE = YES
```

Final report must include:

- exact starting `main` SHA;
- exact planning branch and HEAD SHA;
- open/concurrent work reconciled;
- artifacts created/updated;
- source-adoption decisions;
- architecture/product decisions;
- phase/slice/task counts;
- validation/CI actually observed;
- unresolved external/regulatory/integration gates;
- preserve/adapt summary;
- first executable implementation task identifier;
- exact implementation handoff file/prompt.
