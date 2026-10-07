# GEO-02A Security and Privacy Review

Reviewed implementation: `dcfed09d57d8d3b96338b5f3ec20f664d70d0975`.

## Egress and CSP

The inline MapLibre Style Specification v8 is empty: zero sources, layers, glyph providers, sprites or tiles. The renderer and module worker are served from Zyara's own origin, and `transformRequest` rejects remote HTTP(S) origins and unsupported protocols. The route-level CSP restricts `connect-src` and `worker-src` to `'self'`. No external basemap or fallback endpoint is configured.

The build copies the exact installed worker, shared module and license; it does not fetch from a CDN at runtime. The browser smoke server includes a same-origin-only CSP and tests an empty style; this does not constitute admission of any production tile provider.

## Graceful degradation

Initialization errors, GPU/WebGL2 unavailability, map error events and an absent load/error event are fail-closed. The 12-second initialization deadline releases resources and shows an unavailable message. Import failure also degrades. Cleanup is idempotent and removes registered listeners and the map on unmount. The accessible list is rendered outside the client map lifecycle and remains usable.

## Accessibility

The Arabic/English route keeps `lang` and RTL/LTR `dir`. The map is supplementary, and list/cards/actions are independent. Since MapLibre interactive canvases are keyboard-focusable, the host canvas wrapper is explicitly labeled as a group and is **not** `aria-hidden`. No map-only mandatory interaction is introduced.

## Data boundaries

Only a fixed synthetic Riyadh center and an inline empty style are used. No user precise location, patient coordinate, provider truth change, geocoder query, route request or healthcare data leaves Zyara through this leaf. Local browser smoke uses synthetic content.

## Non-claims / future gates

- The full Next.js patient route has not undergone a deployed-browser visual/accessibility audit; this grain qualifies the renderer dependency and deterministic interface boundary.
- Production basemap attribution, network traffic, caching and data rights require GEO-02B.
- The standalone Chrome smoke proves empty-style MapLibre startup/teardown on the CI runner, not full production map/list synchronization (GEO-03).
- Renderer script/worker upgrades require renewed CSP, package, notice, browser and bundle qualification.
