# Zyara AI Operating Fabric — Readiness / Gap Closure Checklist

Date: 2026-09-22  
Planning base: `7caa5da39bbf6d1157f42d183280b0e4682bdcf5`

Purpose: prevent the AI Operating Fabric from being called implementation-ready while a major architectural concern is absent.

A checked planning item means the contract is defined in the planning packet. It does **not** mean implementation or production validation is complete.

| # | Dimension | Planning status | Owning section / slice |
|---|---|---|---|
| 1 | Healthcare authority separation | COVERED | canonical plan §§2, 4; N5 authority plane |
| 2 | Human vs agent identity | COVERED | N5/C1 + AIF-01 resolver |
| 3 | Tenant isolation | COVERED | AIF-01, AIF-02, all DB gates |
| 4 | Branch isolation | COVERED | AIF-01, AIF-02 |
| 5 | Capability registry/versioning | COVERED | AIF-01A |
| 6 | Authority/risk classes | COVERED | AIF-01A |
| 7 | Consent/purpose binding | COVERED | AIF-02A + existing consent-boundaries |
| 8 | Data classification | COVERED | AIF-02A |
| 9 | Secret/credential isolation | COVERED | AIF-02B |
| 10 | Network egress policy | COVERED | AIF-02A/AIF-04/AIF-05 |
| 11 | No-silent-cloud-fallback | COVERED | AIF-02A |
| 12 | Model uncertainty/abstention | COVERED | AIF-03 |
| 13 | Arabic/Saudi Arabic/code-switch evaluation | COVERED | AIF-03 |
| 14 | Model output cannot grant authority | COVERED | permanent invariant + AIF-03 |
| 15 | Agent workspace/process isolation | COVERED | AIF-04 |
| 16 | Time/cost/token/parallelism budgets | COVERED | AIF-04 |
| 17 | Delegation scope/depth | COVERED | source matrix + AIF-04 |
| 18 | Cancellation/orphan cleanup | COVERED | AIF-04 |
| 19 | Browser prompt-injection boundary | COVERED | AIF-05 |
| 20 | Browser redirect/host allowlist | COVERED | AIF-05 |
| 21 | Browser outcome verification | COVERED | AIF-05 |
| 22 | Local filesystem/device allowlists | COVERED | AIF-06 |
| 23 | Local path/symlink/reparse defense | COVERED | AIF-06 |
| 24 | Human approval | COVERED | N5/C3 + AIF-01 |
| 25 | Human exception queue | COVERED | N5/C3 |
| 26 | Append-only/reconstructable audit | COVERED | N5/C4 |
| 27 | Idempotency/replay | COVERED | AIF-01 + execution semantics |
| 28 | Timeout/retry/backoff | COVERED | AIF-01 + reliability section |
| 29 | UNKNOWN external outcome | COVERED | existing adapter-ops + AIF-05 |
| 30 | Receipt/evidence semantics | COVERED | AIF-01 + C4 |
| 31 | Workflow versioning | COVERED | workflow compilation |
| 32 | Rollback/correction | COVERED | reliability section |
| 33 | Provider/tool health | COVERED | AIF-07/AIF-08 |
| 34 | Operator pause/resume/disable | COVERED | AIF-07 |
| 35 | Cost visibility | COVERED | AIF-04/AIF-08 |
| 36 | Quality/automation metrics | COVERED | AIF-08 |
| 37 | Analytics privacy views | COVERED | AIF-08 |
| 38 | External BI isolation | COVERED | AIF-08 |
| 39 | PHI-light logs/traces | COVERED | AIF-02/AIF-09 |
| 40 | Supply-chain/donor provenance | COVERED | source adoption matrix |
| 41 | Public-license special terms | COVERED | source matrix; Treg explicit |
| 42 | Source exact pin before copy | COVERED | source matrix admission rule |
| 43 | Dependency/SBOM review | COVERED | source admission rule |
| 44 | Upgrade strategy | COVERED | source admission rule |
| 45 | Local/small-clinic deployment | COVERED | deployment profiles |
| 46 | Enterprise/cluster path | COVERED | deployment profiles/AIF-04 |
| 47 | N6 independence | COVERED | roadmap insertion |
| 48 | N8 browser dependency | COVERED | roadmap insertion |
| 49 | N9 automation dependency | COVERED | roadmap insertion |
| 50 | Synthetic-vs-real completion semantics | COVERED | handoff completion matrix |
| 51 | Jev review truth | COVERED | implementation handoff §17 |
| 52 | Alibaba OCR truth | COVERED | implementation handoff §17 |
| 53 | HTTP authority tests | COVERED | CI conventions |
| 54 | Non-superuser DB/RLS smoke | COVERED | CI conventions |
| 55 | Adversarial threat campaigns | COVERED | canonical security model + AIF-09 |
| 56 | Recovery/provider outage campaigns | COVERED | AIF-09 |
| 57 | Accessibility/RTL | COVERED | AIF-07 |
| 58 | Action Center evidence drill-down | COVERED | AIF-07 |
| 59 | Raw shell/filesystem prohibited for care agents | COVERED | AIF-04/AIF-06 |
| 60 | Canonical owner remains Zyara domains | COVERED | permanent authority rules |

## Explicit unresolved items that are intentionally not design gaps

These remain evidence/admission gates rather than missing architecture:

1. exact canonical source repository/revision for Laya before code copy;
2. exact source repository/revision/license for Desktop Commander before code copy;
3. provider-specific browser portal rights and terms;
4. real clinic local-device validation;
5. production secret manager selection;
6. production workload identity choice;
7. real model/provider benchmark results;
8. real Arabic/Saudi Arabic decision-plane benchmark results;
9. real payer/NPHIES credentials and contracts;
10. production security/privacy review;
11. external clinical/legal/regulatory authority.

The plan must not fabricate closure of these items.

## Plan readiness decision

All architecture categories required to begin the first bounded implementation leaf are covered.

The first executable leaf remains:

`AIF-01A — Capability contract`

It requires none of the unresolved external items above.

`ZYARA_AI_OPERATING_FABRIC_GAP_REVIEW = PASS_FOR_BOUNDED_IMPLEMENTATION`
