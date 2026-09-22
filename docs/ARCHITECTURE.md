# Platform Architecture

This document describes the target boundaries and preferred initial shape. Astro should convert these into concrete ADRs before implementation.

## Architectural stance

Start with a **modular monolith** for transactional product logic, with independent infrastructure services for search, workflow, storage and observability where justified.

Reasons:

- the product domain is large but the first team will benefit from one deployable application;
- strong module boundaries are easier to enforce than premature distributed consistency;
- healthcare booking and patient-history workflows need reliable transactions;
- modules can later be extracted behind already-defined events/APIs.

Do not begin with dozens of microservices.

## Primary bounded contexts

### 1. Identity and Access

Owns:

- users;
- provider staff identities;
- patient identities;
- sessions/authentication;
- organizations/tenants;
- roles and relationship-based access;
- delegated/family access;
- consent grants/revocations;
- service accounts/API credentials.

Potential references: ZITADEL, Keycloak, OpenFGA, OPA, Infisical.

### 2. Provider Graph

Owns:

- organizations;
- facilities;
- branches/locations;
- practitioners;
- practitioner roles;
- specialties/subspecialties;
- services;
- insurance-network participation;
- languages;
- modalities;
- verification status;
- provenance/freshness.

This is the canonical healthcare discovery graph.

### 3. Geo

Owns:

- coordinates;
- normalized addresses;
- service areas;
- proximity/travel-distance inputs;
- geocoding provenance;
- map clustering/index support.

PostgreSQL + PostGIS should be the default system of record for geometry.

The detailed canonical renderer/basemap/geocoder/router/3D/privacy contracts are defined in `docs/canonical/ZYARA_GEOSPATIAL_PLATFORM_PLAN_2026-09-22.md`. MapLibre is the preferred 2D renderer candidate, OpenFreeMap is the first open basemap candidate, and geocoding/routing remain separately qualified adapters.

Saudi adapter candidates include National Address APIs for address search/geocode/POI data where terms and access allow.

### 4. Search and Discovery

Owns:

- denormalized public discovery documents;
- multilingual analyzers/synonyms;
- autocomplete;
- semantic-intent mapping;
- filter facets;
- ranking features;
- query telemetry;
- search-result explanations.

Recommended architecture:

- PostgreSQL/PostGIS = source of truth;
- Meilisearch or evaluated equivalent = low-latency text/faceted public index;
- optional vector store/pgvector for semantic retrieval where benchmarked useful;
- search index is rebuildable and never the only source of truth.

### 5. Scheduling and Booking

Owns:

- schedules;
- slots;
- visit reasons;
- appointment requests;
- confirmed appointments;
- cancellation/reschedule;
- waitlist;
- booking rules;
- external scheduling adapter state.

Define a provider-neutral integration interface:

- list availability;
- hold slot where supported;
- create appointment;
- update/cancel appointment;
- fetch appointment;
- sync practitioners/locations/visit reasons;
- idempotency and external correlation IDs.

### 6. Reviews and Trust

Owns:

- review eligibility;
- review content;
- moderation state;
- disputes;
- provider responses;
- aggregate scores;
- fraud/risk signals;
- verification labels.

Review eligibility should consume booking/encounter evidence rather than accept arbitrary public submissions by default.

### 7. Patient Journey

Owns patient-facing continuity:

- timeline;
- care team references;
- follow-ups;
- reminders;
- patient-entered items;
- imported clinical references;
- provenance.

Clinical data should use FHIR-aligned representations or mappings rather than an unstructured proprietary “history” table.

### 8. Interoperability

Owns external healthcare connectivity:

- FHIR clients/servers/adapters;
- HL7 v2 where required;
- provider-specific HIS/EHR/PMS adapters;
- webhook ingestion;
- mapping/versioning;
- synchronization state;
- consent checks;
- integration audit.

Potential healthcare references: Medplum, HAPI FHIR, OpenEMR, OpenMRS, Bahmni, Synthea, OHIF.

### 9. Notifications

Owns templates, localization, consent/preferences, channel routing and delivery state for:

