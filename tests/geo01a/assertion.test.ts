// GEO-01A synthetic qualification: the geo assertion and precision contract.
//
// Proves, with synthetic Riyadh-area facility points only, that coordinates are validated
// (finite, in range, not swapped within the launch market), provenance is mandatory, precision
// cannot be overstated (an approximate or external point is never a verified entrance or an
// exact pin), hidden and disputed points never reach the public directory, and one branch has
// one append-only supersession chain whose head is the current assertion.
import assert from "node:assert";
import { describe, it } from "node:test";
import {
  GeoContractError,
  SAUDI_ARABIA_BOUNDS,
  currentGeoAssertion,
  displayGeoAssertion,
  validateGeoAssertion,
  validateGeoPoint,
  visiblePins,
  type GeoContractErrorCode,
  type GeoLocationAssertion,
} from "@zyara/geospatial";

const NOW = "2026-10-06T12:00:00.000Z";
const RIYADH = { lon: 46.6753, lat: 24.7136 };

function code(fn: () => unknown): GeoContractErrorCode {
  try {
    fn();
  } catch (error) {
    assert.ok(error instanceof GeoContractError, `expected GeoContractError, got ${String(error)}`);
    return error.code;
  }
  assert.fail("expected the call to be refused");
}

function assertion(overrides: Partial<GeoLocationAssertion> = {}): GeoLocationAssertion {
  return {
    id: "geo-1",
    tenantId: "t1",
    branchId: "b1",
    point: RIYADH,
    accuracyM: 15,
    precision: "VERIFIED_ENTRANCE",
    verificationState: "VERIFIED",
    verificationMethod: "site_visit",
    evidenceRef: "evidence-1",
    source: { kind: "ZYARA_VERIFICATION", ref: "verification-1", revision: "r1" },
    observedAt: "2026-10-01T00:00:00.000Z",
    expiresAt: "2027-10-01T00:00:00.000Z",
    visibility: "PUBLIC_DIRECTORY",
    supersedesId: null,
    ...overrides,
  };
}

describe("GEO-01A coordinates", () => {
  it("accepts a WGS84 point and rejects non-finite and out-of-range values", () => {
    assert.deepEqual(validateGeoPoint(RIYADH, SAUDI_ARABIA_BOUNDS), RIYADH);
    assert.equal(code(() => validateGeoPoint({ lon: Number.NaN, lat: 24 })), "GEO_POINT_NOT_FINITE");
    assert.equal(code(() => validateGeoPoint({ lon: 46, lat: Number.POSITIVE_INFINITY })), "GEO_POINT_NOT_FINITE");
    assert.equal(code(() => validateGeoPoint({ lon: "46", lat: 24 })), "GEO_POINT_NOT_FINITE");
    assert.equal(code(() => validateGeoPoint({ lon: 46, lat: 90.0001 })), "GEO_LATITUDE_OUT_OF_RANGE");
    assert.equal(code(() => validateGeoPoint({ lon: -180.5, lat: 24 })), "GEO_LONGITUDE_OUT_OF_RANGE");
    assert.equal(code(() => validateGeoPoint([46.67, 24.71])), "GEO_POINT_NOT_FINITE");
  });

  it("detects a swapped pair inside the launch market, and claims nothing without bounds", () => {
    // Riyadh with lon/lat swapped: (lon 24.71, lat 46.67) is outside KSA and its swap is inside.
    assert.equal(code(() => validateGeoPoint({ lon: RIYADH.lat, lat: RIYADH.lon }, SAUDI_ARABIA_BOUNDS)), "GEO_POINT_SWAPPED");
    assert.deepEqual(validateGeoPoint({ lon: RIYADH.lat, lat: RIYADH.lon }, null), { lon: RIYADH.lat, lat: RIYADH.lon });
    // A legitimate point abroad whose swap is not in KSA is not called a swap.
    assert.deepEqual(validateGeoPoint({ lon: 2.35, lat: 48.85 }, SAUDI_ARABIA_BOUNDS), { lon: 2.35, lat: 48.85 });
  });
});

