# Repository Agent Tooling

Existing project governance and canonical evidence remain authoritative.

<!-- graft:start -->
## Graft — repository context layer

Use Graft (https://github.com/trailhq/Graft, `@nanonets/graft`) as the default codebase context/navigation layer for coding agents.

If Graft is unavailable or the local `graft/` graph is absent/stale, run `graft init`, select the active agent(s), then run `graft build`. Before broad source exploration prefer `graft check`, `graft map`, `graft ask "<question>" --source`, `graft skeleton <file>`, `graft callers <symbol>`, and `graft grep "<literal>"`. After material code changes, run `graft build` again.

Treat `graft/` as a local regenerable cache and do not commit it; `.gitignore` excludes `/graft/` and `.ignore` re-admits the cards to ripgrep search only.

Graft ships anonymous usage telemetry that is on by default. Run `graft telemetry disable` before any other graft command on a machine, so no usage metadata leaves the workstation. Do not use `graft trail` (`connect`, `push`, `pull`): it attaches the repository to a hosted Trail service and is not authorized for this project. Keep usage zero-cost: do not introduce paid model/API usage. The default `graft build` needs no model; model-backed enrichment (`graft build --deep`) sends source to its provider, so it may only use a local provider or one already authorized to receive this repository's source. Being free of charge is not authorization.

Graft is context/navigation, not correctness or qualification evidence. Continue all repository-required tests, Jev review/qualification where applicable, Alibaba Open Code Review, CI, and security checks. Never fabricate Graft output, tool execution, CI, reviews, or evidence.
<!-- graft:end -->
