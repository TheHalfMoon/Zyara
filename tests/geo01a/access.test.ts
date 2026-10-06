// GEO-01B synthetic qualification: entrances and service-area geometry.
//
// Proves, with synthetic Riyadh-area geometry only, that accessibility is never inferred,
// entrances are their own sourced facts near their facility, inactive and superseded entrances
// are never current, service areas are valid same-branch polygons, and a service area never
// implies availability. Labels stay public wayfinding text.
import assert from "node:assert";
import { describe, it } from "node:test";
import {
  GeoContractError,
  SAUDI_ARABIA_BOUNDS,
  currentEntrances,
  haversineMeters,
  isPublicSafeText,
  validateEntrance,
  validateServiceArea,
  withinServiceArea,
  type GeoContractErrorCode,
  type GeoEntrance,
  type GeoLocationAssertion,
  type GeoServiceArea,
} from "@zyara/geospatial";

const NOW = "2026-10-06T12:00:00.000Z";
const FACILITY: GeoLocationAssertion = {
  id: "geo-1",
  tenantId: "t1",
  branchId: "b1",
  point: { lon: 46.6753, lat: 24.7136 },
  accuracyM: 10,
  precision: "VERIFIED_BUILDING_CENTROID",
  verificationState: "VERIFIED",
  verificationMethod: "site_visit",
  evidenceRef: "evidence-1",
  source: { kind: "ZYARA_VERIFICATION", ref: "verification-1", revision: "r1" },
  observedAt: "2026-10-01T00:00:00.000Z",
  expiresAt: "2027-10-01T00:00:00.000Z",
  visibility: "PUBLIC_DIRECTORY",
  supersedesId: null,
};

function code(fn: () => unknown): GeoContractErrorCode {
  try {
    fn();
  } catch (error) {
    assert.ok(error instanceof GeoContractError, String(error));
    return error.code;
  }
  assert.fail("expected refusal");
}

function entrance(overrides: Partial<GeoEntrance> = {}): GeoEntrance {
  return {
    id: "ent-1",
    tenantId: "t1",
    branchId: "b1",
    kind: "MAIN",
    point: { lon: 46.6755, lat: 24.7138 },
    publicLabel: { ar: "المدخل الرئيسي", en: "Main entrance" },
    floor: 0,
    arrivalInstructions: { en: "Use the north gate; reception is on the left." },
    accessibility: { stepFree: "YES", lift: "YES", accessibleToilet: "UNKNOWN", accessibleParking: "NO" },
    source: { kind: "PROVIDER_ATTESTATION", ref: "attest-1", revision: "r1" },
    verificationState: "PROVIDER_ATTESTED",
    observedAt: "2026-10-01T00:00:00.000Z",
    expiresAt: "2027-04-01T00:00:00.000Z",
    status: "ACTIVE",
    supersedesId: null,
    ...overrides,
  };
}

// About 2 km x 2 km around the facility.
const SQUARE = [[[46.665, 24.704], [46.685, 24.704], [46.685, 24.722], [46.665, 24.722], [46.665, 24.704]]];

function area(overrides: Partial<GeoServiceArea> = {}): GeoServiceArea {
  return {
    id: "area-1",
    tenantId: "t1",
    branchId: "b1",
    serviceId: "svc-home-nursing",
    geometry: { type: "Polygon", coordinates: SQUARE },
    source: { kind: "PROVIDER_ATTESTATION", ref: "attest-2", revision: "r1" },
    observedAt: "2026-10-01T00:00:00.000Z",
    expiresAt: "2027-04-01T00:00:00.000Z",
    status: "ACTIVE",
    supersedesId: null,
    ...overrides,
  };
}

const SAME_BRANCH = { tenantId: "t1", branchId: "b1" };

