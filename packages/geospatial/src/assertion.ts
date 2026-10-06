// Zyara geospatial GEO-01A: the geo assertion and precision contract.
//
// Authority: docs/canonical/ZYARA_GEOSPATIAL_PLATFORM_PLAN_2026-09-22.md §§2, 4, 5, 6 and
// docs/evidence/GEO/GEO-01A/WORK_PACKET.md. Provider Graph + PostGIS own healthcare location
// truth; this module validates what may be asserted about a facility location, how its
// history supersedes, and how precisely it may be displayed. It stores facility points only:
// there is no patient, account or session location anywhere in this contract.

export const GEO_PRECISIONS = [
  "VERIFIED_ENTRANCE",
  "VERIFIED_PARCEL",
  "VERIFIED_BUILDING_CENTROID",
  "PROVIDER_ATTESTED_POINT",
  "APPROXIMATE_AREA",
  "PRIVATE_HIDDEN",
  "UNKNOWN",
] as const;
export type GeoPrecision = (typeof GEO_PRECISIONS)[number];

export const GEO_VERIFIED_PRECISIONS: readonly GeoPrecision[] = [
  "VERIFIED_ENTRANCE",
  "VERIFIED_PARCEL",
  "VERIFIED_BUILDING_CENTROID",
];

export const GEO_VERIFICATION_STATES = ["UNVERIFIED", "PROVIDER_ATTESTED", "VERIFIED", "DISPUTED"] as const;
export type GeoVerificationState = (typeof GEO_VERIFICATION_STATES)[number];

export const GEO_SOURCE_KINDS = ["PROVIDER_ATTESTATION", "ZYARA_VERIFICATION", "REGULATOR_REGISTRY", "EXTERNAL_DATASET"] as const;
export type GeoSourceKind = (typeof GEO_SOURCE_KINDS)[number];

export const GEO_VISIBILITIES = ["PUBLIC_DIRECTORY", "TENANT_INTERNAL"] as const;
export type GeoVisibility = (typeof GEO_VISIBILITIES)[number];

// Exact pins follow the M012 rule (visiblePins suppresses accuracy worse than 100 m).
export const GEO_EXACT_PIN_MAX_ACCURACY_M = 100;
export const GEO_ACCURACY_MAX_M = 50_000;

export interface GeoPoint {
  lon: number;
  lat: number;
}

// The launch market's plausible extent, used only to detect a swapped pair: a point outside
// these bounds whose swap falls inside them is refused. Without bounds no swap check is made.
export interface GeoPlausibilityBounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

export const SAUDI_ARABIA_BOUNDS: GeoPlausibilityBounds = { minLat: 16.0, maxLat: 32.5, minLon: 34.4, maxLon: 55.8 };

export interface GeoSourceRef {
  kind: GeoSourceKind;
  ref: string;
  revision: string;
}

export interface GeoLocationAssertion {
  id: string;
  tenantId: string;
  branchId: string;
  // null only for UNKNOWN.
  point: GeoPoint | null;
  accuracyM: number | null;
  precision: GeoPrecision;
  verificationState: GeoVerificationState;
  verificationMethod: string | null;
  evidenceRef: string | null;
  source: GeoSourceRef;
  observedAt: string;
  expiresAt: string;
  visibility: GeoVisibility;
  supersedesId: string | null;
}

