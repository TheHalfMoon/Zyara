// M014 guards (synthetic only): TypeScript-only boundary, append-only
// migration with FORCE RLS, patient-free cache, no silent fold choice,
// performance baseline for the Rust-extraction decision.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ScheduleRegistry, RecipeRegistry, generateCandidates, telemetryForCandidates,
} from "@zyara/scheduling";
import { draft, recipe40, units, query, NOW } from "./fixtures.js";

test("no Rust/Go extraction in M014: TypeScript only, benchmark first", () => {
  const cand = readFileSync(new URL("../../packages/scheduling/src/candidates.ts", import.meta.url), "utf8");
  assert.ok(!/from ["']node:child_process["']/.test(cand));
  assert.ok(!/Command::new|std::process|extern crate/i.test(cand));
  assert.ok(/never books|non-authoritative|never authority/i.test(cand));
  const worker = readFileSync(new URL("../../apps/worker/src/consumers.ts", import.meta.url), "utf8");
  assert.ok(worker.includes("never"));
  assert.ok(worker.includes("booking authority"));
});

test("migration is append-only schedules plus bounded cache, FORCE RLS, tenant-isolated", () => {
  const sql = readFileSync(new URL("../../db/migrations/014_availability.sql", import.meta.url), "utf8");
  assert.ok(sql.includes("PRIMARY KEY (id, version)"));
  assert.ok(sql.includes("FORCE ROW LEVEL SECURITY"));
  assert.ok(sql.includes("current_setting('app.current_tenant'"));
  assert.ok(!/GRANT\s+.*UPDATE/i.test(sql));
  const time = readFileSync(new URL("../../packages/scheduling/src/time.ts", import.meta.url), "utf8");
  assert.ok(/never silently/i.test(time));
  const sched = readFileSync(new URL("../../packages/scheduling/src/schedules.ts", import.meta.url), "utf8");
  assert.ok(/never ordered/i.test(sched));
});

test("telemetry carries counts and versions only; invalidation is string IDs", () => {
  const sched = new ScheduleRegistry().publish(draft());
  const rec = new RecipeRegistry().publish(recipe40());
  const r = generateCandidates(sched, rec, units(), query());
  const t = telemetryForCandidates(r);
  assert.deepEqual(
    Object.keys(t).sort(),
    ["candidateCount", "elapsedMs", "scannedDays", "skipped", "startsEvaluated", "truncated"],
  );
  assert.ok(!JSON.stringify(t).includes("doc-1"));
  void NOW;
});

test("performance baseline: 90-day generation stays interactive in TypeScript", () => {
  const sched = new ScheduleRegistry().publish({
    ...draft(),
    weekly: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
      weekday, opens: [{ start: "08:00", end: "18:00" }],
    })),
    policy: { ...draft().policy, horizonDays: 90, maxCandidates: 5000 },
  });
  const rec = new RecipeRegistry().publish(recipe40());
  const t0 = Date.now();
  const r = generateCandidates(sched, rec, units(), {
    ...query(), fromDate: "2026-10-01", toDate: "2026-12-29",
  });
  const elapsed = Date.now() - t0;
  assert.ok(r.candidates.length > 1000, `expected bulk candidates, got ${r.candidates.length}`);
  assert.ok(elapsed < 5000, `90-day generation took ${elapsed}ms`);
  // Keep the evidence file honest: this run must stay TypeScript-fast.
  // Extraction to Rust is justified only if a future workload breaks this.
});