describe("GEO-01B entrances", () => {
  it("accepts an attested entrance near its facility", () => {
    const e = validateEntrance(entrance(), FACILITY, SAUDI_ARABIA_BOUNDS);
    assert.equal(e.kind, "MAIN");
    assert.ok(Object.isFrozen(e) && Object.isFrozen(e.accessibility));
    assert.ok(haversineMeters(e.point, FACILITY.point!) < 100);
  });

  it("never infers accessibility from an external dataset", () => {
    const external = { kind: "EXTERNAL_DATASET" as const, ref: "osm-way-1", revision: "2026-09" };
    assert.equal(code(() => validateEntrance(entrance({ source: external, verificationState: "UNVERIFIED" }), FACILITY, null)), "GEO_ACCESSIBILITY_UNATTESTED");
    const unknown = { stepFree: "UNKNOWN" as const, lift: "UNKNOWN" as const, accessibleToilet: "UNKNOWN" as const, accessibleParking: "UNKNOWN" as const };
    assert.equal(validateEntrance(entrance({ source: external, verificationState: "UNVERIFIED", accessibility: unknown }), FACILITY, null).accessibility.stepFree, "UNKNOWN");
    // An unverified provider claim of YES is not enough either.
    assert.equal(code(() => validateEntrance(entrance({ verificationState: "UNVERIFIED" }), FACILITY, null)), "GEO_ACCESSIBILITY_UNATTESTED");
  });

  it("requires attested step-free access for an ACCESSIBLE entrance", () => {
    const noStepFree = { stepFree: "NO" as const, lift: "NO" as const, accessibleToilet: "NO" as const, accessibleParking: "NO" as const };
    assert.equal(code(() => validateEntrance(entrance({ kind: "ACCESSIBLE", accessibility: noStepFree }), FACILITY, null)), "GEO_ACCESSIBILITY_UNATTESTED");
    assert.equal(validateEntrance(entrance({ kind: "ACCESSIBLE" }), FACILITY, null).kind, "ACCESSIBLE");
  });

  it("refuses an entrance far from its facility, or with no facility point unless verified", () => {
    assert.equal(code(() => validateEntrance(entrance({ point: { lon: 46.72, lat: 24.75 } }), FACILITY, null)), "GEO_ENTRANCE_TOO_FAR");
    assert.equal(code(() => validateEntrance(entrance(), null, null)), "GEO_ENTRANCE_NO_FACILITY");
    const disputed = { ...FACILITY, verificationState: "DISPUTED" as const, precision: "PROVIDER_ATTESTED_POINT" as const, visibility: "TENANT_INTERNAL" as const };
    assert.equal(code(() => validateEntrance(entrance(), disputed, null)), "GEO_ENTRANCE_NO_FACILITY");
    const hidden = { ...FACILITY, precision: "PRIVATE_HIDDEN" as const, visibility: "TENANT_INTERNAL" as const };
    assert.equal(code(() => validateEntrance(entrance(), hidden, null)), "GEO_ENTRANCE_NO_FACILITY");
    const verified = entrance({ source: { kind: "ZYARA_VERIFICATION", ref: "visit-9", revision: "r1" }, verificationState: "VERIFIED" });
    assert.equal(validateEntrance(verified, null, null).verificationState, "VERIFIED");
    assert.equal(code(() => validateEntrance(entrance({ branchId: "b2" }), FACILITY, null)), "GEO_ENTRANCE_INVALID");
  });

  it("keeps labels and instructions public wayfinding text", () => {
    for (const bad of ["Call 050 123 4567 at the gate", "Ask for ahmad@example.test", "1012345678", "اتصل ٠٥٠١٢٣٤٥٦٧", "۰۵۰۱۲۳۴۵۶۷"]) {
      assert.equal(code(() => validateEntrance(entrance({ publicLabel: { en: bad } }), FACILITY, null)), "GEO_TEXT_NOT_PUBLIC_SAFE", bad);
      assert.equal(code(() => validateEntrance(entrance({ arrivalInstructions: { en: bad } }), FACILITY, null)), "GEO_TEXT_NOT_PUBLIC_SAFE", bad);
    }
    // Blank text is refused too (by the length rule, before the public-text rule).
    assert.equal(code(() => validateEntrance(entrance({ publicLabel: { en: "   " } }), FACILITY, null)), "GEO_ENTRANCE_INVALID");
    assert.equal(isPublicSafeText("   "), false);
    assert.equal(isPublicSafeText("Gate 3, level 2, follow the green line"), true);
    assert.equal(isPublicSafeText("البوابة ٣، الطابق ٢"), true);
    assert.equal(code(() => validateEntrance(entrance({ publicLabel: {} }), FACILITY, null)), "GEO_ENTRANCE_INVALID");
  });

  it("never treats an inactive, superseded or expired entrance as current, and keeps history", () => {
    const v1 = entrance({ id: "ent-1" });
    const v2 = entrance({ id: "ent-2", supersedesId: "ent-1", floor: 1 });
    const closed = entrance({ id: "ent-3", kind: "PARKING", accessibility: { stepFree: "NO", lift: "NO", accessibleToilet: "NO", accessibleParking: "NO" } });
    const closedV2 = entrance({ id: "ent-4", kind: "PARKING", supersedesId: "ent-3", status: "INACTIVE", accessibility: closed.accessibility });
    const expired = entrance({ id: "ent-5", kind: "EMERGENCY", expiresAt: "2026-10-05T00:00:00.000Z" });
    const history = [v1, v2, closed, closedV2, expired];
    assert.deepEqual(currentEntrances(history, NOW).map((e) => e.id), ["ent-2"]);
    assert.equal(history.length, 5);
    assert.equal(code(() => validateEntrance(entrance({ id: "ent-9", supersedesId: "ent-9" }), FACILITY, null)), "GEO_CHAIN_INVALID");
  });
});

