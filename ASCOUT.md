# AScout Handoff — Zyara V1 Discovery-First Canonicalization

Use English only for all repository, GitHub, technical, planning, evidence, task, review, and implementation-facing content.

## Mission

Continue `TheHalfMoon/Zyara` from exact live repository/GitHub truth and perform a **planning/canonicalization pass** for the newly founder-directed V1.

Do not start by inventing a fresh product. Do not throw away the current architecture or completed implementation. Reconcile the new V1 direction with what already exists, preserve proven work, identify only genuine gaps, and produce an execution-ready canonical plan for the next implementation agent.

The V1 goal is now deliberately narrow:

> **When someone needs care, they start with Zyara.**
>
> They can browse, type, or speak. Zyara helps them find trustworthy doctors and healthcare facilities, understand specialty/service fit, distance, hours, insurance, reputation, freshness and contact options, then call, WhatsApp, get directions, visit a website, or book through the strongest truthful access mode available.

V1 is **healthcare discovery + trust + access**, not a miniature EHR or full Doctolib replacement.

## Live-truth rule

Before doing any planning work:

1. Fetch `origin/main` and verify the exact SHA.
2. Verify open PRs, current canonical docs, current task/evidence state, current implementation state and any work merged after this handoff was authored.
3. Treat live repository/GitHub truth as authoritative over this handoff if the repository advanced.
4. Never fabricate tests, CI, provider data, real clinics, real doctors, credentials, insurance acceptance, availability, reviews, pilot evidence, users, contracts or production readiness.
5. Never rewrite shared history, force-push, rebase, weaken gates or bypass governance.

Baseline when this handoff was prepared: `main = 8b0789d700a16c3708cc8468140e377c4722872a`, after PR #90 (`feat(web): redesign patient discovery around nearby care`). Reverify it; do not assume it remains current.

## Founder-authoritative new reading

Read these first after live-truth verification:

1. `docs/canonical/ZYARA_V1_FOUNDER_DIRECTION_2026-09-16.md`
2. `docs/research/ZYARA_V1_COMPETITOR_FEATURE_SYNTHESIS_2026-09-16.md`
3. `docs/canonical/ZYARA_CANONICAL_BUILD_PLAN.md`
4. `docs/canonical/ZYARA_PRODUCT_REQUIREMENTS.md`
5. `docs/canonical/ZYARA_ARCHITECTURE_PLAN.md`
6. `docs/canonical/ZYARA_DATA_AND_FHIR_MODEL.md`
7. `docs/canonical/ZYARA_AI_SEARCH_VOICE_PLAN.md`
8. `docs/canonical/ZYARA_PROVIDER_PLATFORM_PLAN.md`
9. `docs/canonical/ZYARA_APPOINTMENT_SYSTEM_PLAN.md`
10. `docs/canonical/ZYARA_PRIVACY_SECURITY_COMPLIANCE_PLAN.md`
11. `docs/canonical/ZYARA_TEST_AND_EVIDENCE_PLAN.md`
12. `docs/canonical/ZYARA_ROADMAP.md`
13. `docs/canonical/ZYARA_MUSE_EXECUTION_HANDOFF.md`
14. `docs/VOICE_AGENT_RUNTIME.md`
15. `docs/COMPETITORS.md`
16. `docs/SOURCES.md`

Then inspect current implementation, migrations, tests, evidence and UI corresponding to the V1 capabilities.

## Founder decisions that must not be diluted

### Product north star

Zyara V1 must become the first trusted healthcare starting point for patients.

The patient should be able to answer quickly:

- What care is near me?
- Which specialty or service matches what I am trying to find?
- Which doctors are relevant?
- Which clinics/hospitals/facilities are relevant?
- How far away are they?
- Are they open now?
- What are their working hours?
- Do they accept my insurance in this branch/service/role context?
- What is the doctor's reputation?
- What is the facility's reputation?
- Where does this doctor work?
- What is the doctor's education, qualification and experience evidence?
- What services does this clinic/facility offer?
- How recently was important profile data confirmed?
- Can I call, WhatsApp, get directions, visit the site, or book?
- Why did Zyara show this result?

### Search modes

The patient-facing result experience must support:

```text
All | Doctors | Clinics & Hospitals
```

