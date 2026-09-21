# N5/C3 Provenance — Approvals + Human Exception Queue

## Donors

| Donor | Evaluated revision | License observed | C3 admission mode |
| --- | --- | --- | --- |
| `block/buzz` | `4ab4f786085a23fe6126529861840eff6048ceee` | Apache-2.0 | **SEMANTIC ADAPTATION / NO DIRECT CODE COPY** |
| `TheHalfMoon/Qdrat` | `e2d288940aab52af881786678b2fc86dfa5c272a` | founder-owned | **REUSE OF AN ALREADY-ADAPTED ZYARA SUBSYSTEM (W3)**, no new copy |

Research records: `docs/research/ZYARA_BUZZ_DONOR_DEEP_DIVE_2026-09-17.md` and the W3
provenance in `docs/evidence/W3/PROVENANCE.md`. Founder reuse permission for the donor
sources is stated in those records.

No donor source file, crate, relay, key, build artefact or configuration is copied,
vendored or linked in this slice, so C3 creates no new NOTICE or SBOM entry. The pinned
revisions are re-asserted here rather than carried on memory; re-verifying the upstream
repositories over the network is outside this slice's synthetic boundary and is not claimed.

## Donor components considered under the C3 decision

| Donor component | Zyara disposition | Reason |
| --- | --- | --- |
| Human + agent membership in one workspace | `ADAPT` (delivered by C1) | C3 uses bounded C1 identities as agent requesters and refuses them as approvers. |
| Workflow approval steps | `ADAPT` concept, rebuilt | Zyara requires action-specific, authority-specific, scoped, expiring, digest-bound approval rather than a workflow step with a boolean outcome. |
| Activity stream | `ADAPT` (delivered by C2) | C3 extends the derived-activity registry forward-only; activity stays a projection. |
| `buzz-audit` hash chain | `DEFER` to C4 | C3 claims no cryptographic immutability; append-only is enforced by privileges, guards and RLS. |
| Relay / Nostr event model as canonical store | `REJECT` | Healthcare authority stays in Zyara's typed Postgres domains. |
| Generic shell / file MCP for care agents | `REJECT` | Unchanged from C1: agents hold no filesystem, shell or network capability. |
| Qdrat tasks / helpdesk | `REUSE` (via W3) | The exception queue deliberately delegates assignment, ownership, due date and escalation to the existing W3 work items instead of creating a second task manager. |
| Qdrat payroll / recruitment / biometrics | `REJECT` (unchanged from W1) | Out of scope for the collaboration plane and for this slice. |

## Ideas retained

- automation must be able to stop safely and hand work to a human rather than guess;
- humans and bounded agents should appear in the same operational context with distinct
  identity;
- an approval is a governed act, not a flag, and it must be attributable and inspectable;
- the collaboration plane explains and governs authoritative state; it never becomes it.

## Ideas changed for Zyara

- an approval binds to the exact tenant, branch, action type, parameter digest, requester,
  required authority, risk class, evidence, creation time and expiry;
- protected parameter **values** are never stored: only a minted digest and the declared key
  names, so the approval cannot leak or smuggle the payload it authorises;
- approval authority is resolved from the trusted registry at decision time and re-resolved
  at execution time, so a role label or a stale snapshot can never authorise execution;
- agents may propose and can never decide, and self-approval is refused for every protected
  class;
- an unknown external outcome stays unknown, moves to `needs_human` and is queued as owned
  work rather than being recorded as success or failure;
- the exception queue is W3-owned work with a closed reason registry, a derived evidence
  requirement and closure rules that refuse an unknown resolution.

## Rejected patterns

- a generic "approve = true" table that authorises whatever the caller sends next;
- storing raw action parameters, evidence documents, message bodies or clinical narrative in
  the approval or exception records;
- inferring approval authority from UI role labels, request bodies or query strings;
- letting a derived activity feed authorise, mutate or fabricate approval state;
- treating an unevidenced external outcome as a settled success or failure;
- a second task manager beside W3.

## Security and privacy boundary

C3 stores governance metadata only: closed codes, opaque bounded references, digests, small
integers and timestamps. It owns no appointment, encounter, prescription, order, result,
claim, payment, eligibility, authorization, staff authority or patient clinical fact, and it
writes into none of them. Its database role privileges are `SELECT, INSERT` plus a column-
level `UPDATE` limited to the lifecycle columns of a request or a case, with BEFORE UPDATE
triggers refusing an illegal transition or a change to a protected column.

## Review-tool state at authoring time

- **Jev (TypeSafe)**: available in this environment and executed for this slice (design
  rounds and scoped exact-diff reviews). See `JEV_REVIEW.md` for the exact windows,
  verdicts and their limits.
- **alibaba/open-code-review**: not installed and not obtainable in this runtime; no OCR run
  is claimed. See `OCR_REVIEW.md`.

Neither tool is treated as a substitute for exact-head CI, the real-PostgreSQL smoke, the
authenticated HTTP smoke, or manual source review; those are recorded separately in
`RESULT.md`.
