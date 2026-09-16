// M032 synthetic qualification: single allocation, expiry retains
// original, quiet-hour deferral, ambiguous commit allocates nothing.
import assert from "node:assert";
import { describe, it } from "node:test";
import {
  MemoryOfferStore,
  acceptOffer,
  createOffer,
  expireOffers,
} from "@zyara/waitlist";

const QUIET = { startLocal: "21:00", endLocal: "08:00" };

function input(id: string, unit: string, firstContact: string) {
  return {
    id, tenantId: "t1", enrollmentId: "e-" + id, unitId: unit,
    holdBacked: true, holdId: "hold-" + id, originalAppointmentId: "appt-orig",
    offeredStartUtc: "2026-09-21T08:00:00.000Z",
    offeredEndUtc: "2026-09-21T08:30:00.000Z",
    firstContactAtUtc: firstContact, ttlMin: 60,
    timeZone: "Asia/Riyadh", quiet: QUIET,
  };
}

describe("M032 offers", () => {
  it("refuses a second live offer for one unit", () => {
    const store = new MemoryOfferStore();
    const first = createOffer(store, input("o1", "unit-1", "2026-09-20T07:00:00.000Z"));
    assert.equal("error" in first, false);
    const second = createOffer(store, input("o2", "unit-1", "2026-09-20T07:00:00.000Z"));
    assert.equal("error" in second, true);
  });
  it("accepts in time and consumes the offer", () => {
    const store = new MemoryOfferStore();
    createOffer(store, input("o1", "unit-1", "2026-09-20T07:00:00.000Z"));
    const res = acceptOffer(store, "o1", "2026-09-20T07:30:00.000Z", () => "booking-new");
    assert.equal(res.ok, true);
    assert.equal(res.replacementBookingId, "booking-new");
    assert.equal(store.get("o1")?.state, "consumed");
    const again = acceptOffer(store, "o1", "2026-09-20T07:31:00.000Z", () => "booking-x");
    assert.equal(again.ok, false);
  });
  it("late accept expires and retains the original", () => {
    const store = new MemoryOfferStore();
    createOffer(store, input("o1", "unit-1", "2026-09-20T07:00:00.000Z"));
    const res = acceptOffer(store, "o1", "2026-09-20T09:30:00.000Z", () => "booking-new");
    assert.equal(res.ok, false);
    assert.equal(res.code, "OFFER_EXPIRED");
    assert.equal(res.originalRetained, true);
    assert.equal(res.replacementBookingId, null);
  });
  it("ambiguous commit allocates nothing and retains original", () => {
    const store = new MemoryOfferStore();
    createOffer(store, input("o1", "unit-1", "2026-09-20T07:00:00.000Z"));
    const res = acceptOffer(store, "o1", "2026-09-20T07:10:00.000Z", () => null);
    assert.equal(res.ok, false);
    assert.equal(res.originalRetained, true);
    assert.equal(store.get("o1")?.state, "pending");
  });
  it("defers first contact past quiet hours and expires sweeps", () => {
    const store = new MemoryOfferStore();
    const created = createOffer(store, input("o1", "unit-9", "2026-09-20T19:30:00.000Z"));
    assert.equal("error" in created, false);
    if (!("error" in created)) {
      // 19:30Z = 22:30 Riyadh, inside quiet hours: must defer.
      assert.ok(created.firstContactAtUtc > "2026-09-20T19:30:00.000Z");
      const swept = expireOffers(store, [created], "2026-09-21T12:00:00.000Z");
      assert.equal(swept[0].state, "expired");
    }
  });
  it("honest invitation without hold is allowed", () => {
    const store = new MemoryOfferStore();
    const created = createOffer(store, {
      ...input("o1", "unit-5", "2026-09-20T07:00:00.000Z"),
      holdBacked: false, holdId: null,
    });
    assert.equal("error" in created, false);
  });
});
