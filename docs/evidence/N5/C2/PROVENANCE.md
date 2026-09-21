# N5/C2 Provenance — Derived Activity Layer

## Donor

- Repository: `block/buzz`
- Evaluated revision: `4ab4f786085a23fe6126529861840eff6048ceee`
- License observed: Apache-2.0
- Research record: `docs/research/ZYARA_BUZZ_DONOR_DEEP_DIVE_2026-09-17.md`
- Founder reuse permission: stated in the donor deep dive.
- C2 admission mode: **SEMANTIC ADAPTATION / NO DIRECT CODE COPY**. No Buzz source file,
nounce, relay, key or crate is copied, vendored or linked in this slice. No Buzz build
artefact enters the workspace, so no NOTICE or SBOM entry is created by C2.

The pinned revision is re-asserted here because C2 is the slice the donor study nominates
for activity-stream reuse, and the pin must not travel on memory alone. The revision is
carried from the repository research record; re-verifying the upstream repository over the
network is outside this slice's synthetic boundary and is not claimed.

## Donor components considered under the C2 decision

| Donor component | Zyara disposition | Reason |
| --- | --- | --- |
| Community / tenant isolation tests | `REFERENCE` | Zyara tenancy is stricter and already owned by RLS + `authorize()`. |
| Channels / threads | `REJECT` for C2 | A conversation surface is not an activity projection; C3/C4 may revisit. |
| Human + agent membership | `ADAPT` (already delivered by C1) | C1 supplies the bounded identity this slice references. |
| Signed / event activity stream | `ADAPT` concept only | Zyara derives activity from its own authoritative events; no Nostr event model. |
| `buzz-audit` hash chain | `DEFER` to C4 | Tamper resistance is a C4 qualification, and C2 claims none. |
| Workflow triggers / approval steps | `DEFER` to C3 | C2 does not implement an approval or workflow engine. |
| Search across operational history | `REJECT` for C2 | Search must come later and must index only the derived projection. |
| ACP / MCP agent tooling | `REFERENCE` | No agent tool surface is added by C2. |
| Nostr relay as canonical store | `REJECT` | Healthcare domain state stays in Zyara's typed Postgres domains. |
| Generic shell / file MCP for care agents | `REJECT` | Unchanged from C1: agents hold no filesystem or shell capability. |

## Ideas retained

- an operations feed is genuinely useful when it makes automation legible;
- humans and agents should appear in the same work context with distinct identity;
- provenance should be inspectable: who acted, under which tenant, from which source event;
- the collaboration plane explains authoritative state, it does not become it.

## Ideas changed for Zyara

- activity is **derived only**, never authored directly by a client;
- the actor model is a closed enumeration, not a free-text name;
- sensitivity class and visibility scope are separate columns, so an operations reader is
  not silently granted clinical detail;
- the payload is a flat, key-allowlisted, size-bounded string map, so a feed row cannot
  become a PHI smuggling channel;
- deduplication is keyed by source-event identity and projection version, so at-least-once
  delivery is deterministic;
- correction is a superseding record, never a rewrite of history.

## Rejected donor patterns

- using a collaboration event log as the durable representation of healthcare state;
- a free-text actor name that could impersonate a clinician or an administrator;
- copying raw provider payloads, conversation bodies, notes or model reasoning into a feed;
- broad operational search over unclassified content (deferred, not adopted);
- treating a hash chain as a substitute for access control or retention policy.

## Security / privacy boundary

C2 stores operational metadata only. It is not a clinical surface, it is not a notification
channel, and it is not an authority. Its database role privileges are `SELECT, INSERT`, so
neither the domain layer nor the ordinary application role can rewrite recorded activity.

## Review-tool state at authoring time

- **Jev (TypeSafe)**: available in this environment and executed for this slice; see
  `JEV_REVIEW.md` for the exact questions, verdicts and their limits.
- **alibaba/open-code-review**: not installed in this environment; no OCR run is claimed.
  See `OCR_REVIEW.md`.

Neither tool is treated as a substitute for exact-head CI, the real-PostgreSQL smoke, or
manual source review; those are recorded separately in `RESULT.md`.
