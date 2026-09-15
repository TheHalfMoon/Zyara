# Data-Flow Inventory (M003)

Every dataset needs purpose/owner/region/retention or an explicit blocker.

| Dataset | Purpose | Owner | Region | Retention | Status |
|---|---|---|---|---|---|
| Account identity (login) | Authentication, tenant membership | Data controller rep (PENDING) | To be decided; Saudi hosting preferred | Account lifetime + 30d | BLOCKED: no hosting decision |
| Patient profile (minimal) | Booking, attendance, review eligibility | Data controller rep (PENDING) | Same as above | Visit + 6y (PROPOSED, counsel to confirm) | BLOCKED: counsel review |
| Appointment/ledger | Scheduling truth, reconciliation | Data controller rep (PENDING) | Same as above | Visit + 6y (PROPOSED) | BLOCKED: counsel review |
| Provider graph (public) | Discovery, ranking | Provider ops (PENDING) | Same as above | Until withdrawn + history preserved | BLOCKED: agreement |
| Audit/observability | Security, dispute evidence | Security reviewer (PENDING) | Same as above | 1y rolling (PROPOSED) | BLOCKED: counsel review |
| Contact/notification prefs | Reminders, consent enforcement | Data controller rep (PENDING) | Same as above | Until consent withdrawn + 90d | BLOCKED: counsel review |
| Search/query telemetry (redacted) | Relevance, zero-result analysis | Provider ops (PENDING) | Same as above | 90d aggregated (PROPOSED) | BLOCKED: counsel review |

Rules: synthetic data only in all environments; no real PHI; minimization
reviewed per dataset at M029. See DPIA_DRAFT.md and RETENTION_SCHEDULE.md.
