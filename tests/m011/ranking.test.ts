import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { search, indexFreshness } from "@zyara/search";
import type { PublicProjection } from "@zyara/search";
import type { SearchQuery } from "@zyara/search-contract";

const INDEX: PublicProjection[] = [
  {
    docId: "d1", branchId: "b1", names: { ar: "عيادة العليا", en: "Olaya Clinic" },
    specialty: "dermatology", service: "consultation", insurer: "TAWUNIYA",
    languages: ["ar", "en"], accessibility: ["wheelchair"], verifiedScope: "registration",
    withdrawn: false, expired: false, freshnessDays: 1, lat: 24.7136, lng: 46.6753,
    nextAvailableIso: "2026-09-20T10:00:00+03:00",
  },
  {
    docId: "d2", branchId: "b2", names: { en: "Far Clinic" },
    specialty: "dermatology", service: "consultation", insurer: null,
    languages: ["en"], accessibility: [], verifiedScope: null,
    withdrawn: false, expired: false, freshnessDays: 20, lat: 25.5, lng: 47.5,
    nextAvailableIso: null,
  },
  {
    docId: "d3", branchId: "b1", names: { en: "Old Clinic" },
    specialty: "dermatology", service: "consultation", insurer: "TAWUNIYA",
    languages: ["ar"], accessibility: [], verifiedScope: null,
    withdrawn: true, expired: false, freshnessDays: 1, lat: 24.7136, lng: 46.6753,
    nextAvailableIso: null,
  },
];

const base: SearchQuery = { version: 1, locale: "ar", text: "dermatology", specialty: "dermatology", sort: "relevant" };
const OPTS = { allowRelax: false, symptomNavigationEnabled: false };

test("paid tier never influences organic score", () => {
  const src = readFileSync(new URL("../../packages/search/src/index.ts", import.meta.url), "utf8")
    + readFileSync(new URL("../../packages/search-contract/src/index.ts", import.meta.url), "utf8");
  assert.ok(!/paidTier|bidAmount|commercialBoost|sponsored|payment/i.test(src));
  const r = search(INDEX, base, OPTS);
  assert.ok(r.results.every((x) => x.explanation.every((e) => e.signal !== ("paid" as never))));
});

test("unknown insurance is not guaranteed coverage", () => {
  const r = search(INDEX, { ...base, insurer: "BUPA" }, OPTS);
  const d2 = r.results.find((x) => x.docId === "d2");
  assert.ok(d2);
  assert.equal(d2?.insurerKnown, false);
});

test("filter relaxation requires patient choice", () => {
  const far: SearchQuery = { ...base, near: { lat: 26.0, lng: 48.0, radiusKm: 1 } };
  const strict = search(INDEX, far, OPTS);
  assert.equal(strict.results.length, 0);
  assert.equal(strict.relaxedFilters, false);
  const relaxed = search(INDEX, far, { ...OPTS, allowRelax: true });
  assert.equal(relaxed.relaxedFilters, true);
  assert.ok(relaxed.results.some((x) => x.docId === "d2"));
});

test("expired/withdrawn projections excluded; empty results explain", () => {
  const r = search(INDEX, base, OPTS);
  assert.ok(!r.results.some((x) => x.docId === "d3"));
  const empty = search(INDEX, { ...base, specialty: "neurosurgery" }, OPTS);
  assert.equal(empty.results.length, 0);
  assert.equal(empty.zeroResultHelp, true);
});

test("Arabic alias match outranks stale far doc; nearest sort works", () => {
  const r = search(INDEX, { ...base, text: "العليا", near: { lat: 24.7136, lng: 46.6753, radiusKm: 200 } }, OPTS);
  assert.equal(r.results[0]?.docId, "d1");
  assert.equal(r.results[0]?.matchedAlias, true);
  const n = search(INDEX, { ...base, text: "", sort: "nearest", near: { lat: 24.7136, lng: 46.6753, radiusKm: 200 } }, OPTS);
  assert.equal(n.results[0]?.docId, "d1");
});

test("symptom navigation gated by clinical policy; freshness observed", () => {
  const r = search(INDEX, { ...base, text: "chest pain" }, OPTS);
  assert.equal(r.results.length, 0);
  assert.equal(r.zeroResultHelp, true);
  assert.deepEqual(indexFreshness(INDEX), { docs: 3, maxFreshnessDays: 20 });
});
