# M015 Dependencies

- M013 COMPLETE: PR #27/#28. Reuses typed qualifications and immutable
  schedule/recipe versions carried on holds.
- M014 COMPLETE: PR #29/#30. Holds bind scheduleVersion/recipeVersion and
  consume the recheck verdict shape; BusyInterval rows feed holds.
- M004 COMPLETE: PR #9. Hold transitions append outbox events (HoldCreated /
  HoldExpired) in the commit transaction; string-ID payloads only.
- No other dependencies. M016 (booking commit) consumes redeemHold; it is
  downstream, not a prerequisite.