The internal graph must remain more general than those labels and continue to represent non-physician practitioners and non-clinic facilities correctly.

### Search domains

V1 planning must cover:

- doctor/practitioner name;
- clinic/hospital/facility name;
- specialty;
- subspecialty;
- service/procedure;
- common care need;
- insurer/network;
- city/district/location;
- Arabic and English aliases/transliterations/misspellings;
- natural-language constraint search.

### Specialty discovery

Specialty browse/search is first-class. Dentistry, Orthopedics, Dermatology, Pediatrics, Cardiology, ENT, Ophthalmology, OB/GYN, Internal Medicine, Neurology, Psychiatry, Urology, General Surgery, Physiotherapy, Imaging and Laboratory services are representative launch taxonomy families, not an exhaustive hard-coded list.

The taxonomy must support common patient language such as `عظام`, `ركبة`, `ortho`, `dentist`, `derma`, etc., without turning navigation into autonomous diagnosis.

### Practitioner/facility graph

Never flatten a doctor into one clinic.

Preserve:

```text
Practitioner
  -> PractitionerRole @ Organization/Location A
  -> PractitionerRole @ Organization/Location B
  -> PractitionerRole @ Organization/Location C
```

A doctor's identity and practitioner reputation survive location changes. Branch/facility reputation remains attached to that facility/branch.

### Reputation separation

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

Do not average them into one score.

Preserve existing trust protections: verified/attendance-linked review eligibility, privacy-safe public projection, moderation of unsafe content, independent appeal, provider reply, prohibition on provider deletion of compliant negative reviews, and low-count aggregate protection.

### Branch-aware access and contacts

V1 must treat these as primary patient actions when supported:

```text
Call | WhatsApp | Directions | Website | Book
```

Contacts must be branch-aware and freshness-tracked. Never pass private health/search context into WhatsApp or another third-party channel without a separately authorized workflow.

### Insurance context

Insurance cannot remain a global provider boolean. Preserve/model payer + network/plan + branch + service + practitioner role + validity + source + freshness. Never present payer acceptance as a guarantee of patient benefits or authorization.

### Clinic Portal V1

The V1 portal is a **Provider Data Operating Surface** before it becomes a full practice OS.

It should support or explicitly plan:

- organization claim/onboarding;
- branch management;
- address/pin/entrance;
- logo/cover/gallery;
- hours/holiday hours;
- phone;
- booking phone;
- WhatsApp;
- website/public contact;
- specialties;
- services;
- doctor/practitioner roster;
- practitioner photos;
- biographies;
- education/qualifications/experience;
- languages;
- role/location relationships;
- insurer/network acceptance by scope;
- review replies;
- profile correction/dispute;
- public profile completeness/freshness;
- core discovery analytics.

### Monthly freshness

V1 planning must preserve a 30-day confirmation loop for material provider-managed public data such as doctor roster, contact channels, services, specialties, hours and insurance acceptance, while keeping separate credential/registration recheck rules.

Public trust should communicate specific freshness/provenance rather than a single ambiguous `Verified` badge.

### AI-native interaction

AI is the interaction/control layer over Zyara's structured truth.

Mandatory invariant:

> **AI MAY INTERPRET. AI MAY NAVIGATE. AI MAY EXPLAIN. AI MAY PROPOSE. STRUCTURED ZYARA SYSTEMS OWN FACTS AND ACTIONS.**

AI must not fabricate doctors, clinics, qualifications, insurance, hours, services, availability, ratings, distance, contact channels or booking outcomes.

Natural-language search and conversational refinement should map into structured search/filter state.

### Voice

Voice is first-class, but it uses the exact same intent/safety/search/tool contracts as text.

Preserve:

- Arabic and representative Saudi Arabic;
- Arabic/English code-switching;
- deliberate microphone capture;
- visible recording state;
- transcript correction for low-confidence entities;
- medical specialty/provider/insurer entity testing;
- local/private ASR preference where measured/practical;
- explicit cloud-ASR policy;
- no default raw-audio retention when transcript suffices;
- exact confirmation before sensitive actions.

Text quality may gate voice release, but the architecture must remain voice-native rather than adding voice as an unrelated later subsystem.

### Organic ranking

