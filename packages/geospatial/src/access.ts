// Zyara geospatial GEO-01B: entrances and service-area geometry.
//
// Authority: docs/canonical/ZYARA_GEOSPATIAL_PLATFORM_PLAN_2026-09-22.md §§2, 6, 17 and
// docs/evidence/GEO/GEO-01B/WORK_PACKET.md.
//
// VerifiedEntrance != BuildingCentroid: entrances are their own facts, each with a source and
// freshness, and accessibility is never inferred (an external dataset can only say UNKNOWN).
// A service area is geometry only: being inside one never implies that care or an appointment
// is available. Labels and instructions are public wayfinding text, never patient data.

import {
  GEO_VERIFICATION_STATES,
  GEO_SOURCE_KINDS,
  GeoContractError,
  type GeoContractErrorCode,
  type GeoLocationAssertion,
  type GeoPlausibilityBounds,
  type GeoPoint,
  type GeoSourceRef,
  type GeoVerificationState,
  validateGeoPoint,
} from "./assertion.js";

export const ENTRANCE_KINDS = ["MAIN", "ACCESSIBLE", "EMERGENCY", "DROPOFF", "PARKING", "SERVICE"] as const;
export type EntranceKind = (typeof ENTRANCE_KINDS)[number];

export type AccessFact = "YES" | "NO" | "UNKNOWN";

export interface AccessibilityFacts {
  stepFree: AccessFact;
  lift: AccessFact;
  accessibleToilet: AccessFact;
  accessibleParking: AccessFact;
}

export interface LocalizedText {
  ar?: string;
  en?: string;
}

export interface GeoEntrance {
  id: string;
  tenantId: string;
  branchId: string;
  kind: EntranceKind;
  point: GeoPoint;
  publicLabel: LocalizedText;
  floor: number | null;
  arrivalInstructions: LocalizedText | null;
  accessibility: AccessibilityFacts;
  source: GeoSourceRef;
  verificationState: GeoVerificationState;
  observedAt: string;
  expiresAt: string;
  status: "ACTIVE" | "INACTIVE";
  supersedesId: string | null;
}

export type GeoPolygon = { type: "Polygon"; coordinates: number[][][] };
export type GeoMultiPolygon = { type: "MultiPolygon"; coordinates: number[][][][] };

export interface GeoServiceArea {
  id: string;
  tenantId: string;
  branchId: string;
  serviceId: string;
  geometry: GeoPolygon | GeoMultiPolygon;
  source: GeoSourceRef;
  observedAt: string;
  expiresAt: string;
  status: "ACTIVE" | "INACTIVE";
  supersedesId: string | null;
}

export const ENTRANCE_MAX_DISTANCE_M = 1_000;
export const SERVICE_AREA_MAX_DISTANCE_KM = 100;
export const SERVICE_AREA_MAX_POSITIONS = 10_000;
const LABEL_MAX = 120;
const INSTRUCTIONS_MAX = 500;
const OPAQUE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
const EMAIL = /[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,253}\.[A-Za-z]{2,24}/;
const ACCESS_FACTS: readonly AccessFact[] = ["YES", "NO", "UNKNOWN"];
const ATTESTING_SOURCES: readonly string[] = ["PROVIDER_ATTESTATION", "ZYARA_VERIFICATION"];

function fail(code: GeoContractErrorCode, message: string): never {
  throw new GeoContractError(code, message);
}

function instant(value: unknown, label: string): number {
  const parsed = typeof value === "string" && ISO_INSTANT.test(value) ? Date.parse(value) : Number.NaN;
  if (Number.isNaN(parsed) || new Date(parsed).toISOString().slice(0, 10) !== (value as string).slice(0, 10)) {
    fail("GEO_TIME_INVALID", `${label} must be an ISO-8601 UTC instant`);
  }
  return parsed;
}

function opaque(value: unknown, label: string, code: GeoContractErrorCode = "GEO_FIELD_INVALID"): string {
  if (typeof value !== "string" || !OPAQUE.test(value)) fail(code, `${label} must be an opaque id`);
  return value;
}

