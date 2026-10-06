# AIF-01A Alibaba Open Code Review

## Tool and mode

- `ocr --version`: `open-code-review v1.12.12 (182898c) windows/amd64`, built 2026-10-05, https://github.com/alibaba/open-code-review.
- OCR's own LLM review mode (`ocr review`) is **not configured**. `ocr llm test` fails with: provider `anthropic` has no `api_key`. No paid key was added (zero-cost policy).
- **Delegate mode was used.** `ocr delegate preview` selects the reviewable files and exclusions. `ocr delegate rule <files>` resolves the rule groups. The host agent (Claude Code, this session) applied those rules to the diff. **No OCR-model verdict is claimed.** The findings below are the host agent's judgments against OCR's resolved rules.

## File selection (`ocr delegate preview --from origin/main --to HEAD`, candidate `6eb2d9c`)

9 reviewable of 12. Merge base `b95debaa784c48867e92b73f695eb560f4e0f182`.

Reviewed: `.github/workflows/aif01a-ci.yml`, `docs/evidence/AIF/AIF-01A/jev/design.spec.json`, `packages/capability-gateway/{package.json,src/contract.ts,src/index.ts,tsconfig.json}`, `packages/collaboration/src/agent-identity.ts`, `packages/collaboration/src/approvals.ts`, `tests/aif01a/package.json`.

**Excluded by OCR, so not OCR-reviewed:**

- `docs/evidence/AIF/AIF-01A/WORK_PACKET.md` (unsupported_ext);
- `pnpm-lock.yaml` (default_path);
- `tests/aif01a/contract.test.ts` (default_path). Jev and the pstack panel covered it.

## Rule groups resolved

1. `.github/workflows/**/*.{yaml,yml}`: security (pull_request_target, secrets, permissions, pinning, injection), correctness, reliability (timeout, concurrency, caching), best practices.
2. `**/*.{json,json5}`: key spelling.
3. `**/package.json`: pinned versions, duplicate deps, undeclared tool deps.
4. `**/*.{ts,js,...}`: typos, dead code, duplicate code, hardcoding, `var`/`==`/`any`, null checks, async handling, injection/sensitive data.

## Findings

| Rule | Location | Finding | Disposition |
| --- | --- | --- | --- |
| G1 reliability: uncached dependencies | `aif01a-ci.yml` | `pnpm install` without cache | **Fixed** (`4e17d28`): pnpm set up before Node, `cache: pnpm` |
| G4 duplicate code | `contract.ts` vs `approvals.ts` | direct-identifier patterns duplicated | **Fixed** (`4e17d28`): `APPROVAL_DIRECT_IDENTIFIER_PATTERNS` exported and reused |
| G1 security: unpinned third-party action | `aif01a-ci.yml` | `pnpm/action-setup@v4` pinned by tag, not SHA | **Deferred**: the same pattern is in all 24 existing workflows, so a repo-wide supply-chain fix belongs in its own slice |
| G1 reliability: no concurrency group | `aif01a-ci.yml` | no `concurrency` | Skipped: matches repo convention, no correctness impact |
| G3 undeclared tool deps | both `package.json` | `eslint`/`tsc` in scripts, not in devDependencies | False positive: root workspace devDependencies provide them (same as every existing package) |
| G1 permissions, timeout, injection, secrets | `aif01a-ci.yml` | `permissions: contents: read`, `timeout-minutes: 15`, no expressions in `run`, no secrets | Clean |
| G2 key spelling | `design.spec.json`, `tsconfig.json` | — | Clean |
| G4 `any`, `var`, `==`, eval, prototype mutation, dead code | TS files | — | Clean |
