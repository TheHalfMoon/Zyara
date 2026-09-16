# Zyara Network Capability Map

**Purpose:** define the complete capability universe Astro must reconcile against live Zyara implementation before creating the next canonical roadmap.
**Status:** founder-directed planning input; capability presence here does not mean implementation, validation or production authorization.

## Capability states Astro must use

Every capability must be classified as one of:

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

Astro must not treat a feature name, UI mockup or donor source as proof of delivery.

## A. Patient product — Zyara

### A1. Healthcare discovery and access

- natural-language search;
- Arabic, Saudi Arabic and Arabic/English code-switch search;
- typed, browsed and voice entry;
- doctors/practitioners;
- clinics, hospitals, dental, labs, imaging and other care facilities;
- specialty/subspecialty taxonomy;
- services/procedures;
- location/map/list discovery;
- distance and routing where authoritative;
- opening hours and open-now state;
- insurance acceptance assertions with freshness;
- doctor versus facility reputation;
- multi-location practitioner profiles;
- education, qualifications, experience, languages and expertise with evidence/freshness;
- phone, booking phone, official WhatsApp, website and directions;
- explainable result matching;
- correction/reporting of stale provider facts;
- saved/favorite providers;
- accessibility and language filters;
- availability and next-slot context when authoritative.

### A2. Booking and visit management

- native immediate booking;
- request-based appointment workflows;
- external redirect booking with honest state;
- temporary holds;
- appointment confirmation;
- reschedule;
- cancellation;
- follow-up deferral to a later window;
- waitlist/ASAP requests;
- earlier-slot offers;
- recurring appointments when appropriate;
- patient preparation instructions;
- booking forms and intake;
- reminder preferences;
- upcoming visits;
- visit history;
- patient check-in where enabled;
- queue/wait state where enabled;
- caregiver/delegate booking;
- multi-participant appointment support.

### A3. My Health

- longitudinal timeline;
- visit/encounter history;
- visit summaries;
- patient-visible clinician notes according to policy;
- active and historical medications;
- prescription history and refill requests;
- allergy/intolerance list;
- conditions/problem list;
- lab orders/results/trends;
- imaging orders/reports;
- optional governed imaging viewer integration;
- immunizations;
- referrals/service requests;
- care plans and follow-up tasks;
- health documents;
- patient-entered observations with explicit provenance;
- corrected/superseded record history;
- health-data import through consented FHIR/partner connections;
- export/download under policy;
- consent and sharing controls;
- family/dependent/delegate access;
- connected-device/wearable data as opt-in extension;
- plain-language AI explanation only when grounded in authorized records and bounded by safety policy.

### A4. Insurance and patient financial experience

- insurance card/policy capture;
- payer/network/product identity;
- branch/service/role-specific acceptance context;
- eligibility state when checked through authoritative integration;
- benefit information when available;
- prior-authorization status;
- patient responsibility estimate only when supported by qualified evidence;
- invoices/statements;
- payment links and online payment;
- receipts/refunds;
- claim/status visibility where patient-facing policy permits;
- correction flow for insurance details;
- explicit distinction between directory acceptance and verified eligibility.

### A5. Patient communications

- in-app inbox;
- secure provider messaging;
- email notifications;
- SMS notifications;
- official WhatsApp notifications/conversations;
- push notifications;
- channel preferences;
- language preferences;
- communication consent/opt-out;
- appointment reminders;
- cancellation/reschedule notifications;
- waitlist/earlier-slot messages;
- preparation and follow-up instructions;
- result/record availability notifications;
- payment/insurance action notifications;
- messages linked to appointments/visits without exposing more PHI than necessary.

### A6. Zyara Connect patient experience

- telehealth waiting room;
- appointment-bound join flow;
- camera/microphone/device check;
- 1:1 video/audio;
- approved multi-party visit;
- caregiver/interpreter participation;
- secure chat;
- file/document sharing;
- screen sharing where justified;
- reconnect/degraded network UX;
- no-show/attendance evidence;
- call completion state;
- clinician handoff/escalation;
- group care/education sessions where approved;
- recording/transcription only with explicit policy and consent;
- clear emergency limitation/escalation messaging.

## B. Zyara Clinic — practice operating workspace

### B1. Organization and branch administration

- legal/trading organization identity;
- multiple branches;
- departments;
- rooms and resources;
- branch addresses/entrances/accessibility;
- phones, booking numbers, WhatsApp, email and websites;
- hours, holidays and exceptions;
- service catalog;
- specialty/subspecialty catalog;
- media/gallery;
- insurer/network assertions;
- profile claim/correction;
- monthly freshness/attestation;
- branch-level data quality dashboard.

### B2. Staff, practitioner and role administration

- staff directory;
- practitioner identity separate from employment/workplace roles;
- practitioner-role assignment by branch/department;
- qualifications/registration evidence;
- clinical privileges by service/location;
- role-based access control;
- delegated branch administration;
- credential expiry/recheck workflows;
- shift/availability management;
- leave and schedule exceptions;
- onboarding/offboarding access lifecycle;
- teams and work queues;
- workload/capacity views;
- audit of role/permission changes.

