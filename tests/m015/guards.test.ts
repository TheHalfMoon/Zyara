// M015 guards (synthetic only): SQL authority inspection, five-locale copy,
// privacy-safe telemetry, no forbidden primitives.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  HOLD_EXPLANATIONS, explainHold, telemetryForHolds,
} from "@zyara/scheduling";
import { SUPPORTED_LOCALES, directionForLocale } from "@zyara/domain";

test("exclusion constraint is the authority; no now() predicate, no Redis lock", () => {
  const sql = readFileSync(new URL("../../db/migrations/015_reservation_holds.sql", import.meta.url), "utf8");
  assert.ok(sql.includes("CREATE EXTENSION IF NOT EXISTS btree_gist"));
  assert.ok(sql.includes("EXCLUDE USING gist"));
  assert.ok(sql.includes("occupied WITH &&"));
  assert.ok(sql.includes("WHERE (active)"));
  assert.ok(sql.includes("UNIQUE (tenant_id, idempotency_key)"));
  assert.ok(sql.includes("FORCE ROW LEVEL SECURITY"));
  const code = sql.split("\n").filter((l) => !l.trimStart().startsWith("--")).join("\n");
  assert.ok(!/now\(\)/i.test(code), "DB time via statement_timestamp, never now()");
  assert.ok(code.includes("statement_timestamp()"));
  assert.ok(!/GRANT\s+.*DELETE/i.test(sql));
  const src = readFileSync(new URL("../../packages/scheduling/src/reservations.ts", import.meta.url), "utf8");
  assert.ok(!/from ["'](redis|ioredis)[^"']*["']|require\(["'](redis|ioredis)/i.test(src));
  assert.ok(!/new\s+(Redis|Redlock|Cluster)/.test(src));
  assert.ok(!/eval\(|Function\(/.test(src));
  assert.ok(!/openai|anthropic/i.test(src));
  assert.ok(src.includes("expiry worker never ran"));
});

test("five-locale held/expiry/reconfirmation copy; Arabic RTL flagged for review", () => {
  assert.deepEqual([...SUPPORTED_LOCALES], ["ar", "en", "fr", "de", "es"]);
  assert.equal(directionForLocale("ar"), "rtl");
  for (const locale of SUPPORTED_LOCALES) {
    const catalog = HOLD_EXPLANATIONS[locale];
    assert.ok(catalog["holds.held"].length > 0, locale);
    assert.ok(catalog["holds.expired"].length > 0, locale);
    assert.ok(explainHold(locale, "HELD").length > 0, locale);
    assert.ok(explainHold(locale, "EXPIRED").length > 0, locale);
    assert.ok(explainHold(locale, "NEEDS_RECONFIRMATION").length > 0, locale);
    assert.ok(explainHold(locale, "CONFLICT").length > 0, locale);
  }
  const src = readFileSync(new URL("../../packages/scheduling/src/hold-explanations.ts", import.meta.url), "utf8");
  assert.ok(/human review/i.test(src));
});

test("telemetry carries counts and versions only", () => {
  const t = telemetryForHolds({
    proposed: 100, replayed: 3, conflicts: 1, expired: 7,
    redeemed: 90, deadlocks: 0, versions: ["sched-v2"],
  });
  assert.deepEqual(Object.keys(t).sort(), [
    "conflicts", "deadlocks", "expired", "proposed", "redeemed", "replayed", "versions",
  ]);
  assert.ok(!JSON.stringify(t).includes("actor-1"));
});