describe("GEO-01A precision and provenance", () => {
  it("accepts a complete verified entrance and freezes it", () => {
    const valid = validateGeoAssertion(assertion());
    assert.equal(valid.precision, "VERIFIED_ENTRANCE");
    assert.ok(Object.isFrozen(valid) && Object.isFrozen(valid.source));
  });

  it("makes provenance mandatory", () => {
    assert.equal(code(() => validateGeoAssertion(assertion({ source: { kind: "ZYARA_VERIFICATION", ref: "", revision: "r1" } }))), "GEO_PROVENANCE_REQUIRED");
    assert.equal(code(() => validateGeoAssertion(assertion({ source: { kind: "ZYARA_VERIFICATION", ref: "v1", revision: "" } }))), "GEO_PROVENANCE_REQUIRED");
    assert.equal(code(() => validateGeoAssertion(assertion({ source: null as unknown as GeoLocationAssertion["source"] }))), "GEO_PROVENANCE_REQUIRED");
    assert.equal(code(() => validateGeoAssertion(assertion({ observedAt: "yesterday" }))), "GEO_TIME_INVALID");
    assert.equal(code(() => validateGeoAssertion(assertion({ observedAt: "2026-02-30T00:00:00Z" }))), "GEO_TIME_INVALID");
    assert.equal(code(() => validateGeoAssertion(assertion({ expiresAt: "2026-09-01T00:00:00.000Z" }))), "GEO_TIME_INVALID");
  });

  it("refuses an approximate assertion that claims a verified entrance", () => {
    assert.equal(
      code(() => validateGeoAssertion(assertion({ verificationState: "UNVERIFIED", verificationMethod: null, evidenceRef: null }))),
      "GEO_PRECISION_REQUIRES_VERIFICATION",
    );
    assert.equal(code(() => validateGeoAssertion(assertion({ evidenceRef: null }))), "GEO_PRECISION_REQUIRES_VERIFICATION");
    assert.equal(
      code(() => validateGeoAssertion(assertion({ precision: "APPROXIMATE_AREA", accuracyM: 800 }))),
      "GEO_VERIFIED_STATE_REQUIRES_VERIFIED_PRECISION",
    );
  });

  it("never lets an external dataset assert more than an approximate area", () => {
    const external = { kind: "EXTERNAL_DATASET" as const, ref: "osm-node-1", revision: "2026-09" };
    assert.equal(code(() => validateGeoAssertion(assertion({ source: external }))), "GEO_EXTERNAL_SOURCE_TOO_PRECISE");
    assert.equal(
      code(() =>
        validateGeoAssertion(assertion({ source: external, precision: "PROVIDER_ATTESTED_POINT", verificationState: "PROVIDER_ATTESTED", verificationMethod: null, evidenceRef: null })),
      ),
      "GEO_ATTESTED_POINT_INVALID",
    );
    const area = validateGeoAssertion(
      assertion({ source: external, precision: "APPROXIMATE_AREA", accuracyM: 500, verificationState: "UNVERIFIED", verificationMethod: null, evidenceRef: null, visibility: "TENANT_INTERNAL" }),
    );
    assert.equal(area.precision, "APPROXIMATE_AREA");
  });

  it("keeps UNKNOWN pointless, approximate areas radiused, and radii bounded", () => {
    const unknownBase = { precision: "UNKNOWN" as const, verificationState: "UNVERIFIED" as const, verificationMethod: null, evidenceRef: null, accuracyM: null };
    assert.equal(validateGeoAssertion(assertion({ ...unknownBase, point: null })).point, null);
    assert.equal(code(() => validateGeoAssertion(assertion(unknownBase))), "GEO_POINT_PRESENCE_INVALID");
    assert.equal(code(() => validateGeoAssertion(assertion({ point: null }))), "GEO_POINT_PRESENCE_INVALID");
    const approx = { precision: "APPROXIMATE_AREA" as const, verificationState: "UNVERIFIED" as const, verificationMethod: null, evidenceRef: null };
    assert.equal(code(() => validateGeoAssertion(assertion({ ...approx, accuracyM: null }))), "GEO_ACCURACY_INVALID");
    assert.equal(code(() => validateGeoAssertion(assertion({ ...approx, accuracyM: 0 }))), "GEO_ACCURACY_INVALID");
    assert.equal(code(() => validateGeoAssertion(assertion({ ...approx, accuracyM: 50_001 }))), "GEO_ACCURACY_INVALID");
  });

  it("keeps hidden and disputed points out of the public directory", () => {
    const hidden = { precision: "PRIVATE_HIDDEN" as const, verificationState: "UNVERIFIED" as const, verificationMethod: null, evidenceRef: null };
    assert.equal(code(() => validateGeoAssertion(assertion(hidden))), "GEO_HIDDEN_NOT_PUBLIC");
    assert.equal(validateGeoAssertion(assertion({ ...hidden, visibility: "TENANT_INTERNAL" })).visibility, "TENANT_INTERNAL");
    const disputed = {
      precision: "PROVIDER_ATTESTED_POINT" as const,
      verificationState: "DISPUTED" as const,
      verificationMethod: null,
      evidenceRef: null,
      source: { kind: "PROVIDER_ATTESTATION" as const, ref: "attest-1", revision: "r1" },
    };
    assert.equal(code(() => validateGeoAssertion(assertion(disputed))), "GEO_DISPUTED_NOT_PUBLIC");
    // A dispute removes verified status: a disputed assertion cannot keep a verified precision.
    assert.equal(
      code(() => validateGeoAssertion(assertion({ verificationState: "DISPUTED", visibility: "TENANT_INTERNAL" }))),
      "GEO_PRECISION_REQUIRES_VERIFICATION",
    );
  });
});

