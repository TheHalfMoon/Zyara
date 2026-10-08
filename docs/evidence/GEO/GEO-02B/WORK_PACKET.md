# GEO-02B — Provider-Neutral Basemap Contract Work Packet

Implementation grain: **contract only**. Provider admission and live network are not part of this PR.

## Objective

Supply a fail-closed typed admission boundary between the already-qualified GEO-02A MapLibre renderer and a future basemap provider, without trusting any source as a healthcare location authority. Follow the canonical `GEO-02B` handoff and the OpenFreeMap preflight candidate in PR #136.

## In scope

- Descriptor with provider/asset-specific HTTPS origins, exact style version and SHA-256 digest declaration, tile version, attribution/data-license refs, terms/privacy/retention-review references, timeout/request/cache ceilings.
- Explicit admission, production vs development gate, unknown/unavailable health, per-provider kill switch.
- Request-time allowlist and redirect rechecking, no automatic provider fallback, no use of PHI/precise location as an input.
- Reject malformed/scheme/userinfo/query/fragment/wildcard/private-host/relative asset URLs.
- Inspect nested source/tile/glyph/sprite/style assets without consuming the HTTP request budget.
- Snapshot admission inputs to prevent mutation after validation.
- Deterministic synthetic tests executed by `geo01a-ci` (existing workflow), no new dependency or workflow.

## Out of scope

No live OpenFreeMap activation, fetched remote style, tile request, self-hosted tiles, data license/legal approval, geocoder, router or production location integration. A SHA-256 metadata declaration alone does **not** verify fetched style bytes; actual bytes and recursive provenance must be qualified by a later adapter.

## Acceptance / gate

All input-edge tests, `@zyara/geospatial` typecheck/lint, `@zyara/geo01a-tests` tests/lint and existing exact-head CI must pass. Jev, OCR delegate, Graft and pstack evidence required. This grain's marker is `GEO_02B_CONTRACT_QUALIFIED`; the full `GEO_02B_BASEMAP_QUALIFIED` marker remains false/pending provider admission.

## Privacy rule

No synthetic request includes a patient, appointment, session or precise user-location value. The public map viewport of a future tile request is still a privacy-relevant area disclosure and needs separately admitted terms/egress controls.
