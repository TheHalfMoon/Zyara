# Zyara V1 Live-Truth Precheck — 2026-09-16

This precheck preserves known repository facts for future planning and implementation work. It is not a substitute for live re-verification.

## Repository state at preparation time

- Repository: `TheHalfMoon/Zyara`
- Default branch: `main`
- Product-direction merge baseline before this correction: `fde3d7eb2e62966a254fc0afd227c7957d59fa1e`
- Latest merged product work before the planning packet: PR #90 (`feat(web): redesign patient discovery around nearby care`)
- This document is descriptive only; every future planning/implementation session must refresh live SHA, PRs, CI, canonical authority and implementation state.

## Existing canonical strengths to preserve

### Healthcare graph

The current model already separates Organization, Location, HealthcareService, Specialty/Taxonomy, PractitionerRole, Practitioner, InsuranceAcceptance, Availability, Appointment/Reservation, AttendanceEvidence and Review.

One practitioner may have multiple roles and locations. Do not replace this with a one-doctor/one-clinic schema.

### Provenance and freshness

The current model already defines source assertions, observed/valid/expiry times and verification states. It includes recurring provider/service/contact and insurance attestation concepts plus separate credential rechecks.

The V1 product direction promotes this foundation into a visible patient/provider trust feature.

### AI/search/voice

The current canonical AI/search/voice architecture already establishes:

- one text/voice intent and safety path;
- multilingual specialty/service taxonomy;
- Arabic normalization/transliteration strategy;
- typed provider/search/booking tools;
- structured facts/actions owned outside the model;
- explainable ranking reasons;
- explicit organic-ranking constraints;
- first-class voice with low-confidence correction and Arabic/code-switch evaluation;
- no default raw-audio retention when transcript is sufficient;
- deterministic/manual fallback when model/ASR is unavailable.

Do not create a second AI or voice reasoning stack.

### Provider platform

The current provider plan already covers onboarding, branch hierarchy, practitioners/roles, specialties/services, insurer acceptance, contact channels, accessibility, hours, provider reports, profile completeness and operations.

V1 should reshape the portal around public-graph maintenance rather than creating an unrelated provider application.

### Reviews

The repository already contains attendance-linked review behavior with moderation, public redaction, provider replies, prohibition on provider deletion of compliant reviews and low-count aggregate protection.

The primary V1 delta is independent practitioner and facility attribution/aggregation while preserving those protections.

### Patient-facing discovery UI

PR #90 introduced a patient-facing discovery redesign centered on nearby care, including synthetic clinic/doctor fixtures, distance, drive-time display, opening-hours context, directions and the updated Zyara visual treatment.

Future planning must distinguish reusable production architecture from synthetic/demo presentation before replacing anything.

## Known V1 planning deltas to verify against live code

1. `All | Doctors | Clinics & Hospitals` result composition.
2. First-class specialty browsing/search and specialty routes.
3. Service/procedure search distinct from practitioner-name search.
4. Branch-aware phone, booking phone, official WhatsApp and website/contact freshness.
5. Provider gallery/media management.
6. Practitioner education/qualification/experience evidence in public profiles.
7. Monthly provider attestation exposed in Clinic Portal.
8. Public field-group freshness display.
9. Independent practitioner and facility review targets/aggregates.
10. Facility-review UI and ranking inputs.
11. Doctor profile location chooser for multi-location practitioners.
12. Clinic Portal workflows for roster/specialty/service/insurance/contact maintenance.
13. Natural-language search in the primary discovery surface.
14. Voice search using the same structured discovery surface.
15. Explainable result reasons in patient-facing discovery.

Do not assume these are missing. Prove their state from current code, migrations, tests and evidence.

## External-gate separation

Preserve separate status dimensions:

```text
REPOSITORY_IMPLEMENTATION
SYNTHETIC_QUALIFICATION
REAL_PROVIDER_VALIDATION
REAL_PATIENT_PILOT_VALIDATION
COMMERCIAL_VALIDATION
PRODUCTION_AUTHORIZATION
```

External clinic recruitment, live-pilot evidence and commercial validation must not silently become repository implementation dependencies.

## Immediate product-planning objective

Any future planning pass should first establish:

- what already exists correctly;
- what needs adaptation for the V1 direction;
- what is genuinely missing;
- what remains deferred;
- what competitor-inspired features require only future architecture seams;
- the exact dependency-ordered work required next.
