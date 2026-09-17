# Zyara donor deep dive — TheHalfMoon/Qdrat

**Research date:** 2026-09-17
**Snapshot evaluated:** `TheHalfMoon/Qdrat@e2d288940aab52af881786678b2fc86dfa5c272a`
**Purpose:** give Astro a source-level map of Qdrat capabilities that can strengthen Zyara Clinic workforce, administration, communications, reporting and automation without importing a generic HRMS wholesale.

## Founder authorization and provenance boundary

The founder states that Zyara has permission to copy and use source from `TheHalfMoon/Qdrat`.

Qdrat's current public tree is derived from the Horilla HRMS lineage and its repository README declares LGPL-2.1. Founder authorization is therefore an important input but is not, by itself, proof that every inherited upstream file can be relicensed or stripped of its existing obligations. Before copying code, Astro must record exact file-level origin, current license/header/NOTICE obligations, whether the copied code is founder-authored or inherited, and the legal basis for the intended Zyara distribution mode.

This deep dive is a planning/adoption map, not a blanket instruction to vendor the whole repository.

## What Qdrat currently contains

The evaluated snapshot exposes a broad workforce and operations system including:

- company / organizational scoping;
- departments, job positions and job roles;
- employee profiles and work information;
- shift definitions, rotating shifts and shift schedules;
- work-type requests and shift-change requests;
- attendance, overtime, late/early tracking and attendance corrections;
- leave types, balances, requests, approvals and restrictions;
- recruitment, interview scheduling and candidate document collection;
- onboarding stages, tasks and candidate portals;
- offboarding stages, tasks, resignation and exit reasons;
- payroll, contracts, allowances, deductions, reimbursements and loans;
- performance objectives, key results, feedback and meetings;
- project/task/timesheet workflows;
- asset inventory, requests, allocation, history and renewals;
- helpdesk tickets, attachments, comments and FAQs;
- notifications, announcements and email logging;
- configurable mail automations;
- WhatsApp Business credentials, signed webhook handling, message templates and interactive flows;
- Google Meet credential/meeting integration;
- report templates, subscriptions, favorites, saved views, presets and run logs;
- audit/history support;
- local/Google Drive backup models;
- multi-company selection/scoping and company-aware request context;
- security/quality workflows including CodeQL, Trivy, gitleaks and test suites.

## Highest-value Zyara Clinic adaptations

### 1. Clinic organization and workforce graph

Qdrat's company/department/job-role/work-information patterns are directly useful as a reference for:

```text
HealthcareOrganization
  -> Branch
     -> Department / Service Line
        -> Team
           -> StaffAssignment
```

Zyara must not replace healthcare-specific `Practitioner`, `PractitionerRole`, credentials, privileges or FHIR-aligned organization/location semantics with generic HR entities. The useful adaptation is the workforce-management layer around those healthcare identities.

Recommended disposition: **ADAPT**, not whole-module copy.

### 2. Staff shifts, leave and coverage

Qdrat has mature concepts for employee shifts, rotating shifts, shift schedules, shift requests, work-type requests, leave requests, approvals and holidays.

Astro should reuse/adapt the underlying workflow patterns for:

- receptionist/front-desk shifts;
- nursing/support staff rosters;
- clinician administrative availability where clinic-owned;
- leave and approved absence;
- branch coverage;
- schedule exception generation;
- handover requirements;
- conflict detection between workforce availability and patient schedules.

Healthcare scheduling authority remains separate. A staff shift change must not silently rewrite booked patient appointments or clinician availability without the Zyara scheduling domain's audited operation and required notifications.

Recommended disposition: **ADAPT SELECTIVELY**.

### 3. Approval workflows

Qdrat repeatedly uses manager/permission-aware approval patterns across leave, shift changes, assets, onboarding and offboarding.

Zyara can adapt this into a generic governed approval primitive for non-clinical operational actions such as:

- leave approval;
- schedule-template changes;
- high-impact roster changes;
- profile publication changes;
- purchasing/asset requests;
- staff access requests;
- policy acknowledgements.

