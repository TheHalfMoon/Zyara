# W2 Work Packet — Shifts, Leave Conflicts and Coverage Review

**Authority:** `docs/research/ZYARA_NETWORK_MASTER_PLAN_2026-09-20.md` (N4/W2 lane).
**Fresh-main base:** `33d837f779f9cce9dffad7e6237e96aefb5e5dd2`.
**Branch:** `feat/zyara-network-w2-coverage`.
**Mode:** bounded implementation; synthetic qualification only.

## Purpose

Detect shift overlaps and approved-leave conflicts and record advisory
coverage review state without mutating appointments or clinical records.

## Allowed surface

- `db/migrations/039_coverage_exceptions.sql`
- `packages/enterprise-access/src/coverage.ts`
- `packages/enterprise-access/src/index.ts`
- `apps/api/src/coverage.ts`
- `apps/api/src/index.ts`
- `tests/m056/workforce.test.ts`
- `.github/workflows/w2-ci.yml`
- `docs/evidence/W2/**`

## Required behavior

- read-only overlap/conflict detection over W1 store state;
- cancelled shifts and non-approved leave never create conflicts;
- advisory coverage records start `open` and move `open -> acknowledged -> resolved`;
- tenant and branch integrity against referenced workforce records;
- scoped API derives tenant from verified claims and requires AAL2 admin role;
- tenant RLS with `USING` and `WITH CHECK`.

## Explicit non-goals

- automatic shift substitution or schedule rewriting;
- appointment capacity reconciliation or booking mutation;
- payroll, recruitment, biometrics, geofencing, face recognition;
- clinical credential or privilege adjudication;
- real provider or PHI data;
- production membership, HRIS or NPHIES integration.

## Acceptance

1. detectors ignore cancelled/non-approved records;
2. coverage starts open and rejects skipped transitions;
3. cross-tenant and cross-branch records are rejected;
4. migration is advisory and never touches clinical tables;
5. exact-head W2 CI passes before merge.
