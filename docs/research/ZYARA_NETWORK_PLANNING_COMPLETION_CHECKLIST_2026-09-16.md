# Zyara Network — Astro Planning Completion Checklist

Astro may declare the whole-product planning pass complete only when every required item below is repository-native, internally consistent and grounded in live repository truth.

## 1. Live truth

- [ ] Exact starting `main` SHA recorded.
- [ ] Open PRs/branches relevant to planning and UI recorded.
- [ ] Current implementation, migrations, tests, CI and canonical docs inspected.
- [ ] PR #94 or its successor state reconciled rather than ignored.
- [ ] Existing completed work is preserved and mapped instead of re-planned blindly.

## 2. Whole-product thesis

- [ ] `Zyara Network` umbrella product is defined.
- [ ] `Zyara — Your health partner` patient promise is represented.
- [ ] `Zyara Clinic`, `Zyara Doctor`, `Zyara Connect`, `Zyara Insights`, `Zyara AI`, and patient `My Health` boundaries are clear.
- [ ] Discovery is preserved as the first access wedge but is no longer the planning ceiling.
- [ ] Network 1.0 end state and staged implementation path are both explicit.

## 3. Preservation matrix

Every major existing subsystem classified:

- [ ] healthcare graph;
- [ ] provider/facility profiles;
- [ ] specialty/service search;
- [ ] maps/geospatial;
- [ ] booking/scheduling;
- [ ] patient/delegate identity;
- [ ] reviews/trust;
- [ ] provider platform;
- [ ] analytics;
- [ ] FHIR/interoperability;
- [ ] privacy/security/consent;
- [ ] AI/search/voice;
- [ ] patient timeline/clinical items;
- [ ] current UI;
- [ ] integrations/evidence.

Allowed states:

```text
PROVEN_COMPLETE
PRESENT_NEEDS_ADAPTATION
PARTIAL
MISSING
DEPENDENCY_OR_INTEGRATION
DEFERRED_EXTERNAL_VALIDATION
LATER_EXTENSION
REJECT
```

## 4. Patient product plan

- [ ] discovery/search/map;
- [ ] doctor/facility comparison and separate reputation;
- [ ] appointment lifecycle including cancel/reschedule/defer/waitlist/earlier-slot;
- [ ] communication preferences and channels;
- [ ] telehealth patient journey;
- [ ] upcoming/past visits;
- [ ] My Health longitudinal timeline;
- [ ] medications/prescriptions/refills;
- [ ] allergies/conditions;
- [ ] labs/results/trends;
- [ ] imaging/reports;
- [ ] referrals/care plans;
- [ ] documents;
- [ ] insurance/eligibility/authorization visibility;
- [ ] bills/payments where owned;
- [ ] family/delegate access;
- [ ] grounded patient AI boundaries.

## 5. Clinic operating system plan

- [ ] organization/branch/department/resource model;
- [ ] staff/practitioner role/permission model;
- [ ] practitioner credential/privilege lifecycle;
- [ ] schedule/templates/leave/exceptions;
- [ ] rooms/resources/capacity;
- [ ] front desk;
- [ ] patient registration and deduplication;
- [ ] waitlist/recall/queue/check-in;
- [ ] unified communication inbox;
- [ ] forms/questionnaires/consent/e-sign/documents;
- [ ] telehealth operations;
- [ ] encounter/charting plan;
- [ ] orders/labs/imaging/referrals;
- [ ] prescriptions/refill safety model;
- [ ] insurance eligibility/prior auth/claims;
- [ ] billing/payment/reconciliation;
- [ ] analytics/reporting;
- [ ] audit/exports/integration health;
- [ ] workforce boundary versus external HR/payroll.

## 6. Doctor workspace plan

- [ ] today/week schedule;
- [ ] multi-workplace role handling;
- [ ] clinician-controlled availability/leave within clinic policy;
- [ ] clinic schedule-change audit/notification;
- [ ] pre-visit context;
- [ ] visit documentation;
- [ ] telehealth launch;
- [ ] orders/prescriptions/referrals;
- [ ] results inbox;
- [ ] messages/tasks/refills/authorizations;
- [ ] post-visit summary/follow-up;
- [ ] mobile high-frequency workflow.

## 7. Zyara Connect plan

- [ ] primary media-engine strategy chosen or qualification experiment defined;
- [ ] Jitsi vs LiveKit/Suite Meet vs other lane decision criteria documented;
- [ ] waiting room and appointment binding;
- [ ] 1:1 and approved multi-party visits;
- [ ] chat/files/screen share;
- [ ] reconnect/degraded-network behavior;
- [ ] caregiver/interpreter participants;
- [ ] group care and tele-expertise boundary;
- [ ] recording/transcription consent and retention policy;
- [ ] media events mapped to operational attendance without inventing clinical truth;
- [ ] email/SMS/WhatsApp/push/in-app orchestration architecture;
- [ ] inbound communication normalization/unified inbox;
- [ ] phone/voice agent gated separately.

## 8. Clinical authority and safety

- [ ] clinician is authoritative signer for prescriptions/orders/clinical notes as applicable;
- [ ] AI cannot autonomously diagnose, prescribe or sign orders;
- [ ] medication interaction/allergy checks have authoritative/deterministic strategy;
- [ ] extracted/document/patient-entered facts remain provenance-labelled;
- [ ] emergency/escalation behavior defined;
- [ ] result interpretation and AI summaries bounded;
- [ ] clinical terminology/version strategy defined;
- [ ] correction/supersession semantics defined.

## 9. Insurance and Saudi integration

