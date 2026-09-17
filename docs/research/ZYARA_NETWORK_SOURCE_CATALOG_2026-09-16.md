# Zyara Network Source Catalog

**Research date:** 2026-09-16
**Purpose:** give Astro a focused donor/reference set for the complete Zyara Network product.

> **AI-era expansion:** also read [`ZYARA_AI_ERA_SOURCE_MASTER_INDEX_2026-09-16.md`](ZYARA_AI_ERA_SOURCE_MASTER_INDEX_2026-09-16.md) for the expanded founder-owned/public automation, interoperability, workflow, communications, security and infrastructure source universe. For source-level donor analysis, also read [`ZYARA_QDRAT_DONOR_DEEP_DIVE_2026-09-17.md`](ZYARA_QDRAT_DONOR_DEEP_DIVE_2026-09-17.md) and [`ZYARA_BUZZ_DONOR_DEEP_DIVE_2026-09-17.md`](ZYARA_BUZZ_DONOR_DEEP_DIVE_2026-09-17.md).


## Source-use rule

The founder states that Zyara has permission to copy/use source from the explicitly supplied repositories below and from repositories in the founder's GitHub estate. That permission is a planning input, not a substitute for provenance discipline.

For every copied/adapted component Astro must still record:

- upstream repository and exact commit/tag;
- exact files/components used;
- founder authorization category/evidence location where private permission is relied upon;
- public license/file-header/NOTICE obligations that still apply;
- dependency/SBOM implications;
- security review;
- modifications;
- why reuse is better than a native implementation or stable dependency;
- patch/update/fork strategy.

Do not copy a platform wholesale because permission exists. Prefer stable boundaries and narrow adaptations.

Adoption vocabulary:

```text
REFERENCE_ONLY
PATTERN_REIMPLEMENTED
DEPENDENCY_CANDIDATE
ADAPTED_DERIVATIVE_CANDIDATE
COPIED_COMPONENT_CANDIDATE
INTEGRATION_CANDIDATE
ENGINEERING_ONLY
```

All `*_CANDIDATE` modes require Astro's exact-source qualification before implementation.

## A. Founder-supplied real-time / meeting sources

