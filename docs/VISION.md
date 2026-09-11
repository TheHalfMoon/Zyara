# Zyara Product Vision

Research snapshot: 2026-09-11.

## One-line vision

**Zyara is the place people start whenever they need healthcare.**

## Category

Zyara combines five categories that are normally fragmented:

1. healthcare search engine;
2. healthcare map and local discovery;
3. appointment access/booking infrastructure;
4. verified provider reputation/trust network;
5. patient health journey and continuity layer.

AI sits across those layers as a natural-language and voice navigation interface.

## The problem

Patients frequently do not know:

- what specialty they need;
- which provider is licensed and appropriate;
- who accepts their insurance;
- who speaks their language;
- who is nearby;
- who has availability soon;
- whether reviews are authentic;
- where prior visits, medications, referrals and follow-ups are recorded;
- how to move from intent to a confirmed appointment without calling multiple facilities.

Providers separately struggle with:

- digital discoverability;
- stale directory data;
- fragmented booking systems;
- call-center workload;
- no-show rates;
- reputation management;
- demand visibility;
- understanding why patients viewed but did not book;
- connecting external discovery channels to their HIS/EHR/PMS.

## Product promise

A patient should be able to say or type:

> “I have knee pain, I need someone near me after 6 PM, I prefer Arabic, and I need a clinic that accepts my insurance.”

Zyara should convert that intent into a safe, explainable care-navigation result and available choices.

The system should not require the patient to know the medical taxonomy first.

## Google-like mental model

### Google Search equivalent

A single healthcare search box that accepts:

- doctor name;
- facility name;
- specialty/subspecialty;
- symptom/concern;
- procedure/service;
- insurance;
- language;
- geography;
- availability constraints;
- accessibility needs;
- natural-language questions.

### Google Maps equivalent

Map results should represent healthcare entities, not generic POIs. A map card may expose:

- verified identity;
- specialty/service relevance;
- verified visit rating;
- accepted insurance;
- languages;
- distance/travel time;
- open-now status;
- next available appointment;
- telehealth/home-care availability;
- accessibility/parking where known.

### Google account/history equivalent

The patient's health timeline becomes the continuity layer for appointments, encounters, medications, documents, referrals and follow-up instructions, with provenance for every item.

## Launch geography

Saudi Arabia first.

The architecture must not hard-code Saudi assumptions into universal domain models. Country-specific adapters should own:

- practitioner/facility verification;
- national address/geocoding sources;
- insurance terminology/integration;
- privacy/legal policies;
- messaging channel rules;
- health exchange requirements.

## Working brand decision

Among `Zyara`, `Ziara`, and `Ziyara`, the working product name is **Zyara** because it is short, visually distinctive and still evokes Arabic “زيارة”.

However, legal clearance is mandatory. Current examples of potentially conflicting usage include:

- https://zyara.io/ — appointment scheduling platform;
- https://apps.apple.com/us/app/zyara/id6737291558 — Health & Fitness app using Zyara;
- https://play.google.com/store/apps/details?id=com.visualsoft.vizzet.vezzet_patient — Ziara healthcare app;
- https://play.google.com/store/apps/details?id=com.ziyara_project.app_user — Ziyara health/visit project.

**Gate:** trademark/domain/app-store/social/company-name clearance before brand lock.

## User groups

### Patients

- individual adults;
- parents/guardians;
- caregivers/dependents;
- visitors/tourists;
- chronic-care patients;
- people seeking urgent-but-not-emergency guidance;
- patients with accessibility/language preferences.

### Healthcare providers

- solo practitioners;
- clinics;
- dental clinics;
- polyclinics;
- hospitals;
- medical groups;
- laboratories;
- imaging centers;
- physiotherapy/rehabilitation centers;
- mental health providers;
- home-care services;
- telehealth providers;
- pharmacies as a later discovery/integration category.

### Provider operators

- receptionists;
- call-center staff;
- branch managers;
- marketing/reputation teams;
- operations teams;
- IT/integration administrators;
- enterprise health-system administrators.

## Core flywheel

1. More verified providers create better discovery.
2. Better discovery produces more patient intent.
3. More patient intent produces bookings/calls/directions.
4. Completed encounters create verified reviews.
5. Reviews increase trust and ranking quality.
6. Provider analytics reveal demand and operational gaps.
7. Better provider participation improves availability and integration.
8. Patient history creates retention and continuity.
9. AI makes the entire graph easier to navigate.

## Product principles

### Trust before growth

A smaller verified provider graph is more valuable than a large polluted directory.

### Explain recommendations

The system should be able to say why a provider was shown: insurance match, specialty match, distance, language, availability, verified rating, continuity, etc.

### Separate relevance from monetization

Subscription status must not secretly buy organic medical-search rank. Sponsored placement, if ever introduced, must be clearly labeled and constrained by eligibility/safety rules.

### Provenance everywhere

Clinical or health-history data should indicate whether it was:

- patient-entered;
- provider-supplied;
- imported from an external clinical system;
- derived by Zyara;
- translated by Zyara;
- AI-generated/summarized.

### AI should know when not to answer

Emergency red flags, insufficient information, uncertain clinical intent and unsupported claims must trigger abstention/escalation paths.

### International from the model, local in the adapters

Use universal domain concepts with country-specific compliance, registry, insurer and messaging integrations.

## First-class languages

- Arabic
- English
- French
- German
- Spanish

Search must support translated terminology, transliteration, synonyms and spelling variants. Arabic must support RTL layouts and Arabic medical vocabulary without forcing users through English terms.

## What Zyara is not

- not a medical diagnosis engine;
- not a replacement for emergency services;
- not a payment marketplace at launch;
- not an ad auction for medical rank;
- not a provider-only scheduling tool;
- not an EHR replacement;
- not a data broker;
- not an uncontrolled directory populated by anonymous edits.

## Long-term outcome

The desired user behavior is not “I use Zyara when I want to book a doctor.”

It is:

> **“If I need anything related to healthcare, I start with Zyara.”**
