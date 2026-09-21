# C1 Work Packet — Agent Identities

**Authority:** `docs/research/ZYARA_NETWORK_MASTER_PLAN_2026-09-20.md`
**Fresh-main base:** `34aa637048afef225adbdcc7fdd71f9558423a17`
**Branch:** `feat/zyara-network-c1-agent-identities`
**Mode:** bounded N5 collaboration implementation; synthetic/local qualification only.

## Purpose

Introduce explicit, non-human agent identities and a deny-by-default administrative
capability model before any production agent is allowed to act.

## Core invariants

- an agent identity is never a human account;
- creating an agent creates **zero authority**;
- new identities start in `draft`;
- only explicit lifecycle transitions can activate/pause/revoke them;
- revoked identities are terminal;
- branch-scoped identities cannot receive broader grants;
- grants are tenant-scoped, time-bounded and individually revocable;
- C1 capability vocabulary is a closed allowlist;
- mutating capabilities require separately verified human approval;
- no agent/model may self-assert that approval;
- no runtime token/private key/API secret is stored by C1;
- no clinical, prescribing, insurance, claims, payment, shell, file or generic
  browser capability exists in C1;
- C1 creates no runtime agent-authentication endpoint;
- collaboration/activity feed belongs C2, approval receipts/exception queue C3,
  tamper-evident audit qualification C4.

## Initial capability floor

Read-only:
- `ops.tasks.read`
- `workforce.coverage.read`
- `whatsapp.delivery.read`

Bounded mutation, always human-approved:
- `ops.tasks.create`
- `ops.tasks.comment`
- `ops.tasks.progress`

Notably absent:
- task resolve/cancel;
- appointment mutation;
- clinical record access/write;
- prescription/order actions;
- insurance/NPHIES actions;
- claims/payments;
- shell/file/MCP/browser access.

## Acceptance

1. exact `agt_` identity namespace is enforced;
2. human accounts and agents remain structurally separate;
3. tenant/branch isolation exists in domain and PostgreSQL boundaries;
4. draft/active/paused/revoked lifecycle is conservative and revoked is terminal;
5. grants cannot exceed identity branch scope;
6. mutating grants require verified human approval;
7. runtime secrets are absent from schema and API;
8. authority events are append-only for the application role;
9. HTTP management requires AAL2 + org-admin authority for writes;
10. branch admins may inspect only their authorized branch;
11. exact-head C1 and repository CI are green before merge;
12. no production agent execution or clinical authority is claimed.
