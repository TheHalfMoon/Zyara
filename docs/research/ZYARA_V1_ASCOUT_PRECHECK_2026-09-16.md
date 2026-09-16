# Zyara V1 AScout Precheck — 2026-09-16

This precheck exists to prevent the next planning agent from rediscovering already-known repository facts before beginning its own live audit.

It is **not** a substitute for live re-verification.

## Repository state at preparation time

- Repository: `TheHalfMoon/Zyara`
- Default branch: `main`
- Main SHA when the planning branch was created: `8b0789d700a16c3708cc8468140e377c4722872a`
- Main commit message: `Merge pull request #90 from TheHalfMoon/muse/zyara-customer-discovery-redesign` / `feat(web): redesign patient discovery around nearby care`
- Open PRs at precheck time: `0`
- Planning branch: `plan/zyara-v1-discovery-ai-direction`

AScout must refresh all of these values at session start.

## Existing canonical strengths that should be preserved

### Healthcare graph

The current canonical data model already separates:

- Organization;
- Location;
- HealthcareService;
- Specialty/taxonomy concepts;
- PractitionerRole;
- Practitioner;
- InsuranceAcceptance;
- Availability;
- Appointment/Reservation;
- AttendanceEvidence;
- Review.

It explicitly supports one practitioner having multiple roles and locations. AScout should adapt this model rather than replace it with a doctor-owned-by-one-clinic schema.

### Provenance and freshness

The current data model already defines source assertions, observed/valid/expiry times and verification states. It proposes 30-day provider contact/service and insurance attestations plus separate credential rechecks. The V1 founder amendment makes this existing capability a visible product feature rather than only an internal governance concept.

### AI/search/voice

The current canonical AI/search/voice plan already establishes:

- one text/voice intent and safety path;
- multilingual specialty/service taxonomy;
- Arabic normalization/transliteration strategy;
- typed provider/search/booking tools;
- structured facts/actions owned outside the model;
- explainable ranking reasons;
- explicit organic-ranking constraints;
- first-class voice with low-confidence correction and Arabic/code-switch evaluation;
- no default raw-audio retention when transcript is sufficient;
- fallback to deterministic/manual search when model/ASR is unavailable.

The V1 amendment strengthens the product role of this architecture; it does not require a second AI stack.

### Provider platform

The current provider plan already covers provider onboarding, branch hierarchy, practitioners/roles, specialties/services, insurer acceptance, contact channels, accessibility, hours, provider reports, profile completeness and operations. AScout should narrow/reshape the V1 portal around public-graph maintenance rather than build an unrelated new provider application.

### Reviews

The current repository already contains an attendance-linked review implementation with moderation, public redaction, provider replies, prohibition on provider moderation/deletion of compliant reviews and low-count aggregate protection.

The main V1 delta is attribution: practitioner and facility reputation must become independent first-class targets while retaining those protections.

### Patient-facing discovery UI

PR #90 introduced a patient-facing discovery redesign centered on nearby care, including synthetic clinic/doctor fixtures, distance, drive-time display, opening-hours context, directions and new Zyara visual treatment. AScout must inspect the current implementation and classify what is prototype/synthetic presentation versus reusable production architecture before planning replacements.

## Known new planning deltas

AScout should explicitly inspect whether the current repository fully supports:

1. `All | Doctors | Clinics & Hospitals` result composition.
2. First-class specialty browsing/search and public specialty routes.
3. Service/procedure search as distinct from practitioner search.
4. Branch-aware phone + booking phone + official WhatsApp + website/contact freshness.
5. Provider gallery/media management.
6. Practitioner education/qualification/experience evidence in the public profile model.
7. Monthly provider attestation workflow exposed through Clinic Portal.
8. Public field-group freshness display.
9. Separate PractitionerReview and FacilityReview targets/aggregates.
10. Facility-level review UI and ranking inputs.
11. Doctor profile location chooser when one practitioner works in multiple facilities.
12. Clinic Portal UX for roster/specialty/service/insurance/contact maintenance.
13. Natural-language search integrated into the main patient discovery surface.
14. Voice search integration into the same structured discovery surface.
15. Explainable result reasons in the redesigned customer experience.

Do not assume these are missing; prove their actual state from live code, migrations, tests and evidence.

## Existing external-gate distinction

Earlier canonical governance already deferred real-world validation for clinic recruitment, live pilot and commercial validation. The new V1 direction does not silently convert those external gates into repository implementation dependencies.

AScout must preserve separate status dimensions such as:

```text
REPOSITORY_IMPLEMENTATION
SYNTHETIC_QUALIFICATION
REAL_PROVIDER_VALIDATION
REAL_PATIENT/PILOT_VALIDATION
COMMERCIAL_VALIDATION
PRODUCTION_AUTHORIZATION
```

A repository feature can be technically complete while production claims remain blocked by external evidence.

## Immediate AScout objective

Do not begin by writing product code.

First produce a canonical reconciliation showing:

- what the repository already implements correctly;
- what must be adapted for the founder's V1 direction;
- what is genuinely missing;
- what should remain deferred;
- what future competitor-inspired features need only architecture seams;
- exact dependency-ordered work required next.

The purpose of this pass is to make the next implementation phase deterministic rather than exploratory.