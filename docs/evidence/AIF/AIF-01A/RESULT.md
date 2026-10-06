# AIF-01A Result — Capability Contract

Base: `main` @ `b95debaa784c48867e92b73f695eb560f4e0f182`. Branch: `feat/zyara-network-aif01a-capability-contract`.
Scope and rules: `WORK_PACKET.md`. The exit marker `CAPABILITY_CONTRACT_QUALIFIED = TRUE` is recorded in `CLOSURE.md` only after exact-head CI and merge.

## Lineage

| Commit | Session | Content |
| --- | --- | --- |
| `ef2ac03` | previous | work packet and Jev challenge spec |
| `e1b506c` | previous | `@zyara/capability-gateway` contract and tests |
| `b3a353c` | previous | full pstack panel fixes (snapshot validation, bounded secret scan, A5 for workflows, ...) |
| `008b5cb` | this | UUID tokens accepted; N5 direct-identifier rule; `aif01a-ci` workflow |
| `4e17d28` | this | OCR findings: shared `APPROVAL_DIRECT_IDENTIFIER_PATTERNS`, cached CI install |
| `0b4e19a` | this | Jev finding: idempotency key on every write invocation; UNKNOWN vs FAILED rule |
| `6eb2d9c` | this | pstack delta panel: UUID version/variant required; N5 rule pinned |

## Defects found and fixed in qualification

1. **Random UUIDs refused as tokens.** Measured: 15.3% of 100,000 `crypto.randomUUID()` values were refused under the earlier any-7-digit rule. Under the N5/C3 rule alone the rate is 3.1% (1,000,000 samples). A canonical v1-v8 RFC-variant UUID is now opaque; other tokens use the N5/C3 rule.
2. **Keyless NATURAL_KEY writes.** A write could be invoked without an idempotency key. Every write now requires one.
3. **Zero-padded UUID shapes** could carry a phone number past the digit check. The UUID shape now requires version and variant nibbles.

## Tests (local, candidate content)

Node 24.19.0, pnpm 9.12.0 (CI uses Node 22.12.0).

| Suite | Result |
| --- | --- |
| `@zyara/aif01a-tests` | 37 pass, 0 fail |
| `@zyara/n5c1-tests` (shares `isReservedCapability`) | 13 pass |
| `@zyara/n5c2-tests` | 14 pass |
| `@zyara/n5c3-tests` (shares `APPROVAL_DIRECT_IDENTIFIER_PATTERNS`) | 20 pass |
| `@zyara/n5c4-tests` | 10 pass |
| typecheck: capability-gateway, collaboration, api | clean |
| lint: capability-gateway, collaboration, aif01a-tests | clean |
| `scripts/check-boundaries.mjs` | passed |

This is a pure module with no table, route or provider, so there is no database or HTTP smoke.

## Reviews

- Jev: `JEV_REVIEW.md`. Candidate code and tests score low residual risk, with all blocking questions "no". The packet keeps a disclosed moderate write-safety residual.
- Alibaba Open Code Review, delegate mode: `OCR_REVIEW.md`. Two findings fixed, one deferred repo-wide, three exclusions recorded.
- pstack: `PSTACK_EVIDENCE.md`. Full panel (previous session) plus a light delta panel; no open must-fix.
- Graft: `GRAFT_CONTEXT.md`.

## Residual risks

- Registrar and grantee `kind` are caller-declared at this level. AIF-01B must bind both to authenticated, server-derived principals.
- Write safety is declared, not executed. Durable dedup, dispatch and reconciliation belong to AIF-01B and AIF-04C.
- The digit and secret heuristics catch accidental leakage only, not deliberate encoding.
- **Pre-existing, outside this slice:** N5 approvals, activity, audit chain and the migration 045 `correlation_id` CHECK apply the same digit rule without the UUID exemption. About 3% of random UUID correlation ids would be refused there. This is recorded as a follow-up slice, not fixed here.
- `pnpm/action-setup@v4` is tag-pinned across all workflows (supply-chain follow-up).
- The registry is in-process. Durable registry, grants table and the deny-by-default resolver are AIF-01B (next migration number to be read from live `main`).
