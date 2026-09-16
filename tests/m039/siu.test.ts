// M039 synthetic qualification (child packet M039.1: SIU transport).
import assert from "node:assert";
import { describe, it } from "node:test";
import { buildAck, fallbackSemantics, parseSiuS12 } from "@zyara/legacy-ingest";

const VALID = [
  "MSH|^~\\&|LEG|LEG|ZY|ZY|20260920||SIU^S12|MSG-1|P|2.5",
  "EVN|S12|20260920",
  "PID|1||PAT-7",
  "SCH|SCH-3||2026-09-21T08:00:00Z|2026-09-21T08:30:00Z",
].join("\r");

describe("M039 SIU ingestion", () => {
  it("parses a valid S12 with unknown segments tolerated", () => {
    const res = parseSiuS12(`${VALID}\rZ99|custom|tolerated`);
    assert.equal("error" in res, false);
    if (!("error" in res)) {
      assert.equal(res.patientId, "PAT-7");
      assert.equal(res.scheduleId, "SCH-3");
      assert.equal(res.startUtc, "2026-09-21T08:00:00.000Z");
    }
  });
  it("rejects missing segments, bad events, invalid times", () => {
    assert.equal("error" in parseSiuS12("PID|1||X"), true);
    assert.equal("error" in parseSiuS12("MSH|a\rPID|1||X"), true);
    const noPid = parseSiuS12("MSH|^~\\&|a\rEVN|S12|x\rSCH|1||2026-09-21T08:00:00Z|2026-09-21T08:30:00Z");
    assert.equal("error" in noPid, true);
    const badTime = parseSiuS12(VALID.replace("08:30:00Z", "08:00:00Z"));
    assert.equal("error" in badTime, true);
    const badEvent = parseSiuS12(VALID.replace("EVN|S12", "EVN|S13"));
    assert.equal("error" in badEvent, true);
  });
  it("builds distinct ACK classes", () => {
    assert.ok(buildAck("MSG-1", "AA", "ok").includes("MSA|AA|MSG-1"));
    assert.ok(buildAck("MSG-1", "AE", "retry").includes("MSA|AE|MSG-1"));
    assert.ok(buildAck("MSG-1", "AR", "reject").includes("MSA|AR|MSG-1"));
  });
  it("fallback modes stay honest: no holds, no clinical authority", () => {
    for (const mode of ["batch-import", "calendar-read"] as const) {
      const fb = fallbackSemantics(mode);
      assert.equal(fb.honestInvitationOnly, true);
      assert.equal(fb.createsHold, false);
      assert.equal(fb.clinicalAuthority, false);
    }
  });
});
