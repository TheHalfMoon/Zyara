# M058 work packet — evidence-backed international country pack (repo part)

- Task: M058 (P11/S11A). Objective: one country pack with locales,
  quiet hours, holiday closures, escalation paths and evidence mapping.
- Base SHA: 3c79315. Dependencies: M055, M056, M045 (all evidenced).
- Allowed paths: packages/country-pack, tests/m058, docs/evidence/M058,
  docs/country-packs (new).
- Exclusions: no launch claim, no regulatory approval claim, no real
  expansion readiness (M060 external gate).
- Requirements: pack declares locales, timezone, quiet hours, holidays,
  support escalation, consent purposes and evidence pointers; validator
  checks completeness; launch-readiness is explicitly NOT claimed.
- Test plan: completeness validation, missing-field refusal, readiness
  honesty (ready=false without external evidence).
- Rollback: remove package/tests/docs.
