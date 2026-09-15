# M010 Decision (ADR A05 note)

Decision: adopt PostgreSQL (pg_trgm) baseline for search. Revisit 2027-03-15.

- Measured: PG top-1/top-5, per-locale cohorts, p50/p95 latency, geofilter
  correctness on PG16 in CI (see results.json attached to the CI run).
- Not claimed: OpenSearch/Meilisearch relevance or latency (simulations only).
- Cost: PG bundled with ledger DB (no extra pilot cost). OpenSearch cluster and
  Meilisearch self-host estimates recorded as ESTIMATES, not approved budgets.
- License: pg_trgm = PostgreSQL License. OpenSearch Apache-2.0 and Meilisearch
  MIT-community scope to be re-verified at revisit.
- Failure samples + Arabic subgroup results: in results.json / CI logs.
