# GEO-10 qualification result

`GEO_10_AI_GEO_QUALIFIED = TRUE`

Implementation candidate: `f45df95eecc3248b96c52b32567de2dc9c31342c`.
Base: `46e354422e6c881ce1b0b589db53303d41f19198`.

## Delivered

- Five typed AIF-01 geo capabilities:
  - `geo.directory.search_nearby`;
  - `geo.map.set_view`;
  - `geo.scene.share`;
  - `geo.location.propose_correction`;
  - `geo.location.correct` (A5/HUMAN_ONLY).
- Ten exact JSON-compatible schema bodies with canonical SHA-256 references.
- Model-coordinate trust boundary and opaque search origins.
- Same-tenant/same-session current-result ledger with bounded TTL and data-free result-set ids.
- Coarse public share-state reconstruction.
- Voice read/view-only gate.
- Geocoder-to-draft correction proposal; coordinate mutation remains behind the existing AIF resolver and GEO-01C authority.

## Required handoff proof

| Requirement | Proof |
| --- | --- |
| unauthorized capability denied | real AIF-01B resolver with missing/wrong grants |
| model coordinates untrusted | view hint only; search/write coordinate rejection |
| stale result ids rejected | unknown, foreign, expired, superseded and never-returned cases |
| public share state strips private fields | allowlist reconstruction and forbidden-string checks |
| voice changes view only | only set-view/search accepted from VOICE |
| geocoder cannot update coordinate without admin command | workflow DENY; ungranted human DENY; granted admin ASK; exact-confirmed admin ALLOW; GEO-01C low-authority supersession still denied |

## Exact implementation-head CI

All required workflows completed successfully on `f45df95eecc3248b96c52b32567de2dc9c31342c`:

- `geo01a-ci` — run `37547600192` — **success**;
- `m012-ci` — run `37547600198` — **success**;
- `m001-ci` — run `37547600225` — **success**.

The GEO workflow includes the package typecheck/lint/test path, frozen-lockfile installation and the existing PostGIS smoke coverage.

## Reviews

- Jev: `JEV_REVIEW.md`; final paired source+tests pass has all answers `no`, max `p=0.04`.
- Alibaba Open Code Review: `OCR_REVIEW.md`; delegate-mode rules applied, no remaining must-fix.
- pstack: `PSTACK_EVIDENCE.md`; three cycles, all must-fix items closed. Fresh-context provider was unavailable, so the permitted degraded inline path is explicitly recorded.
- Graft: `GRAFT_CONTEXT.md`; wiring graph in sync.

## Residual risks

See `SECURITY_PRIVACY_REVIEW.md`. The material successor requirement is that the eventual production dispatcher and share-state caller preserve these server-derived authority/public-directory boundaries; this slice intentionally does not invent a parallel runtime.
