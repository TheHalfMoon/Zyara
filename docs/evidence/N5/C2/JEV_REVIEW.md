# N5/C2 Jev Review — Derived Human + Agent Activity

## Availability (established live for this slice)

Jev **was** genuinely executed. The environment state was re-evaluated rather than
assumed from the N5/C1 packet:

| Prerequisite | Finding |
| --- | --- |
| Python 3.9+ | available as a bundled runtime: `C:\Users\Shehr\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe` (Python 3.12.14) |
| Jev CLI | not on `PATH`; the skill ships it at `C:\Users\Shehr\.agents\skills\jev\scripts\jev` and it runs under the bundled interpreter |
| `TYPESAFE_API_KEY` | present in the environment |
| Provider | TypeSafe (default), reported model `jev-1.13.0` |

The literal commands used are recorded below so the runs can be reproduced. Jev
outputs calibrated verdicts only; it produces no prose and its verdicts are **not**
treated as a substitute for exact-head CI, the real-PostgreSQL smoke or source review.
Jev is a decision aid with an explicit confidence, not an authority.

Note on calibration: a `noul` verdict of `0.62` is a *yes* with modest confidence,
not a strong yes. Verdicts below are reported as raw probability plus the yes/no
decision, and low-confidence yeses are called out rather than rounded up.

## Round 1 — pre-implementation design challenge

Spec: `jev/c2-design-challenge.spec.json`. State: `jev/c2-design-state.md`.

| Question | Verdict | Read |
| --- | --- | --- |
| no_authority_confusion | yes 0.96 | design holds |
| privacy_controls | **no 0.35** | **finding** |
| tenant_isolation | yes 0.85 | design holds |
| agent_attribution | yes 0.79 | design holds |
| replay_safety | yes 0.91 | design holds |
| residual_implementation_risk | 1.63 (low/moderate) | — |

Finding: the payload controls as first written were judged insufficient to stop PHI
from entering a stored record.

## Round 2 — targeted triage of that finding

Spec: `jev/c2-privacy-vector.spec.json`. State: `jev/c2-design-state-r2.md`
(revision 2 added the "no prose anywhere" invariant).

| Question | Verdict |
| --- | --- |
| privacy_controls (re-run) | no 0.48 — still a finding |
| residual_vector | `caller_supplied_reference` 0.66 |
| no_direct_identifier | **no 0.15** — a whitespace-free direct identifier would pass |
| metadata_only_disclosure | yes 0.96 |

Triage conclusion: the leak vector was not the payload map but the reference
columns. A caller-supplied opaque-looking string could still be a name, a phone
number or a record number.

## Round 3 — revision 3 and re-challenge

State: `jev/c2-design-state-r3.md`. Design change driven by Jev: the projector now
**mints** every stored reference as a deterministic, tenant-scoped pseudonym, so a
caller-supplied identifier is never written verbatim; and every remaining
source-owned string must satisfy a reference shape that excludes whitespace, `@`,
`+` and long digit runs, in addition to the credential patterns.

| Question | Round 1 | Round 3 |
| --- | --- | --- |
| no_authority_confusion | yes 0.96 | yes 0.96 |
| privacy_controls | **no 0.35** | **yes 0.64** |
| tenant_isolation | yes 0.85 | yes 0.86 |
| agent_attribution | yes 0.79 | yes 0.77 |
| replay_safety | yes 0.91 | yes 0.93 |
| residual_implementation_risk | 1.63 | 1.25 (low, p=0.70) |
| residual_vector | — | `metadata_inference` 0.99 (accepted, disclosed) |
| no_direct_identifier | no 0.15 | **yes 0.92** |
| metadata_only_disclosure | yes 0.96 | yes 0.96 |

Every design property now passes. The remaining residual is metadata inference:
an operations reader can still learn that a non-clinical event happened in a branch
at a time, and a stable pseudonym correlates events inside a tenant. This residual
is **disclosed, not claimed closed**. Compensating facts: the closed source registry
admits no clinical domain in this slice, so no clinical finding is expressible;
restricted reads are clinically gated; and no clinical data is joined at read time.

## Round 4 — exact-diff review of the implementation

Four scoped runs over the committed artifacts. A first pass that asked database
questions about the API file (and API questions about the migration) is **discarded
as an invalid measurement** and is not used as evidence; scoping was corrected
instead of reporting the resulting numbers as findings.

| Artifact | Spec | Passing verdicts | Residual score |
| --- | --- | --- | --- |
| `packages/collaboration/src/activity.ts` | `c2-domain-diff.spec.json` | no_authority_confusion 0.96, no_hidden_write_path 0.91, cross_tenant_isolation 0.87, replay_determinism 0.95, stale_authority 0.94, payload_no_phi_or_secret 0.84 | 1.68 (low/moderate, conf 0.50) |
| `db/migrations/043_activity_events.sql` | `c2-migration-diff.spec.json` | db_registry_closed 0.89, db_reference_shape 0.65, db_append_only 0.98, db_tenant_rls 0.96, db_dedupe_uniqueness 0.90, db_referential_integrity 0.95 | 1.48 (low) |
| `apps/api/src/activity.ts` | `c2-api-diff.spec.json` | api_no_public_write 0.96, api_clinical_separation 0.97, api_branch_and_tenant 0.92, api_projection_cannot_break_source 0.98, api_no_prose_projection 0.93, api_failure_visibility 0.87 | 1.20 (low, conf 0.78) |
| `tests/n5c2/activity.test.ts` | `c2-tests-diff.spec.json` | tests_prove_claims yes 0.71, no_overclaim yes 0.84 | — |

`db_reference_shape` at 0.65 is the weakest passing verdict in the slice. It is the
control that carries the round-2 finding, and it is backed by both the domain-layer
token rules and database CHECK constraints plus real-PostgreSQL negative cases, so it
is treated as a modest-confidence pass with a documented residual rather than as a
failure.

## Round 5 — test-gap triage and fix

The first test-suite run asked which material assertion was missing:
`employee_uniqueness` (interleaved delivery) 0.40, `restricted_surface` 0.22,
`identifier_leak_via_payload` 0.15, `provenance_immutability` 0.13.

Three fixes were applied in response:

1. an interleaved-delivery case that races two projections of the same canonical
   event and asserts exactly one record is created;
2. explicit assertions that a superseding correction cannot change the provenance,
   source identity or outcome of the record it corrects;
3. explicit assertions that a restricted record is still unreachable through the
   operations read path, including by direct id, and that every stored payload key
   and value is drawn from the exported closed constants.

Re-run verdicts after the fixes:

| Measurement | Before | After |
| --- | --- | --- |
| `employee_uniqueness` | 0.40 | 0.15 |
| `provenance_immutability` | 0.13 | 0.03 |
| `identifier_leak_via_payload` | 0.15 → 0.32 | 0.12 |
| `restricted_surface` | 0.22 | 0.23 |
| `other` | 0.10 | 0.47 (confidence 0.34) |

No named gap remains dominant, and the final pick is the diffuse `other` bucket at
low confidence. That is reported as the honest end state rather than as proof that
no gap exists.

## What Jev is not used for here

- It does not replace exact-head CI, the real-PostgreSQL smoke or the HTTP smoke.
- It does not certify production readiness, clinical authority, agent credential
  verification or external validation; none of those are claimed.
- Its verdicts are probabilistic. Where a verdict is a low-confidence yes, that is
  stated above rather than presented as a guarantee.
