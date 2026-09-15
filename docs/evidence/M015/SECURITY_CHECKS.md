# M015 Security / Privacy Checks

- Tenant isolation: holds + reservation_items + session_guards carry tenant_id,
  FORCE RLS, tenant policies on current_setting('app.current_tenant');
  propose validates TENANT fields before allocating; smoke asserts t2 sees 0 rows.
- Abuse guards: maxActivePerActorService=5 per actor/service; per-hold caps
  (8 items, TTL 2-30min, total 60min, 2 extensions); accessibility extensions
  stay available inside the same bounds (extra time, not exemption from truth).
- Holder authorization is recorded (actor_id) but enforced at the API layer
  in M016; this ledger never trusts caller claims — tenant comes from trusted
  context in the smoke via SET LOCAL.
- No patient data in the ledger: unit IDs, UTC ranges, version numbers and
  opaque digests only. Telemetry carries counts/codes/versions (asserted).
- Event payloads stay string IDs (M004 rule); guards reject eval/Function,
  LLM clients, Redis clients.
- Migration grants: SELECT+INSERT+UPDATE on holds tables (state/active flips
  are the audited transitions). No DELETE grant anywhere; no now() predicate.
- Synthetic data only. No PHI, no production credentials, no deployment.
- Residual: local PG unavailable + Docker daemon corrupted on this machine —
  the real-DB smoke runs authoritatively in CI (postgres:16 service).
