// M051 synthetic qualification.
import assert from "node:assert";
import { describe, it } from "node:test";
import {
  authorizeClinicalRead,
  authorizeMarketingUse,
  isConsented,
  revokeConsent,
  type BoundaryRead,
  type ConsentGrant,
} from "@zyara/consent-boundaries";

const GRANTS: ConsentGrant[] = [
  { patientId: "p1", purpose: "care", granted: true, atUtc: "2026-01-01T00:00:00.000Z", revokedAtUtc: null },
  { patientId: "p1", purpose: "recall", granted: true, atUtc: "2026-01-01T00:00:00.000Z", revokedAtUtc: null },
];
const NOW = "2026-09-20T00:00:00.000Z";

describe("M051 consent boundaries", () => {
  it("enforces purpose limitation; analytics never implied", () => {
    assert.equal(isConsented(GRANTS, "care", NOW), true);
    assert.equal(isConsented(GRANTS, "analytics", NOW), false);
    const log: BoundaryRead[] = [];
    assert.equal(authorizeClinicalRead(GRANTS, "staff", "p1", "analytics", NOW, log).allowed, false);
    assert.equal(authorizeClinicalRead(GRANTS, "staff", "p1", "care", NOW, log).allowed, true);
    assert.equal(log.length, 2);
  });
  it("revocation closes future reads and keeps audit", () => {
    const revoked = revokeConsent(GRANTS, "care", NOW);
    assert.equal(isConsented(revoked, "care", "2026-09-21T00:00:00.000Z"), false);
    assert.equal(isConsented(revoked, "recall", "2026-09-21T00:00:00.000Z"), true);
    const log: BoundaryRead[] = [];
    assert.equal(authorizeClinicalRead(revoked, "staff", "p1", "care", "2026-09-21T00:00:00.000Z", log).allowed, false);
    assert.equal(log[0].reason, "care-consent-required");
  });
  it("refuses marketing use unconditionally", () => {
    assert.equal(authorizeMarketingUse().allowed, false);
  });
});
