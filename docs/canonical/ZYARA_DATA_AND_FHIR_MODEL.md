# Zyara data and FHIR model

Canonical 2026-09-13. Data/interoperability owner. FHIR is an interchange contract; the internal database preserves operational semantics and explicit ownership. This document proposes schemas, not completed migrations.

## Identity and healthcare graph

Use opaque UUIDs without embedded national IDs. External identity is (tenant, source_system, resource_type, identifier_system, identifier_value, effective interval). A hospital MRN is not globally unique. Keep external resource ID/version separate from business identifiers. Account, Patient, RelatedPerson/delegate and Practitioner are different roles; one human can have several with separate authorization.

Graph edges: Country → Region → City → Facility Organization → Branch Location → Department Organization/Location → HealthcareService → Specialty concept → PractitionerRole → Practitioner. InsuranceAcceptance relates payer/product/network, branch, service, role, dates and evidence. Availability relates to active service/resource schedules; Appointment relates patient, participants and service; Encounter relates actual clinical activity; Review relates attendance evidence and practitioner/facility dimension.

Edges have provenance, valid-time and recorded-time, source revision and confidence. One facility can contain many branch locations; one practitioner has multiple roles and languages; service may have no physician primary actor. Do not denormalize a specialty directly into “doctor owns one clinic.”

| Internal group | Minimum fields / constraints |
|---|---|
| Organization | Legal/trading multilingual names, identifiers, country, type, active interval, parent with cycle prevention |
| Location | Organization, branch/department hierarchy, verified address, National Address reference when permitted, coordinates/precision/source, entrance/accessibility, zone, modality |
| Practitioner | Multilingual names/aliases, supplied gender distinct from clinical patient sex, languages, qualifications/identifiers with protected evidence |
| PractitionerRole | Practitioner, organization/location, specialty/subspecialty, services, privileges, registration evidence, effective interval, accepting-new-patients assertion |
| TaxonomyConcept | Stable internal ID, coding system/version, code, preferred labels/aliases per locale, parent/related concepts and clinical review status |
| HealthcareService | Site/organization, service type, modality, qualified role requirements, language/accessibility, insurer assertions and availability policy |
| SourceAssertion | Subject, field/edge, value, source/rights, observed/valid/expiry times, verifier, confidence and supersession chain |
| Patient / PatientBinding | Minimal name/contact/DOB as required; protected identifiers; source-specific patient binding and match evidence |
| DelegateGrant | Subject patient, actor, verified relationship/evidence, permitted actions, purpose, validity, revocation and sensitive-service exclusions |
| Appointment / Reservation | Model and invariants from appointment plan; appointment and resource items share native transaction |
| AttendanceEvidence | Appointment, source, asserting role, observed/recorded time, outcome, supporting reference and dispute state |
| Review | Reviewer internal binding, eligibility evidence, anonymous-display choice, dimensions/text, moderation version and history |
| ClinicalItem | Source resource/document reference, patient binding, category, clinical/recorded time, original coding, provenance, consent scope and immutable import version |

No clinical claims enter the public graph from patient reviews or unreviewed document extraction. A licensed physician is not necessarily privileged to perform every service at every branch.

## Five trust zones

| Zone | Storage / readers | Index and event policy |
|---|---|---|
| Public/provider graph | graph schema, approved public projections | Search indexing only allowlisted fields; private evidence excluded |
| Operational booking | scheduling/patient minimal data; patient/delegate and scoped practice staff | No public search; outbox references only; calendar privacy modes |
| Sensitive clinical | clinical schema/storage with separate scope/keys | No routine marketplace staff access; no default model-provider forwarding |
| Analytics | aggregated/pseudonymized events with expiry | No raw symptoms, free-text search, national IDs or cross-provider patient trails in provider reports |
| AI/voice | ephemeral requests, approved safety labels | Raw audio/transcripts/prompts off by default; opt-in evaluation vault separate from operational logs |