- push;
- email;
- SMS;
- WhatsApp;
- in-app inbox.

Channels are adapters. Product workflows should emit notification intent, not call vendors directly.

### 10. Provider Analytics

Owns event models and aggregated provider-facing metrics.

Recommended separation:

- immutable analytics event stream/log;
- privacy-filtered warehouse/analytical store;
- provider dashboards/reports;
- no direct dashboard querying of high-sensitivity transactional tables.

References: PostHog, Superset, Umami, Nao.

### 11. AI Orchestration

Owns:

- intent extraction;
- conversation state;
- tool calling;
- retrieval;
- provider-result explanation;
- clinical safety classifiers/rules;
- model routing;
- prompt/version registry;
- evaluations;
- AI audit metadata.

AI does not own provider facts, appointment truth or clinical records. It retrieves them through deterministic tools and must cite/attribute structured facts internally.

### 12. Provider Operations

Owns:

- onboarding;
- claiming;
- roster management;
- staff administration;
- integrations;
- reports;
- subscription entitlements;
- support/dispute workflows.

## Proposed repository shape

Astro should refine, but a starting monorepo could be:

```text
/apps
  /web                 # public patient web + provider web shell
  /api                 # modular backend
  /worker              # async/durable jobs
  /mobile              # later React Native/Expo or equivalent
/packages
  /domain               # shared domain types/contracts
  /db                   # schema/migrations/repositories
  /fhir                 # FHIR mappings and adapters
  /search               # indexing/query/ranking contracts
  /geo                  # geospatial contracts
  /integrations         # provider/channel adapters
  /ai                   # AI tool schemas/evals/safety
  /analytics            # event taxonomy and metrics
  /i18n                 # locales/taxonomy translations
  /ui                   # accessible design system
  /config               # typed configuration
/docs
  ...
```

## Suggested foundation stack

The final choice requires ADRs, but the planning default is:

- web: TypeScript + React + an SSR/SEO-capable framework;
- API: TypeScript modular backend unless performance/regulatory constraints justify another runtime;
- database: PostgreSQL;
- geo: PostGIS;
- cache/rate limits: Redis-compatible store;
- search: Meilisearch evaluated against healthcare multilingual requirements;
- durable workflows: Temporal evaluated for bookings/integrations/reminders;
- object storage: S3-compatible abstraction;
- observability: OpenTelemetry + Prometheus-compatible metrics;
- secrets: managed secret store; Infisical is a donor/reference candidate;
- analytics: explicit event pipeline with PostHog/Superset patterns;
- feature flags: Flagsmith or equivalent.

## Data separation

At minimum distinguish:

1. **Public discovery data** — provider/facility facts safe to index publicly.
2. **Provider tenant operational data** — schedules, staff, analytics, integrations.
3. **Patient account data** — identity, preferences, appointments.
4. **Sensitive health data** — clinical/timeline content.
5. **Analytics data** — minimized/pseudonymized events with controlled joins.
6. **AI telemetry** — prompts/tool traces redacted/minimized by policy.

Do not place these in a single unrestricted access model.

## Events

Define domain events early, for example:

- `provider.claimed`
- `provider.verified`
- `profile.updated`
- `availability.changed`
- `appointment.requested`
- `appointment.confirmed`
- `appointment.cancelled`
- `appointment.completed`
- `review.eligible`
- `review.submitted`
- `review.moderated`
- `followup.created`
- `notification.requested`
- `integration.sync_failed`
- `consent.granted`
- `consent.revoked`

Each event needs versioning, idempotency rules and sensitive-data classification.

## Reliability rules

- booking writes must be idempotent;
- external integration failures must not silently create duplicate appointments;
- public search index must be rebuildable;
- provider verification changes must propagate to search quickly;
- patient data writes require auditability;
- notification delivery must be retriable and deduplicated;
- AI calls must time out/fail safely without corrupting transactional state.

## Synthetic data first

Use synthetic provider and patient datasets for development and automated testing. Synthea is a preferred healthcare-data reference. Production health data must never be copied into routine developer fixtures.
