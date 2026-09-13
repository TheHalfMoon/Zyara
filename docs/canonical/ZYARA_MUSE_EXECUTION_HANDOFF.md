# Zyara Muse execution handoff

Canonical planning handoff, 2026-09-13. **Start with M001.** This mission has implemented no product code. All 60 tasks below are planned; no task is represented as built, tested or verified. Base repository SHA: 0c4d47bc61fabc3c4a657d44cb8c0f83156af744. Recheck live repository and user changes before execution.

Read [master plan](ZYARA_CANONICAL_BUILD_PLAN.md), [architecture](ZYARA_ARCHITECTURE_PLAN.md), [appointment plan](ZYARA_APPOINTMENT_SYSTEM_PLAN.md), [privacy](ZYARA_PRIVACY_SECURITY_COMPLIANCE_PLAN.md) and the relevant task context. Preserve free patients/no commissions/no paid organic rank, five first-class locales, Arabic RTL, typed AI facts/actions, tenant/patient privacy and source provenance.

## Execution protocol and SpecGrain adaptation

The [machine-readable contracts](../research/muse-task-contracts.json) are the same tasks as this document. Phase/slice grouping is decomposition; dependencies are a separate acyclic graph. The [SpecGrain qualification](ZYARA_SOURCE_QUALIFICATION.md) records the pinned optional source. We adopt bounded scope and independent evidence methods, not an unverified CLI workflow or a product runtime dependency.

Before a task becomes ready, Muse must bind task/plan revision digests, base Git SHA, dependency evidence, allowed change surface, acceptance checks, risk/recovery, selected context and source pins in an immutable work packet. Estimate context size and refine work that cannot be reviewed independently. M039 and M054 explicitly need transport/feature child packets before execution; keep their parent acceptance coverage and stable child IDs such as M039.1. Do not count a decomposed parent and its children as separate completed outcomes.

Run only authorized checks against synthetic/local or explicitly contracted partner environments. Observe changed paths and actual test results independently of the executor summary. Evidence must bind task digest, work-packet digest, result digest, implementation SHA, environment/tool versions, commands, test output, scope review, residual risks and verifier. Hashes establish binding, not semantic correctness. A task is done only when its acceptance is satisfied; real-data or partner gates can remain blocked while unrelated synthetic tasks proceed.

Recovery instructions are per task. Revisit evidence after material task/source/implementation changes. Do not make repeated tests a substitute for closing a known failure. Do not deploy, contact providers, obtain paid services or publish beyond separately authorized execution scope merely because a future task describes that work.

## Reference key

A01–A26 refer to the [ADR register](ZYARA_ARCHITECTURE_PLAN.md). S001–S115 refer to [source qualification](ZYARA_SOURCE_QUALIFICATION.md); C01–C44 to [competitor intelligence](ZYARA_COMPETITOR_INTELLIGENCE.md); R01–R20 to [requirements](ZYARA_PRODUCT_REQUIREMENTS.md). FHIR/HL7/POSTGRES refer to official sources cited in the appointment/data plan. GOV refers to the government/vendor evidence table in privacy. WCAG and AI-PAPER refer to official W3C and Casablanca evidence in the AI/product plans. RANKING refers to the prohibited-input and explanation contract in the AI/search plan. R20 in source_refs means the test/evidence release contract, not an external source.

## Phases and slices

[Roadmap](ZYARA_ROADMAP.md) defines 12 phases, 24 slices and measurable exit gates. Tasks with future partner/legal requirements are designed for execution once those gates are satisfied; this is not a claim all 60 are ready today.

## P00

### S00A

#### M001 — Establish the reproducible synthetic development foundation

- **Objective:** Establish the reproducible synthetic development foundation
- **Rationale:** Muse needs a runnable, bounded baseline before feature work.
- **Dependencies:** None; recheck live baseline first.
- **Likely files/modules:** `apps/web`, `apps/api`, `apps/worker`, `packages/domain`, `packages/contracts`, `infra/dev`, `.github/workflows`, `docs/evidence/M001` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A01, A02, A03, A25, S017, S115
- **Requirement trace:** R14, R20
- **Implementation requirements:** Recheck live branch/worktree and canonical plan digests. Create a minimal TypeScript workspace with Next.js/React web, Fastify API, worker, PostgreSQL/PostGIS dev service and one readiness endpoint. Select supported Node/package-manager versions, lock dependencies, inspect install scripts/advisories/licenses and generate SBOM. Define module import boundaries. Evaluate SpecGrain compatibility as optional method tooling; no native state/CLI claims unless separately verified.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Clean checkout installs from lockfile and starts local synthetic stack; 2. Readiness distinguishes unavailable database from healthy process; 3. CI runs type/lint/focused smoke checks and records exact versions
- **Tests:** Clean-environment startup and DB-down readiness; Dependency/advisory/secret scan and import-boundary check
- **Security/privacy:** No real PHI or provider secrets; local-only defaults; least-privilege dev credentials not reusable in production.
- **Observability:** Readiness result and build version; no environment/secret dump.
- **Localization:** Create five locale identifiers and RTL direction contract; no feature strings required yet.
- **Failure modes:** Unsupported runtime, failing install script, missing DB, accidental product-scope expansion.
- **Risk/recovery:** medium; raise to high for identity, permissions or reservation changes. Revert this bounded scaffold; preserve founder docs and user changes.
- **Evidence required:** Lockfile/SBOM and license decisions; Startup/CI logs with commands and versions; Observed paths and base/result SHAs; SpecGrain method decision
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

#### M002 — Implement account, tenant and branch authorization primitives

- **Objective:** Implement account, tenant and branch authorization primitives
- **Rationale:** Every later path needs a trustworthy actor and tenant context.
- **Dependencies:** M001
- **Likely files/modules:** `packages/identity`, `packages/authorization`, `apps/api`, `db/migrations` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A12, A13, S077, S078
- **Requirement trace:** R07, R14
- **Implementation requirements:** Integrate OIDC abstraction with Keycloak synthetic realm; model membership/branch roles and account-versus-patient distinction. Add RLS and policy guards; provider/admin MFA contract and session revocation. Keep healthcare identity separate from login.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Cross-tenant/branch reads and writes are denied; 2. Revoked membership loses access on next authorized request; 3. Provider privileged actions require assurance policy
- **Tests:** Tenant/branch policy matrix with synthetic actors; Revocation/session and migration-role isolation tests
- **Security/privacy:** Deny by default; no body-supplied tenant authority; tokens minimized and never logged.
- **Observability:** Authorization-denial codes and membership-change audit.
- **Localization:** Localized authentication/permission errors in five locales; mixed-script names retained.
- **Failure modes:** Stale session, invalid tenant, accidental global administrator clinical access.
- **Risk/recovery:** medium; raise to high for identity, permissions or reservation changes. Disable affected roles/endpoints; revoke sessions and roll back permission migration safely.
- **Evidence required:** Policy matrix/results; RLS fixtures and audit samples
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

### S00B

#### M003 — Complete the Saudi launch governance and data-flow package

- **Objective:** Complete the Saudi launch governance and data-flow package
- **Rationale:** Synthetic implementation can proceed, but real patient launch needs named accountability.
- **Dependencies:** M001
- **Likely files/modules:** `docs/governance`, `docs/privacy`, `docs/safety`, `docs/vendor-register` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A16, A22, A26, GOV
- **Requirement trace:** R07, R14, R19
- **Implementation requirements:** Assign role owners; produce purpose/data-flow inventory, DPIA draft, retention schedule, processor/region inventory, consent/notice drafts, clinical intended-use review and pilot provider agreement. Obtain accountable legal/clinical decisions for actual pilot before M029; record unresolved signoffs as explicit blockers.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Every dataset has purpose/owner/region/retention decision or launch blocker; 2. Clinical navigation and delegate policies have named reviewers; 3. M029 gate can mechanically distinguish approved from pending
- **Tests:** Document completeness/rights-workflow walkthrough; Synthetic emergency/contact and incident tabletop
- **Security/privacy:** No fabricated legal conclusions or transfer exemptions; minimize all proposed processing.
- **Observability:** Versioned approvals, expiry dates and owner action queue.
- **Localization:** Five-locale notice/template inventory and Arabic legal/clinical review requirement.
- **Failure modes:** Unavailable counsel, unapproved hosting, misleading SaMD assumptions or unclear guardian authority.
- **Risk/recovery:** medium; raise to high for identity, permissions or reservation changes. Keep all environments synthetic and disable gated features until actual signoffs.
- **Evidence required:** Signed decisions where available; explicit pending gate register; Data-flow/DPIA and incident tabletop record
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

#### M004 — Enforce module ownership and durable event delivery

- **Objective:** Enforce module ownership and durable event delivery
- **Rationale:** Booking and notifications must survive crashes without duplicate side effects.
- **Dependencies:** M001, M002
- **Likely files/modules:** `packages/domain`, `packages/events`, `apps/worker`, `db/migrations` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A06, A20, S083, S084, S112
- **Requirement trace:** R12, R14, R20
- **Implementation requirements:** Implement transaction unit-of-work, append-only audit interface, outbox/inbox tables, versioned event envelope, scoped consumers and pg-boss wakeups. Keep event data minimal and DB tasks discoverable if queue wakes are lost.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Commit writes domain state and outbox together; 2. Duplicate delivery has one logical effect; 3. Incompatible event version is quarantined
- **Tests:** Crash before/after commit and duplicate consumer tests; Cross-tenant event-routing and worker-restart tests
- **Security/privacy:** No patient text in generic event body; audit reader scoped.
- **Observability:** Outbox age, retry count, dead-letter queue and correlation IDs.
- **Localization:** Stable event codes; localized operator explanations generated at UI.
- **Failure modes:** Worker outage, poison message, consumer replay, lost wakeup.
- **Risk/recovery:** medium; raise to high for identity, permissions or reservation changes. Stop consumers and replay from durable cursor after fix; never bulk resend blindly.
- **Evidence required:** Fault-injection logs; Event/audit schema and consumer contract evidence
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

#### M005 — Deliver the five-locale accessible interface foundation

- **Objective:** Deliver the five-locale accessible interface foundation
- **Rationale:** Arabic and accessibility must shape forms and navigation from the beginning.
- **Dependencies:** M001
- **Likely files/modules:** `apps/web`, `packages/ui`, `packages/i18n`, `tests/accessibility` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A21, WCAG
- **Requirement trace:** R02, R06
- **Implementation requirements:** Build routing/catalogs, logical CSS layout, bidi-safe IDs/phones, date/time/zone formatting, form labels/errors, accessible modal/list/confirmation components and reduced-motion states. Add glossary workflow for clinical terms.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Arabic RTL works without mirrored icons that change meaning; 2. Keyboard/screenreader can complete a synthetic form; 3. All five locales have catalog completeness and date examples
- **Tests:** RTL screenshot/manual screenreader review; Zoom/keyboard/bidi and missing-key checks
- **Security/privacy:** No patient data in visual snapshots; accessible consent cannot be preselected.
- **Observability:** Missing-key telemetry without user inputs; UI error boundary counts.
- **Localization:** Arabic, English, French, German, Spanish; Gregorian canonical with labeled Hijri display option.
- **Failure modes:** Long German labels, mixed Arabic numbers, ambiguous dates, modal focus loss.
- **Risk/recovery:** medium; raise to high for identity, permissions or reservation changes. Revert component changes and keep accessible list/text fallback.
- **Evidence required:** Locale screenshots and accessibility checklist; Human language-review log
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

