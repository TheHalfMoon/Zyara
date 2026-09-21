# N5/C3 Alibaba Open Code Review — Truth

## Conclusion

**alibaba/open-code-review was NOT executed for N5/C3.** No OCR verdict, coverage or finding
is claimed anywhere in this packet.

## Availability probes actually run in this environment

| Probe | Command | Result |
| --- | --- | --- |
| npm on `PATH` | `Get-Command npm` | not found |
| npx on `PATH` | `Get-Command npx` | not found |
| npm/npx in the workspace bin | `dir node_modules/.bin \| findstr npm` | no npm or npx entry |
| npm/npx in the bundled runtime bin | `dir <runtime>/dependencies/bin -Recurse` | only a `pnpm` shim and one JSON file |
| `ocr` on `PATH` | `Get-Command ocr` | not found |
| Python package | bundled Python 3.12 `find_spec("open_code_review")` | `False` |
| Python `ocr` package | bundled Python 3.12 `find_spec("ocr")` | `False` |
| `%ProgramFiles%\nodejs` | `dir "C:\Program Files\nodejs"` | not present |

Node itself is available (24.19.0 in this environment, 22.12.0 in CI) and is what the test
and smoke suites run on, but there is no npm/npx and no package manager that could fetch
`@alibaba/open-code-review`, and no preinstalled copy of the tool exists on this machine.
Network access is also restricted for arbitrary fetches, so the tool could neither be
installed nor invoked.

## Consequence

Repository governance does not make OCR a hard merge gate for this slice: exact-head CI,
the real-PostgreSQL smoke, the authenticated HTTP smoke and the recorded Jev runs are the
gates that were actually satisfied. That is recorded as a **missing independent review
tooling capability**, not as a passing review.

If OCR becomes available in a later environment it should be run against the exact
qualified head recorded in `RESULT.md`, with its version/revision, excluded files and
deterministic-rule versus reviewing-model distinction recorded as required.
