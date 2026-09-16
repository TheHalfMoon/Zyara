# M044 result — private and approved-cloud ASR evaluation

- Base SHA: ffe550b. Dependencies: M041, M003, M001 (all evidenced).
- Implementation: packages/voice-eval (asr.ts); tests/m044/asr.test.ts.
- Semantics: 5-locale synthetic fixture set; Levenshtein WER per engine
  per locale; privacy grades with data-flow requirement for cloud;
  dual accuracy+privacy gate; critical utterances flagged for M045.
- Synthetic evidence only. No live audio, no vendor selected.
- Commands:
  - pnpm --filter @zyara/m044-tests test → 3 pass, 0 fail
  - pnpm --filter @zyara/voice-eval typecheck → clean
  - pnpm --filter @zyara/voice-eval lint → clean
  - pnpm --filter @zyara/m044-tests lint → clean
- Residual risks: real-voice accuracy needs consented voice corpus
  (external); engine procurement is out of scope.
