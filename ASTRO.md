# Astro Build Brief — Zyara

This file is the entry point for Astro or any implementation-planning agent.

## Mission

Turn the canonical planning documents in this repository into an executable, dependency-ordered software delivery plan for **Zyara**, a Saudi-first global healthcare discovery, navigation, booking, trust, and patient-journey platform.

Do not reduce the concept to a scheduling marketplace. Preserve the complete product thesis.

## Required reading order

1. `README.md`
2. `docs/VISION.md`
3. `docs/PRODUCT.md`
4. `docs/COMPETITORS.md`
5. `docs/ARCHITECTURE.md`
6. `docs/AI_SEARCH_TRUST.md`
7. `docs/PROVIDER_BUSINESS.md`
8. `docs/PRIVACY_INTEROP.md`
9. `docs/ROADMAP.md`
10. `docs/SOURCES.md`

## Non-negotiable founder decisions

- Working brand: **Zyara**, pending legal/trademark/domain clearance.
- Launch market: Saudi Arabia.
- Patient product: free.
- Booking: no booking fee to the patient.
- Core monetization: B2B SaaS subscriptions and paid integrations/enterprise capabilities.
- Zyara does not need to handle consultation payments in the core launch model.
- Languages: Arabic, English, French, German, Spanish.
- Arabic is first-class RTL.
- AI is a healthcare-navigation layer, not an autonomous clinician.
- Verified-visit reviews are preferred over open anonymous internet reviews.
- FHIR-aligned domain modeling and data provenance are required early.
- Privacy, consent, tenant isolation and auditability are architecture constraints, not future polish.

## Planning directive

Before writing production code, produce a repository-native execution plan that includes:

- product epics and user stories;
- bounded contexts/modules;
- proposed monorepo layout;
- database schema strategy;
- FHIR mapping strategy;
- public search/indexing architecture;
- geospatial strategy;
- provider verification workflow;
- review verification workflow;
- booking integration abstraction;
- notification abstraction;
- AI orchestration and safety policy;
- localization/RTL architecture;
- analytics/event taxonomy;
- security/privacy threat model;
- test strategy;
- synthetic seed-data strategy;
- CI/CD strategy;
- observability plan;
- migration and rollback conventions;
- release milestones and acceptance gates.

## Delivery philosophy

Prefer a **modular monolith with strict boundaries** for the first production system unless concrete evidence justifies an earlier service split. Preserve event contracts so modules can be extracted later.

Avoid:

- premature microservices;
- copying entire donor applications into the product;
- mixing patient clinical data with public marketplace/search data without explicit boundaries;
- AI-generated clinical claims without provenance;
- paid ranking disguised as relevance;
- storing sensitive health data merely because it might be useful later;
- building a custom closed clinical data model that prevents FHIR interoperability;
- depending on a single EHR/HIS vendor contract for core booking.

## Source adoption rule

`docs/SOURCES.md` is a **source landscape**, not a command to vendor-copy everything.

For each source proposed for direct code reuse, Astro must record:

1. exact upstream repository and commit/tag;
2. exact files/components to adopt;
3. founder authorization reference/status;
4. upstream license and notices;
5. changes made for Zyara;
6. security review status;
7. reason to reuse rather than reimplement;
8. upgrade/fork maintenance strategy.

Do not import a donor dependency or code tree without this record.

## Initial implementation target

The first useful release should prove the core flywheel in one Saudi launch geography:

1. provider/facility graph;
2. map + multilingual healthcare search;
3. trustworthy provider profiles;
4. verified onboarding/claiming;
5. appointment availability abstraction;
6. free patient booking;
7. verified post-visit review loop;
8. provider analytics;
9. safe AI navigation over the same structured graph.

Patient longitudinal health records and deeper FHIR clinical integrations are foundational, but should follow the discovery/booking trust loop in dependency order rather than block the first public search experience.

## Completion standard

A phase is not complete because screens exist. It is complete only when its acceptance criteria, automated tests, privacy/security gates, observability, documentation, localization behavior, and failure-mode behavior are proven.
