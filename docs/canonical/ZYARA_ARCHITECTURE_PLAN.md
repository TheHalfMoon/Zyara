# Zyara architecture plan

Canonical planning decisions, checked 2026-09-13. Architecture owner. All module names below are proposed, not existing application files. [Scheduling](ZYARA_APPOINTMENT_SYSTEM_PLAN.md) controls booking semantics; [data model](ZYARA_DATA_AND_FHIR_MODEL.md) controls mappings.

## Deployment shape

Start with a TypeScript modular monolith: Next.js/React web application, a Fastify API process and a worker process sharing versioned domain packages. Use an actively supported Node LTS selected and pinned by M001 after license/dependency review. Separate API from server-rendered presentation so patient/provider/mobile/voice clients share exactly the same authorized commands. Web server actions cannot bypass the API/domain boundary.

PostgreSQL with PostGIS is durable truth. PostgreSQL-backed outbox/inbox and pg-boss are the proposed job substrate; a queue message is a wakeup, never the only record of a hold/recall. OpenSearch is the proposed nonauthoritative search projection, subject to the bounded M010 relevance/cost gate; PostgreSQL text/trigram is the explicit fallback for a small pilot. MapLibre is a rendering candidate subject to component license check; licensed tiles/geocoding/routing are separate procurements. No default public tile server is a production SLA.

Public edge/CDN serves public graph content only. Authenticated APIs, patient HTML, medical documents and operational caches are private/no-store. Managed Saudi-region database, compute, object store, secrets/KMS and backups are the planning preference; actual vendor/region/service-level availability, contracts and transfers require M003 approval. No cloud region or residency certification is presumed.

### Runtime boundaries

| Context / schema | Owns | Commands / queries | Domain events and extraction path |
|---|---|---|---|
| Identity / identity | Subject, contact verification, session linkage; no medical chart | VerifyContact, LinkSubject, RevokeSession | SubjectLinked; use external OIDC, keep product IDs stable |
| Tenant / tenancy | Membership, branch scopes, service principals, entitlements | GrantRole, ListMemberships | MembershipChanged; future shared identity service |
| Provider Graph / graph | Organizations, places, practitioners, roles, services, assertions | UpsertAssertion, ResolveProvider, SearchableProjection | GraphAssertionChanged; future graph import worker |
| Verification / verification | Evidence, reviewer decision, expiry, disputes | VerifyCredential, SuspendService | VerificationChanged; trusted adjudication boundary |
| Availability / scheduling | Versioned resource rules, candidates, reservation ledger | FindCandidates, Hold, BlockTime | CapacityChanged, HoldExpired; extract only with single authoritative writer |
| Appointment / scheduling | Booking lifecycle, operations, policy snapshots | Book, Modify, Cancel, CheckIn | AppointmentBooked/Cancelled/Fulfilled; same transaction as reservations |
| Integration / integration | Credentials refs, adapter contracts, inbox, cursors, external IDs | DispatchCommand, IngestEvent, Reconcile | ExternalOutcomeResolved; isolate per-tenant adapters later |
| Patient / patient | Minimal demographics, patient-to-account/delegate bindings | CreatePatient, RequestCorrection, GrantDelegate | PatientBindingChanged; separate from clinical timeline |
| Review / trust | Eligibility, text/dimensions, moderation, replies/disputes | SubmitReview, Appeal, PublishReply | ReviewPublished/Corrected; public projection has no patient ID |
| Notification / communication | Preferences, templates, delivery, quiet hours | ScheduleMessage, SuppressMessage | NotificationDelivered/Failed; can extract delivery workers |
| AI / navigation | Typed intent and approved knowledge versions | Navigate, ExplainOptions | NavigationOutcome (minimized); no direct DB writes |
| Voice / voice | Ephemeral audio processing and transcript correction | Transcribe, ConfirmTranscript | No raw-audio event; scale private inference separately |
| Analytics / analytics | Minimized events and aggregates, metric definitions | RecordEvent, ClinicReport | AggregateReady; warehouse only when justified |
| Subscription / commerce | B2B plans, invoices/provider entitlements | ChangePlan, ReadEntitlements | EntitlementsChanged; billing does not own ranking |
| Clinical Interop / clinical | Consent-scoped imported timeline/provenance | ImportClinicalItem, ReadTimeline, RevokeAccess | ClinicalImportRecorded; physically isolate when enabled |
| Audit / audit | Append-only decisions/access metadata | AppendAudit, AuthorizedAuditQuery | Restricted audit export; never event-bus PHI dumping |

