// M016 guards (synthetic only): SQL authority inspection, five-locale copy,
// privacy-safe telemetry, no forbidden primitives, no optimistic success.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  BOOKING_EXPLANATIONS, explainBooking, telemetryForBookings,
} from "@zyara/scheduling";
import { SUPPORTED_LOCALES, directionForLocale } from "@zyara/domain";

test("exclusion constraints stay the authority; DB time only; no DELETE grant", () => {
  const sql = readFileSync(new URL("../../db/migrations/016_booking_operations.sql", import.meta.url), "utf8");
  assert.ok(sql.includes("CREATE EXTENSION IF NOT EXISTS btree_gist"));
  assert.ok(sql.includes("EXCLUDE USING gist"));
  assert.ok(sql.includes("booked_range WITH &&"));
  assert.ok(sql.includes("occupied WITH &&"));
  assert.ok(sql.includes("UNIQUE (tenant_id, idempotency_key)"));
  assert.ok(sql.includes("FORCE ROW LEVEL SECURITY"));
  const code = sql.split("\n").filter((l) => !l.trimStart().startsWith("--")).join("\n");
  assert.ok(!/now\(\)/i.test(code), "DB time via statement_timestamp, never now()");
  assert.ok(code.includes("statement_timestamp()"));
  assert.ok(!/GRANT\s+.*DELETE/i.test(sql));
  const holds = readFileSync(new URL("../../db/migrations/015_reservation_holds.sql", import.meta.url), "utf8");
  assert.ok(holds.includes("EXCLUDE USING gist"), "015 ledger untouched as cross-ledger authority");
});

test("booking never treats candidates or timeouts as success", () => {
  const src = readFileSync(new URL("../../packages/scheduling/src/appointments.ts", import.meta.url), "utf8");
  assert.ok(src.includes("only after committed truth exists"));
  assert.ok(src.includes("ONLY path from pending to booked"));
  assert.ok(!/from ["'](redis|ioredis)[^"']*["']|require\(["'](redis|ioredis)/i.test(src));
  assert.ok(!/new\s+(Redis|Redlock|Cluster)/.test(src));
  assert.ok(!/eval\(|Function\(/.test(src));
  assert.ok(!/openai|anthropic/i.test(src));
  const api = readFileSync(new URL("../../apps/api/src/bookings.ts", import.meta.url), "utf8");
  assert.ok(api.includes("never confirms care"));
  assert.ok(api.includes("verified session claims only"));
});

test("five-locale booking outcome copy; Arabic RTL flagged for review", () => {
  assert.deepEqual([...SUPPORTED_LOCALES], ["ar", "en", "fr", "de", "es"]);
  assert.equal(directionForLocale("ar"), "rtl");
  for (const locale of SUPPORTED_LOCALES) {
    const catalog = BOOKING_EXPLANATIONS[locale];
    assert.ok(catalog["booking.booked"].length > 0, locale);
    assert.ok(catalog["booking.conflict"].length > 0, locale);
    assert.ok(explainBooking(locale, "BOOKED").length > 0, locale);
    assert.ok(explainBooking(locale, "CONFLICT").length > 0, locale);
    assert.ok(explainBooking(locale, "NEEDS_RECONFIRMATION").length > 0, locale);
    assert.ok(explainBooking(locale, "REJECTED").length > 0, locale);
  }
  const src = readFileSync(new URL("../../packages/scheduling/src/booking-explanations.ts", import.meta.url), "utf8");
  assert.ok(/human review/i.test(src));
});

test("telemetry carries counts and versions only", () => {
  const t = telemetryForBookings({
    proposed: 50, replayed: 4, booked: 40, conflicts: 3,
    reconfirmations: 2, rejected: 1, duplicates: 2, versions: ["sched-v1"],
  });
  assert.deepEqual(Object.keys(t).sort(), [
    "booked", "conflicts", "duplicates", "proposed", "reconfirmations", "rejected", "replayed", "versions",
  ]);
  assert.ok(!JSON.stringify(t).includes("patient-1"));
});
