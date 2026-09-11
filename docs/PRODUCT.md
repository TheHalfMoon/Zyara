# Product Requirements

## 1. Patient discovery

### Universal search

Search across:

- facilities and branches;
- practitioners and practitioner roles;
- specialties and subspecialties;
- conditions/concerns and patient-friendly terms;
- procedures/services;
- insurance plans/networks;
- languages;
- appointment types;
- telehealth/home care;
- geography and distance;
- availability.

The system should accept short keywords and full natural-language intent.

### Search views

Every discovery flow should support switching between:

- list/search results;
- map;
- AI-assisted guided search.

### Filters

Minimum filters:

- location/radius;
- specialty;
- service/visit reason;
- accepted insurance;
- language;
- practitioner gender when requested by the patient;
- in-person/virtual/home visit;
- date/time availability;
- open now;
- verified profile;
- accessibility attributes;
- rating threshold.

## 2. Healthcare map

Map entities:

- hospital;
- clinic/polyclinic;
- dental clinic;
- laboratory;
- imaging center;
- pharmacy (discovery later if launch scope requires);
- physiotherapy/rehab;
- mental health;
- home-care provider;
- telehealth service;
- specialty center.

Map cluster/card data should include only verified or provenance-tagged fields.

## 3. Provider and facility profiles

### Facility profile

- legal/display name;
- verification status;
- branches;
- address/coordinates;
- operating hours;
- phone/contact channels;
- specialties/services;
- practitioners;
- accepted insurance;
- languages;
- accessibility/parking information where supplied;
- photos;
- telehealth/home-care availability;
- booking availability;
- verified reviews;
- profile last-confirmed date.

### Practitioner profile

- verified identity;
- professional-registration status where integrable;
- title/classification;
- specialty/subspecialty;
- qualifications supplied with provenance;
- languages;
- gender where lawfully/publicly represented and relevant to patient preference;
- facility affiliations;
- services/visit reasons;
- appointment types;
- availability;
- verified review summary;
- provider-authored biography clearly distinguished from verified regulatory facts.

## 4. AI healthcare navigation

Input modes:

- text;
- voice;
- structured follow-up questions.

AI may:

- normalize user intent;
- map lay language to care-navigation concepts;
- ask safety/clarifying questions;
- suggest an appropriate type of service/specialty;
- apply insurance/language/location/time preferences;
- explain why results match;
- summarize provider profile facts;
- help compare options;
- assist with booking flow.

AI must not:

- claim to diagnose;
- prescribe medication;
- invent practitioner credentials;
- invent availability;
- invent insurance coverage;
- hide uncertainty;
- suppress emergency escalation because no provider result is available.

## 5. Booking

Support three provider maturity levels:

### Directory only

No structured booking. Patient can call, request contact, visit website, or get directions.

### Zyara-managed availability

Provider configures schedules/slots in Zyara.

### Integrated booking

Zyara reads real-time availability and writes confirmed appointments into the provider's HIS/EHR/PMS/scheduling system.

Booking features:

- visit reason;
- new/existing patient;
- appointment type;
- location/provider selection;
- availability;
- confirmation;
- reschedule/cancel;
- waitlist;
- reminders;
- check-in/intake later;
- provider-defined booking rules.

Patient booking is free.

## 6. Notifications

Channels:

- in-app/push;
- email;
- SMS;
- WhatsApp where provider/platform policy and local rules permit.

Notification types:

- booking confirmation;
- reminder;
- provider change/cancellation;
- waitlist opening;
- follow-up due;
- medication reminder (patient-controlled and/or provider-originated instruction);
- review request after verified visit;
- document/result availability;
- provider message when enabled.

Every channel requires preference/consent management and delivery status.

## 7. Verified reviews

Closed-loop review target:

- patient had a verified appointment/encounter;
- one review invitation per eligible encounter;
- moderation for policy violations;
- providers cannot delete compliant negative reviews;
- dispute workflow with evidence;
- public reviewer identity may be hidden while Zyara still verifies the visit.

Suggested doctor dimensions:

- communication;
- listening;
- clarity of explanation;
- respect;
- time/attention;
- overall experience.

Suggested facility dimensions:

- reception;
- waiting time;
- cleanliness;
- accessibility;
- organization;
- overall experience.

Do not ask patients to adjudicate clinical correctness as a star-rating dimension.

## 8. Patient health timeline

A longitudinal patient experience containing:

- Zyara appointments;
- imported appointments;
- encounters;
- conditions/problem references;
- medication requests/statements;
- allergies;
- observations/lab references;
- diagnostic reports;
- imaging/document references;
- referrals;
- vaccination records when integrated;
- follow-up instructions;
- patient-uploaded documents;
- patient-entered notes.

Every item needs source/provenance and access scope.

## 9. Family/dependents

Support:

- parent/guardian access;
- caregiver/dependent profiles;
- age/legal-state transitions;
- granular permissions;
- audit log of access/actions;
- revocation/delegation rules.

Do not model family access as “share one password.”

## 10. Provider onboarding and claiming

Provider graph lifecycle:

**Discover → Import → Verify → Claim → Enrich → Maintain**

Allow an unclaimed public listing only when the source and legal basis permit. Clearly label its verification/provenance state.

Claim flow may require:

- organization identity;
- facility license/registration evidence;
- authorized representative;
- practitioner roster;
- specialties/services;
- branch information;
- insurance networks;
- booking method;
- data accuracy attestation.

## 11. Provider analytics

Provider dashboards should cover:

- search impressions;
- map appearances;
- profile views;
- call/directions/website clicks;
- booking funnel;
- bookings/completions/cancellations/no-shows;
- appointment lead time;
- demand by specialty/service;
- demand by geography;
- insurance demand;
- practitioner-level performance where appropriate;
- review volume and sentiment/topics;
- returning vs new patients;
- AI recommendation to profile/booking conversion;
- search-demand gaps;
- privacy-preserving market benchmarks.

## 12. Monthly provider report

A generated report should answer:

- How visible was the facility?
- What did patients search for?
- Which services converted?
- Where were appointments lost?
- Which times/providers were supply constrained?
- Which insurance/language/geography segments showed demand?
- What changed in patient experience/reviews?
- What specific operational opportunities exist?

## 13. Localization

Required locales at product foundation:

- `ar`
- `en`
- `fr`
- `de`
- `es`

Requirements:

- RTL-safe component system;
- localized dates/times/numbers;
- medical taxonomy synonyms per locale;
- transliteration support;
- original + translated provider names where appropriate;
- original review retained with optional machine translation;
- translation provenance (“Translated from Arabic”, etc.);
- do not translate regulatory identifiers.

## 14. Accessibility

Target WCAG 2.2 AA for the web product. Include keyboard navigation, semantic structure, screen-reader labels, adequate focus states, reduced-motion support and accessible map/list alternatives.