function source(value: GeoSourceRef): GeoSourceRef {
  if (typeof value !== "object" || value === null || !(GEO_SOURCE_KINDS as readonly unknown[]).includes(value.kind)) {
    fail("GEO_PROVENANCE_REQUIRED", "source is mandatory");
  }
  return { kind: value.kind, ref: opaque(value.ref, "source.ref", "GEO_PROVENANCE_REQUIRED"), revision: opaque(value.revision, "source.revision", "GEO_PROVENANCE_REQUIRED") };
}

// Public wayfinding text only: no e-mail address, no phone-like or identifier digit runs.
export function isPublicSafeText(text: string): boolean {
  if (EMAIL.test(text)) return false;
  const digits = text.replace(/[\s()+\-.]/g, "");
  return !/[0-9]{9,}/.test(digits) && !/^[0-9]{7,}$/.test(text.trim());
}

function localized(value: unknown, max: number, label: string, required: boolean): LocalizedText | null {
  if (value === null && !required) return null;
  if (typeof value !== "object" || value === null) fail("GEO_ENTRANCE_INVALID", `${label} must be { ar?, en? }`);
  const record = value as Record<string, unknown>;
  const out: LocalizedText = {};
  for (const key of Object.keys(record)) {
    if (key !== "ar" && key !== "en") fail("GEO_ENTRANCE_INVALID", `${label} supports ar and en only`);
    const text = record[key];
    if (typeof text !== "string" || text.trim().length === 0 || text.length > max) fail("GEO_ENTRANCE_INVALID", `${label}.${key} must be 1..${max} characters`);
    if (!isPublicSafeText(text)) fail("GEO_TEXT_NOT_PUBLIC_SAFE", `${label}.${key} must be public wayfinding text without contact details or identifiers`);
    out[key] = text;
  }
  if (Object.keys(out).length === 0) fail("GEO_ENTRANCE_INVALID", `${label} needs ar or en`);
  return Object.freeze(out);
}

// ---------------------------------------------------------------------------
// Distance
// ---------------------------------------------------------------------------

const EARTH_RADIUS_M = 6_371_008.8;

export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

function usableFacilityPoint(facility: GeoLocationAssertion | null): GeoPoint | null {
  if (facility === null || facility.point === null) return null;
  if (facility.precision === "UNKNOWN" || facility.precision === "PRIVATE_HIDDEN") return null;
  return facility.point;
}

// ---------------------------------------------------------------------------
// Entrances
// ---------------------------------------------------------------------------

