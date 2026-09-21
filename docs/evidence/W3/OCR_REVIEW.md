# W3 External Review Record — Alibaba Open Code Review

## Tool

| Item | Value |
| --- | --- |
| Repository | `alibaba/open-code-review` (Apache-2.0, Alibaba Group) |
| Revision used | `01cf7ff8b94c5087205eaf47a6e67f94dabb2a32` (main at time of use; latest release tag `v1.12.8`) |
| Installed CLI | `open-code-review v1.12.8 (5c7b383) windows/amd64`, built `2026-09-21T12:33:16Z` |
| Install | `npm install -g @alibaba-group/open-code-review` |
| Mode used | Delegation mode (`ocr delegate`) — deterministic file selection and rule resolution; the reviewing model was the host agent |

Nothing from this tool was copied into Zyara. It is used as a review tool only, so
it adds no runtime dependency and no license/NOTICE obligation to the product.

## Exact commands and condensed observed output

The transcript below is condensed from the live runs (file list, counts and phase
metadata are reproduced verbatim; per-file diff column spacing is not).

```text
$ ocr delegate preview --from main --to feat/zyara-network-w3-helpdesk-tasks
# Files (8 reviewable / 11 total)
- mode: range
- merge_base: a7ef63d7c00151c6977437760d911533255f5e6d
- total_insertions: 1851, total_deletions: 1
  .github/workflows/w3-ci.yml                 [added] +49/-0
  apps/api/scripts/w3-task-rls-smoke.mjs      [added] +142/-0
  apps/api/src/index.ts                       [modified] +2/-0
  apps/api/src/tasks.ts                       [added] +280/-0
  apps/api/src/workforce.ts                   [modified] +8/-1
  db/migrations/040_ops_tasks.sql             [added] +150/-0
  docs/evidence/W3/PROVENANCE.md              excluded: unsupported_ext
  docs/evidence/W3/WORK_PACKET.md             excluded: unsupported_ext
  packages/enterprise-access/src/index.ts     [modified] +1/-0
  packages/enterprise-access/src/tasks.ts     [added] +547/-0
  tests/m056/helpdesk.test.ts                 excluded: default_path

$ ocr delegate rule --from main --to feat/zyara-network-w3-helpdesk-tasks \
    --background-file docs/evidence/W3/WORK_PACKET.md --format json <files...>
group 1  system  .github/workflows/**/*.{yaml,yml}   1 file
group 2  system  **/*.{ts,js,tsx,jsx,mjs,cjs}        7 files
group 3  system  default                             1 file  (040_ops_tasks.sql)
```

The tool warned that the `--background-file` content (3292 characters) exceeded
its recommended 2000 characters and that review quality might be impacted. This is
recorded rather than trimmed, because the slice's invariants are the point of the
review.

## Resolved rule groups

- **Workflow rules** (`w3-ci.yml`): `pull_request_target` misuse, secret exposure,
  excessive permissions, unpinned action versions, script injection, hardcoded
  credentials, missing `fetch-depth`, incorrect conditions, missing timeout,
  missing concurrency control, uncached dependencies, deprecated syntax,
  `continue-on-error` awareness, floating container tags.
- **TypeScript/JavaScript rules** (7 files): typos, dead code, duplicated logic,
  prohibition of `var`, strict equality, `any` usage, null checks, nested
  ternaries, async error handling, injection and XSS surfaces, sensitive data.
- **Default rules** (`040_ops_tasks.sql`): correctness and boundary conditions,
  injection and permission validation, performance and resource use,
  maintainability and existing project style, test coverage.

## Findings and dispositions

### Confirmed and fixed

| # | Rule | Finding | Fix |
| --- | --- | --- | --- |
| F1 | TS: duplicate code | `text()` and `optionalText()` in `apps/api/src/tasks.ts` were byte-identical helpers | collapsed to a single helper, all call sites updated |
| F2 | TS: hardcoded business list / duplication | the task status allowlist was re-typed as a literal array in the API layer | imports `OPS_TASK_STATUSES` from the domain package instead |
| F3 | Workflow: excessive permissions | the job declared no `permissions` key, inheriting broad default token scope | added `permissions: contents: read` |
| F4 | Workflow: missing timeout | the job had no `timeout-minutes` | added `timeout-minutes: 20` |
| F5 | Correctness (found while resolving Jev probes) | idempotent replay was evaluated after assignee eligibility, so a retry after the assignment expired failed instead of returning the original record | replay check now precedes eligibility resolution; regression test added |
| F6 | Correctness (found by an earlier test failure) | resolved work could never be reopened because the terminal-state guard ran before the lifecycle table, making the documented `resolved -> open` reopen rule unreachable | guard split into `assertNotCancelled` (transitions) and `assertNotTerminal` (assign/comment); reopen tests added |
| F7 | (found by executing the smoke twice, not by the rule set) | `w3-task-rls-smoke.mjs` seeded fixed rows without clearing them, so a second run against an existing database failed on the primary key | the smoke now clears the work-queue tables first and is re-runnable, matching the existing M016 smoke convention |

### Deferred, with rationale

| # | Rule | Finding | Why not fixed here |
| --- | --- | --- | --- |
| D1 | Workflow: unpinned action versions | `pnpm/action-setup@v4` is a mutable tag; the rule asks for a full commit SHA | all 18 pre-existing Zyara workflows use the same tag; pinning is a repository-wide decision and doing it only here would create inconsistency between slice workflows |
| D2 | Workflow: uncached dependencies | the job installs dependencies without a cache | matches the existing W2 slice workflow; caching is a repository-wide workflow change, not a W3 property |
| D3 | Workflow: no concurrency control | concurrent pushes to the same branch can start overlapping runs | cancelling in-flight runs is a repository-wide policy choice |
| D4 | (tool behaviour) | OCR's default configuration excluded `tests/m056/helpdesk.test.ts` (reason `default_path`) and the two evidence documents (reason `unsupported_ext`) from its reviewable set | exclusions are recorded, not hidden; the test file was reviewed manually against the same TypeScript rule group and the migration assertions it contains are part of the evidence |

### Checked and dismissed

- the `!=` at `apps/api/src/tasks.ts:218` is inside an error-message template
  literal, not a loose equality comparison;
- the slice contains no `any`, no `var`, no nested ternaries, no `eval`,
  `Function`, `innerHTML`, `document.write` or dynamic code execution;
- no workflow uses `pull_request_target`, no secret is referenced, and no
  credential is hardcoded, so those rules do not apply;
- `fetch-depth: 0` is unnecessary because the job does not consume git history;
- no API key, token or personal data is logged, and the smoke script reads its
  connection string from `DATABASE_URL` only.

## Limitation (recorded, not disguised)

OCR's own LLM review path (`ocr review`) was **not** executed: this environment has
no OpenAI- or Anthropic-compatible credential, and the only configured model
endpoint (`api.typesafe.ai`) serves Jev decision models, verified live as
`{"models":[{"name":"jev-latest"},{"name":"jev-preview"}]}`, which is not a
chat-completions provider. Delegation mode was therefore used exactly as the tool
documents it: deterministic file selection and rule resolution by OCR, review
judgement by the host agent. No independent second-model review is claimed for
this slice, and the check list above is a rule-driven review, not a security audit
or regulatory evidence.