export type GeoContractErrorCode =
  | "GEO_POINT_NOT_FINITE"
  | "GEO_LATITUDE_OUT_OF_RANGE"
  | "GEO_LONGITUDE_OUT_OF_RANGE"
  | "GEO_POINT_SWAPPED"
  | "GEO_FIELD_INVALID"
  | "GEO_PROVENANCE_REQUIRED"
  | "GEO_TIME_INVALID"
  | "GEO_PRECISION_REQUIRES_VERIFICATION"
  | "GEO_VERIFIED_STATE_REQUIRES_VERIFIED_PRECISION"
  | "GEO_ATTESTED_POINT_INVALID"
  | "GEO_EXTERNAL_SOURCE_TOO_PRECISE"
  | "GEO_ACCURACY_INVALID"
  | "GEO_POINT_PRESENCE_INVALID"
  | "GEO_HIDDEN_NOT_PUBLIC"
  | "GEO_DISPUTED_NOT_PUBLIC"
  | "GEO_CHAIN_INVALID"
  // GEO-01B (access.ts)
  | "GEO_ENTRANCE_INVALID"
  | "GEO_ACCESSIBILITY_UNATTESTED"
  | "GEO_ENTRANCE_TOO_FAR"
  | "GEO_ENTRANCE_NO_FACILITY"
  | "GEO_TEXT_NOT_PUBLIC_SAFE"
  | "GEO_SERVICE_AREA_INVALID"
  | "GEO_SERVICE_AREA_IMPLAUSIBLE"
  | "GEO_SERVICE_AREA_CROSS_BRANCH"
  // GEO-01C (conflation.ts)
  | "GEO_NAMESPACE_INVALID"
  | "GEO_EXTERNAL_ID_INVALID"
  | "GEO_OBSERVATION_INVALID"
  | "GEO_LINK_INVALID"
  | "GEO_LINK_CONFLICT"
  | "GEO_CONFLICT_INVALID"
  | "GEO_CORRECTION_INVALID"
  | "GEO_CORRECTION_AUTHORITY_TOO_LOW"
  | "GEO_CORRECTION_REVIEW_REQUIRED"
  | "GEO_CORRECTION_RATE_LIMITED"
  // GEO-09 (insights.ts)
  | "GEO_INSIGHT_METRIC_INVALID"
  | "GEO_INSIGHT_SUPPRESSION_TOO_WEAK"
  | "GEO_INSIGHT_SCOPE"
  | "GEO_INSIGHT_CELL_INVALID";

export class GeoContractError extends Error {
  readonly code: GeoContractErrorCode;

  constructor(code: GeoContractErrorCode, message: string) {
    super(message);
    this.name = "GeoContractError";
    this.code = code;
  }
}

function fail(code: GeoContractErrorCode, message: string): never {
  throw new GeoContractError(code, message);
}

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const METHOD = /^[a-z][a-z0-9_]{1,63}$/;
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

function inBounds(lat: number, lon: number, bounds: GeoPlausibilityBounds): boolean {
  return lat >= bounds.minLat && lat <= bounds.maxLat && lon >= bounds.minLon && lon <= bounds.maxLon;
}

export function validateGeoPoint(point: unknown, bounds: GeoPlausibilityBounds | null = null): GeoPoint {
  if (typeof point !== "object" || point === null) fail("GEO_FIELD_INVALID", "point must be { lon, lat }");
  const { lon, lat } = point as Record<string, unknown>;
  if (typeof lon !== "number" || typeof lat !== "number" || !Number.isFinite(lon) || !Number.isFinite(lat)) {
    fail("GEO_POINT_NOT_FINITE", "lon and lat must be finite numbers");
  }
  if (lat < -90 || lat > 90) fail("GEO_LATITUDE_OUT_OF_RANGE", "latitude must be within [-90, 90]");
  if (lon < -180 || lon > 180) fail("GEO_LONGITUDE_OUT_OF_RANGE", "longitude must be within [-180, 180]");
  if (bounds !== null && !inBounds(lat, lon, bounds) && inBounds(lon, lat, bounds)) {
    fail("GEO_POINT_SWAPPED", "longitude and latitude appear swapped");
  }
  return { lon, lat };
}

function instant(value: unknown, label: string): number {
  const parsed = typeof value === "string" && ISO_INSTANT.test(value) ? Date.parse(value) : Number.NaN;
  // Round-trip the calendar date, so a rolled-over day such as 2026-02-30 is refused (as
  // PostgreSQL refuses it) instead of silently becoming 2 March.
  if (Number.isNaN(parsed) || new Date(parsed).toISOString().slice(0, 10) !== (value as string).slice(0, 10)) {
    fail("GEO_TIME_INVALID", `${label} must be an ISO-8601 UTC instant`);
  }
  return parsed;
}

function oneOf<T extends string>(values: readonly T[], value: unknown, label: string): T {
  if (typeof value !== "string" || !(values as readonly string[]).includes(value)) fail("GEO_FIELD_INVALID", `${label} is not recognised`);
  return value as T;
}

function opaque(value: unknown, label: string, code: GeoContractErrorCode = "GEO_FIELD_INVALID"): string {
  if (typeof value !== "string" || !OPAQUE_ID.test(value)) fail(code, `${label} must be an opaque id`);
  return value;
}

