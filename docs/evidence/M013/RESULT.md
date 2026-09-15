# M013 Result

Status: IMPLEMENTED — pending CI + merge verification.

- Base SHA: 6dc8b982441b196fcdbb6fb9cecc5a865605c577
- Branch: muse/M013-eligibility-recipes
- Acceptance 1 (missing referral next step): PASS — REFERRAL_MISSING returns
  NEEDS_INPUT with missingInput=referral and nextStep=PROVIDE_INFORMATION
- Acceptance 2 (multi-resource qualifications): PASS — dental recipe matches
  dentist+chair+assistant with qualification superset proof per slot
- Acceptance 3 (immutable versions): PASS — rule/recipe publish appends frozen
  v1, v2; history never mutated; old versions keep old semantics
- Tests: 19/19 green (12 rule families, age/returning/insurer/order/interval,
  precedence, missing-data, substitution, qualifications, immutability,
  adversarial, five-locale, engine-safety, migration)
- Rule families: all 12 canonical families from the scheduling plan
- Outcomes: ALLOW/DENY/NEEDS_INPUT/NEEDS_STAFF_REVIEW/SOURCE_UNAVAILABLE with
  DENY > REVIEW > UNKNOWN > INPUT > ALLOW precedence; missing data never
  ALLOW and never silent DENY; outage never approval
- Approval: provider clinical rules without accountable approval route to
  NEEDS_STAFF_REVIEW with APPROVAL_MISSING; approval never fabricated
- Privacy: 16 material input fields allowlisted; excess fields rejected;
  telemetry carries codes/versions/counts only, never answers; no logging of
  clinical answers; no patient text in events
- Localization: five-locale explanations (ar/en/fr/de/es); Arabic wording is
  synthetic and requires accountable human review before real-patient use
- Migration: db/migrations/013_eligibility_recipes.sql — append-only
  (SELECT+INSERT only), PK (id, version), FORCE RLS + tenant isolation
- Residuals: availability computation (M014), holds/booking (M015+),
  real clinical approval remains an explicit external gate
