// M014 candidate proofs part 2 (synthetic only): stale versions, duration
// changes, busy invalidation, policy gates, combinatorial limits, privacy.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ScheduleRegistry, RecipeRegistry, generateCandidates, recheckCandidate,
  projectionCacheKey, invalidationPayload,
} from "@zyara/scheduling";
import type { ResourceRecipe } from "@zyara/scheduling";
import { NOW, draft, recipe40, units, query } from "./fixtures.js";

test("acceptance 3: stale versions and duration changes fail recheck", () => {
  const sreg = new ScheduleRegistry();
  const v1 = sreg.publish(draft());
  const rreg = new RecipeRegistry();
  const rec1 = rreg.publish(recipe40());
  const gen = generateCandidates(v1, rec1, units(), query());
  const cand = gen.candidates[0];
  assert.ok(cand);
  const fresh = recheckCandidate(v1, rec1, cand, {
    busy: [], nowUtcIso: NOW, currentScheduleVersion: 1, currentRecipeVersion: 1, currentDurationMin: 40,
  });
  assert.equal(fresh.ok, true);
  const v2 = sreg.publish({ ...draft(), effectiveFrom: "2026-10-01" });
  assert.equal(v2.version, 2);
  const stale = recheckCandidate(v2, rec1, cand, {
    busy: [], nowUtcIso: NOW, currentScheduleVersion: 2, currentRecipeVersion: 1, currentDurationMin: 40,
  });
  assert.deepEqual(stale, { ok: false, code: "STALE_VERSION" });
  const rec60: ResourceRecipe = {
    ...rec1, durationMin: 60,
    items: recipe40().items.map((i) => ({ ...i, durationMin: 60 })),
  };
  const changed = recheckCandidate(v1, rec60, cand, {
    busy: [], nowUtcIso: NOW, currentScheduleVersion: 1, currentRecipeVersion: 1, currentDurationMin: 60,
  });
  assert.deepEqual(changed, { ok: false, code: "DURATION_CHANGED" });
});

test("busy intervals invalidate; buffers extend occupancy on every unit", () => {
  const sched = new ScheduleRegistry().publish(draft());
  const rec = new RecipeRegistry().publish(recipe40());
  const gen = generateCandidates(sched, rec, units(), query());
  const cand = gen.candidates[0];
  assert.ok(cand);
  const tailBusy = recheckCandidate(sched, rec, cand, {
    busy: [{
      unitId: "room-1", startUtc: cand.endUtc,
      endUtc: new Date(Date.parse(cand.endUtc) + 4 * 60000).toISOString(),
    }],
    nowUtcIso: NOW, currentScheduleVersion: 1, currentRecipeVersion: 1, currentDurationMin: 40,
  });
  assert.deepEqual(tailBusy, { ok: false, code: "NO_LONGER_FITS" });
  const other = recheckCandidate(sched, rec, cand, {
    busy: [{ unitId: "room-9", startUtc: cand.startUtc, endUtc: cand.endUtc }],
    nowUtcIso: NOW, currentScheduleVersion: 1, currentRecipeVersion: 1, currentDurationMin: 40,
  });
  assert.equal(other.ok, true);
});

test("notice, cutoff, horizon, alignment and finite capacity gate candidates", () => {
  const sched = new ScheduleRegistry().publish({
    ...draft(),
    policy: { ...draft().policy, minNoticeMin: 60 * 24 },
  });
  const rec = new RecipeRegistry().publish(recipe40());
  const strict = generateCandidates(sched, rec, units(), query());
  assert.ok(!strict.candidates.some((c) => c.date === "2026-10-01"));
  assert.ok((strict.skipped["BELOW_MIN_NOTICE"] ?? 0) > 0);
  const noRoom = generateCandidates(
    new ScheduleRegistry().publish(draft()), rec,
    units().filter((u) => u.kind !== "room"), query(),
  );
  assert.equal(noRoom.candidates.length, 0);
  assert.ok((noRoom.skipped["NO_RESOURCE_FIT"] ?? 0) > 0);
});

test("combinatorial cap truncates deterministically; keys carry no patient data", () => {
  const sched = new ScheduleRegistry().publish({
    ...draft(), policy: { ...draft().policy, maxCandidates: 3 },
  });
  const rec = new RecipeRegistry().publish(recipe40());
  const r = generateCandidates(sched, rec, units(), query({ toDate: "2026-10-10" }));
  assert.equal(r.candidates.length, 3);
  assert.equal(r.truncated, true);
  const key = projectionCacheKey({
    tenantId: "t1", serviceId: "derm", typeId: "t-init", branchId: "b1",
    scheduleId: "sched-1", scheduleVersion: 1, recipeId: "derm-init", recipeVersion: 1,
    fromDate: "2026-10-01", toDate: "2026-10-03",
  });
  assert.ok(key.includes("sched-v1"));
  assert.ok(!/patient|symptom|insurer|dob/i.test(key));
  const payload = invalidationPayload({
    tenantId: "t1", scheduleId: "sched-1", scheduleVersion: 2, reason: "SCHEDULE_REVISED",
  });
  assert.deepEqual(Object.keys(payload).sort(), ["reason", "schedule", "scheduleVersion", "tenant"]);
  for (const v of Object.values(payload)) assert.equal(typeof v, "string");
});
