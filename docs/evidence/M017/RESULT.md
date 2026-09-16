# M017 Result

Status: COMPLETE (merged).

- Base SHA: 576fd8bbf70cd87a0a35861dbd2491043ba12fd5
- Implementation head: 51b8f480626d32e3ce290bb7469314be3b1cc7fb
- Merge commit on main: a3a5ae8dc6ca7cc3edb5a0c642948480e71d9f28 (PR #35)
- CI: m017-ci green on exact head (patient typecheck plus lint plus 16/16
  tests plus web typecheck); foundation m001-ci green on exact head and
  post-merge.
- Branch: muse/M017-booking-ux
- Acceptance 1 (every mode uses honest outcome language): PASS — instant
  claims booked only with committed M016 truth, otherwise not booked yet;
  request/call/redirect never claim booking or reservation
- Acceptance 2 (request shows deadline/owner without false reservation):
  PASS — status plus owner plus deadline/next step rendered with
  isBooked=false and isReservation=false; redirect return without proof
  stays unconfirmed
- Acceptance 3 (delegate revocation blocks next action): PASS — scoped grant
  allows the delegate action; revokeGrant blocks the next authorizeAction;
  unknown actors denied; guardian route disabled without approval
- Tests: 16/16 green (instant, request, call/redirect, contact, confirmation,
  delegation, resume, locales/observability); typecheck and eslint clean
- Identity: anonymous browsing needs no contact; verification at action time;
  shared phone binds per (phone, patient); no national ID anywhere
- Confirmation: digest-bound challenge over patient/actor/provider/time/mode/
  policy/version; material change invalidates; unconsented challenge invalid
- Language decision (A27): TypeScript by default. No Rust/Go extraction.
- Privacy: funnel tracks stage counts and pending requests only; no raw
  intake, medical text, identifiers, or tokens; synthetic data only, no PHI
- Localization: five-locale honest mode copy (ar, en, fr, de, es); ar RTL
  flagged; translations synthetic, human review required before real use
- Residuals: safe cancellation/rescheduling is M018 next; provider messaging
  is M020 next; real clinical approval remains an explicit external gate.