describe("GEO-01A supersession", () => {
  const v1 = assertion({ id: "geo-1" });
  const v2 = assertion({ id: "geo-2", supersedesId: "geo-1", accuracyM: 8 });
  const v3 = assertion({ id: "geo-3", supersedesId: "geo-2", evidenceRef: "evidence-3" });

  it("resolves one chain per branch and keeps the whole history", () => {
    const resolved = currentGeoAssertion([v3, v1, v2]);
    assert.equal(resolved?.head.id, "geo-3");
    assert.deepEqual(resolved?.chain.map((item) => item.id), ["geo-1", "geo-2", "geo-3"]);
    assert.equal(currentGeoAssertion([]), null);
  });

  it("refuses a fork, a second root, a cycle, a self-link, a dangling link or a cross-branch link", () => {
    assert.equal(code(() => currentGeoAssertion([v1, v2, assertion({ id: "geo-2b", supersedesId: "geo-1" })])), "GEO_CHAIN_INVALID");
    assert.equal(code(() => currentGeoAssertion([v1, assertion({ id: "geo-other-root" })])), "GEO_CHAIN_INVALID");
    assert.equal(
      code(() => currentGeoAssertion([v1, assertion({ id: "geo-a", supersedesId: "geo-b" }), assertion({ id: "geo-b", supersedesId: "geo-a" })])),
      "GEO_CHAIN_INVALID",
    );
    assert.equal(code(() => validateGeoAssertion(assertion({ id: "geo-9", supersedesId: "geo-9" }))), "GEO_CHAIN_INVALID");
    assert.equal(code(() => currentGeoAssertion([v1, assertion({ id: "geo-x", supersedesId: "geo-missing" })])), "GEO_CHAIN_INVALID");
    assert.equal(code(() => currentGeoAssertion([v1, assertion({ id: "geo-y", branchId: "b2", supersedesId: "geo-1" })])), "GEO_CHAIN_INVALID");
  });
});

describe("GEO-01A display (MapPin != ProviderTruth)", () => {
  it("pins only live, undisputed, verified or attested points within 100 m", () => {
    assert.equal(displayGeoAssertion(assertion(), NOW), "EXACT_PIN");
    assert.equal(displayGeoAssertion(assertion({ accuracyM: 150 }), NOW), "AREA");
    assert.equal(displayGeoAssertion(assertion({ accuracyM: null }), NOW), "LIST_ONLY");
    assert.equal(displayGeoAssertion(assertion({ expiresAt: "2026-10-05T00:00:00.000Z" }), NOW), "AREA");
    assert.equal(displayGeoAssertion(assertion({ precision: "APPROXIMATE_AREA", accuracyM: 30 }), NOW), "AREA");
    assert.equal(displayGeoAssertion(assertion({ precision: "PRIVATE_HIDDEN" }), NOW), "LIST_ONLY");
    assert.equal(displayGeoAssertion(assertion({ precision: "UNKNOWN", point: null }), NOW), "LIST_ONLY");
    assert.equal(displayGeoAssertion(assertion({ precision: "PROVIDER_ATTESTED_POINT", verificationState: "DISPUTED" }), NOW), "AREA");
  });

  it("agrees with the M012 pin suppression rule", () => {
    for (const accuracyM of [5, 100, 101, null]) {
      const exact = displayGeoAssertion(assertion({ accuracyM }), NOW) === "EXACT_PIN";
      const pin = { branchId: "b1", lat: RIYADH.lat, lng: RIYADH.lon, accuracyM, labels: {}, insurerCaveat: null, verifiedScope: null, observedAt: NOW, bookingMode: "call" as const, wheelchairAccess: false };
      assert.equal(visiblePins([pin]).pins.length === 1, exact, `accuracy ${accuracyM}`);
    }
  });
});
