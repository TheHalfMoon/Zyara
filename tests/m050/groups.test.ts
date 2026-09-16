// M050 synthetic qualification.
import assert from "node:assert";
import { describe, it } from "node:test";
import {
  addFamilyMember,
  cancelFamilyMember,
  joinGroupSession,
  rosterFor,
  type FamilyLink,
  type GroupSession,
} from "@zyara/group-care";

const SESSION: GroupSession = {
  sessionId: "g1", tenantId: "t1", serviceId: "svc-group", capacity: 2, roster: [],
};

describe("M050 group and family care", () => {
  it("enforces capacity, eligibility and consent on join", () => {
    assert.equal("error" in joinGroupSession(SESSION, "p1", true, false), true);
    assert.equal("error" in joinGroupSession(SESSION, "p1", false, true), true);
    const one = joinGroupSession(SESSION, "p1", true, true);
    assert.equal("error" in one, false);
    if (!("error" in one)) {
      assert.equal("error" in joinGroupSession(one, "p1", true, true), true);
      const two = joinGroupSession(one, "p2", true, true);
      assert.equal("error" in two, false);
      if (!("error" in two)) {
        assert.equal("error" in joinGroupSession(two, "p3", true, true), true);
      }
    }
  });
  it("links family members with per-patient consent and records", () => {
    const link: FamilyLink = { linkId: "f1", slotId: "slot-1", members: [] };
    assert.equal("error" in addFamilyMember(link, "p1", "b1", false), true);
    const one = addFamilyMember(link, "p1", "b1", true);
    assert.equal("error" in one, false);
    if (!("error" in one)) {
      const two = addFamilyMember(one, "p2", "b2", true);
      assert.equal("error" in two, false);
      if (!("error" in two)) {
        assert.notEqual(two.members[0].bookingId, two.members[1].bookingId);
        const cancelled = cancelFamilyMember(two, "p1");
        assert.equal(cancelled.members[0].state, "cancelled");
        assert.equal(cancelled.members[1].state, "booked");
      }
    }
  });
  it("roster exposes attendance only", () => {
    const one = joinGroupSession(SESSION, "p1", true, true);
    assert.equal("error" in one, false);
    if (!("error" in one)) {
      const roster = rosterFor(one, "p1");
      assert.deepEqual(Object.keys(roster[0]).sort(), ["patientId", "present"]);
    }
  });
});
