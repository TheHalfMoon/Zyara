# M013 Work Packet (immutable)

- Task: M013 — Implement typed eligibility and resource recipes
- Task contract: docs/research/muse-task-contracts.json (M013, deps [M004, M009])
- Source refs: A07, A09, FHIR, C16. Requirements: R05, R10, R14.
- Base SHA: 6dc8b982441b196fcdbb6fb9cecc5a865605c577 (origin/main, verified live 2026-09-15)
- Dependency evidence: M004 COMPLETE (PR #9); M009 COMPLETE (PR #19)
- Allowed surface: packages/scheduling, tests/m013, db/migrations/013_eligibility_recipes.sql,
  docs/evidence/M013, .github/workflows/m013-ci.yml
- Excluded: availability computation (M014), holds/booking (M015+), verification decisions (M008),
  real clinical approval, real PHI, production deployment
- Scope rationale: canonical plan proposes `packages/scheduling/rules`,
  `packages/scheduling/resources`, `db/migrations`. This repo has one package per
  domain (`packages/<name>` with `src/index.ts`). A single `@zyara/scheduling`
  package with `src/rules.ts` + `src/resources.ts` implements exactly the proposed
  modules without adding package sprawl. No behavior is moved elsewhere.
- Acceptance: (1) missing referral returns explicit next step;
  (2) multi-resource recipe preserves qualifications;
  (3) rule/type changes produce a new immutable version
- Tests: age-at-visit, returning/new-patient, insurer, referral/order, interval,
  precedence, missing-data, substitution, qualifications, immutability, adversarial
- Security/privacy: typed minimal inputs only; no arbitrary provider code; no LLM
  eligibility; no raw clinical answers in logs/events; provider clinical rules need
  accountable approval or they route to staff review
- Localization: five-locale explanation catalog (ar/en/fr/de/es); Arabic clinical
  wording is synthetic and requires accountable human review before real-patient use
- Observability: outcome code + rule/type versions + missing/source codes + latency
  counters only; never the answer values themselves
- Failure modes: hidden failure, unknown treated as false, unqualified substitution,
  duration mismatch, mutated history, invented approval
- Recovery: disable problematic rule/service version and route to staff review;
  prior immutable versions remain readable
- Risk: medium