Paid status must never improve organic ranking.

Permitted ranking inputs may include query relevance, specialty/service match, explicit patient constraints, evidence/freshness, distance/travel time, opening-hours relevance, authoritative availability, insurance match, review confidence/recency and permitted continuity.

Sponsored placement, if ever introduced, must be explicit and separate.

## V1 scope boundary

### Required V1 capability families

- healthcare discovery;
- doctor/practitioner profiles;
- clinic/hospital/facility profiles;
- specialty and subspecialty discovery;
- services/procedure discovery;
- map/list and nearby care;
- distance and truthful travel-time handling;
- opening hours/open-now;
- phone;
- WhatsApp;
- directions;
- website/contact;
- multi-location practitioners;
- insurance visibility;
- doctor/facility reputation separation;
- verified-review loop;
- claim/correction flow;
- clinic portal;
- monthly freshness attestation;
- provider profile analytics/event foundation;
- natural-language AI search;
- voice architecture and staged voice experience;
- explainable result reasons;
- truthful booking/request/call/redirect modes.

### Explicitly not a V1 discovery blocker

Do not expand the next V1 plan merely to copy competitors. These are future seams unless current safe-booking architecture already implements them or a narrow dependency requires them:

- full EHR/HIS replacement;
- broad clinical-record storage;
- prescribing;
- full claims/revenue-cycle system;
- broad consultation-payment platform;
- complete practice-management OS;
- complex intake/forms suite;
- waitlist/recall as a launch blocker;
- full messaging platform;
- mobile check-in/queue;
- full telehealth platform;
- AI phone receptionist;
- consultation documentation copilot;
- unrestricted autonomous agents.

## Competitor research to preserve

The repository now contains a dated synthesis of current official public features from:

- Doctolib;
- Zocdoc;
- Healthgrades;
- Vezeeta Saudi;
- NexHealth;
- Solv;
- Tebra.

Do not copy competitor trade dress or proprietary implementation. Extract product patterns, validate them against Zyara's goals, and record adopt/defer/reject decisions.

Important high-value future patterns include:

- Doctolib: provider operating system, scheduling, patient messaging, digital secretariat, AI assistants, care continuity;
- Zocdoc: insurance/visit-reason/location/availability search and AI care-language search;
- Healthgrades: doctor-vs-hospital quality separation, procedure/condition search and deep provider profiles;
- Vezeeta: Saudi/MENA specialty + insurance + location expectations and clinic/doctor listings;
- NexHealth: scheduling sync, recalls, waitlist, forms, communications, insurance, reviews, analytics;
- Solv: intake, mobile check-in/queue, messaging, rebooking, voice agent and AI-to-real-world booking bridge;
- Tebra: claimed provider profiles and online scheduling configuration.

## Required AScout work product

This pass is not complete until AScout produces repository-native artifacts covering all items below.

### 1. Live repository audit

Document:

- exact `main` SHA;
- open PRs;
- current canonical authority;
- current implemented product surfaces;
- current migrations/data model;
- current tests/evidence;
- current gaps relative to the founder V1 direction.

### 2. Existing-work preservation matrix

For every major V1 capability, classify the current repository as:

```text
PROVEN_COMPLETE
PRESENT_NEEDS_ADAPTATION
PARTIAL
MISSING
DEFERRED_EXTERNAL_VALIDATION
NOT_V1
```

Do not assume missing because a file name differs. Inspect actual implementation and evidence.

### 3. V1 product requirements revision

Produce a concise canonical V1 requirements document including:

- patient journeys;
- provider/admin journeys;
- entity/profile contracts;
- specialty/service search behavior;
- doctor/facility review separation;
- claim/correction;
- freshness;
- contact actions;
- AI/voice behavior;
- explicit V1 exclusions.

### 4. Data-model delta

Specify only required changes to the existing model for:

- branch-aware contacts;
- official WhatsApp;
- provider media/gallery;
- practitioner education/qualification/experience evidence;
- richer specialty/service taxonomy where needed;
- monthly attestation/freshness state;
- independent practitioner and facility reviews/aggregates;
- facility profile data;
- contact/action provenance;
- search projections.

Preserve existing Practitioner/PractitionerRole/Organization/Location/FHIR model where correct.

