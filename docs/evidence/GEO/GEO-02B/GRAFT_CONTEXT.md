# GEO-02B Graft Context

Graft v0.21.1 on implementation head `3f519bdefcd30f9098c39018ff343a0e96153348`; `DO_NOT_TRACK=1` and telemetry disabled.

- `graft build`: **2,043 nodes, 4,075 edges, 289 cards** across 289 files, with 2 parsed and 287 replayed from cache on final pass.
- `graft check`: **OK**, wiring graph in sync with code at the reviewed implementation head.
- `graft callers createBasemapController`: `basemap.test.ts`; there is intentionally no production network caller.
- `graft callers inspectBasemapStyleReferences`: `basemap.test.ts`.
- The deep/meaning layer was **not built**; its 0% completion is not a claim of semantic proof.

Only local cached graph computation was performed. No hosted graph/trail was used.
