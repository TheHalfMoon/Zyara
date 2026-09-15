# M010 Decision (ADR A05 note)

Decision: adopt PostgreSQL (pg_trgm) baseline for search. Revisit 2027-03-15.

- Measured on PG16 in CI (run 34920497920, eval n=160 held-out):
  top-1 0.019, p95 0.89ms, geo-in-bounds 120/120.
- Honest reading: raw trigram top-1 is WEAK on multilingual intent text.
  This is recorded as a failure sample, not hidden. The PG baseline is kept
  because (a) it is the only measured engine, (b) latency and geo are strong,
  (c) relevance is owned by the M011 ranking layer (structured constraints +
  allowlisted signals) on top of PG retrieval, not by raw trigram ranking.
- Not claimed: OpenSearch/Meilisearch relevance or latency (simulations only).
- Cost: PG bundled with ledger DB (no extra pilot cost). OpenSearch cluster and
  Meilisearch self-host estimates recorded as ESTIMATES, not approved budgets.
- License: pg_trgm = PostgreSQL License. OpenSearch Apache-2.0 and Meilisearch
  MIT-community scope to be re-verified at revisit.
- Failure samples + Arabic subgroup results: in results.json / CI logs.
