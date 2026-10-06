# AIF-01B Graft Context

Graft `0.21.1`, run under the `AGENTS.md` policy: telemetry was disabled first, only the local wiring graph was used, with no `--deep` and no `graft trail`. `graft/` stays an uncommitted cache.

- Before implementation: `graft build`. It produced 261 files and 1640 nodes.
- At the candidate: `graft build`. It produced 266 files, 1713 nodes and 3376 edges, and `graft check` reported OK (graph in sync with the code).

Navigation used for design and verification:

| Command | Result | Used for |
| --- | --- | --- |
| `graft callers certifyAdapter` / `requireCapability` | `requireCapability` is used by `adapter-ops` `executeOperation` and `navigation-tools` `invokeTool` | the resolver reuses `requireCapability` the same way, rather than a second certification check |
| `graft skeleton .../agent-identity.ts` | `resolveAuthority(agentId, scopeTenant, request, sponsors)` and the closed `AGENT_CAPABILITIES` | rule 5 composes N5/C1 instead of re-deciding agent lifecycle |
| `graft skeleton .../approvals.ts` | `ApprovalRequest` fields and `PROTECTED_ACTIONS` | rule 8 binds action type, branch, digest and requester to N5/C3 records |
| `graft callers authorize` | `apps/api` activity, agents, approvals, audit-chain and coverage call it with server-side context | the resolver calls `authorize()` per granted role in the same way |
| `graft callers resolveCapability` | tests only | no production caller yet (the slice has no route, by design) |
| `graft callers isOpaqueToken` | the receipt builder, the reference pre-check and `assertReceiptShape` | the same opaque-token rule guards every echoed or stored token |

Graft is navigation only. Correctness evidence is in `RESULT.md`, `JEV_REVIEW.md`, `OCR_REVIEW.md` and `PSTACK_EVIDENCE.md`.