// Validates one assertion against the work packet's cross-field rules and returns a plain,
// frozen copy. The same rules are CHECK constraints in migration 047.
export function validateGeoAssertion(input: GeoLocationAssertion, bounds: GeoPlausibilityBounds | null = SAUDI_ARABIA_BOUNDS): GeoLocationAssertion {
  const id = opaque(input.id, "id");
  const tenantId = opaque(input.tenantId, "tenantId");
  const branchId = opaque(input.branchId, "branchId");
  const precision = oneOf(GEO_PRECISIONS, input.precision, "precision");
  const verificationState = oneOf(GEO_VERIFICATION_STATES, input.verificationState, "verificationState");
  const visibility = oneOf(GEO_VISIBILITIES, input.visibility, "visibility");

  const source = input.source;
  if (typeof source !== "object" || source === null) fail("GEO_PROVENANCE_REQUIRED", "source is mandatory");
  const sourceKind = oneOf(GEO_SOURCE_KINDS, source.kind, "source.kind");
  const sourceRef = opaque(source.ref, "source.ref", "GEO_PROVENANCE_REQUIRED");
  const sourceRevision = opaque(source.revision, "source.revision", "GEO_PROVENANCE_REQUIRED");

  const observed = instant(input.observedAt, "observedAt");
  if (instant(input.expiresAt, "expiresAt") <= observed) fail("GEO_TIME_INVALID", "expiresAt must be after observedAt");

  // Rule 5: UNKNOWN has no point; every other class has one.
  if ((precision === "UNKNOWN") !== (input.point === null)) {
    fail("GEO_POINT_PRESENCE_INVALID", "UNKNOWN has no point, and every other precision has one");
  }
  const point = input.point === null ? null : validateGeoPoint(input.point, bounds);

  // Rule 8: accuracy radius bounds. Rule 4: an approximate area needs its radius.
  const accuracyM = input.accuracyM;
  if (accuracyM !== null && (typeof accuracyM !== "number" || !Number.isFinite(accuracyM) || accuracyM <= 0 || accuracyM > GEO_ACCURACY_MAX_M)) {
    fail("GEO_ACCURACY_INVALID", `accuracyM must be in (0, ${GEO_ACCURACY_MAX_M}]`);
  }
  if (precision === "APPROXIMATE_AREA" && accuracyM === null) fail("GEO_ACCURACY_INVALID", "an approximate area needs its radius");

  // Rule 1: verified precision and verified state go together, with method and evidence.
  const verifiedPrecision = GEO_VERIFIED_PRECISIONS.includes(precision);
  const verificationMethod = input.verificationMethod;
  const evidenceRef = input.evidenceRef;
  if (verifiedPrecision) {
    if (verificationState !== "VERIFIED") fail("GEO_PRECISION_REQUIRES_VERIFICATION", "a verified precision needs state VERIFIED");
    if (verificationMethod === null) fail("GEO_PRECISION_REQUIRES_VERIFICATION", "a verified precision needs a verification method");
    opaque(evidenceRef, "evidenceRef", "GEO_PRECISION_REQUIRES_VERIFICATION");
  } else if (verificationState === "VERIFIED") {
    fail("GEO_VERIFIED_STATE_REQUIRES_VERIFIED_PRECISION", "state VERIFIED needs a verified precision");
  }
  if (verificationMethod !== null && (typeof verificationMethod !== "string" || !METHOD.test(verificationMethod))) {
    fail("GEO_FIELD_INVALID", "verificationMethod must be a method code");
  }
  if (evidenceRef !== null) opaque(evidenceRef, "evidenceRef");

  // Rule 2: a provider-attested point comes from the provider or Zyara and is attested.
  if (precision === "PROVIDER_ATTESTED_POINT") {
    if (verificationState !== "PROVIDER_ATTESTED" && verificationState !== "DISPUTED") {
      fail("GEO_ATTESTED_POINT_INVALID", "a provider-attested point needs state PROVIDER_ATTESTED (or DISPUTED)");
    }
    if (sourceKind !== "PROVIDER_ATTESTATION" && sourceKind !== "ZYARA_VERIFICATION") {
      fail("GEO_ATTESTED_POINT_INVALID", "a provider-attested point comes from the provider or Zyara");
    }
  }

  // Rule 3: ProviderGraphLocation != BasemapFeature.
  if (sourceKind === "EXTERNAL_DATASET" && precision !== "APPROXIMATE_AREA" && precision !== "UNKNOWN") {
    fail("GEO_EXTERNAL_SOURCE_TOO_PRECISE", "an external dataset may only assert an approximate area or unknown");
  }

  // Rules 6 and 7: hidden and disputed points never reach the public directory.
  if (precision === "PRIVATE_HIDDEN" && visibility !== "TENANT_INTERNAL") fail("GEO_HIDDEN_NOT_PUBLIC", "a hidden point is tenant-internal");
  if (verificationState === "DISPUTED" && visibility !== "TENANT_INTERNAL") fail("GEO_DISPUTED_NOT_PUBLIC", "a disputed point is tenant-internal");

  const supersedesId = input.supersedesId === null ? null : opaque(input.supersedesId, "supersedesId", "GEO_CHAIN_INVALID");
  if (supersedesId === id) fail("GEO_CHAIN_INVALID", "an assertion cannot supersede itself");

  return Object.freeze({
    id,
    tenantId,
    branchId,
    point: point === null ? null : Object.freeze(point),
    accuracyM,
    precision,
    verificationState,
    verificationMethod,
    evidenceRef,
    source: Object.freeze({ kind: sourceKind, ref: sourceRef, revision: sourceRevision }),
    observedAt: input.observedAt,
    expiresAt: input.expiresAt,
    visibility,
    supersedesId,
  });
}

