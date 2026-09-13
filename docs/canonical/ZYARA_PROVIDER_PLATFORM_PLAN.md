# Zyara provider platform plan

Canonical 2026-09-13. Provider product/operations owner. Related: [requirements](ZYARA_PRODUCT_REQUIREMENTS.md), [scheduling](ZYARA_APPOINTMENT_SYSTEM_PLAN.md), [privacy](ZYARA_PRIVACY_SECURITY_COMPLIANCE_PLAN.md).

## Subscription value and commercial boundary

Sell a dependable operations product: accurate service profiles, calendar/requests, reduced scheduling work, cancellation recovery, follow-up tracking, reliable integrations and usable monthly reports. Clinics should retain value when marketplace traffic is low. Avoid presenting unverified “new patients generated” as the only reason to renew.

Proposed packaging, subject to actual willingness-to-pay interviews: free basic claim/correction/verification and public factual profile; Clinic Operations subscription per active branch with an included staff/resource band; multi-branch Group subscription; contracted Integration/Enterprise setup and recurring support; later governed aggregate analytics/API products. No per-booking commission and no patient booking fee. No exact SAR price is validated in this plan. Test packages and cost floors with signed pilot proposals before fixing prices.

Prices/entitlements cannot influence organic ranking, verified badge issuance or review moderation. Paid integrations may improve actual freshness/UX; ranking uses measured factual freshness available to all eligible sources, not paid plan labels. Report this possible indirect advantage transparently. Billing suspension disables new premium automation after notice but preserves patient appointment access, safe cancellation, export and continuity handoff.

## Provider acquisition and verification

Recruit a compact supply cohort whose service coverage overlaps real patient needs; do not launch thousands of stale listings. Start with consented provider submissions, direct group agreements and rights-cleared public sources. Maintain lawful source terms, attribution and provenance. Public credential lookup and map APIs are not unrestricted harvesting permissions.

Onboarding steps:

1. Establish legal organization and authorized representative; verified work channel and role evidence, branch hierarchy and enterprise ownership.
2. Create facility/branch/department with National Address where permitted, coordinates and entrance precision, contact channels, accessibility, hours and timezone.
3. Add practitioner identity, role at branch, specialty/subspecialty, supplied gender/languages, qualifications, professional registration, service privileges and effective dates.
4. Define HealthcareServices and appointment types, resource recipes, service/practitioner hours, durations/buffers, notice/horizon/age/returning rules, intake and cancellation policy.
5. Add insurer network/product acceptance by branch/service/role, dates, attesting person and evidence. Explicitly separate listed acceptance from benefits authorization.
6. Choose integration mode/capabilities and source of truth, map IDs and privacy scope, assign outage/reconciliation owner.
7. Run synthetic booking/request/cancel/no-show and corrected-attendance rehearsals; train reception and manager.
8. Publish only ready service/mode combinations; staff sees blockers and recheck dates.

Readiness scores: graph completeness, verification quality, scheduling configuration and integration health, each separate. Suggested weighted completeness score helps staff prioritize but cannot override mandatory blockers (expired credentials, missing service duration, unauthorized representative, unknown appointment owner). Public states explain exactly what was verified. Claim disputes freeze sensitive edits without erasing a legitimate provider listing.

