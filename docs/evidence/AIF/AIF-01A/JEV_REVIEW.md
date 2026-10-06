# AIF-01A Jev Review — Capability Contract

## Availability

Jev was run through the skill CLI `C:\Users\Shehr\.agents\skills\jev\scripts\jev` (version `0.3.2`, Python 3, `PYTHONIOENCODING=utf-8`). `jev auth status` reported the TypeSafe provider with `TYPESAFE_API_KEY` from the environment (never printed). The provider reported model `jev-1.13.0`. The `jev.exe` on `PATH` (`2026.919.0`) is a different binary without the `auth`/`run` interface and was not used.

Spec: `jev/design.spec.json` (five blocking `noul` questions, `residual_risk`, `weakest_area`).

## Round 1 — design challenge (previous session)

The design challenge ran before implementation in the previous session (commit `ef2ac03`). Its recorded outcome, carried in the work packet, is that write safety was the weakest area, which added the `idempotency.enforcedBy` contract and the "a write may retry only when the provider enforces idempotency" rule. That session did not commit the raw verdict table, so no numbers are claimed for this round.

## Round 2 — post-implementation, exact files (this session)

Run on the files at `0b4e19a` / `6eb2d9c`.

| State | widen authority | secret enters | write w/o safety | unknown hidden | version gap | residual | weakest |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `contract.ts` @ `008b5cb` | no 0.04 | no 0.10 | no 0.02 | no 0.03 | no 0.09 | low 1.46 (c 0.50) | completeness 0.49 |
| `contract.test.ts` @ `008b5cb` | no 0.03 | no 0.05 | no 0.02 | no 0.03 | no 0.06 | low 1.22 (c 0.66) | completeness 0.54 |
| `WORK_PACKET.md` @ `008b5cb` | no 0.06 | no 0.05 | no 0.02 | no 0.03 | no 0.05 | **moderate 1.82 (c 0.65)** | **write_safety 1.00** |
| `WORK_PACKET.md` after fix | no 0.06 | no 0.06 | no 0.02 | no 0.03 | no 0.05 | moderate 1.75 (c 0.63) | write_safety 1.00 |
| `contract.ts` @ `6eb2d9c` (candidate) | no 0.04 | no 0.11 | no 0.03 | no 0.03 | no 0.08 | low 1.45 (c 0.50) | completeness 0.42 |
| `contract.test.ts` @ `6eb2d9c` (candidate) | no 0.03 | no 0.05 | no 0.02 | no 0.03 | no 0.05 | low 1.22 (c 0.65) | completeness 0.50 |

### Triage of `weakest_area = write_safety` (p=1.00)

Targeted `jev yes` questions against the work packet found the mechanism:

| Question | Before | After |
| --- | --- | --- |
| States what a write receipt reports after a timeout/drop following dispatch (UNKNOWN, not FAILED) | yes 0.50 | **yes 0.98** |
| Explains retrying a write is unsafe unless the provider enforces the key | yes 0.96 | — |
| Says ZYARA_LEDGER prevents a duplicate side effect at the provider | no 0.11 | — |
| Defines how a NATURAL_KEY key is derived when the caller supplies none | no 0.04 | no 0.28 |
| Write safety is declared but not executed in this slice | yes 0.60 | yes 0.85 |

Fixes, verified against the code:

- **Real defect fixed (`0b4e19a`).** A `NATURAL_KEY` write could be invoked with no idempotency key, so it could be neither deduplicated nor reconciled. Every write invocation now carries a key, and a new test refuses a keyless `NATURAL_KEY` write.
- **Ambiguity fixed.** The unknown-outcome rule is now explicit in the code and packet. A dispatched write that times out or drops is `UNKNOWN_EXTERNAL_OUTCOME`, never `FAILED`. AIF-04C, which observes dispatch, enforces it.

### Residual kept open and disclosed

- `NATURAL_KEY` derivation is per owning domain by design (for example appointment id + action). The generic contract does not fix an algorithm, so Jev still reads it as undefined (0.28).
- Write safety is declared, not executed: this slice has no durable dedup ledger, dispatcher or reconciliation job (AIF-01B, AIF-04C). That is the moderate residual on the packet.

## What Jev did not cover

Jev executes nothing. Every functional claim comes from the test suite. Jev authorises no production, clinical or regulatory claim.
