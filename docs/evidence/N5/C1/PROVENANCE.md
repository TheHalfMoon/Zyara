# N5/C1 Provenance — Agent Identity Donors and Rejections

## Donors evaluated

### `block/buzz` (Apache-2.0) — concept reference

- Concept donors: channels, threads, human/agent membership, activity streams,
  approvals, audit. Revision already recorded by the network plan's Buzz deep
  dive (`docs/research/ZYARA_BUZZ_DONOR_DEEP_DIVE_2026-09-17.md`).
- Admission mode for this slice: **REFERENCE / CONCEPT ONLY — NO CODE COPIED.**
- Retained ideas: an agent is a first-class *member* with an explicit identity;
  membership and authority are separate concerns; activity is derived from
  events rather than authored.
- Changed for Zyara: membership is tenant-scoped and branch-scoped; authority is
  a closed capability set with expiry; a live human sponsor is mandatory;
  revocation is recorded; clinical and financial namespaces are structurally
  absent rather than merely discouraged.
- Rejected donor patterns: Nostr as canonical state, relay/transport coupling,
  agent-authored authoritative events, generic shell/file/MCP tooling for care
  agents, and any identity that is not scoped to a tenant.

### `TheHalfMoon/Qdrat` — adjacent reference

- Revision already pinned for W3/W4: `e2d288940aab52af881786678b2fc86dfa5c272a`.
- Admission mode: **REFERENCE ONLY.** W3 already adapted Qdrat's org-workforce,
  shift/leave and helpdesk ideas; N5/C1 adds nothing new from Qdrat and copies
  no Qdrat source.

## Source reuse declaration

- Files copied from any external repository: **none**.
- No license header, NOTICE or attribution obligation is introduced by this slice.
- No new third-party dependency is introduced: `packages/collaboration` depends
  only on the workspace package `@zyara/domain`, matching existing packages.

## Security and privacy boundary

N5/C1 is an identity-and-authority boundary, not a care surface. It grants no
clinical, scheduling, insurance, financial or infrastructure authority, stores no
credential value, and records only metadata: identity, scope, capability,
sponsor, actor, reason and timestamp. No patient-identifying or clinical content
is stored or emitted by this slice.

## Review-tool availability in this environment

This execution environment does **not** expose the Jev/TypeSafe CLI (no
credential for `api.typesafe.ai` and no usable Python interpreter) and does
**not** have `alibaba/open-code-review` installed. No Jev or OCR execution is
claimed in this packet. See `JEV_REVIEW.md` and `OCR_REVIEW.md` for exactly what
was and was not run. Source review, synthetic tests and the live PostgreSQL smoke
must stay distinct from those external reviewer signals.
