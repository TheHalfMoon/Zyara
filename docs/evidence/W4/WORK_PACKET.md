# W4 Work Packet — WhatsApp Adapter

**Authority:** `docs/research/ZYARA_NETWORK_MASTER_PLAN_2026-09-20.md`
**Fresh-main base:** `a68c9ce52e4866f7168928beb7cacb7ea25ff793`
**Branch:** `feat/zyara-network-w4-whatsapp-adapter`
**Mode:** bounded implementation; synthetic/local qualification only.

## Purpose

Add the first privacy-first WhatsApp integration boundary for Zyara Clinic without
turning an external messaging channel into healthcare authority.

## Required behavior

- persist provider-account descriptors with **secret references only**;
- keep actual app secrets / verify tokens in server-side runtime secret material;
- verify Meta `X-Hub-Signature-256` over the exact raw request bytes;
- bind every verified webhook to the configured WABA + phone-number target;
- reject unsigned, malformed, tampered and cross-account payloads;
- make webhook receipt ingestion idempotent;
- persist metadata-only webhook receipts and no patient-authored message body;
- keep webhook receipts append-only;
- require explicit WhatsApp consent before any outbound send path is allowed;
- keep external previews generic/minimally revealing;
- retain tenant and branch isolation;
- never let webhook traffic directly mutate appointments, encounters,
  prescriptions, insurance, claims, payments or workforce authority.

## Allowed surface

- `packages/communication/**`
- `apps/api/src/whatsapp.ts`
- `apps/api/src/index.ts`
- `apps/api/package.json`
- `apps/api/scripts/w4-whatsapp-*`
- `pnpm-lock.yaml`
- `db/migrations/041_whatsapp_adapter.sql`
- `tests/m020/**`
- `.github/workflows/w4-ci.yml`
- `docs/evidence/W4/**`

## Explicit non-goals

- no real Meta access token or production app secret;
- no real clinic or patient data;
- no patient-authored message persistence;
- no unified inbox yet;
- no AI reply generation;
- no booking/clinical action from inbound messages;
- no marketing campaigns;
- no payment/claim/prescription action;
- no production WhatsApp Business account claim;
- no automatic fallback to WhatsApp without channel-specific consent.

## Acceptance

1. raw-byte signature verification is proven at the HTTP boundary;
2. provider target mismatch fails closed;
3. callback replays are idempotent;
4. credential descriptors do not store secret values;
5. ordinary application role cannot rewrite secret references;
6. tenant RLS and branch integrity are exercised against PostgreSQL;
7. webhook receipt tables are append-only for the app role;
8. outbound safety gate requires consent and generic previews;
9. exact-head W4 CI is green before merge;
10. production/real-provider readiness is not claimed.
