# AIF-03A Provenance

| Component | Decision | Source | Notes |
| --- | --- | --- | --- |
| `@zyara/model-registry` `registry.ts` | Zyara-native | this repository | No donor source was copied or adapted. |
| Data classes | REUSE | `@zyara/capability-gateway` `CAPABILITY_DATA_CLASSES` (AIF-01A) | Imported. |
| Registrar authority (platform admin or release pipeline) | REUSE (rule) | AIF-01A capability registrar | Same rule, local check. |
| Egress provider link | REFERENCE | AIF-02A `ProviderManifest.providerId` | Each profile names the AIF-02A manifest that governs its traffic. |
| Model fleet, prompt registry, agent-class and kill-switch concepts | REFERENCE | AIF plan §12A.1, §12A.2, §12A.5, §12A.6; AIF source adoption (Laya/Laya-CoreML, Decider and decision-runtime donors qualified 2026-09-22/23) | Concepts only. No donor code. Local Laya-style models are represented only as synthetic profiles. |

New runtime dependencies: none. SBOM impact: one new workspace package, `@zyara/model-registry`. No real model, weights, license file or provider is admitted by this slice.
