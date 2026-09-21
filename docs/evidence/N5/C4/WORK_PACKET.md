# N5/C4 Work Packet — Audit-Chain Qualification

**Authority:** `docs/research/ZYARA_NETWORK_MASTER_PLAN_2026-09-20.md` (N5 Collaboration,
"C4 audit-chain-qualify"), extended by the N5/C3 founder directive.
**Fresh-main base:** `463cdc2827f9d232515cda3aed8ab00af786bdb4` (N5/C3 post-merge closure, PR #107).
**Branch:** `feat/zyara-network-n5c4-audit-chain`.
**Mode:** bounded implementation; synthetic and local-database qualification only.

## Purpose

C4 does not add another audit log. It qualifies whether the important actions that already
exist across W1 (workforce), W2 (coverage), W3 (tasks/helpdesk), W4 (WhatsApp), C1 (agent
identities), C2 (derived activity) and C3 (approvals/exceptions) can be **reconstructed**
reliably from the records those slices own.

```text
who or what initiated the request?
  -> under which identity?          -> under which tenant / branch?
  -> which authority applied?       -> what policy decision occurred?
  -> was human approval required?   -> who approved or rejected?
  -> what typed action executed?    -> what external action occurred?
  -> what receipt returned?         -> what canonical state changed?
  -> what derived activity emitted? -> what failure, retry or reconciliation happened?
```

C4 answers those twelve questions per correlation id, names the record behind every answer,
and reports the questions it cannot answer as gaps instead of inventing an answer.

## Required behavior

1. **A reader, never an authority.** The qualification layer holds no store and writes
   nothing. It cannot change any slice it explains.
2. **Closed step registry.** Twelve chain steps; a step outside the registry is refused.
3. **Declared profiles.** A profile (approval-driven, external-action-driven,
   exception-driven, task-only) declares which steps must be reconstructable. A step outside
   the profile that carries no evidence is `not_applicable`; a required step that carries no
   evidence is `absent` and makes the chain not reconstructable.
4. **Scope-bound evidence.** Every evidence entry declares the tenant and branch of the
   record it names. A foreign tenant is refused; a foreign branch is refused for a
   branch-scoped query. A tenant-wide record is admissible for a branch query.
5. **Correlation-bound evidence.** An entry carrying another correlation id, or attributed to
   a source domain other than the reader's, is refused rather than merged into the chain.
6. **No prose, no identifiers, no secrets.** A record reference, actor reference or outcome
   code must be a bounded token; prose, a direct identifier and credential material are all
   refused. A source field that cannot satisfy the shape becomes `unknown`, never a quoted
   payload; a provider status is reduced to a closed code rather than quoted.
7. **Deterministic order and reproducible fingerprint.** Evidence is ordered by step, then
   time, then owning record, so reader order cannot change the result. The fingerprint is a
   reproducibility digest over that ordered evidence. It is explicitly *not* a signature, a
   hash chain over storage, a Merkle proof or WORM evidence.
8. **Gaps are data.** A closed, owned gap register travels with every report. Two genuine
   join gaps found in earlier slices are closed by C4; the rest are recorded as open with an
   owner and a next step.
9. **Read-only surface.** The reconstruction view is `security_invoker`, so the querying
   role's row-level security applies to the base tables. It is granted `SELECT` only and
   cannot be written.
10. **Administrator-only access.** Reconstruction is tenant-wide and `org_admin`-only at
    AAL2. A branch-scoped operator is refused rather than silently narrowed, and a clinical
    role alone is not audit authority.

## Gaps found in earlier slices

| Gap | Status | Disposition |
| --- | --- | --- |
| W2 coverage exceptions carried no correlation reference | closed by C4 | optional shape-checked column + domain field + API passthrough |
| W4 verified inbound provider events carried no Zyara correlation reference | closed by C4 | boundary-minted deterministic reference (tenant + account + provider event key) + column |
| W2 coverage routes passed an empty membership list, so every W2 write denied by accident | closed by C4 | the route now uses the same trusted membership registry as the other workforce routes |
| W1 staff assignments, shifts and leave requests carry no correlation id | open | recorded; a chain references them by record reference, a dedicated field is deferred |
| No durable outbox in this build | open | recorded |
| No cryptographic tamper-evidence | open | recorded explicitly; C4 claims none |
| No verified agent credential path | open | recorded |
| Approval metadata is operational-level activity, including critical-risk actions | open | recorded; a compliance-sensitivity class is required |

## Allowed surface

- `packages/collaboration/src/audit-chain.ts` (new), `index.ts`
- `packages/enterprise-access/src/coverage.ts`, `packages/communication/src/whatsapp.ts`
  (each an additive optional field, plus a tenant-wide receipt read)
- `apps/api/src/audit-chain.ts` (new), `index.ts`, `coverage.ts`, `whatsapp.ts`
- `db/migrations/045_audit_chain.sql` (new, additive and forward-only)
- `apps/api/scripts/n5c4-audit-chain-rls-smoke.mjs`,
  `apps/api/scripts/n5c4-audit-chain-http-smoke.ts`
- `tests/n5c4/**`
- `.github/workflows/n5c4-ci.yml`
- `pnpm-lock.yaml` (additive importer only)
- `docs/evidence/N5/**`

## Explicit non-goals

- no new audit table, no new event bus, no second write path for any slice;
- no cryptographic immutability claim and no tamper-evidence claim;
- no payload, message body, contact, clinical field or credential in any chain entry;
- no analytics, no search index, no retention or deletion policy;
- no real clinic, provider, patient, payer or NPHIES interaction;
- no production readiness, security qualification or clinical authority claim.

## Acceptance

1. an approval-driven chain is reconstructed step by step with named evidence;
2. a required step with no evidence is reported as a gap, and an out-of-profile step is
   `not_applicable`;
3. foreign-tenant and foreign-branch evidence are refused;
4. evidence for another correlation id or another source domain is refused;
5. prose, direct identifiers and credential material are refused as evidence;
6. the fingerprint is reproducible for identical evidence and changes when evidence changes,
   and is never described as tamper-evidence;
7. the gap register is closed-coded, owned and honest about what stays open;
8. the database view reads the existing trails in one query, cannot be written, and still
   enforces row-level security through `security_invoker`;
9. a real cross-slice chain built through the public routes is reconstructed over HTTP,
   including the W2 and W4 join fixes;
10. exact-head N5/C4 CI is green before merge, including the PostgreSQL smoke and the
    authenticated HTTP smoke;
11. no production readiness, security qualification or clinical authority is claimed.
