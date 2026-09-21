# N5/C1 Work Packet — Bounded Agent Identities

**Authority:** `docs/research/ZYARA_NETWORK_MASTER_PLAN_2026-09-20.md` (N5 Collaboration / Operations, "C1 agent-identities").
**Fresh-main base:** `34aa637048afef225adbdcc7fdd71f9558423a17` (W4 merge, PR #102).
**Branch:** `feat/zyara-network-n5c1-agent-identities`.
**Mode:** bounded implementation; synthetic and local-database qualification only.

## Purpose

Introduce the first bounded agent-identity layer for Zyara Clinic so that
human-and-agent collaboration can later be built on verified service principals
instead of client-declared automation authority. W3 deliberately refused
automation-originated work "until a verified service identity (agent identities,
later slice) exists"; this slice supplies that identity model without
introducing an unverified credential path.

## Required behavior

- register an agent identity only for a tenant that the caller already belongs to;
- require a live human sponsor resolved from the trusted server-side membership
  registry; an agent identity can never sponsor another agent identity;
- hold a **closed** capability set: `workforce.tasks.read`, `workforce.tasks.raise`,
  `workforce.tasks.comment`, `communications.outbound.propose`, `reporting.read`;
- refuse clinical, encounter, prescription, result, referral, insurance, NPHIES,
  claim, payment, billing, appointment, scheduling, availability, hold, audit,
  identity, role, membership, filesystem, shell, process, network, SQL, code,
  deploy and infrastructure capability namespaces;
- scope authority to a tenant, optionally to a single branch;
- bound every identity by an explicit effective window with a maximum TTL;
- suspend, reactivate and revoke with a recorded reason; expiry is derived, not
  stored, so a clock change cannot leave stale state;
- re-evaluate sponsor liveness and expiry at action time, not only at registration;
- store only opaque `secret://` credential references and rotation timestamps,
  never a credential value;
- keep the lifecycle and capability trail append-only for the application role;
- never let an agent identity become a Practitioner/PractitionerRole, clinical
  authority, or an owner of appointments, encounters, prescriptions, insurance,
  claims or payments;
- keep W3's rule intact: agents may raise and comment on operational work, never
  resolve or cancel it.

## Allowed surface

- `packages/collaboration/**`
- `apps/api/src/agents.ts`
- `apps/api/src/index.ts`
- `apps/api/package.json`
- `apps/api/scripts/n5c1-agent-rls-smoke.mjs`
- `pnpm-lock.yaml`
- `db/migrations/042_agent_identities.sql`
- `tests/n5c1/**`
- `.github/workflows/n5c1-ci.yml`
- `docs/evidence/N5/**`

## Explicit non-goals

- no agent credential verification (no service token, mTLS or workload identity
  path exists in this build), so no route here lets an agent authenticate;
- no agent-originated HTTP write path; W3 automation writes stay refused at the API;
- no derived activity stream (C2), no approval/exception queue (C3), no audit-chain
  qualification (C4);
- no agent chat/conversation surface and no agent-authored clinical or patient content;
- no Nostr/Buzz transport, relay or key material, and no shell/file tooling for agents;
- no real clinic, provider, patient or PHI data;
- no production agent identity, no production secret manager, no production
  authorization claim.

## Acceptance

1. an agent identity cannot be registered without an active human sponsor in the tenant;
2. every non-delegable capability namespace is refused at grant time;
3. authority resolution denies unknown, cross-tenant, cross-branch, suspended,
   revoked, expired, not-yet-effective, ungranted and sponsor-less agents;
4. credential material cannot be expressed as a stored value;
5. tenant isolation and branch integrity are exercised against PostgreSQL;
6. the event trail is append-only for the application role;
7. the persisted capability whitelist equals the delegable set exactly;
8. agents cannot close human-owned work through the W3 task queue;
9. exact-head N5/C1 CI is green before merge;
10. no agent credential verification or production readiness is claimed.
