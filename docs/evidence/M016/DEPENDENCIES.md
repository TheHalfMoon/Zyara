# M016 Dependencies

- M015 COMPLETE: PR #31/#32. Reuses the reservation_items exclusion ledger as
  the cross-ledger capacity authority; hold redeem ordering and inline expiry
  shape the commit gate. 015 tables are untouched.
- M002 COMPLETE: tenant/branch authorization primitives. Tenant and actor come
  from verified session claims only; body-supplied tenant is ignored in the
  bookings route; privileged actions keep assurance policy.
- M004 COMPLETE: PR #9. Booking commit appends AppointmentBooked outbox events
  in the commit transaction; string-ID payloads only.
- M013 COMPLETE: typed eligibility verdicts; only ALLOW books, anything else
  rejects with a stable code.
- M014 COMPLETE: candidate tokens bind versions plus instant; commit rechecks
  them, never trusts them.
- No other dependencies. M017 (booking UX) and M018 (safe changes) consume
  resumeBooking and the operation ledger; they are downstream, not prerequisites.