Pseudonymization is not anonymization. A specialty, precise location and visit time can reidentify someone without their name. Suppress low-count report cells; proposed threshold 10 distinct patients with complementary suppression and rate-limited query combinations. This is a design safeguard requiring review, not a legal anonymity certification.

## Provenance, freshness, merging and deletion

Store both source-observed time and ingestion time. Field quality uses verification state, source authority, recency, consistency and rights; never a single averaged score that hides expired licensure. States: imported_unverified, provider_attested, evidence_reviewed, authoritative_checked, disputed, expired, withdrawn. Public badge names reflect exact evidence, not “all data verified.”

Starting refresh policy: practitioner/facility credential recheck every 90 days or sooner at expiry/suspension; provider contact/service attestations every 30 days; insurance acceptance every 30 days; live availability TTL per adapter (pilot default 60 seconds, contract may be shorter). These are operational hypotheses, not regulator-prescribed intervals. Material safety evidence expiring disables affected service booking immediately. Staff queue owns unresolved sources.

Deduplicate provider graph with identifier evidence, names/transliterations, address and organization relationships. Automatic exact-match candidates can be suggested; conflicting identifiers and cross-country matches require review. Preserve source aliases and reversible merge lineage. Unmerge replays graph projections and redirects stable public URLs appropriately. External ID reuse gets a new effective-dated binding, never overwrites historical appointments. Patient merges require stronger identity evidence and scoped consent/operations review; shared phone is insufficient. Mistaken match quarantine blocks clinical import and destructive booking actions.

Deletion/rectification propagates tombstones to indexes, caches, analytic source events and AI evaluation stores according to approved retention/legal holds. Do not erase an audit to hide a correction. Keep a minimized record of lawful deletion execution; backup expiry/restoration procedure must reapply deletion manifests.

## FHIR resource boundaries

