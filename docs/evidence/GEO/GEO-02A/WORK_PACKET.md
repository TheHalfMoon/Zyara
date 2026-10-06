# GEO-02A Work Packet — MapLibre Renderer Qualification

Base: `main` after GEO-10 closure.
Branch: `feat/zyara-network-geo02a-maplibre`.
Authority: geospatial plan §7, §25–§29, §34; geospatial implementation handoff §4; source-adoption MapLibre qualification.
Exit marker: `GEO_02A_MAPLIBRE_QUALIFIED = TRUE`.

## Objective

Qualify MapLibre GL JS as Zyara's **web renderer only**. This grain does not admit a basemap, tile provider, geocoder, router, imagery source, healthcare-data source or self-hosted map infrastructure.

The renderer must fail closed to the existing accessible list when the browser cannot initialize WebGL2 or when renderer initialization fails.

## Upstream dependency decision

- Package: `maplibre-gl`.
- Exact released version candidate: `6.11.2`.
- License: BSD-3-Clause with embedded third-party notices in the distributed license file.
- Adoption mode: **DEPENDENCY**, not copied/forked renderer source.
- Package is pinned exactly, never `latest` or a floating range.
- The pnpm lockfile is the dependency inventory for this grain; the package license/notice is inspected from the exact installed package.
- Tile, style, geocoder, router and data rights remain separately gated.

## Renderer architecture

### Client boundary

The existing `/[locale]/map` page remains the product route and keeps the complete non-canvas list.

A dedicated client renderer component owns the MapLibre lifecycle:

1. self-host the MapLibre worker and shared module from the exact installed package under `/maplibre/`;
2. set the worker URL to the same-origin worker;
3. initialize the map with an inline empty Style Specification v8 object;
4. make **no remote renderer request** in GEO-02A;
5. on WebGL/GPU initialization failure, expose an explicit unavailable state and leave the accessible list fully usable;
6. on unmount, call `map.remove()`.

No provider URL is admitted in this grain.

### Network/CSP boundary

The GEO-02A renderer allowlist contains no remote origins.

- worker: same-origin only;
- style: inline empty v8 style;
- tiles/sprites/glyphs: none;
- transform/request guard: reject absolute HTTP(S) URLs outside same origin;
- no CDN worker, no blob worker, no OpenFreeMap request.

GEO-02B may widen this only through its own provider admission and attribution/privacy evidence.

### Accessibility/localization

- Map is never the only interface.
- The existing `aria-label="branch-list"` remains available regardless of renderer state.
- The renderer shell inherits page `lang` and `dir`.
- Arabic/RTL does not depend on an external RTL plugin; v6 built-in shaping is used.
- No keyboard-trapping popup or required map-only action is introduced.
- Map controls are supplementary; list/cards/actions remain primary fallback.

## Qualification tests

1. **Map initializes.**
   - Inject a deterministic fake MapLibre runtime into the renderer adapter.
   - Assert constructor receives the target container, inline empty v8 style, center/zoom and keyboard-enabled options.
2. **No-map fallback.**
   - Constructor/init error -> explicit unavailable state; no exception escapes the boundary.
3. **WebGL unavailable fallback.**
   - `GPUInitializationError` -> explicit renderer-unavailable state; list remains present.
4. **RTL UI shell.**
   - Arabic page keeps `dir="rtl"`; renderer does not load an external RTL plugin.
5. **Keyboard/list remains usable.**
   - Existing branch list remains in the route independent of renderer lifecycle.
6. **CSP/network origin allowlist.**
   - Same-origin worker; zero remote origins; remote HTTP(S) renderer requests fail closed.
7. **Bundle budget.**
   - Measure exact installed MapLibre JS/CSS/worker/shared artifacts.
   - Record the baseline and enforce an explicit ceiling derived from the qualified release rather than guessing before measurement.
8. **Cleanup/unmount.**
   - Adapter cleanup calls `map.remove()` exactly once.
9. **License/SBOM.**
   - Exact package/version/license/notice and lockfile inventory are recorded.
10. **Frozen lockfile + web typecheck.**
    - Existing `m012-ci` must pass without editing a workflow.

## Evidence

`docs/evidence/GEO/GEO-02A/` will contain:

- `WORK_PACKET.md`
- `PROVENANCE.md`
- `SECURITY_PRIVACY_REVIEW.md`
- `RESULT.md`
- `PSTACK_EVIDENCE.md`
- `JEV_REVIEW.md`
- `OCR_REVIEW.md`
- `GRAFT_CONTEXT.md`
- `jev/design.spec.json`

## Non-goals

- OpenFreeMap or any basemap admission (GEO-02B).
- Production tile/provider traffic.
- Geocoding or routing.
- Mobile/native renderer admission.
- 3D.
- Precise patient location.
- Provider truth mutation.
- New GitHub Actions workflow.
