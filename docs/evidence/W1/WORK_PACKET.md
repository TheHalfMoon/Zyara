# W1 Work Packet — Clinic Organization / Workforce Graph

**Authority:** `docs/research/ZYARA_NETWORK_IMPLEMENTATION_HANDOFF_2026-09-20.md`
**Fresh-main base:** `679f6072441bd001198391355f2e02a62577ec44`
**Branch:** `feat/zyara-network-w1-workforce-graph`
**Mode:** bounded implementation; synthetic qualification only.

## Purpose

Add the first Zyara Network workforce layer without replacing healthcare identity or clinical privilege semantics.

## Allowed surface

- `db/migrations/038_workforce_graph.sql`
- `packages/enterprise-access/src/workforce.ts`
- `packages/enterprise-access/src/index.ts`
- `apps/api/src/workforce.ts`
- `apps/api/src/index.ts`
- `apps/api/package.json`
- `pnpm-lock.yaml`
- `tests/m056/workforce.test.ts`
- `.github/workflows/w1-ci.yml`
- `docs/evidence/W1/**`

## Required behavior

- department and team graph scoped to tenant / organization / branch;
- staff assignments distinct from `Practitioner` / `PractitionerRole`;
- optional opaque `practitionerRoleId` linkage without creating clinical authority;
- basic shift and leave records with interval validation;
- tenant RLS and write-time `WITH CHECK`;
- scoped API surface deriving tenant from verified claims;
- deny-by-default workforce membership adapter;
- Qdrat donor provenance;
- no destructive rewrite of M001–M060 or PR #94.

## Explicit non-goals

- payroll;
- recruitment / ATS;
- biometrics, face recognition or geofencing;
- attendance calculation;
- shift-overlap solving;
- coverage substitution;
- appointment capacity reconciliation;
- clinical credential / privilege adjudication;
- real provider or PHI data;
- production membership, HRIS or NPHIES integration.

The overlap / coverage / appointment reconciliation problem remains W2.

## Acceptance

1. migration is additive and tenant isolated;
2. cross-tenant and cross-branch composition is rejected;
3. staff assignment can reference but never replace `PractitionerRole`;
4. shifts and leave reject invalid intervals;
5. scoped workforce routes do not trust body-supplied tenant IDs;
6. no HTTP route can self-grant workforce membership;
7. exact-head W1 CI passes before merge;
8. no completion claim is made for real-provider or production validation.
