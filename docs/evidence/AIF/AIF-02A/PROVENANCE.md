# AIF-02A Provenance

| Component | Decision | Source | Notes |
| --- | --- | --- | --- |
| `@zyara/privacy-egress` `egress.ts` | Zyara-native | this repository | No donor source was copied or adapted. |
| Data classes | REUSE | `@zyara/capability-gateway` `CAPABILITY_DATA_CLASSES` (AIF-01A) | Imported, so there is no second list. |
| Credential-shape scan | REUSE | `@zyara/capability-gateway` `containsCredentialShape` (exported for this slice; definition-scan patterns plus a JWT-prefix pattern) | Windowed scan over bounded inputs. |
| Direct-identifier rule | REUSE | `@zyara/collaboration` `APPROVAL_DIRECT_IDENTIFIER_PATTERNS` (N5/C3) | Imported. |
| Consent | REUSE (type) / REIMPLEMENT (check) | `@zyara/consent-boundaries` `ConsentGrant`, `ConsentPurpose` (M051) | Only the types are reused. M051's `isConsented` compares timestamps as strings (a pre-existing defect, see RESULT), so the gate checks consent on parsed instants with the same grant semantics. |
| Privacy-gate concepts | REFERENCE | AIF plan §4.2; AIF source adoption (decision-runtime and privacy donors qualified 2026-09-22/23) | Concepts only. |

New runtime dependencies: none. Hashing and HMAC use Node's built-in `crypto.subtle`. SBOM impact: one new workspace package, `@zyara/privacy-egress`.