export function validateEntrance(
  input: GeoEntrance,
  facility: GeoLocationAssertion | null,
  bounds: GeoPlausibilityBounds | null,
): GeoEntrance {
  const id = opaque(input.id, "id");
  const tenantId = opaque(input.tenantId, "tenantId");
  const branchId = opaque(input.branchId, "branchId");
  if (!(ENTRANCE_KINDS as readonly unknown[]).includes(input.kind)) fail("GEO_ENTRANCE_INVALID", "unknown entrance kind");
  const point = validateGeoPoint(input.point, bounds);
  const publicLabel = localized(input.publicLabel, LABEL_MAX, "publicLabel", true) as LocalizedText;
  const arrivalInstructions = localized(input.arrivalInstructions, INSTRUCTIONS_MAX, "arrivalInstructions", false);
  if (input.floor !== null && (!Number.isInteger(input.floor) || input.floor < -10 || input.floor > 200)) fail("GEO_ENTRANCE_INVALID", "floor must be -10..200");
  const src = source(input.source);
  if (!(GEO_VERIFICATION_STATES as readonly unknown[]).includes(input.verificationState)) fail("GEO_FIELD_INVALID", "verification state");
  if (instant(input.expiresAt, "expiresAt") <= instant(input.observedAt, "observedAt")) fail("GEO_TIME_INVALID", "expiresAt must be after observedAt");
  if (input.status !== "ACTIVE" && input.status !== "INACTIVE") fail("GEO_ENTRANCE_INVALID", "status");
  const supersedesId = input.supersedesId === null ? null : opaque(input.supersedesId, "supersedesId", "GEO_CHAIN_INVALID");
  if (supersedesId === id) fail("GEO_CHAIN_INVALID", "an entrance cannot supersede itself");

  // Accessibility is never inferred: external data is UNKNOWN; any YES is attested or verified;
  // an ACCESSIBLE entrance needs attested step-free access.
  const facts = input.accessibility;
  if (typeof facts !== "object" || facts === null) fail("GEO_ENTRANCE_INVALID", "accessibility facts are required");
  const accessibility: AccessibilityFacts = {
    stepFree: facts.stepFree,
    lift: facts.lift,
    accessibleToilet: facts.accessibleToilet,
    accessibleParking: facts.accessibleParking,
  };
  if (!Object.values(accessibility).every((fact) => ACCESS_FACTS.includes(fact))) fail("GEO_ENTRANCE_INVALID", "accessibility facts are YES, NO or UNKNOWN");
  const anyYes = Object.values(accessibility).some((fact) => fact === "YES");
  const anyKnown = Object.values(accessibility).some((fact) => fact !== "UNKNOWN");
  if (src.kind === "EXTERNAL_DATASET" && anyKnown) fail("GEO_ACCESSIBILITY_UNATTESTED", "an external dataset cannot assert accessibility");
  if (anyYes && (!ATTESTING_SOURCES.includes(src.kind) || (input.verificationState !== "PROVIDER_ATTESTED" && input.verificationState !== "VERIFIED"))) {
    fail("GEO_ACCESSIBILITY_UNATTESTED", "an accessibility YES needs an attested or verified provider or Zyara source");
  }
  if (input.kind === "ACCESSIBLE" && accessibility.stepFree !== "YES") fail("GEO_ACCESSIBILITY_UNATTESTED", "an ACCESSIBLE entrance needs attested step-free access");

  // Plausibility against the facility point.
  const facilityPoint = usableFacilityPoint(facility);
  if (facility !== null && (facility.tenantId !== tenantId || facility.branchId !== branchId)) fail("GEO_ENTRANCE_INVALID", "facility assertion is for another branch");
  if (facilityPoint === null) {
    if (input.verificationState !== "VERIFIED") fail("GEO_ENTRANCE_NO_FACILITY", "without a facility point an entrance needs a verified site check");
  } else if (haversineMeters(point, facilityPoint) > ENTRANCE_MAX_DISTANCE_M) {
    fail("GEO_ENTRANCE_TOO_FAR", `an entrance must be within ${ENTRANCE_MAX_DISTANCE_M} m of its facility`);
  }

  return Object.freeze({
    id,
    tenantId,
    branchId,
    kind: input.kind,
    point: Object.freeze(point),
    publicLabel,
    floor: input.floor,
    arrivalInstructions,
    accessibility: Object.freeze(accessibility),
    source: Object.freeze(src),
    verificationState: input.verificationState,
    observedAt: input.observedAt,
    expiresAt: input.expiresAt,
    status: input.status,
    supersedesId,
  });
}

// Current entrances: active, unexpired chain heads. Superseded, inactive or expired entrances
// are history, never current.
export function currentEntrances(history: readonly GeoEntrance[], nowIso: string): GeoEntrance[] {
  const now = instant(nowIso, "now");
  const superseded = new Set(history.map((entrance) => entrance.supersedesId).filter((id): id is string => id !== null));
  return history.filter((entrance) => !superseded.has(entrance.id) && entrance.status === "ACTIVE" && Date.parse(entrance.expiresAt) > now);
}

// ---------------------------------------------------------------------------
// Service areas
// ---------------------------------------------------------------------------

function polygonsOf(geometry: GeoPolygon | GeoMultiPolygon): number[][][][] {
  if (geometry.type === "Polygon") return [geometry.coordinates];
  return geometry.coordinates;
}

