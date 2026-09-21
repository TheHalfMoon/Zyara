# N5/C2 Alibaba Open Code Review — Availability

## Status: not available, no review claimed

The C1 environment state was **not** assumed to still apply. The tool was re-checked
in this environment:

| Check | Result |
| --- | --- |
| `open-code-review` on `PATH` | not found |
| `ocr` on `PATH` | not found |
| `npm` / `npx` on `PATH` | not available in this runtime (only `node` and a `pnpm` shim), so the tool cannot be fetched or invoked through the Node toolchain |
| existing global install | no `open-code-review` binary or package directory found under the user profile |

No Alibaba Open Code Review run, version, revision, file-selection behaviour, rule
resolution or semantic finding is claimed for N5/C2. Nothing in `RESULT.md` depends
on an OCR verdict.

## What compensates, and what does not

Available and used instead:

- exact-head repository CI for the slice;
- a real-PostgreSQL smoke under the `zyara_app` role;
- a reusable authenticated Fastify `inject()` HTTP smoke;
- 14 synthetic qualification cases including negative cases for every denial code;
- a manual review of every changed file;
- a genuine Jev (TypeSafe) review at design, diff and test level (see `JEV_REVIEW.md`).

Not compensated:

- no independent third-party automated code review verdict exists for this slice.

If `alibaba/open-code-review` is installed in a later environment, a review may be
added without rewriting this packet; the absence recorded here stays accurate for the
environment in which the slice was qualified.
