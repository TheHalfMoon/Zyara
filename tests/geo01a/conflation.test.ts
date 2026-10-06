// GEO-01C synthetic qualification: external spatial identity and conflation.
//
// Proves, with synthetic Riyadh-area facilities only, that external POIs never become Zyara
// identities on distance or name alone, that exact external ids link only inside allowed
// namespaces, that conflicts stay open instead of overwriting, that unlink keeps history, that
// weaker sources cannot supersede verified truth, and that material, large and bulk coordinate
// moves are audited and reviewable.
import assert from "node:assert";
import { describe, it } from "node:test";
import {
  BULK_CORRECTION_LIMIT,
  GeoContractError,
  SEEDED_EXTERNAL_NAMESPACES,
  activeLinks,
  assessLinkCandidates,
  detectCoordinateConflict,
  normalizeFacilityName,
  validateConflictResolution,
  validateCoordinateCorrection,
  validateExternalObservation,
  validateLinkEvent,
  validateSupersession,
  type GeoBranchProfile,
  type GeoContractErrorCode,
  type GeoCorrectionRequest,
  type GeoExternalLinkEvent,
  type GeoExternalNamespace,
  type GeoExternalObservation,
  type GeoLocationAssertion,
  type GeoPoint,
} from "@zyara/geospatial";

const NOW = "2026-10-06T12:00:00.000Z";
const RIYADH: GeoPoint = { lon: 46.6753, lat: 24.7136 };
// About 81 m east of RIYADH.
const NEAR: GeoPoint = { lon: 46.6761, lat: 24.7136 };
// About 5 km east.
const FAR: GeoPoint = { lon: 46.725, lat: 24.7136 };
const NS = SEEDED_EXTERNAL_NAMESPACES;
const WITH_GEOCODER: readonly GeoExternalNamespace[] = [
  ...NS,
  { namespace: "geocoder-x", authority: "GEOCODER", idPattern: "^[a-z0-9]{6,40}$", linkAllowed: false },
];

function expectCode(run: () => unknown, code: GeoContractErrorCode): void {
  assert.throws(run, (error: unknown) => error instanceof GeoContractError && error.code === code, `expected ${code}`);
}

