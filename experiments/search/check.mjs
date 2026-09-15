// M010 methodology gate (CI): corpus validity, locale coverage, honesty labels.
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const { docs, intents } = JSON.parse(readFileSync(new URL("./corpus.json", import.meta.url), "utf8"));
assert.ok(intents.length >= 300, `need >=300 intents, got ${intents.length}`);
const locales = new Set(intents.map((i) => i.locale));
for (const l of ["ar", "en", "fr", "de", "es"]) assert.ok(locales.has(l), `missing locale ${l}`);
const arForms = intents.filter((i) => i.locale === "ar");
assert.ok(arForms.some((i) => /[\u0600-\u06FF]/.test(i.text)), "need Arabic-script intents");
assert.ok(arForms.some((i) => !/[\u0600-\u06FF]/.test(i.text)), "need transliteration intents");
const ids = new Set(docs.map((d) => d.id));
for (const i of intents) assert.ok(ids.has(i.expected), `dangling judgment ${i.id}`);
assert.ok(intents.every((i) => i.near && i.near.radiusKm > 0), "geo expectations required");
const contract = readFileSync(new URL("../../packages/search-contract/src/index.ts", import.meta.url), "utf8");
assert.ok(/RANKING_INPUT_ALLOWLIST/.test(contract), "allowlist required");
assert.ok(!/paidTier|bidAmount|commercialBoost|sponsoredScore/i.test(contract), "commercial signals must not enter ranking contract");
console.log(`check PASS: ${intents.length} intents, 5 locales, judgments valid`);
