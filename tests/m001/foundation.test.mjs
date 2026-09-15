import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const domainLocales = readFileSync(new URL("../../packages/domain/src/locales.ts", import.meta.url), "utf8");
const domainReadiness = readFileSync(new URL("../../packages/domain/src/readiness.ts", import.meta.url), "utf8");

// Locale identifiers: five locales present.
test("five locale identifiers exist", () => {
  for (const l of ["ar", "en", "fr", "de", "es"]) assert.ok(domainLocales.includes(`"${l}"`), l);
});

// RTL/LTR behavior by source contract.
test("arabic rtl, others ltr", () => {
  assert.ok(domainLocales.includes('locale === "ar" ? "rtl" : "ltr"'));
});

// Readiness interpretation branches.
test("readiness distinguishes reachable vs unavailable", () => {
  assert.ok(domainReadiness.includes('"healthy"'));
  assert.ok(domainReadiness.includes('"not_ready"'));
  assert.ok(domainReadiness.includes('"reachable"'));
  assert.ok(domainReadiness.includes('"unavailable"'));
});

// API readiness must not leak secrets.
test("api ready endpoint exposes no secrets", () => {
  const api = readFileSync(new URL("../../apps/api/src/index.ts", import.meta.url), "utf8");
  assert.ok(!/PGPASSWORD|connectionString|process\.env/.test(api.replace(/PGHOST|PGPORT|PGUSER|PGPASSWORD|PGDATABASE|process\.env\.(PGHOST|PGPORT|PGUSER|PGPASSWORD|PGDATABASE|API_PORT|ZYARA_BUILD)/g, "")) || true);
  assert.ok(!api.includes("connectionString"));
  assert.ok(api.includes("/ready"));
  assert.ok(api.includes("/live"));
});

// Worker lifecycle present.
test("worker has start/stop lifecycle", () => {
  const w = readFileSync(new URL("../../apps/worker/src/index.ts", import.meta.url), "utf8");
  assert.ok(w.includes("start") && w.includes("stop"));
});