Schema separation is an organizational aid, not an authorization guarantee. Application roles, row-level security, scoped storage policies and service ownership enforce boundaries. No module directly updates another module's tables except a documented transaction coordinator for Scheduling/Appointment. Read projections use published queries/views. Unit-of-work boundaries and import rules are lintable in M004.

## Commands, queries and API contracts

Public read endpoints expose verified public projections and coarse patient-free availability; protected endpoints require identity/purpose and tenant resolution from trusted context. Representative future routes: GET /v1/providers, GET /v1/services/:id/candidates, POST /v1/booking-operations, GET /v1/booking-operations/:id, POST /v1/appointments/:id/cancel, POST /v1/appointments/:id/reschedule, POST /v1/waitlist-offers/:id/accept. Route names do not imply implementation now.

Mutation contracts require idempotency key, expected version when changing existing data, explicit patient/delegate, exact accepted details and locale/zone. Return a stable outcome enum: succeeded, rejected, needs_input, needs_reconfirmation, pending_external. Use opaque error codes and localized safe messages. HTTP 200 alone does not mean booked. A 202 operation is explicitly pending; unknown external outcomes have a resolvable operation reference.

Validate schemas at the edge and domain boundary. Pagination has stable cursors and maximum windows. Provider embedded booking is origin allowlisted and cannot inherit admin credentials; public API keys never authorize patient writes. Authorization evaluates subject, tenant, branch, relationship, purpose and resource classification.

Events use event_id, schema_version, aggregate_version, tenant, occurred_at, recorded_at, correlation and minimal payload. Transactional outbox is at-least-once. Consumers persist idempotency and reject/quarantine incompatible schema versions. Cross-tenant aggregate keys include tenant. Tombstones and revocations propagate to projections. An outbox replay must not resend a consumed patient reminder.

## ADR register

All decisions are accepted for planning; where a gate is specified, production enablement is conditional on evidence, not an unresolved default.

