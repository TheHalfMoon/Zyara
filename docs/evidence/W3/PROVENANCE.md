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

2. **Diff review (after implementation)** — recorded in `RESULT.md`.

## Limits

Jev is a decision model returning calibrated typed answers without explanation. It
is used here as a challenge and prioritisation signal; every finding was checked
against the actual code, tests and migration text. Jev output is not CI, not a
security review, not regulatory evidence and not production validation.
