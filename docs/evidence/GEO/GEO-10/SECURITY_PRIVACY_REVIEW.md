# GEO-10 security and privacy review

Candidate reviewed: `f45df95eecc3248b96c52b32567de2dc9c31342c`.

## Authority

- Every capability is an AIF-01 definition.
- `geo.location.correct` is `A5_HUMAN_ONLY`.
- Agents and workflows are denied by AIF-01B before grant resolution.
- A human without the exact active grant is denied.
- A granted admin requires AAL2 and exact confirmation before ALLOW.
- GEO-10 contains no second/local authorization helper.
- The geocoder path creates a draft proposal only; GEO-01C remains the authority for a coordinate supersession and correction record.

## Model and voice input

- Model-proposed coordinates are accepted only by `geo.map.set_view` as `UNTRUSTED_VIEW_HINT`.
- View parsing rejects undeclared properties.
- Search accepts a current result-entity reference or a consented device-location reference, never model coordinates.
- Write-capability schemas carry opaque references only.
- The recursive write guard rejects coordinate-shaped fields at any depth.
- Voice can invoke only set-view and public nearby search; the allowlist is runtime-immutable.

## Schema integrity

- Each capability input/output has an explicit JSON-compatible schema body.
- Every schema reference carries the canonical SHA-256 digest of that body.
- Qualification recomputes all ten digests.
- Schema bodies are deep-frozen at runtime, matching immutable capability versions.

## Result references

- Result sets bind tenant, session, returned entity ids and expiry.
- TTL is positive and no more than 15 minutes.
- Only the current same-tenant/same-session set resolves.
- Unknown, expired, superseded and never-returned ids fail closed.
- The public result-set id contains no tenant or session identifier and conforms to the declared opaque-id schema.

## Public share state

The builder reconstructs output from a narrow allowlist:

- center rounded to 0.01 degree;
- zoom capped at 14;
- only the fixed public layer list;
- only branch ids present in the supplied public-directory set.

Search text, specialty/care intent, patient/account/session refs, device origin and tenant-internal branches are never copied to the returned share state.

## Sensitive material

- No credential input or logging.
- No PHI or patient record is present in code/tests.
- Tests use synthetic ids and coordinates only.
- No external provider request occurs in this slice.

## Residual trust boundaries

1. **Public branch allowlist source.** `buildPublicShareState` intentionally accepts an already-authoritative `publicBranchIds` set. A production caller must derive this set server-side from the public directory; request/model input must never construct it.
2. **In-memory result-ledger lifecycle.** Expiry is enforced on resolution, but this leaf does not implement background memory purging. The production runtime should prune expired/superseded entries as part of its session lifecycle.
3. **Runtime integration.** GEO-10 qualifies the capability contract and boundary helpers; the eventual dispatcher must reuse AIF-01B resolution and the admitted schema references rather than recreating authority checks.

No residual item grants additional authority or permits a fact change in the current slice.