Clinical signing, prescription approval, prior authorization and claims authority must use their own domain contracts and cannot be reduced to a generic HR approval flag.

Recommended disposition: **PATTERN ADAPTATION**.

### 4. Staff lifecycle

Recruitment, onboarding, document requests, onboarding stages/tasks, offboarding pipelines and exit workflows are useful for a future clinic workforce module.

Astro should map them to:

- invitation and account provisioning;
- role assignment;
- policy and training acknowledgements;
- credential document collection;
- branch/team assignment;
- equipment/access provisioning;
- deactivation and access revocation;
- patient/workflow reassignment before departure;
- retention/audit of employment history.

Credentialing/privileging for clinicians requires healthcare-specific verification and must remain separate from generic onboarding completion.

Recommended disposition: **ADAPT / LATER NATIVE MODULE**.

### 5. Tasks, helpdesk and operational queues

Qdrat's project/task, helpdesk, comments, attachments and status patterns are relevant to Zyara's internal clinic work queues.

Useful targets include:

- front-desk exception queue;
- referral follow-up tasks;
- prior-auth exception tasks;
- refill-routing tasks;
- result-review tasks;
- facility maintenance/helpdesk;
- IT/access requests;
- automation-generated human handoffs.

Zyara should converge this with the AI-era human exception queue instead of creating parallel task systems.

Recommended disposition: **ADAPT CONCEPTS / CONVERGE WITH ZYARA TASK DOMAIN**.

### 6. WhatsApp and notifications

Qdrat contains WhatsApp Business credential management, webhook signature verification, templates, flows and outbound notifications. This is highly relevant to Saudi clinic operations.

Astro must evaluate exact reusable components for:

- webhook verification;
- channel credential isolation;
- inbound message normalization;
- template/flow lifecycle;
- outbound message dispatch;
- per-tenant/channel settings;
- notification bridging.

Do not copy employee-specific assumptions. Zyara's channel adapter must be purpose-aware, consent-aware, locale-aware, PHI-safe, idempotent and integrated with the unified conversation model.

Recommended disposition: **HIGH-PRIORITY SELECTIVE ADAPTATION CANDIDATE**.

### 7. Mail automation

Qdrat's `MailAutomation` concept shows configurable trigger/condition/template/recipient workflows.

This is useful as a UX and configuration reference for low-risk clinic automations, but Zyara's durable workflow engine needs stronger guarantees: versioned state, typed actions, retries, idempotency, receipts, outcome verification, resumable exceptions and explicit automation authority.

Recommended disposition: **REFERENCE / UX PATTERN**, not core runtime reuse without qualification.

### 8. Reporting and subscriptions

Qdrat includes report templates, subscriptions, saved views, filter presets, favorites and run logs.

Astro should adapt these patterns for Zyara Insights:

- saved operational views;
- scheduled reports;
- branch/team dashboards;
- report run history;
- role-scoped sharing;
- export audit;
- denominator/missingness metadata.

Patient-level and clinical analytics require stronger privacy controls, small-cell suppression and purpose limitation.

Recommended disposition: **ADAPT**.

### 9. Audit and company scoping

Qdrat contains company-aware middleware/managers and audit/history support. These are useful implementation references for tenant isolation and change history.

Zyara already has stronger healthcare tenancy/provenance requirements. Qdrat should be used as a source of implementation lessons and tests, not as authority over Zyara's tenant model.

Recommended disposition: **REFERENCE / SELECTIVE TEST-PATTERN ADAPTATION**.

### 10. Assets and facilities operations

Qdrat's asset categories, items, assignments, requests, history and renewal concepts can support non-clinical facility operations such as staff laptops, tablets, badge devices and clinic equipment administration.

Medical-device inventory, sterilization, maintenance, calibration and regulated supply-chain workflows require healthcare-specific extensions and must not be inferred from generic HR assets.

Recommended disposition: **LATER ADAPTATION**.

