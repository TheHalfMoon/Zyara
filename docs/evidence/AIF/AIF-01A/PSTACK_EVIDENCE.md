# AIF-01A pstack Evidence

pstack is the `ps-*` skill set at `C:\Users\Shehr\.agents\skills` (`ps-review`, `ps-build`, `ps-close`, ...). It has no CLI. Its review gate is `/ps-review`: fresh-context judges over a diff, with a light combined judge by default and the full split panel when the diff earns it.

## Panel 1 — full split panel (previous session, `e1b506c` → `b3a353c`)

Recorded in commit `b3a353c` ("close AIF-01A review-panel findings"); its message is the source for this section:

- **Correctness judge, must-fix:** validate one JSON snapshot of the input so a getter or Proxy cannot pass the checks and then change the copy, and read own fields only. Also reuse N5/C1 `isReservedCapability` so underscore, colon and hyphen separators are reserved. Both fixed.
- **Security judge, must-fix:** the JWT pattern was quadratic on `eyJ-` runs (80 KB took 6.3 s). Every scanned string is now capped at 512 characters, the definition at 16 KB, and every quantifier is bounded. Fixed, with a test.
- Worth-considering items applied: A5 is human-only for workflows too; data classes digest in canonical order; branch-scoped invocations and receipts must name a branch; DENIED receipts are UNVERIFIED; NONE_READ_ONLY never reports VERIFIED; broader credential shapes; no credential shapes or direct identifiers in tokens.

## Panel 2 — light combined judge on this session's delta (`b3a353c` → `0b4e19a`)

One fresh-context subagent judged the delta diff against the four bars. The security bar was triggered because the delta touches secret and identifier screening.

- Must-fix: **none**.
- Worth-considering, both applied in `6eb2d9c`:
  - a UUID-shaped value such as `00000000-0000-0000-0000-966501234567` skipped the digit-run check. The UUID shape now needs version 1-8 and the RFC variant, with a test;
  - the move to the N5/C3 rule accepts 7-8 digit runs inside a token. This is pinned by a test as a deliberate choice.
- Skip-it: shrink the 2,000-iteration UUID loop (done: 50 iterations). The private pattern copies in `activity.ts`/`audit-chain.ts` are out of scope.
- Clean: the rename has no stale callers; the key-on-every-write rule agrees with the read path; UUIDs cannot match any secret pattern; the CI workflow follows convention.
- Manifest: `panel: light ✓ combined (fresh context) · security ✓`.

## Mechanical gate (pstack rule: never review code that does not typecheck)

Run locally on Node 24.19.0 / pnpm 9.12.0 before each review; CI runs Node 22.12.0. All green: capability-gateway typecheck, collaboration and api typecheck, lint, `scripts/check-boundaries.mjs`.
