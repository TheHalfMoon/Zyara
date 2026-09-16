# Zyara V1 Product Canonicalization Brief — 2026-09-16

## Purpose

This document captures the founder-directed V1 product direction for Zyara in an agent-neutral form. It exists so the repository can be planned, implemented, reviewed and evolved without tying product authority to any specific planning agent.

The V1 north star is:

> **When someone needs care, they start with Zyara.**
>
> They can browse, type or speak. Zyara helps them find trustworthy doctors and healthcare facilities, understand specialty/service fit, distance, hours, insurance, reputation, freshness and access options, then call, WhatsApp, get directions, visit the provider website or book through the strongest truthful access mode available.

V1 is **healthcare discovery + trust + access**. It is not a miniature EHR, full hospital ERP or complete Doctolib replacement.

## Canonical founder decisions

### Discovery modes

The patient experience must support:

```text
All | Doctors | Clinics & Hospitals
```

The internal graph must remain broader than those labels and correctly represent non-physician practitioners and non-clinic facilities.

### Search domains

V1 must support or explicitly plan:

- practitioner/doctor name;
- clinic/hospital/facility name;
- specialty;
- subspecialty;
- service/procedure;
- common patient care language;
- insurer/network;
- city/district/location;
- Arabic and English aliases, transliterations and common misspellings;
- natural-language multi-constraint search.

### Specialty discovery

Specialty browse and search are first-class product surfaces. Representative launch families include Dentistry, Orthopedics, Dermatology, Pediatrics, Cardiology, ENT, Ophthalmology, OB/GYN, Internal Medicine, Neurology, Psychiatry, Urology, General Surgery, Physiotherapy, Imaging and Laboratory services.

The taxonomy must support common patient expressions such as `عظام`, `ركبة`, `ortho`, `dentist`, `derma` and similar care-navigation language without turning navigation into autonomous diagnosis.

### Practitioner/facility graph invariant

Never flatten a practitioner into one clinic.

Preserve:

```text
Practitioner
  -> PractitionerRole @ Organization/Location A
  -> PractitionerRole @ Organization/Location B
  -> PractitionerRole @ Organization/Location C
```

Practitioner identity and practitioner reputation survive workplace changes. Facility reputation remains attached to the facility/branch.

### Independent reputation

A verified visit may support separate reputation targets:

```text
VerifiedVisit
  -> PractitionerReview
  -> FacilityReview
```

The product must support a legitimate case such as:

```text
Doctor:   4.9 / 5
Facility: 2.2 / 5
```

Never blend doctor and facility reputation into one score.

Preserve existing safeguards: attendance-linked review eligibility, privacy-safe public projection, moderation of unsafe content, independent appeal, provider reply, prohibition on provider deletion of compliant negative reviews and low-count aggregate protection.

### Branch-aware access

Primary patient actions when supported:

```text
Call | WhatsApp | Directions | Website | Book
```

Phone, booking phone, official WhatsApp, website, directions and booking route must be branch-aware and freshness-tracked. Do not pass private health/search context into third-party channels without a separately authorized workflow.

### Insurance model

Insurance must not be a global provider boolean.

Preserve or model:

```text
payer/network/plan
+ branch
+ service
+ practitioner role
+ valid interval
+ source/evidence
+ freshness
```

Never present listed acceptance as a guarantee of member benefits, prior authorization or coverage.

### Clinic Portal V1

The initial clinic portal is a **Provider Data Operating Surface**. Its purpose is to create, claim, correct and continuously maintain the public healthcare graph.

V1 should support or explicitly plan:

- organization claim/onboarding;
- branches and locations;
- address/pin/entrance/accessibility;
- logo, cover and gallery;
- regular and holiday hours;
- phone, booking phone, official WhatsApp, website and public contact channels;
- specialties and subspecialties;
- healthcare services;
- practitioner roster;
- practitioner photos, biography, education, qualifications, experience and languages;
- PractitionerRole/location relationships;
- insurer/network acceptance by scope;
- review replies;
- profile correction/dispute;
- profile completeness and freshness;
- core discovery analytics.

Do not turn Clinic Portal V1 into a complete ERP/EHR.

### Freshness

Material provider-managed public facts should have recurring confirmation, with a 30-day target for high-change fields such as roster, contacts, services, specialties, hours and insurance acceptance unless a more authoritative or faster source exists.

Credential/registration rechecks remain separately governed.

Public trust should expose specific provenance/freshness instead of relying on a single ambiguous `Verified` badge.

### AI-native product rule

Mandatory invariant:

> **AI MAY INTERPRET. AI MAY NAVIGATE. AI MAY EXPLAIN. AI MAY PROPOSE. STRUCTURED ZYARA SYSTEMS OWN FACTS AND ACTIONS.**

