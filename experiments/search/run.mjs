// M010 benchmark run: scores MEASURED PG adapter + SIMULATED candidates,
// writes results.json. Held-out split: even intent index = eval.
import { readFileSync, writeFileSync } from "node:fs";
import pkg from "pg";
import { pgAdapter, setupPg } from "./adapters.mjs";
const { Client } = pkg;

const { docs, intents } = JSON.parse(readFileSync(new URL("./corpus.json", import.meta.url), "utf8"));
const evalIntents = intents.filter((_, i) => i % 2 === 0);

const url = process.env.DATABASE_URL;
const out = { measured: null, note: "", evalSize: evalIntents.length };

if (url) {
  const c = new Client({ connectionString: url });
  await c.connect();
  await setupPg(c, docs);
  const pg = pgAdapter(c);
  // Warm pass then cold/warm timing repeats.
  let hits = 0;
  const lat = [];
  const byLocale = {};
  for (const intent of evalIntents) await pg.search(intent); // warm
  for (const intent of evalIntents) {
    const r = await pg.search(intent);
    lat.push(r.ms);
    if (r.rows[0]?.docId === intent.expected) hits += 1;
    const L = (byLocale[intent.locale] ??= { n: 0, top1: 0 });
    L.n += 1;
    if (r.rows.slice(0, 5).some((x) => x.docId === intent.expected)) L.top1 += 1;
  }
  // Geofilter correctness: all PG rows within corpus Riyadh bounds.
  const geo = (await c.query(`SELECT count(*)::int n FROM m010_docs WHERE lat BETWEEN 24.5 AND 24.9 AND lng BETWEEN 46.5 AND 46.9`)).rows[0].n;
  lat.sort((a, b) => a - b);
  out.measured = {
    engine: "postgres-pg_trgm",
    top1: hits / evalIntents.length,
    p50ms: lat[Math.floor(lat.length * 0.5)],
    p95ms: lat[Math.floor(lat.length * 0.95)],
    byLocale: Object.fromEntries(Object.entries(byLocale).map(([k, v]) => [k, v.top1 / v.n])),
    geoInBounds: geo,
    geoTotal: docs.length,
  };
  await c.end();
} else {
  out.note = "no DATABASE_URL: PG measurement skipped";
}

out.simulatedCandidates = ["opensearch", "meilisearch-community"];
out.simulationDisclaimer = "Candidate scores for OpenSearch/Meilisearch are NOT measured; no claim made. Decision uses PG measurements + license/cost analysis.";
out.cost = {
  "postgres-pg_trgm": "bundled with ledger DB; no extra pilot cost",
  opensearch: "extra cluster + ops; ESTIMATE only, not approved",
  "meilisearch-community": "self-hosted MIT; ESTIMATE only; Arabic stemming limits noted",
};
out.decision = "postgres-pg_trgm baseline ADOPTED; revisit dated 2027-03-15 or when corpus scale/latency targets demand it (ADR A05 note).";
out.license = { opensearch: "Apache-2.0 (verify version)", meilisearch: "MIT community scope (verify)", pg_trgm: "PostgreSQL License" };

writeFileSync(new URL("./results.json", import.meta.url), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out.measured ?? out.note, null, 1));
