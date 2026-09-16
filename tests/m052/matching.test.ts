// M052 synthetic qualification.
import assert from "node:assert";
import { describe, it } from "node:test";
import {
  importAllowed,
  matchPatient,
  recordMerge,
  unmerge,
  validatePatientImport,
  type LocalPatient,
} from "@zyara/patient-matching";

const LOCAL: LocalPatient = {
  patientId: "local-1",
  identifiers: [{ system: "nat-id", value: "123" }],
  family: " Haddad ",
  birthDate: "1990-01-01",
};

describe("M052 patient matching", () => {
  it("matches exactly, reviews conflicts, misses cleanly", () => {
    const exact = matchPatient(
      { identifiers: [{ system: "nat-id", value: "123" }], family: " Haddad ", birthDate: "1990-01-01" },
      [LOCAL],
    );
    assert.equal(exact.outcome, "match");
    const conflict = matchPatient(
      { identifiers: [{ system: "nat-id", value: "123" }, { system: "mrn", value: "A" }], family: " Haddad ", birthDate: "1990-01-01" },
      [{ ...LOCAL, identifiers: [...LOCAL.identifiers, { system: "mrn", value: "B" }] }],
    );
    assert.equal(conflict.outcome, "review");
    const none = matchPatient(
      { identifiers: [{ system: "nat-id", value: "999" }], family: "X", birthDate: "2000-01-01" },
      [LOCAL],
    );
    assert.equal(none.outcome, "no-match");
  });
  it("rejects invalid imports and gates on care consent", () => {
    assert.equal("error" in validatePatientImport({ resourceType: "Patient" }), true);
    assert.equal("error" in validatePatientImport({ resourceType: "Patient", id: "p", identifier: [] }), true);
    assert.equal("ok" in validatePatientImport({
      resourceType: "Patient", id: "p",
      identifier: [{ system: "nat-id", value: "1" }],
    }), true);
    const grants = [
      { patientId: "p1", purpose: "care" as const, granted: true, atUtc: "2026-01-01T00:00:00.000Z", revokedAtUtc: null },
    ];
    assert.equal(importAllowed(grants, "p1", "2026-09-20T00:00:00.000Z"), true);
    assert.equal(importAllowed([], "p1", "2026-09-20T00:00:00.000Z"), false);
  });
  it("preserves merge and unmerge history", () => {
    const h = recordMerge([], {
      atUtc: "2026-09-20T00:00:00.000Z", survivingId: "a",
      absorbedId: "b", actorId: "staff", reason: "duplicate",
    });
    assert.equal(h.length, 1);
    const undone = unmerge(h, "b", "2026-09-21T00:00:00.000Z");
    assert.equal(undone[0].undone, true);
    assert.equal(undone.length, 1);
  });
});
