// M014 timezone proofs (synthetic only): Riyadh steady zone; Berlin and
// New York spring gaps reject; Berlin and New York fall folds need explicit
// offset choice; civil time is never silently altered.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assertValidZone, civilFromUtc, resolveLocalToUtc, offsetAtUtc, runtimeTzdbLabel,
} from "@zyara/scheduling";

test("Riyadh is steady: same offset across seasons, wall time round-trips", () => {
  assertValidZone("Asia/Riyadh");
  const winter = civilFromUtc("Asia/Riyadh", "2026-01-15T07:00:00.000Z");
  const summer = civilFromUtc("Asia/Riyadh", "2026-07-15T07:00:00.000Z");
  assert.equal(winter.offsetMin, 180);
  assert.equal(summer.offsetMin, 180);
  assert.equal(winter.date, "2026-01-15");
  assert.equal(winter.time, "10:00");
  assert.equal(summer.time, "10:00");
  const back = resolveLocalToUtc("Asia/Riyadh", { date: "2026-07-15", time: "10:00" });
  assert.equal(back.status, "ok");
  if (back.status === "ok") assert.equal(back.point.utcIso, "2026-07-15T07:00:00.000Z");
});

test("Berlin spring gap rejects with nearest valid local time", () => {
  // 2026-03-29 02:30 does not exist in Europe/Berlin (spring forward).
  const r = resolveLocalToUtc("Europe/Berlin", { date: "2026-03-29", time: "02:30" });
  assert.equal(r.status, "gap");
  if (r.status === "gap") {
    assert.equal(r.reason, "DST_GAP");
    assert.ok(r.nearestValidLocal.date === "2026-03-29");
    assert.ok(r.nearestValidLocal.time >= "03:00");
  }
  const before = offsetAtUtc("Europe/Berlin", Date.parse("2026-03-29T00:30:00.000Z"));
  const after = offsetAtUtc("Europe/Berlin", Date.parse("2026-03-29T02:30:00.000Z"));
  assert.notEqual(before, after);
});

test("Berlin fall fold is ambiguous until the caller chooses an offset", () => {
  // 2026-10-25 02:30 happens twice in Europe/Berlin (fall back).
  const bare = resolveLocalToUtc("Europe/Berlin", { date: "2026-10-25", time: "02:30" });
  assert.equal(bare.status, "ambiguous");
  if (bare.status === "ambiguous") {
    assert.equal(bare.options.length, 2);
    assert.notEqual(bare.options[0]?.utcIso, bare.options[1]?.utcIso);
    for (const opt of bare.options) assert.equal(opt.disambiguated, false);
    const first = resolveLocalToUtc(
      "Europe/Berlin", { date: "2026-10-25", time: "02:30" },
      { offsetMin: bare.options[0]?.offsetMin },
    );
    assert.equal(first.status, "ok");
    if (first.status === "ok") {
      assert.equal(first.point.disambiguated, true);
      assert.equal(first.point.utcIso, bare.options[0]?.utcIso);
    }
    assert.throws(
      () => resolveLocalToUtc("Europe/Berlin", { date: "2026-10-25", time: "02:30" }, { offsetMin: 999 }),
      /OFFSET_CHOICE_INVALID/,
    );
  }
});

test("New York gap and fold behave the same: reject, then explicit choice", () => {
  const gap = resolveLocalToUtc("America/New_York", { date: "2026-03-08", time: "02:30" });
  assert.equal(gap.status, "gap");
  const fold = resolveLocalToUtc("America/New_York", { date: "2026-11-01", time: "01:30" });
  assert.equal(fold.status, "ambiguous");
  if (fold.status === "ambiguous") {
    const chosen = resolveLocalToUtc(
      "America/New_York", { date: "2026-11-01", time: "01:30" },
      { offsetMin: fold.options[1]?.offsetMin },
    );
    assert.equal(chosen.status, "ok");
  }
});

test("civil time is never silently altered; tzdb label is recorded", () => {
  assert.throws(() => resolveLocalToUtc("Mars/Olympus", { date: "2026-01-01", time: "10:00" }), /UNKNOWN_TIME_ZONE/);
  assert.throws(() => resolveLocalToUtc("Asia/Riyadh", { date: "2026-13-01", time: "10:00" }), /CIVIL/);
  assert.throws(() => civilFromUtc("Asia/Riyadh", "not-a-time"), /UTC_ISO_INVALID/);
  assert.match(runtimeTzdbLabel(), /^icu-tzdata\//);
});