| Source | Best Zyara use | Initial mode |
|---|---|---|
| [bilawalsidhu/gods-eye-view](https://github.com/bilawalsidhu/gods-eye-view) | Real-time map/layer architecture, entity selection, serialized/shareable scene state, contextual voice-to-tool interaction. Useful for network/map operations and AI-map UX; reject military/spy visual language. | PATTERN_REIMPLEMENTED / selective component review |
| [openimsdk/openmeeting](https://github.com/openimsdk/openmeeting) | Flutter meeting component/server patterns for mobile video-room UX and theming/localization. | ADAPTED_DERIVATIVE_CANDIDATE after license/security pin |
| [suitenumerique/meet](https://github.com/suitenumerique/meet) | Browser-first secure meetings on LiveKit, large rooms, multiple screen shares, non-persistent chat, recording/transcription, telephony, authentication/access control, customization and self-hosting. Strong Zyara Connect reference. | ADAPTED_DERIVATIVE_CANDIDATE / DEPENDENCY_CANDIDATE |
| [jitsi/jitsi-meet](https://github.com/jitsi/jitsi-meet) | Mature WebRTC meeting UX, web/mobile SDK patterns, content sharing, chat, reactions/polls, background effects, E2EE and deployment patterns. | REFERENCE_ONLY or INTEGRATION_CANDIDATE |
| [bigbluebutton/bigbluebutton](https://github.com/bigbluebutton/bigbluebutton) | Group care, patient education, multidisciplinary case conferences, breakout rooms, polls, whiteboard, shared notes, recording/playback and session analytics. | REFERENCE_ONLY / group-care component study |
| [nextcloud/talk-desktop](https://github.com/nextcloud/talk-desktop) | Desktop/background call-client patterns, tray lifecycle and cross-platform packaging. Useful if Zyara Doctor/Clinic later needs a dedicated desktop communications client. | REFERENCE_ONLY / ADAPTED_DERIVATIVE_CANDIDATE |
| [livekit/livekit](https://github.com/livekit/livekit) | Real-time media server/infrastructure candidate; Suite Meet already demonstrates this architecture. Keep clinical state outside the media engine. | DEPENDENCY_CANDIDATE |
| [block/buzz](https://github.com/block/buzz) | Human-agent workspace, scoped identities, operational event/activity streams, workflow approval patterns, search, tenant isolation and tamper-evident audit concepts. Not a healthcare source-of-truth model. | SELECTIVE ADAPTATION / REFERENCE CANDIDATE |

### Zyara Connect source decision Astro must make

Do not combine several WebRTC stacks into one runtime. Astro must choose a primary media strategy after evaluating:

- self-hosting/region/data residency;
- encryption and authentication model;
- mobile/web SDK quality;
- reconnect/network adaptation;
- recording/transcription controls;
- observability without PHI leakage;
- telephony needs;
- upgrade/security cadence;
- license/provenance;
- total operating complexity.

Jitsi, LiveKit/Suite Meet and OpenMeeting are competing implementation lanes, not features to stack blindly.

## B. Best sources in the founder's GitHub estate

The GitHub search of founder-owned repositories identified these as materially useful to Zyara Network.

| Repository | Reusable knowledge/capability | Boundary |
|---|---|---|
| [TheHalfMoon/Zyara](https://github.com/TheHalfMoon/Zyara) | Primary authority: healthcare graph, scheduling, provider platform, FHIR model, reviews, privacy/security, AI/voice, analytics and current implementation. | Preserve correct existing work; Zyara owns product semantics. |
| [TheHalfMoon/MedScale](https://github.com/TheHalfMoon/MedScale) | FHIR/SMART interoperability patterns, local/privacy-first medical data architecture, provenance/source handling and bounded healthcare interfaces. | Reference/selected adaptation only; MedScale does not own Zyara clinical truth. |
| [TheHalfMoon/MESC](https://github.com/TheHalfMoon/MESC) | FHIR canonicalization/validation, synthetic clinical fixtures and interoperability evidence patterns. | Research/validation reference; do not couple product runtime to research governance. |
| [TheHalfMoon/commandMed](https://github.com/TheHalfMoon/commandMed) | Medical AI safety, Arabic/English medical intelligence evaluation, evidence/tool separation, deterministic safety checks and abstention/escalation patterns. | Research only until separately qualified; never use it as autonomous prescribing/diagnosis authority. |
| [TheHalfMoon/Himsat](https://github.com/TheHalfMoon/Himsat) | Local-first audio capture, transcription, diarization, source-linked summaries, document intelligence and portable context. Strong reference for ambient visit capture/consultation intelligence. | Recording/transcription requires explicit healthcare consent/privacy design. |
| [TheHalfMoon/Wispral](https://github.com/TheHalfMoon/Wispral) | Voice control semantics, interruption/cancellation, ambiguity/provenance, structured session state and local-first voice architecture. | Reference for Zyara voice/phone UX, not direct medical authority. |
| [TheHalfMoon/Qdrat](https://github.com/TheHalfMoon/Qdrat) | Staff/workforce donor: org structure, shifts/leave, onboarding/offboarding, approvals, helpdesk/tasks, WhatsApp, notifications, reporting, audit and company scoping. Dedicated deep dive pins `e2d288940aab52af881786678b2fc86dfa5c272a`. | High-priority selective adaptation source for clinic workforce/admin; preserve healthcare identity/privilege authority and perform file-level Horilla/LGPL provenance review before copying. |
| [TheHalfMoon/Signthos](https://github.com/TheHalfMoon/Signthos) | Document workflow, PDF and e-signature planning; upstream Documenso/Stirling-PDF research. | Useful for intake/consent/admin signatures and document operations. |
| [TheHalfMoon/Sentrdel](https://github.com/TheHalfMoon/Sentrdel) | Cross-layer authorization invariants, security evidence/control-plane patterns, local-first policy and explicit coverage gaps. | Engineering/security reference for tenant isolation and sensitive operations. |
| [TheHalfMoon/Golam](https://github.com/TheHalfMoon/Golam) | Local-first agent OS, model/tool/memory/policy separation. | Later provider/patient agent architecture reference only. |
| [TheHalfMoon/Kodac](https://github.com/TheHalfMoon/Kodac) | Tool authority, receipts, provenance, bounded agents and evidence-oriented execution; historical FHIR bridge experiments exist but are not current authority. | Engineering/agent governance; do not adopt historical components without fresh qualification. |
| [TheHalfMoon/Winds](https://github.com/TheHalfMoon/Winds) | Independent exact-candidate verification, execution/evidence ledger and platform-aware verification patterns. | ENGINEERING_ONLY. |
| [TheHalfMoon/Ascout](https://github.com/TheHalfMoon/Ascout) | Changed-code verification receipts and explicit distinction between passed/failed/not-run evidence. | ENGINEERING_ONLY. |
| [TheHalfMoon/SpecGrain](https://github.com/TheHalfMoon/SpecGrain) | Recursive decomposition and bounded work-packet discipline. | Planning/decomposition method, not patient runtime. |
| [TheHalfMoon/Diffcipline](https://github.com/TheHalfMoon/Diffcipline) | Challenge/minimize/change/prove execution discipline. | Planning/verification method. |

## C. High-value external healthcare/platform sources discovered for Astro

These are newly emphasized candidates. Founder permission was **not** asserted for this group unless separately documented; use public-license/reference rights only and qualify exact license before reuse.

| Source | What it contributes | Initial mode |
|---|---|---|
| [openemr/openemr](https://github.com/openemr/openemr) | Full EHR + medical practice management, scheduling, electronic billing, internationalization and FHIR/API surface. Excellent whole-clinic workflow comparator. GPL code means architecture/license review is mandatory before code reuse. | REFERENCE_ONLY first |
| [medplum/medplum](https://github.com/medplum/medplum) | FHIR-first CDR, OAuth/OIDC/SMART-on-FHIR auth, FHIR API/SDK, bots/workflows and healthcare React components. Apache-2.0 in inspected README. | DEPENDENCY/ADAPTATION CANDIDATE |
| [openmrs/openmrs-core](https://github.com/openmrs/openmrs-core) | Mature modular patient-based EMR domain and extension architecture. Useful for longitudinal record/encounter/module semantics. | REFERENCE_ONLY |
| [Bahmni/bahmni-core](https://github.com/Bahmni/bahmni-core) | OpenMRS-based clinical-system integration patterns; useful as broader hospital/clinic workflow reference. | REFERENCE_ONLY |
| [novuhq/novu](https://github.com/novuhq/novu) | Unified notification/conversation infrastructure for in-app, email, SMS, push and chat; workflow branching, digests, preferences and bidirectional agent/channel model including WhatsApp. | DEPENDENCY/ADAPTATION CANDIDATE after license/data review |
| [chatwoot/chatwoot](https://github.com/chatwoot/chatwoot) | Omnichannel inbox across web chat, email, WhatsApp, SMS and social; assignments, notes, teams, automation, reports. MIT in inspected README. Strong unified clinic inbox reference. | PATTERN_REIMPLEMENTED / selective adaptation candidate |
| [calcom/cal.diy](https://github.com/calcom/cal.diy) | Generic scheduling UX, booking interactions and integration patterns. Current README says MIT and warns community edition is not intended as commercial production infrastructure. | REFERENCE_ONLY |
| [OHIF/Viewers](https://github.com/OHIF/Viewers) | DICOMweb medical imaging viewer with 2D/3D, reports, segmentation, PDF/video/microscopy/ECG and extension model. MIT in inspected README. | INTEGRATION_CANDIDATE |
| [DIGI-UW/OpenELIS-Global-2](https://github.com/DIGI-UW/OpenELIS-Global-2) | Laboratory information-system domain and lab workflow reference. | REFERENCE/INTEGRATION CANDIDATE |
| [documenso/documenso](https://github.com/documenso/documenso) | Electronic-signature workflow patterns, already tracked through Zyara source research/Signthos. | REFERENCE_ONLY until exact component/license qualification |
| [postgis/postgis](https://github.com/postgis/postgis) | Geospatial extension already present in Zyara source qualification. | DEPENDENCY_CANDIDATE |
| [keycloak/keycloak](https://github.com/keycloak/keycloak) | OIDC/identity server candidate already present in Zyara source qualification. | DEPENDENCY_CANDIDATE |
| [synthetichealth/synthea](https://github.com/synthetichealth/synthea) | Synthetic patient data/fixtures already present in Zyara source qualification. | DEVELOPMENT_DEPENDENCY_CANDIDATE |

## D. Commercial feature-reference set

Astro must research current official documentation for these products to establish product-pattern parity/gaps; proprietary implementation is reference-only:

- Doctolib;
- Epic / MyChart;
- athenahealth;
- Tebra;
- NexHealth;
- Phreesia;
- Elation Health;
- Zocdoc;
- Healthgrades;
- Vezeeta;
- Solv;
- One Medical where relevant.

The goal is not feature-count cloning. Astro must map each feature to a concrete Zyara patient, clinician or clinic job.

## E. Strong patterns already verified in current source research

### Real-time / telehealth

- Suite Meet demonstrates an authenticated, self-hostable LiveKit-based meeting product with large-room, screen-share, chat, recording/transcription and telephony patterns.
- Jitsi demonstrates mature cross-platform WebRTC product/SDK patterns.
- BigBlueButton demonstrates group-session/poll/whiteboard/breakout/recording patterns valuable for group care and education.
- Nextcloud Talk Desktop demonstrates desktop call-client lifecycle patterns.

### Healthcare core

- OpenEMR is a direct whole-clinic comparator for EHR + practice management + scheduling + billing.
- Medplum is a strong modern FHIR infrastructure reference for CDR/API/auth rather than a clinic product template.
- OpenMRS is useful for mature longitudinal EMR domain/module semantics.
- OHIF is a better specialized imaging surface than inventing a medical viewer.
- OpenELIS is a lab-domain reference; Zyara should normally integrate with authoritative lab systems rather than become a lab analyzer/LIS by accident.

### Communications

- Novu is a strong notification orchestration candidate for email/SMS/push/chat/preferences/workflows.
- Chatwoot is a strong unified-inbox/agent-assignment reference for clinic communications.
- These solve different problems: notification orchestration vs human conversation operations. Astro may use both patterns behind a shared Zyara Connect domain contract rather than choosing one to do everything.

## F. Source architecture principle

Astro should prefer the following hierarchy:

```text
Official standard / regulator interface
    > stable qualified dependency or service
        > narrow adapted component
            > pattern reimplementation
                > wholesale platform fork
```

Exceptions require evidence that the broader reuse actually lowers lifecycle risk.

## G. Required Astro source-adoption output

For every source materially considered, Astro must produce a matrix with:

- exact source/revision;
- target Zyara subsystem;
- capability sought;
- `REFERENCE / DEPENDENCY / ADAPT / COPY / REJECT` decision;
- license/provenance status;
- security/data-residency impact;
- transitive dependency impact;
- upgrade strategy;
- interface boundary;
- why this is better than native implementation;
- proof required before canonical admission.

No source is canonical merely because it appears in this catalog.