describe("GEO-01B service areas", () => {
  it("accepts a closed polygon near its branch for its own service", () => {
    const a = validateServiceArea(area(), SAME_BRANCH, FACILITY, SAUDI_ARABIA_BOUNDS);
    assert.equal(a.geometry.type, "Polygon");
  });

  it("refuses invalid polygon structure", () => {
    const open = [[[46.665, 24.704], [46.685, 24.704], [46.685, 24.722], [46.665, 24.722]]];
    const tooFew = [[[46.665, 24.704], [46.685, 24.704], [46.665, 24.704]]];
    for (const coordinates of [open, tooFew]) {
      assert.equal(code(() => validateServiceArea(area({ geometry: { type: "Polygon", coordinates } }), SAME_BRANCH, FACILITY, null)), "GEO_SERVICE_AREA_INVALID");
    }
    assert.equal(code(() => validateServiceArea(area({ geometry: { type: "LineString", coordinates: SQUARE } as unknown as GeoServiceArea["geometry"] }), SAME_BRANCH, FACILITY, null)), "GEO_SERVICE_AREA_INVALID");
    const bowtie = [[[46.665, 24.704], [46.685, 24.722], [46.685, 24.704], [46.665, 24.722], [46.665, 24.704]]];
    assert.equal(code(() => validateServiceArea(area({ geometry: { type: "Polygon", coordinates: bowtie } }), SAME_BRANCH, FACILITY, null)), "GEO_SERVICE_AREA_INVALID");
    // Repeated consecutive vertices are valid OGC and are not a self-intersection.
    const repeated = [[[46.665, 24.704], [46.685, 24.704], [46.685, 24.704], [46.685, 24.722], [46.665, 24.722], [46.665, 24.704]]];
    assert.equal(validateServiceArea(area({ geometry: { type: "Polygon", coordinates: repeated } }), SAME_BRANCH, FACILITY, null).geometry.type, "Polygon");
    // A multipolygon with one part near Riyadh and one in Jeddah is implausible as a whole.
    const split = { type: "MultiPolygon" as const, coordinates: [SQUARE, [[[39.15, 21.48], [39.25, 21.48], [39.25, 21.58], [39.15, 21.58], [39.15, 21.48]]]] };
    assert.equal(code(() => validateServiceArea(area({ geometry: split }), SAME_BRANCH, FACILITY, null)), "GEO_SERVICE_AREA_IMPLAUSIBLE");
    const huge = [[[40, 18], [52, 18], [52, 30], [40, 30], [40, 18]]];
    assert.equal(code(() => validateServiceArea(area({ geometry: { type: "Polygon", coordinates: huge } }), SAME_BRANCH, null, null)), "GEO_SERVICE_AREA_INVALID");
    const outOfRange = [[[46.6, 24.7], [190, 24.7], [46.7, 24.8], [46.6, 24.7]]];
    assert.equal(code(() => validateServiceArea(area({ geometry: { type: "Polygon", coordinates: outOfRange } }), SAME_BRANCH, FACILITY, null)), "GEO_LONGITUDE_OUT_OF_RANGE");
  });

  it("refuses cross-branch linkage and implausible areas", () => {
    assert.equal(code(() => validateServiceArea(area(), { tenantId: "t1", branchId: "b2" }, FACILITY, null)), "GEO_SERVICE_AREA_CROSS_BRANCH");
    assert.equal(code(() => validateServiceArea(area(), { tenantId: "t2", branchId: "b1" }, FACILITY, null)), "GEO_SERVICE_AREA_CROSS_BRANCH");
    // A polygon in Jeddah for a Riyadh branch.
    const jeddah = [[[39.15, 21.48], [39.25, 21.48], [39.25, 21.58], [39.15, 21.58], [39.15, 21.48]]];
    assert.equal(code(() => validateServiceArea(area({ geometry: { type: "Polygon", coordinates: jeddah } }), SAME_BRANCH, FACILITY, null)), "GEO_SERVICE_AREA_IMPLAUSIBLE");
    // A polygon in Cairo, outside the launch market.
    const cairo = [[[31.2, 30.0], [31.3, 30.0], [31.3, 30.1], [31.2, 30.1], [31.2, 30.0]]];
    assert.equal(code(() => validateServiceArea(area({ geometry: { type: "Polygon", coordinates: cairo } }), SAME_BRANCH, null, SAUDI_ARABIA_BOUNDS)), "GEO_SERVICE_AREA_IMPLAUSIBLE");
  });

  it("never implies availability from a service area", () => {
    const a = validateServiceArea(area(), SAME_BRANCH, FACILITY, null);
    const inside = withinServiceArea(a, { lon: 46.675, lat: 24.713 });
    const outside = withinServiceArea(a, { lon: 46.70, lat: 24.75 });
    assert.deepEqual(inside, { inside: true, availabilityImplied: false });
    assert.deepEqual(outside, { inside: false, availabilityImplied: false });
    assert.deepEqual(Object.keys(inside).sort(), ["availabilityImplied", "inside"]);
  });

  it("respects holes and multipolygons", () => {
    const withHole = { type: "Polygon" as const, coordinates: [SQUARE[0], [[46.672, 24.710], [46.678, 24.710], [46.678, 24.716], [46.672, 24.716], [46.672, 24.710]]] };
    const holed = validateServiceArea(area({ geometry: withHole }), SAME_BRANCH, FACILITY, null);
    assert.equal(withinServiceArea(holed, { lon: 46.675, lat: 24.713 }).inside, false);
    const multi = validateServiceArea(area({ geometry: { type: "MultiPolygon", coordinates: [SQUARE, [[[46.69, 24.70], [46.70, 24.70], [46.70, 24.71], [46.69, 24.71], [46.69, 24.70]]]] } }), SAME_BRANCH, FACILITY, null);
    assert.equal(withinServiceArea(multi, { lon: 46.695, lat: 24.705 }).inside, true);
  });
});
