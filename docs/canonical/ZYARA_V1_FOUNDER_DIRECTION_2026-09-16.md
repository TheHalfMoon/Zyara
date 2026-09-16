# Zyara V1 Founder Direction — Discovery First, AI-Native

Status: **FOUNDER-DIRECTED PRODUCT AMENDMENT**  
Date: **2026-09-16**  
Applies to: the next Zyara product-planning/canonicalization pass  
Repository baseline at amendment start: `8b0789d700a16c3708cc8468140e377c4722872a`

This document records the founder's current product direction after the 2026-09-16 customer-discovery redesign and follow-up product review. It does not erase completed repository work or invalidate safety, privacy, scheduling, interoperability, evidence, or governance constraints already established in the canonical plan. It narrows the first public product objective and makes the future product seams explicit.

When this document conflicts with older product-breadth assumptions for the **next public V1**, this document controls V1 scope. Existing canonical safety, trust, privacy, data, booking-authority, provenance, and evidence rules remain binding.

## North star

**When someone needs care, they start with Zyara.**

They can browse it, type what they need, or say it. Zyara helps them understand where to go, who is available, who to trust, how far the option is, whether it is open, whether it accepts their insurance, what patients experienced, and the fastest trustworthy way to call, WhatsApp, get directions, or book.

V1 is not a miniature Doctolib, EHR, or hospital operating system. V1 is the best healthcare discovery and access surface Zyara can build, designed from day one so later provider operations, booking, messaging, intake, telehealth, payments, clinical continuity, and AI workflows can attach without replacing the core graph.

## V1 product thesis

Zyara V1 owns the healthcare-discovery loop:

```text
Need
  -> understand intent
  -> find trustworthy care entities
  -> compare doctor and facility independently
  -> understand distance, hours, insurance and contact options
  -> call / WhatsApp / directions / website / book
  -> later verify attendance
  -> collect trustworthy reviews
  -> improve provider data
  -> improve discovery
```

The key compounding asset is not a generic appointment calendar. It is a continuously maintained, provenance-aware graph of healthcare organizations, branches, services, specialties, practitioner roles, practitioners, insurance acceptance, contact channels, hours, reviews, and access methods.

## V1 primary patient jobs

A patient should be able to answer these questions quickly without mandatory sign-in:

1. What doctors, clinics, hospitals, centers, labs, imaging centers, dentists, therapists, or other appropriate healthcare destinations are near me?
2. Which specialty or service should I browse if I know the term already?
3. Can I search in natural everyday Arabic or English when I do not know the exact specialty name?
4. Which results are doctors, which are clinics/facilities, and how do I view both together or separately?
5. How far away is each option, and what is the estimated travel time when authoritative routing is available?
6. Is the branch open now, and what are today's and weekly working hours?
7. How do I call, WhatsApp, visit the website, get directions, or book?
8. Which insurance network or plan does this exact branch/service/practitioner role accept, and how recently was that information confirmed?
9. What does this doctor specialize in, where did they train, what qualifications/experience/languages do they have, and where do they currently practice?
10. What does this clinic or hospital offer, which doctors work there, what are its specialties/services, and what do patients think of the facility itself?
11. Can I trust the profile, and when was each important fact last confirmed?
12. Why did Zyara show this result?

## Search is the V1 product center

The primary search surface must support at least:

- practitioner/doctor name;
- clinic/hospital/facility name;
- specialty;
- subspecialty;
- service/procedure;
- common patient care need;
- insurance;
- location/district/city;
- branch;
- common Arabic/English aliases, transliterations and misspellings.

The user-facing result mode must support:

```text
All | Doctors | Clinics & Hospitals
```

The data model must remain broader than the label. Non-physician care and non-clinic facilities should remain representable through Organization, Location, HealthcareService, PractitionerRole and Practitioner rather than being forced into a doctor/clinic binary.

### Specialty discovery

Specialty browsing is a first-class V1 route, not a secondary filter.

Examples include:

- Dentistry
- Orthopedics
- Dermatology
- Pediatrics
- Cardiology
- ENT
- Ophthalmology
- Obstetrics & Gynecology
- Internal Medicine
- Neurology
- Psychiatry
- Urology
- General Surgery
- Physiotherapy
- Diagnostic Imaging
- Laboratory services

The canonical taxonomy must support formal labels, Arabic labels, English labels, common patient terms, abbreviations, transliterations, spelling variants, subspecialties and related service concepts. Patient language such as `عظام`, `دكتور ركبة`, `ortho`, `bone doctor`, and `orthopaedic` should resolve to an appropriate navigation category without converting the user's words into a diagnosis.

### Query examples

`dentist` should return relevant dental doctors and dental clinics.

`MRI` should prioritize facilities/services that actually provide MRI rather than fabricate an arbitrary doctor match.

