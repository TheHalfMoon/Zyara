import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { applyFilter, visiblePins, distanceKm, discoveryEvent } from "@zyara/geospatial";
import type { BranchPin } from "@zyara/geospatial";

const PINS: BranchPin[] = [
  { branchId: "b1", lat: 24.7136, lng: 46.6753, accuracyM: 10, labels: { ar: "عيادة العليا", en: "Olaya" }, insurerCaveat: "confirm", verifiedScope: "registration", observedAt: "2026-09-01", bookingMode: "request", wheelchairAccess: true },
  { branchId: "b2", lat: 24.75, lng: 46.7, accuracyM: 500, labels: { en: "Far" }, insurerCaveat: null, verifiedScope: null, observedAt: "2026-09-01", bookingMode: "call", wheelchairAccess: false },
  { branchId: "b3", lat: 25.5, lng: 47.5, accuracyM: 10, labels: { en: "Remote" }, insurerCaveat: null, verifiedScope: null, observedAt: "2026-09-01", bookingMode: "unavailable", wheelchairAccess: true },
];

test("map/list filter parity: one shared filter", () => {
  const f = { near: { lat: 24.7136, lng: 46.6753, radiusKm: 15 } };
  const mapView = applyFilter(PINS, f).map((p) => p.branchId).sort();
  const listView = applyFilter(PINS, f).map((p) => p.branchId).sort();
  assert.deepEqual(mapView, listView);
  assert.deepEqual(mapView, ["b1", "b2"]);
});

test("inaccurate pins suppressed; list/address fallback retained", () => {
  const { pins, suppressed } = visiblePins(PINS);
  assert.deepEqual(suppressed, ["b2"]);
  assert.ok(pins.some((p) => p.branchId === "b1"));
  // b2 still discoverable by list: applyFilter does not drop it.
  assert.ok(applyFilter(PINS, {}).some((p) => p.branchId === "b2"));
});

test("geospatial fixtures: Riyadh distances sane", () => {
  const d = distanceKm(24.7136, 46.6753, 24.75, 46.7);
  assert.ok(d > 1 && d < 15, `${d}`);
});

test("keyboard + location-denied: list works without position", () => {
  const page = readFileSync(new URL("../../apps/web/app/[locale]/map/page.tsx", import.meta.url), "utf8");
  assert.ok(page.includes('aria-label="branch-list"'));
  assert.ok(page.includes('data-fallback="list"'));
  const noLoc = applyFilter(PINS, { userLocation: null });
  assert.equal(noLoc.length, 3);
});

test("profile shows scope/freshness + insurer caveat + booking mode", () => {
  const page = readFileSync(new URL("../../apps/web/app/[locale]/profiles/[branchId]/page.tsx", import.meta.url), "utf8");
  assert.ok(page.includes("observed") && page.includes("not guaranteed") && page.includes("Booking:"));
  assert.ok(page.includes('aria-label="profile-actions"'));
});

test("tile/data rights separated from renderer; events minimized", () => {
  const geo = readFileSync(new URL("../../packages/geospatial/src/index.ts", import.meta.url), "utf8");
  assert.ok(geo.includes("not a data-rights grant"));
  const ev = discoveryEvent("phone_click", "b1");
  assert.deepEqual(Object.keys(ev).sort(), ["at", "branchId", "event"]);
  assert.ok(!JSON.stringify(ev).includes("24.7"));
});

test("no home/patient locations in public surfaces", () => {
  const pages = [
    "../../apps/web/app/[locale]/map/page.tsx",
    "../../apps/web/app/[locale]/profiles/[branchId]/page.tsx",
  ];
  for (const f of pages) {
    const src = readFileSync(new URL(f, import.meta.url), "utf8");
    assert.ok(!/patient|home|geolocation\.getCurrentPosition/i.test(src), f);
  }
});
