# Dependency-Ordered Product Roadmap

This roadmap is designed so Astro can turn it into issues/milestones after architecture discovery. Dates are intentionally not assigned before sizing.

## Phase 0 — Foundation and governance

Deliver:

- architecture decision records;
- monorepo/tooling;
- typed configuration;
- environments;
- CI checks;
- database migration discipline;
- observability skeleton;
- localization framework with Arabic RTL proof;
- identity/tenant/role model;
- source/provenance ledger;
- security/privacy threat model;
- synthetic data strategy;
- analytics event taxonomy;
- AI tool permission model;
- secure sandbox policy for any agent/code execution;
- voice/audio data-classification and retention policy.

Exit gate:

- one-command local dev;
- CI reproducible;
- no production secrets in repo;
- Arabic/English shell proven;
- baseline authorization tests;
- donor adoption process documented;
- sandbox workloads cannot obtain unrestricted production credentials or patient-store access.

## Phase 1 — Provider graph and public discovery foundation

Deliver:

- organizations/facilities/branches;
- practitioners/practitioner roles;
- specialties/services;
- languages;
- insurance representations;
- geo/address model;
- verification/provenance state;
- provider profile pages;
- public SEO basics;
- import/admin tooling using synthetic/approved data.

Exit gate:

- provider graph can represent hospital → branch → department/service → practitioner relationships;
- provenance/freshness visible internally;
- no sensitive patient data required.

## Phase 2 — Search and healthcare map

Deliver:

- multilingual index;
- Arabic synonyms/transliteration;
- autocomplete;
- list/map synchronization;
- geo filters/radius;
- specialty/service/insurance/language filters;
- map clusters/cards;
- ranking baseline;
- result-reason telemetry.

Exit gate:

- benchmark suite for relevance in Arabic and English;
- map/search latency targets met;
- search results explainable from indexed facts.

## Phase 3 — Provider claiming and verification

Deliver:

- claim workflow;
- organization representatives;
- staff roles;
- practitioner roster;
- Saudi verification adapter design;
- profile attestation;
- periodic re-verification/freshness workflow;
- fraud/dispute operations.

Exit gate:

- verified and unverified facts are distinguishable;
- unauthorized claim attempts are tested;
- provider changes are audited.

## Phase 4 — Booking core

Deliver:

- visit reasons;
- schedules/slots;
- Zyara-managed availability;
- book/reschedule/cancel;
- waitlist;
- reminders;
- booking idempotency;
- patient appointment history;
- provider scheduling UI.

Exit gate:

- duplicate booking protections proven;
- cancellation/reschedule race conditions tested;
- no patient booking fee workflow.

## Phase 5 — Reviews and trust loop

Deliver:

- review eligibility from completed attendance;
- review invitations;
- rating dimensions;
- comments;
- moderation;
- provider reply;
- disputes;
- aggregate confidence/volume handling;
- anti-fraud signals.

Exit gate:

- arbitrary unauthenticated review insertion blocked;
- provider cannot delete compliant negative reviews;
- moderation actions audited.

## Phase 6 — Provider analytics and subscriptions

Deliver:

- event pipeline;
- discovery funnel;
- booking funnel;
- practitioner/service analytics;
- demand gaps;
- review trends;
- monthly reports;
- plan entitlements;
- subscription administration without affecting organic ranking.

Exit gate:

- metrics definitions documented;
- tenant isolation tested;
- low-volume privacy thresholds for benchmarks.

## Phase 7 — AI navigation v1

Deliver:

- text intent extraction;
- safe specialty/service navigation;
- structured search tool calls;
- result explanations;
- multilingual evaluation harness;
- urgent/red-flag escalation;
- model/prompt versioning;
- abstention behavior;
- approved-source retrieval/RAG with provenance where needed.

Exit gate:

- safety benchmark passes agreed thresholds;
- hallucinated provider/availability/insurance facts blocked by tool-first design;
- Arabic evaluation included;
- retrieval-backed claims preserve source provenance;
- arbitrary code/tool execution is not available to patient-navigation AI.

## Phase 7A — Voice navigation and secure agent runtime

Deliver voice only after the text pathway is proven:

