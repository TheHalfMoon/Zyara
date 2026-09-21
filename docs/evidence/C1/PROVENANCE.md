# C1 Provenance — Buzz Agent-Identity Adaptation

## Donor

- Repository: `block/buzz`
- Evaluated revision: `4ab4f786085a23fe6126529861840eff6048ceee`
- Public license observed in Zyara research: Apache-2.0
- Founder reuse permission: explicitly stated.
- C1 admission mode: **SEMANTIC ADAPTATION / NO DIRECT CODE COPY**.

## Exact source material inspected

- `docs/agent-profile-identity.md`
- `docs/forum-agent-invitation.md`
- `docs/practical-information-flow-for-buzz-agents.md`
- `SECURITY.md`
- Zyara's pinned `docs/research/ZYARA_BUZZ_DONOR_DEEP_DIVE_2026-09-17.md`

## Ideas retained

- an explicit agent identity must remain exact and must not silently alias another
  persona/identity;
- ownership/creation provenance is not equivalent to standing execution authority;
- agents and humans are distinct principals;
- authority must be scoped rather than inherited from a human owner;
- a successful membership/invitation step alone is not authorization for a later
  side effect;
- agents should be keyless with respect to broad platform signing/secrets where
  a broker/authority layer can mediate actions;
- private/stronger context must not silently flow into broader destinations;
- human approval is required for declassification/sensitive release.

## Zyara-specific changes

Buzz uses channel membership and Nostr signing concepts appropriate to its
collaboration product. Zyara C1 instead uses:

- typed Zyara agent IDs;
- tenant + branch scope;
- a closed healthcare-safe administrative capability vocabulary;
- explicit lifecycle state;
- explicit grants with effective windows;
- mandatory human approval for mutation;
- no generic shell/file/browser capabilities;
- no clinical/financial authority;
- no Nostr event/key as Zyara source of truth.

The identity creator is recorded for provenance only. It does not donate the
creator's permissions to the agent.

## Deferred to later N5 slices

- C2: derived operational activity stream;
- C3: durable approval receipts, exception/handoff queue and resumable control;
- C4: audit-chain/tamper-evidence qualification and export.

## Review-tool note

The current ChatGPT tool surface does not expose the local Jev/TypeSafe CLI or
Alibaba Open Code Review CLI. No Jev/OCR execution is claimed. The exact-head CI,
database/HTTP smokes and internal semantic review are separate evidence.