`Dr Ahmed` should prioritize practitioner identity and show current practice locations.

`knee replacement` may return relevant orthopedic surgeons plus hospitals/clinics offering the service, with uncertainty and evidence handled honestly.

`أبي دكتور عظام قريب مني ويقبل بوبا ويفتح بعد 6` should become a structured navigation query over specialty, insurance, location and time constraints.

## Healthcare graph invariants

### Practitioner is independent from facility

Never model a practitioner as belonging to exactly one clinic.

```text
Practitioner
  -> PractitionerRole @ Branch A
  -> PractitionerRole @ Branch B
  -> PractitionerRole @ Branch C
```

A practitioner may have multiple roles, specialties, privileges, services, schedules, insurance relationships and contact/booking methods across locations.

If the practitioner changes workplace, the practitioner identity and practitioner reputation remain; the old PractitionerRole becomes historically inactive/effective-dated rather than deleting the practitioner or duplicating identity.

### Facility hierarchy is explicit

Support organization -> branch/location -> department -> service relationships. Contact channels, hours, access instructions, insurance and availability can differ by branch and must not be flattened to the parent organization when that would mislead patients.

### Insurance is not a boolean

Insurance acceptance must be capable of expressing:

```text
payer
plan/network
branch
service
practitioner role
valid interval
source/evidence
last confirmed time
```

A payer logo on an organization must never imply universal benefit eligibility, prior authorization, or coverage across all services and doctors.

## Patient-facing doctor profile contract

A V1 practitioner profile should be able to represent and, where evidence permits, display:

- current photo;
- multilingual full name and aliases/transliterations;
- professional title;
- specialty and subspecialty;
- practitioner rating and verified review count;
- languages;
- years/interval of professional experience when evidence supports it;
- education;
- residency/fellowship/board or equivalent qualifications;
- professional registration/credential evidence state;
- areas of expertise as structured, evidence-backed provider claims rather than outcome claims;
- services offered by role/location;
- accepting-new-patients state where authoritative;
- current practice locations;
- location-specific insurance;
- location-specific hours/availability/contact/booking mode;
- freshness/provenance indicators;
- report-correction flow.

The profile must not imply that a qualification, registration, affiliation, insurance acceptance, service privilege or availability is current when the evidence is stale or unknown.

## Patient-facing facility profile contract

A V1 clinic/hospital/facility profile should be able to represent and, where evidence permits, display:

- organization/branch name;
- facility type;
- logo;
- cover/gallery images;
- facility rating and verified review count;
- exact branch address and verified entrance/pin precision;
- distance and authoritative travel time when available;
- open/closed state derived from current hours and timezone;
- normal and exception/holiday working hours;
- phone channels;
- booking phone;
- official WhatsApp channel;
- website;
- approved public email/contact channel;
- directions;
- accessibility;
- parking/entrance information where verified;
- specialties;
- services/procedures;
- accepted insurers/networks with freshness;
- doctors/practitioners currently working at the branch;
- branch-specific booking/contact mode;
- profile freshness/provenance;
- report-correction flow.

## Contact is a primary conversion path

V1 must not assume every patient wants or can use native booking.

Prominent branch-aware actions should include, as supported:

```text
Call | WhatsApp | Directions | Website | Book
```

Phone and WhatsApp data must be source-identified, freshness-tracked and branch-specific when appropriate. Zyara must not automatically pass health-search context, symptoms, or private patient information into third-party messaging channels merely because the patient taps WhatsApp. A future transactional WhatsApp integration requires its own consent, vendor, privacy and messaging contract.

## Clinic Portal V1

The V1 provider portal is primarily a **Provider Data Operating Surface**, not yet a full Doctolib-style practice OS.

It must be designed to support:

### Organization and branch management

- claim/create organization through governed verification;
- branches and departments;
- legal/trading multilingual names;
- branch address/pin/entrance;
- logo, cover and gallery;
- accessibility and parking information;
- normal hours and exception/holiday hours.

### Contact management

- main phone;
- booking/reception phone;
- official WhatsApp;
- website;
- public email where appropriate;
- reception/contact hours;
- contact method per branch.

### Practitioner roster

- add/invite/claim practitioners;
- practitioner photo;
- biography;
- specialty/subspecialty;
- experience;
- education/qualifications;
- languages;
- services;
- current branch roles;
- role effective dates;
- accepting-new-patients assertion;
- evidence/provenance state.

### Service and specialty catalog

- specialties by facility/department/role;
- services/procedures by branch;
- services by practitioner role;
- structured taxonomy rather than free-text-only entries.

### Insurance

- payer;
- plan/network;
- branch/service/role scope;
- validity interval;
- evidence/source;
- last confirmed time.

### Trust and reputation

