# N5/C4 Jev Review — Audit-Chain Qualification

## Availability (re-established live for this slice)

Jev was re-evaluated rather than assumed from the C1/C2/C3 packets: the skill ships the CLI at
`C:\Users\Shehr\.agents\skills\jev\scripts\jev` (version `0.3.2`), it runs under the bundled
Python 3.12 runtime, `TYPESAFE_API_KEY` is present in the environment (never printed), and the
provider reported model `jev-1.13.0` on every call. `PYTHONIOENCODING=utf-8` is required in
this environment or the CLI fails on its own console encoding before making a request.

## Round 1 — design challenge

Spec: `jev/c4-design-and-diff.spec.json`. State: `docs/evidence/N5/C4/WORK_PACKET.md`.

| Question | Verdict |
| --- | --- |
| reconstructs_the_chain | yes 0.73 |
| scope_and_correlation_integrity | yes 0.96 |
| no_prose_or_secrets | yes 0.95 |
| no_overclaim | yes 0.94 |
| read_only_surface | yes 0.96 |
| residual_risk | **2.81 (high, confidence 0.75)** |
| weakest_area | `completeness` 0.31 (confidence 0.18) |

## Round 2 — exact-diff review of the implementation

| Window (exact head) | reconstructs | scope | privacy | no_overclaim | read-only | residual | weakest pick |
| --- | --- | --- | --- | --- | --- | --- | --- |
| domain module (`packages/collaboration/src/audit-chain.ts`) | 0.68 | 0.97 | 0.85 | 0.97 | 0.90 | 2.81 high | completeness 0.53 |
| API readers + route + migration 045 | 0.68 | 0.83 | 0.70 | 0.92 | 0.95 | 2.41 high | privacy 0.35, completeness 0.29 |
| domain module after the fix below | 0.68 | 0.97 | 0.86 | 0.97 | 0.91 | 2.80 high | completeness 0.49 |

### Finding verified and fixed

`weakest_area = completeness` was triaged to its concrete mechanism: **profile selection was
caller-controlled**, so a caller could have asked for a weaker profile than the evidence
implies and been told that a weak chain was reconstructable. That was a real defect, not a
phrasing problem. It was verified against the code and fixed forward-only: the assembly now
derives what the present evidence implies (`AUDIT_CHAIN_EVIDENCE_REQUIREMENTS`), refuses a
profile that does not require those steps (`AUDIT_CHAIN_PROFILE_UNDER_SPECIFIED`), and reports
the profile the evidence actually implies (`recommendedProfile`). The new test asserts both
refusals and the recommendation.

### Residual that stays open and is disclosed

The residual risk score stayed **high (2.8–2.41, confidence 0.75/0.44)** with `completeness`
(0.49) and `privacy` (0.35) as the strongest picks even after the fix. The concrete reasons
are recorded rather than argued away:

- a reconstruction is only as complete as the readers wired into it and the stores behind
  them, and this build's stores are in-process, so a chain can legitimately report `absent`
  steps for a slice whose records did not survive — which is fail-closed (the report says
  `reconstructable: false`), but it is a real limitation of the evidence, not of the report;
- the gap register carries that limitation as `NO_DURABLE_OUTBOX_IN_THIS_BUILD` and keeps the
  tamper-evidence gap open explicitly;
- `privacy` remains a residual for the same reason recorded in C3: the chain reports
  operational metadata (a protected action type, a risk class, an authority) to a
  tenant-wide administrator, which is a deliberate audit capability, and no
  compliance-sensitivity class exists yet to narrow it further.

## What Jev did not and cannot cover

- it does not execute anything: every functional claim in this packet comes from the local
  test suite, the real-PostgreSQL smoke and the authenticated HTTP smoke;
- it cannot verify the database view's `security_invoker` behaviour, its grants or its
  read-only posture; the smoke proves those against PostgreSQL 16;
- it cannot confirm that the source domains it was shown are the complete set of Zyara
  domains; that mapping is the work packet's claim and is reviewed by reading the code;
- it authorises no production, clinical, regulatory or commercial claim, and none is made.
