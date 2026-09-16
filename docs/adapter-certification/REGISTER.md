# Adapter certification register (M036)

Synthetic-only. No production vendor capability claimed.

| Adapter | Certified capabilities | Notes |
|---------|------------------------|-------|
| fake-ehr (synthetic fixture) | read, availability | Booking-write refused: no create + conflict-enforcement |
| fake-calendar (synthetic fixture) | availability, events | Calendar access is not clinical eligibility authority |

Rules:

- No binary `integrated=true` exists. Every call site requires the exact
  capability via `requireCapability`.
- Booking-write requires certified `create` AND `conflict-enforcement`.
- FHIR read access never implies booking-write authority.
- Certification evidence: `pnpm --filter @zyara/m036-tests test`.
