# AIF-01A Graft Context

Graft `0.21.1` (`@nanonets/graft`), used under the `AGENTS.md` policy. Telemetry was disabled first (`graft telemetry disable`, plus `DO_NOT_TRACK=1`). Only the local wiring graph was used: no `--deep` enrichment and no `graft trail`. `graft/` stays an uncommitted local cache.

- `graft build`: 261/261 files parsed; 1640 nodes and 3217 edges; deep layer not built.
- `graft check`: wiring graph in sync with the code.

Questions answered with the graph:

| Command | Result | Used for |
| --- | --- | --- |
| `graft callers isReservedCapability` | `validateGrant` (gateway) and `assertGrantableCapability` (N5/C1) | the export is shared by exactly the two intended consumers |
| `graft callers validateInvocation` | only `tests/aif01a/contract.test.ts` | the stricter key-on-every-write rule has no production caller to break |
| `graft grep APPROVAL_DIRECT_IDENTIFIER_PATTERNS` | `isApprovalToken`, `optionalEvidenceRef` and the remaining approvals call sites, plus the gateway | the rename left no stale reference |

Graft is navigation, not evidence of correctness. Correctness comes from the tests, Jev, OCR delegate review and the pstack panel.
