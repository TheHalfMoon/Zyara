# AIF-02A Threat Model (delta)

Scope: the egress decision before any model, tool, browser or local invocation. The gate is pure and makes no network call.

| Threat | Mitigation | Proof (tests/aif02a) |
| --- | --- | --- |
| PHI reaches an unqualified provider | per-class policy rules, the provider class ceiling, `allowedProviders`, approved purposes and the retention cap; unmapped classes are denied | "denies PHI to an unapproved provider", "provider, policy and retention" |
| Silent cloud fallback | local-only classes never leave the local zones; a fallback is flagged and denied with its own reason; the gate never picks a destination | "never falls back silently to the cloud", "refuses a local-only class…" |
| A credential leaves in a payload | a `CREDENTIAL` class is refused whatever the policy says; credential shapes are refused in any string value, including JWTs longer than a scan window | "refuses a credential field…", "…long JWT" |
| A caller mislabels PHI as PUBLIC | classes come only from a server-held schema; unlisted paths are denied; identifier-shaped values in PUBLIC/INTERNAL fields are denied | "takes classes only from the schema…", "refuses an identifier-shaped value…" |
| Sensitive data hides in nested values | scalar values only; at most 256 fields and 8 192 characters per string; duplicate paths are denied | same |
| A getter or Proxy swaps a field or purpose between checks | the request is read once into plain data, and optional fields are normalized | "reads the request once…", "denies a non-object request…" |
| Consent bypass | purpose is mandatory; only the subject's own grants count; instants are parsed and malformed grants refused; consent is checked at server time | "counts only the data subject's own consent", "compares consent instants…", "denies revoked or missing consent…" |
| Values leak through receipts or logs | receipts hold paths, classes, transforms and keyed HMAC digests; request echoes are opaque and never identifier-shaped; the tenant key is never in a receipt | "never logs source values…", "keeps the tenant key and raw values out…", "never echoes an identifier-shaped…" |
| Low-entropy values recovered from digests | digests and pseudonyms are HMACs under the tenant key, bound to the field path | "binds a pseudonym to its field path", "…digests are keyed" |
| Unknown transform sends raw data | an unknown minimization denies | "denies an unknown transform…" |
| A failing dependency allows egress | every port, the clock and the key are fail-closed (DENY) | "denies on any unavailable dependency…" |

Residuals:

- The schema can be mis-declared. Jev's weakest area stays `classification`; the identifier heuristic is defense in depth only.
- The gate has no log sink. Trace and log redaction for the runtime belongs to AIF-02B/AIF-04, and the receipt shape is what they must persist.
- Nothing yet forces every invocation to call the gate. AIF-04 must require an egress receipt digest per invocation.
