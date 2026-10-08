# GEO-02B Contract Qualification Result

PR: TheHalfMoon/Zyara#138. Implementation head: `3f519bdefcd30f9098c39018ff343a0e96153348`.

`GEO_02B_CONTRACT_QUALIFIED = TRUE`

The marker qualifies **the no-I/O basemap policy contract only**. It does **not** set `GEO_02B_BASEMAP_QUALIFIED`; no provider, remote style, tile stream or production network has been admitted.

## Delivered

- Provider-neutral typed descriptor with exact style version/digest metadata, tile version, per-kind HTTPS origins, mandatory attribution/license references, terms/privacy and retention governance.
- Disabled-by-default, development/production gate, unknown/degraded/unavailable health, provider-specific kill switch and per-view request ceilings.
- Malformed/non-HTTPS, wildcard, lookalike, private/local, relative, userinfo, query and fragment URL refusal.
- Redirect-hop validation policy; any future network adapter must disable automatic redirects to enforce it.
- Frozen defensive snapshot prevents post-validation changes from escalating admission or remote origins.
- Read-only recursive style asset inspection separate from metered actual requests.
- Synthetic tests only; no fetched provider, real user coordinates or patient data.

## Verification at implementation head

| Gate | Evidence | Result |
| --- | --- | --- |
| Local frozen workspace install | pnpm 9.12.0; local Node 24 rather than required Node 22 | Installation succeeded; local tests supplementary |
| Geospatial typecheck + lint | Local targeted commands | PASS |
| Synthetic tests + test lint | `@zyara/geo01a-tests` | **78/78 PASS**, lint PASS |
| `geo01a-ci` | Run 37706190060 | **SUCCESS** (Node 22.12.0, includes PostGIS proof) |
| `m001-ci` | Run 37706189989 | **SUCCESS** |
| `m012-ci` | Run 37706190001 | **SUCCESS** |
| Jev final design challenge | Full handoff + source/tests, seven `no` decisions, max `p=0.29` | PASS |
| Alibaba OCR | Delegate file selection/rules applied manually, no model verdict | No must-fix remaining |
| Graft | 2,043 nodes, 4,075 edges, `graft check OK` | PASS (wiring tier only) |
| pstack | Three bounded inline/degraded review cycles | Explicitly not a fresh-context external judge |

## Explicit outstanding gates

1. GEO-02B provider admission: verify actual remote style bytes against declared SHA-256 and recursively check style/tile/glyph/sprite sources and redirects, track attribution and layered OSM/OpenMapTiles rights, establish service/retention/incident handling and regional privacy review.
2. Integrate only a separately qualified provider adapter with GEO-02A; no production OpenFreeMap admission follows from this contract.
3. Visual/performance/accessibility browser proof and map/list parity belong to GEO-03 and later hardening.

Canonical closure and activation require a normal exact-head PR merge and post-merge main CI; do not treat this pre-merge result as a canonical closeout.
