# M038 result — first negotiated FHIR scheduling adapter (synthetic)

- Base SHA: a578d60. Dependencies: M036, M037, M035 (all evidenced).
- Implementation: packages/fhir-adapter (mapping.ts);
  tests/m038/mapping.test.ts.
- Semantics: strict id/time/reference checks; entered-in-error rejected;
  unknown extensions tolerated and preserved; deterministic cursor
  pagination; status mapping matrix (incl. checked-in/arrived → booked).
  Booking-write stays behind M037 ops + certified capabilities.
- Synthetic evidence only. No production EHR integration claimed.
- Commands:
  - pnpm --filter @zyara/m038-tests test → 4 pass, 0 fail
  - pnpm --filter @zyara/fhir-adapter typecheck → clean
  - pnpm --filter @zyara/fhir-adapter lint → clean
  - pnpm --filter @zyara/m038-tests lint → clean
- Residual risks: real-counterpart pagination/tombstone behavior needs a
  contracted partner run (external); one defect found and fixed in test
  itself (bad assertion expression), with regression passing.
