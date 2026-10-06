# AIF-01B Result — Durable Registry + Deny-by-Default Resolver

Base: `main` @ `436590dfe8c81e78a5e4b72bf0de6760d528dff0`. Branch: `feat/zyara-network-aif01b-capability-resolver`.
Scope and rules: `WORK_PACKET.md`. The exit marker `CAPABILITY_RESOLVER_QUALIFIED = TRUE` is recorded in a closure record after exact-head CI and merge.

## Delivered

- `resolveCapability()` returns `ALLOW` / `ASK` / `DENY` / `UNDECIDABLE` with stable reason codes and a value-free, content-addressed receipt. It composes:
  - AIF-01A contract checks;
  - M002 `authorize()` for humans;
  - N5/C1 `resolveAuthority()` for agents;
  - N5/C3 approvals;
  - M036 `requireCapability()`;
  - an M043-shaped confirmation port.
- `CapabilityRegistryState`: in-process, append-only registry/grant/claim/receipt state that mirrors migration 046.
- Migration `046_capability_registry.sql`: an immutable catalog plus append-only grants, revocations, approval claims and receipts. It has RLS (`FORCE`), database-stamped timestamps, a database-enforced A5 human-only rule, bounded non-human grants, a claim guard, and a receipt-to-claim and receipt-to-grant FK.
- Workflow `aif01b-ci` (PostgreSQL 16 service).

## Handoff §5 tests

| Handoff test | Proof |
| --- | --- |
| body-supplied tenant ignored/rejected | "rejects a body-supplied tenant and never evaluates under it" |
| revoked agent denied | "denies a revoked agent" |
| expired agent denied | "denies an expired agent at server time" |
| cross-branch denied | "denies cross-branch invocation under a branch grant"; "denies a human acting on a branch outside their membership" |
| stale approval denied | "denies stale, mismatched and parameter-changed approvals" (awaiting, rejected, superseded, executing, expired) |
| wrong parameter digest denied | same test (PARAMETERS_CHANGED), plus "denies a malformed parameters digest…" |
| uncertified adapter denied | "denies an uncertified provider adapter and is undecidable for an unknown one" |
| human-only denied for agent | "denies human-only capabilities to agents and workflows", plus the DB smoke A5 CHECK |
| unknown state → UNDECIDABLE | the "unknown state is UNDECIDABLE, never ALLOW" suite (each port failing or throwing, and the clock) |

## Tests and smokes (candidate content `26a3703`)

| Suite | Result |
| --- | --- |
| `@zyara/aif01b-tests` | 50 pass |
| `@zyara/aif01a-tests` | 37 pass |
| N5/C1, C2, C3, C4 | 13, 14, 20, 10 pass |
| typecheck (capability-gateway, collaboration, api), lint, boundaries | clean |
| `aif01b-capability-rls-smoke.mjs` on PostgreSQL 16.15 | PASS, twice, and idempotent re-apply of 046 |
| `n5c3-approvals-rls-smoke.mjs` on the same database | PASS (no interference) |

The DB smoke proves:

- an immutable catalog that the app cannot self-admit or reinstate;
- append-only grants, revocations, claims and receipts (42501 "permission denied");
- database-owned timestamps (granted_at and revoked_at cannot be set by the app);
- an A5 grant to an agent refused, and a forged lower authority class refused;
- bounded and expiring non-human grants;
- tenant-composite branch FK;
- the claim guard refuses awaiting, expired, unknown and other-tenant approvals;
- one claim per approval, whatever the actor or key;
- an ALLOW bound to its own claim and grant;
- receipt shape and token CHECKs, with TS/SQL token parity over shared fixtures;
- RLS refusal of cross-tenant writes, and read isolation.

## Reviews

- Jev: `JEV_REVIEW.md`. The design challenge closed five gaps before code. Post-implementation findings were triaged to real defects and fixed. Every blocking question is "no" on every final file.
- Alibaba Open Code Review, delegate mode: `OCR_REVIEW.md`. Seven findings fixed, one deferred repo-wide, three exclusions recorded.
- pstack: `PSTACK_EVIDENCE.md`. Full split panel plus three delta cycles, with all must-fix items closed.
- Graft: `GRAFT_CONTEXT.md`.

## Residual risks

- Receipts are content-addressed, not authenticated. A keyed MAC needs a server secret (AIF-02). Until then the DB claim guard and FKs are the binding controls.
- Workflow confused deputy: a workflow's grants apply regardless of who initiated it. Initiator binding belongs to the workflow runtime (AIF-04).
- Role-level authenticity of `granted_by` (that the account is an admin) is enforced by the application layer. The database only proves it is a real account.
- The resolver decides and never executes. Re-resolution before dispatch and the UNKNOWN-outcome rule are AIF-04C.
- Single-use consumption of a confirmation is the confirmation service's responsibility (M043). The resolver binds it to the exact invocation.
- Pre-existing (outside this slice): the N5 correlation-id digit rule refuses about 3% of random UUIDs in approvals, activity, audit chain and 045. AIF-01A/01B exempt canonical UUIDs; N5 does not yet.
- `pnpm/action-setup@v4` is tag-pinned across all workflows.