### 5. Search and ranking contract

Define:

- query intent classes;
- specialty/service aliasing;
- Arabic normalization and transliteration;
- result entity types;
- `All / Doctors / Clinics & Hospitals` composition;
- hard filters;
- ranking features;
- explicit sort modes;
- explainability payload;
- zero-result behavior;
- unknown/stale-data behavior;
- AI natural-language parser contract;
- voice-to-search contract;
- offline/fallback behavior.

### 6. Review/trust redesign

Specify migration from the current combined review structure to independently attributable practitioner and facility reputation without losing current safety/audit rules.

Include:

- review eligibility;
- one-visit relationship;
- practitioner dimensions;
- facility dimensions;
- aggregate thresholds;
- moderation;
- replies;
- disputes/appeals;
- historical workplace changes;
- ranking use;
- migration/backward compatibility.

### 7. Clinic Portal V1 plan

Define the minimal provider portal required to create and maintain the public graph.

Include roles/permissions, claim flow, roster management, branch data, media, specialties, services, insurance, contacts, monthly attestation, review replies, analytics and audit.

Do not turn this into a full ERP/EHR.

### 8. AI-era plan

Map current `ZYARA_AI_SEARCH_VOICE_PLAN.md` and `VOICE_AGENT_RUNTIME.md` into the V1 discovery experience.

Specify:

- text-first quality gate;
- voice capture/transcription gate;
- conversational refinement;
- structured intent state;
- explainable result reasons;
- model/provider abstraction;
- local/private ASR evaluation;
- Arabic/Saudi/code-switch corpus;
- failure/abstention/fallback;
- future AI phone agent seam;
- future provider copilot seam.

### 9. Competitor adoption matrix

For the researched competitor features, classify each as:

```text
V1_REQUIRED
V1_OPTIONAL
V2
V3_PLUS
REJECT
ALREADY_IMPLEMENTED
```

Every adoption must state the user/provider problem it solves. Avoid feature-count competition.

### 10. Dependency-ordered implementation roadmap

Produce phases -> slices -> tasks -> acceptance gates.

Each task must include:

- purpose;
- exact scope;
- dependencies;
- allowed surfaces/files/modules;
- non-goals;
- data/privacy implications;
- migration impact;
- tests;
- evidence artifact;
- rollback/recovery behavior;
- completion criteria.

The roadmap must clearly distinguish repository-owned implementation from external clinic recruitment, real-provider validation, legal/vendor contracts, production data and other external gates.

### 11. Implementation handoff

Produce a final implementation-agent prompt that:

- starts from exact live truth;
- follows the new dependency graph;
- executes only authorized tasks;
- preserves evidence and governance;
- never fabricates production validation;
- does not stop at screens when backend/data/trust contracts remain incomplete.

## Planning quality bar

Challenge the founder direction when evidence shows a contradiction, safety issue or simpler superior architecture, but do not broaden V1 merely because a competitor has a feature.

Prefer:

- one coherent graph;
- one search contract;
- one review/trust architecture;
- one profile/freshness model;
- one text/voice intent pipeline;
- typed facts/actions;
- strict provenance;
- clear future seams.

Avoid:

- duplicate doctor records per clinic;
- global insurance booleans;
- one blended doctor+facility rating;
- stale phone/WhatsApp/hours without freshness;
- generic `Verified` badges that hide what was actually verified;
- model-generated provider facts;
- autonomous clinical diagnosis/treatment;
- paid organic rank;
- premature microservices;
- feature cloning without a V1 job-to-be-done;
- rebuilding already-proven repository work.

## Stop condition

AScout may declare the planning pass complete only when:

- live truth is documented;
- the new founder V1 direction is reconciled with current canonical work;
- every V1 capability is classified against current implementation;
- data/search/review/portal/AI deltas are explicit;
- competitor features are classified rather than copied blindly;
- V1 exclusions and future seams are explicit;
- dependency-ordered implementation tasks and evidence gates exist;
- the next implementation agent can execute without rediscovering product strategy.

The completion marker should be:

```text
ASCOUT_ZYARA_V1_PLAN_COMPLETE = YES
```

with exact branch/HEAD/base SHAs, produced artifacts, validation checks, unresolved external blockers, and the first implementation task identifier.