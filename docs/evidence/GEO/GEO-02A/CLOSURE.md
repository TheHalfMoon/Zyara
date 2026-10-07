# GEO-02A Closure — MapLibre Renderer Qualification

| Item | Value |
| --- | --- |
| PR | TheHalfMoon/Zyara#135 |
| Implementation head | `dcfed09d57d8d3b96338b5f3ec20f664d70d0975` |
| Exact qualified PR head | `ccc75ddb5235578102d36d6e56ed412caa4e87c8` |
| Merge | `feb820ab134fae45f78e7b63607b3f8e0a04cbf1` (normal merge, exact head pinned), 2026-10-08 |
| Exact-head CI | `m012-ci` run 37702914586, `geo01a-ci` run 37702914525, `m001-ci` run 37702914601: all **success** at `ccc75ddb` |
| Post-merge `main` CI | `m012-ci` run 37703362980, `m001-ci` run 37703363311: both **success** at `feb820ab` |
| Real Chrome proof | Final PR-head `m012-ci` job 113070371861: 18/18 tests, `/usr/bin/google-chrome`, `status=ready`, `listPresent=true`, `exitCode=0` |
| Review | Jev seven `no` answers, max `p=0.38`; OCR delegate rules applied with no OCR model verdict; pstack three-cycle degraded/inline documented; Graft graph check OK |
| Review threads | None on PR #135 before exact-head merge |

`GEO_02A_MAPLIBRE_QUALIFIED = TRUE`

## Canonical deliverables

- `maplibre-gl@6.12.0` is pinned with a frozen lockfile and BSD-3-Clause/embedded license notices.
- The web renderer uses a same-origin module worker and shared module, inline empty style and no remote provider origins.
- The existing Arabic/English `/[locale]/map` route retains its independent accessible care list.
- WebGL/initialization/runtime errors degrade to list, including a bounded 12-second load deadline; listeners and map are cleaned on unmount.
- An interactive, keyboard-focusable MapLibre canvas is not hidden from assistive technologies.
- Raw/gzip artifact budgets are measured and tested.

## What this closure does not claim

- No basemap/tile provider, OSM data rights, geocoder or router is admitted.
- No production patient/clinic coordinates or precise user-location egress.
- The Chrome smoke validates empty-style initialization and teardown, not a deployed patient-page visual audit, live map/list synchronization, full accessible-device matrix or low-tier mobile qualification.
- pstack's fresh-context judge was unavailable; its permitted degraded/inline path is recorded, never presented as independent external-judge proof.

## Next GEO frontier

GEO-02B is the provider-neutral basemap contract and a separately reviewed OpenFreeMap candidate. PR #136 is currently preflight-only; it must not be interpreted as authorization to send production tile traffic. The subsequent GEO-03 leaf qualifies synchronized map/list discovery and accessibility.
