# Zyara appointment system plan

Status: canonical planning decision, 2026-09-13. Owner: Scheduling lead. Execution: [Muse handoff](ZYARA_MUSE_EXECUTION_HANDOFF.md). Requirements here are proposed Zyara behavior, not claims that any system has already passed tests.

## 1. Decision and evidence

Build a healthcare scheduling domain inside the modular monolith, with a PostgreSQL reservation ledger, versioned rules, hybrid availability computation, and adapters that declare authority and capabilities. The first usable slice reserves one practitioner and optional room using the same multi-resource transaction required later for dentistry and imaging. Ship simple service configurations first; do not postpone concurrency protection until after booking launches.

Separate four questions: does time exist, is this patient eligible, can this channel reserve it, and has the authoritative system confirmed it? Search may answer the first approximately; only the booking command answers the last.

The following primary sources were checked on 2026-09-13. Confidence is high in the documented contract, not in any untested deployment:

| Evidence | Published scope | Design consequence |
|---|---|---|
| [FHIR R4 Appointment](https://hl7.org/fhir/R4/appointment.html), [Schedule](https://hl7.org/fhir/R4/schedule.html), [Slot](https://hl7.org/fhir/R4/slot.html) | HL7 official R4 4.0.1 definitions | Administrative appointments, participant responses and availability are distinct; free does not mean eligible. A Slot can carry capacity; it is not itself a patient booking. |
| [IHE Scheduling](https://profiles.ihe.net/ITI/Scheduling/), [ITI-115](https://profiles.ihe.net/ITI/Scheduling/ITI-115.html), [ITI-116](https://profiles.ihe.net/ITI/Scheduling/ITI-116.html), [ITI-117](https://profiles.ihe.net/ITI/Scheduling/ITI-117.html), [ITI-118](https://profiles.ihe.net/ITI/Scheduling/ITI-118.html) | 1.0.0 Trial Implementation, published 2024-12-12, FHIR R4 | Find potential appointments, optional hold, book/modify/cancel, find existing. ITI-117 uses $book for modification and cancellation too; do not invent mandatory $modify or $cancel IHE transactions. |
| [Medplum scheduling](https://www.medplum.com/docs/scheduling), [availability](https://www.medplum.com/docs/scheduling/defining-availability), [find](https://www.medplum.com/docs/scheduling/appointment-find), [book](https://www.medplum.com/docs/scheduling/appointment-book) | Official docs; scheduling remains Beta at review | Useful dynamic generation and atomic appointment/slot/buffer reference. Multiple schedules require compatible alignment settings. Its operation semantics do not imply generic FHIR POST prevents conflicts. |
| [Medplum August update](https://www.medplum.com/blog/august-2026-update), [demo](https://github.com/medplum/medplum-scheduling-demo) | Update posted September 2026; separately pinned demo | Dedicated react-scheduling package now exists; the older demo is workflow study, not proof of latest server compatibility. |
| [HL7 v2.6 chapter 10](https://hl7.nl/images/downloads/leden/HL7%20Version%202.6/V26CH10Scheduling.pdf) | Official affiliate-hosted historical standard chapter | Legacy SIU is essential; negotiate vendor profile and version. Transport/application acknowledgement is not proof of patient booking. |
| [Oracle Slot](https://docs.oracle.com/en/industries/health/millennium-platform-apis/mfrap/api-slot.html), [Schedule](https://docs.oracle.com/en/industries/health/millennium-platform-apis/mfrap/api-schedule.html), [Appointment](https://docs.oracle.com/en/industries/health/millennium-platform-apis/mfrap/api-appointment.html) | Official Millennium API documentation | Resource-list appointment types and customer-specific identifiers constrain availability. A FHIR endpoint is not universal order scheduling. |
| [Jane scheduling](https://jane.app/features/scheduling), [NexHealth waitlist](https://www.nexhealth.com/features/waitlist), [Open Dental ASAP](https://www.opendental.com/manual/webschedasap.html) | Vendor product page / dental user manual; medium/high documented confidence | Rooms, buffers, preferences, expiring refill offers and messaging are already competitive expectations. No vendor performance percentage is a Zyara forecast. |
| [PostgreSQL ranges](https://www.postgresql.org/docs/current/rangetypes.html), [locking](https://www.postgresql.org/docs/current/explicit-locking.html) | Official current documentation | Range exclusion and ordered row locking provide the native transaction primitive. |

## 2. Domain model and invariants

Every operational row includes tenant_id, opaque canonical ID, revision, created_at, updated_at and audit correlation. Public graph IDs can be referenced across tenants; booking ownership cannot. Resource identity is distinct from employment/PractitionerRole so a practitioner working across branches cannot be double-booked by two role IDs within the same authorized scheduling domain. Across independent organizations, identity linkage is permissioned and only busy occupancy may be shared; no worldwide cross-tenant lock is claimed.

| Entity | Required semantics |
|---|---|
| HealthcareService | What care a branch offers: taxonomy, modality, qualified roles, site, insurance assertions, preparation owner. Not synonymous with specialty. |
| AppointmentTypeVersion | Service variant: initial/follow-up, duration policy, resource recipe, rules, intake version, buffers, notice/horizon, cancellation and confirmation policy. Immutable after use. |
| Resource / CapacityUnit | Practitioner, nurse, technician, chair, room, machine, lab seat, remote-session capacity, team, vehicle or service pool. Physical capacity is represented by distinguishable units; service-wide limits get their own units or locked counters. |
| ScheduleVersion | Resource/service/location-local weekly rules, IANA zone, alignment, effective interval, exceptions and source revision. A branch's opening hours are not a practitioner's hours. |
| Candidate | Short-lived computed option containing service, site, eligible resource alternatives, start/end, rule/schedule versions, source, observed_at, expires_at and booking mode. Not a reservation. |
| Reservation / ReservationItem | Hold or committed allocation of capacity units for exact half-open UTC intervals, including resource-specific preparation and cleanup. Active flag maintained transactionally. |
| Appointment | Patient/authorized booker, service/type snapshot, agreed interval/location/participants, authoritative system, lifecycle dimensions, policy snapshot, source IDs and revision. |
| AppointmentRequest | Requested preferences, provider response deadline and reason for decision. A request need not reserve capacity. |
| BookingOperation | Durable operation ID, actor, tenant, idempotency key, request digest, command state, external correlation, retry/reconciliation state. |
| RuleEvaluation | Rule version, input provenance, result code, missing material inputs and patient-safe explanation. Do not store excess questionnaire answers in logs. |
| WaitlistEntry / Offer | Preferences, consent, eligibility, original appointment link, priority basis, allocation strategy and expiring claim. |
| CareAccessTask / RecallPlan | Authorized referral, follow-up or order scheduling work with issuer, clinical window, prerequisites and closure evidence. |
| AppointmentLink / Series | Parent/child, replaces/replaced-by, prerequisite/window relations and partial completion policy. |

Invariants:

1. Only the authoritative booking owner can establish booked status.
2. No active native reservation items overlap the same capacity unit, including buffers. A two-resource booking is all-or-none.
3. Capacity greater than one means explicit finite units, not a Boolean free flag.
4. A confirmed appointment retains the service, duration, policy and rule versions accepted at booking.
5. Appointment lifecycle, patient attendance confirmation, delivery status, arrival workflow and clinical encounter status are separate.
6. External side effects never happen inside a long-held database transaction.
7. No reschedule destroys the original appointment before the replacement is authoritatively secured, except an explicitly consented vendor workflow that cannot preserve it; that workflow uses staff assistance initially.
8. Every change is authorized, version checked, audited and emits a durable domain event in the same commit.
9. An expired hold cannot be redeemed even when the expiry worker is delayed.
10. Provider subscription state never changes clinical eligibility or cancels existing patient care.

## 3. Service recipes and scope

Durations below are synthetic examples for tests, not clinical recommendations. Providers approve actual templates and preparation.

| Service | Example recipe | Constraints and release |
|---|---|---|
| Physician consultation | 20 minutes practitioner + optional room; 5-minute cleanup | New/returning, age, accepting-new-patients, language; pilot. |
| Dental cleaning/procedure | 40/60 minutes hygienist or dentist + chair + assistant when required; 10-minute cleanup | Procedure type, infection-control buffer, qualified substitute; core can represent now, specialty validation P09. |
| MRI / ultrasound | 30/45 minutes machine + technician + room; separately scheduled interpretation if needed | Valid order, modality-specific preparation and clinician screening; never AI clearance; P09. |
| Lab draw | 10 minutes phlebotomist + lab chair | Order, fasting instructions from lab, collection opening times, capacity pool; P09. Walk-in queue is a different capacity model. |
| Physiotherapy / rehabilitation | 45 minutes therapist + room/equipment | Approved series, minimum intervals, substitution consent; P09. |
| Vaccination / screening / nursing | Service capacity + qualified nurse + location | Clinician-approved eligibility/order and follow-up windows; P09. |
| Mental health | Clinician + private room or approved remote session | Sensitive category notifications, age and modality policies; independent clinical/privacy review before enablement. |
| Telehealth | Clinician + licensed remote-session capacity | Patient current jurisdiction, age/consent, licensed service location and technical readiness; do not assume anywhere-to-anywhere licensing; P09. |
| Home healthcare | Team + vehicle + service window + travel buffers | Address confidence, service radius, accessibility, prior/next travel and equipment; request-only until dispatch validation in P09. |
| Procedure / surgery | Ordered pathway with room/equipment/clinical teams | Representable graph, but theatre optimization and surgical clearance deferred beyond P11. |
| Group / family visits | Group session capacity or separate patient appointments linked to one booker | Each attendee has separate consent/eligibility; a family booking does not create shared clinical access. P09. |

## 4. Availability algorithm

Choose a hybrid. Precompute patient-free candidate windows for the next 30 days (provider-configurable horizon, pilot maximum 90 days) and coarse next-available summaries for search. Compute exact candidates dynamically on availability query and re-evaluate on hold/book. These numbers are initial operational limits, not measured optimization.

Processing order:

1. Resolve active branch, service, type version, provider credentials and authority capability. Exclude withdrawn/suspended services.
2. Expand weekly local-time rules into a bounded interval using the schedule's IANA zone and tzdb version.
3. Intersect facility/service/resource working intervals. Apply approved one-time opens; then hard blocks, sick leave, closures, holidays and vacations override opens. Conflicting overrides are rejected at authoring rather than ordered silently.
4. Generate aligned starts from the service's local-time anchor. Verify the full duration plus each resource's pre/post buffer fits all calendars.
5. Select feasible resource combinations from typed recipes, preserving qualifications and substitutions. Bound search complexity; return narrower windows or request mode rather than unbounded combinatorics.
6. Subtract native active reservations and authoritative external busy intervals. Include expiry inline cleanup under lock at booking, not solely in candidate generation.
7. Apply minimum notice, same-day cutoff, booking horizon, per-day/per-session limits and eligibility.
8. Return candidate token + provenance/freshness + rule result; never embed patient identifiers in public cache keys.
9. On commit, repeat material checks against current authority, versions, time and resource occupancy.

Cache key includes tenant/service/location/type/schedule revision, requested range and rule context class, without raw symptoms or insurance member identifiers. Patient-specific outcomes are private. Rule edits and cancellation events invalidate projections through the outbox. A stale index affects search order; it cannot authorize booking.

### Time and capacity edge cases

Store UTC instants for committed bookings and original IANA zone, local civil time, offset and tzdb version. Use half-open intervals [start,end), seconds/minutes precision agreed per adapter. Recurrence is authored in local time; do not repeat by adding 24 hours UTC. For DST gaps, reject an impossible local time and ask for another. For folds, require an explicit offset choice and show the zone; do not silently choose first. A tzdb change triggers future-booking impact review, never silent movement of confirmed care.

Gregorian date/UTC is canonical; optional Hijri is a display alternative with locale/calendar label and paired Gregorian date at confirmation. Do not parse an ambiguous 03/04 date without locale confirmation. Ramadan and Eid schedules are provider-approved dated overrides, not automatically inferred religious holiday closures.

Variable duration is a deterministic provider-approved rule based on minimal inputs; a duration change invalidates a candidate and requires renewed confirmation. Existing bookings retain snapshots and generate staff impact tasks when new policies make them operationally unsuitable.

Capacity uses explicit units for rooms/seats/machines. Lock a service/session guard when a count limit spans several physical units. Overbooking is disabled in pilot. Later exceptional capacity must be a separate approved reserve unit with reason, authorized role and patient impact warning; never bypass the exclusion constraint or use predicted no-show as automatic permission.

Substitutions require equivalent credentials/service capability and compatible site/equipment. A patient-selected named practitioner, gender preference or language is a hard constraint unless the patient affirmatively accepts an alternative.

## 5. Explainable eligibility

Implement a typed, versioned rules library with a restricted declarative format; no arbitrary provider JavaScript and no LLM decision. Result is ALLOW, DENY, NEEDS_INPUT, NEEDS_STAFF_REVIEW or SOURCE_UNAVAILABLE. Every rule carries stable code, purpose, issuer, effective dates, severity, input provenance and localized explanation. Missing data is not false. Sensitive inputs are collected only after their relevance is explained.

| Rule family | Input / behavior | Patient explanation example |
|---|---|---|
| Age / clinically relevant sex | Age at visit, only clinically justified sex-related requirement; separate self-described gender from clinical fields | This service is available for patients aged X and above. Staff can help find another service. |
| New / returning | Verified relationship at that practice; prior appointment elsewhere does not establish it | This provider currently accepts follow-up patients only. |
| Service / reason / specialty | Approved taxonomy and type mapping; free text does not determine clinical clearance | Please choose the service, or ask the clinic to confirm the appointment type. |
| Insurance | Payer + exact network/product + branch/service/provider/date; unverified acceptance remains unknown | The clinic lists this network; your visit benefits still need confirmation. |
| Referral / authorization / order | Issuer, validity window and service match; expired or missing -> review/request | This appointment requires a referral. |
| Provider / site / duration / resources | Active role, privileges, site, full recipe and preparation interval | This location cannot provide that service at this time. |
| Language | Stated available language or approved interpreter; preference vs must-have explicit | An interpreter needs to be arranged before confirmation. |
| Telehealth / geography / home radius | Patient current jurisdiction, approved radius and service capability | This service is offered within the clinic's home-visit area. |
| Intake / documentation / preparation | Versioned required answers/documents and provider review; no automated medical suitability assertion | The clinic must review your preparation questionnaire. |
| Minimum interval / follow-up window | Clinician-authored plan and earlier completed event with provenance | Your care team requested a visit within this date window. |
| Accepting new patients / capacity policy | Provider attestation freshness, session restrictions | This provider has paused new-patient bookings. |

Show blockers with a next step (provide information, request review, choose another service, call); do not silently hide all failures. Clinical red flags route out of ordinary scheduling via the safety policy; they do not become insurance/ranking filters.

## 6. Modes and patient flow

Discovery, map, profile, AI/voice, referral, recall, waitlist, QR, provider embed and campaign links all create the same BookingIntent. Anonymous users can see public profiles and patient-free availability. Verify a contact and establish a minimal patient/account or approved delegate relationship just before an action creates a hold/request/booking. Do not require full national ID for browsing; collect provider-required identifiers only at the appropriate protected step.

| Mode | Patient promise | Reservation and deadline |
|---|---|---|
| Instant | Confirmed only after authoritative commit | Native short transaction or tested external write/read confirmation. |
| Request | Request received; clinic will decide by displayed deadline | No assumed capacity reservation. Pilot response target two working hours, next opening if closed. Escalate overdue; never auto-book. |
| Hold-and-confirm | Temporarily reserved until displayed time; still not booked | Pilot native hold 5 minutes, capped extension to 10 total on explicit interaction; configurable reviewed policy. Long clinical review uses request, not hours of slot locking. |
| Call-to-complete | Call the clinic to arrange care | Track initiated call, not appointment or attended conversion. |
| External redirect | Continue at named provider site | Consent-aware attribution, no patient health details in URL; return can be recorded but booking remains unverified without authoritative callback/read. |

Common flow: show mode and freshness → choose exact service/site/practitioner/time → explain material eligibility and provider price if verified (otherwise unknown; Zyara fee zero) → identify patient/delegate and verify contact → minimal intake → review exact details, date/zone, policy and data sharing → explicit final action → authoritative outcome. Show operation reference on lost network and resume it across devices.

A patient's “confirm attendance” reply updates response only, not booked lifecycle. One-tap links open a scoped authenticated or possession-token review surface; HTTP GET never cancels or books, because mail scanners follow links. POST plus explicit intent performs action. Sensitive changes and delegate actions may require step-up verification.

## 7. Lifecycle dimensions

| Dimension | Values |
|---|---|
| Booking lifecycle | proposed, requested, held, pending_external, booked, fulfilled, cancelled, rejected, expired, entered_in_error |
| Patient response | needs_action, tentative, accepted, declined |
| Visit operations | not_arrived, arrived, checked_in, in_progress, completed, no_show |
| Integration operation | queued, sent, acknowledged, outcome_unknown, reconciled, failed_terminal |
| Notification | scheduled, sent, delivered, failed, suppressed, read (if reliably reported) |
| Replacement relationship | none, replacement_pending, replaced; old/new IDs and reason |
| Clinical encounter | Separate Encounter with source-specific clinical states and access policy |

“Confirmed” in patient copy means booked lifecycle, never a distinct loose status. Reminder-sent belongs to notification events. Cancelled-by-patient/provider are reason/actor attributes. Rescheduled is an event and replacement link; it is not a FHIR lifecycle status. Completed operations can establish attendance evidence; clinical completion is authoritative only if provided by a permitted source.

### Transition table

All events below contain event_id, tenant_id, aggregate_id, aggregate_version, occurred_at, recorded_at, actor/purpose, correlation_id, source and minimal payload. Write audit + event with the transition. Consumers cannot invent transitions.

| From → to / dimension | Authorized actor and guard | Event |
|---|---|---|
| none → proposed | Patient/delegate or staff finds option; ephemeral by default | CandidatePresented (minimized analytics, not persistent appointment necessarily) |
| proposed → requested | Patient/delegate; minimal identity, policy acknowledgement | AppointmentRequested |
| proposed → held | Patient/delegate/staff; native or supported remote authority reserves all resources | HoldCreated |
| held → held extension | Holder; expiry and maximum total checked | HoldExtended |
| held → expired | Inline command or expiry worker; database time >= expires_at | HoldExpired |
| held/proposed/requested → pending_external | Booking service; external command durable before sending | ExternalBookingSubmitted |
| held/proposed/requested → booked | Native service after transaction, staff approves request with atomic allocation, or authoritative adapter evidence | AppointmentBooked |
| pending_external → booked | Adapter/reconciler with authoritative external ID and matching details | AppointmentBooked / ExternalOutcomeResolved |
| pending_external → rejected | Conclusive remote rejection; not mere timeout | BookingRejected |
| requested → rejected | Authorized scheduler, reason and alternatives | RequestRejected |
| requested → expired | Deadline policy, with patient notification and staff escalation | RequestExpired |
| pending_external → pending_external | Timeout/ambiguous ACK; outcome_unknown flag and reconcile task | ExternalOutcomeUnknown |
| booked → booked patient response | Patient/delegate confirmed attendance; revision guard | AttendanceResponseRecorded |
| booked → arrived | Reception or validated check-in flow at correct branch | PatientArrived |
| arrived → checked_in | Reception/intake operator; identity match and intake requirements | PatientCheckedIn |
| checked_in/arrived → in_progress | Authorized clinical workflow source or staff with narrowly granted operational role | VisitStarted |
| booked/arrived/checked_in/in_progress → fulfilled, operations completed | Attested attendance source; optional separate Encounter link | AttendanceRecorded / AppointmentFulfilled |
| booked → no_show operations | Authorized scheduler after grace period and service end policy; attendance dispute possible | NoShowRecorded |
| booked/requested/held → cancelled | Patient/delegate within policy, authorized staff/provider or authoritative adapter; remote cancel remains pending until known | AppointmentCancelled |
| booked → replacement linked | Reschedule service after safe allocation; old cancels with replaced reason | AppointmentRescheduled, AppointmentCancelled, AppointmentBooked |
| terminal → entered_in_error | Restricted correction operator, reason and review; no destructive erasure | AppointmentMarkedInError |
| no_show/completed correction | Restricted supervisor with supporting evidence; retain history and reopen dependent reviews if necessary | AttendanceCorrected |

Public no-show copy is not an accusation. Prevent no-show after completed without correction authority. Patient self-cancellation is allowed only before the configured arrival/start cutoff; once care is in progress, a patient can request assistance but cannot rewrite the visit as never attended. A no-show transition requires no recorded arrival/start/completion, or a supervisor's separately audited correction. Walk-in arrival without booked appointment uses explicit staff-created booking/attendance workflow, not impossible state patching. Clinical data corrections require their own authority, not an operations administrator.

## 8. Native transaction and concurrency

PostgreSQL is the single native writer. Redis locks, calendar UI state and search index are not capacity authority.

Native hold/book protocol:

1. Authenticate and authorize patient/delegate/staff against tenant/service; validate bounded request and idempotency key.
2. Create/lock BookingOperation unique on tenant + actor + operation kind + idempotency key. Same key and same digest returns existing result; different digest returns conflict. Keep durable result at least through appointment lifecycle plus approved audit retention; short-lived dedupe caches are not enough.
3. Begin short transaction. Lock resource/unit and applicable session-limit guard rows in stable ascending ID order; lock relevant appointment/hold and policy revision rows using the same ordering convention.
4. Reap expired overlapping holds for the locked units using database time. Set their reservation items inactive and append expiry events in this transaction. Never use a partial index predicate involving now().
5. Recheck active credential/service, schedule/rule/type revisions, patient's material eligibility, capacity, current notice/cutoff, and accepted details. A revised interval/provider/policy returns needs_reconfirmation.
6. Choose finite units, insert/update active reservation items with a range exclusion constraint over tenant/resource_unit/occupied_interval. Use btree_gist where needed. Equal start/end is invalid. Guard rows serialize count-based session limits.
7. Convert a valid holder's items to committed; create/update appointment snapshot and response, operation result, audit and outbox.
8. Commit; only then return booked or held. A constraint conflict returns alternative candidates, never a confirmation.

Use optimistic expected_version/If-Match for appointment edits and staff drag/drop. Exclusions and locks enforce real-time capacity independently. Retry deadlocks/serialization failures a bounded number with the same operation ID; do not retry semantic conflicts blindly. Database constraints protect all writer paths, including admin/import routes.

Duplicate intentional booking from two devices using different keys requires a patient/service overlap check under a patient booking guard. Return an existing appointment or ask explicit confirmation for a clinically legitimate second service. Do not automatically merge patient identities to obtain a lock. Public abuse limits cap active holds by verified actor/service and expire idle flows; accessibility extensions remain available.

### Cross-system limits and reconciliation

There is no distributed all-or-none transaction across unrelated EHRs. Mirroring cannot guarantee that a clinic's independent writer respects Zyara's lock. An external adapter must support authoritative conditional booking or equivalent conflict enforcement to qualify for instant booking.

Persist command before remote call, include stable external correlation/idempotency if supported. On timeout, return “We are checking with the clinic; please do not book again” with operation ID and a support route. Query external appointments by correlation and patient/service/time within permission; ambiguous matches go to staff. Do not repeat a create without documented retry safety. A late success becomes booked only after detail verification, even if a local hold expired. If the patient requested cancellation while outcome was unknown, serialize intent and compensate only after finding the actual external booking.

Retried callbacks are deduplicated in inbox by source + event ID and content hash; mismatched duplicate content is quarantined. Record event/source version, observed time and receive time. Apply source sequence/version when present; otherwise fetch authoritative current state rather than last-write-wins on arrival time. Scheduled reconciliation repairs lost webhooks and tombstones. The adapter owns cursors, full-sync checkpoints, re-key mapping and conflict queue.

## 9. Authority and adapter contract

The old numbered integration ladders are superseded. A provider has a display mode plus a capability vector, independently versioned per branch/service. Clinical read permission does not imply write scheduling capability.

| Mode | Availability / slot owner | Appointment / cancellation owner | Demographics owner | Arrival / encounter completion | Reconciliation |
|---|---|---|---|---|---|
| Listing / call / redirect | Provider assertions only; no live promise | Provider; Zyara records referral action only | Patient account local; provider identity distinct | Unknown unless attested later | Profile freshness and opt-in outcome follow-up |
| Zyara-native | Zyara rules and reservation ledger | Zyara | Patient profile plus practice registration mapping | Practice operational attestation; clinical encounter remains clinical source | Ledger/projection integrity, staff correction queue |
| External read-only | Provider API | Provider; call/redirect/request | Provider patient index plus local patient binding | Read only if separately permitted | Poll/webhook refresh; TTL suppresses instant promise |
| External read/write | Provider system | Provider authoritatively; Zyara issues commands | Provider registration mastered there, patient corrections reviewed | Provider per granted resource | Operation correlation, event + periodic reconciliation |
| Mirrored | Named owner per resource; never two unqualified masters | Contractually chosen owner; mirrored projection not independent authority | Field-level ownership | Explicit per-field source | Version/cursor reconciliation, quarantine conflict |
| Event-driven external | External owner; event freshness measured | External owner; event does not itself grant write access | Explicit source | Explicit source | Inbox + gap detection + scheduled repair |

Capability vector: discover, availability_read, freshness_SLA, hold, hold_release, hold_expiry_known, book, conditional_book, idempotent_create, find_by_correlation, modify_atomic, cancel, status_read, event_delivery, event_ordering, patient_match, registration_write, check_in, encounter_read, order_read, referral_read, identity_rekey, consent_scopes, rate_limits, supported_types and timezone_precision. Unsupported is explicit; never emulate atomic modify with unsafe cancel-first behavior.

Adapter boundary (typed request/result definitions, implementation later):

- discoverCapabilities and health: versioned contract and stale/degraded reasons.
- findPotentialAppointments(query): candidates, TTL, source revision, eligibility limitations.
- hold(candidate, expiryRequest, operationId) / releaseHold: supported only when remote semantics known.
- book(command, operationId): booked, rejected or outcome_unknown; external ID/evidence required for booked.
- modify(appointmentRef, expectedVersion, change) / cancel: authority-specific outcome.
- findExisting(patientBinding, timeRange, correlation): permission bounded, pagination explicit.
- ingestEvent(envelope), reconcile(cursor), resolvePatient(binding): tenant-scoped and auditable.

FHIR R4 is first interoperability boundary; R5 has an independent mapping/version negotiation. IHE find returns potential Appointment resources, not a promise of pre-generated Slot IDs. Map an internal hold to pending only in a partner profile that conveys expiry and allocation semantics. Standard R4 Appointment does not encode every Zyara state.

HL7 v2 SIU: S12 new, S13 reschedule, S14 modification, S15 cancellation, S16 discontinuation, S17 deletion, S18–S22 resource changes, S23 block, S24 unblock, S26 no-show. Agree MSH sender/facility IDs, message control IDs, SCH placer/filler identifiers, PID identity binding, AIS/AIG/AIL/AIP service/resource/location/person maps, timezone, cancellations and ACK/error handling with each hospital. Receiving SIU alone enables mirroring, not booking commands. Hospital middleware can expose approved commands; otherwise request/call.

Calendar APIs import minimal busy intervals; do not import titles/attendees/clinical descriptions by default. [Google sync](https://developers.google.com/workspace/calendar/api/guides/sync) documents token invalidation requiring a full resync; [push](https://developers.google.com/workspace/calendar/api/guides/push) is a change signal, not a booking transaction. CSV/SFTP uses schema version, checksum, restricted inbox, validation report and batch provenance; it can populate directories/working hours, but stale batch data cannot support instant external booking.

Each adapter certification includes vendor sandbox/authorized test environment, capability evidence, rights/contract, identifiers, rate limits, downtime behavior, DST, cancellation, version changes and operational owner. Never promise an integration from a vendor logo alone.

## 10. Waitlist and cancellation refill

Waitlist entry specifies eligible patient/service/type, earliest/latest dates, time-of-day windows in local zone, preferred/acceptable clinicians and branches, accessibility/language, channel and consent, priority basis, original booked appointment and willingness to switch. Do not infer willingness to cancel another visit.

MVP follow-on uses sequential offers to avoid speed/device bias: stable priority band set by authorized clinical staff when justified, then waiting time, then deterministic tie-break ID. Patient-selected convenience is separate from clinical urgency. Log overrides. AI may normalize preferences and explain alternatives; it cannot invent urgency, demote predicted no-shows or allocate based on payer revenue.

Upon resource release, matching service creates bounded eligible candidates, rechecks rules and obtains a real native/remote hold for one recipient. Offer includes explicit expiry, exact replacement details and whether the later booking will be cancelled. Expiry after a quiet-hours boundary is extended or offer delayed within availability; never consume a patient's response opportunity overnight.

Pilot default offer window 30 minutes during opted-in contact hours, configurable per service; use a distinct waitlist hold policy with short maximum allocation budget so one candidate cannot block a day. If no remote hold exists, label an invitation to check availability, not a reserved offer. Sequential algorithm skips an unreachable channel with audited reason and retains queue position where appropriate.

Acceptance is idempotent, validates holder/expiry/current eligibility, secures the earlier appointment and only then cancels the later appointment using the reschedule protocol. Native replacement is one transaction. Cross-authority replacement uses a saga: replacement booked, old cancellation pending, reconcile; patient sees both until cancellation verified. If old cancellation fails, notify patient/staff, do not silently cancel the new visit. Expired acceptance returns fresh alternatives and keeps original appointment.

Later optional batch invitations must say availability is competitive, do not reserve one slot for multiple people, limit burst/duplicates and monitor demographic/channel fairness. Multi-capacity sessions may offer one real unit each. Metrics: released capacity, eligible pool, offers sent/delivered, response opportunity, accepted, authoritative fills, expired, original-cancel failures and time saved. “Offered” is not “filled.”

## 11. Recall, referral and access work

Recall is a reusable workflow with an authorized clinical or operational origin, not AI-generated care advice. A clinician-entered follow-up, approved referral or service order provides source ID, issuer/role, service, earliest/latest window, preparation, permitted substitutions, clinical escalation owner and consent/purpose. Changes to clinical windows require that issuer's authority.

Plan states: draft → approved → due → contacted → scheduling_in_progress → booked → completed; plus deferred_by_patient, declined, unreachable, expired, cancelled and needs_clinical_review. Appointment cancellation reopens work only if the plan still permits; do not send duplicate recalls after completion. Booking alone does not close a clinical follow-up task.

Campaign templates: clinician six-week review, dental approved recall, vaccination/preventive program, recurring rehabilitation, missed/cancelled recovery, referral conversion and order-to-schedule. Each records enrollment purpose, dedupe key, maximum contacts and stop conditions. Abandoned booking recovery is optional explicit opt-in, not inferred consent to health marketing. No medication reminder or screening interval is inferred from an LLM; imported medication schedules need provenance and later clinical governance.

Urgent or overdue care requires the issuing clinical team's escalation policy, not a generic marketing retry. Patient opt-out stops that channel; an authorized care team may have another lawful operational route only under reviewed policy. The product cannot itself decide legal basis or clinical urgency.

## 12. Notifications, change and provider operations

One orchestration module evaluates purpose/consent, verified destination, locale, patient's zone, quiet hours, deduplication, current appointment revision and template version at send time. Channels: in-app first; pilot email/SMS; push, WhatsApp and voice follow approved vendor/consent configuration. Delivery callbacks update notification state, never appointment state.

Send event types: booked, request received/decision, hold expiry, attendance reminder/response, cancellation/reschedule, intake/preparation, directions, secure telehealth link, delay/site change, waitlist offer, follow-up. Generic preview: “You have an appointment update. Open Zyara.” No specialty, symptom, medication, national ID or dependent name in lock-screen previews. Secure body is access checked on open; shared-phone preferences can suppress external channels entirely.

Default reminders proposed 24 hours and 2 hours before a visit, adjusted for last-minute booking and explicit preference. This is a testable operating hypothesis, not a clinically proven cadence. Cancel queued reminders atomically through event/revision checks after cancellation; allow a narrowly logged in-flight delivery race, and send correction if needed. Retry transient failures with bounded exponential backoff; stop invalid numbers, honor unsubscribe, choose fallback only with consent. Escalate clinically necessary failure to the responsible practice.

One-tap cancel/reschedule means few steps after identity assurance, not destructive unauthenticated GET. Show policy before booking and again at change. After cutoff, provide an assistance route and record intent immediately; do not hide cancellation to improve no-show statistics. Optional reason choices with “prefer not to say”; free text private. Zyara charges no cancellation penalty; provider fee policy, if any, must be clearly external and verified.

Bulk absence: provider marks an impacted interval, sees preview of affected service/resources, selects authorized substitutes or creates patient offers, confirms batch, and tracks each operation independently. Never silently move a named clinician's patients. Preserve service/reason and compatible intake; re-consent if form/material purpose changes. Record change source, notify and queue refill of safely released capacity.

Calendar has day/week/month plus accessible list, practitioner/branch/resource filters, privacy mode, status labels beyond color, keyboard create/change, availability templates, blocks/leave/holidays, queue, waitlist and integration-health panel. Drag/drop opens confirmation and runs the same versioned command as patient reschedule. Conflict rows expose safe resolution and external authority; UI cannot force-write over remote truth.

## 13. Linked care and staged complexity

A series contains independently identifiable appointments plus cadence/window constraints. Reserve an entire native series atomically only for a bounded batch that the database can handle; otherwise show partial availability and require explicit acceptance. Never imply that “6 sessions requested” means six confirmed. Rolling reservation policies are explicit.

Linked pathways model prerequisites (lab before specialist), intervals, same-day continuity, ordering role and parent plan. A changed predecessor triggers validation of dependents and a staff task; it does not automatically cancel clinically necessary care. Separate appointment attendance, care-plan progress and medical clearance. Family batching preserves per-patient identity, eligibility, notifications and delegate scope. Group attendance counts each participant and seat independently. Surgical orchestration, autonomous route optimization and population-level clinical optimization are deferred.

## 14. Failure behavior and evidence

| Failure | Required patient/staff behavior | Required evidence |
|---|---|---|
| Provider/API down or stale availability | Degraded mode; show last checked and request/call alternative; circuit breaker | Adapter downtime contract and TTL test |
| Slot gone / booking conflict | Clear loss, preserve inputs, fresh alternatives | Simultaneous capacity-one and multi-resource races |
| External success response lost | Checking confirmation, operation resume, no blind retry | Fault after external commit before response |
| Local “failed” later remote success | Correct state via reconciliation; notify and honor pending cancel intent | Late callback/out-of-order test |
| Two devices or repeated clicks | Return original operation; detect separate-key duplicate booking | Same/different-key concurrency cases |
| Hold expires / worker down | Redeem rejected by DB time; original appointment retained | Boundary-time and stopped-worker tests |
| Webhook duplicate/reordered | Inbox dedupe, version reconciliation, no repeated notifications | Replay and gap-recovery evidence |
| Patient duplicates / external IDs change | Quarantine mapping, human reviewed merge/rekey, preserve audit | Conflicting demographics and ID reuse fixtures |
| Clinic closes / practitioner leaves | Disable new supply, affected-booking queue, contact/safe alternatives | Graph withdrawal to scheduling propagation |
| Insurance stale | Qualified acceptance wording or review; no benefit guarantee | Expiry rule and provider correction tests |
| Notification failure | Booking stays valid; visible channel failure and permitted recovery | Callback, invalid destination and consent revocation |
| Entire day cancelled | Preview, per-item outcome, retained unresolved cases | Partial external failures and resumable batch |
| Duration or preparation changes | Existing snapshots retained; impact-review queue | Version migration test |
| DST/tzdb change | Explicit ambiguous times; no silent booked-time mutation | Riyadh, Berlin, New York folds/gaps |
| External reschedule lacks safe atomicity | Staff-assisted flow, explain old appointment risk before any action | Capability rejection test |

Release gates are in [test/evidence plan](ZYARA_TEST_AND_EVIDENCE_PLAN.md). Native invariant violations and false confirmations have zero tolerance in test runs and are launch blockers. This plan defines guarantees within Zyara authority and honest failure behavior at external boundaries; it does not promise global prevention of independent hospital double booking.
