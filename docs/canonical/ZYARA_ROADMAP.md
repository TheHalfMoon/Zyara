# Zyara roadmap

Canonical dependency plan, 2026-09-13. **12 phases, 24 slices, 60 parent task contracts.** Scheduling correctness precedes live booking; identity/provenance and FHIR boundaries precede clinical imports. Phase numbers group work, while the task dependency DAG determines actual readiness. Independent tasks may proceed when their own evidence is available; later product enablement still requires all relevant release gates.

No calendar duration or staffing estimate is presented as validated. Estimate task/child work packets after M001 identifies team/tool constraints. The proposed one-catchment pilot has an operational measurement window, not a promise that all software can be built within that window.

## Dependency-ordered phases

| Phase | Tasks | Deliverable and exit condition | Scope gate |
|---|---|---|---|
| P00 Foundation | M001–M005 | Synthetic stack, identity/tenant controls, governance package, outbox and five-locale UI primitives. | No real patient data; legal/vendor approvals may remain explicit pilot blockers. |
| P01 Provider graph and service readiness | M006–M010 | Provenance/claiming/verification, service configuration and a measured search-engine decision. | Rights-cleared supply; mandatory readiness blockers cannot be averaged away. |
| P02 Discovery and scheduling primitives | M011–M015 | Profiles/map/search plus eligibility, recurring availability and proven resource holds. | Concurrency and expiry before any book button goes live. |
| P03 Patient and provider booking | M016–M020 | Native booking/request flow, minimal identity/delegation, safe changes, calendar/check-in and notifications. | External instant booking still disabled; no unapproved guardian or messaging route. |
| P04 Trust and provider operating value | M021–M025 | Attendance evidence, reviews/appeals, honest metrics, monthly reports and B2B entitlements. | Paid tier and sales authority cannot alter rank/reviews. |
| P05 Bounded Saudi pilot | M026–M030 | Complete synthetic loop, restore/load gates, clinic readiness, live pilot and paid-value decision. | Real-data launch needs actual signoffs; observed evidence can yield iterate/stop. |
| P06 Waitlist and follow-up access work | M031–M035 | Preference-aware expiring offers, safe refill, clinician-originated recall and referral/order work. | No AI-generated clinical schedule or uncontrolled outreach. |
| P07 Certified integration platform | M036–M040 | Capability harness, durable external operations, FHIR/IHE, legacy read adapters and reconciliation. | Each branch/service write contract certified; read access never promoted to write by assumption. |
| P08 Safe AI and first-class voice | M041–M045 | Reviewed intent/safety, grounded typed tools, exact action confirmation, measured ASR and voice UX. | Model/ASR launch gates independent; deterministic search remains usable. |
| P09 Specialty and complex scheduling | M046–M050 | Dental/imaging/lab recipes, bounded series, telehealth/home request workflows, group/family bookings. | Clinician-approved service rules; no theatre optimization or autonomous medical clearance. |
| P10 Consented timeline and family continuity | M051–M055 | Separate clinical scopes, patient match/import, provenance timeline, safe documents/medication information and granular caregivers. | Clinical access and medical instructions never inferred from a booking account. |
| P11 Enterprise and controlled expansion | M056–M060 | Enterprise governance, scoped APIs/analytics, country pack, measured scaling and expansion decision. | Country-specific legality/safety/operating evidence; no translation-only launch. |

## Slices

