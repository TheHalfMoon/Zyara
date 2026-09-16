# Zyara Network Competitor Capability Map

**Research refresh:** 2026-09-16  
**Purpose:** give Astro a whole-product comparison frame. This is not a ranking and does not authorize copying proprietary implementations.

## Research rule

Use official product documentation where possible and date every time-sensitive claim. Competitor roadmaps are directional evidence, not proof that every announced feature is generally available in every country or specialty.

## 1. Doctolib — strongest European product-system reference

Official 2026 roadmap/community sources:

- <https://community.doctolib.fr/t/decouvrez-notre-feuille-de-route-produit-1er-semestre-2026/157508>
- <https://community.doctolib.fr/t/decouvrez-notre-feuille-de-route-produit-2eme-semestre-2026/185227>

Patterns materially relevant to Zyara:

- scheduling and patient access;
- patient messaging with configurable contact windows;
- direct actions from conversations;
- patient questionnaires/consent before appointments;
- AI assistance for message summarization/drafting/categorization;
- AI phone assistant for booking, basic information, request qualification and later cancellation/rescheduling;
- call history/traceability;
- care-team task management;
- patient record evolution;
- consultation assistant and structured visit summaries;
- treatment/prescription workflows;
- teleconsultation and tele-expertise;
- clinician collaboration/directories/groups;
- document/patient-record linkage.

**Zyara interpretation:** Doctolib is evidence that discovery, scheduling, communications, clinical record and AI-assisted operations can converge into one provider/patient network. Zyara should preserve its stronger graph/provenance/Arabic/Saudi-insurance focus rather than mirror Doctolib's data model or trade dress.

## 2. Epic / MyChart — patient longitudinal experience reference

Official source:

- <https://www.epic.com/software/emmie/>

Key patterns:

- a longitudinal patient app rather than appointment-only portal;
- chart-grounded patient AI;
- natural-language appointment schedule/reschedule;
- proactive reminders derived from visit information;
- plain-language result explanations;
- cross-episode continuity around the patient.

**Zyara interpretation:** `My Health` should become a first-class patient home, not a document folder. AI must retrieve from authorized source records and preserve provenance instead of becoming the record itself.

## 3. Tebra — private-practice all-in-one reference

Official sources:

- <https://www.tebra.com/ehr-software>
- <https://www.tebra.com/features>
- <https://www.tebra.com/pricing>

Current feature families include:

- provider calendar/scheduling;
- patient portal and intake;
- charting/documentation/templates;
- AI-assisted note drafting;
- ePrescribing and refill workflows;
- eLabs;
- telehealth integrated with schedule/notes;
- eligibility and billing;
- claims/rejections/denials;
- statements/payments;
- reminders and patient communications;
- patient reviews/feedback;
- integrations.

**Zyara interpretation:** Tebra is a strong completeness checklist for the outpatient clinic operating surface. Zyara must not copy US billing/regulatory assumptions into Saudi workflows.

## 4. NexHealth — front-office automation reference

Official sources:

- <https://www.nexhealth.com/>
- <https://help.nexhealth.com/en/collections/10909874-scheduling>
- <https://help.nexhealth.com/en/articles/10046722-what-kind-of-automated-communications-does-nexhealth-offer>

Relevant patterns:

- online booking synchronized with the health-record system;
- waitlist and last-minute opening fill;
- recalls;
- communications/reminders;
- forms;
- payments;
- insurance verification;
- analytics;
- triggered journeys for booking, reschedule, missed/cancelled, reviews, insurance failures, follow-up and forms;
- conflict-aware insertion/reconciliation with the practice system.

**Zyara interpretation:** scheduling, communication and insurance are event-driven workflows with explicit external-system reconciliation, not independent UI features.

## 5. athenahealth — connected patient portal / telehealth reference

Official patient portal source:

- <https://www.athenahealth.com/patient-login/faq>

Useful product patterns include patient access to test results and profile/contact management, with broader athenahealth product research required by Astro for appointment, telehealth, messaging and revenue-cycle workflows.

**Zyara interpretation:** patient self-service should reduce front-desk work but never allow an account-profile edit to silently rewrite source clinical identity.

## 6. Elation Health — clinician workflow/mobile reference

Official sources:

- <https://www.elationhealth.com/solutions/ehr/elation-go/>
- <https://discover.elationhealth.com/billing-ehr-billing/>

Relevant patterns:

- mobile clinician calendar;
- patient clinical profile before visits;
- ePrescribing with allergy/interaction context;
- patient messaging;
- one-tap integrated video visits;
- labs/imaging;
- referrals;
- eligibility, claims/denial and financial reporting workflows.

