# AIF-02B Threat Model (delta)

Scope: resolving an opaque credential reference into a secret for an execution adapter.

| Threat | Mitigation | Proof (`tests/aif02a/credentials.test.ts`) |
| --- | --- | --- |
| A credential is used by another tenant, branch, provider or subject | tenant, branch, provider and subject-binding rules; tenant and branch come from the server-derived principal or resolution receipt | the handoff denial table; "binds the credential to its subject" |
| A model or agent chooses the credential | the `ref` comes from the admitted capability definition's `credentialBinding` (AIF-01B), never from model output | packet rule; no request field is model-sourced |
| A stale credential is used | not-before, expiry, revocation, binding version (rotation) and a retired vault handle (rotation race) all deny | expired, not-yet-valid, revoked, "rotation invalidates the old binding…" |
| A resolved secret outlives its purpose | a 60 s lease that fails closed on a malformed or backwards clock; `dispose()` | "expires with its lease…", "fails the lease closed…" |
| The secret is serialized into a model or tool payload | `toJSON` throws; printing shows a placeholder; `assertSecretFreePayload` refuses credentials, credential shapes, secret-named keys (by word) and non-plain values | "cannot be serialized, printed or returned", "refuses a model or tool payload…", "names secret fields by words…" |
| An adapter hands the secret back out or leaks it in an error | adapter errors are replaced by a redacted error; results must be plain data without the secret or its base64 form | "redacts adapter errors and refuses non-plain or secret-carrying results" |
| The secret or vault handle leaks into a receipt, error or health report | metadata only; credential-shaped ids are never echoed | "keeps receipts, errors and health free…", "validates binding fields…" |
| The vault is reached on a denied request | the vault is called only after rules 1–9 pass | "denies … and never touches the vault" |
| A failing dependency yields a credential | every port and the clock fail closed | "denies on a failing vault, bindings store or clock" |

Residuals:

- **The boundary is in-process.** The handoff's "bounded process boundary" is met here by an in-process object with private fields and best-effort result checks. Code running in the same process with debugger or memory access could still read the secret. A separate adapter process or sidecar with its own memory is runtime work (AIF-04 agent runtime / AIF-06 local bridge). This is Jev's remaining weakest area (`boundary`).
- Vault custody, key rotation scheduling and real secret storage are not in this slice. The vault is a port, and production secret management is an external/deployment gate.
- Single-use semantics are not enforced. A lease can serve several adapter calls within 60 s for the same request.
