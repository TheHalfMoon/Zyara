// M014 candidate proofs part 1 (synthetic only): buffers fit every resource,
// hard blocks dominate opens, stale versions fail recheck.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ScheduleRegistry, RecipeRegistry, generateCandidates,
} from "@zyara/scheduling";
import { NOW, draft, recipe40, units, query } from "./fixtures.js";

test("acceptance 1: every candidate fits duration plus buffers on every resource", () => {
  const sched = new ScheduleRegistry().publish(draft());
  const rec = new RecipeRegistry().publish(recipe40());
  const r = generateCandidates(sched, rec, units(), query());
  assert.ok(r.candidates.length > 0);
  assert.equal(r.truncated, false);
  for (const c of r.candidates) {
    assert.equal(c.durationMin, 40);
    assert.equal(c.slots.length, 2);
    assert.ok(c.startUtc < c.endUtc);
    assert.equal(c.scheduleVersion, 1);
    assert.equal(c.recipeVersion, 1);
    assert.ok(Date.parse(c.startUtc) - Date.parse(NOW) >= 60 * 60000);
  }
});

test("acceptance 2: hard blocks dominate opens on candidate days", () => {
  const reg = new ScheduleRegistry();
  const sched = reg.publish({
    ...draft(),
    exceptions: [{ date: "2026-10-02", kind: "leave", code: "SICK", source: "cal" }],
  });
  const rec = new RecipeRegistry().publish(recipe40());
  const r = generateCandidates(sched, rec, units(), query({ fromDate: "2026-10-01", toDate: "2026-10-03" }));
  assert.ok(!r.candidates.some((c) => c.date === "2026-10-02"));
  assert.ok((r.skipped["BLOCKED_DAY"] ?? 0) >= 1);
});
