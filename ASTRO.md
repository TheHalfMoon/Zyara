# Astro Build Brief — Zyara

This file is the entry point for Astro or any implementation-planning agent.

The repository now contains a refined V1 direction centered on healthcare discovery, trust, access, AI-native search and voice. The product authority is Zyara itself; no planning agent is part of the product model.

## Mission

Turn the live canonical Zyara documents into an executable, dependency-ordered software delivery plan for a Saudi-first healthcare discovery and access platform.

Do not reduce Zyara to a scheduling marketplace, and do not expand V1 into a full EHR/Doctolib clone.

The current V1 north star is:

> **When someone needs care, they start with Zyara.**
>
> They can browse, type or speak. Zyara helps them find trustworthy doctors and healthcare facilities, understand specialty/service fit, distance, hours, insurance, reputation, freshness and access options, then call, WhatsApp, get directions, visit the provider website or book through the strongest truthful access mode available.

## Required reading order

1. `README.md`
2. `docs/canonical/ZYARA_V1_FOUNDER_DIRECTION_2026-09-16.md`
3. `docs/canonical/ZYARA_V1_FEATURE_SCOPE_MATRIX_2026-09-16.md`
4. `docs/canonical/ZYARA_V1_PRODUCT_CANONICALIZATION_BRIEF_2026-09-16.md`
5. `docs/research/ZYARA_V1_COMPETITOR_FEATURE_SYNTHESIS_2026-09-16.md`
6. `docs/research/ZYARA_V1_CURRENT_COMPETITOR_SOURCE_LIST_2026-09-16.md`
7. `docs/research/ZYARA_V1_LIVE_TRUTH_PRECHECK_2026-09-16.md`
8. `docs/research/ZYARA_V1_PLANNING_COMPLETION_CHECKLIST_2026-09-16.md`
9. `docs/canonical/ZYARA_CANONICAL_BUILD_PLAN.md`
10. `docs/canonical/ZYARA_PRODUCT_REQUIREMENTS.md`
11. `docs/canonical/ZYARA_ARCHITECTURE_PLAN.md`
12. `docs/canonical/ZYARA_DATA_AND_FHIR_MODEL.md`
13. `docs/canonical/ZYARA_AI_SEARCH_VOICE_PLAN.md`
14. `docs/canonical/ZYARA_PROVIDER_PLATFORM_PLAN.md`
15. `docs/canonical/ZYARA_APPOINTMENT_SYSTEM_PLAN.md`
16. `docs/canonical/ZYARA_PRIVACY_SECURITY_COMPLIANCE_PLAN.md`
17. `docs/canonical/ZYARA_TEST_AND_EVIDENCE_PLAN.md`
18. `docs/canonical/ZYARA_ROADMAP.md`
19. `docs/VOICE_AGENT_RUNTIME.md`
20. `docs/SOURCES.md`

Then reverify live repository/GitHub truth before changing canonical authority.

## Non-negotiable founder decisions

- Working brand: **Zyara**, pending legal/trademark/domain clearance.
- Launch market: Saudi Arabia.
- Patient product: free.
- Booking: no booking fee to the patient.
- Core monetization: B2B SaaS subscriptions and paid integrations/enterprise capabilities.
- Arabic is first-class RTL; English, French, German and Spanish remain supported first-class locales under the existing architecture.
- V1 is healthcare discovery + trust + access.
- Specialty, subspecialty and service/procedure search are first-class.
- Practitioners may work at multiple facilities; `PractitionerRole` models workplace relationships.
- Doctor reputation and facility reputation are independent first-class trust objects.
- Insurance is scoped by payer/network + branch + service + practitioner role + validity/evidence, never a global provider boolean.
- Branch-aware phone, booking phone, official WhatsApp, directions, website and truthful booking/access routes are first-class V1 actions.
- Clinic Portal V1 is a provider-data operating surface for claims, branches, roster, services, specialties, insurance, contacts, media, freshness, reviews and discovery analytics.
- Material provider-managed public data uses recurring freshness/attestation rules.
- AI is a healthcare-navigation layer, not an autonomous clinician.
- **AI may interpret, navigate, explain and propose; structured Zyara systems own facts and actions.**
- Voice is a first-class patient input surface using the same intent/safety/search/tool pipeline as text.
- Verified-visit review mechanics are preferred over open anonymous internet reviews.
- Paid status must never improve organic ranking.
- FHIR-aligned domain modeling, provenance, privacy, consent, tenant isolation and auditability remain architecture constraints.

## Initial implementation target

The first useful public product should prove the discovery flywheel:

1. trustworthy provider/facility graph;
2. doctor, clinic/hospital, specialty and service discovery;
3. map/list parity and nearby-care context;
4. distance/travel-time handling and open-now/hours;
5. branch-aware phone, WhatsApp, directions, website and booking/access actions;
6. deep doctor and facility profiles;
7. multi-location practitioners;
8. insurance visibility at the correct scope;
9. independent doctor/facility reputation;
10. provider claim/correction and Clinic Portal V1;
11. recurring freshness attestation;
12. natural-language AI search and explainable match reasons;
13. staged voice discovery over the same structured pipeline.

Do not make full EHR/HIS replacement, broad clinical records, prescribing, full claims/revenue cycle, complete practice-management OS, full messaging, mobile check-in/queue, full telehealth, AI phone receptionist or unrestricted autonomous agents V1 discovery blockers.

## Planning directive

Before the next major implementation wave, reconcile live repository truth and produce:

- an existing-work preservation matrix;
- revised V1 requirements and explicit exclusions;
- the minimum data-model delta;
- search/ranking and specialty/service taxonomy contracts;
- independent practitioner/facility review architecture;
- Clinic Portal V1 plan;
- AI/voice V1 plan;
- competitor adopt/defer/reject matrix;
- dependency-ordered phases, slices and tasks;
- tests, evidence, rollback/recovery and completion criteria per task;
- a clean implementation handoff based on exact live truth.

Use `docs/research/ZYARA_V1_PLANNING_COMPLETION_CHECKLIST_2026-09-16.md` as the planning quality gate.

## Delivery philosophy

Prefer a modular monolith with strict boundaries unless evidence justifies extraction.

Preserve one coherent provider graph, one search contract, one review/trust architecture, one profile/freshness model and one text/voice intent pipeline.

Avoid:

- duplicate practitioner records per clinic;
- global insurance booleans;
- blended doctor/facility reputation;
- second AI/voice reasoning stacks;
- premature microservices;
- copying competitor trade dress;
- copying entire donor applications into Zyara;
- AI-generated provider/clinical facts without provenance;
- unrestricted agents with production patient access;
- paid ranking disguised as relevance;
- storing sensitive data merely because it may be useful later.

## Source adoption rule

`docs/SOURCES.md` is a source landscape, not an instruction to vendor-copy everything.

For direct code reuse, preserve exact upstream repository/version, files/components adopted, authorization basis, license/notices, security review, Zyara modifications and maintenance strategy.

## Evidence boundary

Repository implementation, synthetic qualification, real-provider validation, real-patient/pilot validation, commercial validation and production authorization are separate status dimensions.

Never convert a technically complete repository feature into a production-validation claim without evidence.

## Completion standard

A planning pass is complete only when the V1 reconciliation, preservation matrix, canonical deltas, dependency graph, phases/slices/tasks, acceptance gates and implementation handoff are internally consistent and live-truth grounded.

A product phase is not complete because screens exist. Acceptance criteria, tests, privacy/security behavior, evidence, localization, observability and failure modes must be proven at the level appropriate to that phase.
