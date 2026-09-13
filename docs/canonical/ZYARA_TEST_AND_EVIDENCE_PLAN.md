# Zyara test and evidence plan

Canonical 2026-09-13. Quality/SRE/security/clinical-safety owners. This is a specification of future implementation checks. No Zyara application tests, benchmarks, compliance audit or live appointment tests were executed during the documentation mission.

## Evidence model

Each Muse work packet binds the exact task/plan digest, repository base, dependency results, allowed change surface and acceptance checks. Evidence binds implementation SHA, tool/runtime/environment versions, commands, fixtures, outputs, observed paths, reviewer, residual risk and result digest. Executor self-report cannot mark a task verified. This adopts the method documented in [SpecGrain qualification](ZYARA_SOURCE_QUALIFICATION.md); it is not a claim that native SpecGrain commands were run.

Keep fixtures synthetic and rights-cleared. Synthea can seed clinical structure, but Saudi names, addresses, insurers, service recipes, resource constraints and Arabic/RTL cases need curated synthetic additions. Use reserved test contacts and non-delivering messaging adapters. No real national IDs, patient transcripts or third-party attack targets are needed.

## Test/evidence catalog

| ID | Coverage / owner | Required proof and failure threshold | Task coverage |
|---|---|---|---|
| T01 | Build/dependencies / engineering | Clean install, locked versions, SBOM, license/install-script/advisory/secret checks; no unresolved material install risk | M001 |
| T02 | Identity/authorization / security | Patient/delegate/staff/tenant/branch matrix; denied cross-boundary reads/writes, revocation and non-bypassable admin separation | M002, M017, M051, M055, M056 |
| T03 | Graph/provenance / data | Identifier collisions, hierarchy, merge/unmerge, withdrawal, evidence expiry and rights; every public material claim has source | M006–M009 |
| T04 | Domain/rules / scheduling | All eligibility families, missing-input tri-state, service recipe versions, buffers, substitutions and explicit blockers | M013–M014 |
| T05 | Concurrency / database | >=100 simultaneous capacity-one attempts, multi-resource contention, repeated keys, separate-key duplicates and invariant queries; zero duplicate unit allocations/false confirmations | M015–M018, M032 |
| T06 | Temporal behavior / scheduling | Boundary expiry with worker stopped, stale token, UTC/IANA, DST gaps/folds, recurring overrides and tzdb impact; no silent booked-time shift | M014–M015, M048 |
| T07 | Booking lifecycle / product | Every allowed/forbidden transition, exact confirmation, separate reminder/patient response/arrival/Encounter; no fabricated success | M016–M019 |
| T08 | Cancellation/reschedule / scheduling | Old appointment survives failed replacement; scoped POST actions, cutoff help, preserved intake and native atomic replacement | M018, M032, M037 |
| T09 | Notifications / operations | Consent at send, quiet hours, template version, duplicate callbacks, stale reminder suppression, shared-phone previews and retries | M020, M034 |
| T10 | Trust / trust operations | Attendance source/correction/dispute, invite-all, negative-review retention, anonymous display, replies, small-sample aggregation and appeals | M021–M023 |
| T11 | Search relevance / search | >=300 judged intents; top-5 service/provider coverage target >=90% and locale gap <=10 points or remediation; disclose held-out split and disagreement | M010–M012 |
| T12 | Localization/accessibility / design | Five locale catalogs, Arabic RTL/bidi, keyboard/screenreader, zoom/reflow, non-color status, accessible list alternative; WCAG 2.2 AA audit target | M005, M012, M017, M026 |
| T13 | Analytics / data | Reconcile event/appointment totals; dedupe late corrections; correct denominators/coverage; privacy suppression and differencing review | M024–M025, M057 |
| T14 | Adapter contract / interoperability | Capability truth, patient/source IDs, supported types/scopes, stale data and conditional write semantics; every enabled capability evidenced | M036–M040 |
| T15 | External uncertainty / integration | Remote success then lost response, late callback, unsafe retry blocked, serialized cancel intent and old/new reschedule failure | M037, M040 |
| T16 | FHIR/HL7 / interoperability | Official profile validation, references/status/time mappings, SIU events/ACK distinctions, pagination/tombstones/rekey and unknown extensions | M038–M040, M052 |
| T17 | Waitlist fairness / product | Preferences, sequential priority bands/FIFO, expiry/retry/quiet hours, no opaque no-show exclusion, original preserved and fills verified | M031–M032 |
| T18 | Recall/referral / clinical owner | Issuer authority, valid windows/orders, stop conditions, opt-out, duplicate suppression and clinically owned overdue escalation | M033–M035 |
| T19 | AI safety / clinical/security | >=500 navigation + >=100 critical/adversarial cases; all designated critical cases safely handled, zero invented structured facts/unconfirmed writes/unauthorized tools | M041–M043 |
| T20 | Voice / ASR lead | Dialect/code-switch/critical entity corpus; >=95% critical entity target or remediation; all uncertain critical fields confirmed; privacy deletion and device latency | M044–M045 |
| T21 | Specialty resources / clinical/scheduling | Dental/imaging/lab/nursing/telehealth/home, qualifications/equipment/orders/travel, partial series/group/family outcomes | M046–M050 |
| T22 | Clinical privacy/provenance / privacy | Separate grants/keys/storage; patient match quarantine, source labels, correction/revocation/export/deletion and document isolation | M051–M055 |
| T23 | Resilience/load/restore / SRE | Measured budgets, DB/worker failures, delayed outbox, circuit breaker, restore and event replay; no integrity compromise | M027, M040, M059 |
| T24 | Operational usability / provider | Reception rehearsal: provider absent, request overdue, insurer stale, clinic closed, duplicate patient, integration IDs change and notification fails | M028, M019 |
| T25 | Launch evidence / accountable owners | Actual legal/clinical/vendor approvals, signed readiness, measured pilot/paid commitments and explicit go/iterate/stop | M029–M030, M058, M060 |

