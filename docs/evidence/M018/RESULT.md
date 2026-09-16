# M018 Result

Status: COMPLETE (merged).

- Base SHA: 9b2ca23fe0e6e24637f49150e89bbf08b6ad432b
- Implementation head: 9fbd29e1e329bcab1d0cbdad2f829b438a355b34
- Merge commit on main: 5a902c86829932db1153fe70aabdd816fd560d3e (PR #37)
- CI: m018-ci green on exact head (scheduling typecheck plus lint plus 9/9
  tests plus web typecheck); m013/m014/m015/m016 plus foundation green on
  exact head and post-merge.
- Branch: muse/M018-safe-changes
- Acceptance 1 (original survives failed replacement): PASS — replacement
  commits first; commit failure retains booked original with
  REPLACEMENT_FAILED_ORIGINAL_RETAINED; success voids original only after
  commit returns the replacement id
- Acceptance 2 (mail-link preview cannot cancel): PASS — GET preview returns
  a copy with mutated=false and zero change records; only POST acts with a
  patient-bound expiring token; expired and wrong-patient links rejected
- Acceptance 3 (reschedule not double-counted as lost care): PASS —
  replacement counted in outcomes.replaced, never in outcomes.cancelled;
  retained count tracks safe failures; duplicate keys replay stably
- Tests: 9/9 green (retention, commit ordering, scanner GET, expired link,
  wrong-patient link, cutoff, idempotent replay, concurrent change, five
  locales); typecheck and eslint clean
- Language decision (A27): TypeScript by default. No Rust/Go extraction.
- Privacy: tokens bind tenant/appointment/patient/kind/expiry only; optional
  reason kept out of logs; synthetic data only, no PHI
- Localization: five-locale cutoff/retained/cancelled/replaced copy (ar, en,
  fr, de, es); synthetic, human review required before real use
- Residuals: provider calendar depth is M019 next; messaging is M020 next;
  real clinical approval remains an explicit external gate.
