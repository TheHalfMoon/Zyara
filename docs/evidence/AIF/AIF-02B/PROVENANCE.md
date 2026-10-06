# AIF-02B Provenance

| Component | Decision | Source | Notes |
| --- | --- | --- | --- |
| `packages/privacy-egress/src/credentials.ts` | Zyara-native | this repository | No donor source was copied or adapted. |
| `credref_` reference shape | REUSE | `@zyara/capability-gateway` `CREDENTIAL_REF_PATTERN` (AIF-01A) | Imported. |
| Credential-shape scan | REUSE | `@zyara/capability-gateway` `containsCredentialShape` (AIF-01A/02A) | Imported. |
| Opaque secret-manager reference concept | REUSE (concept) | N5/C1 agent identities (`credential_ref` = `secret://…`, never a value) | The same principle; no code shared. |
| Base64 encoder | Zyara-native | — | About 10 lines. Avoids a Node `Buffer` type dependency in the package. |

New runtime dependencies: none. SBOM impact: no new package; this extends the existing `@zyara/privacy-egress`.