export function validateServiceArea(
  input: GeoServiceArea,
  serviceBranch: { tenantId: string; branchId: string },
  facility: GeoLocationAssertion | null,
  bounds: GeoPlausibilityBounds | null,
): GeoServiceArea {
  const id = opaque(input.id, "id");
  const tenantId = opaque(input.tenantId, "tenantId");
  const branchId = opaque(input.branchId, "branchId");
  const serviceId = opaque(input.serviceId, "serviceId");
  if (serviceBranch.tenantId !== tenantId || serviceBranch.branchId !== branchId) {
    fail("GEO_SERVICE_AREA_CROSS_BRANCH", "a service area links to a care service of the same tenant and branch");
  }
  const geometry = input.geometry;
  if (typeof geometry !== "object" || geometry === null || (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon") || !Array.isArray(geometry.coordinates)) {
    fail("GEO_SERVICE_AREA_INVALID", "geometry must be a GeoJSON Polygon or MultiPolygon");
  }
  let positions = 0;
  let minLon = 180;
  let maxLon = -180;
  let minLat = 90;
  let maxLat = -90;
  for (const polygon of polygonsOf(geometry)) {
    if (!Array.isArray(polygon) || polygon.length === 0) fail("GEO_SERVICE_AREA_INVALID", "a polygon needs at least one ring");
    for (const ring of polygon) {
      if (!Array.isArray(ring) || ring.length < 4) fail("GEO_SERVICE_AREA_INVALID", "a ring needs at least 4 positions");
      for (const position of ring) {
        if (!Array.isArray(position) || position.length !== 2) fail("GEO_SERVICE_AREA_INVALID", "positions are [lon, lat]");
        const point = validateGeoPoint({ lon: position[0], lat: position[1] }, bounds);
        if (bounds !== null && (point.lat < bounds.minLat || point.lat > bounds.maxLat || point.lon < bounds.minLon || point.lon > bounds.maxLon)) {
          fail("GEO_SERVICE_AREA_IMPLAUSIBLE", "a service area must lie inside the launch market");
        }
        minLon = Math.min(minLon, point.lon);
        maxLon = Math.max(maxLon, point.lon);
        minLat = Math.min(minLat, point.lat);
        maxLat = Math.max(maxLat, point.lat);
        positions += 1;
        if (positions > SERVICE_AREA_MAX_POSITIONS) fail("GEO_SERVICE_AREA_INVALID", `at most ${SERVICE_AREA_MAX_POSITIONS} positions`);
      }
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) fail("GEO_SERVICE_AREA_INVALID", "every ring must be closed");
    }
  }
  const facilityPoint = usableFacilityPoint(facility);
  if (facilityPoint !== null) {
    const nearest = { lon: Math.min(Math.max(facilityPoint.lon, minLon), maxLon), lat: Math.min(Math.max(facilityPoint.lat, minLat), maxLat) };
    if (haversineMeters(facilityPoint, nearest) > SERVICE_AREA_MAX_DISTANCE_KM * 1000) {
      fail("GEO_SERVICE_AREA_IMPLAUSIBLE", `a service area must lie within ${SERVICE_AREA_MAX_DISTANCE_KM} km of its branch`);
    }
  }
  const src = source(input.source);
  if (instant(input.expiresAt, "expiresAt") <= instant(input.observedAt, "observedAt")) fail("GEO_TIME_INVALID", "expiresAt must be after observedAt");
  if (input.status !== "ACTIVE" && input.status !== "INACTIVE") fail("GEO_SERVICE_AREA_INVALID", "status");
  const supersedesId = input.supersedesId === null ? null : opaque(input.supersedesId, "supersedesId", "GEO_CHAIN_INVALID");
  if (supersedesId === id) fail("GEO_CHAIN_INVALID", "a service area cannot supersede itself");
  return Object.freeze({
    id,
    tenantId,
    branchId,
    serviceId,
    geometry: JSON.parse(JSON.stringify(geometry)) as GeoPolygon | GeoMultiPolygon,
    source: Object.freeze(src),
    observedAt: input.observedAt,
    expiresAt: input.expiresAt,
    status: input.status,
    supersedesId,
  });
}

function insideRing(point: GeoPoint, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > point.lat !== yj > point.lat && point.lon < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// A geometry fact only. The result type has no availability member and availabilityImplied is
// the literal false: being inside a service area never means care or a slot is available.
export function withinServiceArea(area: GeoServiceArea, point: GeoPoint): { inside: boolean; availabilityImplied: false } {
  const p = validateGeoPoint(point, null);
  const inside = polygonsOf(area.geometry).some((polygon) => insideRing(p, polygon[0]) && !polygon.slice(1).some((hole) => insideRing(p, hole)));
  return Object.freeze({ inside, availabilityImplied: false as const });
}