- view verified reviews;
- reply within privacy/moderation policy;
- never delete a compliant negative review merely because it is negative;
- surface incorrect-data disputes separately from review moderation.

### Basic analytics

At minimum, support or preserve events for:

- search impressions;
- profile views;
- directions;
- calls;
- WhatsApp clicks;
- website clicks;
- booking starts/completions where known;
- zero-result/unmet-demand categories;
- profile completeness/freshness;
- review trends.

Clicks are not visits and must not be reported as visits.

## Freshness is a V1 trust feature

Provider data should not silently decay.

### Monthly attestation target

At least every 30 days, provider operations should be able to request confirmation of material public profile facts such as:

- current practitioner roster;
- practitioner role/location affiliation;
- specialties;
- services;
- phone;
- WhatsApp;
- website/contact channels;
- branch hours;
- insurance acceptance.

Existing canonical credential/registration recheck rules remain separate and may use a different interval or faster expiry-driven action.

### Public freshness should be specific

Prefer:

```text
Doctor roster confirmed 6 days ago
Insurance confirmed 18 days ago
Phone confirmed 6 days ago
Professional registration evidence current
```

over an ambiguous universal `Verified` badge.

Verification state, freshness, source authority and evidence type remain distinct concepts.

## Reputation model — doctor and facility must be independent

This is a mandatory V1 planning correction.

A visit may support separate reputation targets:

```text
VerifiedVisit
  -> PractitionerReview
  -> FacilityReview
```

A patient may legitimately rate a doctor highly and the facility poorly, or vice versa.

Example:

```text
Doctor:   4.9 / 5
Facility: 2.2 / 5
```

These must not be averaged into one score.

### Practitioner review dimensions

Candidate dimensions include:

- overall experience;
- communication;
- listening;
- explanation;
- respect;
- punctuality where attributed to the practitioner experience.

### Facility review dimensions

Candidate dimensions include:

- overall facility experience;
- reception/staff experience;
- waiting experience;
- cleanliness;
- organization;
- accessibility.

The canonical trust team must decide final dimensions and attribution rules. Review text must not become an unverified public clinical-outcome claim.

Practitioner reputation follows the practitioner identity over time. Facility reputation remains attached to the facility/branch. Location-specific practitioner aggregates may be shown only when sample-size and privacy/trust rules make them meaningful.

Existing M022 protections remain: attendance-linked eligibility, privacy-safe public projection, moderation for unsafe content, appeal, provider replies, no provider deletion of compliant negative reviews, and low-count aggregate safeguards.

## AI-native V1

AI is a control and explanation layer over trusted Zyara data, not the owner of facts.

```text
Model interprets
  -> canonical intent
  -> safety/navigation policy
  -> structured graph/search tools
  -> factual results
  -> explainable UI
```

Mandatory invariant:

**AI MAY INTERPRET. AI MAY NAVIGATE. AI MAY EXPLAIN. AI MAY PROPOSE. STRUCTURED ZYARA SYSTEMS OWN FACTS AND ACTIONS.**

The model must never invent doctors, facilities, qualifications, services, insurance acceptance, opening hours, availability, ratings, distance, contact channels or booking outcomes.

### Natural-language search

The patient should be able to type everyday language such as:

- `I need a woman dermatologist near me who accepts Tawuniya.`
- `أبي دكتور أسنان أطفال اليوم.`
- `MRI قريب ومفتوح الآن.`
- `ortho near me after 6, Bupa only.`

The AI layer maps the request to structured constraints and asks a minimal clarification when material ambiguity remains.

### Conversational refinement

A user should eventually be able to refine a result set conversationally:

```text
Only women doctors.
Closer than 10 km.
Open tonight.
Bupa only.
Show doctors with strong review evidence.
```

The conversation state should update structured search state rather than relying on model memory as the source of truth.

### Explainable matching

Where supported, result cards should expose factual reasons such as:

```text
Why this matches
- Orthopedics
- 2.1 km away
- Open after 6 PM
- Bupa acceptance confirmed 9 days ago
- Arabic speaking
```

Unknown data must remain unknown.

## Voice is first-class, not a separate reasoning path

The existing voice architecture remains correct and becomes part of the V1 product identity.

The patient may press a microphone and speak naturally. Audio -> ASR -> transcript -> correction/confirmation when needed -> the same intent/safety/search pipeline used by typed search.

V1 planning must preserve:

- visible microphone state;
- push-to-talk / deliberate capture rather than passive listening;
- cancel and keyboard alternative;
- Arabic, representative Saudi Arabic and Arabic/English code-switch testing;
- medical specialty, doctor/facility and insurer entity testing;
- low-confidence correction UX;
- privacy-preserving local transcription preference where practical and measured;
- explicit cloud-ASR policy when used;
- no raw-audio retention by default when transcript is sufficient;
- ASR provider/model/version provenance;
- exact confirmation before sensitive actions.

