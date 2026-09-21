# N5/C2 Work Packet — Derived Human + Agent Activity

**Authority:** `docs/research/ZYARA_NETWORK_MASTER_PLAN_2026-09-20.md` (N5 Collaboration,
"C2 activity-derived").
**Fresh-main base:** `01bb1da071429f7ab2f8f7e843fa67531327ff81` (N5/C1 post-merge closure, PR #104).
**Branch:** `feat/zyara-network-n5c2-activity-derived`.
**Mode:** bounded implementation; synthetic and local-database qualification only.

## Purpose

Give Zyara Clinic a trustworthy operational activity layer where human and bounded-agent
actions can be observed together, without the activity feed ever becoming authoritative
healthcare state.

```text
Authoritative domain event
        -> normalization (closed registries)
        -> derived activity event (append-only)
        -> tenant / branch / actor / subject projection
        -> timeline / feed / search / notification input
```

The reverse edge does not exist. Nothing in this slice may write back into appointments,
encounters, prescriptions, orders, results, claims, payments, eligibility, authorizations,
staff authority or patient clinical facts.

## Required behavior

1. **Activity is a projection, not authority.** `ActivityStore` accepts an already-recorded
   authoritative event descriptor and derives an operational activity record. It holds no
   reference to any domain store, so it cannot mutate source-domain state.
2. **Closed registries.** Actor kind, source domain, category, action, result, subject type,
   sensitivity class and visibility scope are closed enumerations. An unknown source domain
   or an unsupported actor type is refused rather than stored.
3. **Explicit actor typing.** Actors are `human`, `agent`, `system` or `external`. Human
   actors resolve to a server-authoritative account id; agent actors resolve to a C1
   `agent_identities` row; system and external actors carry a namespaced actor reference.
   A free-text actor name can never satisfy the actor model.
4. **Revoked agent history stays visible, current authority is never implied.** An activity
   record produced by an agent identity keeps referring to that identity and is annotated
   with the resolved authority state at projection time. A revoked identity leaves its
   historical activity readable while `activityCarriesCurrentAuthority()` reports `false`.
5. **Deduplication / idempotency.** At-least-once delivery is expected: the projection is
   unique on `(tenant, source domain, source event id, projection version)`. A replay returns
   the original record; a replay with divergent content is refused as a conflict.
6. **Append-only history.** Corrections are new superseding records carrying
   `supersedesActivityId` and a correlation back to the domain event. There is no update and
   no delete path — not in the domain layer and not for the application database role.
7. **Privacy-first payloads.** Payloads are a flat map of bounded strings drawn from a closed
   key allowlist. Credential material, tokens, secret references, webhook payloads, unbounded
   clinical text, medical notes and model chain-of-thought are refused.
8. **Sensitivity and visibility separated.** Operational metadata and clinical content are
   different classes. `restricted` activity is never returned by an operations read; it
   requires an explicitly authorized clinical surface and is denied to org/branch
   administrators who hold no clinical role.
9. **Tenant and branch isolation.** Cross-tenant projection and cross-tenant read are
   refused; branch visibility is enforced per record.
10. **Provenance.** Every record retains source domain, source event id, source domain
    revision, correlation id and observation time.

## Derivation sources wired in this slice

Only sources that already emit append-only events are projected, so no second event bus and
no incompatible envelope is introduced:

| Source domain | Authoritative event | Derived category |
| --- | --- | --- |
| `workforce.tasks` (W3) | task created / assigned / transitioned / comment | `task` |
| `identity.agents` (C1) | agent identity created / capability / lifecycle / rotation | `agent_identity` |
| `communications.whatsapp` (W4) | verified webhook metadata receipt | `communication` |

## Allowed surface

- `packages/collaboration/**`
- `apps/api/src/activity.ts`
- `apps/api/src/tasks.ts` (additive projection call only)
- `apps/api/src/agents.ts` (additive projection call only)
- `apps/api/src/whatsapp.ts` (additive projection call only)
- `apps/api/src/index.ts`
- `apps/api/package.json`
- `apps/api/scripts/n5c2-activity-rls-smoke.mjs`
- `apps/api/scripts/n5c2-activity-http-smoke.ts`
- `packages/*/package.json` (additive workspace dependency only)
- `pnpm-lock.yaml` (additive importer only)
- `db/migrations/043_activity_events.sql`
- `tests/n5c2/**`
- `.github/workflows/n5c2-ci.yml`
- `docs/evidence/N5/**`

## Explicit non-goals

- no agent credential verification, no service token, no mTLS, no SPIFFE/SPIRE, no workload
  identity: the C1 gap is unchanged and no agent-originated HTTP write is enabled;
- no public HTTP write route for activity: a client-declared "authoritative event" would
  fabricate source-domain authority, so projection stays a server-side call path;
- no unified inbox, no notification fan-out, no email/SMS/push delivery;
- no clinical content in any activity payload, and no clinical read surface;
- no search index over activity (a later slice owns search, and it must search only the
  derived projection);
- no Nostr/Buzz transport, relay, key material or canonical event store;
- no C3 approval/exception queue and no C4 audit-chain qualification;
- no real clinic, provider, patient or PHI data;
- no production readiness, security qualification or clinical authority claim.

## Acceptance

1. human event projection works and carries tenant, branch, actor and provenance;
2. agent event projection references a valid C1 identity;
3. revoked-agent activity remains historically visible and implies no current authority;
4. a duplicate source event does not create a duplicate activity record;
5. cross-tenant projection is rejected;
6. cross-tenant read is denied;
7. cross-branch visibility is enforced;
8. sensitive payload fields are excluded or redacted;
9. credential and secret material are rejected from activity payloads;
10. append-only enforcement holds in the domain layer and for the database role;
11. source-event provenance is retained;
12. correlation id is retained;
13. an unsupported actor type is rejected;
14. an unknown source domain is rejected by the closed registry;
15. activity cannot itself mutate source-domain state;
16. exact-head N5/C2 CI is green before merge;
17. real PostgreSQL smoke runs under `zyara_app`, not only as a superuser;
18. no production readiness or clinical authority is claimed.
