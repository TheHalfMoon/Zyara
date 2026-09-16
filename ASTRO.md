# Astro Master Planning Brief — Zyara

Use English only for all repository, GitHub, technical, planning, evidence, task, review, and implementation-facing content.

## Mode

**PLAN-ONLY.** Do not implement production product code in this pass.

Your job is to turn exact live Zyara repository truth plus the founder-directed V1 product direction into the strongest executable canonical plan for the next implementation agent.

All planning artifacts must be committed to the repository. Do not leave material plans, decisions, task graphs, acceptance criteria, research conclusions, or implementation handoff only in local notes or chat output.

Do not stop until the planning completion gate is genuinely satisfied.

## Product authority

The product authority is **Zyara itself**, not Astro or any other agent.

The current V1 north star is:

> **When someone needs care, they start with Zyara.**
>
> They can browse, type, or speak. Zyara helps them find trustworthy doctors and healthcare facilities, understand specialty/service fit, distance, hours, insurance, reputation, freshness and access options, then call, WhatsApp, get directions, visit the provider website, or book through the strongest truthful access mode available.

V1 is **healthcare discovery + trust + access**. Do not reduce it to a scheduling marketplace, and do not expand it into a full EHR, hospital ERP, or Doctolib clone.

## Live-truth rule

Before planning:

1. Reverify exact `main` SHA.
2. Reverify open PRs, current canonical authority, current task/evidence state, migrations, implementation, tests, CI and merged work.
3. Treat live GitHub/repository truth as authoritative over this file when the repository has advanced.
4. Preserve proven completed work. Do not rebuild functionality merely because the new product language is different.
5. Never fabricate tests, CI, clinic/provider data, credentials, insurance acceptance, reviews, users, pilots, contracts, production readiness, legal approval or commercial validation.
6. Never force-push, rebase, rewrite shared history, bypass governance, weaken gates, or convert unknown external evidence into a claim.

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
20. `docs/COMPETITORS.md`
21. `docs/SOURCES.md`

Then inspect the current implementation, migrations, tests, evidence and patient/provider UI before deciding what is missing.

## Non-negotiable founder decisions

- Launch market: Saudi Arabia.
- Patient product is free; no booking fee to the patient.
- Core monetization remains B2B SaaS, integrations and enterprise capabilities.
- Arabic is first-class RTL. Existing English/French/German/Spanish architecture remains supported.
- V1 centers on doctors/practitioners, clinics/hospitals/facilities, specialties, subspecialties, services/procedures and nearby care.
- Search must support `All | Doctors | Clinics & Hospitals` while the internal graph remains broader than those display labels.
- Practitioner identity is independent from facility identity; `PractitionerRole` models workplace/location relationships.
- One practitioner may work in two or more clinics/hospitals simultaneously.
- Doctor reputation and facility reputation are independent first-class trust objects. A legitimate `Doctor 4.9 / Facility 2.2` outcome must be representable.
- Insurance is scoped by payer/network + branch + service + practitioner role + validity/evidence/freshness, never a global provider boolean.
- Branch-aware phone, booking phone, official WhatsApp, website, directions and truthful booking/request/call/redirect routes are first-class access actions.
- Clinic Portal V1 is a provider-data operating surface for claim/onboarding, branches, media, contacts, roster, specialties, services, practitioner profile data, insurance, freshness, review replies and discovery analytics.
- Material provider-managed public data uses recurring freshness/attestation rules, with a 30-day target for high-change fields unless a better authoritative source exists.
- AI is healthcare navigation, not autonomous diagnosis/treatment.
- **AI may interpret, navigate, explain and propose; structured Zyara systems own facts and actions.**
- Voice uses the same intent/safety/search/ranking/tool pipeline as text.
- Verified/attendance-linked reviews are preferred over open anonymous reviews.
- Providers cannot delete compliant negative reviews merely because they are negative.
- Paid status must never improve organic ranking.
- FHIR-aligned modeling, provenance, privacy, consent, tenant isolation, auditability and booking-authority safety remain binding.

## V1 patient jobs to preserve

The patient should be able to answer quickly:

- What care is near me?
- Which specialty/subspecialty/service is relevant to what I am trying to find?
- Which doctors are relevant?
- Which clinics/hospitals/facilities are relevant?
- How far away are they and what is the travel time when authoritative routing exists?
- Are they open now and what are their working hours?
- Which exact branch/service/practitioner role accepts my insurer/network?
- What is the doctor's reputation?
- What is the facility's reputation?
- Where does this doctor currently work?
- What education, qualifications, experience and languages does the doctor have, with evidence/freshness?
- What services and specialties does the facility offer?
- How recently were important facts confirmed?
- Can I call, WhatsApp, get directions, visit the website, request an appointment, or book?
- Why did Zyara show this result?

## Search and AI-era requirements

Plan for one coherent search/control plane covering:

- practitioner/doctor name;
- facility/organization/branch name;
- specialty and subspecialty;
- service/procedure;
- common patient care-language intent;
- insurer/network;
- city/district/location;
- Arabic formal/common terms;
- English terms;
- transliterations;
- abbreviations;
- common misspellings;
- natural-language multi-constraint search;
- conversational refinement;
- voice input.

Examples such as `عظام`, `دكتور ركبة`, `ortho`, `dentist`, `MRI`, `Dr Ahmed`, or `أبي دكتور عظام قريب مني ويقبل بوبا ويفتح بعد 6` must resolve into structured navigation/search state without turning Zyara into a diagnostic system.

Voice must remain first-class and must preserve Arabic/Saudi Arabic, Arabic-English code switching, deliberate microphone capture, low-confidence correction, critical-entity confirmation, ASR provenance, privacy-preserving retention policy and deterministic text/manual fallback.