| Slice | Parent phase | Tasks | Independently reviewable outcome |
|---|---|---|---|
| S00A | P00 | M001, M002 | Reproducible stack and identity |
| S00B | P00 | M003, M004, M005 | Governance, events and inclusive interface |
| S01A | P01 | M006, M007 | Graph identity and correction |
| S01B | P01 | M008, M009, M010 | Verified service readiness and search choice |
| S02A | P02 | M011, M012 | Patient discovery |
| S02B | P02 | M013, M014, M015 | Constraint-aware availability and atomic holds |
| S03A | P03 | M016, M017, M018 | Booking and safe change |
| S03B | P03 | M019, M020 | Calendar operations and communication |
| S04A | P04 | M021, M022, M023 | Attendance and independently governed trust |
| S04B | P04 | M024, M025 | Measured provider value |
| S05A | P05 | M026, M027 | Synthetic and reliability proof |
| S05B | P05 | M028, M029, M030 | Clinic readiness and pilot economics |
| S06A | P06 | M031, M032 | Fair cancellation recovery |
| S06B | P06 | M033, M034, M035 | Clinician-originated continuity work |
| S07A | P07 | M036, M037, M038 | Contracted external operations |
| S07B | P07 | M039, M040 | Legacy integration and reconciliation |
| S08A | P08 | M041, M042, M043 | Safe grounded text actions |
| S08B | P08 | M044, M045 | Measured correctable voice |
| S09A | P09 | M046, M047, M048 | Specialty resources and linked care |
| S09B | P09 | M049, M050 | Modalities and multi-patient logistics |
| S10A | P10 | M051, M052, M053 | Clinical boundary and provenance timeline |
| S10B | P10 | M054, M055 | Safe documents and granular caregivers |
| S11A | P11 | M056, M057, M058 | Enterprise/country governance |
| S11B | P11 | M059, M060 | Measured scale and expansion decision |

## Pilot proof and decision rules

Proposed cohort: 10–20 participating clinics in the Al Olaya/Riyadh catchment hypothesis, enough overlapping service supply to make comparisons useful. Recruitment, service mix and address coverage are unvalidated until M028. At least two native-calendar practices and one request-only external workflow are desired. Do not lower safety requirements to achieve clinic count.

Proposed measurement: four-week comparable baseline where available, then eight-week live pilot after all launch gates pass. Seek >=100 authoritatively completed visits and >=80% known attendance outcomes among elapsed eligible appointments; report sample sizes/missingness and extend the study if insufficient. These thresholds are decision aids chosen for the pilot, not statistically powered clinical or causal claims.

Hard gates: zero observed false confirmations/native capacity invariant violations in prelaunch stress suite; no unresolved critical privacy/authorization/safety defect; every live service has current verification, authority and staff ownership; no unsupported licensing/processing route; working cancellation/support and restoration. A material live failure triggers pause/incident review, not an averaging exception.

Product/commercial evidence: patients can find appropriate options and complete/change appointments; staff handle requests within displayed policy; report real attended outcomes and correction/dispute coverage; measure manual work saved, resource refill and support costs. Proposed commercial gate is >=3 accepted paid provider proposals/renewals at economically viable terms. Survey enthusiasm is not paid evidence. Causal uplift requires a suitable comparison design; raw Zyara bookings can displace other channels.

Decision at M030: go to a bounded next cohort if safety, access and economics support it; iterate with specific repair tasks if coverage/quality/paid value is weak; stop or reposition if clinics will not maintain supply or pay enough to cover operations. No booking commissions or patient fees are introduced as an automatic fallback.

## Sequencing rationale

The earlier foundation suggested AI as the first differentiator and complex resources later. This plan moves graph quality and native concurrency ahead of AI, models resources immediately, and enables complex specialty workflows only after clinical validation. It adds review dispute handling, operational unknown outcomes and correction/reconciliation as first-order product work.

FHIR modeling begins in P01/P02, while partner-specific adapters wait for P07. Limited authorized delegate scheduling is available in the pilot under approved policy; sensitive family timeline comes in P10. Voice is first-class in contract/design from P00 but public rollout waits for P08 ASR/safety evidence. International fields/locales exist early; country launch is P11.

## Explicit deferrals and stop rules

Defer complete EHR/HIS, charting, prescribing, consultation payments, claims processing, theatre/bed optimization, autonomous diagnostic triage, autonomous medication management, unrestricted patient-data RAG, general agent execution in booking, and unlicensed terminology/map ingestion. Native mobile apps require evidence that responsive web cannot meet the relevant access/voice need.

Later tasks are planned contracts, not preapproved production actions. Supplier access, procurement, regulatory approval and clinical decisions are external prerequisites. If an adapter lacks safe create/modify semantics, downgrade mode; if privacy/AI/voice gates fail, disable that capability and retain usable deterministic access. Do not block valid manual search because optional AI is unavailable.
