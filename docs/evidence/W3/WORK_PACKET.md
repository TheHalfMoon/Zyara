# W3 Work Packet — Clinic Helpdesk / Internal Task Queue

**Authority:** `docs/research/ZYARA_NETWORK_MASTER_PLAN_2026-09-20.md` (N4 Workforce: `W3 helpdesk-tasks`).
**Fresh-main base:** `a7ef63d7c00151c6977437760d911533255f5e6d` (W1 merged as `33d837f7`, W2 merged as `a7ef63d7`).
**Branch:** `feat/zyara-network-w3-helpdesk-tasks`.
**Mode:** bounded implementation; synthetic qualification only.

## Purpose

Add the clinic's internal administrative work queue — the operational helpdesk and
task layer that holds facility requests, IT/access requests, referral follow-up,
prior-authorization exceptions, refill routing, result-review routing and
automation human handoffs — without creating any clinical, scheduling, insurance
or financial authority.

## Allowed surface

- `db/migrations/040_ops_tasks.sql`
- `packages/enterprise-access/src/tasks.ts`
- `packages/enterprise-access/src/index.ts`
- `apps/api/src/tasks.ts`
- `apps/api/src/workforce.ts` (read-only membership accessor only)
- `apps/api/src/index.ts`
- `tests/m056/helpdesk.test.ts`
- `.github/workflows/w3-ci.yml`
- `docs/evidence/W3/**`

## Required behavior

- tenant-scoped and branch-scoped tasks with server-authoritative tenant identity;
- assignment only to an active staff assignment in the same tenant and branch;
- explicit lifecycle `open -> in_progress|blocked|cancelled -> resolved` with
  reopen of resolved work only when a reason is recorded;
- closure requires recorded outcome evidence (resolution note);
- automation may raise and comment on work, but never resolve or cancel it;
- cancelled work is frozen; resolved work accepts no comments or reassignment;
- idempotent creation per `(tenant, idempotencyKey)` with conflict on reuse with
  different content;
- append-only comment and lifecycle-event trail;
- tenant RLS with separate select/insert/update policies and `WITH CHECK` on every
  write boundary; trail tables granted `SELECT, INSERT` only;
- pointers to other domains (`subjectType` / `subjectRef`) stay opaque and are
  never written through;
- Qdrat donor provenance recorded for the adapted administrative patterns;
- no destructive rewrite of W1, W2, M001–M060 or PR #94.

## Explicit non-goals

- payroll, recruitment/ATS, biometrics, face recognition, geofencing, attendance;
- SLA engines, escalation automation, on-call rotation, reporting or analytics;
- WhatsApp/SMS/email channel adapters (that is W4);
- clinical documentation, orders, prescriptions, results, claims, payments;
- any authority over `Practitioner` / `PractitionerRole` / clinical privilege;
- real provider, clinic or patient data; production membership integration.

## Acceptance

1. migration is additive, tenant isolated and append-only for the trail tables;
2. cross-tenant and cross-branch composition is rejected in the store;
3. an ineligible, expired, mismatched or out-of-branch assignee is rejected;
4. automation cannot close human-owned work;
5. closure without a resolution note is rejected;
6. repeated creation with the same idempotency key is safe, divergent reuse
   conflicts;
7. scoped task routes derive tenant from verified claims and never grant
   membership;
8. exact-head W3 CI passes before merge;
9. no completion claim is made for real-provider, production or external
   validation.