// Resolves one branch's assertion history to its single chain and head. Refuses a fork, a
// second root, a cycle, a cross-branch or cross-tenant link, or a dangling predecessor.
export function currentGeoAssertion(history: readonly GeoLocationAssertion[]): { head: GeoLocationAssertion; chain: GeoLocationAssertion[] } | null {
  if (history.length === 0) return null;
  const { tenantId, branchId } = history[0];
  const byId = new Map<string, GeoLocationAssertion>();
  const successorOf = new Map<string, string>();
  let root: GeoLocationAssertion | null = null;
  for (const item of history) {
    if (item.tenantId !== tenantId || item.branchId !== branchId) fail("GEO_CHAIN_INVALID", "a chain stays in one tenant and branch");
    if (byId.has(item.id)) fail("GEO_CHAIN_INVALID", "duplicate assertion id");
    byId.set(item.id, item);
    if (item.supersedesId === null) {
      if (root !== null) fail("GEO_CHAIN_INVALID", "a branch has exactly one root assertion");
      root = item;
    } else {
      if (successorOf.has(item.supersedesId)) fail("GEO_CHAIN_INVALID", "an assertion has at most one successor");
      successorOf.set(item.supersedesId, item.id);
    }
  }
  if (root === null) fail("GEO_CHAIN_INVALID", "a chain needs a root");
  for (const predecessor of successorOf.keys()) {
    if (!byId.has(predecessor)) fail("GEO_CHAIN_INVALID", "a superseded assertion is missing from the history");
  }
  const chain: GeoLocationAssertion[] = [root];
  let cursor = successorOf.get(root.id);
  while (cursor !== undefined) {
    chain.push(byId.get(cursor) as GeoLocationAssertion);
    cursor = successorOf.get(cursor);
  }
  if (chain.length !== history.length) fail("GEO_CHAIN_INVALID", "the history contains a cycle or a second chain");
  return { head: chain[chain.length - 1], chain };
}

export type GeoDisplay = "EXACT_PIN" | "AREA" | "LIST_ONLY";

// MapPin != ProviderTruth: only a live, undisputed, verified or provider-attested point with
// an accuracy of at most 100 m is an exact pin. An approximate area is never a pin.
export function displayGeoAssertion(assertion: GeoLocationAssertion, nowIso: string): GeoDisplay {
  if (assertion.point === null || assertion.precision === "PRIVATE_HIDDEN" || assertion.precision === "UNKNOWN") return "LIST_ONLY";
  const pinnable = GEO_VERIFIED_PRECISIONS.includes(assertion.precision) || assertion.precision === "PROVIDER_ATTESTED_POINT";
  const live = Date.parse(assertion.expiresAt) > Date.parse(nowIso);
  const precise = assertion.accuracyM !== null && assertion.accuracyM <= GEO_EXACT_PIN_MAX_ACCURACY_M;
  if (pinnable && live && precise && assertion.verificationState !== "DISPUTED") return "EXACT_PIN";
  return assertion.accuracyM !== null ? "AREA" : "LIST_ONLY";
}
