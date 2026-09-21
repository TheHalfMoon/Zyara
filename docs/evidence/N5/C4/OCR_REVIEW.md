# N5/C4 Alibaba Open Code Review — Truth

**alibaba/open-code-review was NOT executed for N5/C4.** No OCR verdict, coverage or finding
is claimed.

Availability was re-probed live for this slice rather than carried over from C3, because the
directive requires a fresh check per environment/session:

| Probe | Command | Result |
| --- | --- | --- |
| npm on `PATH` | `Get-Command npm` | not found |
| npx on `PATH` | `Get-Command npx` | not found |
| npm/npx in the workspace bin | `dir node_modules/.bin` | no npm or npx entry |
| npm/npx in the bundled runtime bin | `dir <runtime>/dependencies/bin -Recurse` | only a `pnpm` shim and one JSON file |
| `ocr` on `PATH` | `Get-Command ocr` | not found |
| Python package | bundled Python 3.12 `find_spec("open_code_review")` | `False` |
| Python `ocr` package | bundled Python 3.12 `find_spec("ocr")` | `False` |
| `%ProgramFiles%\nodejs` | `dir "C:\Program Files\nodejs"` | not present |

Node is available for the test and smoke suites, but there is no npm/npx, no Python package
and no preinstalled copy of the tool, so it could neither be installed nor invoked. This is
recorded as a missing independent review capability, not as a passing review. If the tool
becomes available it should be run against the exact qualified head in `RESULT.md`, with its
version/revision, excluded files and the deterministic-rule versus reviewing-model
distinction recorded.
