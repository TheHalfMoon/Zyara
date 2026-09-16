# Zyara V1 Competitor Feature Synthesis — 2026-09-16

Status: research input for the next canonicalization pass.  
Scope: current public product patterns relevant to Zyara V1 and future seams.  
Evidence rule: product claims below are based on current public vendor/official pages checked on 2026-09-16. They are references for product design, not proof of Zyara implementation or permission to copy proprietary code/design.

## Executive conclusion

The strongest current products split into two groups:

1. **Patient discovery/access networks** — Zocdoc, Healthgrades, Vezeeta and Doctolib's patient surface help users find the right provider/facility, compare, contact and book.
2. **Provider operating systems / patient-experience layers** — Doctolib, NexHealth, Solv and Tebra help clinics manage scheduling, intake, communications, reviews, insurance workflows and front-office operations.

Zyara V1 should dominate the first group before trying to reproduce the second group in full. The V1 product should therefore prioritize trustworthy doctor/facility discovery, specialty/service search, nearby care, insurance visibility, branch-aware contact, independent doctor/facility reputation, data freshness, clinic self-service and AI-native search/voice.

Future provider-OS capabilities should be preserved as architecture seams and sequenced after the discovery network proves supply density, patient use and provider value.

## Doctolib

### Current public patterns

Official current Doctolib material describes a broad health-professional operating system with:

- scheduling;
- task management;
- patient journey tracking;
- no-show prevention;
- performance analytics;
- online booking;
- phone assistant;
- patient self check-in;
- patient acquisition/online visibility;
- telehealth;
- patient messaging and data sharing;
- remote monitoring;
- secure professional collaboration/referrals;
- EHR/clinical solutions;
- AI clinical, financial and administrative assistants;
- billing/payments/insurance/financial-performance capabilities.

Its patient product is positioned as a health companion covering care access, care preparation, communication, prevention and continuity.

The 2026 H2 product roadmap also describes additional patient messaging controls, action-bearing messages, AI conversation summarization/drafting/categorization, a broader AI assistant, phone-assistant improvements, pre-visit questionnaires/consent and continued clinical-record/care-coordination work.

### Zyara lesson

Do not build the whole Doctolib surface in V1. Preserve future seams for the provider OS while using V1 to establish the healthcare graph and patient/provider network that make those later products valuable.

### V1 adoption

- clear provider/facility discovery;
- online visibility/value for providers;
- reliable location/practice relationships;
- safe path to booking/contact;
- profile freshness and provider self-management;
- AI-native navigation as an access layer.

### Future seam

- full scheduling operations;
- patient messaging;
- digital secretariat;
- AI phone assistant;
- intake/consent;
- clinical records;
- financial workflows;
- care-team collaboration;
- clinical/admin copilots.

### Sources checked 2026-09-16

- https://about.doctolib.com/health-professionals/
- https://about.doctolib.com/patients/
- https://about.doctolib.com/data-and-innovation/
- https://community.doctolib.fr/t/decouvrez-notre-feuille-de-route-produit-2eme-semestre-2026/185227
- https://info.doctolib.fr/solution/solutions-cliniques/

## Zocdoc

### Current public patterns

Zocdoc's marketplace asks patients for insurance, visit reason and location, then exposes relevant provider profiles, reviews, photos and availability for direct booking.

Its AI Care Assistant lets patients describe care needs in everyday language and maps the request to structured provider settings including visit reason, insurance, availability and location.

### Zyara lesson

This validates natural-language discovery, but Zyara should expand the result model beyond an appointment marketplace by making the healthcare graph visible: doctor vs facility, multi-location practitioner roles, distance/travel time, branch-specific insurance/contact, opening hours and independent facility reputation.

### V1 adoption

- natural-language care search;
- insurance-aware discovery;
- visit-reason/service-aware search;
- availability when authoritative;
- profile depth;
- reviews;
- low-friction booking/contact handoff.

### Zyara differentiation target