## P01

### S01A

#### M006 — Create the provider graph and identifier model

- **Objective:** Create the provider graph and identifier model
- **Rationale:** Search quality depends on branch/service/role truth.
- **Dependencies:** M002, M004
- **Likely files/modules:** `packages/graph`, `db/migrations`, `tests/graph` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A03, A04, A10, FHIR, S113
- **Requirement trace:** R03, R10
- **Implementation requirements:** Model organization, location, practitioner, role, service, taxonomy and insurer assertion edges with opaque IDs, effective dates, external namespaces and referential constraints. Include shared schedulable human identity within authorized domain.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. One practitioner can have several branch roles without duplicated identity; 2. Service can exist without a primary doctor; 3. Invalid hierarchy cycles and cross-tenant writes fail
- **Tests:** Graph cardinality/cycle/identifier tests; Synthetic FHIR resource mapping fixtures
- **Security/privacy:** Public versus private evidence fields separated; patient IDs absent.
- **Observability:** Graph integrity failures and source coverage.
- **Localization:** Multilingual labels/aliases preserve original source spelling.
- **Failure modes:** Duplicate names, organization merger, reused external identifier.
- **Risk/recovery:** medium; raise to high for identity, permissions or reservation changes. Reversible migrations; quarantine conflicts rather than destructive merge.
- **Evidence required:** Schema diagram and fixtures; Migration and constraint results
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

#### M007 — Build provenance-aware graph import and correction

- **Objective:** Build provenance-aware graph import and correction
- **Rationale:** Unverified imports need correction and freshness instead of silent overwrites.
- **Dependencies:** M006
- **Likely files/modules:** `packages/graph-import`, `apps/worker`, `apps/api` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A04, A10, S113, GOV
- **Requirement trace:** R03, R13
- **Implementation requirements:** Implement rights/source registry, staged CSV/API import, assertion validity/observed times, field ownership, dedupe suggestions, reviewed merge/unmerge, withdrawal and projection events. Establish refresh queues.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Every material assertion shows source and last check; 2. Conflicting identities require review; 3. Withdrawal and unmerge preserve history and emit projection updates
- **Tests:** Stale assertion and conflicting import tests; Merge/unmerge/id-reuse and malformed batch tests
- **Security/privacy:** No unauthorized scraping; private credential evidence excluded from public projection.
- **Observability:** Import rejects, freshness age and correction queue latency.
- **Localization:** Arabic/transliteration alias conflicts; locale-specific addresses.
- **Failure modes:** Source rights expire, ID changes, clinic closure, partial batch failure.
- **Risk/recovery:** medium; raise to high for identity, permissions or reservation changes. Rollback batch via assertion supersession; never erase historical IDs.
- **Evidence required:** Import validation reports; Provenance/correction audit and rights inventory
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

### S01B

#### M008 — Implement provider claiming and verification workflow

- **Objective:** Implement provider claiming and verification workflow
- **Rationale:** A public badge must mean a specific checked fact.
- **Dependencies:** M005, M007
- **Likely files/modules:** `packages/verification`, `apps/web/provider`, `apps/api` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** GOV, A24
- **Requirement trace:** R03, R13, R17
- **Implementation requirements:** Verify authorized representative, role registration and facility/service evidence; states pending/attested/checked/disputed/expired/withdrawn. Add reviewer queue, recheck cadence and claim disputes. Block booking for mandatory expired credentials.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Badge describes evidence scope; 2. Expiry/suspension disables affected service supply; 3. Claim dispute cannot hand control to an unverified actor
- **Tests:** Reviewer-role/expiry and competing-claim tests; Public projection evidence-redaction tests
- **Security/privacy:** Verification files private, access audited; sales cannot override decisions.
- **Observability:** Review turnaround, expiring evidence and blocked services.
- **Localization:** Arabic names/official evidence support; five-locale badge explanations.
- **Failure modes:** Stolen claim, outdated registration, role privilege absent.
- **Risk/recovery:** medium; raise to high for identity, permissions or reservation changes. Freeze sensitive edits, remove unsupported badge and preserve appeal trail.
- **Evidence required:** Synthetic claim/expiry walkthrough; Verification policy and audit
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

#### M009 — Build service and practice onboarding configuration

- **Objective:** Build service and practice onboarding configuration
- **Rationale:** Safe booking requires service-specific configuration before hours look bookable.
- **Dependencies:** M006, M008
- **Likely files/modules:** `packages/services`, `apps/web/provider`, `packages/contracts` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A07, A11, C10, C13, GOV
- **Requirement trace:** R10, R17
- **Implementation requirements:** Collect all organization/branch/role/service/insurance/contact/accessibility fields plus appointment types, durations, buffers, intake/policy versions and integration ownership. Separate completeness scores from mandatory blockers.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Missing duration/resource/authority blocks publish; 2. Insurance acceptance is branch/network/service dated; 3. Synthetic receptionist can configure initial and follow-up types
- **Tests:** Required-field and role-permission tests; Partial onboarding save/resume and expired assertion tests
- **Security/privacy:** Restrict patient intake fields; public profile never exposes private evidence.
- **Observability:** Completeness blocker counts and time-to-ready.
- **Localization:** Five-locale service labels and Arabic-native form review.
- **Failure modes:** False completeness score, unsupported service privileges, wrong coordinates.
- **Risk/recovery:** medium; raise to high for identity, permissions or reservation changes. Unpublish affected service version and restore prior approved configuration.
- **Evidence required:** Completed synthetic provider configuration; Blocker/permission evidence
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

#### M010 — Run the fixed search-engine and cost decision benchmark

- **Objective:** Run the fixed search-engine and cost decision benchmark
- **Rationale:** Choose an engine using Saudi multilingual retrieval needs.
- **Dependencies:** M006, M007
- **Likely files/modules:** `experiments/search`, `docs/evidence/M010`, `packages/search-contract` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A05, S017, S082, S103, S104
- **Requirement trace:** R02, R04, R20
- **Implementation requirements:** Compare PostgreSQL baseline, OpenSearch candidate and license-qualified Meilisearch community scope on the same >=300 judged intents. Record top-5 relevance, locale gaps, name/alias precision, geofilter correctness, p95 latency and projected pilot cost. Adopt OpenSearch only if target and approved cost budget pass; otherwise PG baseline and dated revisit.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. One engine chosen with scored tradeoff and reproducible corpus; 2. No unsupported benchmark claims; 3. Five-locale/Arabic subgroup results and failure samples included
- **Tests:** Held-out retrieval and geospatial correctness; Repeated warm/cold latency with documented environment
- **Security/privacy:** Synthetic/public rights-cleared data; no live symptom logs.
- **Observability:** Benchmark environment/version and metrics, not cherry-picked averages.
- **Localization:** Arabic forms/transliteration and all five locale cohorts.
- **Failure modes:** License gate fails, overstemming names, missing insurer branch, cost exceeds budget.
- **Risk/recovery:** medium; raise to high for identity, permissions or reservation changes. Keep PG fallback; preserve corpus and failed results for review.
- **Evidence required:** Corpus/judgments and run logs; ADR A05 decision and package/license record
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

## P02

### S02A

#### M011 — Implement structured search and transparent ranking

- **Objective:** Implement structured search and transparent ranking
- **Rationale:** Patients need relevant care options without knowing a provider name.
- **Dependencies:** M005, M010, M009, M003
- **Likely files/modules:** `packages/search`, `apps/api`, `apps/web/search` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A05, A23, RANKING, C02, C19
- **Requirement trace:** R01, R02, R04
- **Implementation requirements:** Index approved public projections; support names/specialty/service/location/insurer/language/accessibility, curated symptom navigation only under M003 policy. Separate hard constraints from preferred filters and best/soonest/nearest sorts; explain unknowns and zero results.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Paid tier never influences organic score; 2. Unknown insurance is not guaranteed coverage; 3. Filter relaxation requires patient choice
- **Tests:** Ranking invariant and search relevance regression; Expired/withdrawn projection and empty-result tests
- **Security/privacy:** No raw free-text query retention by default; public cache excludes patient context.
- **Observability:** Redacted intent categories, zero-results and index freshness.
- **Localization:** Five-locale aliases and RTL search/filter controls.
- **Failure modes:** Stale index, unsafe synonym mapping, hidden preference relaxation.
- **Risk/recovery:** medium; raise to high for identity, permissions or reservation changes. Disable affected query expansion; deterministic name/service search remains.
- **Evidence required:** Search fixture results; Ranking input allowlist and explanation screenshots
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

#### M012 — Deliver trustworthy profiles and accessible map/list discovery

- **Objective:** Deliver trustworthy profiles and accessible map/list discovery
- **Rationale:** Patients must understand where care occurs and what is verified.
- **Dependencies:** M005, M008, M011
- **Likely files/modules:** `apps/web/profiles`, `apps/web/map`, `packages/geospatial` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A04, A21, S104, C29
- **Requirement trace:** R03, R04, R06
- **Implementation requirements:** Build branch/service/provider profiles, evidence freshness, entrance/accessibility, insurer caveats, booking-mode labels and synchronized map/list. Qualify tiles/geocoding terms separately from renderer. Browsing remains anonymous.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. List offers all map actions; 2. Verified fields display exact scope/freshness; 3. Precise location permission is optional
- **Tests:** Map/list filter parity and geospatial fixtures; Keyboard, low-bandwidth and location-denied tests
- **Security/privacy:** No home/patient locations in public indexes or URLs.
- **Observability:** Profile/directions/phone clicks as distinct minimized events.
- **Localization:** Native Arabic layout, multilingual names and unambiguous address/date formats.
- **Failure modes:** Wrong branch pin, tile outage, unverified price or insurance.
- **Risk/recovery:** medium; raise to high for identity, permissions or reservation changes. Use list/address fallback and suppress inaccurate coordinates.
- **Evidence required:** Five-locale profile screenshots; Tile/data rights and accessible flow evidence
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

### S02B

#### M013 — Implement typed eligibility and resource recipes

- **Objective:** Implement typed eligibility and resource recipes
- **Rationale:** Free time is not sufficient for a safe booking.
- **Dependencies:** M004, M009
- **Likely files/modules:** `packages/scheduling/rules`, `packages/scheduling/resources`, `db/migrations` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A07, A09, FHIR, C16
- **Requirement trace:** R05, R10, R14
- **Implementation requirements:** Implement finite capacity units and service/type version recipes; restricted explainable rules return ALLOW/DENY/NEEDS_INPUT/NEEDS_STAFF_REVIEW/SOURCE_UNAVAILABLE. Cover every rule family in scheduling plan; provider-authored clinical requirements need accountable approval.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Missing referral returns explicit next step; 2. Multi-resource recipe preserves qualifications; 3. Rule/type changes produce a new immutable version
- **Tests:** Age-at-visit, returning, insurer/referral/order and interval tests; Rule precedence/missing-data and resource substitution tests
- **Security/privacy:** Collect only material clinical fields; no arbitrary provider code or LLM eligibility.
- **Observability:** Rule result codes/version and missing-input rates without answers.
- **Localization:** Five-locale explanations, Arabic medical terminology reviewed.
- **Failure modes:** Hidden failure, unknown treated false, unqualified substitution, duration mismatch.
- **Risk/recovery:** medium; raise to high for identity, permissions or reservation changes. Disable problematic rule/service and route to staff review.
- **Evidence required:** Rule catalog and golden cases; Version/provenance and privacy evidence
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

#### M014 — Implement recurring schedules and hybrid availability

