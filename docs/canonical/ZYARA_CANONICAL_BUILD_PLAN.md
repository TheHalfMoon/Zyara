# Zyara canonical build plan

Canonical planning baseline: 2026-09-13. Repository base: **0c4d47bc61fabc3c4a657d44cb8c0f83156af744**. Planning branch: codex/astro-canonical-plan. This is a research and execution plan; no product implementation or live clinical validation is claimed.

## Product decision

Build a Saudi-first healthcare discovery and access network. The first defensible product is a continuously corrected provider/service graph, useful multilingual search/map, honest booking and changes, attendance-linked trust, and provider operating value. AI and voice become safer and more useful when those facts and commands are already reliable.

Preserve the founder's constraints: free patients; no booking fees or commissions; consultation payment handled by providers; subscriptions/integrations/enterprise operations fund Zyara; organic relevance independent of payment; Arabic RTL plus English/French/German/Spanish first-class; privacy/provenance/authorization and early FHIR alignment; AI navigation without autonomous diagnosis/treatment.

Research reviewed **44 product/platform entries**, **61 feature dimensions** and **115 source entries**, including 17 new candidates. Current public evidence and historical/unknown cases are distinguished in the supporting documents. These counts do not mean 44 authenticated workflow trials or 115 exhaustive security audits. The user-suggested SpecGrain contributes bounded task/evidence methodology, with a pinned source review and optional tooling decision.

## Authority and document map

This canonical set supersedes older implementation proposals/phase ladders when they conflict. Original founder constraints and source-authorization statement remain authoritative. Original documents in docs/ are preserved as the founder foundation; the live repository audit records exactly what was read. Task JSON and handoff Markdown describe the same task contracts; update them together. Scheduling owns lifecycle/authority semantics, data owns FHIR mapping, privacy owns launch data gates, roadmap owns phase numbering.

| Document | Responsibility |
|---|---|
| [Competitor intelligence](ZYARA_COMPETITOR_INTELLIGENCE.md) | Current evidence, regional scope, 44×61 matrix and adoption treatment |
| [Appointment system](ZYARA_APPOINTMENT_SYSTEM_PLAN.md) | Service/resources/rules, lifecycle, atomicity, modes, adapters, waitlist, recall and failure behavior |
| [Product requirements](ZYARA_PRODUCT_REQUIREMENTS.md) | Personas, R01–R20, booking/review requirements and scope |
| [Architecture](ZYARA_ARCHITECTURE_PLAN.md) | Module/data ownership, stack, API/events and 26 ADR decisions |
| [Data and FHIR](ZYARA_DATA_AND_FHIR_MODEL.md) | IDs, graph/provenance, trust zones, resource/status mappings and clinical boundary |
| [AI/search/voice](ZYARA_AI_SEARCH_VOICE_PLAN.md) | Multilingual intent, rank policy, safe typed tools, confirmation and ASR gates |
| [Provider platform](ZYARA_PROVIDER_PLATFORM_PLAN.md) | Onboarding, calendar, SaaS, metric definitions and ROI |
| [Privacy/security](ZYARA_PRIVACY_SECURITY_COMPLIANCE_PLAN.md) | Saudi evidence, controls, lawful processing and legal/clinical gates |
| [Source qualification](ZYARA_SOURCE_QUALIFICATION.md) | 115 dispositions/pins, license evidence and exact reuse policy |
| [Test and evidence](ZYARA_TEST_AND_EVIDENCE_PLAN.md) | Synthetic proofs, failure/race corpus, SLO targets and release evidence |
| [Roadmap](ZYARA_ROADMAP.md) | 12 phases, 24 slices, pilot proof and release ordering |
| [Muse execution handoff](ZYARA_MUSE_EXECUTION_HANDOFF.md) | 60 task contracts, dependency graph, acceptance/recovery/evidence; start M001 |

## Research-driven changes to the founder foundation

