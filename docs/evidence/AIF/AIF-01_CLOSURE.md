# AIF-01 Closure — Capability Contract (01A) + Resolver (01B)

## AIF-01A — capability contract

| Item | Value |
| --- | --- |
| PR | TheHalfMoon/Zyara#116 |
| Qualified head | `09d94ead97bcbd30209bda717c64727ef559dcee` |
| Merge | `ca4ab0bc87416178443570499360bb4327ae3149` (normal merge, `--match-head-commit`), 2026-10-06T16:08:45Z |
| Exact-head CI | 9 checks pass: `capability-contract` ×2, `foundation` ×2, `agent-identities`, `derived-activity`, `approvals-exceptions`, `audit-chain`, CodeRabbit (skipped review, not used as evidence) |
| Post-merge `main` CI | `m001-ci` success on `ca4ab0bc` |
| Evidence | `AIF-01A/` (WORK_PACKET, RESULT, JEV_REVIEW, OCR_REVIEW, PSTACK_EVIDENCE, GRAFT_CONTEXT) |

`CAPABILITY_CONTRACT_QUALIFIED = TRUE`

## AIF-01B — durable registry + deny-by-default resolver

| Item | Value |
| --- | --- |
| PR | TheHalfMoon/Zyara#117 |
| Qualified head | `f8554ab327d0afd8140fa5d54fe0728a2c3d6f6b` |
| Merge | `f18aabc9f456676bc34d97a294ad447637bd60d9` (normal merge, `--match-head-commit`), 2026-10-06T16:57:25Z |
| Exact-head CI | all checks pass, including `capability-resolver` ×2 (PostgreSQL 16 smoke), `capability-contract`, `foundation` ×2, and N5 `agent-identities`, `derived-activity`, `approvals-exceptions` and `audit-chain`; plus `coverage`, `helpdesk`, `whatsapp`, `workforce`, `m002` and `m008` |
| Post-merge `main` CI | `m001-ci`, `m002-ci` and `m008-ci` success on `f18aabc9` |
| Migration | `046_capability_registry.sql` canonical on `main` |
| Evidence | `AIF-01B/` (WORK_PACKET, RESULT, JEV_REVIEW, OCR_REVIEW, PSTACK_EVIDENCE, GRAFT_CONTEXT) |

`CAPABILITY_RESOLVER_QUALIFIED = TRUE`

## What this closure does not claim

- No production execution: the resolver decides and never dispatches. Dispatch, re-resolution before dispatch and UNKNOWN outcomes belong to AIF-04C.
- No authenticated receipts: receipts are content-addressed; keyed MACs arrive with AIF-02.
- No workflow initiator binding (AIF-04).
- Alibaba Open Code Review ran in delegate mode only; there was no OCR-model verdict.

## Next AIF frontier

AIF-02 (privacy, egress and credential mediation) depends only on AIF-01 and is now dependency-ready. WKD-01A (module and readiness contracts) becomes eligible after AIF-01A/B, per the WKD handoff. It also needs AIF-03A for provider readiness.