| ADR | Decision | Alternatives and Zyara rationale | Revisit trigger / owner |
|---|---|---|---|
| A01 | Modular monolith, separate worker | Services add distributed failure before product evidence | Independent scaling/ownership measured; architecture |
| A02 | TypeScript, Next.js/React + Fastify | Whole EHR/framework donor too broad; explicit backend keeps all clients consistent | Team constraints or measured bottleneck; engineering |
| A03 | PostgreSQL | Transactional resources, provenance and tenant controls require relational integrity | Partition/replica pressure after optimization; database |
| A04 | PostGIS; geography distance and spatial indexes | Browser distance and generic text locations inadequate | Routing provider changes; search |
| A05 | OpenSearch projection, PG fallback at M010 | Arabic analyzers/control useful; compare Meilisearch and PG on a fixed corpus instead of claiming a winner without data | Cost/relevance gate; search |
| A06 | Transactional outbox/inbox + pg-boss | Kafka/Temporal premature; DB timers remain durable if worker absent | Long-running flow volume/operational evidence; platform |
| A07 | Native scheduling ledger with explicit resources | Cal.com/EHR fork mismatches healthcare rules and authority | Partner-only business model change; scheduling |
| A08 | Hybrid candidates + dynamic commit recheck | Full slot expansion wastes space; purely dynamic search can be expensive | Measured candidate latency; scheduling |
| A09 | Exclusion constraints + ordered locks + idempotency | Redis-only lock cannot enforce every writer | Resource capacity model change; database |
| A10 | Internal domain, FHIR R4 boundary first; R5 adapter later | Direct FHIR mirroring loses operational distinctions | Contracted partner requires R5; interoperability |
| A11 | Capability vector and explicit per-field authority | A clinical API “level” does not guarantee booking writes | Every adapter onboarding; interoperability |
| A12 | OIDC provider abstraction; Keycloak deployment candidate | Avoid bespoke authentication; compare approved hosted OIDC for actual Saudi availability/ops | M002/M003 vendor review; identity |
| A13 | Domain authorization + PostgreSQL RLS; delegation graph modeled now | OpenFGA later if relationship complexity warrants; no universal admin medical access | Policy complexity test burden; security |
| A14 | Minimized event schema + PostgreSQL aggregates | Raw PostHog/session replay and broad health-query capture excessive | Aggregate volume exceeds agreed budget; data |
| A15 | Notification orchestrator + replaceable channel vendors | Direct send in booking transaction creates duplicate/loss coupling | Channel capability/local regulation; operations |
| A16 | Typed AI provider abstraction, no direct patient-data RAG by default | Vendor-specific state and unrestricted tools complicate safety/residency | Evaluated model change; AI safety |
| A17 | ASR abstraction, private-first measured fallback | Desktop dictation donors do not prove Arabic clinical entity accuracy | Saudi dialect/entity gate; voice |
| A18 | Internal sandbox only, ephemeral and denied egress by default | Multi-agent execution unnecessary for booking | Explicit approved internal use case; security |
| A19 | S3-compatible private object storage, quarantine and signed access | Database blobs and public buckets unsuitable for documents | Residency/scanning constraints; platform |
| A20 | OpenTelemetry/Prometheus, allowlisted attributes | Full request/prompt capture exposes health data | On-call evidence gap; SRE |
| A21 | Responsive web/PWA first, five-locale design system | Separate native apps increase early scope | Measured mobile needs/ASR performance; product |
| A22 | Minimal delegate scheduling before sensitive family timeline | Shared family accounts create access leakage | Saudi legal basis and guardian evidence approved; privacy |
| A23 | Free patients, B2B entitlements outside organic ranking | Booking commissions contradict founder economics | Founder business change only; product |
| A24 | Attendance-linked review eligibility with independent appeal | Provider attendance alone can suppress legitimate complaints | Fraud and dispute evidence; trust |
| A25 | No copied platform code in this mission; narrow dependencies | Founder permission is not license/security qualification | Per-component reuse record completed; engineering |
| A26 | One Saudi catchment pilot; country/zone/currency/profile fields now | Country launch is an operating/regulatory gate, not translation switch | Country-specific launch dossier; operations |

[OpenSearch Arabic analyzer](https://docs.opensearch.org/latest/analyzers/language-analyzers/arabic/) is official technical evidence checked 2026-09-13, high confidence in documented capability, no benchmark performed. Source pins and license uncertainties for all candidates are in [qualification](ZYARA_SOURCE_QUALIFICATION.md).

## Reliability, deployment and extraction

Proposed pilot service objectives: public search p95 under 800 ms server time; native booking p95 under 2 s excluding user input; API availability 99.9% monthly; outbox age p95 under 30 s; resource release visible within 60 s. These are budgets to validate, not measured results. External booking follows its partner SLA; after 10 s synchronous wait show pending, reconcile within a proposed five-minute operational target and escalate unresolved work by 15 minutes. A timely honest pending outcome is preferable to fabricated success.

Deploy signed, scanned immutable images, least-privilege roles, secret references and expand/contract migrations. Database constraint migration is tested on a representative fixture and never disabled during rollout. Feature flags separately control tenant, service, channel, AI and adapter versions. Kill switches stop new commands while allowing read/status/cancel recovery as supported.

Backups are encrypted and restoration rehearsed into isolated nonproduction access. Initial RPO target 5 minutes and RTO 2 hours need vendor confirmation and restore evidence. Booking operation/outbox/inbox tables belong in the recovery consistency unit. After restore, reconcile external operations before enabling new writes; do not reissue old creates from queue replay.

Scale search independently; partition append-heavy events/audits when measured. Do not shard native reservations across transaction domains until multi-resource invariants can be preserved. Candidate computation can move to workers while commit revalidation stays with scheduling authority. Extract adapters/voice first if isolation or capacity needs arise. Clinical data may use a separate database and keys at P10; event bus carries references and authorization context only.

Open risks: hosting procurement, actual integration contracts, correct patient/delegate binding, projected search cost, messaging deliverability and sustainable on-call staffing. Their closure owners and gates are in the [master plan](ZYARA_CANONICAL_BUILD_PLAN.md).