Voice search can ship after text search quality is proven if release evidence requires that ordering. The architecture must not create a second clinical reasoning stack.

## Organic ranking contract

Organic ranking must never be purchased.

Ranking may consider, as appropriate:

- query relevance;
- specialty/service match;
- explicit patient constraints/preferences;
- evidence/verification state;
- data freshness;
- distance/travel time;
- opening-hours relevance;
- authoritative availability;
- insurance match;
- review confidence/recency;
- continuity when permitted.

Commercial subscription, sales priority and provider willingness to pay are prohibited organic-ranking inputs.

If sponsored placements ever exist, they must be visually and semantically separated from organic ranking.

Offer explicit sort modes such as:

```text
Recommended | Nearest | Available soonest | Highest rated | Open now
```

The exact launch set must be evidence-tested. `Recommended` must remain policy-versioned and explainable rather than a hidden commercial score.

## Acquisition flywheel

V1 should be designed to compound both patient demand and provider participation:

```text
More trusted provider/facility coverage
  -> better discovery
  -> more patient traffic
  -> more calls/directions/bookings
  -> more verified attendance/reviews
  -> more provider value
  -> more profile claims/corrections
  -> fresher graph
  -> better discovery
```

Zyara may create a rights-cleared factual directory before a provider claims a profile, but must preserve source terms, provenance and correction rights. A provider can claim and improve an existing profile after identity/authority verification rather than forcing every clinic to create itself from zero.

## V1 exclusions

These are not required to prove V1 discovery unless an existing canonical dependency makes a narrow piece necessary:

- full EHR/HIS replacement;
- prescribing;
- broad clinical record storage;
- full revenue-cycle management;
- full claims platform;
- broad consultation-payment processing;
- complete practice management system;
- clinical documentation/copilot;
- autonomous clinical diagnosis/treatment;
- complex patient messaging platform;
- full intake/form engine;
- waitlist/recall as a V1 discovery blocker;
- mobile check-in/queue management;
- full telehealth platform;
- AI phone receptionist as a V1 launch blocker;
- general autonomous multi-agent healthcare operations.

These remain future product opportunities and architecture seams.

## Future product ladder

### V1 — Healthcare Discovery Network

Search, specialties, services, map/distance, trusted doctor/facility profiles, multi-location practitioners, hours, insurance visibility, contact, claim/update portal, freshness, reviews, natural-language search and first-class voice architecture.

### V2 — Healthcare Marketplace & Access

Deeper authoritative booking, integrations, intake, reminders, messaging, waitlist, recall, patient relationship and provider growth workflows.

### V3 — Practice Operating Platform

Scheduling operations, forms, communications, payments where strategically justified, front-desk automation, check-in/queue, telehealth, provider/admin copilots, advanced analytics and enterprise integrations.

### V4 — Healthcare Network Infrastructure

Broader interoperability, consented continuity, clinical-data workflows, referral/care coordination, richer AI assistants and country expansion under separate regulatory/evidence gates.

The version labels are product-direction buckets, not release dates or authorization to implement every listed capability.

## Future features worth preserving as seams

Current competitor evidence supports preserving clean seams for:

- provider scheduling and calendar sync;
- intake and pre-visit questionnaires;
- consent/e-signature;
- reminders;
- secure patient messaging;
- recall and waitlist;
- digital check-in and queue status;
- payments and insurance eligibility;
- telehealth;
- provider review/reputation intelligence;
- provider analytics;
- AI patient-call receptionist;
- provider/admin AI copilot;
- consultation documentation assistant;
- secure care-team messaging/referral;
- clinical records and document exchange;
- family/delegate care management;
- preventive and continuity workflows.

Do not implement these merely because competitors offer them. Preserve data/contracts/boundaries so they can be added when the V1 network, evidence and economics justify them.

## Required planning response

The next planning agent must:

1. reverify the live repository and current `main` before planning;
2. read this founder amendment before changing product scope;
3. preserve completed implementation and existing safety/governance evidence;
4. map the current 60-task/canonical implementation to the new V1 thesis as **reuse / adapt / defer / already complete / new gap**;
5. identify the minimum migrations required for independent practitioner/facility reputation, branch-aware contact channels, specialty/service discovery, clinic portal data maintenance and monthly attestation;
6. preserve the current Practitioner -> PractitionerRole -> Organization/Location model;
7. produce a specific V1 dependency graph and acceptance gates;
8. distinguish repository implementation from external real-world validation;
9. avoid inventing production provider, insurance, credential, review or location evidence;
10. produce an execution-ready handoff for the next implementation agent.

No production code should be written during the planning/canonicalization pass unless the planning agent is explicitly instructed to implement after the plan is accepted and the repository governance authorizes that implementation.