// M038 synthetic qualification.
import assert from "node:assert";
import { describe, it } from "node:test";
import {
  mapAppointmentStatus,
  mapSlot,
  paginate,
  validateAppointmentReferences,
} from "@zyara/fhir-adapter";

describe("M038 FHIR mapping", () => {
  it("maps slots with time/reference/extension handling", () => {
    const ok = mapSlot({
      resourceType: "Slot", id: "s1", status: "free",
      start: "2026-09-21T08:00:00Z", end: "2026-09-21T08:30:00Z",
      extension: [{ url: "http://example.org/unknown" }],
    });
    assert.equal("error" in ok, false);
    if (!("error" in ok)) {
      assert.equal(ok.state, "free");
      assert.deepEqual(ok.preservedExtensions, ["http://example.org/unknown"]);
    }
    assert.equal("error" in mapSlot({
      resourceType: "Slot", status: "free",
      start: "2026-09-21T08:00:00Z", end: "2026-09-21T08:30:00Z",
    } as never), true);
    assert.equal("error" in mapSlot({
      resourceType: "Slot", id: "s2", status: "free",
      start: "bad", end: "2026-09-21T08:30:00Z",
    }), true);
    assert.equal("error" in mapSlot({
      resourceType: "Slot", id: "s3", status: "entered-in-error",
      start: "2026-09-21T08:00:00Z", end: "2026-09-21T08:30:00Z",
    }), true);
  });
  it("maps appointment statuses and rejects entered-in-error", () => {
    assert.equal(mapAppointmentStatus("booked"), "booked");
    assert.equal(mapAppointmentStatus("checked-in"), "booked");
    assert.equal(mapAppointmentStatus("noshow"), "noshow");
    assert.equal("error" in (mapAppointmentStatus("entered-in-error") as object), true);
  });
  it("requires participant references", () => {
    const valid = validateAppointmentReferences({
      resourceType: "Appointment", id: "a1",
      status: "booked",
      participant: [{ actor: { reference: "Patient/p1" } }],
    });
    assert.equal("ok" in valid, true);
    const missing = validateAppointmentReferences({
      resourceType: "Appointment", id: "a2", status: "booked", participant: [],
    });
    assert.equal("error" in missing, true);
  });
  it("paginates deterministically", () => {
    const items = ["a", "b", "c", "d"].map((id) => ({ externalId: id }));
    const p1 = paginate(items, null, 2);
    assert.deepEqual(p1.items.map((i) => i.externalId), ["a", "b"]);
    assert.equal(p1.nextCursor, "b");
    const p2 = paginate(items, p1.nextCursor, 2);
    assert.deepEqual(p2.items.map((i) => i.externalId), ["c", "d"]);
    assert.equal(p2.nextCursor, null);
  });
});
