# AIF-01B Jev Review — Capability Resolver

Jev skill CLI `0.3.2`, TypeSafe provider, model `jev-1.13.0`, `PYTHONIOENCODING=utf-8`. Spec: `jev/design.spec.json`. It has six blocking `noul` questions (`unknown_can_allow`, `caller_controls_identity`, `approval_bypass`, `human_only_leak`, `durable_state_mutable`, `receipt_leaks`) plus `residual_risk` and `weakest_area`.

## Round 1 — design challenge (before any code)

On `WORK_PACKET.md`: all six blocking questions were "no" (p ≤ 0.04) and residual risk was low (1.33). `weakest_area` was `completeness` (0.58). Targeted `jev yes` probes then found five missing rules:

| Probe | Before | After packet fix |
| --- | --- | --- |
| ALLOW validity vs later revocation (time of check vs time of use) | no 0.09 | yes 0.97 |
| one approval cannot allow many invocations | no 0.26 | yes 0.94 |
| confirmation bound to capability, tenant and digest | no 0.22 | yes 0.97 |
| several matching grants defined (revoked + active) | no 0.09 | yes 0.92 |
| receipts written for DENY, ASK and UNDECIDABLE too | no 0.44 | yes 0.99 |

Each became a packet rule and a test before implementation: point-in-time ALLOW, approval claims, a bound confirmation query, narrowest-grant selection, and a receipt for every decision.

## Round 2 — exact files after implementation (`5fb5256`)

| File | Blocking "yes" | Residual |
| --- | --- | --- |
| `resolver.ts` | none | moderate 1.69 |
| `registry-state.ts` | **approval_bypass 0.61, receipt_leaks 0.51** | moderate 1.95 |
| `046_capability_registry.sql` | **approval_bypass 0.56** | moderate 1.64 |
| smoke, tests | none | low |

Triage by mechanism found real defects. All were fixed in `4c037ff`:

- an ALLOW was appended before its claim, so a lost race persisted an ALLOW;
- an approval-gated read without a key never claimed its approval, so the approval was reusable;
- the database had no link from an ALLOW receipt to its claim.

## Round 3 — probes after fixes

| Probe | Result |
| --- | --- |
| `claimApproval` callable without a resolver decision | yes 0.87 → made private → no 0.35 |
| `record()` stores unvalidated receipts | yes 0.89 → shape + digest check → no 0.02 |
| DB allows claiming an unapproved or expired approval | yes 0.79 → guard trigger → no 0.03 |
| DB lets an ALLOW reference an approval without a claim | no 0.05 |
| `record()` persists an ALLOW claimed by another invocation | no 0.04 |
| grant `granted_by` not tied to a real principal | yes 0.62 → FK to `accounts`, column-level insert. Role-level authenticity stays an application residual |

## Final — candidate content `0698758`

| File | widen/unknown/identity/approval/A5/durable/leak | residual |
| --- | --- | --- |
| `resolver.ts` | all **no** (max 0.27) | moderate 1.61 (c 0.48) |
| `registry-state.ts` | all **no** (max 0.46) | moderate 1.86 (c 0.65) |
| `046_capability_registry.sql` | all **no** (max 0.37) | low 1.52 |
| `aif01b-capability-rls-smoke.mjs` | all **no** (max 0.19) | low 1.53 |
| `tests/aif01b/resolver.test.ts` | all **no** (max 0.19) | low 1.33 |
| `WORK_PACKET.md` | all **no** (max 0.04) | low 1.41 |

After the pstack delta cycles, `resolver.ts` was re-run at `26a3703`. All six blocking questions were still "no" (max `durable_state_mutable` 0.31), with residual moderate 1.62 (c 0.49).

The residual on `registry-state.ts` stays moderate (approval_bypass 0.46, still "no"). The concrete reason is recorded rather than argued away: receipt digests are content addressing, not authentication. A keyed MAC needs a server secret, which arrives with AIF-02. Until then, the database guard (approved + live + same tenant) and the receipt-to-claim FK are the binding controls.

## Not covered by Jev

Jev executes nothing. Functional claims come from 44 unit tests and the real-PostgreSQL smoke.
