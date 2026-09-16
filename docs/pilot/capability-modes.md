# Clinic capability modes (M028)

English only. Honest modes: a clinic never displays capability it cannot
fulfill.

## Full mode — native booking

Requirements: verified services, configured resources, trained reception,
working escalation contact. Patient sees real availability and can book,
request, cancel, and reschedule per policy.

## Request mode — staff-triaged

For clinics without real-time supply truth. No bookable hours are shown.
Patients submit requests with an explicit deadline and owner. Equivalent to
M017 request mode with honest outcome language.

## Redirect mode — external booking

For clinics that keep their own booking system. Zyara shows verified
profile facts and hands off with a labeled redirect. No Zyara appointment
state is created; return visits carry no proof unless the integration
contract (a later task) provides it.

## Unpublished mode

Default for unready clinics. Profile hidden from search until the
readiness checklist is signed. Existing patient assistance continues by
phone per the escalation owner.
