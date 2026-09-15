// M015 state-machine proofs (synthetic only): propose/replay/conflict,
// all-or-none, lock order, caps, extensions, sweep, redeem ordering.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  proposeHold, redeemHold, extendHold, sweepExpired, allItemsFree,
  lockOrderFor, digestHoldRequest, validateHoldRequest, DEFAULT_HOLD_CAPS,
} from "@zyara/scheduling";
import { T0, SLOT_A, holdReq, visibleEmpty } from "./fixtures.js";

test("propose allocates with deterministic lock order; digest is stable", () => {
  const req = holdReq({
    items: [
      { unitId: "room-9", ...SLOT_A },
      { unitId: "doc-2", ...SLOT_A },
      { unitId: "doc-2", ...SLOT_A },
    ],
  });
  const out = proposeHold(req, T0, visibleEmpty("h-1"));
  assert.equal(out.ok, true);
  if (out.ok) {
    assert.equal(out.replayed, false);
    assert.deepEqual(out.hold.lockOrder, ["doc-2", "room-9"]);
    assert.equal(out.hold.state, "held");
    assert.equal(out.hold.expiresAtDb, "2026-10-01T06:10:00.000Z");
  }
  assert.deepEqual(lockOrderFor(req.items), ["doc-2", "room-9"]);
  assert.equal(digestHoldRequest(req), digestHoldRequest({ ...req, idempotencyKey: "other" }));
});

test("same key + same digest replays; same key + changed body conflicts", () => {
  const req = holdReq();
  const first = proposeHold(req, T0, visibleEmpty("h-1"));
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const replay = proposeHold(req, T0, { byKey: first.hold, activeForActorService: 1, nextId: "h-2" });
  assert.equal(replay.ok, true);
  if (replay.ok) {
    assert.equal(replay.replayed, true);
    assert.equal(replay.hold.id, "h-1");
  }
  const changed = proposeHold(
    { ...req, items: [{ unitId: "room-2", ...SLOT_A }] }, T0,
    { byKey: first.hold, activeForActorService: 1, nextId: "h-3" },
  );
  assert.deepEqual(changed, { ok: false, code: "IDEMPOTENCY_CONFLICT", existingId: "h-1" });
});

test("abuse cap and request caps reject before allocating", () => {
  const capped = proposeHold(holdReq(), T0, { byKey: null, activeForActorService: 5, nextId: "h-x" });
  assert.deepEqual(capped, { ok: false, code: "HOLD_LIMIT_REACHED" });
  assert.throws(() => validateHoldRequest(holdReq({ ttlMin: 60 })), /HOLD_TTL_INVALID/);
  assert.throws(() => validateHoldRequest(holdReq({ items: [] })), /HOLD_ITEMS_INVALID/);
  assert.throws(
    () => validateHoldRequest(holdReq({ items: [{ unitId: "u", startUtc: SLOT_A.endUtc, endUtc: SLOT_A.startUtc }] })),
    /HOLD_INTERVAL_EMPTY/,
  );
  assert.equal(DEFAULT_HOLD_CAPS.maxActivePerActorService, 5);
});

test("acceptance 2: multi-resource hold is all-or-none", () => {
  const items = [
    { unitId: "doc-1", ...SLOT_A },
    { unitId: "room-1", ...SLOT_A },
  ];
  assert.equal(allItemsFree(items, [], 5, 5), true);
  // Overlap on the room only: the whole hold fails, never a partial write.
  const active = [{ unitId: "room-1", ...SLOT_A }];
  assert.equal(allItemsFree(items, active, 5, 5), false);
  // Buffered tail only (cleanup overlap): still blocked.
  const tail = [{ unitId: "room-1", startUtc: "2026-10-01T07:40:00.000Z", endUtc: "2026-10-01T07:44:00.000Z" }];
  assert.equal(allItemsFree(items, tail, 5, 5), false);
  assert.equal(allItemsFree(items, [{ unitId: "room-9", ...SLOT_A }], 5, 5), true);
});

test("sweep reaps by DB time; redeem checks expiry first (acceptance 3)", () => {
  const req = holdReq({ ttlMin: 10 });
  const created = proposeHold(req, T0, visibleEmpty("h-1"));
  assert.equal(created.ok, true);
  if (!created.ok) return;
  const sweep = sweepExpired([created.hold], "2026-10-01T06:10:00.000Z");
  assert.deepEqual(sweep.expiredIds, ["h-1"]);
  const before = sweepExpired([created.hold], "2026-10-01T06:09:59.999Z");
  assert.deepEqual(before.expiredIds, []);
  // Worker never ran, clock moved past expiry: redeem still refuses.
  const late = redeemHold(created.hold, "2026-10-01T07:00:00.000Z", { scheduleVersion: 1, recipeVersion: 1 });
  assert.deepEqual(late, { ok: false, code: "HOLD_EXPIRED" });
  const fresh = redeemHold(created.hold, "2026-10-01T06:05:00.000Z", { scheduleVersion: 1, recipeVersion: 1 });
  assert.equal(fresh.ok, true);
  if (fresh.ok) assert.equal(fresh.hold.state, "committed");
  const stale = redeemHold(created.hold, "2026-10-01T06:05:00.000Z", { scheduleVersion: 2, recipeVersion: 1 });
  assert.deepEqual(stale, { ok: false, code: "HOLD_STALE_VERSION" });
});

test("extensions are bounded by count and total lifetime", () => {
  const created = proposeHold(holdReq({ ttlMin: 10, maxExtensions: 1 }), T0, visibleEmpty("h-1"));
  assert.equal(created.ok, true);
  if (!created.ok) return;
  const first = extendHold(created.hold, "2026-10-01T06:05:00.000Z", 10);
  assert.equal(first.ok, true);
  if (!first.ok) return;
  assert.equal(first.hold.extensionsUsed, 1);
  const second = extendHold(first.hold, "2026-10-01T06:06:00.000Z", 10);
  assert.deepEqual(second, { ok: false, code: "HOLD_EXTENSION_EXHAUSTED" });
  const within = extendHold(created.hold, "2026-10-01T06:05:00.000Z", 30);
  assert.equal(within.ok, true); // 10 + 30 = 40min total, under the 60min cap
  // Total-lifetime boundary: ttl 10 + 30 + 30 = 70min > 60min cap.
  const long = proposeHold(holdReq({ ttlMin: 10, maxExtensions: 2 }), T0, visibleEmpty("h-long"));
  assert.equal(long.ok, true);
  if (!long.ok) return;
  const e1 = extendHold(long.hold, "2026-10-01T06:05:00.000Z", 30);
  assert.equal(e1.ok, true);
  if (!e1.ok) return;
  const e2 = extendHold(e1.hold, "2026-10-01T06:06:00.000Z", 30);
  assert.deepEqual(e2, { ok: false, code: "HOLD_TOTAL_EXCEEDED" });
  const late = extendHold(created.hold, "2026-10-01T07:00:00.000Z", 5);
  assert.deepEqual(late, { ok: false, code: "HOLD_EXPIRED" });
});
