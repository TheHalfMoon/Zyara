# Zyara product requirements

Canonical 2026-09-13. Product owner. Requirement IDs remain stable across implementation. Phase gates are in [roadmap](ZYARA_ROADMAP.md); M-task references are in [handoff](ZYARA_MUSE_EXECUTION_HANDOFF.md).

## Outcome and pilot

Zyara helps a person identify suitable care, compare trustworthy nearby options, obtain an honestly confirmed appointment, change it easily and provide verified experience feedback. Clinics pay for useful scheduling and operating evidence. Patients pay Zyara nothing; clinical payments stay with providers. Organic ranking cannot consume subscription tier or commercial sales targets.

Pilot hypothesis: one Riyadh catchment, initially Al Olaya and adjacent reachable neighborhoods, 10–20 participating clinics and a small set of provider-approved adult outpatient services. This is a recruitment hypothesis, not a claim that supply is secured. Recruit at least two native-calendar practices and one external request-mode practice; no external instant booking without adapter certification. No national launch before local coverage, reliability, attendance evidence and paid operations value are demonstrated.

Arabic and English are primary field-validation cohorts; French, German and Spanish have complete navigation, booking, policy, error and notification catalogs with human review before public release. Five-language product support does not authorize clinical service delivery in five countries.

## Personas and unmet jobs

| Persona | Job and constraints | Requirement |
|---|---|---|
| Patient who does not know a specialty | Describe symptoms/need in ordinary language, compare safe service options | R01/R02; no diagnostic certainty |
| Patient selecting a known clinician | Find accurate branch, language, insurer and available time | R03/R04/R05 |
| Person with disability/low vision/low bandwidth | Use list without map, keyboard, readable labels and assisted path | R06 |
| Parent/guardian/caregiver | Book for another person with clearly bounded authority | R07; no shared family credential |
| Returning/chronic-care patient | Follow an actual clinician's window and retain continuity | R08 |
| Receptionist/call center | Resolve requests, conflicts, cancellations and check-in quickly | R09 |
| Practitioner/dentist/allied-health professional | Maintain real service hours and resource needs across branches | R10 |
| Clinic manager | Verify operational benefit without paying for organic rank | R11 |
| Hospital integration/operations lead | Preserve HIS truth, recover outages and measure demand conversion | R12 |
| Verification/trust operator | Correct graph and review disputes without commercial interference | R13 |
| Privacy/security/clinical safety lead | Enforce purpose, consent and safe navigation | R14 |

Additional contexts: shared phones, visitors/noncitizens, Arabic/English code switching, colloquial names, uncertain insurance product, missing referral, assisted booking, sensitive services and no smartphone. Do not infer identity or consent from a phone number shared by a household.

## Requirement system and acceptance

| ID | Required behavior / acceptance boundary | Primary owner |
|---|---|---|
| R01 Intent navigation | Text intent becomes explicit service/constraints with uncertainty; emergency workflow can interrupt; no invented provider facts | AI/search |
| R02 Multilingual search | Arabic, English, French, German, Spanish labels/aliases; Arabic diacritics/letter normalization and transliteration tested; original names retained | Search |
| R03 Provider graph | Organization/branch/role/service/insurance assertions with evidence and freshness; withdraw unsafe supply | Graph |
| R04 Search/map | Specialty, service, doctor, facility, distance, language, gender if supplied, accessibility, insurance; list/map synchronized with accessible alternative | Web |
| R05 Booking | Modes labeled before action; exact accepted details; authoritative confirmation; safe holds, cancel/reschedule and lost-network recovery | Scheduling |
| R06 Inclusive UX | WCAG 2.2 AA target, keyboard/screenreader, RTL/bidi, zoom, reduced motion, readable dates, accessible consent; no map-only action | Design |
| R07 Delegate care | Named patient and acting person shown; verified grant and scope before booking; revocation immediate; sensitive records excluded by default | Identity/privacy |
| R08 Continuity | Appointment history, clinician-originated follow-up, waitlist preferences; imported clinical timeline separately consented later | Access work |
| R09 Practice operations | Calendar/list, filters, requests, patient-safe status, blocks, resource availability, queues, bulk absence review, sync error handling | Provider |
| R10 Scheduling recipes | Service/type versions, durations/buffers, recurring rules, atomic units and explainable eligibility | Scheduling |
| R11 Provider value | Minimized monthly report with denominators, coverage and actionable operations; B2B entitlements with no rank input | Analytics |
| R12 Integration | Capability/authority contract, idempotent operations, uncertain outcomes, replay/reconciliation and disablement | Integration |
| R13 Trust | Credential scope, attendance-linked reviews, practitioner/facility dimensions, anonymous public display, independent appeal and no pay-to-delete | Trust |
| R14 Privacy/safety | Purpose-aware auth, tenant isolation, audit, retention, lawful vendor routing, human safety owner and synthetic testing | Security |
| R15 Communication | Locale/consent/timezone/quiet-hours templates; protected links; delivery never mutates booking truth | Communication |
| R16 Voice | Correctable transcription feeds same intent/tool pipeline; entity confirmation; no raw audio retention by default | Voice |
| R17 Provider onboarding | Collect complete graph and scheduling fields; publish readiness as blockers, not just a vanity score | Provider |
| R18 Business access | Free patient use and basic corrections/claim verification; subscriptions fund operations/integrations, no per-booking commission | Commerce |
| R19 Clinical boundary | Appointment operations never imply diagnosis/order; provenance and separate clinical scopes for later imports | Interoperability |
| R20 Reliability/evidence | Invariant/contract/failure tests, observable unknown outcomes, restore rehearsal and launch stop conditions | Platform |

