// M055 synthetic qualification.
import assert from "node:assert";
import { describe, it } from "node:test";
import {
  canAct,
  issueGrant,
  revokeGrant,
  type CaregiverAudit,
} from "@zyara/caregiver-access";

const NOW = "2026-09-20T00:00:00.000Z";
const LATER = "2026-12-01T00:00:00.000Z";

describe("M055 caregiver permissions", () => {
  it("refuses self-grants and unverified grants", () => {
    assert.equal("error" in issueGrant({
      grantId: "g1", caregiverId: "p1", patientId: "p1",
      scope: "booking-manage", verifiedByPatient: true, expiresAtUtc: LATER,
    }), true);
    assert.equal("error" in issueGrant({
      grantId: "g1", caregiverId: "c1", patientId: "p1",
      scope: "booking-manage", verifiedByPatient: false, expiresAtUtc: LATER,
    }), true);
  });
  it("enforces scope, expiry and revocation", () => {
    const grant = issueGrant({
      grantId: "g1", caregiverId: "c1", patientId: "p1",
      scope: "booking-manage", verifiedByPatient: true, expiresAtUtc: LATER,
    });
    assert.equal("error" in grant, false);
    if (!("error" in grant)) {
      assert.equal(canAct(grant, "booking-manage", NOW), true);
      assert.equal(canAct(grant, "documents-view", NOW), false);
      assert.equal(canAct(grant, "booking-manage", "2027-01-01T00:00:00.000Z"), false);
      const log: CaregiverAudit[] = [];
      const revoked = revokeGrant(grant, NOW, log, "p1");
      assert.equal(canAct(revoked, "booking-manage", NOW), false);
      assert.equal(log.length, 1);
    }
  });
});
