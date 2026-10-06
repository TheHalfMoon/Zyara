# GEO-01B Closure — Entrances + Service-Area Geometry

| Item | Value |
| --- | --- |
| PR | TheHalfMoon/Zyara#127 |
| Qualified head | `3d8182cab9c37de5a7922be08b8a3cfd243f81e9` |
| Merge | `c20f90c407eb4af34ed37ef2f276e9a2f0d6fb72` (normal merge, `--match-head-commit`), 2026-10-06T21:06:23Z |
| Exact-head CI | All checks pass. `geo-assertion-contract` ran the real PostGIS smoke on `postgis/postgis:16-3.4` (PostGIS 3.4.3) and printed both the GEO-01A and the GEO-01B PASS lines. Also: `foundation` ×2, `agent-identities`, `approvals-exceptions`, `audit-chain`, `derived-activity`, `coverage`, `helpdesk`, `m002`, `m008`, `m012`, `whatsapp` and `workforce`. CodeRabbit (review skipped) and cubic (skipped) are not used as evidence. No review threads. |
| Post-merge `main` CI | `m001-ci`, `m002-ci`, `m008-ci` and `m012-ci` succeeded on `c20f90c4` |
| Migration | `048_geo_access_geometry.sql` canonical on `main`, following 047 |
| Evidence | `WORK_PACKET`, `PROVENANCE`, `SECURITY_PRIVACY_REVIEW`, `RESULT` (with Jev, OCR delegate, pstack and Graft) and `jev/design.spec.json` |

`GEO_01B_ACCESS_GEOMETRY_QUALIFIED = TRUE`

## Not claimed

- No real entrance, accessibility or service-area data, and no provider or site validation.
- No availability semantics: a service area never implies that a slot exists.
- No public directory projection or access UI (GEO-03, GEO-06).
- Alibaba Open Code Review ran in delegate mode only, with no OCR-model verdict.