- **Objective:** Implement recurring schedules and hybrid availability
- **Rationale:** Candidates must combine real service/resource constraints and correct civil time.
- **Dependencies:** M013, M004
- **Likely files/modules:** `packages/scheduling/availability`, `apps/worker`, `db/migrations` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A08, A04, S091, S111
- **Requirement trace:** R05, R10, R20
- **Implementation requirements:** Implement bounded weekly recurrence, dated exceptions/blocks, holidays/leave, notice/horizon/cutoff, alignment and buffers. Precompute patient-free windows; dynamically check exact availability. Store UTC plus IANA zone and revisions; reject DST gaps and disambiguate folds.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Candidate full duration/buffers fits every resource; 2. Hard blocks dominate opens; 3. Stale candidate versions require recheck
- **Tests:** Riyadh and Berlin/New York DST cases; Override, sick leave, horizon and multi-capacity tests
- **Security/privacy:** Public cache contains no patient context; private eligibility results not shared.
- **Observability:** Candidate latency, cache age and invalidation lag.
- **Localization:** Gregorian canonical; labeled Hijri display, explicit zone/date.
- **Failure modes:** DST shift, duration change, stale projection, combinatorial overload.
- **Risk/recovery:** medium; raise to high for identity, permissions or reservation changes. Invalidate projections, rebuild from rules; keep authoritative book recheck.
- **Evidence required:** Availability golden fixtures; Timezone/override results and performance baseline
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

#### M015 — Prove atomic resource holds and expiry invariants

- **Objective:** Prove atomic resource holds and expiry invariants
- **Rationale:** Double-booking protection must exist before patient booking.
- **Dependencies:** M013, M014, M004
- **Likely files/modules:** `packages/scheduling/reservations`, `db/migrations`, `tests/concurrency` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A09, A06, POSTGRES
- **Requirement trace:** R05, R10, R20
- **Implementation requirements:** Use half-open range exclusions, deterministic resource locks, explicit capacity units, inline expired-hold cleanup and DB time. Idempotency digest distinguishes replay from changed request; cap holds and extensions. No Redis-only lock or now()-based index predicate.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. At most one active allocation per unit/interval; 2. Multi-resource hold is all-or-none; 3. Expired hold cannot redeem with worker stopped
- **Tests:** 100 concurrent capacity-one attempts and mixed-resource races; Boundary expiry, duplicate key/different body, deadlock/retry and crash tests
- **Security/privacy:** Authorize holder/tenant; protect hold abuse without excluding accessibility needs.
- **Observability:** Conflict, expiry lag, deadlock and leaked-reservation metrics.
- **Localization:** Localized held/expiry/needs-reconfirmation copy and zone display.
- **Failure modes:** Worker lag, partial allocation, concurrent cleanup, clock boundary.
- **Risk/recovery:** medium; raise to high for identity, permissions or reservation changes. Disable new holds, retain booked ledger; repair only through audited commands.
- **Evidence required:** DB constraint inspection; Repeatable race histories and invariant queries
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

## P03

### S03A

#### M016 — Implement authoritative native booking operations

- **Objective:** Implement authoritative native booking operations
- **Rationale:** Patients must receive confirmation only after committed truth.
- **Dependencies:** M015, M002
- **Likely files/modules:** `packages/scheduling/appointments`, `apps/api`, `packages/contracts` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A07, A09, A11, FHIR
- **Requirement trace:** R05, R07, R20
- **Implementation requirements:** Create durable BookingOperation and native book command; convert hold or book directly with eligibility/version recheck, patient duplicate guard, snapshot and outbox. Provide resume/status endpoint and stable outcomes.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Booked response follows committed appointment/resources; 2. Retried operation returns same result; 3. Material changes require renewed confirmation
- **Tests:** Crash before/after commit and lost-response tests; Two-device same/different-key and direct/hold race tests
- **Security/privacy:** Bind action to authorized patient/delegate and exact challenge; no model authority.
- **Observability:** Pending/conflict/commit latency and operation correlation.
- **Localization:** Five-locale outcome contract; exact date/time/zone.
- **Failure modes:** False success, duplicate patient visit, changed provider/policy during confirm.
- **Risk/recovery:** high when affecting patient data or appointment authority. Stop new booking, preserve status/cancel recovery and reconcile operations.
- **Evidence required:** Booking transaction logs and operation-resume evidence; Invariant test results
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

#### M017 — Deliver minimal-identity patient booking and request UX

- **Objective:** Deliver minimal-identity patient booking and request UX
- **Rationale:** Reduce friction while keeping patient and acting person explicit.
- **Dependencies:** M016, M005, M012, M002, M003
- **Likely files/modules:** `apps/web/booking`, `packages/patient`, `packages/identity` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A21, A22, C11, C33
- **Requirement trace:** R05, R06, R07, R15
- **Implementation requirements:** Show availability before signup; verify contact at action. Implement exact confirmation challenge, minimal patient profile, policy/intake step, native instant/request/call/redirect modes and limited verified delegate scheduling under approved policy. Keep external clinical records out.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Every mode uses honest outcome language; 2. Request shows deadline/owner without false reservation; 3. Delegate grant revocation blocks next action
- **Tests:** End-to-end all modes and network resume; Shared phone, unauthorized delegate and contact-verification tests
- **Security/privacy:** No national ID for browsing; purpose-specific data share; clinical delegation separate.
- **Observability:** Funnel stage and pending requests, not raw forms.
- **Localization:** Human-reviewed five-locale booking flow and RTL confirmation.
- **Failure modes:** Lost network, missing referral, guardian unapproved, redirect return without proof.
- **Risk/recovery:** high when affecting patient data or appointment authority. Fallback to manual search/request; disable unapproved delegate route.
- **Evidence required:** Synthetic patient/delegate walkthroughs; Locale/accessibility and consent evidence
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

#### M018 — Implement safe cancellation and rescheduling

- **Objective:** Implement safe cancellation and rescheduling
- **Rationale:** Changing care must not accidentally destroy an existing appointment.
- **Dependencies:** M016, M017
- **Likely files/modules:** `packages/scheduling/changes`, `apps/web/booking`, `apps/api` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A09, A11, C16
- **Requirement trace:** R05, R15, R20
- **Implementation requirements:** Implement versioned cancel and native replacement transaction, preserving reason/service and compatible intake; explicit cutoff/assistance. Safe links use GET to display and POST to act. Emit replacement events and invalidate reminders/candidates.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Original survives failed replacement; 2. Mail-link preview cannot cancel; 3. Reschedule not double-counted as lost care
- **Tests:** Concurrent change/cancel, policy revision and replacement conflict; Expired link, scanner GET and idempotent replay tests
- **Security/privacy:** Scoped expiring action tokens; optional cancellation reason private.
- **Observability:** Change outcomes, original-retained and duplicate-action metrics.
- **Localization:** Five-locale policy/time/cutoff explanations.
- **Failure modes:** Cutoff reached, conflict, already cancelled, wrong patient link.
- **Risk/recovery:** high when affecting patient data or appointment authority. Disable self-service mutation while retaining assistance and existing appointments.
- **Evidence required:** Transaction/UX evidence for failure branches; Token/authorization tests
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

### S03B

#### M019 — Deliver provider calendar and attendance operations

- **Objective:** Deliver provider calendar and attendance operations
- **Rationale:** Reception needs a trustworthy calendar, not a parallel writer.
- **Dependencies:** M016, M018, M009, M005
- **Likely files/modules:** `apps/web/provider-calendar`, `packages/scheduling/operations` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A07, A13, C10, C11
- **Requirement trace:** R09, R10, R17
- **Implementation requirements:** Build day/week/month/list filters by branch/practitioner/resource; create/change through canonical commands, privacy mode, request decision, check-in queue, status dimensions and bulk absence preview. Drag/drop requires versioned confirmation.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Calendar cannot bypass capacity/rules; 2. Staff sees permitted patient fields only; 3. Bulk absence produces per-appointment outcomes and consented alternatives
- **Tests:** Role matrix and concurrent drag/drop conflict; Bulk partial failure, check-in status and keyboard/list tests
- **Security/privacy:** Reception clinical visibility restricted; operations completion distinct from clinical record.
- **Observability:** Request age, check-in lag, bulk failures and sync-health indicators.
- **Localization:** Five locales, RTL navigation, color-independent status labels.
- **Failure modes:** Provider leaves, day cancelled, stale UI revision, wrong branch.
- **Risk/recovery:** high when affecting patient data or appointment authority. Read-only calendar and staff assistance; preserve unresolved batch state.
- **Evidence required:** Calendar/accessibility screenshots; Synthetic staff rehearsal and audit
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

#### M020 — Implement consent-aware email/SMS orchestration

- **Objective:** Implement consent-aware email/SMS orchestration
- **Rationale:** Appointment updates must be reliable without leaking sensitive context.
- **Dependencies:** M004, M016, M018, M003, M005
- **Likely files/modules:** `packages/communication`, `apps/worker`, `apps/web/preferences` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A15, GOV, C11, C12
- **Requirement trace:** R15, R14
- **Implementation requirements:** Build in-app/email/SMS templates, consent/purpose/channel preferences, verified destinations, locale/zone quiet hours, dedupe, revision-aware suppression, bounded retries and delivery callbacks. Procure approved sender/channel for live gate; use fakes during build.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Cancellation suppresses queued stale reminder; 2. Delivery does not change booked state; 3. Unconsented fallback channel never sends
- **Tests:** Retry/callback replay, invalid destination and quiet-hour tests; Consent revoked at send, shared-phone preview and late cancellation race
- **Security/privacy:** Generic previews, scoped secure links; no specialty or dependent names in external preview.
- **Observability:** Delivery/suppression/failure metrics by template and channel, no message bodies.
- **Localization:** Five-locale templates and patient timezone, Arabic SMS length/cost tests.
- **Failure modes:** SMS provider down, duplicate callback, wrong number, in-flight obsolete message.
- **Risk/recovery:** high when affecting patient data or appointment authority. Pause channel sending; retain in-app updates and authorized manual contact.
- **Evidence required:** Fake-provider deterministic tests; Template/consent review and vendor gate evidence
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

## P04

### S04A

#### M021 — Build attendance evidence and review eligibility

- **Objective:** Build attendance evidence and review eligibility
- **Rationale:** A review needs defensible attendance without allowing provider suppression.
- **Dependencies:** M019, M002
- **Likely files/modules:** `packages/trust/attendance`, `db/migrations` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A24, FHIR, C02
- **Requirement trace:** R13, R19
- **Implementation requirements:** Store source/actor/confidence and corrections for completed/no-show outcomes; derive one-visit review eligibility. Add patient attendance dispute and independent evidence-review path; imported attendance needs matching and provenance.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Reminder delivery never grants eligibility; 2. Provider no-show can be appealed; 3. Corrected attendance re-evaluates dependent review state
- **Tests:** Completed/no-show correction and dispute cases; Cross-patient evidence and duplicate eligibility tests
- **Security/privacy:** Evidence private; trust reviewer separated from provider/sales authority.
- **Observability:** Unknown attendance coverage, disputes and correction rate.
- **Localization:** Five-locale eligibility/appeal text, no accusatory no-show wording.
- **Failure modes:** Provider mislabels attendance, duplicate encounter, erroneous source mapping.
- **Risk/recovery:** high when affecting patient data or appointment authority. Suspend eligibility publication, preserve evidence and appeal access.
- **Evidence required:** Eligibility decision traces; Synthetic appeal and source-quality fixtures
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

