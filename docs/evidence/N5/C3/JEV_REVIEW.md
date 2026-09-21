# N5/C3 Jev Review — Approvals + Human Exception Queue

## Availability (established live for this slice)

Jev **was** genuinely executed. The environment was re-evaluated rather than assumed from the
C1/C2 packets:

| Prerequisite | Finding |
| --- | --- |
| Python 3.9+ | bundled runtime `C:\Users\Shehr\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe` (Python 3.12) |
| Jev CLI | not on `PATH`; the skill ships it at `C:\Users\Shehr\.agents\skills\jev\scripts\jev` (version `0.3.2`) and it runs under the bundled interpreter |
| `TYPESAFE_API_KEY` | present in the environment (never printed) |
| Provider | TypeSafe (default); the API reported model `jev-1.13.0` on every call |

Literal command shape used for every run (the state is piped in, never a secret):

```powershell
$env:PYTHONIOENCODING="utf-8"
Get-Content <file> [-Skip N -First M] |
  & $py $jev run docs/evidence/N5/C3/jev/<spec>.json --json --verbose
```

Jev outputs calibrated verdicts only. It produces no prose, its verdicts are **not** treated
as a substitute for exact-head CI, the real-PostgreSQL smoke or source review, and it is a
decision aid with an explicit confidence rather than an authority. A `noul` verdict of
`0.62` is a *yes with modest confidence*, not a strong yes.

## Round 1 — pre-implementation design challenge

Spec: `jev/c3-design-challenge.spec.json`. State: `jev/c3-design-state.md`.

| Question | Verdict | Read |
| --- | --- | --- |
| binding_strength | yes 0.97 | holds |
| stale_authority | yes 0.96 | holds |
| agent_boundary | yes 0.96 | holds |
| unknown_outcome | yes 0.98 | holds |
| exception_queue_integrity | yes 0.96 | holds |
| state_machine_integrity | yes 0.94 | holds |
| tenant_branch_isolation | yes 0.80 | weakest yes |
| activity_authority_confusion | yes 0.98 | holds |
| audit_completeness | **yes 0.61** | weak — triaged |
| residual_implementation_risk | 1.94 (moderate, confidence 0.61) | — |
| weakest_control | `agent` (confidence 0.38) | low confidence |

## Round 2 — targeted triage of the weakest verdicts

Revision 2 (`jev/c3-design-state-r2.md`) answered the two weakest reads with explicit,
checkable detail: a named record-and-field mapping for every step of the audit chain, an
explicit refusal set for the agent/human boundary, an explicit privacy-control list and an
explicit scope-control list. Spec: `jev/c3-design-triage.spec.json`.

| Question | Round 1 | Round 2 |
| --- | --- | --- |
| audit_completeness | yes 0.61 | **yes 0.81** |
| agent_boundary | yes 0.96 | yes 0.98 |
| privacy_controls | not asked | yes 0.86 |
| tenant_branch_isolation | yes 0.80 | yes 0.78 |
| residual_vector | — | `agent_requester_attribution` 0.54 |
| residual_risk | 1.94 moderate | **1.53 low (confidence 0.51)** |

The residual vector is exactly the gap this slice declares: an agent requester is exercised
through the trusted server-side call path because no verified agent credential path exists
yet. That is recorded as a limitation, not closed.

## Round 3 — exact-diff review of the implementation

Specs: `jev/c3-diff-domain.spec.json`, `jev/c3-diff-api.spec.json`,
`jev/c3-diff-migration.spec.json`. Because the exact head is large, each run reviewed a
scoped, line-bounded window of the exact file and every window is recorded here rather than
only the flattering one.

| Window (exact head) | binding | authority | actors | unknown | exceptions | state | residual | weakest pick |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| domain 1–700 (registries, digests, validation) | 0.96 | 0.83 | 0.88 | 0.93 | 0.94 | 0.73 | 1.49 low | privacy 0.50 |
| domain 701–1400 (store, propose/decide/execute) | 0.75 | **no 0.09** | 0.96 | **no 0.33** | no 0.30 | no 0.47 | 1.65 low | authority 0.50 |
| domain 1370–1710 (execute, unknown outcome, authority recheck) | 0.78 | 0.80 | no 0.34 | 0.95 | no 0.34 | no 0.27 | 1.78 moderate | authority 0.29 |
| domain 940–1380 (transition guard, propose, decide) | 0.62 | no 0.15 | 0.95 | no 0.33 | no 0.31 | no 0.36 | 1.52 low | authority 0.43 |
| domain 1227–1607 (decide + execute + authority recheck in one window) | 0.81 | **0.85** | no 0.47 | 0.96 | no 0.30 | no 0.29 | 1.89 moderate | authority 0.45 |
| api 1–480 (directories, helpers, reads) | — | caller-supplied authority 0.94 | — | — | no 0.33 | scope no 0.33 | 2.42 high (conf 0.39) | expiry 0.35 |
| api 296–596 (propose, decide, execute, sweep) | — | caller-supplied authority 0.87 | — | — | ownership no 0.10 | scope 0.76 | 2.07 moderate | scope 0.49 |
| api 558–926 (exception queue routes) | — | caller-supplied authority 0.61 | — | — | ownership 0.78, automation origin 0.88 | scope 0.67 | 2.16 moderate | automation origin 0.44 |
| migration 1–380 (registries, decisions, executions) | — | — | — | evidence 0.63 | — | immutability **no 0.43**, transitions 0.66 | 1.51 low | rls 0.41 |
| migration 380–713 (guards, exceptions, RLS, grants, registry extension) | — | — | — | evidence 0.53 | — | immutability 0.88, transitions 0.51 | 1.66 moderate | extension 0.31 |

