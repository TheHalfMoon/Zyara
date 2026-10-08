# GEO-02B Security and Privacy

## Current effective posture

There is **no production tile/provider integration**. The code exports a typed policy and synthetic-only tests. It does not instantiate MapLibre, perform fetches, share a patient location, write clinic coordinates, persist a user session or forward healthcare context to a map host.

## Fail-closed gates

- Disabled by default; production rejects development-only candidates and unknown/unhealthy providers.
- Immediate kill switch; request count ceiling and explicit timeout/cache governance.
- Source-specific HTTPS DNS allowlists with no wildcard, credentials, query, hash, non-HTTPS, IP or local hostname.
- Redirect validation API for **each** hop; no automatic HTTP redirection is implemented by this contract.
- Relative style URLs blocked until separately inspected/rewritten.
- Defensive copy of style/allowlist/attribution/policy objects prevents caller mutation from expanding admission.
- Explicit attribution and data-license/terms/privacy/retention-review metadata.

## Residual / nonclaims

- A well-shaped `sha256` is only *declared metadata* until a future adapter verifies bytes and recursive sources against it.
- A future MapLibre/provider adapter must call the guards for every tile/style/glyph/sprite request and for redirected URLs; this library alone cannot enforce a browser client's network behavior.
- Exact URL paths could in principle contain arbitrary caller data. Future URL composition must use only trusted style sources and controlled numerical tile coordinates; passing arbitrary patient/session strings is prohibited at the adapter boundary.
- Public tile paths can reveal a viewed map area and may be personally sensitive. A privacy/DPIA, terms, data-transfer and operational review is mandatory before production admission.
- No OpenFreeMap SLA or retention promise is inferred from this synthetic contract.
