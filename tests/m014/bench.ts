// M014 performance baseline (synthetic only): recurrence expansion and
// candidate generation timings that gate the Rust-extraction decision (A27).
// Run: pnpm --filter @zyara/m014-tests bench
import {
  ScheduleRegistry, RecipeRegistry, generateCandidates, telemetryForCandidates,
} from "@zyara/scheduling";
import { draft, recipe40, units, query } from "./fixtures.js";

function bench(label: string, fn: () => { starts: number; count: number }): void {
  const samples: number[] = [];
  let last = { starts: 0, count: 0 };
  for (let i = 0; i < 5; i += 1) {
    const t0 = performance.now();
    last = fn();
    samples.push(performance.now() - t0);
  }
  samples.sort((a, b) => a - b);
  const p50 = samples[2] as number;
  const p95 = samples[samples.length - 1] as number;
  console.log(`${label}: starts=${last.starts} candidates=${last.count} p50=${p50.toFixed(1)}ms p95=${p95.toFixed(1)}ms`);
}

const schedReg = new ScheduleRegistry();
const fullWeek = schedReg.publish({
  ...draft(),
  weekly: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
    weekday, opens: [{ start: "08:00", end: "18:00" }],
  })),
  policy: { ...draft().policy, horizonDays: 90, maxCandidates: 5000 },
});
const rec = new RecipeRegistry().publish(recipe40());
const allUnits = units();

bench("7d-window ", () => {
  const r = generateCandidates(fullWeek, rec, allUnits, { ...query(), toDate: "2026-10-07" });
  const t = telemetryForCandidates(r);
  return { starts: t.startsEvaluated, count: t.candidateCount };
});

bench("30d-window", () => {
  const r = generateCandidates(fullWeek, rec, allUnits, { ...query(), toDate: "2026-10-30" });
  const t = telemetryForCandidates(r);
  return { starts: t.startsEvaluated, count: t.candidateCount };
});

bench("90d-window", () => {
  const r = generateCandidates(fullWeek, rec, allUnits, { ...query(), toDate: "2026-12-29" });
  const t = telemetryForCandidates(r);
  return { starts: t.startsEvaluated, count: t.candidateCount };
});