- `All | Doctors | Clinics & Hospitals` result modes;
- map/distance-first discovery;
- branch-aware facility context;
- doctor and facility ratings separated;
- explicit freshness/provenance;
- Arabic/Saudi-first search and voice;
- explainable match reasons.

### Sources checked 2026-09-16

- https://www.zocdoc.com/provider-help/en/articles/8843078-what-is-the-zocdoc-marketplace
- https://www.zocdoc.com/provider-help/en/articles/16014860-what-is-the-ai-care-assistant
- https://www.zocdoc.com/patient-help/en/articles/16309168-how-does-zocdoc-s-ai-care-assistant-work

## Healthgrades

### Current public patterns

Healthgrades supports search by doctor, condition, procedure, specialty and location, with insurance and other patient-choice filters. It separates physician discovery from hospital/facility quality and exposes physician experience/background, affiliations and patient reviews. Provider profile guidance emphasizes current photo, insurance, philosophy, reviews, conditions and procedures.

Healthgrades also demonstrates an important conceptual separation: doctor quality/experience and hospital quality are not interchangeable.

### Zyara lesson

Zyara should make the doctor/facility distinction foundational rather than cosmetic. The practitioner is a persistent identity; each facility/branch has independent operational reputation and access data.

### V1 adoption

- specialty/condition/procedure/service discovery;
- practitioner background/qualification profile depth;
- hospital/facility search as a first-class route;
- facility affiliations visible from practitioner profiles;
- independent doctor and facility reputation;
- profile claiming and provider maintenance.

### Guardrail

Clinical-outcome or experience-frequency claims require appropriate authoritative data and methodology. Zyara V1 must not imitate outcome ratings using patient reviews or unverified provider self-claims.

### Sources checked 2026-09-16

- https://www.healthgrades.com/
- https://www.healthgrades.com/about
- https://www.healthgrades.com/about/how-to-use-healthgrades
- https://www.healthgrades.com/about/experience-check-background-check
- https://www.healthgrades.com/find-a-hospital
- https://resources.healthgrades.com/updating-my-profile/section-by-section-details

## Vezeeta Saudi

### Current public patterns

Vezeeta's Saudi patient surface supports specialty, city/area, insurance and doctor/hospital search. Current specialty browsing includes more than 40 specialties. Clinic pages expose facility rating, specialties, doctor roster, reviews, insurance and branch information. Doctor search supports filters including insurance, availability and gender, and direct appointment booking.

### Zyara lesson

Vezeeta is the most directly relevant regional benchmark for patient expectations. Zyara V1 cannot ship as a weaker doctor directory. Specialty browsing, insurance filtering, doctor/facility profiles and simple booking/contact must be table stakes; Zyara must differentiate through trustworthy freshness, map/distance, richer facility context, multi-location identity, AI/voice and independent facility-vs-doctor reputation.

### V1 adoption

- Saudi specialty browsing;
- Arabic/English labels;
- city/area discovery;
- insurance filter;
- doctor and clinic pages;
- doctor roster by clinic;
- facility reviews;
- branch concepts;
- fast appointment/contact path.

### Sources checked 2026-09-16

- https://saudi.vezeeta.com/en
- https://saudi.vezeeta.com/en/specialties
- https://saudi.vezeeta.com/en/clinics
- https://saudi.vezeeta.com/en/clinic/how-clinics
- https://saudi.vezeeta.com/en/clinic/masters-clinics

## NexHealth

### Current public patterns

NexHealth provides provider-side scheduling, online booking, recalls, waitlist, text/email communications, reminders, forms, payments, insurance eligibility, reviews and practice analytics, connected through its synchronization layer to existing health-record systems.

### Zyara lesson

The high-value future provider platform is not merely a profile editor. It eventually becomes a front-office automation and integration layer. However, those capabilities should follow discovery/network proof rather than block V1.

### V1 adoption

