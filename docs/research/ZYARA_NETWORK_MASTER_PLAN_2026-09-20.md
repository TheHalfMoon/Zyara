# Zyara Network - Whole-Product Master Plan (Part 1)

Date: 2026-09-20. Starting main SHA: 151a8111c359523d8e30dd9899c0583ca24f8ea4.
Branch: astro/zyara-network-master-plan-2026-09-20. Mode: PLAN-ONLY.
Open work: PR #94 ui/zyara-v1-patient-experience @ b67daef OPEN, m012 failing. Preserved, not absorbed.
Marker: ZYARA_NETWORK_MASTER_PLAN_COMPLETE = YES (justified in Part 3).

## Product thesis
Zyara Network is the umbrella product. Zyara - Your health partner. Surfaces: Zyara (patient), Zyara Clinic (ops workspace), Zyara Doctor (clinician), Zyara Connect (comms/telehealth), Zyara Insights (analytics), Zyara AI (grounded copilot), My Health (longitudinal patient area). Discovery is the entry wedge, not the ceiling.


## Preservation matrix
Graph/search/ranking/profiles:M001-M013 PROVEN_COMPLETE preserve. Booking/holds/changes:M014-M018 PROVEN_COMPLETE preserve. Provider/attendance/reviews/metrics:M008,M021-M025 PROVEN_COMPLETE preserve. Waitlist/recall/referral/adapters:M031-M040 PROVEN_COMPLETE synthetic preserve. Voice/nav/clinical/modalities:M041-M056 PROVEN_COMPLETE synthetic preserve. Analytics/pack/scale:M057-M060 PROVEN_COMPLETE synthetic preserve. M028-M030 DEFERRED_EXTERNAL_VALIDATION. PR94 discovery UI PRESENT_NEEDS_ADAPTATION preserve-and-merge-via-gate. MyHealth-write/encounter-sign/eRx/NPHIES-prod/RCM/Connect-media MISSING new phases. Payroll/recruitment/biometrics REJECT-default.


## Architecture
Modular monorepo preserved. FHIR R4 at boundaries, typed Postgres inside. One operation owner per transition. Outbox/idempotency/retries/DLQ/reconciliation/audit/correlation. Practitioner/PractitionerRole preserved; Doctor-vs-Facility reputation independent; insurance scoped by payer-network-product+branch+service+role+freshness. AI drafts only; typed ops + humans own facts. Connect media via qualification (LiveKit vs Jitsi vs OpenMeeting; BBB group-only). Comms split: orchestration vs inbox vs clinical-messaging vs channel-adapters vs gated-voice.


## Data-model delta (additive)
Add staff_assignments, shifts, leave_requests, coverage_exceptions, clinic_rooms, resources, encounters (Appointment!=Encounter), clinical_notes draft-vs-signed, orders, prescriptions+refill_requests, results immutable+summary, care_plans, conversations+messages, telehealth_sessions, eligibility_checks, authorizations, claims, payments, reconciliation_runs, workflows+versions+actions+receipts+exception_queue, agent_identities, activity_events derived-only, saved_views+report_subscriptions+metric_definitions. All tenant-scoped with provenance/idempotency/correlation/audit.


## Source decisions
Qdrat@e2d2889: org-workforce ADAPT; shifts-leave ADAPT; helpdesk ADAPT; WhatsApp HIGH-PRIORITY ADAPT with credential-isolation+webhook-verify+idempotency+consent; reports ADAPT to Insights; audit REFERENCE; payroll DEFER-INTEGRATE; recruitment DEFER; biometrics-geofencing-face REJECT-default. Buzz@4ab4f78 Apache-2.0: channels-threads ADAPT; human-agent-membership ADAPT; activity-stream ADAPT-concept derived-only; buzz-audit QUALIFY-ADAPT; workflow REFERENCE-QUALIFY vs current jobs; Nostr-as-canonical REJECT; shell-file-MCP REJECT-for-care-agents. GenHealth/Plena: workflow-reference only, reverify live before time-sensitive claims. MedScale/MESC/commandMed/commandF/Himsat/Wispral/Signthos/Sentrdel/Tarif/Ecra/Golam/Kodac/Winds/Ascout/SpecGrain/Diffcipline/Delethos/MSTR/Flake/wepld/gods-eye/openmeeting/SuiteMeet/Jitsi/LiveKit/Medplum/OpenEMR/OpenMRS-Novuhq-Chatwoot-OHIF-OpenELIS-PostGIS-Keycloak-Synthea: per existing S001-S115 ledger; new admissions need exact-revision+files+license+SBOM+security+update-strategy.


## Roadmap
N0 Foundation done. N1 Access done+PR94-merge-via-gate. N2 Scheduling done. N3 Trust done. N4 Workforce next: W1 org-graph, W2 shifts-leave-coverage, W3 helpdesk-tasks, W4 WhatsApp-adapter. N5 Collaboration: C1 agent-identities, C2 activity-derived, C3 approval-exception-queue, C4 audit-chain-qualify. N6 Connect: T1 media-qualify, T2 session-lifecycle, T3 chat-files-consent, T4 reconnect. N7 MyHealth+Clinical: H1 timeline, H2 encounter-sign, H3 orders-results, H4 eRx-refills clinician-signed, H5 referrals-plans. N8 Insurance: I1 eligibility-sandbox, I2 prior-auth, I3 claims, I4 payments-recon; NPHIES-conformance-plan, no-prod-without-authority. N9 Insights+automation-scale. N10 Qualification-external-gates.


