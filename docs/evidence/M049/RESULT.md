# M049 result — approved telehealth and request-first home visits

- Base SHA: c4c215d. Dependencies: M040, M047, M013, M020 (all evidenced).
- Implementation: packages/care-modalities (modalities.ts); migration
  db/migrations/031_appointment_modalities.sql; tests/m049/modalities.test.ts.
- Semantics: explicit modality per appointment; eligibility guard;
  telehealth link + consent required (DB CHECK mirrors); home visits
  request-first with staff approve/decline; modality change re-verifies
  from scratch.
- Synthetic evidence only. No video vendor, no dispatch, no PHI.
- Commands:
  - pnpm --filter @zyara/m049-tests test → 4 pass, 0 fail
  - pnpm --filter @zyara/care-modalities typecheck → clean
  - pnpm --filter @zyara/care-modalities lint → clean
  - pnpm --filter @zyara/m049-tests lint → clean
- Residual risks: video vendor selection is external; home-visit staffing
  policy needs recruited clinics (M028).
