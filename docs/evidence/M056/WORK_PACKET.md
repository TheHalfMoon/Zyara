# M056 work packet — enterprise access governance and support contracts

- Task: M056 (P11/S11A). Objective: bounded branch administration and
  operating accountability for hospital groups.
- Base SHA: bddf11e. Dependencies: M040, M002 (M030 removed as impl gate
  per dependency correction; commercial validation retained external).
- Allowed paths: packages/enterprise-access, tests/m056,
  db/migrations/037_*, docs/evidence/M056.
- Exclusions: no sales self-approval, no clinical-data authority for app
  admins, no real contracts.
- Requirements: branch admin roles bounded per branch; privileged actions
  need assurance + second approver; claimant/sales self-approval refused;
  support contracts recorded with SLO + escalation; app admin never
  implies clinical-data authority.
- Test plan: branch isolation, self-approval refusal, two-person rule,
  admin/clinical separation, contract completeness.
- Rollback: remove package/tests/migration.
