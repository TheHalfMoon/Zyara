# M016 Security / Privacy Checks

- Tenant isolation: booking_operations plus appointments plus appointment_items
  carry tenant_id, FORCE RLS, tenant policies on
  current_setting('app.current_tenant'); smoke asserts t2 sees 0 rows.
- Authorization: tenant and actor derive from verified session claims only;
  body-supplied tenant is ignored; holder/patient binding recorded as IDs.
- Idempotency abuse: UNIQUE tenant plus key on operations; same key plus same
  digest replays, changed body conflicts; pending-per-patient cap of 3.
- Patient duplicate guard: exclusion on tenant plus patient plus service plus
  overlapping booked_range; different-key same-slot returns existing id.
- No patient free text in ledger: unit IDs, UTC ranges, version numbers,
  opaque digests, snapshot tokens only. Telemetry carries counts/codes.
- Event payloads stay string IDs (M004 rule); guards reject eval/Function,
  LLM clients, Redis clients.
- Migration grants: SELECT plus INSERT plus UPDATE on booking tables
  (pending-to-terminal is the audited transition). No DELETE grant anywhere;
  no now() predicate; statement_timestamp only.
- Synthetic data only. No PHI, no production credentials, no deployment.
- Residual: local PG unavailable on this machine — real-DB smoke runs
  authoritatively in CI (postgres:16 service).