## V1 scope boundary

Required or staged V1 capability families include:

- provider/facility graph;
- doctor/practitioner profiles;
- clinic/hospital/facility profiles;
- specialty/subspecialty browsing;
- service/procedure discovery;
- map/list parity;
- nearby care;
- truthful distance/travel-time handling;
- open-now and working hours;
- branch-aware phone/WhatsApp/directions/website;
- multi-location practitioners;
- contextual insurance visibility;
- independent doctor/facility reputation;
- verified-review loop;
- claim/correction;
- Clinic Portal V1;
- monthly freshness attestation;
- provider discovery analytics event foundation;
- natural-language AI search;
- explainable match reasons;
- staged voice discovery;
- truthful booking/request/call/redirect modes.

Do not make these V1 discovery blockers merely for feature parity: full EHR/HIS replacement, broad clinical records, prescribing, claims/revenue cycle, broad payments, complete practice-management OS, large intake/forms suite, full patient messaging, mobile check-in/queue, full telehealth, AI phone receptionist, consultation documentation copilot, or unrestricted autonomous agents.

Preserve clean future seams for strong later features from Doctolib, Zocdoc, Healthgrades, Vezeeta, NexHealth, Solv, Tebra and other relevant products.

## Competitor research directive

Use the current competitor synthesis as the baseline, then perform additional fresh research only where it materially improves a Zyara decision.

You have freedom to challenge the current plan, add relevant sources, simplify overdesigned areas, or propose a stronger architecture when evidence justifies it.

Do not copy competitor trade dress or proprietary implementation. Do not pursue feature-count parity. Every adopted capability must solve a concrete Zyara patient/provider job.

Classify competitor patterns as:

```text
ALREADY_IMPLEMENTED
V1_REQUIRED
V1_OPTIONAL
V2
V3_PLUS
REJECT
```

## Required planning outputs

Before this Astro pass can finish, produce repository-native canonical artifacts covering:

1. **Live repository audit** — exact SHA/PRs/canonical authority/current implementation/migrations/tests/evidence.
2. **Existing-work preservation matrix** — classify every major V1 capability as `PROVEN_COMPLETE`, `PRESENT_NEEDS_ADAPTATION`, `PARTIAL`, `MISSING`, `DEFERRED_EXTERNAL_VALIDATION`, or `NOT_V1`.
3. **Revised V1 product requirements** — patient journeys, provider journeys, entity/profile contracts, search behavior, reviews, contacts, freshness, AI/voice and explicit exclusions.
4. **Minimum data-model delta** — branch-aware contacts, media, practitioner education/qualification/experience evidence, taxonomy, freshness/attestation, independent practitioner/facility reviews and search projections while preserving correct existing FHIR/domain models.
5. **Search/ranking contract** — intent classes, entity types, taxonomy/aliases, Arabic normalization/transliteration, filters, sort modes, `All/Doctors/Clinics & Hospitals`, explainability, zero-result handling, stale/unknown handling, AI parser contract and voice-to-search contract.
6. **Review/trust redesign** — separate practitioner/facility reputation while preserving eligibility, moderation, appeals, replies, privacy, low-count safeguards and historical workplace behavior.
7. **Clinic Portal V1 plan** — roles/permissions, claim flow, branch data, contacts, media, roster, specialties, services, insurance, monthly attestation, review replies, analytics and audit.
8. **AI/voice V1 plan** — text-first quality gate, voice gate, conversational refinement, structured intent state, model/ASR abstraction, Saudi Arabic/code-switch evaluation, explainability, failure/abstention/fallback and future phone/provider-copilot seams.
9. **Competitor adoption matrix** — adopt/defer/reject with reasons.
10. **Dependency-ordered roadmap** — phases -> slices -> tasks -> gates.
11. **Task contracts** — purpose, exact scope, dependencies, allowed surfaces/modules, non-goals, migration/privacy impact, tests, evidence, rollback/recovery and completion criteria.
12. **Implementation handoff** — a final prompt for the next implementation agent that starts from exact live truth and follows the new dependency graph without rediscovering the product thesis.

Do not leave any of these as local-only output.

## Repository workflow

- Work on a dedicated planning branch.
- Keep repository/GitHub-facing text in English.
- Preserve existing canonical documents unless superseding them deliberately and documenting why.
- Update task/evidence documents together when they represent the same contract.
- Do not modify production code merely to make the plan look complete.
- Run all relevant docs/planning validation and repository checks available to the branch.
- Open a PR with a precise summary of canonical changes and evidence.
- Merge only when the repository's real required gates are green and no unresolved review blocks the planning change.

## Evidence boundary

Keep these dimensions separate:

```text
REPOSITORY_IMPLEMENTATION
SYNTHETIC_QUALIFICATION
REAL_PROVIDER_VALIDATION
REAL_PATIENT_PILOT_VALIDATION
COMMERCIAL_VALIDATION
PRODUCTION_AUTHORIZATION
```

Repository planning or implementation cannot establish real clinic recruitment, real provider verification, production dataset rights, live insurer contracts, real patient reviews, commercial willingness to pay, legal clearance, or production authorization without evidence.

## Completion gate

Use `docs/research/ZYARA_V1_PLANNING_COMPLETION_CHECKLIST_2026-09-16.md` as the quality gate.

Do not declare completion until every required planning item is complete, internally consistent, repository-native and live-truth grounded.

Final completion marker:

```text
ZYARA_V1_PLAN_COMPLETE = YES
```

The final report must include:

- exact starting `main` SHA;
- exact planning branch and planning HEAD SHA;
- canonical artifacts created/updated;
- validation/CI results actually observed;
- unresolved external gates;
- explicit preservation/adaptation summary;
- the first implementation task identifier;
- the exact implementation handoff file/prompt.
