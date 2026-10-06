# AIF-01B Alibaba Open Code Review

## Tool and mode

`open-code-review v1.12.12 (182898c)`. OCR's own LLM mode is not configured (no provider key, and none added under the zero-cost policy). **Delegate mode was used:** `ocr delegate preview` selected the files, `ocr delegate rule` resolved the rule groups, and the host agent applied the rules. No OCR-model verdict is claimed.

## File selection (`ocr delegate preview --from origin/main --to HEAD`)

10 reviewable of 13 at `4c037ff`. The same set applies at the candidate, plus the new internal `canonical.ts` (TS rule group).

**Excluded by OCR, so not OCR-reviewed:**

- `docs/evidence/AIF/AIF-01B/WORK_PACKET.md` (unsupported_ext);
- `pnpm-lock.yaml` (default_path);
- `tests/aif01b/resolver.test.ts` (default_path). Jev and the pstack panel covered it.

## Rule groups

1. `system / default` for `046_capability_registry.sql`: correctness and boundaries, concurrency, security and permissions, performance, maintainability, test coverage.
2. `**/*.{ts,js,mjs,...}` for `resolver.ts`, `registry-state.ts`, `contract.ts`, `index.ts`, `canonical.ts` and the smoke: typos, dead code, duplicate code, comments, hardcoding, `var`/`==`/`any`, null checks, nested ternaries, async error handling, injection, sensitive data.
3. `.github/workflows/**` for `aif01b-ci.yml`; `**/package.json`; `**/*.json` for the Jev spec.

## Findings

| Rule | Location | Finding | Disposition |
| --- | --- | --- | --- |
| G2 nested ternary | `resolver.ts` actor construction and `grantOrder` | nested ternaries | **Fixed** |
| G2 duplicate code | `contract.ts` and `resolver.ts` | `canonicalJson`, `sha256Hex` and the ISO-instant pattern copied | **Fixed**: one internal `canonical.ts`, not exported from the package |
| G2 dead code | `resolver.ts` rule 9 | a re-check made unreachable by rule 5 | **Fixed**: folded into the rule's condition (also a pstack parsimony item) |
| G1 concurrency | `046` claim guard | read of `approval_requests` without a lock | **Fixed**: `FOR SHARE` (also a pstack SQL item) |
| G1 security | `046` claim guard | unpinned `search_path` | **Fixed** (pstack security must-fix) |
| G1 performance | `046` grants FK on `(branch_id, tenant_id)` | no index on the referencing side | **Fixed**: `capability_grants_branch_idx` |
| G1 test coverage | smoke | claim guard exercised only as superuser | **Fixed**: claims and RLS refusals now run as `zyara_app` |
| G3 unpinned third-party action | `aif01b-ci.yml` | `pnpm/action-setup@v4` pinned by tag | **Deferred** repo-wide (same as AIF-01A) |
| G3 permissions, timeout, cache, injection | `aif01b-ci.yml` | `contents: read`, 20 min, pnpm cache, no expressions in `run` | Clean |
| G2 sensitive data | all TS | no secrets, values or free text logged or stored | Clean |
