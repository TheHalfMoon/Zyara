# GEO-10 provenance

## Sources

GEO-10 is a Zyara-native implementation built from the repository's already-merged contracts.

| Source | Use |
| --- | --- |
| `docs/canonical/ZYARA_GEOSPATIAL_PLATFORM_PLAN_2026-09-22.md` | geo privacy, share-state and AI/voice boundary |
| `docs/research/ZYARA_GEOSPATIAL_IMPLEMENTATION_HANDOFF_2026-09-22.md` §12 | GEO-10 required behaviors and exit condition |
| `@zyara/capability-gateway` AIF-01A/B | capability definitions, grant validation, deny-by-default resolver and exact confirmation |
| existing `@zyara/geospatial` GEO-01A/C | coordinate validation and supersession/correction authority |

## Code provenance

- No third-party source code was copied for GEO-10.
- No new external runtime dependency was added.
- `@zyara/geospatial` and `tests/geo01a` link to the existing workspace package `@zyara/capability-gateway`.
- The pnpm lock records workspace `link:` resolution.
- All qualification data is synthetic.
- No external geocoder, map provider, patient record, credential or production dataset was contacted.

## Schema provenance

The ten GEO-10 schema bodies are authored in `packages/geospatial/src/ai-tools.ts`. Their `schema_<sha256>` values are canonical-content digests of those exact bodies, independently recomputed in `tests/geo01a/ai-tools.test.ts`; they are not copied constants from another project.

## License / SBOM impact

No third-party package is introduced by this slice, so GEO-10 adds no new external license or SBOM entry beyond the existing workspace dependency graph.
