# Zyara V1 Feature Scope Matrix — 2026-09-16

Status: founder-directed planning input.  
Purpose: remove ambiguity for the planning pass and the next implementation agent by separating required V1 capability families from later platform expansion.

Legend:

- **V1 REQUIRED** — must be represented in the V1 product plan and implemented unless live-repository evidence proves it complete already.
- **V1 STAGED** — architecture/data contract required in V1; user-facing breadth may stage behind evidence/quality gates.
- **V2** — preserve clean seam; do not block V1 discovery.
- **V3+** — later provider/clinical/network platform work.
- **EXTERNAL GATE** — repository work can prepare for it, but completion depends on real-world evidence/contracts/data.

| Capability | Scope | V1 requirement / boundary |
|---|---|---|
| Doctor/practitioner search | V1 REQUIRED | Name, aliases, specialty, service, language, location, insurance and current roles where supported |
| Clinic/hospital/facility search | V1 REQUIRED | Independent facility entities and branch-aware facts |
| Result mode: All / Doctors / Clinics & Hospitals | V1 REQUIRED | Shared query/filter state with entity-specific rendering |
| Specialty search/browse | V1 REQUIRED | Arabic/English first-class; taxonomy-backed |
| Subspecialty search | V1 STAGED | Data model and aliases in V1; breadth can grow safely |
| Service/procedure search | V1 REQUIRED | Search by service where the patient may not know a doctor |
| Common care-language search | V1 REQUIRED | Natural-language intent mapping without autonomous diagnosis |
| Arabic normalization/transliteration | V1 REQUIRED | Exact-name preservation plus evaluated normalization/aliases |
| Saudi Arabic/code-switching | V1 STAGED | Text in V1; voice release depends on evidence gate |
| Map/list parity | V1 REQUIRED | One filter/ranking state; accessible list fallback |
| Distance | V1 REQUIRED | Straight-line distance clearly labeled when routing unavailable |
| Travel time | V1 STAGED | Only with authoritative routing data/rights |
| Open now/closed | V1 REQUIRED | Derived from branch hours/timezone; unknown remains unknown |
| Weekly/holiday hours | V1 REQUIRED | Branch-specific, freshness-tracked |
| Phone | V1 REQUIRED | Official/verified branch-aware contact |
| Booking/reception phone | V1 REQUIRED where distinct | Preserve separate purpose if supplied |
| WhatsApp | V1 REQUIRED where official | Deep-link/contact only unless a separate transactional integration is authorized |
| Website | V1 REQUIRED where available | Source/freshness maintained |
| Directions | V1 REQUIRED | Branch-specific destination; no unnecessary origin retention |
| Native booking | V1 REQUIRED only where authoritative | Use existing typed booking safety and confirmation contracts |
| Booking request | V1 REQUIRED where applicable | Honest lower-authority mode |
| Call/redirect fallback | V1 REQUIRED | Non-integrated supply must remain accessible without fake booking certainty |
| Practitioner multi-location | V1 REQUIRED | PractitionerRole is the relationship unit |
| Organization/branch hierarchy | V1 REQUIRED | Parent and branch facts cannot be flattened when materially different |
| Doctor photo | V1 REQUIRED when rights/evidence permit | Provider-managed/source-provenance |
| Doctor biography | V1 REQUIRED | Structured/public claims with provenance policy |
| Doctor specialty/subspecialty | V1 REQUIRED | Role-aware and taxonomy-backed |
| Doctor education | V1 REQUIRED MODEL | Display only evidence-backed information |
| Doctor qualifications/board/fellowship | V1 REQUIRED MODEL | Evidence/validity state distinct from marketing copy |
| Doctor experience | V1 REQUIRED MODEL | Avoid unsupported precision; preserve source/interval |
| Doctor languages | V1 REQUIRED | Current profile field |
| Doctor services/expertise | V1 REQUIRED MODEL | Separate structured services from free-text claims |
| Professional registration state | V1 REQUIRED MODEL | Do not overstate verification or scope of privileges |
| Facility logo/cover/gallery | V1 REQUIRED | Rights-cleared/provider-supplied media |
| Facility specialties | V1 REQUIRED | Branch/department aware where needed |
| Facility services | V1 REQUIRED | Structured, searchable |
| Facility accessibility | V1 REQUIRED MODEL | Structured facts with freshness/source |
| Parking/entrance instructions | V1 STAGED | Valuable local-access information |
| Insurance visibility | V1 REQUIRED | Patient-facing filter/profile fact |
| Insurance plan/network | V1 REQUIRED MODEL | Payer alone is insufficient |
| Insurance branch/service/role scope | V1 REQUIRED MODEL | Prevent false universal acceptance |
| Insurance freshness | V1 REQUIRED | Specific confirmation state |
| Doctor reviews | V1 REQUIRED | Attendance-linked trust policy preserved |
| Facility reviews | V1 REQUIRED | Separate reputation target |
| Separate doctor/facility score | V1 REQUIRED | Never blend into one score |
| Review moderation/appeal | V1 REQUIRED | Preserve existing M022 protections |
| Review replies | V1 REQUIRED | Privacy-safe provider response |
| Review AI summaries | V2 | Later, grounded in published review corpus and clearly labeled |
| Clinic/organization claim | V1 REQUIRED | Verified representative and dispute handling |
| Doctor profile claim | V1 REQUIRED or explicitly planned | Identity/authority safeguards |
| Branch management | V1 REQUIRED | Address, hours, contact, media, services, insurers |
| Practitioner roster management | V1 REQUIRED | Add/invite/link/end roles with effective dates |
| Monthly profile attestation | V1 REQUIRED | Roster, contact, specialties, services, hours, insurance |
| Public freshness indicators | V1 REQUIRED | Specific field-group freshness, not generic badge |
| Correction/report flow | V1 REQUIRED | Patient/provider/data-ops correction path |
| Provider analytics event foundation | V1 REQUIRED | Impressions/actions separated from visits |
| Provider monthly analytics report | V1 STAGED | Current implementation may already support broad reporting; reconcile rather than duplicate |
| Natural-language AI search | V1 REQUIRED | Structured intent over graph/search tools |
| Explainable match reasons | V1 REQUIRED | Factual reasons and explicit unknowns |
| Conversational result refinement | V1 STAGED | Structured filter state; model memory not authoritative |
| Voice capture/ASR | V1 STAGED | First-class architecture; release behind ASR/Arabic quality gate |
| Spoken result narration/TTS | V1 STAGED | Must mirror structured facts; readable fallback |
| AI provider/admin copilot | V2 | Profile completeness, data-maintenance assistance with approval |
| AI phone receptionist | V2/V3 | Future call/search/book/request agent under typed tools |
| Digital intake/forms | V2 | Preserve adapter/data seam |
| Consent/e-signature | V2 | Introduce with workflow/legal need |
| Automated reminders | V2 | Existing booking notifications may remain; full communication suite later |
| Secure patient messaging | V2/V3 | Separate privacy/retention model |
| Waitlist/recall | V2 | Existing implementation may be reusable; not a V1 launch dependency |
| Mobile check-in/queue | V2/V3 | Strong future Solv-style access feature |
| Telehealth platform | V2/V3 | Modality represented now; full experience later |
| Insurance eligibility verification | V2 | Distinct from listed network acceptance |
| Payments | V2/V3 | Not required for founder's V1 patient acquisition thesis |
| EHR/HIS replacement | V3+ | Explicitly out of V1 |
| Clinical longitudinal record | V3+ | Separate sensitive-health-data program |
| Consultation documentation assistant | V3+ | Provider clinical product; regulated/safety implications |
| Care-team secure messaging/referral | V3+ | Network/clinical-coordination layer |
| Autonomous diagnosis/treatment | REJECT | Outside Zyara navigation role |
| Paid organic ranking | REJECT | Commercial state cannot alter organic relevance |
| Provider deletion of negative compliant reviews | REJECT | Trust violation |
| Global provider insurance boolean | REJECT | Misleading data model |
| Duplicate practitioner identity per clinic | REJECT | Breaks multi-location identity/history |
| One blended doctor+facility rating | REJECT | Hides distinct patient experiences |
| Silent stale data presented as current | REJECT | Freshness must be explicit |
| Model-generated provider facts | REJECT | Structured system owns facts |

## External validation gates that must remain distinct

The V1 plan may implement repository-owned capability without claiming these external states are complete:

- real clinic recruitment;
- real provider ownership verification;
- production rights to provider/facility datasets;
- production SCFHS/registry integrations beyond available lawful interfaces;
- real insurer network verification contracts;
- live routing/map vendor contracts;
- WhatsApp Business/API transactional integration contracts;
- real production bookings;
- real patient attendance/review volume;
- legal/trademark/domain clearance;
- production privacy/legal review;
- commercial willingness-to-pay validation.

The planning pass must keep repository implementation readiness and external market/production validation as separate status dimensions.