#### M022 — Implement verified experience reviews and replies

- **Objective:** Implement verified experience reviews and replies
- **Rationale:** Reviews create trust only with clear dimensions and independent control.
- **Dependencies:** M021, M005
- **Likely files/modules:** `packages/trust/reviews`, `apps/web/reviews`, `apps/web/provider` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A24, C02, C09
- **Requirement trace:** R13
- **Implementation requirements:** One patient/visit review; practitioner/facility experience dimensions, internal identity/public anonymity, edit/delete history, moderation and protected provider replies. Invite every eligible visit without sentiment gating.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Negative compliant review cannot be removed by provider; 2. Anonymous display reveals no patient ID; 3. Provider reply cannot expose private care facts
- **Tests:** Permission/moderation/edit and reply checks; Low-count aggregates and duplicate submission tests
- **Security/privacy:** Redact sensitive public text; preserve lawful minimal audit; no clinical-outcome score.
- **Observability:** Invitation coverage, moderation latency, appeal outcome and review freshness.
- **Localization:** Five-locale moderation guidance and Arabic text handling.
- **Failure modes:** Doxxing, provider pressure, duplicate reviews, biased invitations.
- **Risk/recovery:** high when affecting patient data or appointment authority. Quarantine unsafe text, retain appeal; disable reply publication if necessary.
- **Evidence required:** Moderation policy/workflows; Permission and public-projection evidence
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

#### M023 — Add review fraud review and ranking governance

- **Objective:** Add review fraud review and ranking governance
- **Rationale:** Commercial incentives and small samples can distort patient trust.
- **Dependencies:** M022, M011
- **Likely files/modules:** `packages/trust/governance`, `packages/search/ranking`, `apps/web/admin` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A23, A24, C02
- **Requirement trace:** R04, R13, R18
- **Implementation requirements:** Version aggregate confidence/shrinkage and freshness; audit rank inputs, review manipulation signals and independent appeals. Fraud flags require proportionate review and do not deny medical access.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Paid tier absent from score dependency graph; 2. Small samples display uncertainty/count; 3. Fraud flag cannot silently erase compliant negative review
- **Tests:** Ranking invariant and aggregate golden tests; Moderator/sales separation and appeal reversal tests
- **Security/privacy:** Minimize fraud signals, no invasive cross-provider health tracking.
- **Observability:** Rank policy version, moderation override audit and fairness summaries.
- **Localization:** Locale fairness checks and translated explanation labels.
- **Failure modes:** Biased moderation, sparse review confidence, sales override.
- **Risk/recovery:** high when affecting patient data or appointment authority. Remove faulty optional rank factor; retain transparent deterministic relevance.
- **Evidence required:** Ranking governance report; Aggregate fixtures and role-denial results
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

### S04B

#### M024 — Implement minimized operational metric definitions

- **Objective:** Implement minimized operational metric definitions
- **Rationale:** Provider ROI needs honest denominators and missingness.
- **Dependencies:** M004, M016, M019, M020, M021
- **Likely files/modules:** `packages/analytics`, `packages/events`, `db/migrations` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A14, S052, C19, C20
- **Requirement trace:** R11, R14
- **Implementation requirements:** Implement event definitions for impressions/clicks/availability/starts/bookings/requests/changes/attendance and source attribution. Separate request/redirect from authoritative booking, unknown external from abandon and missing attendance from no-show.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Every KPI has grain/denominator/source/coverage; 2. No-show excludes unknown outcomes; 3. Reschedule is not double-counted loss
- **Tests:** Synthetic funnel reconciliation and duplicate-event tests; Privacy/small-cell and late-correction tests
- **Security/privacy:** No raw symptom/query/PHI logging; suppress small groups and complementary cells.
- **Observability:** Pipeline lag, source coverage and reconciliation mismatch.
- **Localization:** Locale/channel dimensions without exposing individual profiles.
- **Failure modes:** Late events, missing outcome, identity join inflation, reidentifiable slices.
- **Risk/recovery:** high when affecting patient data or appointment authority. Stop suspect reports; rebuild aggregates from approved events.
- **Evidence required:** Metric dictionary and calculated fixture outputs; Privacy review and reconciliation evidence
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

#### M025 — Deliver provider monthly reports and B2B entitlements

- **Objective:** Deliver provider monthly reports and B2B entitlements
- **Rationale:** Clinics should pay for operations value without a ranking boost.
- **Dependencies:** M024, M019, M022
- **Likely files/modules:** `apps/web/provider-reports`, `packages/commerce`, `packages/analytics` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A14, A23, C27
- **Requirement trace:** R11, R18
- **Implementation requirements:** Build monthly report with coverage, request backlog, conversion, attendance, capacity and three action recommendations; source-derived operational advice only. Add branch/group entitlements and manual B2B invoice tracking before payment automation. No patient fee or commission.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Report totals reconcile to metric fixtures; 2. Subscription state cannot change rank/reviews; 3. Lapsed billing preserves existing patient appointment access
- **Tests:** Report reconciliation and entitlement separation tests; Missing-data/empty-cohort and export-permission tests
- **Security/privacy:** Scoped provider reports; no identifiable cross-provider demand export.
- **Observability:** Report usage, subscription state changes and support cost fields.
- **Localization:** Five-locale reports, SAR currency formatting where monetary values supplied.
- **Failure modes:** Misleading ROI, small sample, billing suspension blocking cancellation.
- **Risk/recovery:** high when affecting patient data or appointment authority. Revert commercial entitlements; keep core appointment continuity.
- **Evidence required:** Sample synthetic monthly report; Entitlement/ranking separation evidence
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

## P05

### S05A

#### M026 — Prove the complete synthetic patient-to-review loop

- **Objective:** Prove the complete synthetic patient-to-review loop
- **Rationale:** An integrated flywheel must work before real patient traffic.
- **Dependencies:** M017, M018, M019, M020, M022, M025
- **Likely files/modules:** `tests/e2e`, `fixtures/synthetic`, `docs/evidence/M026` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** R20, S096, WCAG
- **Requirement trace:** R05, R06, R11, R13, R20
- **Implementation requirements:** Create rights-cleared synthetic Saudi clinics/patients/services and execute intent/search/profile/booking/change/attendance/review/report journeys in all locales and low-bandwidth/accessibility variants. Include request-only provider and missing insurer/referral cases.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Every pilot path completes with correct evidence; 2. No false confirmation or unauthorized access in corpus; 3. Report reflects actual synthetic attendance
- **Tests:** Full journey and failure-branch tests; Screenreader/RTL/manual patient and receptionist rehearsal
- **Security/privacy:** Synthetic identities only; fixtures have no real national IDs or phone delivery.
- **Observability:** Correlated event chain from intent to report without health text.
- **Localization:** Five-locale completeness and Arabic native reviewer signoff.
- **Failure modes:** Disconnected modules, misleading status, inaccessible confirmation, missing outcome.
- **Risk/recovery:** high when affecting patient data or appointment authority. Keep live launch disabled; repair bounded failing path and rerun affected corpus.
- **Evidence required:** End-to-end run traces and screenshots; Reviewer signoffs and defect closure
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

#### M027 — Pass reliability, restoration and release-control gates

- **Objective:** Pass reliability, restoration and release-control gates
- **Rationale:** Recovery must preserve appointments and external-operation truth.
- **Dependencies:** M026, M015, M004
- **Likely files/modules:** `tests/reliability`, `infra/runbooks`, `docs/evidence/M027` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A06, A09, A20, POSTGRES
- **Requirement trace:** R14, R20
- **Implementation requirements:** Run load/race/fault tests at agreed pilot budgets, restore encrypted backup in isolated environment, verify outbox/inbox consistency and kill switches. Define on-call, RPO/RTO evidence and rollout/rollback procedures.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Native invariants hold under specified concurrency; 2. Restored operations do not duplicate notifications/bookings; 3. RPO/RTO and service budgets measured or launch blocker recorded
- **Tests:** Load/worker/database failure and restore drills; Constraint migration, kill-switch and notification replay tests
- **Security/privacy:** No production patient data in drills; protected backup access and keys.
- **Observability:** SLO dashboards, outbox lag, reservation leak and alert routing.
- **Localization:** Localized degraded states and staff runbooks for Arabic operations.
- **Failure modes:** Database restore rollback, delayed worker, overload, unsupported vendor SLO.
- **Risk/recovery:** high when affecting patient data or appointment authority. Freeze new writes, restore known revision and reconcile durable state before reopen.
- **Evidence required:** Raw measurement and restore timing; Runbook/alert rehearsal records
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

### S05B

#### M028 — Qualify pilot clinics and rehearse real operating procedures

- **Objective:** Qualify pilot clinics and rehearse real operating procedures
- **Rationale:** A technically correct service fails without maintained supply and responsible staff.
- **Dependencies:** M009, M019, M025, M003, M027
- **Likely files/modules:** `docs/pilot`, `provider-onboarding-config`, `docs/evidence/M028` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** GOV, C29, C30, C31, C32, C33
- **Requirement trace:** R03, R09, R12, R17
- **Implementation requirements:** Recruit proposed 10–20 clinics in defined catchment; secure rights/agreements and named verification, reception and escalation owners. Rehearse native/request scheduling, closure, changed insurance and attendance disputes with synthetic cases. Record actual supply/coverage instead of assuming recruitment.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Each enabled service has evidence and named owner; 2. Staff can resolve unknown/request/cancel cases; 3. Unsupported clinics use honest lower-capability mode
- **Tests:** Synthetic onsite/authorized remote workflow rehearsal; Onboarding completeness and authority audit
- **Security/privacy:** Signed processing/verification rights; no access to real records for rehearsal.
- **Observability:** Configuration readiness, support time and staff response performance.
- **Localization:** Arabic reception workflow and five-locale patient assets.
- **Failure modes:** Clinic no API, untrained staff, stale credentials, incomplete hours.
- **Risk/recovery:** high when affecting patient data or appointment authority. Unpublish unready services; preserve existing patient assistance where applicable.
- **Evidence required:** Signed readiness checklist; Rehearsal outcomes and unresolved clinic blockers
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

#### M029 — Run the bounded live pilot with safety stop conditions

- **Objective:** Run the bounded live pilot with safety stop conditions
- **Rationale:** The flywheel and patient preference require actual evidence.
- **Dependencies:** M028, M027, M003, M026
- **Likely files/modules:** `docs/pilot-results`, `docs/governance`, `apps/config` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A26, GOV
- **Requirement trace:** R11, R14, R20
- **Implementation requirements:** Enable only signed-off services/cohort; target eight weeks after baseline, >=100 authoritative completed visits with attendance coverage reported. Compare patient task success and clinic operations against baseline; do not manufacture unavailable data. Stop on false confirmations, material privacy incident or unresolved critical safety failure.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. All real-data legal/clinical/vendor gates are approved before traffic; 2. Pilot measures defined outcomes with denominators/uncertainty; 3. Stop conditions trigger controlled suspension and support
- **Tests:** Production-safe monitoring verification; Consent/support/incident tabletop, no offensive tests
- **Security/privacy:** Approved real-data scope only; minimize study data and consent appropriately.
- **Observability:** Confirmed/unknown outcomes, cancellation, attendance coverage, support cost and incidents.
- **Localization:** Arabic/English field cohorts plus five-locale production readiness.
- **Failure modes:** Insufficient sample, supply gap, false confirmation, staff failure.
- **Risk/recovery:** high when affecting patient data or appointment authority. Pause acquisition/new bookings per risk; maintain existing-care support and status/cancel paths.
- **Evidence required:** Dated pilot dataset/report with missingness; Gate approvals and incident/stop log
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

