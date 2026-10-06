# GEO-01C Closure — External Spatial Identity + Conflation

| Item | Value |
| --- | --- |
| PR | TheHalfMoon/Zyara#128 |
| Qualified head | `1b7091ce3e79138328e89e92782ff8ca43a3b3b2` |
| Merge | `808ac11aca95a370b1ef9f27ac259ada342b4861` (normal merge, `--match-head-commit`), 2026-10-06T21:44:56Z. The merge tree is identical to the qualified head (empty `git diff`). |
| Exact-head CI | All checks pass. `geo-assertion-contract` (run 37535821249): 45/45 tests, and on PostGIS 3.4.3 the PostGIS smoke printed the GEO-01A, GEO-01B and GEO-01C PASS lines. Also: `foundation` ×2, `agent-identities`, `approvals-exceptions`, `audit-chain`, `derived-activity`, `coverage`, `helpdesk`, `m002`, `m008`, `m012`, `whatsapp` and `workforce`. CodeRabbit and cubic are not used as evidence. No review threads. |
| Post-merge `main` CI | `m001-ci`, `m002-ci`, `m008-ci` and `m012-ci` succeeded on `808ac11a` |
| Migration | `049_geo_conflation.sql` canonical on `main`, following 048. It adds two triggers on `geo_location_assertions`; 047 is unchanged. |
| Evidence | `WORK_PACKET`, `PROVENANCE`, `SECURITY_PRIVACY_REVIEW`, `RESULT`, `PSTACK_EVIDENCE` and `jev/design.spec.json` |

`GEO_01C_CONFLATION_QUALIFIED = TRUE`

## Not claimed

- No external data import. No OSM or other POI data is ingested, and no geocoder is admitted or linked.
- No conflation service, review queue or admin command. The contract and database rules exist; their consumers do not yet.
- No verified reviewer or actor identity. `reviewer_ref` and `actor_ref` are recorded second-identity references, not approval-bound.
- No database check of provider-declared ids. That check is application-enforced.
- Alibaba Open Code Review ran in delegate mode only, with no OCR-model verdict.

## Forward requirements carried

1. **GEO coordinate-correction admin command.**
   - `reviewer_ref` must bind to an approved `approval_requests` row (a new approvals action type, requester ≠ approver).
   - `actor_ref` must be derived from the authenticated principal.
2. **Provider Graph declared external ids.** Once stored, the link guard must verify `SYSTEM` deterministic links against them.
3. **GEO-03 search projection.**
   - Never collapse a cross-tenant external-id collision.
   - Collapse only after canonical identity resolution (plan §13A).
4. **Isolation.** Writers of links and corrections must run at READ COMMITTED. The guards refuse any other level with SQLSTATE 25000.