These are proposed target thresholds. Passing a finite corpus does not prove absence of rare harm or universal clinical safety. Report counts, confidence intervals where meaningful, subgroup performance and known exclusions. No measured score is supplied in this planning package.

## Race/failure suite design

Use a deterministic controllable clock for unit rules and a real PostgreSQL instance for contention tests. Assert final invariants from durable data, not merely HTTP response counts. Capture operation history so successful/failed/pending responses can be compared to actual reservations. Repeat randomized orderings with recorded seeds when a race warrants it.

Required interleavings: two patients same unit; one patient two devices; same/different idempotency key; hold expiry versus redeem; blocked interval versus book; resource substitution versus staff leave; cancel versus check-in; replacement versus original cancellation; worker crash after DB commit before delivery; webhook replay/gap/out-of-order; external create committed then response lost; external cancellation rejected after replacement success. Multiple capacity units and buffers must appear in these tests.

No load test against third-party production without explicit permitted environment and scope. Contract stubs model ambiguous outcomes; authorized vendor sandbox validates negotiated semantics. A vendor sandbox pass does not prove every hospital customer config, so certification is per partner/branch/service/profile.

## Nonfunctional budgets and gates

Initial proposals: search server p95 <800 ms, native booking p95 <2 s excluding user input, 99.9% monthly API availability, outbox p95 age <30 s, released resource projection <60 s, RPO <=5 min and RTO <=2 h. Measure on documented pilot-size datasets/concurrency and approved infrastructure; if unattainable, change scope/budget explicitly rather than label tests passed.

External synchronous wait target 10 s before honest pending state, unknown-operation operational reconciliation target five minutes, staff escalation by 15 minutes. These are service design targets subject to partner capacity and clinic staffing; exceeding a target must be visible and actionable. No target authorizes a false confirmation.

Blocking defects: false native confirmation/capacity overlap, unauthorized clinical/tenant access, lost or duplicate external write due to unsupported retry, unconfirmed AI action, missing required urgent escalation, misleading privacy/consent, unreviewed clinical eligibility, or irreversible cancel-first reschedule without supported consent/workflow. Usability/performance issues have severity and owner; critical accessibility failure in the booking route also blocks launch.

## Review and evidence storage

Proposed evidence path docs/evidence/<task-id>/<run-id>/ with manifest, summary and links to machine outputs. Keep confidential procurement/clinical/legal records in restricted storage referenced by ID; never commit patient data, secrets or private contracts to this public repository. Review scope against actual Git diff, check license notices for dependencies/copies and verify that acceptance is tested rather than merely restated.

Documentation mission validation is separate: required files, task field completeness, unique IDs, dependency DAG, phase/slice counts, source records, local Markdown links, cross-reference consistency, encoding and git diff checks. Its results are recorded in [planning validation](../research/PLANNING_VALIDATION.md). Passing that check means the plan is coherent and inspectable; it does not certify the product.