All official links checked 2026-09-13; source type HL7 specification; high confidence in published definitions. Base interchange version is R4 4.0.1. [R5 Appointment](https://hl7.org/fhir/R5/appointment.html) offers richer recurrence constructs; it does not justify putting R5 fields into an R4 payload. Negotiate profile and CapabilityStatement per partner.

| Internal concept → FHIR | Mapping and boundary |
|---|---|
| Legal organization/department → [Organization](https://hl7.org/fhir/R4/organization.html) | Organizational identity/partOf; not a geographic coordinate container |
| Branch/room/mobile site → [Location](https://hl7.org/fhir/R4/location.html) | Physical/virtual operational place and hierarchy; preserve local timezone separately/profile extension if needed |
| Human clinician → [Practitioner](https://hl7.org/fhir/R4/practitioner.html) | Identity/qualifications; employment and service role belong elsewhere |
| Practicing relationship → [PractitionerRole](https://hl7.org/fhir/R4/practitionerrole.html) | Organization, specialty, locations/services and effective dates |
| Offered care → [HealthcareService](https://hl7.org/fhir/R4/healthcareservice.html) | Service, eligibility and availability descriptors; internal detailed constraint recipes exceed base fields |
| Availability container → [Schedule](https://hl7.org/fhir/R4/schedule.html) | Actors/planning horizon, not full recurrence or a patient calendar |
| Available/busy interval → [Slot](https://hl7.org/fhir/R4/slot.html) | Free/busy capacity projection; internal resource allocations remain authoritative for native scheduling |
| Planned administrative visit → [Appointment](https://hl7.org/fhir/R4/appointment.html) | Participants, interval, status, reason/service coding, basedOn where supported; preserve internal operation state separately |
| Participant reply → [AppointmentResponse](https://hl7.org/fhir/R4/appointmentresponse.html) | Participant acceptance and alternative time response; not delivery receipt |
| Actual clinical interaction → [Encounter](https://hl7.org/fhir/R4/encounter.html) | Clinical event, sometimes many-to-many with appointments; no fabricated Encounter merely because a reminder was delivered |
| Clinically authorized order/referral → [ServiceRequest](https://hl7.org/fhir/R4/servicerequest.html) | Requestor, subject, requested service and timing; AI cannot become clinical ordering authority |
| Operational work fulfillment → [Task](https://hl7.org/fhir/R4/task.html) | Scheduling/referral work state and owner; does not replace clinical intent |
| Patient/delegate → Patient / RelatedPerson / Consent | Account login is not Patient identity; RelatedPerson alone does not establish legal authority |
| Provenance/audit → Provenance / AuditEvent | Data lineage versus security access audit are distinct; expose only under explicit partner scope |

[Mobile Care Services Discovery (mCSD)](https://profiles.ihe.net/ITI/mCSD/) is an additional directory alignment reference, not a promised Saudi registry connection. [SMART App Launch 2.2](https://hl7.org/fhir/smart-app-launch/) informs delegated clinical app authorization; implement only the scopes/launch context agreed with the partner, not universal EHR access.

### Status translation

| Internal | R4 mapping | Loss / handling |
|---|---|---|
| proposed candidate | proposed | Often transient result rather than persisted appointment |
| requested | pending when partner profile agrees; otherwise Task plus proposed | “Requested” is not an R4 status |
| held | pending under IHE/partner hold profile | Expiry/allocation semantics require operation/profile evidence |
| pending_external | No false exported booked resource | Operation status remains internal until outcome resolved |
| booked / patient accepted | booked + participant.status accepted where appropriate | Attendance confirmation separate from booking |
| arrived / checked_in | arrived / checked-in | Partner operational definitions vary; adapter mapping tested |
| in_progress | Usually Appointment remains arrived/checked-in; Encounter may be in-progress | Do not invent Appointment in-progress |
| fulfilled | fulfilled | Clinical Encounter completion requires its own evidence |
| no_show | noshow | Retain dispute/correction history |
| cancelled | cancelled + supported reason | Actor/replacement reason not separate status |
| rejected/expired | cancelled or Task state under agreed profile; preserve reason | No universal one-to-one base FHIR code |
| entered_in_error | entered-in-error | Correction is not normal cancellation |
| waitlist entry | Optional waitlist Appointment under partner profile | Preference and offer lifecycle are richer than one FHIR status |

Appointment series in R4 use multiple linked resources/approved extensions and internal Series IDs. R5 adapters map recurrence where supported, preserving excluded/changed occurrences and original series identity. Do not assume a partner implements every optional field.

## Clinical timeline boundary and terminology

P10 timeline starts with appointments and attendance, then consented DocumentReference and selected clinical resources: MedicationStatement/MedicationRequest (information versus prescription), AllergyIntolerance, Condition, Observation/DiagnosticReport, Immunization, ImagingStudy references, ServiceRequest and CarePlan as applicable. Labels: Patient entered, Provider entered, Hospital imported, FHIR synchronized, Document extracted. Extraction retains original document and confidence; unverified text never silently becomes a medication instruction.

Maintain coding system/version and original text alongside mapped concept IDs. Specialty/service taxonomy is curated for Saudi practice with multilingual labels; SNOMED CT, LOINC, ICD and local payer coding rights/version mappings require separate qualification. Do not invent free redistribution rights. Symptom synonyms are navigation terms, not automatically diagnostic codes. National IDs and medical terminology licensing are different governance problems.

Imports are staged: validate FHIR/profile, verify patient binding and consent, check permitted resource types/size, quarantine unknown codes/duplicates, write immutable version with provenance, publish a minimized import event. Clinical care-team corrections supersede imported records according to source authority; patients can annotate disagreement without editing a hospital's record. Revoked sharing prevents future reads/imports and triggers retention-policy evaluation for already imported data.

FHIR conformance evidence: versioned fixtures, official validator reports, reference resolution, status round-trips, time offsets, identifier namespaces, unknown extensions, deleted resources, pagination and permission denial. NPHIES is a separate insurance workflow integration, not the model for every clinical or scheduling API.