[SCFHS verification](https://scfhs.org.sa/en/E-Services/regvaliddescription) and [MOH licensing guide](https://static.moh.gov.sa/assets/pdf/Healthcare-Licensing-EN.pdf) are official evidence checked 2026-09-13; registration validity does not automatically prove branch-specific procedure privileges. Human operations must close that gap.

## Calendar, queues and assistance

Calendar: day/week/month plus accessible list, branch/practitioner/room/resource filters, status labels and source-sync indicator, privacy mode and role-appropriate patient information. Author recurring templates, exceptions, leave and holidays with conflict preview. Drag/drop and bulk changes go through the same backend policies as patient changes.

Staff operations: new booking, request decision with deadline, waitlist review, quick reschedule, cancellation reason, check-in queue, delay/branch-change message, original booking lookup, integration error/reconciliation work and lost-confirmation operation status. Preserve patient inputs on conflict. Offer substitute provider only after consent; a manager cannot force a service onto an unqualified resource.

Assisted phone booking records acting staff, patient contact verification route, consent/purpose and exact accepted details. Call-center agents see only necessary fields. A recorded phone call is not required by default. Prevent duplicate creates when patient and receptionist are concurrently acting.

## Metrics contract

Every event has source, stage, event time, session/operation pseudonymous key, tenant/branch/service, locale, permitted attribution and quality flag. Raw health free-text queries are excluded by default; use curated aggregate intent categories and redacted, separately reviewed samples only with appropriate basis. Suppress small groups and explain coverage.

| Metric | Definition / denominator | Action |
|---|---|---|
| Search/map impressions | Distinct displayed result exposures; dedupe same session/result/view window | Correct missing services and geo coverage |
| Profile views / directions / phone / website clicks | Distinct actions per scoped session; separate channel types | Improve profile/access instructions; clicks are not visits |
| Availability impressions | Candidate sets actually shown, grouped by mode and freshness | Reduce empty/stale calendars |
| Booking start / completion | Start = material booking intent; completion = authoritative booked result | Funnel by native/external/request mode; requests counted separately |
| Abandonment | Started operations with no booked/request submission by defined 24-hour observation window; exclude unresolved external outcomes | Inspect excessive forms/conflicts, not automatic marketing |
| Request turnaround | Submitted to decision, business-hours and elapsed-time views | Staff queue staffing/SLA |
| Cancellation / reschedule | Unique appointment changes by actor/reason and notice interval; avoid counting reschedule cancellation twice | Review policy and clinic absence planning |
| No-show rate | Authoritatively no-show / (completed + no-show) for elapsed appointments with known outcomes; show missingness separately | Improve contact/preparation, never deny access by prediction |
| Completed visits | Attendance/encounter evidence by source confidence; unknown excluded and disclosed | Measure actual access |
| Waitlist fills | Earlier appointment booked from accepted offer and original cancellation outcome known | Refill released resource time |
| Time-to-next-appointment | Earliest currently eligible time minus query time for specified service/patient class; sampled methodology | Adjust supply/template hours |
| Resource utilization | Committed occupied minutes / available capacity-unit minutes, with clinical time and buffers separately | Detect bottleneck room/machine, not just clinician count |
| Conversion by provider/service/location | Authoritative booked / qualifying starts at that grouping; eligibility/traffic mix disclosed | Improve operations; do not label clinical quality |
| Geography/specialty/insurance/language demand | Suppressed aggregate eligible intent counts and unresolved needs | Add services/languages; avoid reidentifiable patient maps |
| Zero results / unmet demand | Eligible query category with no matching options; distinguish no provider vs no time vs unknown insurer | Data corrections versus actual supply gaps |
| Completeness / review trends | Mandatory blocker counts; experience dimensions/count/recency | Improve evidence and patient experience |
| Source attribution / AI conversion | Consented source link/channel and same authoritative funnel; last touch not causal incrementality | Compare channels without double-counting |
| Returning patients | Practice-specific returning relationship, not cross-provider identity tracking | Continuity scheduling |

Provider reports contain monthly totals, prior-period comparison, baseline coverage, missingness, operational explanation and three concrete actions with owners. Include request backlog, next-available gaps, cancellation/attendance sources, resource bottlenecks, refill benefit, profile quality and review experience. Do not export another provider's identifiable patient behavior.

## ROI and pilot economics

Measure four-week baseline where available, then eight-week pilot as a proposed operating study; minimum sample thresholds are in the roadmap. Use matched weeks/services and annotate Ramadan, holidays, provider absences, supply changes and channel selection. Before/after association is not proof of causal uplift; randomized or stepped introduction can be used where appropriate and ethical.

ROI worksheet: staff minutes saved × verified loaded hourly cost + incremental attended visits × provider-supplied contribution margin + avoided administrative rework − subscription − integration/support/channel costs. Keep incremental attended visits separate from total Zyara bookings to avoid displacement inflation. Do not invent contribution margins. Capacity minutes released but never filled are a different benefit from realized revenue.

Operational unit economics: B2B recurring revenue, setup recovery, hosting/search/ASR/messages cost, implementation hours, monthly support hours, retention and gross margin by tier. Provider willingness to pay requires an accepted paid proposal or renewal commitment, not a survey compliment. If integration support costs dominate willingness to pay, constrain supported vendors or charge a transparent integration service fee, never introduce patient booking fees by default.

## Enterprise and governance

Later enterprise features: SSO/provisioning, branch delegated administration, service-level capability dashboards, audit export, sandbox API keys, rate limits, approved data exports, contractual uptime/support, integration change notification and clinical-record scopes. Enterprise sales cannot waive isolation, verification or negative-review policy.

On-call clinic relationship owner monitors unresolved booking/cancel operations; data steward owns stale service/insurance facts; clinical team owns recall urgency and preparation; Zyara trust team owns review appeals; privacy owner approves data-sharing requests. Each pilot clinic names real people for these roles before live traffic.
