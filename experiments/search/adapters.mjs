// M010 adapters. pgDocs: MEASURED against real PostgreSQL+pg_trgm.
// simulatedOpenSearch / simulatedMeilisearch: SIMULATED scoring only — no
// relevance/latency claim is made for these candidates.
import pkg from "pg";
const { Client } = pkg;

function scoreDoc(doc, intent) {
  const q = intent.text.toLowerCase();
  let score = 0;
  const expl = [];
  if (doc.name_ar.includes(intent.text) || doc.name_alias.toLowerCase().includes(q)) {
    score += 3; expl.push("alias_match");
  }
  if (q.includes(doc.specialty)) { score += 2; expl.push("specialty_match"); }
  if (q.includes(doc.service)) { score += 1; expl.push("service_match"); }
  if (intent.specialty && doc.specialty === intent.specialty) { score += 1; expl.push("specialty_match"); }
  const distKm = Math.hypot(doc.lat - intent.near.lat, doc.lng - intent.near.lng) * 111;
  if (distKm <= intent.near.radiusKm) score += 1;
  else score -= 5;
  if (doc.verified) score += 0.5;
  score -= doc.freshness_days / 100;
  return { doc, score, distKm, expl };
}

export function simulatedAdapter(name, docs) {
  return {
    name,
    measured: false,
    async search(intent) {
      const ranked = docs.map((d) => scoreDoc(d, intent)).sort((a, b) => b.score - a.score).slice(0, 5);
      return ranked.map((r) => ({ docId: r.doc.id, score: r.score, distKm: r.distKm, alias: r.expl.includes("alias_match") }));
    },
  };
}

export function pgAdapter(client) {
  return {
    name: "postgres-pg_trgm",
    measured: true,
    async search(intent) {
      const t0 = performance.now();
      const r = await client.query(
        `SELECT id, name_ar, name_alias, specialty, service, lat, lng, freshness_days, verified,
           GREATEST(similarity(name_alias, $1), similarity(name_ar, $1)) AS sim
         FROM m010_docs ORDER BY sim DESC, freshness_days ASC LIMIT 5`,
        [intent.text],
      );
      const ms = performance.now() - t0;
      return {
        rows: r.rows.map((row) => ({ docId: row.id, score: row.sim })),
        ms,
      };
    },
  };
}

export async function setupPg(client, docs) {
  await client.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
  await client.query(`DROP TABLE IF EXISTS m010_docs`);
  await client.query(`CREATE TABLE m010_docs(id TEXT PRIMARY KEY, name_ar TEXT, name_alias TEXT, specialty TEXT, service TEXT, insurer TEXT, branch TEXT, lat DOUBLE PRECISION, lng DOUBLE PRECISION, freshness_days INT, verified BOOLEAN)`);
  for (const d of docs) {
    await client.query(`INSERT INTO m010_docs VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [d.id, d.name_ar, d.name_alias, d.specialty, d.service, d.insurer, d.branch, d.lat, d.lng, d.freshness_days, d.verified]);
  }
  await client.query(`CREATE INDEX m010_alias_trgm ON m010_docs USING gin (name_alias gin_trgm_ops)`);
}