- provider-managed public data;
- basic booking/contact configuration;
- profile/reputation operations;
- analytics event foundations;
- clean integration contracts.

### Future seam

- live calendar sync;
- recalls;
- waitlist;
- reminders/messaging;
- forms;
- insurance eligibility;
- payments;
- advanced insights.

### Sources checked 2026-09-16

- https://www.nexhealth.com/
- https://www.nexhealth.com/for/operations
- https://www.nexhealth.com/pricing

## Solv

### Current public patterns

Solv's current provider platform spans discovery/booking, digital registration/intake, insurance capture, mobile/QR check-in, queue/waitlist status, two-way chat, payments, reviews, messaging, telehealth and operational insights.

Its current AI voice agent, Maya, handles inbound calls, can find care and book visits, answer service/insurance questions, handle some payment flows and route more complex requests with context. Solv also publicly describes integrations that allow AI health-assistant users to discover nearby same-day clinics filtered by insurance and complete booking.

### Zyara lesson

Solv demonstrates two future directions that matter strongly to Zyara:

1. the provider operating layer after discovery; and
2. the shift of healthcare's front door into AI conversations and voice.

Zyara V1 should therefore be AI-native and voice-ready, but should not block discovery launch on phone-agent, queue, payment or intake complexity.

### V1 adoption

- nearby care as a primary patient problem;
- easy booking/contact handoff;
- future-proof event model for patient-access journeys;
- voice architecture as a first-class product path;
- provider listing/claim/update value.

### Future seam

- digital intake;
- mobile check-in;
- wait position/queue;
- messaging;
- rebooking;
- insurance verification;
- telehealth;
- payments;
- AI phone receptionist/action agent.

### Sources checked 2026-09-16

- https://www.solvhealth.com/for-providers
- https://www.solvhealth.com/for-providers/intake
- https://www.solvhealth.com/for-providers/blog/voice-agent
- https://www.solvhealth.com/for-providers/blog/urgent-care-amazon-health-ai
- https://www.solvhealth.com/for-providers/solv-experience

## Tebra

### Current public patterns

Tebra provider profiles support online appointment scheduling integrated with practice calendars, including appointment intervals, notice rules, location-aware scheduling and telehealth options. Tebra's provider-profile/reputation model also demonstrates the importance of keeping practice and provider information current.

### Zyara lesson

The V1 clinic portal should be designed for structured profile management and future scheduling integration, but should remain simpler than a full practice-management system.

### V1 adoption

- claimed provider profile management;
- current doctor information;
- current location information;
- booking-link/configuration seam;
- future calendar integration contract.

### Source checked 2026-09-16

- https://helpme.tebra.com/Platform/Provider_Profiles/Manage_Provider_Profile/Configure_Online_Appointment_Booking

## Cross-competitor feature decision matrix

