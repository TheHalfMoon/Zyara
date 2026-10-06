# AIF-01B Provenance

Added in the AIF-01 closure, because the AIF handoff §15 requires it and it was missing when #117 merged.

| Component | Decision | Source | Notes |
| --- | --- | --- | --- |
| `resolver.ts`, `registry-state.ts`, `canonical.ts` | Zyara-native | this repository | No donor source was copied or adapted. |
| Human authorization | REUSE | `@zyara/authorization` `authorize()` (M002) | Called per granted role. |
| Agent lifecycle and authority | REUSE | `@zyara/collaboration` `resolveAuthority()` (N5/C1) | Composed through a port. |
| Protected-action approvals | REUSE | `@zyara/collaboration` `ApprovalRequest`, `PROTECTED_ACTIONS` (N5/C3) | Composed through a port; same action-type vocabulary. |
| Adapter certification | REUSE | `@zyara/adapter-harness` `requireCapability()` (M036) | Imported. |
| Exact confirmation | REFERENCE | `@zyara/action-confirmation` (M043) | Port shaped on it; not imported. |
| Migration 046 conventions | REUSE | migrations 042–045 (RLS on `app.current_tenant`, composite tenant FKs, append-only via grants, guard triggers as in 044) | Same patterns. |

New runtime dependencies: none beyond the workspace packages above. The smoke uses the existing `pg` 8.13.1 in `apps/api`. SBOM impact: workspace dependency edges only.