#### M030 — Decide pilot continuation and validate provider willingness to pay

- **Objective:** Decide pilot continuation and validate provider willingness to pay
- **Rationale:** Expansion needs paid operating value and reliable access, not traffic vanity.
- **Dependencies:** M029, M025
- **Likely files/modules:** `docs/pilot-decision`, `docs/pricing`, `docs/roadmap` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A23, A26, C27
- **Requirement trace:** R11, R18, R20
- **Implementation requirements:** Review thresholds, confidence, support economics and participant feedback; obtain >=3 accepted paid proposals/renewals as proposed commercial gate. Record go/iterate/stop and specific bounded repair tasks. No adoption percentage or revenue forecast without data.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Decision cites measured reliability/access/attendance and economics; 2. Paid commitments distinguished from stated interest; 3. Failed gate produces repair scope rather than automatic expansion
- **Tests:** Metric recomputation and cohort sensitivity review; Independent decision/claim audit
- **Security/privacy:** Only aggregate reports shared; commercial incentives do not waive safety or reviews.
- **Observability:** Unit economics, retention intent, actual paid commitment and unresolved cost.
- **Localization:** Arabic provider interview analysis and human-reviewed report text.
- **Failure modes:** Insufficient willingness to pay, integration costs exceed margins, selection bias.
- **Risk/recovery:** high when affecting patient data or appointment authority. Continue bounded pilot or pause growth; do not add patient fees to hide economics.
- **Evidence required:** Pilot decision memo with source tables; Paid commitment evidence under restricted access
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

## P06

### S06A

#### M031 — Create preference-aware waitlist enrollment

- **Objective:** Create preference-aware waitlist enrollment
- **Rationale:** Patients need earlier care without losing control of clinician/site/time preferences.
- **Dependencies:** M030, M013, M017
- **Likely files/modules:** `packages/waitlist`, `apps/web/waitlist`, `db/migrations` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A07, A24, C10, C13, C20
- **Requirement trace:** R05, R08, R14
- **Implementation requirements:** Model date/time windows, preferred/alternate clinicians/locations, type, accessibility/language, channel consent, original booking and explicit switch permission. Establish clinician-set priority bands and FIFO within band.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Preferences distinguish hard constraints and acceptable alternatives; 2. Enrollment does not cancel original visit; 3. Priority basis and overrides are auditable
- **Tests:** Preference/eligibility and duplicate enrollment tests; Permission/quiet-hours and original-appointment preservation tests
- **Security/privacy:** No opaque no-show/revenue-based allocation; minimize condition data.
- **Observability:** Queue age, eligible pool and priority override counts.
- **Localization:** Local timezone windows and five-locale preference forms.
- **Failure modes:** Ineligible enrollment, shared phone, original changed, preference ambiguity.
- **Risk/recovery:** high when affecting patient data or appointment authority. Pause matching, retain preferences and original care.
- **Evidence required:** Preference fixture results; Fairness policy and consent screenshots
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

#### M032 — Implement expiring offers and safe cancellation refill

- **Objective:** Implement expiring offers and safe cancellation refill
- **Rationale:** A waitlist fill must be an actual secured appointment.
- **Dependencies:** M031, M015, M018, M020
- **Likely files/modules:** `packages/waitlist/offers`, `apps/worker`, `apps/api` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A09, A15, C13, C16, C20
- **Requirement trace:** R05, R08, R15, R20
- **Implementation requirements:** Sequential matching creates a real hold where supported, scoped expiring offer and explicit acceptance; native replacement atomically releases later booking. No-hold sources send honest availability invitations. Track original-cancel outcome separately.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. One offer cannot allocate one unit twice; 2. Expired acceptance retains original booking; 3. Quiet hours preserve a fair response opportunity
- **Tests:** Concurrent accept/expiry/cancel tests; Delayed delivery, unsupported hold and worker outage tests
- **Security/privacy:** Possession links scoped; no sensitive message previews or unfair risk score.
- **Observability:** Offer/delivery/accept/fill/expiry and original-cancel-failure metrics.
- **Localization:** Five-locale replacement explanation with exact dates/zone.
- **Failure modes:** Late accept, duplicate callback, slot taken, no response, old cancellation fails.
- **Risk/recovery:** high when affecting patient data or appointment authority. Stop offers, expire holds safely, preserve later appointments.
- **Evidence required:** Race logs and original-preserved evidence; Fairness/channel review
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

### S06B

#### M033 — Model clinician-originated follow-up and recall plans

- **Objective:** Model clinician-originated follow-up and recall plans
- **Rationale:** Recall requires an accountable clinical source rather than inferred advice.
- **Dependencies:** M030, M021, M013
- **Likely files/modules:** `packages/access-work`, `packages/clinical-contracts`, `db/migrations` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A10, A15, FHIR, C27
- **Requirement trace:** R08, R14, R19
- **Implementation requirements:** Create plan issuer/source/window/service/prerequisites/stop conditions and state machine. Support approved dental/preventive/rehab/follow-up templates; patient declines and clinical escalation explicit. Booking does not close clinical completion.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Only authorized issuer sets clinical window; 2. Completed/cancelled/superseded plans suppress obsolete work; 3. Missed visit can reopen only within approved policy
- **Tests:** Plan/window/version and completion-correction tests; Unauthorized issuer and duplicated plan tests
- **Security/privacy:** Clinical fields scoped separately from marketing; source provenance required.
- **Observability:** Due/overdue/unreachable counts with clinical owner.
- **Localization:** Five-locale clinician-origin wording; dates/intervals unambiguous.
- **Failure modes:** AI-invented recall, expired order, duplicate campaign, missing escalation owner.
- **Risk/recovery:** high when affecting patient data or appointment authority. Pause automated contacts and route due work to responsible clinic.
- **Evidence required:** Plan transition fixtures; Issuer/purpose and stop-rule evidence
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

#### M034 — Orchestrate consented recall and recovery campaigns

- **Objective:** Orchestrate consented recall and recovery campaigns
- **Rationale:** Contact attempts should close access work without harassment or duplicate messaging.
- **Dependencies:** M033, M020, M032
- **Likely files/modules:** `packages/access-work/campaigns`, `apps/worker`, `apps/web/provider` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A15, C27, C28, GOV
- **Requirement trace:** R08, R15
- **Implementation requirements:** Implement capped channel attempts, dedupe, quiet hours, opt-out, response states and direct booking links. Separate clinical recall from optional missed/cancelled/abandoned-booking recovery; abandonment outreach requires explicit lawful opt-in.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Revocation stops future optional contact; 2. Current plan/appointment state checked at send; 3. Overdue clinical work reaches designated human owner
- **Tests:** Retry/opt-out/late completion and dedupe tests; Unreachable patient and quiet-hours boundary tests
- **Security/privacy:** No blanket marketing consent; templates minimize health content.
- **Observability:** Contact opportunity, delivered, booked, completed and suppressed by reason.
- **Localization:** Five-locale templates with respectful Arabic tone.
- **Failure modes:** Duplicate recalls, unreachable recipient, invalid consent, clinical urgency unowned.
- **Risk/recovery:** high when affecting patient data or appointment authority. Pause campaign, retain work queue and permitted manual clinical route.
- **Evidence required:** Campaign simulation with stop conditions; Consent/clinical-owner signoff
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

#### M035 — Create referral and order-to-schedule work queues

- **Objective:** Create referral and order-to-schedule work queues
- **Rationale:** Providers need to see whether authorized care requests reach appointments.
- **Dependencies:** M033, M013, M019
- **Likely files/modules:** `packages/access-work/referrals`, `apps/web/provider`, `packages/clinical-contracts` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A10, FHIR, S109
- **Requirement trace:** R08, R12, R19
- **Implementation requirements:** Model ServiceRequest/Task-aligned issuer, patient binding, service/window, documents, prior authorization status and scheduling owner. Staff validates prerequisites; record received/needs-info/ready/contacted/booked/completed/declined/expired. No autonomous clinical ordering.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Order/referral source and scope preserved; 2. Invalid prerequisites route to review; 3. Booking and clinical fulfillment remain distinct
- **Tests:** Expired/mismatched referral and missing authorization tests; Patient match conflict and partial completion tests
- **Security/privacy:** Restricted clinical attachments; scheduling staff see minimum work status.
- **Observability:** Referral age, conversion, unmet prerequisites and closure coverage.
- **Localization:** Five-locale patient request messages; clinical codes retain original text.
- **Failure modes:** Wrong patient/order, unreviewed preparation, missing partner rights.
- **Risk/recovery:** high when affecting patient data or appointment authority. Quarantine ambiguous referrals; clinic clinical owner resolves.
- **Evidence required:** Synthetic referral-to-book evidence; FHIR boundary and role tests
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

## P07

### S07A

#### M036 — Build the adapter capability and certification harness

- **Objective:** Build the adapter capability and certification harness
- **Rationale:** Vendor names and FHIR labels cannot substitute for tested scheduling semantics.
- **Dependencies:** M030, M016, M004
- **Likely files/modules:** `packages/integration/contracts`, `tests/adapter-contract`, `docs/adapter-certification` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A11, C13, C19, C20, C23
- **Requirement trace:** R05, R12, R20
- **Implementation requirements:** Implement versioned capability vector and per-field authority schema; fake native/read-only/read-write/event adapters, health/TTL and typed outcomes. Define certification fixtures for identifiers, hold/write/modify/cancel/status, retry and permission limitations.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Unsupported capabilities cannot be silently emulated; 2. Clinical-read permission grants no booking write; 3. Every adapter has named owner/version/source contract
- **Tests:** Contract suite for all capability combinations; Unknown source/version and tenant-routing denial tests
- **Security/privacy:** Scoped credential references, minimum patient data and explicit rights.
- **Observability:** Capability changes, freshness, circuit breaker and contract errors.
- **Localization:** Patient mode/error explanations consistent across locales.
- **Failure modes:** Vendor API changes, unsupported order types, unknown cancellation semantics.
- **Risk/recovery:** high when affecting patient data or appointment authority. Downgrade to request/call; disable unsupported writes.
- **Evidence required:** Executable fake-adapter report; Certification checklist and authority matrix
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

#### M037 — Implement durable external booking and change operations

- **Objective:** Implement durable external booking and change operations
- **Rationale:** A lost response must not produce duplicate external appointments.
- **Dependencies:** M036, M016, M018
- **Likely files/modules:** `packages/integration/operations`, `apps/worker`, `apps/api` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A09, A11, C13, C23
- **Requirement trace:** R05, R12, R20
- **Implementation requirements:** Persist command/correlation before send; handle authoritative success/rejection/outcome_unknown, find-by-correlation, bounded retry only with supported idempotency and serialized cancel intent. External reschedule respects original-preserving capability.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Timeout stays pending, not failed/booked; 2. Blind create retry impossible when unsupported; 3. Late success honors pending cancellation intent
- **Tests:** Remote commit then lost response; Duplicate events, ambiguous patient/time match and external cancel failure
- **Security/privacy:** Tenant-bound secrets and operation access; staff escalation minimal data.
- **Observability:** Unknown outcome age, retries, reconciliation attempts and false-confirmation sentinel.
- **Localization:** Five-locale pending/assistance text and original/new appointment display.
- **Failure modes:** Late success, no correlation search, remote double writer, partial replacement.
- **Risk/recovery:** high when affecting patient data or appointment authority. Pause adapter creates; query/reconcile before any compensation.
- **Evidence required:** Fault histories proving no false success; Staff resolution/recovery walkthrough
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