| Capability | V1 decision | Reason |
|---|---|---|
| Doctor search | REQUIRED | Primary discovery unit |
| Clinic/hospital/facility search | REQUIRED | Patients choose places as well as practitioners |
| `All / Doctors / Clinics & Hospitals` | REQUIRED | Explicit founder direction; prevents entity confusion |
| Specialty browsing | REQUIRED | Core user mental model and regional table stake |
| Subspecialty taxonomy | REQUIRED DATA MODEL; staged UI breadth | Needed for useful matching and future depth |
| Service/procedure search | REQUIRED | Patients often know service rather than doctor |
| Everyday-language care search | REQUIRED | AI-era discovery and Zocdoc pattern |
| Arabic/Saudi search | REQUIRED | Launch-market differentiator |
| Voice input | FIRST-CLASS; may ship after text quality gate | Existing Zyara architecture and founder direction |
| Map/list | REQUIRED | Nearby care is central to Zyara identity |
| Distance | REQUIRED when permitted/calculable | Core comparison factor |
| Travel ETA | REQUIRED only with authoritative routing | Never fabricate |
| Open/closed + working hours | REQUIRED | High-value immediate-care fact |
| Phone | REQUIRED | Primary contact action |
| WhatsApp | REQUIRED when official/verified | Saudi-relevant contact channel |
| Directions | REQUIRED | Core access action |
| Website | REQUIRED when available | Low-friction handoff |
| Native booking | REQUIRED only where authority is real | Existing booking safety contract |
| Request/call/redirect fallback | REQUIRED | Honest access for non-integrated supply |
| Insurance visibility | REQUIRED | Regional and US benchmark table stake |
| Insurance by branch/service/role | REQUIRED MODEL | Avoid misleading global payer badges |
| Practitioner multi-location identity | REQUIRED | Foundational graph invariant |
| Doctor education/qualification/experience | REQUIRED PROFILE MODEL | Major trust input |
| Facility gallery/media | REQUIRED | Patient evaluation and provider value |
| Doctor reviews | REQUIRED | Trust loop |
| Facility reviews | REQUIRED | Founder direction and Healthgrades lesson |
| Separate doctor/facility scores | REQUIRED | Never hide poor facility behind strong doctor or vice versa |
| Verified-visit preference | REQUIRED | Existing Zyara trust policy |
| Provider claim flow | REQUIRED | Scalable supply maintenance |
| Clinic portal | REQUIRED | Supply/freshness flywheel |
| Monthly roster/profile attestation | REQUIRED | Founder direction; data-decay control |
| Public freshness indicators | REQUIRED | Differentiated trust model |
| Search/profile analytics | REQUIRED EVENT MODEL; staged reports | Demonstrates provider value |
| Patient intake/forms | DEFER V2 | Valuable but not V1 discovery blocker |
| Waitlist/recall | DEFER V2 | Valuable provider operations |
| Messaging/reminders | DEFER V2 except minimal booking notifications | Avoid V1 scope explosion |
| Mobile check-in/queue | DEFER V2/V3 | Solv-style operations layer |
| Payments | DEFER | Not core founder launch model |
| Full telehealth | DEFER | Preserve modality seam |
| AI phone receptionist | DEFER but architect for it | Strong future opportunity |
| EHR/clinical record | DEFER | Separate sensitive clinical program |
| Consultation AI/copilot | DEFER | Provider clinical product, not V1 discovery |
| Multi-agent operations | DEFER | Add only when measurable operational value exists |

## Product principles derived from the research

1. **Discovery before operations.** Provider operations become more valuable after Zyara has patient demand and trusted provider coverage.
2. **Entity truth before generative UX.** AI/voice should query structured truth; it should not invent marketplace facts.
3. **Doctor and facility are different trust objects.** A great practitioner can work in a poor facility and vice versa.
4. **Multi-location practice is normal.** Practitioner identity must survive location changes and simultaneous affiliations.
5. **Specialty alone is not enough.** Search must support service, procedure, condition/care-language aliases and explicit constraints.
6. **Contact is part of access.** Call, WhatsApp, directions, website and booking all matter.
7. **Freshness is a product feature.** Patients should know when critical facts were last confirmed.
8. **Insurance is contextual.** Payer acceptance must be scoped to branch/service/role and never presented as a benefit guarantee.
9. **AI is the interaction layer, not the database.** Typed tools and graph facts remain authoritative.
10. **The clinic portal is the supply-maintenance engine.** V1 provider software exists first to keep public healthcare data accurate and make Zyara valuable to providers.

## Planning implications for AScout

AScout should treat this synthesis as evidence input, not as a feature checklist to copy wholesale.

The planning pass should:

- compare the current canonical implementation against this matrix;
- identify already-complete capabilities;
- find only genuine V1 gaps;
- preserve current safe booking, FHIR, privacy, provenance and evidence architecture;
- refactor planning around discovery-first V1 without creating duplicate systems;
- defer provider-OS breadth that does not strengthen V1's network flywheel;
- retain explicit future seams for the best later features above;
- produce dependency-ordered implementation tasks with measurable acceptance gates.