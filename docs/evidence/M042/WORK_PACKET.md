# M042 work packet — text navigation to typed provider/scheduling tools

- Task: M042 (P08/S08A). Objective: connect text navigation to typed
  provider and scheduling tools behind the M041 safety contract.
- Base SHA: d438ac7. Dependencies: M041, M036, M016, M013 (all evidenced).
- Allowed paths: packages/navigation-tools, tests/m042,
  docs/evidence/M042.
- Exclusions: no confirmation bypass (M043), no voice (M044/M045).
- Requirements: every tool call carries an M041 intent decision; tools
  are typed (search-providers, check-availability, draft-booking — draft
  only, never commit); draft booking needs eligibility + candidate proof;
  adapter tools require certified capabilities; unknown/fuzzy entities
  return clarification, never fabricated ids.
- Test plan: intent gating, draft-only guard, clarification on unknown,
  capability refusal.
- Rollback: remove package/tests.
