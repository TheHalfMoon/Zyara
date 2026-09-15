# M006 Result

Status: COMPLETE (merged).

- Base SHA: c69ed45567d196ce5aedbefdf16bfbdfa4c8a659
- Implementation head: 382f6f2
- Merge commit on main: 427b98a72d226e2ec6a06279dfd6265989bc532f (PR #13)
- CI: m006-ci green on head (typecheck + 7/7 matrix + PG16 graph smoke).
- Branch: muse/M006-provider-graph
- Acceptance 1 (one practitioner, many branch roles): PASS
- Acceptance 2 (service without doctor): PASS
- Acceptance 3 (cycles + cross-tenant fail): PASS (self-cycle + tenant guards;
  add-only API makes multi-node cycles unconstructible; detection guards updates)
- FHIR: synthetic R4 fixtures map 1:1; mixed-script names preserved
- RLS: 006 tables FORCE RLS + app grants; PG16 smoke in m006-ci
- Residuals: local PG unavailable (M001 residual); verification states are M008.
