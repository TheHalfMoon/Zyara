// M058 synthetic qualification.
import assert from "node:assert";
import { describe, it } from "node:test";
import {
  assessLaunchReadiness,
  validatePack,
  type CountryPack,
} from "@zyara/country-pack";

const PACK: CountryPack = {
  countryCode: "SA",
  locales: ["ar", "ar-EG", "en", "ur", "tl"],
  rtl: true,
  timeZone: "Asia/Riyadh",
  quietHours: { startLocal: "21:00", endLocal: "08:00" },
  holidays: ["2026-09-23"],
  escalation: "on-call-sa",
  consentPurposes: ["care", "recall", "analytics"],
  evidenceRefs: ["docs/evidence/M055", "docs/evidence/M056"],
};

describe("M058 country pack", () => {
  it("validates pack completeness", () => {
    assert.equal(validatePack(PACK).complete, true);
    const missing = validatePack({ ...PACK, locales: [], evidenceRefs: [] });
    assert.equal(missing.complete, false);
    assert.ok(missing.missing.includes("locales"));
    assert.ok(missing.missing.includes("evidenceRefs"));
  });
  it("never claims launch readiness without real evidence", () => {
    const without = assessLaunchReadiness(PACK, false);
    assert.equal(without.launchReady, false);
    assert.ok(without.claim.startsWith("NOT launch-ready"));
    const broken = assessLaunchReadiness({ ...PACK, locales: [] }, false);
    assert.equal(broken.launchReady, false);
  });
});