### Verification of the material findings (not accepted blindly)

**Finding A — repeated `authority: no` verdicts were window artefacts, not defects.**
Every window that returned `no` for `authority_freshness` contained either the decision-time
authority resolution or the execution-time re-resolution but not both: the recheck lives in
`assertLiveApproverAuthority` and the decision check lives in `decide`. Re-running with both
mechanisms inside one window (`domain 1227–1607`) returned **yes 0.85** with
`unknown_stays_unknown yes 0.96`. The same holds for the `agent`, `exception` and `state`
`no` verdicts: each comes from a window that omits the relevant code (`propose`'s agent
eligibility check, the exception queue block, and the shared transition helper
respectively), and each returns `yes` in the window where that code is present. Conclusion:
**no confirmed defect**; the lesson recorded is that a truncated review state produces false
findings and must be reported as such.

**Finding B — a real scope widening on execution, found from the `scope 0.49` signal.**
Verified against the code: the executions route authorised with the branch-writer role set
even when the request was tenant-wide, so a branch-scoped receptionist could have recorded
an execution receipt for a tenant-wide protected action. Fixed in the same commit series:
a tenant-wide request now requires a tenant-level role set (`DECIDERS`). The HTTP smoke
covers the route-level refusal path it belongs to, and this is recorded as a
review-influenced change rather than as a Jev pass.

**Finding C — a divergent-projection defect found by the HTTP smoke, not by Jev.**
The first implementation included the W3 work item's *mutable* status in the derived
exception activity payload, so re-projecting the same exception event after the work item
moved produced an `ACTIVITY_IDEMPOTENCY_CONFLICT` (recorded by the smoke as a real
projection failure). Fixed by projecting only event-owned, immutable properties. This is
preserved as negative evidence: the projection failure list caught it.

**Finding D — two test gaps raised by the test review, both closed.**
`gap = concurrency 0.56` and `gap = clock_boundaries 0.34` in the first test review led to a
test that interleaves two identical submissions through the await boundary and asserts a
single reconciled request, and a test that asserts the expiry instant itself is already
expired. After adding the expiry-over-HTTP smoke case, the `expiry_http` pick fell from
0.52 to 0.02.

## Residuals that remain open and disclosed

- **agent requester attribution** (0.54): an agent requester is exercised through the
  trusted server-side call path; there is still no verified agent credential path, so no
  agent-originated HTTP write is enabled.
- **approval metadata visibility**: an approval or exception activity row is `operational`
  metadata visible to branch operations readers, including a `critical`-risk protected
  action. `restricted` sensitivity is reserved for clinical content, which C3 does not
  project. A later slice must define a compliance-sensitivity class rather than reusing the
  clinical gate.
- **authority snapshot vs later revocation**: the decision records the authority that was
  live when it was taken; the unused approval is invalidated at execution time. A revoked
  authority therefore leaves a historically readable decision plus a superseded request,
  which is the intended forward-only behaviour but is a residual an auditor must read
  correctly.
- **`needs_human` retry window**: a human resolution may start a fresh attempt after the
  original approval window closed, because the resolution itself is the human decision; the
  attempt ordinal keeps the earlier attempt distinct. Disclosed, not closed.
- **concurrency 0.49 / unknown_retry_evidence 0.29** remain the largest picks in the smoke
  review. The domain test covers an interleaved duplicate submission; the database smoke
  does not exercise concurrent transactions, and a definitive outcome for an unsettled
  attempt with evidence is asserted only in the domain layer.
- **window-truncated review**: no single Jev run saw the whole exact head. The window map
  above is the complete record; a reader must not treat any single row as a whole-slice
  verdict.

## What Jev did not and cannot cover

- it does not execute tests; every functional claim in this packet comes from the local test
  suite, the real-PostgreSQL smoke and the authenticated HTTP smoke;
- it cannot verify the database behaviour, RLS, grants or triggers; those are proven by the
  smoke against PostgreSQL 16;
- it cannot authorise production, clinical, regulatory or commercial claims, and none are
  made.