#### M038 — Implement the first negotiated FHIR/IHE scheduling adapter

- **Objective:** Implement the first negotiated FHIR/IHE scheduling adapter
- **Rationale:** Interoperability should follow a partner's actual profile.
- **Dependencies:** M036, M037, M035
- **Likely files/modules:** `packages/integration/fhir`, `tests/fhir`, `fixtures/fhir` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A10, S091, S099, S102, S109, S114
- **Requirement trace:** R12, R19, R20
- **Implementation requirements:** Use R4 and negotiated IHE find/optional hold/book/modify/cancel/find-existing semantics in an authorized sandbox or synthetic conformant server. Validate identifiers/status mapping, supported resources, OperationOutcome and capability profiles. Partner production enablement remains M040 gated.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. All supported operations pass profile/round-trip tests; 2. Generic POST never assumed conflict-safe; 3. Unsupported R5/extension fields rejected or explicitly mapped
- **Tests:** Official validator and contract tests; Hold expiry, canceled/replaced and status-loss fixtures
- **Security/privacy:** SMART/OAuth scopes or partner-approved auth; patient binding and consent enforced.
- **Observability:** Validation errors, response latency and profile/version mismatch.
- **Localization:** Preserve Unicode names and timezone offsets; display source limitations.
- **Failure modes:** FHIR endpoint lacks scheduling write, vendor type IDs absent, validator package unavailable.
- **Risk/recovery:** high when affecting patient data or appointment authority. Use read-only/request mode until capability certified.
- **Evidence required:** Validator reports and sandbox contract evidence; Exact profile/adapter version and rights
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

### S07B

#### M039 — Implement legacy SIU ingestion and batch/calendar fallback

- **Objective:** Implement legacy SIU ingestion and batch/calendar fallback
- **Rationale:** Hospitals without modern APIs still need honest discovery and access.
- **Dependencies:** M036, M007, M004
- **Likely files/modules:** `packages/integration/hl7v2`, `packages/integration/imports`, `tests/integration` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A11, HL7, S075, S110
- **Requirement trace:** R12, R14
- **Implementation requirements:** Implement one negotiated SIU read/mirror profile with S12/S13/S14/S15/S23/S24/S26 semantics, source IDs/ACK handling and current-state repair. Add minimal busy-only calendar and validated CSV/SFTP import contracts; refine into separate bounded work packets before executing each transport. No instant write claim from read-only feeds.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. SIU notification does not imply booking command capability; 2. Block/unblock and ID rekey preserve source ownership; 3. Batch/calendar freshness cannot authorize external instant booking
- **Tests:** Duplicate/out-of-order SIU and malformed batch fixtures; Calendar token reset and busy-only privacy checks
- **Security/privacy:** Secure approved transport/agent credentials; no event descriptions or PHI in calendar exports.
- **Observability:** ACK/error, feed lag, batch rejects and mirror drift.
- **Localization:** Partner timezone/encoding tests including Arabic names.
- **Failure modes:** Old IDs reused, partial file, missing SIU, transport ACK mistaken success.
- **Risk/recovery:** high when affecting patient data or appointment authority. Quarantine feed and downgrade patient mode; retain last checked label.
- **Evidence required:** Negotiated profile and fixture results; Transport/privacy/authority evidence
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

#### M040 — Certify reconciliation, adapter rollout and integration operations

- **Objective:** Certify reconciliation, adapter rollout and integration operations
- **Rationale:** Two-way access requires repair, not just a happy-path API call.
- **Dependencies:** M037, M038, M039, M027
- **Likely files/modules:** `packages/integration/reconciliation`, `apps/web/provider-sync`, `docs/runbooks` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A11, A20, C13, C23
- **Requirement trace:** R12, R20
- **Implementation requirements:** Implement inbox replay/order rules, periodic reconciliation/cursors, tombstones, rekey review, conflict queue and adapter circuit-breaker rollout. Certify each real partner/service against contract evidence; enable writes only after authorized test and operational signoff.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Lost/reordered events converge to authority; 2. Unknown operations reach human owner within target; 3. Unsupported/uncertified branches remain lower mode
- **Tests:** Gap repair/full resync/replay and restore tests; Partner downtime, rekey and capacity-conflict authorized sandbox tests
- **Security/privacy:** No production probing; scoped partner environment and redacted evidence.
- **Observability:** Drift, stale TTL, unknown-age SLO and reconciliation backlog.
- **Localization:** Five-locale sync/assistance indicators for patient and staff.
- **Failure modes:** Reconcile loop, stale cursor, vendor semantics changed, unstaffed backlog.
- **Risk/recovery:** high when affecting patient data or appointment authority. Disable writes per adapter/version; reconcile before reenabling.
- **Evidence required:** Per-adapter signed capability certificate; Failure/restore reports and on-call runbook
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

## P08

### S08A

#### M041 — Implement the reviewed navigation safety and intent contract

- **Objective:** Implement the reviewed navigation safety and intent contract
- **Rationale:** Patient-facing AI must route safely with a controlled intended use.
- **Dependencies:** M030, M011, M003
- **Likely files/modules:** `packages/navigation/safety`, `packages/navigation/intent`, `fixtures/ai` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A16, GOV, AI-PAPER
- **Requirement trace:** R01, R14
- **Implementation requirements:** Finalize clinician-reviewed service navigation/urgent-risk policy, typed intent/uncertainty and approved knowledge versions. Run minimum 500 navigation plus 100 critical/adversarial synthetic scenarios; define abstention/human escalation and provider processing restrictions.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. All designated critical cases escalate safely in gate corpus; 2. No diagnosis/treatment authority introduced; 3. Material uncertainty produces clarification or abstention
- **Tests:** Clinical reviewer golden cases and disagreement review; Synthetic untrusted-content/tool-boundary tests
- **Security/privacy:** Approved processing regions/terms; no raw prompts in routine traces.
- **Observability:** Safe abstention/critical case outcomes and version labels without transcript capture.
- **Localization:** At least 200 Arabic cases plus four locale cohorts; Saudi dialect/code-switch coverage.
- **Failure modes:** Unsafe reassurance, missing context, malicious provider text, model outage.
- **Risk/recovery:** high when affecting patient data or appointment authority. Disable generative navigation; retain deterministic search/call paths.
- **Evidence required:** Clinical safety case and held-out evaluation; Intended-use/regulatory signoff for enabled scope
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

#### M042 — Connect text navigation to typed provider and scheduling tools

- **Objective:** Connect text navigation to typed provider and scheduling tools
- **Rationale:** LLM explanations must resolve to current structured facts.
- **Dependencies:** M041, M036, M016, M013
- **Likely files/modules:** `packages/navigation/tools`, `apps/api`, `apps/web/navigation` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A16, A11, S015, C02
- **Requirement trace:** R01, R05, R14
- **Implementation requirements:** Implement scoped search/facts/availability/eligibility/status tools and write proposals; server renders verified result cards. Validate IDs against authorized tool results, freshness and current candidate versions; model cannot supply its own tenant privilege or confirmation.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. No invented provider/price/insurance/time/booking facts; 2. Tool denial cannot be overridden by retrieved text; 3. Model outage leaves usable search
- **Tests:** Fabricated ID/expired candidate and unknown fact tests; Authorization/schema/timeout and injection-containment synthetic tests
- **Security/privacy:** Minimal inputs; no default clinical-history RAG; typed allowlist only.
- **Observability:** Fact mismatch, tool error and safe fallback counters.
- **Localization:** Five-locale intent slots/explanations and Arabic entity resolution.
- **Failure modes:** Hallucinated availability, invalid argument, stale provider, unauthorized patient.
- **Risk/recovery:** high when affecting patient data or appointment authority. Turn off affected tools; retain read-only deterministic UI.
- **Evidence required:** Tool contract logs with synthetic data; Grounded result and privacy review
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

#### M043 — Enforce exact action confirmation across AI and UI

- **Objective:** Enforce exact action confirmation across AI and UI
- **Rationale:** Conversational agreement must bind the exact current action.
- **Dependencies:** M042, M017, M018
- **Likely files/modules:** `packages/navigation/confirmation`, `packages/contracts`, `apps/web/navigation` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A16, A09
- **Requirement trace:** R01, R05, R07
- **Implementation requirements:** Bind confirmation challenge to patient/delegate/provider/service/site/time/zone/policy/version and operation digest. Require explicit accepted challenge for booking/cancel/reschedule; invalidate material changes. Preserve idempotency across repeated language and disconnected clients.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Unconfirmed write never executes; 2. Changed material detail requires new confirmation; 3. Repeated agreement returns the same operation
- **Tests:** Changed provider/time/policy, replay and expired challenge tests; Cancel/reschedule authorization and network-loss tests
- **Security/privacy:** Server checks authority independently of model; no implicit consent from transcript claims.
- **Observability:** Challenge issued/accepted/expired and rejected-write reason metrics.
- **Localization:** Human-reviewed exact summaries in five locales; no ambiguous relative dates.
- **Failure modes:** Model claims prior consent, double-click, stale screen, wrong dependent.
- **Risk/recovery:** high when affecting patient data or appointment authority. Disable conversational writes; use ordinary verified confirmation UI.
- **Evidence required:** Cross-surface confirmation evidence; Zero-unconfirmed-write corpus report
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

### S08B

#### M044 — Evaluate private and approved-cloud ASR

- **Objective:** Evaluate private and approved-cloud ASR
- **Rationale:** Speech accuracy must be measured on Saudi terms and critical entities.
- **Dependencies:** M041, M003, M001
- **Likely files/modules:** `experiments/asr`, `fixtures/voice`, `docs/evidence/M044` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A17, S089, S090, S106, S107, S108, AI-PAPER
- **Requirement trace:** R16, R14
- **Implementation requirements:** Evaluate whisper.cpp/faster-whisper and qualified cloud alternatives with consented actor-read synthetic corpus; separately qualify model weights. Measure WER, critical entity accuracy, time normalization, calibration, latency/device memory and cost. Casablanca is supplementary, not Saudi validation.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Critical-entity accuracy target >=95% on held-out scripts or remediation gate; 2. Low-confidence critical fields always require correction; 3. Approved fallback never silently changes processing region
- **Tests:** Saudi dialect/code-switch/provider/drug-name and five-language cases; Noise, device/network and privacy deletion tests
- **Security/privacy:** No real PHI; explicit recording consent; default temporary audio deletion.
- **Observability:** Runtime/version, critical error categories, cost and deletion verification.
- **Localization:** Najdi/Hijazi/Eastern representation plus Arabic-English and FR/DE/ES cohorts.
- **Failure modes:** Drug/name confusion, false confidence, inaccessible microphone, cloud policy breach.
- **Risk/recovery:** high when affecting patient data or appointment authority. Retain text entry; disable failing ASR route and purge temporary audio.
- **Evidence required:** Corpus provenance and subgroup metrics; Weight/runtime license and private/cloud decision
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

#### M045 — Deliver correctable voice navigation and booking