1. Graph quality, native booking correctness and attendance evidence precede generative navigation. Existing competitors already advertise AI and broad patient portals; “AI + map” alone is not established differentiation.
2. Model multi-resource allocation immediately, validate specialty complexity later. A generic calendar fork cannot establish healthcare eligibility, shared equipment or clinical prerequisites.
3. Replace one integration “level” with explicit authority plus capability vector. Clinical FHIR read access, SIU notifications and calendar sync do not establish write booking rights or atomicity.
4. Preserve unknown outcomes. External timeout cannot safely mean “failed”; cancel-first reschedule is not universally safe.
5. Protect trust from provider suppression. Attendance attestation is useful but review eligibility needs an independent dispute route.
6. Treat family/dependent access as early identity architecture and limited pilot workflow; separately gate sensitive clinical sharing.
7. Separate descriptive metric reporting from causal ROI claims. Require actual paid commitments and support economics before growth.
8. Use a narrow dependency set and native healthcare logic. The 90-source authorization does not justify importing whole ERP/EHR/agent platforms.
9. Adopt SpecGrain's bounded work/evidence principles without making an Alpha delivery tool a runtime requirement or pretending its CLI verifies this plan.

## Moat hypothesis and validation

Commodity: calendars, reminders, basic directory/search, forms, generic telehealth links, web embeds, basic reports and conversational UI. Their quality matters, but they are not by themselves a moat.

Compounding assets: rights-cleared and continuously corrected service/role/branch/insurance graph; evidence freshness and correction operations; certified adapter capabilities and reconciliation knowledge; explicit service resource/rule templates approved by providers; independently governed attendance/review evidence; and privacy-preserving operations outcomes. Proprietary strength should arise from trustworthy maintenance and workflow execution, not exclusive possession of patient PHI.

Compounding workflow: need → suitable verified service → eligible availability → authoritative booking → easy changes → attendance → review/recall → provider action. Patient continuity improves relevance only with permission. Provider-neutral access needs sustainable supply participation and adequate density; these are business risks to validate, not technical inevitabilities.

## Architecture convergence

TypeScript Next.js/React + Fastify modular monolith, separate worker, PostgreSQL/PostGIS truth, versioned contracts and audit/outbox/inbox. OpenSearch is the benchmark-gated projection candidate with explicit PG fallback; MapLibre is renderer, not data rights. OIDC identity candidate Keycloak; domain authorization plus RLS; fine-grained relationship engine only when justified. pg-boss wakes durable work; no initial microservice/event-streaming platform.

Native scheduling uses hybrid candidate windows and dynamic rule checks; finite capacity units, ordered row locks and range exclusions protect holds/bookings atomically. All services use the same command path. FHIR R4 boundary first, R5 separately mapped. External writes use durable operations with explicit unknown state and reconciliation; no distributed transaction guarantee across unrelated hospitals.

AI/voice share deterministic identity, safety, search, eligibility and confirmation. No model invents provider facts or booking outcomes. Clinical timeline is later and separately authorized. Saudi-region infrastructure is a planning preference with actual contracts/transfer review pending, not an unsupported legal residency assertion.

## First launch and expansion boundaries

Proposed pilot: Al Olaya/Riyadh catchment, 10–20 clinics, a small approved adult outpatient service mix, native calendar plus honest request/call/redirect options. Prove actual attendance/review/report loop and willingness to pay; do not wait for full hospital records. Arabic/English field testing receives priority while all five first-class locale paths are complete and human-reviewed.

MVP includes correct concurrency, identity/tenant controls, safe changes, contact/consent, verification and audit. “Minimum” limits service/configuration breadth, not safety. Waitlist/recall, certified two-way integrations, generative AI/voice, complex specialties, clinical timeline and international enablement each have their own evidence gate.

## Thirty explicit convergence answers