## Patient journey specification

Discovery returns useful results without signup. When intent is unclear, offer a small set of care-service choices with uncertainty, not a diagnosis. Search results separate best match, soonest and nearest controls and show why each option matches. Missing insurer network or stale availability is visible. Zero results can broaden date/radius or show a call/request provider only after patient choice; do not quietly relax a hard preference.

Profile includes branch-specific services, relevant role/qualification evidence, supplied languages, location/entrance/accessibility, booking mode, acceptance freshness, provider consultation price only if verified, cancellation policy, verified experience ratings with sample size, and correction/report action. Show last checked per material fact. Do not use a single green badge to imply insurance benefits or clinical outcomes.

Before hold/request/booking, verify contact, create minimal identity and identify whom the visit is for. Reuse verified account information without forcing full profile completion. Ask only material questions. Final review displays exact practitioner or explicitly unnamed service team, branch/modality, local date/time/zone, service/type, patient/delegate, preparation/referral prerequisites, policy and information shared. A typed or spoken “yes” counts only after these exact details are presented and bound to the current operation.

Result surface distinguishes booked, request received, temporarily held, checking confirmation and unsuccessful. Show a stable operation reference, call/support route, change/cancel action and private calendar export. Attendance confirmation is separate. A post-visit invitation is triggered by eligible attendance evidence, not a positive satisfaction pre-screen.

## Review product policy

Eligibility normally requires authoritative attended/completed evidence linked to the internally verified patient. Sources are ranked by evidence quality: authorized clinical/operational source, practice attendance attestation, independently reviewed patient dispute evidence. Provider no-show markings cannot unilaterally suppress a complaint. A disputed attendance queue can establish eligibility without exposing supporting documents publicly.

One review per patient/visit with separate practitioner dimensions (listening, communication, explanation, respect, time, overall experience) and facility dimensions (reception, waiting, cleanliness, accessibility, organization, overall). These are experience measures, not clinical efficacy scores. Avoid collecting medical detail in public text; private drafts warn and help redact.

Anonymous public display still has an internal verified identity/visit binding. Moderation handles personal information, threats, harassment, spam and unsupported private allegations through published rules. Negative compliant reviews stay visible regardless of provider subscription. Providers can reply through moderation without revealing patient status or medical facts. Disputes are independent of sales; retain decision/version and appeal history. Patient edits update timestamp; patient deletion removes public text subject to lawful minimal audit. No provider delete button.

Aggregates show count, recency and uncertainty/shrinkage toward a neutral prior for small samples; exact formula is versioned and tested before launch. Fraud indicators flag human review, not opaque automated access denial. Invitations go to all eligible visits consistently; reject sentiment-selective review gating and imported unverified ratings labeled as Zyara-verified.

## Scope decisions

Pilot includes graph/verification, search/map, native simple services, request mode, safe holds/concurrency, calendar, email/SMS, minimal account/delegate foundation, attendance review, clinic reports and B2B subscription operations. Text navigation and voice follow separate safety/quality gates; initial manual search remains usable.

Next releases add certified external writes, waitlist, clinical-origin recall, specialty/resource configurations, family booking where legally validated, and limited clinical timeline. Defer clinical charting/prescribing, consultation payment processing, insurance claims engine, inpatient/theatre optimization, autonomous clinical triage, unsupervised sandbox agents, broad international launches and population clinical prediction.

Accessibility target derives from [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/) (official recommendation, checked 2026-09-13); claiming conformance requires actual audit. Competitor-derived capability choices and the complete adoption catalog are in [competitor intelligence](ZYARA_COMPETITOR_INTELLIGENCE.md).