- microphone permission and explicit recording-state UX;
- ASR provider abstraction;
- local/private ASR option using OpenWhispr/OpenSuperWhisper patterns where practical;
- optional approved cloud-ASR adapters;
- Arabic, English, French, German and Spanish transcription support;
- Arabic/English code-switching evaluation;
- transcript confidence and correction workflow;
- transcript/provider/model provenance;
- raw-audio retention controls with no-retention default when audio is unnecessary;
- optional spoken response/TTS after transcription flow is stable.

Deliver secure AI execution separately:

- OpenSandbox-style isolated workload contract;
- deny-by-default or allowlisted egress policy;
- scoped/ephemeral credentials;
- typed tool schemas and audit fields;
- timeout, cleanup and resource-budget controls;
- human approval gates for destructive/high-impact operations;
- internal-agent orchestration patterns informed by Munder Difflin/fullstack-agent;
- circuit breakers for loops, repeated failures and budget exhaustion.

Exit gate:

- text and voice share the same canonical safety/search/booking pipeline;
- supported-language ASR benchmarks exist;
- patient audio/transcript handling matches consent and privacy policy;
- sandbox isolation, egress and cleanup failure cases are tested;
- no unconstrained multi-agent workflow can make an autonomous patient-facing clinical recommendation;
- sensitive agent actions are reconstructable from audit logs.

## Phase 8 — Integration platform

Deliver:

- provider-neutral scheduling adapter contract;
- external IDs/correlation;
- webhooks;
- sync jobs;
- failure queues/reconciliation;
- calendar connector(s);
- first HIS/EHR/PMS integration;
- enterprise integration monitoring.

Exit gate:

- external downtime does not create duplicates;
- retries/reconciliation tested;
- integration audit available to provider admins.

## Phase 9 — Patient health timeline

Deliver:

- FHIR-aligned timeline store/mappings;
- patient-entered history;
- provider/imported clinical references;
- medications/allergies/observations/documents;
- follow-up tasks;
- provenance labels;
- export/access controls.

Exit gate:

- sensitive-data authorization tested independently of booking permissions;
- imported records retain source/version provenance;
- AI cannot access timeline without proper scope.

## Phase 10 — Family/dependent care

Deliver:

- guardian/dependent model;
- delegated permissions;
- age transitions;
- consent and revocation;
- family appointment/timeline UX.

Exit gate:

- no shared-password model;
- relationship permission tests cover edge cases.

## Phase 11 — Enterprise scale and expansion

Deliver as evidence demands:

- SSO;
- custom policy controls;
- multi-hospital groups;
- analytics exports;
- SLAs;
- country adapters;
- French/German/Spanish launch completion;
- international provider verification/insurance/map adapters;
- enterprise ASR/model policy controls;
- sandbox/runtime policy controls for provider/internal copilots.

## Pilot strategy

Start in a bounded Saudi geography/provider cohort rather than “all healthcare everywhere” on day one.

Pilot should prove:

- provider onboarding cost;
- profile accuracy;
- search relevance;
- patient conversion;
- no-show/reminder impact;
- review participation;
- clinic willingness to pay;
- integration economics;
- AI navigation safety/usefulness;
- voice transcription quality for Saudi Arabic and Arabic/English code-switching before broad voice rollout.

## North-star and guardrail metrics

### Patient north-star candidates

- successful care connection rate;
- time from intent to confirmed appropriate appointment;
- percentage of searches ending in useful action.

### Provider value metrics

- qualified booking conversion;
- incremental bookings;
- reduced call-center/manual scheduling burden;
- reduced no-show rate;
- improved profile completeness/availability accuracy.

### Trust/safety guardrails

- incorrect availability rate;
- insurance mismatch reports;
- provider-data dispute rate;
- verified-review fraud rate;
- AI unsafe-routing rate;
- voice transcript correction/error rate for medical intent;
- unauthorized tool/sandbox access attempts;
- sandbox policy violations;
- privacy/security incidents;
- booking duplicate/error rate.

Do not optimize raw clicks, agent autonomy, or conversational smoothness at the expense of care relevance, privacy, or trust.