| # | Question | Converged answer |
|---|---|---|
| 1 | Why use Zyara instead of Google? | Hypothesis: it resolves a healthcare need into a verified branch/service, eligible time and reliable booking with transparent evidence. Google remains a strong discovery channel; measure task success and preference locally rather than assert superiority. |
| 2 | Why instead of Sehhaty? | Complement national services with cross-provider private/participating supply and operations continuity. Sehhaty already offers free booking/family functions; Zyara must prove useful additional choice, not duplicate it. |
| 3 | Why instead of Vezeeta? | Demonstrate better local service/insurance specificity, fresh authority, transparent trust and reliable changes. These are measurable hypotheses, not claims that Vezeeta lacks those features. |
| 4 | Why instead of a hospital app? | Compare care across organizations and retain permitted access history. Once a hospital is chosen, its app may remain the best clinical portal; integrate/handoff instead of requiring its replacement. |
| 5 | Why will a clinic pay monthly? | Calendar/request efficiency, reliable reminders/refill/recall, reconciled integrations, correction operations and honest monthly reports; validate staff time/cost and paid renewal, without promising rank boosts. |
| 6 | Why will a hospital integrate? | Qualified demand and completed referral/access workflows across channels, with HIS authority, limited data sharing and measurable conversion/operating burden. Contracts and integration economics must justify participation. |
| 7 | How is provider data accurate? | Rights-cleared sources plus provider submissions, SCFHS/facility evidence where lawfully usable, branch/service privilege checks, dated assertions, human conflict review and recurring revalidation. |
| 8 | How is availability accurate? | Explicit owner/capabilities, TTL and source timestamps, event/poll repair, native ledger, dynamic check on hold/book; stale or weak sources downgrade to request/call. |
| 9 | How prevent double booking? | Native range constraints, finite units, ordered locks and idempotency; external writes require authoritative conflict enforcement or lower booking mode. No global guarantee across independent systems is fabricated. |
| 10 | Hospitals with no modern API? | Negotiated SIU/middleware, approved REST/vendor adapters, busy calendars and validated CSV/SFTP where necessary; request/call/redirect until safe write semantics exist. |
| 11 | Safe AI navigation? | Reviewed intended use/safety policy, typed factual tools, uncertainty/abstention, urgent escalation, no treatment decisions and explicit challenge-bound action confirmation. |
| 12 | Real-patient reviews? | Internally verified identity plus attendance evidence; independent dispute path if provider marks no-show; public anonymity possible; no provider deletion of compliant negatives. |
| 13 | Ranking without pay-to-win? | Prohibited commercial inputs, explicit best/soonest/nearest sorts, documented factual relevance/freshness/preferences, review uncertainty and auditable policy versions. |
| 14 | Data moat? | Permissioned corrected graph, service/resource/rule knowledge, fresh source/adapter reliability and governed attendance evidence; not raw health-query or PHI accumulation. |
| 15 | Workflow moat? | Cross-provider discovery-to-authoritative-booking/change/attendance/recall loop, including reliable exception and reconciliation handling. |
| 16 | Better than generic calendar? | Patient/service eligibility, finite shared resources, clinical prerequisites, source authority, uncertain outcomes and consented continuity work; measured correctness matters more than feature count. |
| 17 | Doctor scheduling? | Active PractitionerRole/service/type, full interval and buffers, qualified resource/room allocation, patient rules and authorized booking. |
| 18 | Dental scheduling? | Dentist/hygienist plus chair/assistant and procedure-specific duration/cleanup; substitution consent and atomic resources. |
| 19 | Imaging scheduling? | Equipment/technician/room, validated order and provider screening/preparation; radiologist interpretation can be separate linked work. |
| 20 | Lab scheduling? | Lab service/order and collection window, phlebotomist/chair/capacity, approved preparation; no requirement that a doctor be primary actor. |
| 21 | Telehealth scheduling? | Approved clinician/service and session capacity with patient jurisdiction/consent, private link and readiness; provider clinical platform remains authoritative. |
| 22 | Home visits? | Team/vehicle/equipment, verified private address/radius, travel windows and staff dispatch; request-first until feasibility validated. |
| 23 | Fill cancellations? | Preference/eligibility matching, fair sequential offers, real hold if supported, expiry and authoritative acceptance; safely cancel later appointment only after replacement secured. |
| 24 | Follow-up/recall? | Clinician/order-originated plan with window, owner, consent/purpose, contact limits, stop conditions and completion evidence; no generated clinical interval. |
| 25 | Measurable ROI? | Reconciled funnel/attendance/capacity, staff minutes and provider-supplied cost/margin, baseline comparison and explicit missingness; paid commitment gate and no false causal attribution. |
| 26 | One geography without architecture compromise? | One operating catchment with country/zone/locale/identifier/role/service models from day one; reusable contracts, local regulatory gates and bounded expansion. |
| 27 | What not yet? | Full EHR/HIS, prescribing, consultation payments/claims engine, theatre optimization, autonomous clinical agents, broad clinical imports and country rollout before evidence. |
| 28 | Which donors contribute code? | Narrow versioned dependencies/services (PostGIS, OIDC candidate, telemetry, search candidate, MapLibre, pg-boss) and synthetic/validator dev tools after qualification. Zero copied platform modules approved; scheduling donors are references. |
| 29 | What stays uniquely Zyara? | Healthcare graph assertion/governance, service eligibility/resource recipes, source-aware booking/reconciliation policy, trust/ranking governance, Saudi multilingual intent and provider value metrics. |
| 30 | What exactly first? | M001: reproducible synthetic TypeScript web/API/worker + PostgreSQL/PostGIS development foundation, readiness endpoint, locked qualified dependencies, CI/scope evidence and optional SpecGrain method decision. No patient feature before this baseline. |

