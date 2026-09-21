# N5 Closure — Zyara Network Collaboration Plane (C1–C4)

Date: 2026-09-21. Canonical `main` at closure: `be032440a67634f588a8f7bc5ea7f857cb34d3fb`.
Authority: `docs/research/ZYARA_NETWORK_MASTER_PLAN_2026-09-20.md` (N5 Collaboration:
C1 agent identities, C2 derived activity, C3 approval/exception queue, C4 audit-chain
qualification), extended by the founder directive for N5.

## Status

| Slice | Task | PR | Qualified head | Merge SHA | State |
| --- | --- | --- | --- | --- | --- |
| N5/C1 | bounded agent identities | #103 | `f7b61caa105a2b1605c9e33544313ce23ad375f7` | `09b646262d3cf65a8a064740e8e588d9e336a808` | canonical |
| N5/C1 evidence | post-merge packet | #104 | `64bd68d65601fd71eada4f2c6455a14afc124c6c` | `01bb1da071429f7ab2f8f7e843fa67531327ff81` | canonical |
| N5/C2 | derived human + agent activity | #105 | `6bc02db5f5ef7b6e520df392854cb3becfcfa718` | `e0425e0215ab385893cdce6bcaec2a43d187d9b9` | canonical |
| N5/C2 evidence | post-merge packet | #106 | `15ecfe4391d48465aa2cda7040408cbefa2012bc` | `f05c3358bee8ef2133760d95562911183d7fdb0e` | canonical |
| N5/C3 | approvals + human exception queue | #107 | `c2ec2e828f2966ece7e315e4056d80f0f7c4474e` | `463cdc2827f9d232515cda3aed8ab00af786bdb4` | canonical |
| N5/C3 evidence | post-merge packet | #108 | `9120c83fa8d14ae15f038ce91e2dc263adc242fe` | `1d1be117dd86041078de44f61fc3a005242812da` | canonical |
| N5/C4 | audit-chain qualification | #109 | `93f19fec78d8dab5d50013903a39696662248f0c` | `be032440a67634f588a8f7bc5ea7f857cb34d3fb` | canonical |

Evidence packets: `docs/evidence/N5/C1/`, `docs/evidence/N5/C2/`, `docs/evidence/N5/C3/`,
`docs/evidence/N5/C4/`. Each contains a work packet, provenance, a Jev review, an OCR truth
record and a result packet with the exact base, head, merge and post-merge verification.

## What the collaboration plane now provides

- **C1 bounded agent identities.** A tenant- and branch-scoped service principal with a live
  human sponsor, a closed capability set, a bounded TTL, suspension/revocation and an
  append-only identity trail. It is not a Practitioner, not a PractitionerRole and never
  clinical or financial authority. Agent identities can propose and comment on operational
  work; they cannot resolve or cancel it.
- **C2 derived human + agent activity.** An append-only operational projection built from
  authoritative events in W3, C1 and W4 (extended by C3), with explicit actor typing, minted
  tenant-scoped pseudonymous references, no prose or payload values, separate sensitivity and
  visibility gates, deterministic replay and a superseding correction model. Activity is
  derived, never authority, and there is no public write route.
- **C3 approvals + human exception queue.** A closed protected-action registry; an approval
  bound to tenant, branch, action type, a digest of the protected parameters, requester,
  required authority, risk class, evidence, creation time, expiry and correlation id; live
  authority re-resolved at decision and execution time; human-only decisions with
  self-approval refused; an explicit state machine with frozen terminal states and idempotent
  retries; unknown external outcomes that stay unknown and become owned human work; and a
  fifteen-kind exception queue whose every case is owned by a W3 work item with
  evidence-gated closure.