AI must not fabricate practitioners, facilities, qualifications, insurance acceptance, hours, services, availability, ratings, distance, contact channels or booking outcomes.

Natural-language search and conversational refinement must resolve into structured intent/filter state over the canonical graph.

### Voice

Voice is first-class, but it uses the same intent, safety, search, ranking and typed-tool contracts as text.

Preserve:

- Arabic and representative Saudi Arabic;
- Arabic/English code-switching;
- deliberate microphone capture;
- visible recording state;
- transcript correction for low-confidence entities;
- specialty/provider/insurer entity evaluation;
- local/private ASR preference where measured and practical;
- explicit cloud-ASR policy;
- no default raw-audio retention when transcript is sufficient;
- exact confirmation before sensitive actions.

### Organic ranking

Paid status must never improve organic ranking.

Permitted ranking inputs may include factual relevance, specialty/service match, explicit patient constraints, source quality/freshness, distance/travel time, opening-hours relevance, authoritative availability, insurance match, review confidence/recency and permitted continuity.

Any sponsored placement must be explicit and separate.

## V1 required capability families

- healthcare discovery;
- practitioner profiles;
- clinic/hospital/facility profiles;
- specialty/subspecialty discovery;
- service/procedure discovery;
- map/list and nearby care;
- truthful distance/travel-time handling;
- opening hours/open-now;
- branch-aware phone and WhatsApp;
- directions;
- website/public contact;
- multi-location practitioners;
- insurance visibility;
- independent doctor/facility reputation;
- verified-review loop;
- claim/correction flow;
- Clinic Portal V1;
- recurring freshness attestation;
- provider discovery analytics foundation;
- natural-language AI search;
- staged voice experience;
- explainable match reasons;
- truthful booking/request/call/redirect access modes.

## Explicitly not required as V1 discovery blockers

These remain future seams unless a narrow dependency requires them or they are already safely implemented:

- full EHR/HIS replacement;
- broad longitudinal clinical-record storage;
- prescribing;
- full claims/revenue-cycle system;
- broad consultation-payment platform;
- complete practice-management OS;
- large intake/forms suite;
- waitlist/recall as a launch dependency;
- full patient messaging platform;
- mobile check-in/queue;
- full telehealth platform;
- AI phone receptionist;
- consultation documentation copilot;
- unrestricted autonomous agents.

## Competitor pattern policy

The repository contains current research on Doctolib, Zocdoc, Healthgrades, Vezeeta Saudi, NexHealth, Solv and Tebra.

Use competitors to identify valuable product patterns, not to copy trade dress or expand scope for feature-count parity.

High-value patterns include:

- Doctolib: scheduling, provider operations, patient messaging, digital secretariat, AI assistants and care continuity;
- Zocdoc: insurance/visit-reason/location/availability search and AI care-language search;
- Healthgrades: independent doctor/facility reputation and deep provider profiles;
- Vezeeta: MENA specialty, insurance, location and marketplace expectations;
- NexHealth: scheduling sync, recall, waitlist, forms, communications, insurance, reviews and analytics;
- Solv: same-day access, intake, mobile check-in/queue, messaging and voice-assisted booking;
- Tebra: claimed provider profiles, reputation management and online scheduling configuration.

Every feature adopted into V1 must solve a concrete V1 patient/provider job. Everything else should be assigned to an explicit future seam.

## Planning outputs required before the next major implementation wave

The canonical Zyara planning set should reconcile live repository truth and produce:

1. a preservation matrix classifying current capabilities as `PROVEN_COMPLETE`, `PRESENT_NEEDS_ADAPTATION`, `PARTIAL`, `MISSING`, `DEFERRED_EXTERNAL_VALIDATION` or `NOT_V1`;
2. revised V1 requirements and explicit exclusions;
3. a data-model delta for branch-aware contacts, media, practitioner evidence, taxonomy, freshness and independent reputation;
4. a search/ranking contract covering entity types, aliases, Arabic normalization, filters, sort modes, explainability, zero-results and stale/unknown behavior;
5. a review/trust migration plan preserving current safety/audit semantics;
6. a Clinic Portal V1 plan;
7. an AI/voice V1 plan using the existing unified text/voice architecture;
8. a competitor adoption matrix (`V1_REQUIRED`, `V1_OPTIONAL`, `V2`, `V3_PLUS`, `REJECT`, `ALREADY_IMPLEMENTED`);
9. a dependency-ordered implementation roadmap with phases, slices, tasks, tests, evidence and rollback/recovery criteria;
10. an implementation handoff that starts from live truth and never fabricates external validation.

## Evidence boundary

Repository implementation, synthetic qualification, real-provider validation, real-patient/pilot validation, commercial validation and production authorization remain separate status dimensions.

A technically complete repository feature must not be described as production-validated without external evidence.
