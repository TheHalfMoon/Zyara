# GEO-03A Graft Wiring Evidence

Graft v0.21.1 at implementation head `05a48b5f9f7c0d6c5e6c7e143b83e392bcfcc5b7`, with `DO_NOT_TRACK=1` and telemetry disabled.

- `graft build`: **2,070 nodes, 4,122 edges, 291 cards** across 291 files.
- `graft check`: **OK** (wiring graph matches source).
- `graft callers buildSharedDiscoveryProjection`: the synthetic `discovery-map.test.ts` suite, with no production client caller yet.
- `graft callers searchDiscoveryArea`: synthetic test caller. Client/UI state wiring belongs to GEO-03B.
- Meaning/deep layer not built (tier 0%); no semantic-completeness claim.

No hosted graph or telemetry egress.