### B3. Calendar and capacity

- day/week/month calendar;
- accessible list view;
- clinician/branch/department/resource filters;
- appointment types;
- durations and buffers;
- room/equipment/resource recipes;
- recurring availability templates;
- holidays and leave;
- temporary blocks/holds;
- manual clinic changes;
- drag/drop through authoritative backend operation;
- bulk move/cancel workflows;
- conflict detection;
- controlled overbooking policy;
- external schedule synchronization;
- integration health and reconciliation queue;
- calendar privacy modes;
- patient notification on material changes.

### B4. Front desk and patient operations

- patient lookup/registration;
- booking by staff;
- booking request queue;
- cancellation/reschedule;
- deferred follow-up;
- waitlist/ASAP management;
- earlier-slot campaigns;
- recall campaigns;
- no-show handling;
- check-in;
- queue/waiting room;
- delay messaging;
- branch/provider change workflow;
- patient contact verification;
- duplicate detection/merge review;
- referral intake;
- tasks and staff assignment;
- assisted phone booking;
- audit of acting staff.

### B5. Intake, forms, consent and documents

- configurable intake forms;
- specialty-specific questionnaires;
- consent forms;
- digital/e-signature workflow;
- file/document upload;
- document classification;
- patient completion status;
- pre-visit form reminders;
- source/version retention;
- document access policy;
- referrals and supporting documentation;
- secure document sharing;
- eFax/partner document adapter if required.

### B6. Unified communication workspace

- unified inbox;
- SMS/email/WhatsApp/in-app conversation routing;
- appointment-linked threads;
- internal notes and mentions;
- assignment and team queues;
- templates/canned responses;
- business hours/auto-response;
- delivery/read state where provider supports it;
- patient communication history;
- communication preferences/consent checks;
- escalation from AI/phone automation to staff;
- attachments and secure-link patterns;
- audit and retention.

### B7. Clinical operations

- patient chart/context;
- encounters/visits;
- note templates;
- SOAP/structured documentation where appropriate;
- vitals;
- histories;
- conditions/problem list;
- allergies/intolerances;
- medications;
- clinician-authorized prescriptions;
- refill request queue;
- medication safety checks;
- labs: orders/results/review;
- imaging: orders/reports/review;
- referrals/consults;
- care plans;
- follow-up tasks;
- immunizations;
- attachments/documents;
- patient-facing visit summary;
- result acknowledgement;
- clinician co-sign/approval workflows where needed;
- specialty templates without hardcoding one specialty into the core model.

### B8. Telehealth and collaboration

- schedule-linked video visits;
- clinician waiting-room control;
- participant admission;
- secure chat/files;
- interpreter/caregiver join;
- call status and attendance;
- tele-expertise/clinician-to-clinician consultation;
- group-care session support;
- organization/team collaboration;
- telehealth visit note linkage;
- recording/transcription governance;
- technical quality telemetry separated from clinical content.

### B9. Insurance, authorization and revenue cycle

- payer/network/product configuration;
- patient coverage capture;
- eligibility checks;
- benefits response storage with validity/evidence;
- prior authorization requests/status/additional-information flow;
- authorization work queue;
- supporting documents;
- charge capture;
- coding support surfaces without letting AI become coding authority;
- fee schedules;
- claim generation;
- claim submission/status;
- rejection/denial queue;
- resubmission/correction;
- remittance/payment posting;
- patient responsibility;
- statements;
- payments and refunds;
- reconciliation;
- aging reports;
- Saudi NPHIES adapter qualification;
- complete external transaction/reference provenance.

### B10. Reviews and reputation

- verified/attendance-linked review eligibility;
- independent doctor and facility ratings;
- review dimensions;
- moderation;
- privacy/PHI redaction;
- provider reply;
- patient appeal;
- abuse detection;
- low-count safeguards;
- AI theme summaries as derived analytics, never the primary review record;
- no provider deletion of compliant negative feedback.

### B11. Clinic analytics — Zyara Insights

- discovery impressions/profile views;
- phone/WhatsApp/directions/website actions;
- availability impressions;
- booking funnel;
- request turnaround;
- cancellation/reschedule/no-show;
- attendance/completed visits;
- waitlist fills;
- time-to-next appointment;
- resource utilization;
- unmet demand/zero results;
- specialty/geographic/language/insurance aggregate demand;
- data freshness/completeness;
- communication delivery/response;
- queue and task SLA;
- telehealth technical quality;
- eligibility/authorization/claim operational performance;
- denial categories;
- A/R and payment reconciliation where implemented;
- patient portal adoption;
- review themes/trends;
- integration uptime/reconciliation status;
- exportable monthly operating report with missingness and evidence scope.

## C. Zyara Doctor — clinician workspace

### C1. Schedule

- today view;
- week/calendar view;
- multiple workplaces;
- telehealth markers;
- personal availability;
- requested leave/exceptions;
- schedule change notifications;
- controlled clinician edits according to clinic policy;
- audit of staff edits.

### C2. Pre-visit context