function assertion(overrides: Partial<GeoLocationAssertion> = {}): GeoLocationAssertion {
  return {
    id: "geo-1",
    tenantId: "t1",
    branchId: "b1",
    point: RIYADH,
    accuracyM: 10,
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

function observation(overrides: Partial<GeoExternalObservation> = {}): GeoExternalObservation {
  return {
    id: "obs-1",
    tenantId: "t1",
    namespace: "osm-node",
    externalId: "123456789",
    presence: "PRESENT",
    point: NEAR,
    name: "Al Noor Clinic",
    sourceRevision: "osm-2026-10-01",
    observedAt: "2026-10-05T00:00:00.000Z",
    ...overrides,
  };
}

function branch(branchId: string, point: GeoPoint, names: string[], declared: { namespace: string; externalId: string }[] = []): GeoBranchProfile {
  return { tenantId: "t1", branchId, current: assertion({ id: `geo-${branchId}`, branchId, point }), names, declaredExternalIds: declared };
}

function link(overrides: Partial<GeoExternalLinkEvent> = {}): GeoExternalLinkEvent {
  return {
    id: "link-1",
    tenantId: "t1",
    branchId: "b1",
    namespace: "osm-node",
    externalId: "123456789",
    action: "LINK",
    unlinksId: null,
    basis: "REVIEWED_EVIDENCE",
    actorKind: "ZYARA_ADMIN",
    actorRef: "admin-1",
    evidenceRef: "review-1",
    reasonCode: "site_review",
    ...overrides,
  };
}

const ADMIN: GeoCorrectionRequest = { actorKind: "ZYARA_ADMIN", actorRef: "admin-1", reviewerRef: null, evidenceRef: "evidence-9", reasonCode: "site_visit_correction" };

describe("GEO-01C candidates: no distance-only or name-only merge", () => {
  it("nearby same-name facilities remain distinct without stronger evidence", () => {
    // Two branches of the same name about 81 m apart; the observation sits between them.
    const between = observation({ point: { lon: 46.6757, lat: 24.7136 } });
    const result = assessLinkCandidates(between, [branch("b1", RIYADH, ["Al Noor Clinic"]), branch("b2", NEAR, ["Al Noor Clinic"])], NS);
    assert.deepStrictEqual(result, { decision: "AMBIGUOUS", branchIds: ["b1", "b2"] });
  });

  it("distance alone and name alone never match", () => {
    const nearOther = assessLinkCandidates(observation(), [branch("b1", RIYADH, ["Riyadh Dental Center"])], NS);
    assert.deepStrictEqual(nearOther, { decision: "NO_MATCH" });
    const farSame = assessLinkCandidates(observation({ point: FAR }), [branch("b1", RIYADH, ["Al Noor Clinic"])], NS);
    assert.deepStrictEqual(farSame, { decision: "NO_MATCH" });
    const unnamed = assessLinkCandidates(observation({ name: null }), [branch("b1", RIYADH, ["Al Noor Clinic"])], NS);
    assert.deepStrictEqual(unnamed, { decision: "NO_MATCH" });
  });

  it("spatial plus name evidence is only a proposal for human or provider review", () => {
    const result = assessLinkCandidates(observation(), [branch("b1", RIYADH, ["AL-NOOR clinic"])], NS);
    assert.strictEqual(result.decision, "REVIEW");
    // The automated actor cannot act on a REVIEW proposal.
    expectCode(() => validateLinkEvent(link({ actorKind: "SYSTEM", basis: "DETERMINISTIC_ID" }), NS, [], result), "GEO_LINK_INVALID");
    expectCode(() => validateLinkEvent(link({ actorKind: "SYSTEM", basis: "REVIEWED_EVIDENCE" }), NS, [], result), "GEO_LINK_INVALID");
    // A Zyara admin with evidence can.
    assert.strictEqual(validateLinkEvent(link(), NS, [], result).action, "LINK");
  });

  it("a disputed or hidden branch point is not spatial evidence", () => {
    const disputed: GeoBranchProfile = {
      ...branch("b1", RIYADH, ["Al Noor Clinic"]),
      current: assertion({ precision: "PROVIDER_ATTESTED_POINT", verificationState: "DISPUTED", verificationMethod: null, evidenceRef: null, source: { kind: "PROVIDER_ATTESTATION", ref: "p", revision: "r" }, visibility: "TENANT_INTERNAL" }),
    };
    assert.deepStrictEqual(assessLinkCandidates(observation(), [disputed], NS), { decision: "NO_MATCH" });
  });

  it("normalizes Arabic and English names for equality only", () => {
    assert.strictEqual(normalizeFacilityName("مُستشفى  الأمل"), normalizeFacilityName("مستشفى الامل"));
    assert.strictEqual(normalizeFacilityName("عيادة النورة"), normalizeFacilityName("عياده النوره"));
    assert.strictEqual(normalizeFacilityName("Al-Noor  Clinic!"), "al noor clinic");
    assert.notStrictEqual(normalizeFacilityName("Al Noor Clinic"), normalizeFacilityName("Al Noor Clinics"));
  });
});

describe("GEO-01C exact external ids and namespaces", () => {
  it("exact external id can link only within an allowed source namespace", () => {
    const declared = branch("b1", FAR, ["Different name"], [{ namespace: "osm-node", externalId: "123456789" }]);
    const result = assessLinkCandidates(observation(), [declared], NS);
    assert.deepStrictEqual(result, { decision: "DETERMINISTIC", branchId: "b1" });
    const auto = validateLinkEvent(link({ actorKind: "SYSTEM", actorRef: "conflation-service", basis: "DETERMINISTIC_ID", evidenceRef: "declaration-1" }), NS, [], result);
    assert.strictEqual(auto.basis, "DETERMINISTIC_ID");
    // The same id in another namespace is a different identity and was not declared.
    assert.deepStrictEqual(assessLinkCandidates(observation({ namespace: "osm-way" }), [declared], NS), { decision: "NO_MATCH" });
    // A geocoder namespace is never linkable, even with a declared id.
    const geocoded = observation({ namespace: "geocoder-x", externalId: "abc123def" });
    const geoBranch = branch("b1", RIYADH, ["Al Noor Clinic"], [{ namespace: "geocoder-x", externalId: "abc123def" }]);
    assert.deepStrictEqual(assessLinkCandidates(geocoded, [geoBranch], WITH_GEOCODER), { decision: "NOT_LINKABLE", reason: "NAMESPACE_NOT_LINKABLE" });
    expectCode(() => validateLinkEvent(link({ namespace: "geocoder-x", externalId: "abc123def" }), WITH_GEOCODER, []), "GEO_NAMESPACE_INVALID");
    // Unknown namespace and malformed ids.
    expectCode(() => validateLinkEvent(link({ namespace: "google-place" }), NS, []), "GEO_NAMESPACE_INVALID");
    expectCode(() => validateLinkEvent(link({ externalId: "0123" }), NS, []), "GEO_EXTERNAL_ID_INVALID");
    expectCode(() => validateLinkEvent(link({ externalId: "12345678901234567" }), NS, []), "GEO_EXTERNAL_ID_INVALID");
  });

  it("an id declared by two branches is ambiguous, not deterministic", () => {
    const id = { namespace: "osm-node", externalId: "123456789" };
    const result = assessLinkCandidates(observation(), [branch("b1", RIYADH, ["x"], [id]), branch("b2", FAR, ["y"], [id])], NS);
    assert.deepStrictEqual(result, { decision: "AMBIGUOUS", branchIds: ["b1", "b2"] });
  });

  it("a geocoder namespace cannot be registered as linkable", () => {
    const bad: GeoExternalNamespace[] = [{ namespace: "geocoder-y", authority: "GEOCODER", idPattern: "^[a-z]+$", linkAllowed: true }];
    expectCode(() => validateExternalObservation(observation({ namespace: "geocoder-y", externalId: "abc" }), bad), "GEO_NAMESPACE_INVALID");
  });

  it("observations are public facility evidence only", () => {
    assert.strictEqual(validateExternalObservation(observation(), NS).presence, "PRESENT");
    expectCode(() => validateExternalObservation(observation({ name: "Call 0501234567" }), NS), "GEO_TEXT_NOT_PUBLIC_SAFE");
    expectCode(() => validateExternalObservation(observation({ presence: "ABSENT" }), NS), "GEO_OBSERVATION_INVALID");
    expectCode(() => validateExternalObservation(observation({ point: null }), NS), "GEO_OBSERVATION_INVALID");
    expectCode(() => validateExternalObservation(observation({ point: { lon: 24.7136, lat: 46.6753 } }), NS), "GEO_POINT_SWAPPED");
    assert.strictEqual(validateExternalObservation(observation({ presence: "ABSENT", point: null }), NS).point, null);
  });
});

describe("GEO-01C canonical links", () => {
  it("unlink preserves history and allows a reviewed relink", () => {
    const first = validateLinkEvent(link(), NS, []);
    expectCode(() => validateLinkEvent(link({ id: "link-dup", branchId: "b2" }), NS, [first]), "GEO_LINK_CONFLICT");
    expectCode(() => validateLinkEvent(link({ id: "link-dup", externalId: "987654321" }), NS, [first]), "GEO_LINK_CONFLICT");
    // The automated actor never unlinks.
    expectCode(
      () => validateLinkEvent(link({ id: "unlink-sys", action: "UNLINK", unlinksId: "link-1", actorKind: "SYSTEM", basis: "DETERMINISTIC_ID" }), NS, [first]),
      "GEO_LINK_INVALID",
    );
    const unlink = validateLinkEvent(link({ id: "unlink-1", action: "UNLINK", unlinksId: "link-1", reasonCode: "wrong_facility" }), NS, [first]);
    const history = [first, unlink];
    assert.strictEqual(activeLinks(history).length, 0);
    assert.strictEqual(history.length, 2);
    expectCode(() => validateLinkEvent(link({ id: "unlink-2", action: "UNLINK", unlinksId: "link-1" }), NS, history), "GEO_LINK_INVALID");
    const relink = validateLinkEvent(link({ id: "link-2", branchId: "b2" }), NS, history);
    assert.deepStrictEqual(activeLinks([...history, relink]).map((item) => item.id), ["link-2"]);
  });

  it("an unlink must match the link it ends", () => {
    const first = validateLinkEvent(link(), NS, []);
    expectCode(() => validateLinkEvent(link({ id: "unlink-x", action: "UNLINK", unlinksId: "link-1", branchId: "b2" }), NS, [first]), "GEO_LINK_INVALID");
  });
});

describe("GEO-01C coordinate conflicts", () => {
  const linked = [validateLinkEvent(link(), NS, [])];

  it("conflicting coordinates remain unresolved rather than overwritten", () => {
    const head = Object.freeze(assertion());
    const conflict = detectCoordinateConflict(head, observation({ point: FAR }), linked);
    assert.ok(conflict !== null && conflict.kind === "COORDINATE_MISMATCH");
    assert.ok(conflict.distanceM !== null && conflict.distanceM > 4_000);
    // The assertion is untouched; resolution is a separate, reviewed decision.
    assert.deepStrictEqual(head.point, RIYADH);
    expectCode(() => validateConflictResolution({ resolution: "KEEP_ZYARA", correctedAssertionId: null, actorKind: "SYSTEM", actorRef: "svc", evidenceRef: "e", reasonCode: "auto_close" }), "GEO_CONFLICT_INVALID");
    expectCode(() => validateConflictResolution({ resolution: "CORRECTED", correctedAssertionId: null, actorKind: "ZYARA_ADMIN", actorRef: "a", evidenceRef: "e", reasonCode: "fixed" }), "GEO_CONFLICT_INVALID");
    validateConflictResolution({ resolution: "KEEP_ZYARA", correctedAssertionId: null, actorKind: "ZYARA_ADMIN", actorRef: "admin-1", evidenceRef: "review-2", reasonCode: "external_wrong" });
  });

  it("agreement within tolerance, or an unlinked id, opens nothing", () => {
    assert.strictEqual(detectCoordinateConflict(assertion(), observation(), linked), null);
    assert.strictEqual(detectCoordinateConflict(assertion(), observation({ externalId: "555", point: FAR }), linked), null);
  });

  it("external disappearance opens a review and deletes nothing", () => {
    const conflict = detectCoordinateConflict(assertion(), observation({ presence: "ABSENT", point: null }), linked);
    assert.deepStrictEqual(conflict && { kind: conflict.kind, distanceM: conflict.distanceM }, { kind: "EXTERNAL_ABSENT", distanceM: null });
    assert.strictEqual(activeLinks(linked).length, 1);
  });
});

describe("GEO-01C supersession authority and corrections", () => {
  const verified = assertion();
  const externalArea = (overrides: Partial<GeoLocationAssertion> = {}): GeoLocationAssertion =>
    assertion({
      id: "geo-2", supersedesId: "geo-1", precision: "APPROXIMATE_AREA", accuracyM: 500, verificationState: "UNVERIFIED", verificationMethod: null, evidenceRef: null,
      source: { kind: "EXTERNAL_DATASET", ref: "osm-123456789", revision: "r2" }, ...overrides,
    });

  it("a low-authority external feed cannot overwrite a verified or attested assertion", () => {
    expectCode(() => validateSupersession(verified, externalArea()), "GEO_CORRECTION_AUTHORITY_TOO_LOW");
    const attested = assertion({ precision: "PROVIDER_ATTESTED_POINT", verificationState: "PROVIDER_ATTESTED", verificationMethod: null, evidenceRef: null, source: { kind: "PROVIDER_ATTESTATION", ref: "p", revision: "r" } });
    expectCode(() => validateSupersession(attested, externalArea()), "GEO_CORRECTION_AUTHORITY_TOO_LOW");
    // A provider cannot replace a Zyara-verified point, but may dispute it.
    const providerPoint = assertion({ id: "geo-2", supersedesId: "geo-1", precision: "PROVIDER_ATTESTED_POINT", verificationState: "PROVIDER_ATTESTED", verificationMethod: null, evidenceRef: null, source: { kind: "PROVIDER_ATTESTATION", ref: "p", revision: "r" } });
    expectCode(() => validateSupersession(verified, providerPoint), "GEO_CORRECTION_AUTHORITY_TOO_LOW");
    assert.strictEqual(validateSupersession(verified, { ...providerPoint, verificationState: "DISPUTED", visibility: "TENANT_INTERNAL" }).correctionRequired, false);
    // An external dataset may refine an unverified head.
    const unverified = assertion({ precision: "APPROXIMATE_AREA", accuracyM: 800, verificationState: "UNVERIFIED", verificationMethod: null, evidenceRef: null });
    assert.strictEqual(validateSupersession(unverified, externalArea()).movedM, 0);
  });

  it("a material coordinate move records evidence and actor", () => {
    const moved = assertion({ id: "geo-2", supersedesId: "geo-1", point: NEAR });
    assert.strictEqual(validateSupersession(verified, moved).correctionRequired, true);
    const result = validateCoordinateCorrection(verified, moved, ADMIN, [], NOW);
    assert.ok(result.movedM !== null && result.movedM > 50 && result.movedM < 100);
    expectCode(() => validateCoordinateCorrection(verified, moved, { ...ADMIN, actorKind: "SYSTEM" }, [], NOW), "GEO_CORRECTION_INVALID");
    expectCode(() => validateCoordinateCorrection(verified, moved, { ...ADMIN, evidenceRef: "" }, [], NOW), "GEO_CORRECTION_INVALID");
    expectCode(() => validateCoordinateCorrection(verified, assertion({ id: "geo-3", supersedesId: "geo-x", point: NEAR }), ADMIN, [], NOW), "GEO_CHAIN_INVALID");
  });

  it("a large move needs an independent reviewer", () => {
    const far = assertion({ id: "geo-2", supersedesId: "geo-1", point: FAR });
    expectCode(() => validateCoordinateCorrection(verified, far, ADMIN, [], NOW), "GEO_CORRECTION_REVIEW_REQUIRED");
    expectCode(() => validateCoordinateCorrection(verified, far, { ...ADMIN, reviewerRef: "admin-1" }, [], NOW), "GEO_CORRECTION_INVALID");
    assert.strictEqual(validateCoordinateCorrection(verified, far, { ...ADMIN, reviewerRef: "admin-2" }, [], NOW).reviewed, true);
  });

  it("a detour through UNKNOWN is measured from the last known point", () => {
    const unknown = assertion({ id: "geo-2", supersedesId: "geo-1", point: null, accuracyM: null, precision: "UNKNOWN", verificationState: "UNVERIFIED", verificationMethod: null, evidenceRef: null });
    const far = assertion({ id: "geo-3", supersedesId: "geo-2", point: FAR });
    expectCode(() => validateCoordinateCorrection(unknown, far, ADMIN, [], NOW, RIYADH), "GEO_CORRECTION_REVIEW_REQUIRED");
    expectCode(() => validateSupersession(verified, assertion({ id: "geo-2", supersedesId: "geo-1" }), FAR), "GEO_CHAIN_INVALID");
  });

  it("bulk malicious edits are rate-limited and reviewable", () => {
    const moved = assertion({ id: "geo-2", supersedesId: "geo-1", point: NEAR });
    const burst = Array.from({ length: BULK_CORRECTION_LIMIT }, (_, i) => ({ actorRef: "admin-1", recordedAt: `2026-10-06T0${i % 10}:00:00.000Z` }));
    expectCode(() => validateCoordinateCorrection(verified, moved, ADMIN, burst, NOW), "GEO_CORRECTION_RATE_LIMITED");
    assert.strictEqual(validateCoordinateCorrection(verified, moved, { ...ADMIN, reviewerRef: "admin-2" }, burst, NOW).reviewed, true);
    // Another actor's history and corrections older than 24 hours do not count.
    assert.strictEqual(validateCoordinateCorrection(verified, moved, { ...ADMIN, actorRef: "admin-3" }, burst, NOW).reviewed, false);
    const old = burst.map((item) => ({ ...item, recordedAt: "2026-10-04T00:00:00.000Z" }));
    assert.strictEqual(validateCoordinateCorrection(verified, moved, ADMIN, old, NOW).reviewed, false);
  });
});
