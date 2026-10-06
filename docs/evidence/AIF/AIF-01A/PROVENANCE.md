# AIF-01A Provenance

Added in the AIF-01 closure, because the AIF handoff §15 requires it and it was missing when #116 merged.

| Component | Decision | Source | Notes |
| --- | --- | --- | --- |
| `@zyara/capability-gateway` `contract.ts` | Zyara-native | this repository | No donor source was copied or adapted. |
| Risk classes, parameter-digest format, direct-identifier patterns | REUSE | `@zyara/collaboration` (N5/C3 `approvals.ts`) | Imported, not copied. `APPROVAL_DIRECT_IDENTIFIER_PATTERNS` was exported for reuse. |
| Reserved agent namespaces | REUSE | `@zyara/collaboration` (N5/C1 `isReservedCapability`, now exported) | One matcher for both layers. |
| Consent purposes | REUSE | `@zyara/consent-boundaries` (M051) | Type import only. |
| AIF capability-contract concepts | REFERENCE | AIF plan §4.1; AIF source adoption (Google AX, Treg, decision-runtime donors) | Concepts only, already qualified in the 2026-09-22/23 AIF packets. No code taken. |

New runtime dependencies: none. `crypto.subtle` (Node built-in) is used for SHA-256. SBOM impact: the new workspace package only.
