# AIF-02B Jev Review

Jev skill CLI `0.3.2`, model `jev-1.13.0`. Spec: `jev/design.spec.json`. It has four blocking questions (`secret_reaches_model`, `secret_in_logs`, `scope_bypass`, `stale_credential`) plus `residual_risk` and `weakest_area`.

## Design challenge (before code)

All four blocking questions were "no" (≤ 0.08), residual low (1.39), weakest `completeness` (0.72). Probes:

| Probe | Before | After packet fix |
| --- | --- | --- |
| `use(fn)` cannot leak by returning or storing the secret | no 0.45 | yes 0.93 |
| behaviour of a request racing a rotation | no 0.07 | yes 0.86 |
| use bounded in time | yes 0.96 | — |
| a model cannot choose the reference | yes 0.80 | — |
| vault called only after every check | yes 0.72 | — |

## Post-implementation (`8373af7`)

- `credentials.ts`: all "no" (max 0.14), residual low 1.53.
- Tests: all "no", residual low 1.42.
- Packet: all "no", residual low 1.30.

## Final (`d5d8b3d`, after the pstack panel fixes)

| File | Blocking max | Residual | Weakest |
| --- | --- | --- | --- |
| `credentials.ts` | `secret_reaches_model` / `stale_credential` no 0.15 | moderate 1.62 | `boundary` 0.35 |
| `credentials.test.ts` | no 0.05 | low 1.41 | completeness |
| `WORK_PACKET.md` | no 0.12 | low 1.44 | `boundary` 0.71 |

The `boundary` weakness is real and is recorded in THREAT_MODEL. The boundary is in-process and best effort, and process isolation is AIF-04/AIF-06 runtime work. Jev executes nothing; functional claims come from the tests.