**Zyara interpretation:** `Zyara Doctor` must be a high-frequency mobile-friendly clinician workspace, not merely a clinic-admin calendar filtered by doctor.

## 7. Phreesia — around-the-visit operations reference

Astro should research current official Phreesia material for:

- patient registration/intake;
- pre-visit questionnaires;
- check-in;
- payment collection;
- insurance/eligibility;
- referrals;
- patient communication.

**Zyara interpretation:** the visit begins before arrival and continues after the clinician leaves the room. Forms, eligibility, preparation and follow-up belong to the appointment journey.

## 8. Existing discovery references

Preserve and refresh existing Zyara work on:

- Zocdoc — insurance/location/visit-reason/availability and AI-assisted care discovery;
- Healthgrades — doctor/facility reputation separation and provider quality/profile research;
- Vezeeta — regional specialty/location/insurance/availability patterns;
- Solv — urgent-care scheduling, check-in, queue/wait, communications and voice-agent patterns;
- One Medical — integrated patient relationship and longitudinal access patterns.

## 9. Saudi-specific mandatory comparator: NPHIES

NPHIES is not a competitor; it is a Saudi integration authority that must shape the insurance/revenue-cycle architecture.

Official implementation guide:

- <https://portal.nphies.sa/ig/>
- eligibility: <https://portal.nphies.sa/ig/usecase-eligibility.html>
- prior authorization: <https://portal.nphies.sa/ig/usecase-prior-authorizations.html>
- claims: <https://portal.nphies.sa/ig/usecase-claims.html>

The current Financial Services IG documents FHIR R4.0.1 exchanges for healthcare providers and insurers covering eligibility, authorizations, claims, cancellation/supporting information and payment-related workflows.

**Zyara interpretation:** build an adapter/conformance boundary. Do not create a shadow insurance truth model that contradicts NPHIES transaction evidence.

## Capability synthesis Astro must preserve

### Patient relationship

Best-of-market target:

```text
Discover
-> Book / communicate
-> Prepare
-> Attend / telehealth
-> Receive results and plan
-> Manage medications/prescriptions
-> Manage insurance/financial actions
-> Follow up
-> Keep longitudinal My Health context
```

### Clinic relationship

Best-of-market target:

```text
Publish accurate supply
-> Configure schedules/resources
-> Acquire and communicate with patients
-> Run front desk / intake / queue
-> Deliver in-person or virtual care
-> Document / order / prescribe / refer
-> Handle insurance and revenue-cycle work
-> Follow up / recall
-> Understand operations and demand
```

### Clinician relationship

Best-of-market target:

```text
See schedule
-> Understand patient context
-> Deliver care
-> Document
-> Order / prescribe / refer
-> Review results / tasks
-> Communicate and follow up
```

## What Zyara should differentiate on

Astro should test these as potential durable differentiators rather than assuming them:

1. Saudi-first healthcare graph and NPHIES-aware operations.
2. Arabic/Saudi Arabic + English/code-switch natural-language and voice navigation.
3. Patient discovery + clinic OS + patient longitudinal health in one network.
4. Strong distinction between doctor reputation and facility reputation.
5. Explicit provenance/freshness for provider, insurance and clinical facts.
6. AI that is deeply integrated yet cannot silently become clinical authority.
7. Provider-neutral Connect/media and channel architecture.
8. FHIR/SMART integration without forcing operational state into generic standards models.
9. Transparent patient access: phone/WhatsApp/directions/booking rather than booking-only monetization.
10. No patient booking fee as a core product/business constraint.

## Anti-patterns to reject

- feature-count cloning;
- generic CRM records masquerading as patient clinical records;
- a single `insuranceAccepted=true` field;
- an LLM writing directly to authoritative clinical/financial state;
- telehealth recording by default;
- clinic staff changing clinician calendars without audit/notification policy;
- patient portal as an unstructured PDF dump;
- hiding unresolved external booking/claim state as success;
- paid ranking blended into organic healthcare discovery;
- one combined rating that mixes doctor skill/experience perception with facility operations;
- US-centric coding/billing copied into Saudi NPHIES workflows.

## Required Astro output

Astro must create a refreshed adoption matrix with rows at feature-family level and columns:

```text
Competitor / source
Observed pattern
Zyara job solved
Existing Zyara capability
Gap
Adopt / adapt / defer / reject
Target subsystem
Dependency
Safety/privacy/regulatory impact
Acceptance evidence
```

The matrix must cover the whole Network 1.0 product, not only patient discovery.
