# GEO-10 Graft context

Candidate: `f45df95eecc3248b96c52b32567de2dc9c31342c`.

Graft ran locally with `DO_NOT_TRACK=1` and telemetry disabled. No Trail/hosted graph command was used, and no deep build was requested.

## Final graph

- `graft build`: 1,974 nodes, 3,950 edges, 282 cards.
- Incremental rebuild parsed 2 files and replayed 280 from cache.
- `graft check`: **OK**, wiring graph in sync with the code.

## Relevant callers

| Symbol | Caller at this grain |
| --- | --- |
| `parseModelViewport` | `tests/geo01a/ai-tools.test.ts` |
| `buildPublicShareState` | `tests/geo01a/ai-tools.test.ts` |
| `proposeCorrectionFromGeocoder` | `tests/geo01a/ai-tools.test.ts` |

`graft skeleton packages/geospatial/src/ai-tools.ts` confirmed the GEO-10 surface, including the schema freezer, capability constructor, view/search guards, result ledger, share-state builder, voice gate and correction proposal builder.

The helper functions have no product-runtime caller yet at this grain. GEO-10 establishes the typed AIF capability contract and qualified boundary behavior; runtime dispatch integration must consume these same definitions rather than reimplement their authority rules.
