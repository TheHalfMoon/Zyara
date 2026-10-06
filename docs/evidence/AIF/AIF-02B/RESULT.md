# AIF-02B Result — Credential Mediation

Base: `main` @ `a4c0accf`, merged forward with `main` @ `8aa0fd5f`. Branch: `feat/zyara-network-aif02b-credential-mediation`.
Scope: `WORK_PACKET.md`. The exit marker `CREDENTIAL_MEDIATION_QUALIFIED = TRUE` is recorded after exact-head CI and merge.

## Delivered (`@zyara/privacy-egress` `credentials.ts`)

- **`mediateCredential()`** checks, in order:
  - an opaque `credref_` reference;
  - tenant, branch, provider and subject;
  - revocation;
  - the validity window;
  - the binding version (rotation);
  - scopes.

  Only then does it call the vault, with the current version's handle; a retired handle denies as rotated. It returns a metadata-only receipt for every decision.
- **`ResolvedCredential`** keeps the secret in a private field, reachable only via `use` or `useAsync` within a 60 s fail-closed lease. Serialization throws, printing shows a placeholder, adapter errors are redacted, and only plain-data results without the secret (raw, base64 or base64url) are returned.
- **`assertSecretFreePayload()`** refuses credentials, credential-shaped strings, secret-named keys (matched by word) and non-plain values in model or tool payloads.
- **`credentialHealth()`** reports metadata only (state, version, rotation, days to expiry).

## Handoff §7 → proof

| Requirement / test | Proof |
| --- | --- |
| tenant ownership; wrong tenant denied | "denies wrong tenant…" |
| branch/provider scope; wrong branch denied | "denies wrong branch…", "branch binding used tenant-wide", "provider mismatch" |
| credential subject binding | "binds the credential to its subject" |
| rotation; rotation invalidates the old binding | "rotation invalidates the old binding, including a request racing the rotation" |
| expiry; expired denied | "denies expired…", "not yet valid", lease tests |
| least-privilege metadata | "insufficient scope" |
| no secret serialization; serialization fails for a secret-like field | "cannot be serialized, printed or returned", "refuses a model or tool payload carrying a credential" |
| no secret in events or traces; logs and receipts hold only opaque refs | "keeps receipts, errors and health free of the value and the handle" |
| redacted failure messages | "redacts adapter errors…" |
| credential health without exposing the value | health tests (all states) |

## Runs

- AIF-02 suite: 54/54. AIF-01A: 37.
- Typecheck, lint and boundaries: clean.
- CI: the existing `aif02a-ci` workflow (path filter: `packages/privacy-egress/**` and `tests/aif02a/**`) runs these tests on the PR. No new workflow file was needed.

## Reviews

- Jev: `JEV_REVIEW.md`. The design challenge closed two gaps; all blocking questions are "no" on the final files.
- OCR (delegate mode): `OCR_REVIEW.md`.
- pstack: `PSTACK_EVIDENCE.md`. All must-fix items closed; the delta cycle found none new.
- Graft (local, telemetry off): `containsCredentialShape` is shared by the egress gate and `assertSecretFreePayload`. `assertSecretFreePayload` has no production caller yet, and AIF-04 must call it before every model or tool dispatch.

## Residual risks

- The boundary is in-process and best effort. A separate adapter process or sidecar is AIF-04/AIF-06 runtime work.
- Vault custody and real secret storage are external/deployment gates. The vault is a port.
- Nothing yet forces every dispatch through `assertSecretFreePayload` and `mediateCredential`. AIF-04 must.
- Lease reuse within 60 s is allowed, so credentials are not single-use.