- demographics/contact scoped to role;
- reason for visit/intake;
- relevant prior encounters;
- allergies;
- medications;
- active problems;
- latest relevant labs/imaging;
- referrals;
- tasks/authorizations;
- patient-prepared questions/documents;
- provenance/source labels.

### C3. During visit

- start encounter;
- structured/free-text note;
- templates/macros;
- voice dictation/ambient drafting only after consent and quality gates;
- vitals/history updates;
- problem/diagnosis recording;
- order entry;
- prescription drafting/signing by authorized clinician;
- referral generation;
- care/follow-up plan;
- telehealth controls.

### C4. After visit

- sign/complete note;
- patient summary;
- tasks;
- results inbox;
- refill requests;
- referral replies;
- prior authorization requests;
- secure patient messages;
- follow-up/recall;
- billing/charge-capture handoff where applicable.

## D. Zyara Connect — communication and telehealth platform

### D1. Real-time media abstraction

- provider-neutral room/session contract;
- WebRTC media engine adapter;
- participant roles;
- tokens/short-lived authorization;
- waiting room;
- device checks;
- network quality/reconnect;
- screen share;
- chat/data messages;
- participant admission/removal;
- multi-party/group mode;
- event/audit stream;
- call metrics without routine PHI leakage.

### D2. Async channel orchestration

- email;
- SMS;
- WhatsApp;
- push;
- in-app;
- secure messaging;
- workflow/template engine;
- localization;
- digests;
- user preferences;
- retries/fallback;
- idempotency/deduplication;
- consent/opt-out;
- quiet hours;
- inbound webhook normalization;
- unified conversation identity.

### D3. Phone/voice automation — gated

- clinic greeting/business-hours policy;
- appointment lookup/book/reschedule/cancel through typed tools;
- basic administrative FAQ from approved facts;
- structured request capture;
- staff transfer/escalation;
- emergency-intent safety response;
- call log/outcome;
- Arabic/Saudi Arabic evaluation;
- no autonomous clinical advice;
- no silent recording.

## E. Network platform and infrastructure

### E1. Identity, tenancy and authorization

- accounts;
- patients;
- related persons/delegates;
- practitioners;
- staff membership;
- organizations/tenants;
- roles/scopes/policies;
- MFA/session/device policy;
- SSO/enterprise provisioning later where contracted;
- tenant isolation;
- break-glass only under explicit governed design if ever introduced;
- complete audit.

### E2. Healthcare graph

- organizations;
- locations;
- departments;
- practitioners;
- practitioner roles;
- specialties/subspecialties;
- healthcare services;
- insurers/networks/products;
- schedules/resources;
- provenance/freshness;
- multilingual labels/aliases;
- public/private projection boundaries.

### E3. Clinical data/interoperability

- FHIR R4 boundary;
- SMART-on-FHIR where justified;
- HL7/partner adapters as required;
- patient identity binding;
- immutable source versions/provenance;
- consent scopes;
- terminology/version governance;
- external EHR/PMS connectors;
- NPHIES financial-services adapter;
- import quarantine/validation;
- export/audit.

### E4. Reliable operations

- transactional outbox;
- job/queue system;
- idempotency keys;
- retries/backoff/dead-letter review;
- external operation reconciliation;
- immutable audit/evidence records;
- backups;
- restore drills;
- deletion/rectification propagation;
- feature flags;
- migration/rollback strategy;
- observability without PHI-heavy logs.

### E5. AI and voice platform

- model/provider abstraction;
- structured intent state;
- retrieval from authorized source systems;
- tool registry;
- deterministic safety/policy layer;
- critical-entity confirmation;
- abstention/escalation;
- source citations/provenance;
- Arabic/Saudi Arabic and code-switch evaluation;
- voice ASR/TTS abstraction;
- retention controls;
- prompt/tool injection defenses;
- offline/local inference candidates where practical;
- no direct model database authority.

## F. Optional/later clinic extensions to plan but not force into the first implementation slices

- inventory/consumables;
- vaccine inventory;
- pharmacy dispensing/stock;
- procurement;
- equipment maintenance;
- advanced accounting/general ledger;
- payroll;
- recruitment;
- inpatient ADT/bed management;
- nursing medication administration;
- operating-theatre management;
- hospital dietary/housekeeping workflows;
- ambulance/fleet workflows.

Astro must decide whether each belongs in Network 1.0, a separate hospital extension, an integration, or `REJECT`. The founder's “clinics A–Z” direction does not require Zyara to reimplement every generic ERP function if integration provides a stronger product boundary.

## G. Whole-product acceptance test

A complete master plan must make the following journey coherent end to end:

```text
Patient discovers care
-> validates access/insurance context
-> books or requests
-> receives reminders/forms
-> arrives or joins Zyara Connect
-> clinician sees authorized context
-> encounter is documented
-> orders/prescription/referral are clinician-authorized
-> patient receives summary/results/tasks
-> insurance/authorization/claim work proceeds where applicable
-> clinic understands operational outcome
-> patient retains the visit in My Health
-> future follow-up/recall is scheduled
-> every material state change has authority, provenance and audit
```

If Astro cannot trace a capability into this lifecycle or a justified clinic/network job, it should challenge whether Zyara needs to own it.