- **Objective:** Deliver correctable voice navigation and booking
- **Rationale:** Voice must use the same safe engine, not a parallel booking agent.
- **Dependencies:** M044, M042, M043, M005
- **Likely files/modules:** `apps/web/voice`, `packages/voice`, `packages/navigation` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A17, A16, S089, S090
- **Requirement trace:** R16, R01, R05
- **Implementation requirements:** Push-to-talk, visible mic/cancel, editable transcript and exact entity readback feed canonical intent/tools. TTS/text show exact provider/location/date/time and require current action challenge. No passive recording.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Text and voice produce identical authorized operation contract; 2. Critical names/time corrected or confirmed before action; 3. Audio expires after processing by default
- **Tests:** Low-confidence correction and code-switch journeys; Duplicate utterance, interruption, network loss and unauthorized action tests
- **Security/privacy:** Ephemeral audio, approved processing route, explicit microphone permission.
- **Observability:** Transcription-to-correction funnel and safe action outcomes without raw audio.
- **Localization:** Five-language voice/text fallback and Arabic pronunciation review.
- **Failure modes:** Misheard yes/time/drug, interrupted TTS, unsupported device, ASR timeout.
- **Risk/recovery:** high when affecting patient data or appointment authority. Disable microphone path; keep text and assisted access fully usable.
- **Evidence required:** Synthetic end-to-end voice recordings only with consent; Entity/confirmation and deletion evidence
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

## P09

### S09A

#### M046 — Validate dental multi-resource service configuration

- **Objective:** Validate dental multi-resource service configuration
- **Rationale:** Dentistry exposes shared-chair/assistant/buffer constraints early.
- **Dependencies:** M040, M013, M015, M019
- **Likely files/modules:** `packages/scheduling/recipes`, `fixtures/dental`, `apps/web/provider` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A07, A09, C16, C17
- **Requirement trace:** R10, R12
- **Implementation requirements:** Implement approved dental recipes for dentist/hygienist/chair/assistant and procedure-specific duration/cleanup, qualified substitutions and branch filters. Use existing reservation primitives rather than special unsafe calendar writes.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. All required units reserved together; 2. Cleanup prevents adjacent conflict; 3. Named clinician substitution requires acceptance
- **Tests:** Chair/assistant conflict and variable-duration races; Sick leave/substitute and external capability tests
- **Security/privacy:** Clinical eligibility and preparation approved by dental owner; staff sees minimum.
- **Observability:** Resource bottleneck and failed recipe reason metrics.
- **Localization:** Arabic dental service taxonomy and five-locale preparation labels.
- **Failure modes:** Available dentist but no chair, unqualified assistant, old duration.
- **Risk/recovery:** high when affecting patient data or appointment authority. Unpublish unsupported recipe; preserve existing bookings and staff review.
- **Evidence required:** Dental clinician review and synthetic recipe evidence; Atomicity/performance tests
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

#### M047 — Validate imaging, laboratory and nursing service workflows

- **Objective:** Validate imaging, laboratory and nursing service workflows
- **Rationale:** Services without a primary doctor need order and equipment-aware access.
- **Dependencies:** M046, M035, M013
- **Likely files/modules:** `packages/scheduling/recipes`, `fixtures/imaging-lab`, `apps/web/provider` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A07, A10, C23, FHIR
- **Requirement trace:** R10, R19
- **Implementation requirements:** Add provider-approved machine/technician/room, phlebotomy/chair and nurse/service-capacity recipes; validate order/referral, preparation and clinical review prerequisites. Interpretation can be a separate linked task.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Service can book without physician as primary actor; 2. Missing clinical clearance routes to staff; 3. Capacity pools respect finite units
- **Tests:** MRI/ultrasound/lab/nurse synthetic recipes; Order expiry, preparation change, machine downtime and capacity races
- **Security/privacy:** No automated medical suitability decisions; restricted order documents.
- **Observability:** Equipment utilization, blocked prerequisite and downtime impact.
- **Localization:** Multilingual modality/preparation text, Arabic review by provider.
- **Failure modes:** Equipment free but order invalid, technician absent, fasting misunderstanding.
- **Risk/recovery:** high when affecting patient data or appointment authority. Request-only mode for unvalidated services; preserve clinical escalation.
- **Evidence required:** Clinical-owner template approval; Multi-resource/order failure evidence
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

#### M048 — Implement bounded recurring and linked-care scheduling

- **Objective:** Implement bounded recurring and linked-care scheduling
- **Rationale:** Series and pathways need explicit partial success and dependency semantics.
- **Dependencies:** M046, M047, M033, M018
- **Likely files/modules:** `packages/scheduling/series`, `packages/access-work`, `fixtures/series` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A08, A10, FHIR, C18
- **Requirement trace:** R08, R10, R19
- **Implementation requirements:** Create Series/AppointmentLink with approved cadence/windows and prerequisites; bounded native atomic batch or explicit partial/rolling confirmation. Support rehab and lab-specialist/pre-op/post-op relationships; exclude surgical clearance/OR optimization.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Requested series never presented as all booked without proof; 2. Changed predecessor creates reviewed impact task; 3. Occurrences preserve local time across DST
- **Tests:** Partial series conflicts and rolling-horizon tests; Predecessor change, cancellation and DST fixtures
- **Security/privacy:** Each patient/clinical-plan scope checked; no inference of new care plan.
- **Observability:** Series completion, partial allocation and broken prerequisite counts.
- **Localization:** Five-locale series summary with per-occurrence date/zone.
- **Failure modes:** One occurrence unavailable, provider leaves, clinical window shifts.
- **Risk/recovery:** high when affecting patient data or appointment authority. Stop series expansion; preserve confirmed occurrences and manual review.
- **Evidence required:** Series/graph fixtures and partial-success UX; Clinical plan boundary review
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

### S09B

#### M049 — Enable approved telehealth and request-first home visits

- **Objective:** Enable approved telehealth and request-first home visits
- **Rationale:** Remote and home services add jurisdiction, address and travel constraints.
- **Dependencies:** M040, M047, M013, M020
- **Likely files/modules:** `packages/scheduling/modalities`, `packages/access-work/dispatch`, `apps/web/booking` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A11, A15, GOV, C04, C35
- **Requirement trace:** R05, R10, R14
- **Implementation requirements:** Book approved provider-hosted telehealth with jurisdiction/consent/technical checks. Home visits remain request-first until staff validates team/vehicle/equipment/address/radius/travel windows. No autonomous route optimization or cross-country clinical assumption.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Telehealth eligibility includes current patient jurisdiction; 2. Home window clearly request until dispatch confirms; 3. Travel/setup occupancy prevents impossible native route adjacency
- **Tests:** Jurisdiction/consent and secure-link expiry tests; Out-of-radius, ambiguous address, prior/next travel and team absence tests
- **Security/privacy:** Home address private, generic messages; provider telehealth processing rights.
- **Observability:** Request-to-dispatch time, technical failures and travel feasibility rejects.
- **Localization:** Arabic address confirmation and five-locale modality instructions.
- **Failure modes:** Wrong jurisdiction, incorrect entrance, inaccessible video, underestimated travel.
- **Risk/recovery:** high when affecting patient data or appointment authority. Use assisted provider contact; do not falsely confirm unsupported modality.
- **Evidence required:** Provider/licensing approval and synthetic modality cases; Link/privacy and dispatch review
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

#### M050 — Implement group sessions and linked family appointments

- **Objective:** Implement group sessions and linked family appointments
- **Rationale:** Shared sessions and family logistics must not merge patient identity or privacy.
- **Dependencies:** M048, M017, M013
- **Likely files/modules:** `packages/scheduling/groups`, `packages/patient/delegation`, `apps/web/booking` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A22, A09, GOV
- **Requirement trace:** R07, R10, R14
- **Implementation requirements:** Reserve individual capacity units per participant and per-person eligibility/consent. Link separate family appointments to authorized booker and show partial confirmations. No shared medical record visibility from shared booking.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Every attendee has independent eligibility/seat; 2. Family linkage grants no clinical scope; 3. Partial failure preserves successful appointments and explicit choice
- **Tests:** Group capacity and participant removal races; Mixed guardian permissions and partial family confirmation tests
- **Security/privacy:** Per-person notifications/visibility; minor/sensitive-service policy enforced.
- **Observability:** Seats versus sessions and partial-family result counts.
- **Localization:** Five-locale whom-is-this-for and partial-success messages.
- **Failure modes:** One dependent unapproved, group full, canceled participant, shared phone.
- **Risk/recovery:** high when affecting patient data or appointment authority. Disable batch action; continue individual authorized booking.
- **Evidence required:** Group/family identity and capacity evidence; Privacy/guardian signoff
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

## P10

### S10A

#### M051 — Establish separate clinical consent and storage boundaries

- **Objective:** Establish separate clinical consent and storage boundaries
- **Rationale:** Timeline must not inherit marketplace permissions.
- **Dependencies:** M040, M003, M002
- **Likely files/modules:** `packages/clinical-consent`, `packages/clinical-storage`, `db/migrations` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A10, A19, A22, GOV
- **Requirement trace:** R14, R19
- **Implementation requirements:** Create clinical purpose/scopes, patient/delegate grants, segregated storage/keys/access policy, retention and revocation/export workflows. Record partner data rights and controller roles before import.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Booking staff cannot read clinical timeline by default; 2. Revocation blocks future reads/imports; 3. Every clinical access records purpose and source
- **Tests:** Clinical versus operational role matrix; Consent revocation, export and deletion/backup policy tests
- **Security/privacy:** Separate clinical zone and vetted processors; no default AI access.
- **Observability:** Consent/revocation/access-denial audit without clinical body.
- **Localization:** Five-locale granular notices and Arabic clinical/privacy review.
- **Failure modes:** Broad inherited role, invalid guardian grant, unlawful retention.
- **Risk/recovery:** high when affecting patient data or appointment authority. Disable clinical reads/imports, preserve lawful source records per policy.
- **Evidence required:** Signed clinical data flow/rights review; Policy tests and revocation evidence
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

#### M052 — Implement patient matching and validated FHIR imports

- **Objective:** Implement patient matching and validated FHIR imports
- **Rationale:** A correct clinical document attached to the wrong person is unsafe.
- **Dependencies:** M051, M038, M007
- **Likely files/modules:** `packages/clinical-import`, `packages/patient-matching`, `fixtures/fhir` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A10, FHIR, S092, S102, S114
- **Requirement trace:** R19, R14
- **Implementation requirements:** Bind patient identities with source-specific evidence; quarantine ambiguous matches. Validate selected FHIR resources/profiles, references, versions, pagination, deletions and provenance. Maintain correction/unmerge lineage and restricted operator review.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Shared phone/name alone cannot merge patients; 2. Unknown reference/version goes to quarantine; 3. Import stores source and immutable revision
- **Tests:** Identity collision/rekey/unmerge and duplicate import tests; Validator/profile and consent-revoked-mid-import tests
- **Security/privacy:** Least-privilege partner scopes; no public PHI validation service.
- **Observability:** Match confidence/ambiguity, validation rejects and import lag.
- **Localization:** Unicode names, original clinical code text and timezone.
- **Failure modes:** Wrong MRN namespace, duplicate chart, stale consent, source deletion.
- **Risk/recovery:** high when affecting patient data or appointment authority. Pause import and quarantine affected bindings; do not delete source hospital data.
- **Evidence required:** Validator/matching fixtures; Quarantine/correction and provenance evidence
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

#### M053 — Deliver the provenance-labeled patient timeline

