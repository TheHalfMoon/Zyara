# AIF-01B pstack Evidence

pstack review gate (`/ps-review`): fresh-context judges over the diff. This diff earned the **full split panel**: a security trigger (an authorization decision point, plus SQL privileges) and more than one surface (TypeScript and SQL). Each judge ran in its own fresh-context subagent and read only the diff and its own context.

## Full panel on `436590d..4c037ff`

| Judge | Must-fix | Outcome |
| --- | --- | --- |
| correctness (TypeScript) | claims keyed on the idempotency key alone (a second principal could reuse it) | fixed in `0698758`: claims bind actor kind + actor ref + key, and approvals bind their requester |
| correctness (SQL) | the app could set `granted_at` and dodge the 90-day bound; receipt token CHECKs weaker than 044 | fixed: column-level INSERT grants; `capability_is_opaque_token()` with the 044/045 rules |
| security | an unsafe approval id was nulled in the receipt (replay); an approval echoed on a routine call consumed someone else's; unpinned `search_path` on the claim guard | fixed: references refused before lookup; approval used only when rule 8 relied on it; `search_path` pinned, table qualified, `FOR SHARE` |
| parsimony + product | duplicated digest helpers; dead A5 re-check | fixed: internal `canonical.ts`; dead branch folded into the rule condition |

Worth-considering items applied:

- snapshot the request and principal (getter/Proxy);
- choose the grant from the role that passed `authorize()`;
- admin/clinical separation;
- skip grants not yet in force;
- A5 needs an idempotency key;
- refuse to record an expired ALLOW;
- order status events by sequence;
- receipt shape CHECKs and receipt-to-grant FK;
- index the grant branch FK;
- complete the rollback note;
- make the packet text match the code.

Kept against parsimony, with rationale:

- the approval-claim mechanism closes a replay gap the Jev design challenge found (recorded in the packet);
- `assertReceiptShape` was a Jev security finding (unvalidated receipts);
- the grant re-filter after the port is defense in depth against a misbehaving storage adapter.

Deferred: workflow confused deputy (a workflow inherits its grants regardless of who started it). The workflow runtime is AIF-04, and this is recorded as a residual risk.

## Delta re-reviews (cap: 3 cycles)

| Cycle | Delta | Result |
| --- | --- | --- |
| 1 | `4c037ff..0698758` | all 6 must-fix items CLOSED. New: TS/SQL token parity mismatch; tenant-wide admin/clinical gap; `undefined` slipping past null checks. Fixed in `8c5ffbb` (shared fixtures checked by both the unit test and the DB smoke) |
| 2 | `0698758..8c5ffbb` | the 3 items CLOSED. New must-fix: narrowing let an admin make a routine PHI read. Fixed in `822ecf7` |
| 3 | `8c5ffbb..822ecf7` | the item CLOSED. New must-fix: an approved PHI write was open to an admin. Fixed in `26a3703` with the judge's exact rule, and proved by a test |

The cap was reached. The cycle-3 fix applies the judge's own prescription verbatim and is verified by `AIF-01B fix cycle 3 (final)` (ASK, then ALLOW for an approved admin export read; DENY for an approved admin PHI write). No panel re-ran after `26a3703`; that is recorded here rather than claimed.

## Mechanical gate

Local, at `26a3703`, Node 24.19.0 / pnpm 9.12.0:

- typecheck: `capability-gateway`, `collaboration`, `api`;
- lint: `capability-gateway`, `aif01a-tests`, `aif01b-tests`;
- `check-boundaries`;
- tests: AIF-01A 37, AIF-01B 50, N5/C1 13, N5/C2 14, N5/C3 20, N5/C4 10;
- real PostgreSQL 16.15 smokes: AIF-01B and N5/C3.
