# Provider Platform and Business Model

## Business model

### Patient side

- free account;
- free search and map;
- free booking;
- no patient booking fee;
- Zyara does not need to process the clinical consultation payment in the core product.

### Provider side

Recurring SaaS subscriptions fund the platform.

Proposed packaging (names are placeholders):

#### Zyara Presence

- claimed/verified profile;
- branches;
- practitioner roster;
- specialties/services;
- insurance/languages;
- verified reviews;
- basic visibility analytics.

#### Zyara Pro

Everything in Presence plus:

- Zyara scheduling/booking;
- reminders;
- waitlist;
- staff roles;
- review/reputation workflows;
- advanced analytics;
- monthly reporting.

#### Zyara Connect

Everything in Pro plus:

- HIS/EHR/PMS/calendar integration;
- real-time availability;
- two-way appointment synchronization;
- integration monitoring;
- higher API limits/support.

#### Zyara Enterprise

For hospital groups and large networks:

- multi-organization/multi-branch management;
- enterprise SSO;
- custom roles/policies;
- custom integration adapters;
- data export/warehouse options;
- SLAs;
- audit/compliance features;
- enterprise analytics;
- dedicated onboarding/support.

Pricing must be validated with Saudi providers before lock. Do not encode prices into architecture.

## No pay-to-win medical ranking

Subscription buys software capability, analytics and integrations—not hidden organic ranking.

This is a trust principle and should be enforceable in ranking architecture.

## Provider onboarding lifecycle

### Stage 0 — discovered/unclaimed

Listing exists from an allowed source. Provenance is visible internally and profile status is clear.

### Stage 1 — claim initiated

Representative proves authority to manage the organization/facility.

### Stage 2 — organization verification

Validate legal/facility information according to launch-market requirements.

### Stage 3 — practitioner verification

Verify practitioner identity/registration where a supported regulatory workflow/API exists. For Saudi Arabia, SCFHS registration verification is a core reference:

https://scfhs.org.sa/en/node/1992

### Stage 4 — enrichment

Provider adds:

- branches;
- services;
- practitioners;
- insurance;
- languages;
- photos;
- schedules;
- booking rules;
- accessibility information;
- integration choice.

### Stage 5 — publication

Quality checks and policy attestation complete.

### Stage 6 — maintenance

Track stale fields and require periodic confirmation for high-impact data such as insurance, practitioner affiliation and booking availability.

## Clinic dashboard

### Discovery

- search impressions;
- map impressions;
- profile views;
- top queries;
- top services/specialties;
- geographic catchment;
- insurance demand;
- language demand.

### Engagement

- phone clicks;
- directions clicks;
- website clicks;
- booking-start rate;
- booking-completion rate.

### Operations

- bookings;
- completed appointments;
- cancellations;
- reschedules;
- no-shows;
- waitlist fills;
- median lead time;
- supply utilization.

### Reputation

- review volume;
- rating trend;
- dimension trends;
- provider response rate;
- moderation/dispute status;
- recurring themes from privacy-safe review analysis.

### AI contribution

- AI-assisted discovery impressions;
- AI recommendation → profile click;
- AI recommendation → booking;
- unresolved intents that reveal missing services/data.

### Opportunity intelligence

Examples:

- demand for a specialty the clinic does not list;
- heavy demand after 18:00 with no evening availability;
- high insurance-filter demand for a network not listed;
- profile traffic with low booking conversion due to stale/no availability;
- multilingual demand not matched by listed practitioner languages.

## Monthly report

Generate a provider-readable report with:

1. executive summary;
2. demand and visibility;
3. booking funnel;
4. operational performance;
5. reputation;
6. top practitioners/services;
7. demand gaps;
8. AI/search insights;
9. benchmark deltas when privacy thresholds allow;
10. recommended actions.

Reports should distinguish observations from recommendations.

## Integration maturity

### Level 0 — Listing only

No booking integration.

### Level 1 — Zyara scheduling

Provider runs availability inside Zyara.

### Level 2 — Calendar/PMS sync

Calendar or practice-management integration.

### Level 3 — HIS/EHR booking integration

Two-way real-time availability and appointments.

### Level 4 — Clinical interoperability

Patient-authorized FHIR/HL7 data exchange and richer continuity.

### Level 5 — Enterprise

Custom adapters, multiple facilities, SSO, governance, SLAs, analytics exports.

This ladder lets every provider participate without making a complex integration a prerequisite for discovery.

## Provider roles

At minimum:

- organization owner/admin;
- branch admin;
- scheduling/reception;
- practitioner;
- analytics/marketing;
- integration admin;
- support/read-only auditor.

Permissions must be explicit and scoped by organization/branch.

## Provider support

Study Chatwoot, Zammad, UVDesk, Peppermint and Frappe Helpdesk patterns for:

- support inbox;
- ticket lifecycle;
- SLA queues;
- provider onboarding assistance;
- integration incident workflows.

Do not automatically expose internal patient health data to support staff.
