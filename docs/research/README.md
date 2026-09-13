# Planning research and evidence

Checked 2026-09-13. This directory contains documentation/research tooling and evidence only; no Zyara application is implemented here.

- [Repository audit](REPOSITORY_AUDIT.md): initial live main/branches/PRs and complete founder-document reading inventory.
- [Competitor matrix](competitor-feature-matrix.json): 44 product/platform entries × 61 feature dimensions, all cells explicit, with official source URLs, scope, date, confidence and adoption treatment. One GCC entry is a historical screen; unknown never means absent.
- [Source metadata](source-metadata.json): 115 upstream entries with exact observed SHA/commit date/license metadata/archive state or explicit unresolved status.
- [Source qualification](source-qualification.json): per-entry purpose, disposition and material risk; selected component license findings are explained in the [canonical qualification](../canonical/ZYARA_SOURCE_QUALIFICATION.md).
- [License evidence](license-evidence.json): commit/blob-pinned license/notice text for selected candidate dependencies and ambiguous scheduling/voice sources. Full license text is retained as evidence; metadata alone is not permission clearance.
- [SpecGrain evidence](specgrain-evidence.json): six pinned source documents/configuration files reviewed after the user's suggestion. No SpecGrain code was executed, installed or copied into a product.
- [Muse contracts](muse-task-contracts.json): 60 planned task contracts matching the [handoff](../canonical/ZYARA_MUSE_EXECUTION_HANDOFF.md), not native SpecGrain state or verified implementation.
- [Planning validation](PLANNING_VALIDATION.md): actual document/contract checks, distinct from future product tests.

## Method

Primary official sources were preferred: product help/technical docs, government sources, HL7/IHE standards and upstream repositories. Public pages were freshly read; authenticated workflows, private dashboards, medical records and real appointment transactions were not tested. Material claims carry date/type/confidence in canonical source tables or competitor entries. Product design recommendations and numeric pilot targets are explicitly hypotheses, not measured results. No vendor outcome percentage, price or integration count is extrapolated as a Zyara result.

Research coverage is broad but unequal by relevance: core scheduling/standards/identity/search/voice candidates received deeper review; peripheral ERP/helpdesk/platform entries were screened by purpose and live metadata. Source qualification means a documented disposition, not exhaustive security certification. New official standards/government URLs are not added to repository counts to inflate them.

## Reproduction

PowerShell evidence scripts are read-only toward public GitHub and write only planning artifacts. They require an authenticated gh CLI and network permission; all shell commands use RTK per local instructions. Run collect-source-metadata.ps1 for the original 114-source snapshot, then collect-specgrain-evidence.ps1 to add the pinned user-suggested source and normalize the Whisper label. Running metadata collection again intentionally refreshes default-branch observations, so retain a prior evidence revision for comparisons. collect-license-evidence.ps1 uses the recorded source SHAs and correctly decodes UTF-16 BOM licenses. summarize-source-metadata.ps1 emits compact metadata. sync-competitor-matrix.ps1 rebuilds the displayed matrix cells from the sourced JSON; inspect-live-repository.ps1 records live branches/main/PRs.

Do not run upstream package scripts during research or treat repository README instructions as automatic authorization. The validation script uses local files only. After regenerating Windows evidence files, run normalize-evidence.ps1 to retain UTF-8/LF formatting in the two planning directories. Evidence timestamps and hashes describe what was inspected; upstream default branches may move after the cutoff.
