// M010 synthetic corpus: >=300 judged intents across 5 locales.
// Seeded PRNG -> deterministic. Rights-cleared synthetic names only.
import { writeFileSync } from "node:fs";

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260915);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const NAMES = [
  { ar: "ليلى حسن", translit: "Laila Hassan" },
  { ar: "مريم العتيبي", translit: "Maryam Alotaibi" },
  { ar: "خالد Müller", translit: "Khaled Mueller" },
  { ar: "سارة García", translit: "Sara Garcia" },
  { ar: "فهد Dubois", translit: "Fahad Dubois" },
  { ar: "نورة Schmidt", translit: "Noura Schmidt" },
];
const SPECIALTIES = ["dermatology", "cardiology", "pediatrics", "ophthalmology", "dentistry"];
const SERVICES = ["consultation", "follow_up", "lab_draw", "vaccination"];
const INSURERS = ["TAWUNIYA", "BUPA", "MEDGULF", null];
const LOCALES = ["ar", "en", "fr", "de", "es"];
const CENTER = { lat: 24.7136, lng: 46.6753 };

const docs = [];
for (let i = 0; i < 120; i++) {
  const n = pick(NAMES);
  docs.push({
    id: `doc-${i}`,
    name_ar: n.ar,
    name_alias: n.translit,
    specialty: pick(SPECIALTIES),
    service: pick(SERVICES),
    insurer: pick(INSURERS),
    branch: `branch-${i % 8}`,
    lat: CENTER.lat + (rand() - 0.5) * 0.2,
    lng: CENTER.lng + (rand() - 0.5) * 0.2,
    freshness_days: Math.floor(rand() * 30),
    verified: rand() > 0.3,
  });
}

// Judged intents: query text + expected doc + locale + geo expectation.
const intents = [];
const perLocale = 64; // 5 x 64 = 320 intents
for (const locale of LOCALES) {
  for (let k = 0; k < perLocale; k++) {
    const d = pick(docs);
    const form = rand();
    let text;
    if (locale === "ar") text = form < 0.5 ? d.name_ar : `${d.specialty} ${d.branch}`;
    else if (form < 0.4) text = d.name_alias;
    else if (form < 0.7) text = `${d.specialty} ${d.service}`;
    else text = `${d.specialty} near ${d.branch}`;
    intents.push({
      id: `${locale}-${k}`,
      locale,
      text,
      specialty: rand() < 0.6 ? d.specialty : undefined,
      expected: d.id,
      near: { lat: CENTER.lat, lng: CENTER.lng, radiusKm: 15 },
      expectNearby: true,
    });
  }
}

writeFileSync(new URL("./corpus.json", import.meta.url), JSON.stringify({ docs, intents }, null, 1));
console.log(`corpus: ${docs.length} docs, ${intents.length} intents`);
