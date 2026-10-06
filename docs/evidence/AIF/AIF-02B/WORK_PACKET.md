# AIF-02B Work Packet — Credential Mediation

Base: `main` @ `a4c0accf6a4e7f5a334d459d9a213823c242213a` (AIF-02A merged).
Branch: `feat/zyara-network-aif02b-credential-mediation`.
Authority: AIF plan §4.2 ("secrets and credentials are never model input") and §12 (AIF-02, "secret resolver"); AIF handoff §7 (AIF-02B); the AIF-01A `credentialBinding` (`credref_<opaque>`).
Exit marker: `CREDENTIAL_MEDIATION_QUALIFIED = TRUE`.

## Placement

The AIF plan defines AIF-02 as one unit: "Privacy / Egress / Secret Mediation". AIF-02B therefore extends `@zyara/privacy-egress` with `credentials.ts`, and its tests live in `tests/aif02a`, which the existing `aif02a-ci` workflow already runs. No new workflow file is needed.

## Contract (handoff §7)

"The gateway sees metadata; the adapter receives a short-lived resolved secret through a bounded process boundary; the agent/model never receives it."

- **`CredentialBinding`**, server-held metadata behind a `credref_` reference:
  - `ref`, `tenantId`, `branchId` (null = tenant-wide), `providerId`;
  - `subject`: `{ kind: TENANT | BRANCH | HUMAN_DELEGATE | SERVICE_ACCOUNT | EXTERNAL_INTEGRATION, id }`;
  - `version`: a rotation counter;
  - `scopes`: least-privilege permission names;
  - `notBefore`, `expiresAt`, `rotatedAt`;
  - `status`: `ACTIVE` or `REVOKED`;
  - `secretHandle`: an opaque vault handle that never leaves this module's boundary.
- **`CredentialRequest`**:
  - `ref` and the expected `version`;
  - tenant and branch, taken from the AIF-01B resolution receipt and the server-derived principal, never from a model;
  - `providerId`, `capabilityId` and `requiredScopes`.
- **`mediateCredential(request, deps)`** returns a value-free receipt for every decision and, on ALLOW only, a **`ResolvedCredential`**:
  - the secret sits in a private field;
  - `toJSON()` throws, and `String()` or inspection shows `[ResolvedCredential]`;
  - the secret is reachable only through `use(fn)`;
  - it expires 60 s after resolution (`CREDENTIAL_LEASE_MS`), after which `use` throws;
  - `dispose()` clears it.
- **`credentialHealth(binding, now)`** returns the ref, status, version, rotation time, days to expiry and an expired/expiring flag. It never returns the value or the handle.
- **`assertSecretFreePayload(value)`** walks a model or tool payload. It throws on any `ResolvedCredential`, on any credential-shaped string (AIF-01A `containsCredentialShape`), and on any key named like a secret. Use it before serializing anything for a model or tool.

## Rules (in order; the first failing rule denies)

1. A malformed request or `ref` (not `credref_…`) → `CREDENTIAL_REQUEST_INVALID`.
2. Unknown binding → `CREDENTIAL_UNKNOWN`.
3. Tenant mismatch → `CREDENTIAL_CROSS_TENANT`.
4. Branch mismatch (a branch-scoped binding used on another branch, or for a tenant-wide call) → `CREDENTIAL_CROSS_BRANCH`.
5. Provider mismatch → `CREDENTIAL_PROVIDER_MISMATCH`. Subject mismatch (the request names on whose behalf it acts; it must equal the binding subject kind and id) → `CREDENTIAL_SUBJECT_MISMATCH`.
6. Revoked → `CREDENTIAL_REVOKED`.
7. Before `notBefore`, or at or after `expiresAt` (server time) → `CREDENTIAL_NOT_YET_VALID` / `CREDENTIAL_EXPIRED`.
8. Version differs from the current binding version → `CREDENTIAL_ROTATED`. A rotation invalidates every request that names the old version.
9. A required scope not held → `CREDENTIAL_SCOPE_INSUFFICIENT`.
10. Vault unavailable or failing → `CREDENTIAL_DEPENDENCY_UNAVAILABLE`. The same applies to any port failure or the clock. The vault is called only after rules 1–9 pass, and only with the current version's handle. If the vault reports that handle as retired (a request racing a rotation), the decision is `CREDENTIAL_ROTATED`, so a resolution never returns a secret from a rotated-away version.
11. Otherwise `ALLOW`.

Adapter boundary: `use(fn)` (sync) and `useAsync(fn)` run Zyara adapter code (reviewed code, never model-generated). An error from the adapter is replaced by a redacted `adapter failed` error, with no message, cause or stack from the original. The return value must be plain data (primitives, plain objects, arrays), with no function, Promise, Map, Set, buffer, Error, symbol key or accessor, and must not contain the secret or its base64 form. These checks are best effort for reviewed adapters: a second line of defense, not a sandbox. The lease fails closed on a malformed or backwards clock. `assertSecretFreePayload` also refuses non-plain values, and it matches secret-named keys by word (authToken, X-Api-Key, passphrase, cookie), not by substring (credentialRef and secretary pass). A model or agent never chooses the `ref`: it comes from the admitted capability definition's `credentialBinding`, as resolved under AIF-01B.

Failure messages and receipts carry only the ref, version, tenant, branch, provider, capability, reasons and server time. They never carry the secret or the vault handle.

## Required tests (handoff §7 plus hardening)

- wrong tenant denied;
- wrong branch denied;
- expired credential denied;
- rotation invalidates the old binding;
- logs and receipts contain only opaque refs;
- model/tool payload serialization fails when a secret-like field is attempted;
- not yet valid, revoked, provider mismatch and insufficient scope are denied;
- the vault is not called on any denial;
- the lease expires and `dispose` clears it;
- `credentialHealth` never exposes the value or the handle;
- a failing vault or clock denies;
- a handle retired mid-resolution denies as rotated;
- `use(fn)` refuses a return value that carries the secret.
