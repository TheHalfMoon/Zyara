# AIF-02B Alibaba Open Code Review

`open-code-review v1.12.12 (182898c)`, **delegate mode**. OCR selected the files and resolved the rules, and the host agent applied them. No OCR-model verdict is claimed, because OCR's own LLM mode has no configured provider key.

## Selection (`ocr delegate preview --from origin/main --to HEAD`)

3 reviewable of 5:

- `docs/evidence/AIF/AIF-02B/jev/design.spec.json`;
- `packages/privacy-egress/src/credentials.ts`;
- `packages/privacy-egress/src/index.ts`.

**Excluded, not OCR-reviewed:**

- `WORK_PACKET.md` (unsupported_ext);
- `tests/aif02a/credentials.test.ts` (default_path). The pstack panel and Jev covered it.

The evidence Markdown added later is likewise excluded.

## Findings (TS/JS rule group)

| Rule | Location | Finding | Disposition |
| --- | --- | --- | --- |
| Async error handling | `ResolvedCredential.use` | adapter exceptions propagated unchanged, so the secret could appear in a message | **Fixed**: redacted `adapter failed`; `useAsync` added |
| Null checks | `instant()` | `toISOString()` on an invalid date threw | **Fixed**: NaN check first |
| Sensitive information | receipt `capabilityId` | credential-shaped ids could be echoed | **Fixed**: `safeId` |
| Dead code | redundant `found !== null` / `credential !== null` guards | kept | **Skip**: they narrow types for TypeScript |
| `any`, `var`, `==`, nested ternary, `eval` | — | — | Clean |
