# AIF-03A Alibaba Open Code Review

`open-code-review v1.12.12 (182898c)`, **delegate mode**. OCR selected the files and resolved the rules, and the host agent applied them. No OCR-model verdict is claimed, because no provider key is configured.

## Selection (`ocr delegate preview --from origin/main --to HEAD`)

6 reviewable of 9:

- the Jev spec;
- `packages/model-registry/{package.json, src/index.ts, src/registry.ts, tsconfig.json}`;
- `tests/aif03a/package.json`.

**Excluded, not OCR-reviewed:** `WORK_PACKET.md` (unsupported_ext), `pnpm-lock.yaml` and `tests/aif03a/registry.test.ts` (default_path). The panel and Jev covered the test file.

## Findings (TS/JS and package.json rule groups)

| Rule | Location | Finding | Disposition |
| --- | --- | --- | --- |
| Nested ternary | `registerAgentClass` counterpart choice | one nested ternary picked the counterpart class | **Fixed**: a `SEPARATED_CLASSES` lookup table |
| Duplicate code | `canonicalJson` and `sha256Hex` also exist in other AIF packages | cross-package helpers | **Kept**: the gateway helper is internal, and exporting it would widen its API (same decision as AIF-02A) |
| Hardcoding | alias, verb and transition tables | business vocabularies as constants | Clean: these are closed policy vocabularies, documented in the packet |
| `any`, `var`, `==`, `eval`, secrets | — | — | Clean |
