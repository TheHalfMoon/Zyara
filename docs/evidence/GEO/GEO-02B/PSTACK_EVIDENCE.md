# GEO-02B pstack Three-Cycle Review

pstack `ps-review` contract was inspected and its correctness/parsimony/product/security bars applied to the bounded diff. No verified fresh-context judge was available in this session. This is explicitly an **inline/degraded** review, not an external judge verdict.

## Cycle 1 — URL and provenance boundary

- Correctness/security must-fix: URL parser accepted wildcard hostnames such as `https://*.example.org`. Fixed with exact public DNS hostname validation; direct query strings, userinfo, non-HTTPS, fragments and lookalike hosts remain prohibited.
- Product: no provider admitted and no OpenFreeMap I/O implemented.
- Parsimony: use the existing geospatial workspace and geo01a workflow; no new vendor abstraction stack.

## Cycle 2 — policy mutation and hidden URLs

- Correctness/security must-fix: capture a frozen policy snapshot so a caller cannot mutate the descriptor after validation to add remote origins or raise request ceilings. Fixed.
- Correctness/security must-fix: relative `url`/`tiles`/`glyphs`/`sprite` style references cannot silently resolve under a remote base URL. Fixed and tested.
- Product: attribution remains present even when unavailable; unknown health defaults to unavailable.

## Cycle 3 — request accounting

- Correctness must-fix: static inspection of nested style URLs must not be charged as real outbound HTTP attempts. Split `inspectAsset` (read-only) and `guardAsset` (metered), with a regression test.
- Security: explicit redirect validation is available, but any future network client **must** disable automatic redirects and check each hop; this contract itself performs no I/O.
- Parsimony: one typed policy file, exported by existing package, plus synthetic tests. No duplicate renderer or provider implementation.

Final bars: correctness checked by 78/78 local synthetic tests, typecheck and lint; parsimony pass; product pass **for contract-only scope**; security pass for no-I/O pre-admission boundary. Actual style digest verification, vendor terms/retention, network redirect handling and visual map/list behavior remain later gates.

`panel: light △ degraded/inline · correctness ✓ · parsimony ✓ · product ✓ (contract only) · security ✓ (no I/O) · three bounded cycles`