## First task + gates
W1 Clinic-org-workforce-graph: additive migrations, scoped APIs, tests, provenance; no payroll-biometrics. Per-task gates: scope+deps+migration-privacy review, unit-contract-synthetic tests, evidence-packet digests, independent check; merge only on green required CI. Unresolved external: NPHIES-authority, eRx-auth, telehealth-governance, WhatsApp-prod-creds, pilots, payer-contracts, residency-signoff, prod-auth. None claimed.

ZYARA_NETWORK_MASTER_PLAN_COMPLETE = YES

## 2026-09-22 AI Operating Fabric amendment

The founder approved a deeper AI-era execution architecture after N5 became canonical. The authoritative planning packet is:

- `docs/canonical/ZYARA_AI_OPERATING_FABRIC_PLAN_2026-09-22.md`
- `docs/research/ZYARA_AI_OPERATING_FABRIC_IMPLEMENTATION_HANDOFF_2026-09-22.md`
- `docs/research/ZYARA_AI_OPERATING_FABRIC_SOURCE_ADOPTION_2026-09-22.md`

The amendment adds a cross-cutting `AIF` program:

```text
AIF-01 Capability Gateway
AIF-02 Privacy / Egress / Credential Mediation
AIF-03 Decision Plane
AIF-04 Agent Workload Runtime
AIF-05 Governed Browser Bridge
AIF-06 Local Bridge
AIF-07 Action Center
AIF-08 Operations Insights
AIF-09 Whole-Fabric Qualification
```

This does not replace N6-N10 and does not block N6 Connect. It supplies the execution substrate required before broad N8 browser fallbacks and N9 agent automation. N5 remains the control/authority plane; the AIF is the execution plane.

Permanent rule:

```text
model/tool/browser/agent output != healthcare authority
```

The first AIF implementation leaf is `AIF-01A Capability contract`. It is dependency-independent from N6/T1 and may proceed concurrently only under repository governance.



## 2026-09-22 Geospatial Platform amendment

The founder approved a first-class healthcare geospatial architecture using MapLibre, OpenFreeMap and selective God's Eye View patterns.

Authoritative packet:

- `docs/canonical/ZYARA_GEOSPATIAL_PLATFORM_PLAN_2026-09-22.md`
- `docs/research/ZYARA_GEOSPATIAL_IMPLEMENTATION_HANDOFF_2026-09-22.md`
- `docs/research/ZYARA_GEOSPATIAL_SOURCE_ADOPTION_2026-09-22.md`
- `docs/research/ZYARA_GEOSPATIAL_READINESS_CHECKLIST_2026-09-22.md`

The amendment adds the cross-cutting GEO program:

```text
GEO-01 Geo truth / precision / provenance
GEO-02 MapLibre + OpenFreeMap renderer/basemap
GEO-03 Map/list discovery parity
GEO-04 Geocoder contract + Saudi qualification
GEO-05 Routing / ETA
GEO-06 Entrances / accessibility / final-100m access
GEO-07 Scene / layers / privacy-safe share state
GEO-08 Optional 3D
GEO-09 Spatial Insights
GEO-10 AI / voice geo capabilities
GEO-11 Whole-platform hardening
```

Permanent rules:

```text
Provider Graph + PostGIS own healthcare geo truth
renderer != tiles != geocoder != router != 3D provider
precise patient location is purpose-bound
map/list share one result contract
3D is optional
spatial analytics are privacy-aggregated
AI geo actions are typed capabilities
```

The first GEO implementation leaf is `GEO-01A — Geo assertion and precision contract`. It is independent of N6 and requires no external credentials.

N9 spatial analytics must consume GEO-09 rather than invent a second geospatial stack. AIF-01 is the prerequisite for GEO-10 AI/voice geo capabilities.


## 2026-09-23 Decision + Agent Runtime donor amendment

The founder supplied and authorized four additional source donors:

- `mizorewww/laya-coreml@4619e0483f07adf39068532e85b42ec2347edb83`
- `caio0452/jev_search@ea073f6db48f5bff73ae4b9f2240d2d302fb9dc1`
- `unreallabsai/unreal-agent@df8b0ba560da17fd705d941cbeb75eff86c74a1e`
- `mrmps/classifier-dev@8f2bb2b84a0d51ad1c9ed3436b64155908354f75`

Authoritative detailed analysis:

`docs/research/ZYARA_DECISION_AGENT_RUNTIME_DONOR_DEEP_DIVE_2026-09-23.md`

The AIF amendment now explicitly covers:

```text
local typed decisions
-> provider-neutral decision batching
-> uncertainty escalation
-> permission-first semantic prefiltering
-> durable agent sessions and stable input ids
-> context omission receipts
-> pure tool translation
-> versioned serializable operations
-> crash recovery/reconciliation
-> bounded fork/compare
```

Permanent rules:

```text
confidence != authority
input dedup != external-action idempotency
model tool call != side effect
persist operation before dispatch
local-only != silent cloud fallback
fork != replay completed side effects
worker lease != external exactly-once guarantee
persisted operation != authorized operation unless approval/policy still valid
decision label set != unversioned prompt text
```

The final hardening pass also requires versioned decision classes, model-artifact provenance, causal session ordering, operation dependency graphs, leases/fencing, transactional dispatch intent, receipt integrity, human-intent binding, retention semantics and parser/fan-out limits.

This does not change the first AIF implementation leaf: `AIF-01A Capability contract`.