Competitor facts supporting these hypotheses are cited in the intelligence matrix; standards/regulatory facts are cited in appointment/data/privacy plans. This table is the resulting strategy, not additional unsupported external market facts.

## Unresolved risks and closure ownership

Owner titles are responsibilities to assign, not invented staff. “Open” means the implementation/launch gate requires real evidence; it does not leave the design decision implicit.

| Risk / decision | Current status and default | Accountable owner / closure gate |
|---|---|---|
| K01 Brand/domain/trademark | Zyara working name; no clearance claimed | Founder/legal, before public launch M029 |
| K02 Pilot supply and patient demand | Riyadh catchment/cohort hypothesis; no recruited clinics claimed | Product/provider operations, M028/M030 |
| K03 Saudi lawful processing/retention/transfers | Synthetic-only until signed data flows, terms and schedules | Privacy/legal, M003/M029 |
| K04 Navigation/SaMD intended use | Clinical routing enabled only after reviewed classification/safety scope | Clinical safety/legal, M041 |
| K05 Credential/facility registry access | Public lookup is not bulk/API permission; manual lawful evidence fallback | Verification/legal, M008/M028 |
| K06 Insurance/network correctness | Acceptance assertion only; benefits/prior auth separately confirmed | Provider ops/payer integration, M009/M035 |
| K07 External API and identity access | No universal FHIR/NPHIES/Nafath rights assumed | Integration/legal, M036–M040/M052 |
| K08 False external confirmation | Outcome_unknown and no blind retries; downgrade unsupported partners | Scheduling/SRE, M037/M040 |
| K09 Guardian/sensitive care rules | Limited booking grants only when approved; clinical family gate later | Privacy/clinical, M017/M055 |
| K10 Search relevance/cost | OpenSearch candidate, measured PG fallback; no performance results yet | Search/platform, M010 |
| K11 Arabic safety/ASR accuracy | Dedicated dialect/entity corpus; text fallback | Clinical/voice, M041/M044/M045 |
| K12 Source licensing/security | 115 dispositions, selected pinned licenses; actual package SBOM/approval still needed | Engineering/legal, M001 and every adoption |
| K13 Map/terminology rights | Renderer does not grant dataset/tile/code redistribution rights | Data/legal, M007/M012/M052 |
| K14 Messaging cost/delivery/consent | Approved vendors/quiet hours and generic previews; no silent fallback | Operations/privacy, M020 |
| K15 Provider willingness to pay/support costs | No SAR prices or margins validated; accepted paid proposal gate | Commercial/product, M025/M030 |
| K16 Review fraud/suppression | Independent appeal and sales separation; moderation burden unmeasured | Trust operations, M021–M023/M030 |
| K17 Hosting/restore/on-call capacity | Saudi-region preference and proposed SLOs; vendor/service availability unverified | Platform/SRE, M003/M027 |
| K18 Complex service safety | Representable model, clinician-approved recipes and clinical review prerequisites | Specialty clinical owners, M046–M050 |
| K19 Timeline identity errors | Separate patient binding/consent and quarantine; no early full-chart import | Clinical interoperability, M051/M052 |
| K20 SpecGrain tool maturity | Method used; pinned Alpha source, optional tooling only | Engineering, M001 compatibility check |

## Completion meaning

Planning completion requires repository audit, fresh source/competitor evidence, explicit scheduling/state/resource/concurrency/integration/recall design, complete source dispositions, coherent requirements/ADRs, bounded MVP, executable task acceptance and documented open gates. It does not imply recruited clinics, paid contracts, legal clearance, passed product tests or production readiness.

See [repository audit](../research/REPOSITORY_AUDIT.md) and [planning validation](../research/PLANNING_VALIDATION.md) for actual checks. Muse should execute M001, record evidence, then choose dependency-ready work packets; it should not rediscover the product thesis or silently relax the launch gates.
