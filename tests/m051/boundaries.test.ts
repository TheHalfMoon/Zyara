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
  it("compares instants, not strings, and fails closed on malformed times", () => {
    const now = "2026-09-20T12:00:00.500Z";
    // Revoked at 12:00:00Z, half a second before now: a string compare called this live.
    const revoked = [{ ...GRANTS[0], revokedAtUtc: "2026-09-20T12:00:00Z" }];
    assert.equal(isConsented(revoked, "care", now), false);
    // Granted at 14:00+03:00 = 11:00Z, before now: a string compare called this not yet granted.
    const offset = [{ ...GRANTS[0], atUtc: "2026-09-20T14:00:00+03:00" }];
    assert.equal(isConsented(offset, "care", now), true);
    // Revoked at 14:30+03:00 = 11:30Z, before now: a string compare called this still live.
    assert.equal(isConsented([{ ...GRANTS[0], revokedAtUtc: "2026-09-20T14:30:00+03:00" }], "care", now), false);
    assert.equal(isConsented([{ ...GRANTS[0], atUtc: "yesterday" }], "care", now), false);
    assert.equal(isConsented([{ ...GRANTS[0], revokedAtUtc: "2026-02-30" }], "care", now), false);
    assert.equal(isConsented(GRANTS, "care", "not-a-time"), false);
    // Impossible calendar times are refused, never rolled forward: a revocation "on 30 Feb"
    // must not keep consent live until 2 March.
    for (const impossible of ["2026-02-30T00:00:00Z", "2026-04-31T00:00:00Z", "2026-09-20T24:00:00Z", "2026-09-20T12:60:00Z"]) {
      assert.equal(isConsented([{ ...GRANTS[0], revokedAtUtc: impossible }], "care", "2026-02-28T00:00:00Z"), false, impossible);
    }
    assert.throws(() => revokeConsent(GRANTS, "care", "2026-02-30T00:00:00Z"));
  });
  it("refuses marketing use unconditionally", () => {
    assert.equal(authorizeMarketingUse().allowed, false);
  });
});
