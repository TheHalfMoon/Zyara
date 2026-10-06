# GEO-10 pstack review evidence

## Scope

- Base: `46e354422e6c881ce1b0b589db53303d41f19198` (main after GEO-09 closure).
- Implementation candidate reviewed: `f45df95eecc3248b96c52b32567de2dc9c31342c`.
- PR: #133, GEO-10 AI and voice geo capabilities.
- Bars: correctness, parsimony, product/requirements, security/privacy.

A fresh-context judge was requested first. The available Claude Code provider returned a session-limit error, so the review followed the `ps-review` degraded path and ran the bars inline. No fresh-judge verdict is claimed.

## Cycle 1 — original GEO-10 candidate

Candidate: `4458b2558f63d5260a5b3e18a259867e3792239e`.

### Must-fix

1. **Placeholder schema binding.** Every capability used the same `schema_000...000` input/output digest. AIF-01 requires an exact schema reference, not only a digest-shaped string.
   - **Fixed in `365ef2d`:** ten explicit JSON-compatible schemas (five input, five output) now carry their canonical SHA-256 digests, and qualification recomputes every digest.
2. **Parallel authorization shortcut.** `assertCoordinateWriteAuthorized` accepted any `human_role` for `geo.location.correct`; it did not prove an AIF grant, M002 authorization, AAL2 or exact confirmation.
   - **Fixed in `365ef2d`:** the helper was removed. The GEO-10 test now exercises the real AIF-01B resolver: workflow -> DENY, ungranted human -> DENY, granted admin -> ASK exact confirmation, matching confirmation -> ALLOW.

### Product / parsimony

The five-capability shape remained within the frozen GEO-10 scope; no second authority system or production route was added.

## Cycle 2 — boundary hardening

Candidate: `365ef2d842c2f49fa285530f95400f300d833e1e`.

### Must-fix

1. **Result-set identifier leaked session context and could violate its declared schema.** `rs-${sessionRef}-${counter}` exposed the session reference and could exceed the 128-character opaque-id schema when the session ref was at its own maximum.
   - **Fixed in `f45df95`:** ids are data-free `rs_<counter>` tokens; tenant/session ownership remains server-side in the ledger, and tests prove the id does not contain the session ref and matches the declared schema.

### Worth considering — taken

- Security allowlists were exported as mutable `Set` instances despite readonly TypeScript types.
  - **Fixed:** public-share layers and voice capabilities are frozen arrays.
- Schema bodies were only compile-time readonly / shallowly frozen.
  - **Fixed:** the full schema graph is deep-frozen at runtime.
- `parseModelViewport` ignored unknown properties while its input schema says `additionalProperties: false`.
  - **Fixed:** unknown fields are rejected; coordinate-shaped extras receive the coordinate-untrusted denial.

## Cycle 3 — final review

Candidate: `f45df95eecc3248b96c52b32567de2dc9c31342c`.

- **Correctness:** no must-fix found after schema/digest, resolver and result-id repairs.
- **Parsimony:** one geo module and the existing GEO-01A test target remain the implementation surface; no duplicate resolver or schema library was introduced.
- **Product:** all six GEO-10 handoff behaviors are explicitly tested.
- **Security/privacy:** no automated principal reaches the coordinate correction; model coordinates remain view-only; stale/foreign result references fail; public share output is reconstructed from a coarse allowlist; voice cannot write.

Residual trust boundaries are recorded in `SECURITY_PRIVACY_REVIEW.md`, especially the requirement that a production caller derive the public branch allowlist from authoritative server-side directory state.

## Independent evidence

- Final paired Jev pass: every question `no`, maximum `p=0.04`.
- Alibaba Open Code Review: delegate mode, final range selected 6 reviewable files; host application of the resolved rule groups found no remaining must-fix.
- Graft: wiring graph in sync; callers of the main GEO-10 helpers are the qualification test at this grain.
- Exact implementation-head CI: `geo01a-ci`, `m012-ci` and `m001-ci` all succeeded on `f45df95`.

`panel: light △ inline/degraded (fresh-context provider unavailable) · correctness ✓ · parsimony ✓ · product ✓ · security ✓ · deltas: 3 cycles (cap)`