- **C4 audit-chain qualification.** A read-only reader that answers twelve named chain
  questions per correlation id with the authoritative record behind each answer, refuses
  foreign scope and foreign correlation ids, cannot quote prose or secrets, orders evidence
  deterministically, fingerprints the reconstruction reproducibly, and publishes a closed
  gap register. It fixed two genuine join gaps (W2 coverage, W4 inbound receipts) and one W2
  wiring defect that denied every W2 write by accident, and it added a read-only
  `security_invoker` reconstruction view.

## Invariants preserved

```text
Account            != StaffAssignment   != AgentIdentity != Practitioner != PractitionerRole
AuthoritativeDomainEvent != DerivedActivityEvent
AgentProposal      != Approval          != ExecutedAction
ActivityEvent      != authoritative approval state  AND  != execution state
MessageAcceptedByProvider != MessageDelivered != PatientAcknowledged
Appointment != TelehealthSession != Encounter          (preserved, N6 must keep it)
ClinicalDraft != SignedClinicalRecord                  (preserved, N7 must keep it)
InsuranceAcceptance != Eligibility != PriorAuthorization != Claim != Payment
```

Each of the collaboration-plane invariants above is enforced in the domain layer, in the
database contract, or both, and is asserted by the qualification tests named in the slice
result packets.

## Remaining limitations (no real-world claim is attached to any of them)

- **No verified agent credential path.** No service token, mTLS, SPIFFE/SPIRE or workload
  identity exists, so no agent-originated HTTP write is enabled; agent actors are exercised
  through the trusted server-side call path.
- **No cryptographic tamper-evidence.** Append-only means the application role holds no update
  or delete path. There is no hash chain, signature, Merkle structure or WORM storage, and C4
  states that explicitly rather than implying immutability.
- **In-process stores.** W1–W4 and C1–C4 use in-memory stores in this build; the database
  contract, RLS, guards and grants are proven against real PostgreSQL, but a durable outbox
  and consumer are not implemented.
- **No durable search.** Approvals, exception cases and activity are not indexed.
- **Operational metadata visibility.** Approval and exception activity is operational
  metadata visible to branch operations readers, including critical-risk protected actions; a
  compliance-sensitivity class does not exist yet.
- **Synthetic compliance authority mapping.** `compliance_officer` is satisfied by a
  tenant-wide organisation administrator membership in this build.
- **No clinical content anywhere in the collaboration plane**, by construction.

## External dependencies (unchanged by N5, none claimed as satisfied)

Production identity provider and secret manager; production WhatsApp credentials and a real
Meta business account; clinical governance for telehealth; NPHIES credentials, payer
contracts and regulatory authority; pilot clinics, patients and providers; residence and
security sign-off. None of these were required for the repository-owned work above, and none
is claimed.

## Completion-state matrix at N5 closure

```text
REPOSITORY_IMPLEMENTATION_COMPLETE   = TRUE (for N5 C1-C4, and for N0-N4 as previously recorded)
SYNTHETIC_QUALIFICATION_COMPLETE     = TRUE (for N5 C1-C4)
REAL_CLINIC_VALIDATION_COMPLETE      = FALSE
REAL_PROVIDER_VALIDATION_COMPLETE    = FALSE
REAL_NPHIES_VALIDATION_COMPLETE      = FALSE
REAL_TELEHEALTH_VALIDATION_COMPLETE  = FALSE
COMMERCIAL_VALIDATION_COMPLETE       = FALSE
PRODUCTION_SECURITY_REVIEW_COMPLETE  = FALSE
PRODUCTION_AUTHORIZED                = FALSE
ZYARA_PROJECT_COMPLETE               = FALSE
```

## Next authorized task

**N6 — Zyara Connect**, starting with a bounded media-engine qualification (one primary
engine chosen from the studied candidates, or a bounded qualification experiment if the
evidence is insufficient), followed by the session lifecycle, secure chat/files/consent and
reconnect/failure slices. The clinical state stays owned by Zyara; the media engine owns only
media and session transport, and `Appointment != TelehealthSession != Encounter` must survive
into the UI.
