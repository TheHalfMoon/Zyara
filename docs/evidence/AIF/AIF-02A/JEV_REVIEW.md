# AIF-02A Jev Review

Jev skill CLI `0.3.2`, TypeSafe provider, model `jev-1.13.0`. Spec: `jev/design.spec.json`. It has five blocking `noul` questions (`phi_to_unqualified`, `silent_cloud_fallback`, `credential_egress`, `value_leak_in_receipt`, `consent_bypass`) plus `residual_risk` and `weakest_area`.

## Round 1 — design challenge (before code)

All five blocking questions were "no" (≤ 0.08). Residual was moderate (1.67) and the weakest area was `classification` (0.41). Probes:

| Probe | Before | After packet fix |
| --- | --- | --- |
| who classifies fields; what stops a PHI→PUBLIC mislabel | no 0.20 | yes 0.93 (server-held `PayloadSchema`) |
| nested values cannot hide sensitive data | no 0.14 | yes 0.88 (scalars only) |
| size and number of fields bounded | no 0.04 | yes 0.97 (256 fields, 8 192 characters) |
| unlisted fields handled | no 0.14 | yes 0.92 (denied) |
| pseudonym key kept out of receipts | yes 0.73 | — |

## Post-implementation (`a92baa2`)

`egress.ts`: all blocking questions "no" (max 0.11), residual moderate 1.59. Tests: all "no", residual low 1.50. Packet: all "no", weakest `classification` 0.76.

## Final (`bc65938`, after the pstack fixes)

| File | Blocking max | Residual |
| --- | --- | --- |
| `egress.ts` | `value_leak_in_receipt` no 0.33 | low 1.48 |
| `egress.test.ts` | no 0.08 | low 1.50 |
| `WORK_PACKET.md` | no 0.05 | moderate 1.53 (weakest `classification` 0.74) |

After the delta cycles, `egress.ts` was re-run on the candidate: all blocking questions "no", with `value_leak_in_receipt` 0.30 and residual moderate 1.55 (c 0.48).

The 0.30–0.33 on `egress.ts` comes from the decision deliberately returning the minimized payload to send. That payload is not part of the receipt, which holds only paths, classes, transforms and keyed digests (tested). The remaining `classification` weakness is structural: a mis-declared schema is the residual recorded in THREAT_MODEL.

Jev executes nothing. Functional claims come from the 28 unit tests.
