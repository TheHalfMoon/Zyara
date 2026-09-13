# Zyara

**Zyara is the healthcare discovery, navigation, booking, trust, and patient-journey platform.**

The product thesis is simple:

> When you need healthcare, start with Zyara.

Zyara is not intended to be a Doctolib clone or a doctor directory. It combines the strongest ideas from healthcare discovery, maps, booking marketplaces, verified reviews, patient health timelines, provider analytics, and AI navigation into one platform.

## Working brand

**Working name:** `Zyara`

Preferred positioning:

- English: **Zyara — Find the right care.**
- Arabic: **زيارة — صحتك تبدأ من هنا.**

`Zyara` is a working brand only. Current products already use Zyara/Ziara/Ziyara in scheduling and health contexts. Trademark, company-name, app-store, social-handle, and domain clearance is a pre-launch gate. See `docs/VISION.md`.

## Founder constraints

- Patients use Zyara for free.
- No patient booking fee.
- Zyara does not process the clinical consultation payment in the core model.
- Revenue comes from provider/facility subscriptions, integrations, and enterprise software.
- Saudi Arabia is the launch market; the architecture must support international expansion.
- First-class languages: Arabic, English, French, German, Spanish.
- Arabic must be native RTL, not an afterthought.
- Reviews should be tied to verified patient encounters whenever possible.
- AI recommends appropriate care pathways/providers; it must not present itself as a doctor or autonomously diagnose/treat.
- Voice is a first-class patient input surface and should support privacy-preserving local transcription where practical.
- Agent/tool execution must be sandboxed and least-privilege; unrestricted agents must never become a shortcut around clinical safety or health-data authorization.
- Health data requires consent, provenance, strict access control, auditability, and Saudi PDPL-aware design.

## Canonical execution plan

The converged planning set is in [`docs/canonical/`](docs/canonical/README.md). Start with the [master build plan](docs/canonical/ZYARA_CANONICAL_BUILD_PLAN.md), then the [Muse execution handoff](docs/canonical/ZYARA_MUSE_EXECUTION_HANDOFF.md). It contains 13 canonical plans, 26 architecture decisions, 12 phases, 24 slices and 60 task contracts. The [research evidence](docs/research/README.md) covers 44 product/platform entries, 61 feature dimensions and 115 source entries, including SpecGrain.

This repository remains a planning repository: no product implementation or product-test success is claimed. Canonical decisions supersede older implementation suggestions while preserving the founder constraints and source-authorization record below.

## Founder foundation documents

Read in this order:

1. [`ASTRO.md`](ASTRO.md) — implementation-planning brief for Astro/agents.
2. [`docs/VISION.md`](docs/VISION.md) — product thesis, users, principles, scope.
3. [`docs/PRODUCT.md`](docs/PRODUCT.md) — product requirements and feature system.
4. [`docs/COMPETITORS.md`](docs/COMPETITORS.md) — competitor landscape and differentiation.
5. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — platform architecture and boundaries.
6. [`docs/AI_SEARCH_TRUST.md`](docs/AI_SEARCH_TRUST.md) — AI, search, ranking, reviews, safety.
7. [`docs/PROVIDER_BUSINESS.md`](docs/PROVIDER_BUSINESS.md) — provider portal, analytics, pricing model.
8. [`docs/PRIVACY_INTEROP.md`](docs/PRIVACY_INTEROP.md) — privacy, security, FHIR/interoperability.
9. [`docs/VOICE_AGENT_RUNTIME.md`](docs/VOICE_AGENT_RUNTIME.md) — voice/ASR, RAG, agent orchestration, sandbox execution and safety boundaries.
10. [`docs/ROADMAP.md`](docs/ROADMAP.md) — dependency-ordered delivery plan and gates.
11. [`docs/SOURCES.md`](docs/SOURCES.md) — 90-source donor/reference landscape plus healthcare-native additions.

## Product surfaces

### Patient

- Universal healthcare search
- Health map
- Provider/facility profiles
- AI text/voice navigation
- Privacy-aware local or approved-cloud voice transcription
- Insurance-aware discovery
- Real-time or request-based booking
- Verified reviews
- Appointments and reminders
- Patient health timeline
- Medication and follow-up reminders
- Family/dependent management
- Documents, labs, imaging references, referrals
- Multilingual experience

### Provider

- Facility and practitioner onboarding/verification
- Multi-branch profiles
- Services, specialties, insurance networks, schedules
- Booking and waitlist management
- Notifications
- Review responses and disputes
- Search/discovery analytics
- Demand, conversion, no-show, availability and reputation analytics
- Monthly reports
- HIS/EHR/PMS/calendar integrations
- Enterprise roles, audit, SSO and API access
- Permissioned provider/admin copilots where they create measurable operational value

## Product principle

Zyara should become the **healthcare discovery network** between patients and every healthcare provider, not a closed scheduling silo.

The first defensible wedge is:

**Search + Map + AI Navigation + Trust**

Voice reduces friction. Booking creates conversion. Patient history creates retention. Provider analytics and integrations create revenue and switching costs. Sandboxed automation can improve operations without becoming a backdoor around healthcare safety or privacy controls.
