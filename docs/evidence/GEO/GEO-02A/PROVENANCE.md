# GEO-02A Provenance

Implementation candidate: `dcfed09d57d8d3b96338b5f3ec20f664d70d0975`.

## Dependency and license

- Package: `maplibre-gl@6.12.0` (exact released npm version, no floating range).
- npm integrity: `sha512-DwgganVi2BhNxOpD7ob3lJC0dQQz4HfJfuQQV3XxCY3XdOzFrMqp9ylMXhRzryRsOnIezdZcklWXIIs/Q8JPjA==`.
- Primary package license: BSD-3-Clause.
- The distributed `LICENSE.txt` contains MapLibre contributors and embedded Mapbox GL JS <=1.13, glfx.js and d3-color notices.
- Those notices are copied from the exact installed package into the self-hosted static artifact directory; they are not paraphrased or removed.
- The root pnpm lockfile records the exact dependency tree; frozen-lockfile installation is qualified in CI.

## Adoption decision

MapLibre is used as a pinned dependency. No renderer source is copied, rebranded or forked. The license/notice obligations are preserved, and component code is Zyara-native.

The shipped runtime artifacts are the exact release's ESM entry, CSS, module worker and shared module, with the latter two copied into a same-origin static path by `apps/web/scripts/copy-maplibre-worker.mjs`.

## Measured package artifacts

The package was inspected and measured independently before installation:

| Artifact | Raw bytes | Gzip bytes |
| --- | ---: | ---: |
| `maplibre-gl.mjs` | 597,295 | 152,191 |
| `maplibre-gl.css` | 83,305 | 10,614 |
| `maplibre-gl-worker.mjs` | 19,130 | 6,117 |
| `maplibre-gl-shared.mjs` | 516,951 | 147,640 |

Combined raw bytes: 1,216,681. Combined gzip: 316,562. Qualification enforces raw <= 1,300,000 and gzip <= 340,000. These are artifact footprints, not a claim about the final Next.js route's transfer size.

## Excluded sources

No OpenFreeMap, OSM, geocoder, router, satellite image, live clinic data, patient location, Mapbox proprietary release or 3D asset was imported. GEO-02B handles basemap/vendor/data rights independently.
