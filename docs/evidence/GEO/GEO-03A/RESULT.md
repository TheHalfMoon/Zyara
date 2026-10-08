# GEO-03A Shared Discovery Contract Qualification

PR #139; implementation head `05a48b5f9f7c0d6c5e6c7e143b83e392bcfcc5b7`.

`GEO_03A_SHARED_RESULTS_QUALIFIED = TRUE`

This is a **contract-grain qualification**, not the full `GEO_03_DISCOVERY_MAP_QUALIFIED` exit marker. UI marker wiring, real map/list selection, mobile/accessibility and live service admissions remain separate.

## Delivered

- Pure shared projection based on existing `BranchPin`/`MapListFilter`, stable search-source rank and branch IDs.
- Same authorized public result set drives list and eligible map pins. Hidden/disputed entries are excluded; approximate/unknown coordinates remain listable with explicit disclosure, never accurate pins.
- Explicit `Search this area` state transition; mere panning does not rerank or filter.
- One selected branch ID shared across list/pin model, deterministic synthetic clusters, map failure leaves the accessible list intact.
- Optional local near filter, without any external request or fabricated route ETA.

## Implementation-head tests and review

| Gate | Evidence | Result |
| --- | --- | --- |
| Local TypeScript + synthetic tests | Node 24 local supplemental run | Typecheck PASS, 88/88 PASS |
| `geo01a-ci` | Run 37707742652, job 113086057444 | **SUCCESS**, 88 tests / 88 pass / 0 fail |
| `m012-ci` | Run 37707742594 | **SUCCESS** |
| `m001-ci` | Run 37707742577 | **SUCCESS** |
| Jev | Seven `no`, max `p=0.29` | PASS |
| Alibaba OCR | Delegate rules applied; no model verdict | Reviewed |
| Graft | 2,070 nodes, 4,122 edges; check OK | PASS wiring only |
| pstack | Three inline/degraded review cycles | No independent external judge claimed |

## Not delivered

The `/[locale]/map` React route still needs to consume this projection and wire actual MapLibre markers, selection, clusters and `Search this area` to real user actions. It also needs visible synthetic/demo labels rather than presenting preview ETA/open-now/availability as live facts. Provider admission, deployed/mobile browser and assistive-technology acceptance remain gated.

Canonical closeout requires normal merge after exact-head qualification and post-merge `main` CI.
