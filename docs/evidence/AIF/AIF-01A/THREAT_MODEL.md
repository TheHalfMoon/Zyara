# AIF-01A Threat Model (delta)

Added in the AIF-01 closure (AIF handoff §15). Scope: the pure capability contract. It has no I/O.

| Threat | Mitigation | Proof |
| --- | --- | --- |
| An agent self-registers or widens a capability | the registrar is only a platform admin or the release pipeline; agents stay at A0/A1 in reserved namespaces; A5 is human-only | AIF-01A tests: agent self-registration, A5-to-agent, reserved namespace |
| An admitted definition is mutated after admission | JSON snapshot, then deep freeze; immutable (id, version); digest checked on lookup | mutation, duplicate-version and digest-mismatch tests |
| A getter or Proxy answers differently to checks and copy | validation reads one plain-data snapshot | review-panel hardening test |
| A secret travels in a definition or token | credential-shape patterns on every string and key; opaque `credref_`; values never echoed | credential plaintext and token tests |
| ReDoS in the secret scan | strings capped at 512 characters, definitions at 16 KB, bounded quantifiers | the 80 KB `eyJ-` run regression test |
| PHI or identifiers ride in correlation/idempotency ids | the N5 direct-identifier rule; UUIDs exempt only with a valid version and variant | UUID and identifier tests |
| A retried write duplicates an external side effect | a write retries only with provider-enforced idempotency, and every write invocation carries a key | write-retry and keyless-write tests |
| An unknown outcome is reported as success | `UNKNOWN_EXTERNAL_OUTCOME` is always `PENDING_RECONCILIATION` | unknown-outcome tests |

Residual: the registrar and grantee kind are caller-declared at this layer. Binding them to authenticated principals is AIF-01B, which is now merged.
