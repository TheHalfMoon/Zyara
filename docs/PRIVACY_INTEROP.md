# Privacy, Security, Healthcare Data, and Interoperability

This is product architecture guidance, not legal advice. Saudi launch requires qualified legal/compliance review.

## Regulatory baseline

Saudi PDPL defines health data as personal data relating to a person's physical, mental or psychological condition or health services received.

The Implementing Regulation's Article 26 requires appropriate organizational, technical and administrative measures for health data, including purpose limitation, role/access separation, processing documentation and limiting processing to what is necessary.

Primary references:

- Saudi PDPL knowledge center: https://dgp.sdaia.gov.sa/wps/portal/pdp/knowledgecenter/
- Implementing Regulation: https://sdaia.gov.sa/en/SDAIA/about/Documents/ImplementingRegulation.pdf
- Saudi MOH e-health vision: https://www.moh.gov.sa/en/Ministry/nehs/Pages/The-Complete-Vision.aspx
- Saudi MOH interoperability direction: https://www.moh.gov.sa/Ministry/vro/eHealth/Documents/MoH-Digital-Health-Strategy-Update.pdf

## Privacy principles

### Data minimization

Do not collect health data merely because it may be useful later.

### Purpose limitation

Record why a category of data exists and which product workflows may use it.

### Least privilege

Provider marketing/analytics staff do not need patient clinical records. Support staff do not automatically need clinical detail. AI does not automatically receive an entire timeline.

### Consent and lawful basis

Model consent/lawful-basis metadata where needed. Consent must be versioned, scoped and revocable when applicable.

### Provenance

Every imported clinical fact/reference should record source, timestamp, external identifier and mapping version.

### Audit

Sensitive read/write/export actions require an audit trail.

## Security requirements

Astro must create a threat model before production launch covering:

- account takeover;
- provider impersonation/claim fraud;
- horizontal tenant access;
- patient-record access leakage;
- broken family/delegated access;
- mass scraping/enumeration;
- booking abuse/spam;
- review fraud;
- AI prompt injection/data exfiltration;
- integration credential theft;
- webhook spoofing;
- sensitive logs/traces;
- object-storage exposure;
- insider access;
- export abuse.

Controls should include:

- strong authentication/MFA options for provider admins;
- relationship-based authorization;
- tenant/branch scoping;
- encryption in transit and at rest;
- secret rotation;
- webhook signatures;
- rate limits;
- anti-enumeration controls;
- field/object-level access policy where required;
- session/device management;
- audit logs;
- backup/restore tests;
- vulnerability scanning;
- dependency/SBOM management;
- incident response runbooks;
- privacy-safe observability.

## FHIR alignment

FHIR should shape the interoperability boundary even when internal operational tables are optimized for Zyara workflows.

Core mappings to plan:

- `Patient`
- `RelatedPerson`
- `Organization`
- `Location`
- `Practitioner`
- `PractitionerRole`
- `HealthcareService`
- `Schedule`
- `Slot`
- `Appointment`
- `Encounter`
- `Condition`
- `AllergyIntolerance`
- `MedicationRequest`
- `MedicationStatement`
- `Observation`
- `DiagnosticReport`
- `DocumentReference`
- `ServiceRequest`
- `CarePlan` where needed
- `Consent`

Do not pretend every provider has modern FHIR APIs. Maintain adapters for legacy scheduling/HIS interfaces where commercially necessary.

## Patient timeline provenance model

Each timeline entry should carry at least:

- canonical Zyara ID;
- patient ID;
- data type;
- source category;
- source organization;
- external ID/version where available;
- event/effective time;
- imported/recorded time;
- author/actor when applicable;
- patient-visible provenance label;
- sensitivity/access classification;
- original payload/reference or immutable source hash as appropriate.

Source categories include:

- `patient_entered`
- `provider_entered`
- `zyara_booking`
- `fhir_import`
- `hl7_import`
- `document_upload`
- `derived_summary`

Derived AI summaries must never overwrite the source record.

## Healthcare-native code/reference projects

These are additions to the general 85-source landscape and should be evaluated deliberately:

| Project | URL | Potential role |
|---|---|---|
| Medplum | https://github.com/medplum/medplum | FHIR-native application/server patterns, healthcare auth/API |
| HAPI FHIR | https://github.com/hapifhir/hapi-fhir | FHIR server/client/reference implementation patterns |
| OpenEMR | https://github.com/openemr/openemr | EHR/practice-management and scheduling patterns |
| OpenMRS | https://github.com/openmrs/openmrs-core | Medical record domain/platform patterns |
| Bahmni | https://github.com/Bahmni/bahmni-core | Hospital workflow/integration patterns |
| Synthea | https://github.com/synthetichealth/synthea | Synthetic patient/FHIR data for tests |
| OHIF Viewer | https://github.com/OHIF/Viewers | Imaging/DICOMweb reference if imaging viewing is introduced |
| Orthanc | https://github.com/orthanc-mirrors/orthanc | DICOM/PACS integration reference |

Their upstream licenses and component-specific obligations must be recorded before reuse.

## Saudi-specific adapters

### Practitioner verification

SCFHS registration validation reference:

https://scfhs.org.sa/en/node/1992

Do not assume that a public web verification page automatically authorizes high-volume automated scraping/API use. Establish the supported institutional integration path.

### Address/geospatial

National Address APIs expose address search, validation, geocoding, POI and maps capabilities:

https://api.address.gov.sa/apidocumentation

Treat usage terms, rate limits and data-rights requirements as integration gates.

### Interoperability

Saudi MOH strategy explicitly references HL7, FHIR and DICOM alignment. Zyara should be compatible with national interoperability direction rather than inventing closed formats.

## AI and health data

AI requests should receive the minimum data needed for the task.

Implement:

- tool-level scopes;
- redaction;
- consent checks;
- model/provider data-processing policy registry;
- prompt/response retention rules;
- restricted production tracing;
- no training on patient data by default;
- clear separation between public provider-search context and private patient context.

## Data export/deletion/retention

Astro must map legal requirements and product behavior for:

- patient access/export;
- correction;
- deletion where applicable;
- provider record retention obligations;
- audit retention;
- backups;
- account closure;
- integration disconnect/revocation;
- cross-border transfers.

These must be policy-driven, not ad hoc SQL operations.
