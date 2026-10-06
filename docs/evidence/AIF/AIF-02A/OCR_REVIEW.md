# AIF-02A Alibaba Open Code Review

`open-code-review v1.12.12 (182898c)`. OCR's own LLM mode is not configured (no provider key; none added under the zero-cost policy). **Delegate mode:** OCR selected the files and resolved the rule groups, and the host agent applied them. No OCR-model verdict is claimed.

## Selection (`ocr delegate preview --from origin/main --to HEAD`)

8 reviewable of 11:

- `aif02a-ci.yml`;
- the Jev spec;
- `capability-gateway/src/contract.ts`;
- `privacy-egress/{package.json, src/egress.ts, src/index.ts, tsconfig.json}`;
- `tests/aif02a/package.json`.

**Excluded, not OCR-reviewed:** `WORK_PACKET.md` (unsupported_ext), `pnpm-lock.yaml` and `tests/aif02a/egress.test.ts` (default_path). Jev and pstack covered the test file.

## Findings (rule groups: TS/JS, workflows, package.json, JSON)

| Rule | Location | Finding | Disposition |
| --- | --- | --- | --- |
| Dead code | `egress.ts` `MINIMIZATIONS`, `PROCESSING_LOCATIONS`, `location`; the null-key branch | declared but unused | **Fixed** (removed) |
| Duplicate code | `egress.ts` denial path | `decideDenied` repeated the shared denial branch | **Fixed** (one path) |
| Duplicate code | `canonicalJson` and `sha256Hex` also in `capability-gateway/src/canonical.ts` | cross-package copy | **Kept**: that module is internal to the gateway, and exporting it would widen the gateway's public API for two small helpers |
| Async error handling | `egress.ts` minimization and HMAC | a thrown `crypto.subtle` error could escape | **Fixed**: inside the fail-closed try |
| Unpinned third-party action | `aif02a-ci.yml` | `pnpm/action-setup@v4` tag | **Deferred** repo-wide (as in every workflow) |
| `any`, `var`, `==`, nested ternary, injection, secrets | all TS | — | Clean |