- [ ] directory insurance acceptance separated from eligibility;
- [ ] eligibility separated from benefit details;
- [ ] prior authorization modeled explicitly;
- [ ] claims and remittance modeled explicitly;
- [ ] NPHIES Financial Services IG qualification plan included;
- [ ] FHIR R4.0.1 transaction/profile boundary included;
- [ ] transaction IDs/reference/provenance retained;
- [ ] offline/manual fallback observations cannot masquerade as online eligibility proof;
- [ ] patient-facing coverage wording is truthful.

## 10. Data architecture

- [ ] canonical internal domain boundaries defined;
- [ ] FHIR boundary role defined;
- [ ] organization/location/practitioner/practitioner-role preserved;
- [ ] patient/account/delegate roles separated;
- [ ] appointment/encounter distinction preserved;
- [ ] clinical item/source version/provenance model expanded as needed;
- [ ] communication/conversation model defined;
- [ ] claim/authorization/coverage model defined;
- [ ] document/media model defined;
- [ ] analytics event schema and privacy rules defined;
- [ ] external identity/version mapping defined;
- [ ] data retention/deletion/rectification model defined.

## 11. Platform architecture

- [ ] modular domain/service boundaries;
- [ ] tenancy/isolation;
- [ ] authorization/RBAC/ABAC strategy;
- [ ] transactional outbox/eventing;
- [ ] idempotency/retry/reconciliation;
- [ ] job/queue architecture;
- [ ] audit/provenance;
- [ ] observability without unsafe PHI logging;
- [ ] backups/restore/disaster recovery;
- [ ] feature flags and migrations;
- [ ] API versioning;
- [ ] mobile/web/desktop strategy;
- [ ] deployment/data-residency assumptions explicit.

## 12. Source/adoption plan

- [ ] all founder-supplied meeting/media repositories assessed;
- [ ] relevant TheHalfMoon repositories assessed;
- [ ] OpenEMR assessed;
- [ ] Medplum assessed;
- [ ] OpenMRS/Bahmni assessed;
- [ ] Novu assessed;
- [ ] Chatwoot assessed;
- [ ] Cal.diy/Cal.com patterns assessed;
- [ ] OHIF assessed;
- [ ] OpenELIS assessed;
- [ ] existing PostGIS/Keycloak/Synthea candidates reconciled;
- [ ] no source adopted solely because permission exists;
- [ ] exact revision/license/provenance/security/update strategy required before copy/adaptation.

## 13. Competitor reconciliation

- [ ] Doctolib;
- [ ] Epic/MyChart;
- [ ] Tebra;
- [ ] NexHealth;
- [ ] athenahealth;
- [ ] Phreesia;
- [ ] Elation;
- [ ] Zocdoc;
- [ ] Healthgrades;
- [ ] Vezeeta;
- [ ] Solv;
- [ ] other source only when it closes a documented gap.

Each feature pattern must map to a Zyara job and an adopt/adapt/defer/reject decision.

## 14. AI-era architecture

- [ ] natural-language patient search;
- [ ] conversational refinement;
- [ ] voice input;
- [ ] Saudi Arabic/code-switch evaluation;
- [ ] patient chart-grounded assistant;
- [ ] provider documentation/copilot plan;
- [ ] clinic administrative agent plan;
- [ ] phone assistant plan;
- [ ] model/provider abstraction;
- [ ] typed tools;
- [ ] source grounding/provenance;
- [ ] prompt/tool injection defenses;
- [ ] confirmation for critical actions;
- [ ] abstention/escalation;
- [ ] no model-owned clinical/financial truth.

## 15. Analytics and operating model

- [ ] clinic dashboard metrics defined with denominators/missingness;
- [ ] discovery funnel;
- [ ] schedule/capacity/utilization;
- [ ] cancellation/no-show/waitlist;
- [ ] communication performance;
- [ ] insurance/claim operations;
- [ ] financial/revenue-cycle metrics;
- [ ] data freshness/integration health;
- [ ] privacy threshold/small-cell suppression;
- [ ] no unsafe cross-provider patient tracking.

## 16. Delivery roadmap

The roadmap must include:

- [ ] phases;
- [ ] slices;
- [ ] bounded tasks;
- [ ] dependency graph;
- [ ] migration impacts;
- [ ] source/adoption impacts;
- [ ] privacy/security impacts;
- [ ] test/evidence gates;
- [ ] rollback/recovery;
- [ ] real external validation gates;
- [ ] first executable task.

The plan must distinguish implementation milestones from the final `Zyara Network 1.0` product target.

## 17. Evidence dimensions remain separate

Astro must keep these states separate:

```text
REPOSITORY_PLANNING
REPOSITORY_IMPLEMENTATION
SYNTHETIC_QUALIFICATION
INTEROPERABILITY_CONFORMANCE
REAL_PROVIDER_VALIDATION
REAL_PATIENT_VALIDATION
REGULATORY_OR_CONTRACTUAL_AUTHORITY
COMMERCIAL_VALIDATION
PRODUCTION_AUTHORIZATION
```

One cannot substitute for another.

## 18. Final handoff

- [ ] exact implementation handoff file exists;
- [ ] implementation agent can start without this chat;
- [ ] handoff contains exact live base/reverification rule;
- [ ] source/adoption policy included;
- [ ] whole-product context retained while authorizing only the first bounded task;
- [ ] no hidden/local-only roadmap remains.

## Completion marker

Only when all required items are genuinely satisfied:

```text
ZYARA_NETWORK_MASTER_PLAN_COMPLETE = YES
```

The final Astro report must include exact starting main SHA, planning branch, planning HEAD, artifacts created/updated, checks/CI observed, unresolved external gates, major preserve/adapt decisions, source-adoption decisions, complete phase/slice/task counts, and the first authorized implementation task identifier.