## Capabilities Astro should not blindly import

### Payroll and general HR ERP

Payroll, tax, loans, allowances and deductions are not required to make the healthcare network work. They should be classified as:

- external HR/payroll integration by default;
- optional later Zyara Workforce capability only if validated by clinic demand.

### Recruitment ATS

Recruitment is useful but not core to the first clinic operating-system slices. Preserve architectural seams, but do not let ATS scope block care delivery, scheduling, communications, insurance or clinical workflows.

### Biometrics, face detection and geofencing

Qdrat includes biometric/face/geofencing-related surfaces. Zyara must **not** adopt these by default. They introduce sensitive-data, proportionality, consent, employment-law, security and spoofing concerns. If a clinic later requires attendance hardware integrations, prefer provider-neutral adapters and explicit jurisdictional/privacy review.

Recommended disposition: **REJECT AS DEFAULT / EXTERNAL INTEGRATION ONLY IF JUSTIFIED**.

### Google Meet as Zyara Connect core

Qdrat's Google Meet integration is a useful integration example but should not determine the Zyara Connect media architecture. The Connect media engine remains a separate qualification decision.

Recommended disposition: **REFERENCE ONLY**.

## Proposed Qdrat-to-Zyara mapping

| Qdrat capability | Zyara target | Initial decision |
|---|---|---|
| Company / Department / JobRole | Clinic org/workforce layer | ADAPT |
| Employee / WorkInformation | StaffAssignment around healthcare identities | ADAPT |
| Shift / rotating shift / schedules | Workforce scheduling | ADAPT |
| Leave / holidays / approvals | Staff absence and coverage | ADAPT |
| Recruitment | Workforce extension | DEFER |
| Onboarding / offboarding | Staff lifecycle + access lifecycle | ADAPT LATER |
| Attendance | Workforce operations | OPTIONAL / INTEGRATE |
| Payroll | External HR/payroll boundary | DEFER / INTEGRATE |
| PMS objectives/feedback | Workforce performance | DEFER |
| Project/task/timesheet | Human task/exception patterns | ADAPT SELECTIVELY |
| Helpdesk | Clinic ops/service desk | ADAPT |
| Assets | Facility/staff asset operations | ADAPT LATER |
| Notifications | Channel orchestration reference | ADAPT |
| MailAutomation | Low-risk automation configuration UX | REFERENCE |
| WhatsApp | WhatsApp Business adapter patterns | HIGH-PRIORITY ADAPT |
| Reports/subscriptions | Zyara Insights saved/scheduled reports | ADAPT |
| Audit/history | Audit/test patterns | REFERENCE / ADAPT |
| Backup | Backup UX/operations reference | REFERENCE |
| Google Meet | External meeting integration pattern | REFERENCE ONLY |
| Biometrics/geofencing/face | Attendance technology | REJECT DEFAULT |

## Required Astro outputs for Qdrat

Astro must not finish source reconciliation until it produces:

1. an exact Qdrat component/file inventory for every proposed reuse candidate;
2. file-level origin/license/provenance classification;
3. `REFERENCE / DEPENDENCY / ADAPT / COPY / REJECT` decision per candidate;
4. target Zyara bounded context and data-ownership rule;
5. migration strategy that preserves Zyara's FHIR/provider/identity model;
6. security and PHI review for communications and staff data;
7. a decision on whether Qdrat code is copied, ported, wrapped or only used as a design reference;
8. tests required before any adapted code is admitted;
9. an update strategy for upstream/founder changes;
10. explicit rejection/defer decisions for payroll, ATS, biometrics and other non-core ERP scope.

## Bottom line

Qdrat is a **major source for the non-clinical operating layer of Zyara Clinic**, especially workforce structure, shifts/leave, staff lifecycle, approvals, WhatsApp, reporting, helpdesk/tasks and audit patterns. It should not become the healthcare domain model, and it should not pull Zyara into a generic HR ERP before the clinic operating-system core is proven.