- **Objective:** Deliver the provenance-labeled patient timeline
- **Rationale:** Continuity should explain where information came from and who can see it.
- **Dependencies:** M052, M021, M005
- **Likely files/modules:** `apps/web/timeline`, `packages/clinical-query` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A10, A19, FHIR
- **Requirement trace:** R08, R19, R14
- **Implementation requirements:** Present appointments/visits and permitted imported labs/reports/referrals/conditions/allergies/imaging references with source labels and time/version. Distinguish patient-entered/provider/imported/extracted information and corrections. No clinical advice or diagnosis generation.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Every item shows provenance; 2. Unverified extraction not shown as clinician fact; 3. Unauthorized/deleted/revoked items absent from reads/projections
- **Tests:** Mixed-source timeline and correction tests; Consent/tenant/delegate denial and pagination tests
- **Security/privacy:** Sensitive timeline no public cache or routine analytics text.
- **Observability:** Import freshness, inaccessible source and permission-denial metrics.
- **Localization:** Five-locale source labels, dates and original untranslated clinical terminology retained.
- **Failure modes:** Conflicting sources, missing report, wrong chronology, unsafe aggregation.
- **Risk/recovery:** high when affecting patient data or appointment authority. Fall back to appointment-only history; quarantine uncertain items.
- **Evidence required:** Synthetic timeline/source fixtures; Access and accessibility evidence
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

### S10B

#### M054 — Add safe documents and informational medication reminders

- **Objective:** Add safe documents and informational medication reminders
- **Rationale:** Useful continuity must preserve source prescriptions and avoid generated treatment.
- **Dependencies:** M053, M020, M051
- **Likely files/modules:** `packages/documents`, `packages/medication-info`, `apps/web/timeline` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A19, A15, S054, FHIR
- **Requirement trace:** R08, R14, R19
- **Implementation requirements:** Implement quarantined document upload/scan/render and source-linked extraction. Medication information distinguishes prescription, statement and patient entry; reminders require confirmed source schedule and clinical governance. Refine upload and reminder subcontracts before execution.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Uploaded content cannot execute; 2. Extracted medication never auto-creates treatment instruction; 3. Changed/stopped source suppresses obsolete reminder
- **Tests:** Malicious-format containment fixtures without exploit reproduction; Incorrect extraction, duplicate/stopped medication and consent tests
- **Security/privacy:** Private objects, short-lived authorized links; no sensitive lock-screen detail.
- **Observability:** Scan/quarantine, extraction-review and suppressed-reminder counts.
- **Localization:** Arabic/Latin drug-name display and explicit dose/time confirmation; five locales.
- **Failure modes:** Misread drug/dose, stale prescription, unsafe file, shared-phone disclosure.
- **Risk/recovery:** high when affecting patient data or appointment authority. Disable extraction/reminders; retain secure original document access as authorized.
- **Evidence required:** Document isolation and provenance tests; Clinical medication-scope approval
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

#### M055 — Expand verified family and caregiver permissions

- **Objective:** Expand verified family and caregiver permissions
- **Rationale:** Family care needs granular authority and sensitive-record exceptions.
- **Dependencies:** M050, M051, M053, M003
- **Likely files/modules:** `packages/patient/delegation`, `apps/web/family`, `packages/authorization` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A22, GOV, FHIR
- **Requirement trace:** R07, R14
- **Implementation requirements:** Implement reviewed guardian/caregiver verification, appointment versus clinical scopes, revocation/expiry/age transition and recipient preferences. Adolescent/sensitive-service policies are country-specific gates, not shared-account shortcuts.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Age/authority changes re-evaluate access; 2. Appointment grant does not imply clinical grant; 3. Revocation and disputed relationship fail closed
- **Tests:** Guardian expiry/age transition and conflicting grants; Shared phone, sensitive category and export-denial tests
- **Security/privacy:** Verified legal relationship and purpose; restricted evidence; accountable appeals.
- **Observability:** Grant changes, expired authority and privacy-safe access-denial trends.
- **Localization:** Five-locale relationship labels and Arabic family usability review.
- **Failure modes:** Guardian no longer authorized, coercive access, absent legal policy.
- **Risk/recovery:** high when affecting patient data or appointment authority. Suspend disputed grants and provide verified patient/support recovery.
- **Evidence required:** Legal/clinical signoff; Complete delegation matrix and synthetic journeys
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

## P11

### S11A

#### M056 — Deliver enterprise access governance and support contracts

- **Objective:** Deliver enterprise access governance and support contracts
- **Rationale:** Hospital groups need bounded branch administration and operating accountability.
- **Dependencies:** M040, M030, M002
- **Likely files/modules:** `packages/enterprise`, `packages/identity`, `apps/web/admin`, `docs/contracts` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A12, A13, A11, S077
- **Requirement trace:** R12, R14, R18
- **Implementation requirements:** Add contracted SSO/provisioning, branch delegated administration, audit export and integration capability dashboard. Define support SLA/maintenance windows and change notification; no sales waiver of core controls.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Provisioning cannot grant unreviewed clinical access; 2. Group admin limited by branch/purpose; 3. Revocation and audit export work under contract
- **Tests:** SSO/provisioning scope and revocation tests; Tenant/branch export and integration-version rollout tests
- **Security/privacy:** Least-privilege service accounts and encrypted scoped exports.
- **Observability:** Provisioning failures, privileged changes and partner SLO.
- **Localization:** Five-locale admin essentials and Arabic operational runbooks.
- **Failure modes:** Wrong group membership, credential rotation failure, contract mis-scope.
- **Risk/recovery:** high when affecting patient data or appointment authority. Disable provisioning integration; preserve manually reviewed roles.
- **Evidence required:** Enterprise permission matrix; Signed rights/SLA and authorized sandbox tests
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

#### M057 — Provide governed aggregate analytics and partner APIs

- **Objective:** Provide governed aggregate analytics and partner APIs
- **Rationale:** Enterprise value can scale without selling patient-level search histories.
- **Dependencies:** M056, M024, M040
- **Likely files/modules:** `packages/partner-api`, `packages/analytics`, `apps/web/enterprise` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A14, A11, A23
- **Requirement trace:** R11, R12, R14, R18
- **Implementation requirements:** Expose rate-limited scope-bound APIs and suppressed aggregate demand/capacity reports with definitions/coverage. Add client key rotation and consent-aware booking attribution. Clinical APIs remain separate from public/provider data.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. API key cannot cross tenant/scope; 2. Small-cell/complementary suppression survives filter combinations; 3. Reports do not imply causal or clinical performance ranking
- **Tests:** Scope/quota/key-revocation and aggregation privacy tests; Denominator/late-data reconciliation and version-contract tests
- **Security/privacy:** No individual cross-provider trajectories or raw symptoms; purpose-bound exports.
- **Observability:** API errors/quotas, suppressed cells and data freshness.
- **Localization:** Localized labels/documentation while stable API enums/codes remain invariant.
- **Failure modes:** Reidentification via differencing, stale report, overbroad partner token.
- **Risk/recovery:** high when affecting patient data or appointment authority. Suspend affected API scope/report; rotate keys and preserve audit.
- **Evidence required:** Privacy query review; Contract/reconciliation results and export audit
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

#### M058 — Prepare one evidence-backed international country pack

- **Objective:** Prepare one evidence-backed international country pack
- **Rationale:** International readiness requires legal and healthcare operations, not only text translation.
- **Dependencies:** M055, M056, M045
- **Likely files/modules:** `packages/country-config`, `packages/i18n`, `docs/country-launch` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A26, A22, GOV
- **Requirement trace:** R02, R07, R14
- **Implementation requirements:** Select a country only after product/market decision; document licensing, identity, privacy/transfers, telecom, terminology rights, payer norms, emergencies, address/time/calendar and service eligibility. Use existing five-locale platform; no unsupported auto-enable.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Country pack has signed legal/clinical/operations gates; 2. New locale/zone does not change existing bookings; 3. All claims trace to current primary sources
- **Tests:** Country config isolation, DST/date/phone/address and emergency-content tests; Consent/guardian and adapter capability review
- **Security/privacy:** Region-specific processing/rights and healthcare licenses verified.
- **Observability:** Country gate status, locale gaps and emergency content freshness.
- **Localization:** Human review by local language/healthcare experts; Arabic remains supported.
- **Failure modes:** Unlicensed service jurisdiction, wrong emergency route, misunderstood dates.
- **Risk/recovery:** high when affecting patient data or appointment authority. Keep country discovery-only or disabled until gates close.
- **Evidence required:** Country evidence dossier; Regulatory/procurement and localization approvals
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

### S11B

#### M059 — Validate scale and extract only measured bottlenecks

- **Objective:** Validate scale and extract only measured bottlenecks
- **Rationale:** Scale should preserve transactions and reduce operating risk.
- **Dependencies:** M056, M057, M027
- **Likely files/modules:** `infra/scaling`, `packages/integration`, `packages/search`, `docs/adr` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A01, A06, A09, S072, S078, S083
- **Requirement trace:** R12, R20
- **Implementation requirements:** Measure load/cost and isolate adapter or voice workers where justified. Evaluate Temporal/OpenFGA/warehouse only against measured requirements. Keep reservation authority in one transaction domain; test migrations/rollback and recovery.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Extraction has measurable benefit and preserved contracts; 2. Native multi-resource invariants survive target load; 3. No unbounded dual-write migration
- **Tests:** Load/cost/recovery and contract regression; Migration, reconciliation and cross-tenant isolation tests
- **Security/privacy:** No widened secret/data access during extraction; protected replicas/backups.
- **Observability:** Capacity, cost, queue age and transaction contention with privacy-safe metrics.
- **Localization:** No locale-specific degradation beyond recorded budgets.
- **Failure modes:** Premature services, split reservation authority, broken migration rollback.
- **Risk/recovery:** high when affecting patient data or appointment authority. Retain monolith path; reverse traffic migration without dual authority.
- **Evidence required:** Before/after measurements; ADR and safe migration/recovery evidence
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.

#### M060 — Decide expansion readiness from evidence and unresolved risks

- **Objective:** Decide expansion readiness from evidence and unresolved risks
- **Rationale:** Growth must not outrun trusted supply, clinical safety or economics.
- **Dependencies:** M058, M059, M057, M055
- **Likely files/modules:** `docs/expansion-decision`, `docs/roadmap`, `docs/governance` (proposed paths; adapt to actual repository with recorded scope rationale).
- **Source/donor references:** A26, A23, A01
- **Requirement trace:** R11, R14, R18, R20
- **Implementation requirements:** Review current supply freshness, booking correctness, integration SLOs, review governance, AI/voice quality, privacy, country gates and paid retention economics. Approve bounded next cohort or record repairs; don't label unsatisfied evidence complete.
- **Constraints:** No unrelated platform features, copied donor platform, production data or deployment beyond this task's explicit gate.
- **Acceptance criteria:** 1. Expansion has accountable signed decision; 2. Critical safety/privacy/booking risks closed or feature disabled; 3. Forecasts separated from measured results
- **Tests:** Independent evidence/claims audit; Recompute core metrics and verify gate/dependency freshness
- **Security/privacy:** Only aggregate decision evidence; preserve restricted legal/patient material.
- **Observability:** Gate status and trend baselines with owner/date.
- **Localization:** Country/locale-specific evidence not pooled to hide weaknesses.
- **Failure modes:** Stale certification, unsafe cohort pooling, cost overrun, unsupported market claim.
- **Risk/recovery:** high when affecting patient data or appointment authority. Keep current cohort bounded; pause new geography/service enablement.
- **Evidence required:** Expansion decision with exact evidence revisions; Residual-risk register and rollback plan
- **Definition of done:** Every acceptance condition passes at the recorded implementation revision; scope and dependency evidence are checked, residual risks recorded, and an independent check confirms the outcome. An executor success statement alone is insufficient.
