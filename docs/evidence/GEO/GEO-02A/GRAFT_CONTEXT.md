# GEO-02A Graft Context

Implementation head: `dcfed09d57d8d3b96338b5f3ec20f664d70d0975`.

Graft v0.21.1 ran with `DO_NOT_TRACK=1` and telemetry disabled. No deep build, Trail or hosted graph was used.

- `graft build`: **2,014 nodes, 4,022 edges, 287 cards** across 287 files.
- Final incremental pass parsed 2 files and replayed 285 from cache.
- `graft check`: **OK**; wiring graph in sync with the implementation.
- The meaning layer was not built; no semantic-completeness claim is made.

## Wiring

| Symbol | Callers |
| --- | --- |
| `initializeGeo02aRenderer` | `MapRenderer.tsx`, `geo02a-renderer.test.ts` |
| `createGeo02aLoadDeadline` | `MapRenderer.tsx`, `geo02a-renderer.test.ts` |

The browser-smoke script exercises the exact MapLibre package and self-hosted worker/shared module in a headless browser, independently of the fake runtime that qualifies error paths.
