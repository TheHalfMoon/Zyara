# W3 Provenance — Clinic Helpdesk / Internal Task Queue

## Donor reference

| Source | Revision | Mode | What is used |
| --- | --- | --- | --- |
| `TheHalfMoon/Qdrat` | `e2d288940aab52af881786678b2fc86dfa5c272a` | ADAPT (concepts only) | helpdesk/task queue shape: ticket kinds, comment and status trail, requester/assignee separation, branch scoping |

No Qdrat, Horilla or other donor source code is copied in this slice. The
implementation is Zyara-native TypeScript and SQL written against the existing
Zyara authorization, workforce and evidence conventions. The deep-dive
disposition already recorded in
`docs/research/ZYARA_QDRAT_DONOR_DEEP_DIVE_2026-09-17.md` is
`ADAPT CONCEPTS / CONVERGE WITH ZYARA TASK DOMAIN`; this slice is the first
convergence step and reuses the existing W1 workforce graph instead of importing a
donor task subsystem.

Qdrat components explicitly **not** used here: payroll, loans/allowances,
recruitment and onboarding pipelines, performance objectives, asset management
and HR reporting. They remain `DEFER`/`REJECT-default` per the master plan.

## Boundary confirmation

- `Account` != `StaffAssignment` != `Practitioner` != `PractitionerRole` !=
  `ClinicalPrivilege`: this slice adds none of the healthcare identity objects and
  cannot grant clinical privilege (assignee eligibility is checked against W1
  `staff_assignments` only).
- Buzz/Nostr is not used and is not the canonical store for any fact.
- No clinical, scheduling, insurance or financial domain is written by this
  slice; `subjectType`/`subjectRef` are opaque pointers.

## Jev usage record

Jev was actually invoked against the live TypeSafe endpoint
(`jev 0.3.2`, model `jev-1.13.0`, provider TypeSafe via `TYPESAFE_API_KEY`) — not
claimed decoratively.

1. **Design challenge (before implementation)** — state: the W3 design brief.
   Questions and answers:

   | Question | Answer | Probability |
   | --- | --- | --- |
   | design can mint or silently mutate clinical/scheduling/insurance/financial state | no | 0.03 |
   | design permits tenant or branch isolation breach | no | 0.07 |
   | design can assign work to an account without a server-authoritative staff assignment | no | 0.03 |
   | lifecycle permits terminal mutation or closure without outcome evidence | no | 0.03 |
   | design duplicates an existing component instead of reusing it | no | 0.15 |
   | design silently introduces out-of-scope capability | no | 0.08 |
   | test plan is inadequate for the slice's realistic failure modes | no | 0.26 |

   The highest residual risk was test adequacy (p = 0.26). Response: the test plan
   was expanded to cover automation-close refusal, ineligible/expired/mismatched
   assignees, cross-branch assignment, terminal immutability, reopen-without-reason,
   duplicate comment ids, cross-tenant reads and writes, idempotency conflict,
   referenced-domain immutability and migration-level RLS/append-only assertions.
   Jev findings were verified against real code rather than accepted blindly; one
   confirmed defect found during this work (resolved work could never be reopened
   because the terminal guard ran before the lifecycle table) was fixed forward.

2. **Diff review (after implementation)** — two passes over the exact staged diff
   (first pass: `authority 0.03 / isolation 0.28 / assignee 0.13 / lifecycle 0.05 /
   security 0.23 / correctness yes 0.64 / scope 0.06 / test adequacy yes 0.91`;
   targeted probes: `guard order yes 0.57`, `unproven claim yes 0.91`).
   The correctness and guard-order flags were verified against the code and found a
   real defect: idempotent replay was evaluated after assignee eligibility, so a
   retry after the assignment expired failed instead of returning the original
   record. That was fixed forward, with a regression test.
3. **Diff review (final)** — after the fixes and the external review:
   `authority 0.02 / isolation 0.14 / assignee 0.10 / lifecycle 0.03 / security 0.15 /
   correctness no 0.41 / scope 0.03 / test adequacy yes 0.52`; targeted probes
   `idempotency fingerprint no 0.27 / guard order no 0.43 / schema mismatch no 0.37 /
   route authority no 0.27 / retention no 0.10 / unproven claim yes 0.85`.
   Full result tables are in `RESULT.md`.

Rejected and negative findings are preserved with rationale:

- `test adequacy` remained above threshold (0.52). Verified rather than accepted:
  each named failure mode has a concrete unit assertion or a live database
  assertion; the residual gap is that this repository has no HTTP route test
  harness, which is recorded in `RESULT.md` instead of being papered over.
- `unproven claim` (0.85) is treated as a standing hazard for evidence files. The
  response is a claims rule in `RESULT.md`: PR numbers and CI identifiers are added
  only after they have been observed, never predicted.

## External reviewer (tool, not donor code)

| Item | Value |
| --- | --- |
| Tool | `alibaba/open-code-review` (Apache-2.0) |
| Revision | `01cf7ff8b94c5087205eaf47a6e67f94dabb2a32`, CLI `v1.12.8 (5c7b383)` |
| Mode | delegation mode: deterministic file selection and rule resolution; review judgement by the host agent |
| Disposition | `REFERENCE` only — used as a review tool, nothing copied into Zyara, no runtime dependency, no license or NOTICE obligation added |

Four findings were fixed (duplicate helpers, duplicated status allowlist, missing
job `permissions`, missing job `timeout-minutes`); four were deferred with rationale
(unpinned third-party action tag, no dependency cache, no concurrency group, and the
tool's own exclusion of the test file and evidence documents). The exact commands,
condensed output and the reason delegation mode was used are in `OCR_REVIEW.md`.

## Limits

Jev is a decision model returning calibrated typed answers without explanation. It
is used here as a challenge and prioritisation signal; every finding was checked
against the actual code, tests and migration text. Jev output is not CI, not a
security review, not regulatory evidence and not production validation.
