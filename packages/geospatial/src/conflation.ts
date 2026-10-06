// Zyara geospatial GEO-01C: external spatial identity and conflation.
//
// Authority: docs/canonical/ZYARA_GEOSPATIAL_PLATFORM_PLAN_2026-09-22.md §§13A, 23 and
// docs/evidence/GEO/GEO-01C/WORK_PACKET.md.
//
// Basemap and geocoder POIs are external observations, not Zyara provider identities. They
// never create a facility, move a point or delete Zyara truth: they are evidence for a
// candidate, and a candidate becomes a canonical link only through a provider-declared exact
// id (the one automatic path) or a human/provider review. Distance alone and name alone never
// link. Coordinate changes are GEO-01A superseding assertions with an audited correction
// record; external disagreement opens a conflict that stays visible until it is resolved.

import {
  GeoContractError,
  type GeoContractErrorCode,
  type GeoLocationAssertion,
  type GeoPlausibilityBounds,
  type GeoPoint,
  type GeoSourceKind,
  type GeoVerificationState,
  SAUDI_ARABIA_BOUNDS,
  validateGeoPoint,
} from "./assertion.js";
import { haversineMeters, isPublicSafeText } from "./access.js";

export const EXTERNAL_AUTHORITIES = ["OPEN_DATA", "REGULATOR", "GEOCODER"] as const;
export type ExternalAuthority = (typeof EXTERNAL_AUTHORITIES)[number];

export interface GeoExternalNamespace {
  namespace: string;
  authority: ExternalAuthority;
  // Anchored regex (^...$) for this namespace's external ids.
  idPattern: string;
  linkAllowed: boolean;
}

// Mirrors the reference rows seeded by migration 049. OSM is the only external ecosystem with an
// adoption record; no geocoder is admitted, and a geocoder namespace is never linkable.
export const SEEDED_EXTERNAL_NAMESPACES: readonly GeoExternalNamespace[] = Object.freeze([
  Object.freeze({ namespace: "osm-node", authority: "OPEN_DATA", idPattern: "^[1-9][0-9]{0,15}$", linkAllowed: true }),
  Object.freeze({ namespace: "osm-way", authority: "OPEN_DATA", idPattern: "^[1-9][0-9]{0,15}$", linkAllowed: true }),
  Object.freeze({ namespace: "osm-relation", authority: "OPEN_DATA", idPattern: "^[1-9][0-9]{0,15}$", linkAllowed: true }),
] as const satisfies readonly GeoExternalNamespace[]);

export interface GeoExternalObservation {
  id: string;
  tenantId: string;
  namespace: string;
  externalId: string;
  presence: "PRESENT" | "ABSENT";
  // Required when PRESENT, null when ABSENT.
  point: GeoPoint | null;
  name: string | null;
  sourceRevision: string;
  observedAt: string;
}

export type GeoActorKind = "SYSTEM" | "PROVIDER" | "ZYARA_ADMIN";
export type GeoLinkBasis = "DETERMINISTIC_ID" | "REVIEWED_EVIDENCE";

export interface GeoExternalLinkEvent {
  id: string;
  tenantId: string;
  branchId: string;
  namespace: string;
  externalId: string;
  action: "LINK" | "UNLINK";
  // The LINK row an UNLINK ends; null for LINK.
  unlinksId: string | null;
  basis: GeoLinkBasis;
  actorKind: GeoActorKind;
  actorRef: string;
  evidenceRef: string;
  reasonCode: string;
}

export interface GeoBranchProfile {
  tenantId: string;
  branchId: string;
  current: GeoLocationAssertion | null;
  names: readonly string[];
  // External ids the provider declared for this branch in a provider-attested record.
  declaredExternalIds: readonly { namespace: string; externalId: string }[];
}

export type GeoLinkCandidate =
  | { decision: "DETERMINISTIC"; branchId: string }
  | { decision: "REVIEW"; branchId: string; distanceM: number }
  | { decision: "AMBIGUOUS"; branchIds: string[] }
  | { decision: "NO_MATCH" }
  | { decision: "NOT_LINKABLE"; reason: "NAMESPACE_UNKNOWN" | "NAMESPACE_NOT_LINKABLE" | "EXTERNAL_ID_INVALID" | "ABSENT" };

export type GeoConflictKind = "COORDINATE_MISMATCH" | "EXTERNAL_ABSENT";
export type GeoConflictResolution = "KEEP_ZYARA" | "CORRECTED" | "EXTERNAL_ERROR";

export interface GeoCoordinateConflictProposal {
  tenantId: string;
  branchId: string;
  assertionId: string;
  observationId: string;
  kind: GeoConflictKind;
  distanceM: number | null;
}

export interface GeoCorrectionRequest {
  actorKind: GeoActorKind;
  actorRef: string;
  reviewerRef: string | null;
  evidenceRef: string;
  reasonCode: string;
}

export interface GeoRecentCorrection {
  actorRef: string;
  recordedAt: string;
}

export const CANDIDATE_RADIUS_M = 250;
export const CONFLICT_MIN_DISTANCE_M = 150;
export const MATERIAL_MOVE_M = 50;
export const LARGE_MOVE_M = 1_000;
export const BULK_CORRECTION_WINDOW_MS = 24 * 60 * 60 * 1000;
export const BULK_CORRECTION_LIMIT = 10;
const NAME_MAX = 200;
const OPAQUE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const NAMESPACE = /^[a-z][a-z0-9-]{1,31}$/;
const EXTERNAL_ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/;
const REASON = /^[a-z][a-z0-9_]{1,63}$/;
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

function fail(code: GeoContractErrorCode, message: string): never {
  throw new GeoContractError(code, message);
}

function opaque(value: unknown, label: string, code: GeoContractErrorCode): string {
  if (typeof value !== "string" || !OPAQUE.test(value)) fail(code, `${label} must be an opaque id`);
  return value;
}

function instant(value: unknown, label: string, code: GeoContractErrorCode): number {
  const parsed = typeof value === "string" && ISO_INSTANT.test(value) ? Date.parse(value) : Number.NaN;
  if (Number.isNaN(parsed) || new Date(parsed).toISOString().slice(0, 10) !== (value as string).slice(0, 10)) {
    fail(code, `${label} must be an ISO-8601 UTC instant`);
  }
  return parsed;
}

function reason(value: unknown, code: GeoContractErrorCode): string {
  if (typeof value !== "string" || !REASON.test(value)) fail(code, "reasonCode must be a reason code");
  return value;
}

// ---------------------------------------------------------------------------
// Namespaces and external ids
// ---------------------------------------------------------------------------

function findNamespace(namespaces: readonly GeoExternalNamespace[], namespace: unknown): GeoExternalNamespace | null {
  if (typeof namespace !== "string" || !NAMESPACE.test(namespace)) return null;
  const entry = namespaces.find((item) => item.namespace === namespace) ?? null;
  if (entry === null) return null;
  if (typeof entry.idPattern !== "string" || !entry.idPattern.startsWith("^") || !entry.idPattern.endsWith("$")) fail("GEO_NAMESPACE_INVALID", "a namespace id pattern must be anchored");
  // Geocoder output never self-verifies (plan §23): a geocoder namespace is never linkable.
  if (entry.authority === "GEOCODER" && entry.linkAllowed) fail("GEO_NAMESPACE_INVALID", "a geocoder namespace cannot be linkable");
  return entry;
}

function externalIdMatches(entry: GeoExternalNamespace, externalId: unknown): externalId is string {
  return typeof externalId === "string" && EXTERNAL_ID.test(externalId) && new RegExp(entry.idPattern).test(externalId);
}

// ---------------------------------------------------------------------------
// Observations
// ---------------------------------------------------------------------------

export function validateExternalObservation(
  input: GeoExternalObservation,
  namespaces: readonly GeoExternalNamespace[],
  bounds: GeoPlausibilityBounds | null = SAUDI_ARABIA_BOUNDS,
): GeoExternalObservation {
  const id = opaque(input.id, "id", "GEO_OBSERVATION_INVALID");
  const tenantId = opaque(input.tenantId, "tenantId", "GEO_OBSERVATION_INVALID");
  const entry = findNamespace(namespaces, input.namespace);
  if (entry === null) fail("GEO_NAMESPACE_INVALID", "the namespace is not registered");
  if (!externalIdMatches(entry, input.externalId)) fail("GEO_EXTERNAL_ID_INVALID", "the external id does not match its namespace");
  if (input.presence !== "PRESENT" && input.presence !== "ABSENT") fail("GEO_OBSERVATION_INVALID", "presence is PRESENT or ABSENT");
  if ((input.presence === "PRESENT") !== (input.point !== null)) fail("GEO_OBSERVATION_INVALID", "a PRESENT observation has a point and an ABSENT one has none");
  const point = input.point === null ? null : Object.freeze(validateGeoPoint(input.point, bounds));
  const name = input.name;
  if (name !== null) {
    if (typeof name !== "string" || name.trim().length === 0 || name.length > NAME_MAX) fail("GEO_OBSERVATION_INVALID", `name must be 1..${NAME_MAX} characters`);
    if (!isPublicSafeText(name)) fail("GEO_TEXT_NOT_PUBLIC_SAFE", "an external name must be a public facility name");
  }
  const sourceRevision = opaque(input.sourceRevision, "sourceRevision", "GEO_PROVENANCE_REQUIRED");
  instant(input.observedAt, "observedAt", "GEO_TIME_INVALID");
  return Object.freeze({ id, tenantId, namespace: entry.namespace, externalId: input.externalId, presence: input.presence, point, name, sourceRevision, observedAt: input.observedAt });
}

// ---------------------------------------------------------------------------
// Candidates
// ---------------------------------------------------------------------------

// Equality-only normalization for Arabic and English facility names. There is deliberately no
// similarity score, so name evidence cannot drift into fuzzy, name-only matching.
export function normalizeFacilityName(name: string): string {
  return name
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[آأإٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function usablePoint(assertion: GeoLocationAssertion | null): GeoPoint | null {
  if (assertion === null || assertion.point === null) return null;
  if (assertion.precision === "UNKNOWN" || assertion.precision === "PRIVATE_HIDDEN" || assertion.verificationState === "DISPUTED") return null;
  return assertion.point;
}

// Classifies one external observation against one tenant's branch profiles. The result is a
// proposal: only DETERMINISTIC may be linked by the SYSTEM actor; REVIEW needs a human or
// provider; AMBIGUOUS and NO_MATCH never link.
export function assessLinkCandidates(
  observation: GeoExternalObservation,
  branches: readonly GeoBranchProfile[],
  namespaces: readonly GeoExternalNamespace[],
): GeoLinkCandidate {
  if (observation.presence !== "PRESENT" || observation.point === null) return { decision: "NOT_LINKABLE", reason: "ABSENT" };
  const entry = findNamespace(namespaces, observation.namespace);
  if (entry === null) return { decision: "NOT_LINKABLE", reason: "NAMESPACE_UNKNOWN" };
  if (!entry.linkAllowed) return { decision: "NOT_LINKABLE", reason: "NAMESPACE_NOT_LINKABLE" };
  if (!externalIdMatches(entry, observation.externalId)) return { decision: "NOT_LINKABLE", reason: "EXTERNAL_ID_INVALID" };
  const own = branches.filter((branch) => branch.tenantId === observation.tenantId);

  const declared = own.filter((branch) =>
    branch.declaredExternalIds.some((item) => item.namespace === entry.namespace && item.externalId === observation.externalId),
  );
  if (declared.length === 1) return { decision: "DETERMINISTIC", branchId: declared[0].branchId };
  if (declared.length > 1) return { decision: "AMBIGUOUS", branchIds: declared.map((branch) => branch.branchId).sort() };

  // Spatial AND name evidence together; either one alone is never enough.
  const observedName = observation.name === null ? "" : normalizeFacilityName(observation.name);
  if (observedName === "") return { decision: "NO_MATCH" };
  const matches: { branchId: string; distanceM: number }[] = [];
  for (const branch of own) {
    const point = usablePoint(branch.current);
    if (point === null) continue;
    const distanceM = haversineMeters(point, observation.point);
    if (distanceM > CANDIDATE_RADIUS_M) continue;
    if (!branch.names.some((name) => normalizeFacilityName(name) === observedName)) continue;
    matches.push({ branchId: branch.branchId, distanceM });
  }
  if (matches.length === 1) return { decision: "REVIEW", branchId: matches[0].branchId, distanceM: matches[0].distanceM };
  if (matches.length > 1) return { decision: "AMBIGUOUS", branchIds: matches.map((match) => match.branchId).sort() };
  return { decision: "NO_MATCH" };
}

// ---------------------------------------------------------------------------
// Canonical links
// ---------------------------------------------------------------------------

// The LINK rows that no UNLINK row ends. History is never removed.
export function activeLinks(history: readonly GeoExternalLinkEvent[]): GeoExternalLinkEvent[] {
  const ended = new Set(history.filter((event) => event.action === "UNLINK").map((event) => event.unlinksId));
  return history.filter((event) => event.action === "LINK" && !ended.has(event.id));
}

// Validates one link event against the namespace registry, the tenant's link history and, for
// an automatic link, the candidate decision that justifies it.
export function validateLinkEvent(
  event: GeoExternalLinkEvent,
  namespaces: readonly GeoExternalNamespace[],
  history: readonly GeoExternalLinkEvent[],
  candidate: GeoLinkCandidate | null = null,
): GeoExternalLinkEvent {
  const id = opaque(event.id, "id", "GEO_LINK_INVALID");
  const tenantId = opaque(event.tenantId, "tenantId", "GEO_LINK_INVALID");
  const branchId = opaque(event.branchId, "branchId", "GEO_LINK_INVALID");
  const entry = findNamespace(namespaces, event.namespace);
  if (entry === null) fail("GEO_NAMESPACE_INVALID", "the namespace is not registered");
  if (!entry.linkAllowed) fail("GEO_NAMESPACE_INVALID", "the namespace is not linkable");
  if (!externalIdMatches(entry, event.externalId)) fail("GEO_EXTERNAL_ID_INVALID", "the external id does not match its namespace");
  if (event.action !== "LINK" && event.action !== "UNLINK") fail("GEO_LINK_INVALID", "action is LINK or UNLINK");
  if (event.basis !== "DETERMINISTIC_ID" && event.basis !== "REVIEWED_EVIDENCE") fail("GEO_LINK_INVALID", "basis is not recognised");
  if (event.actorKind !== "SYSTEM" && event.actorKind !== "PROVIDER" && event.actorKind !== "ZYARA_ADMIN") fail("GEO_LINK_INVALID", "actorKind is not recognised");
  const actorRef = opaque(event.actorRef, "actorRef", "GEO_LINK_INVALID");
  const evidenceRef = opaque(event.evidenceRef, "evidenceRef", "GEO_LINK_INVALID");
  const reasonCode = reason(event.reasonCode, "GEO_LINK_INVALID");

  if (event.actorKind === "SYSTEM") {
    if (event.action !== "LINK" || event.basis !== "DETERMINISTIC_ID") fail("GEO_LINK_INVALID", "the SYSTEM actor may only link a deterministic id");
    if (candidate === null || candidate.decision !== "DETERMINISTIC" || candidate.branchId !== branchId) {
      fail("GEO_LINK_INVALID", "an automatic link needs a provider-declared exact id for this branch");
    }
  }
  if (event.action === "UNLINK" && event.basis !== "REVIEWED_EVIDENCE") fail("GEO_LINK_INVALID", "an unlink is a reviewed decision");

  const own = history.filter((item) => item.tenantId === tenantId);
  if (own.some((item) => item.id === id)) fail("GEO_LINK_INVALID", "duplicate link event id");
  const active = activeLinks(own);
  let unlinksId: string | null = null;
  if (event.action === "LINK") {
    if (event.unlinksId !== null) fail("GEO_LINK_INVALID", "a LINK ends nothing");
    if (active.some((item) => item.namespace === entry.namespace && item.externalId === event.externalId)) {
      fail("GEO_LINK_CONFLICT", "this external id already has an active link; unlink it first");
    }
    if (active.some((item) => item.branchId === branchId && item.namespace === entry.namespace)) {
      fail("GEO_LINK_CONFLICT", "this branch already has an active link in this namespace");
    }
  } else {
    unlinksId = opaque(event.unlinksId, "unlinksId", "GEO_LINK_INVALID");
    const target = active.find((item) => item.id === unlinksId);
    if (target === undefined) fail("GEO_LINK_INVALID", "an UNLINK must end an active LINK");
    if (target.branchId !== branchId || target.namespace !== entry.namespace || target.externalId !== event.externalId) {
      fail("GEO_LINK_INVALID", "an UNLINK must match the link it ends");
    }
  }
  return Object.freeze({
    id, tenantId, branchId, namespace: entry.namespace, externalId: event.externalId, action: event.action, unlinksId,
    basis: event.basis, actorKind: event.actorKind, actorRef, evidenceRef, reasonCode,
  });
}

// ---------------------------------------------------------------------------
// Coordinate conflicts
// ---------------------------------------------------------------------------

// External disagreement opens a conflict and never changes the assertion. Only an observation
// of an id actively linked to the assertion's branch can open one.
export function detectCoordinateConflict(
  assertion: GeoLocationAssertion,
  observation: GeoExternalObservation,
  links: readonly GeoExternalLinkEvent[],
): GeoCoordinateConflictProposal | null {
  if (assertion.tenantId !== observation.tenantId) fail("GEO_CONFLICT_INVALID", "a conflict stays within one tenant");
  const linked = activeLinks(links).some(
    (link) =>
      link.tenantId === assertion.tenantId && link.branchId === assertion.branchId && link.namespace === observation.namespace && link.externalId === observation.externalId,
  );
  if (!linked) return null;
  const base = { tenantId: assertion.tenantId, branchId: assertion.branchId, assertionId: assertion.id, observationId: observation.id };
  if (observation.presence === "ABSENT") return { ...base, kind: "EXTERNAL_ABSENT", distanceM: null };
  if (assertion.point === null || observation.point === null) return null;
  const distanceM = haversineMeters(assertion.point, observation.point);
  const threshold = Math.max(CONFLICT_MIN_DISTANCE_M, assertion.accuracyM ?? 0);
  return distanceM > threshold ? { ...base, kind: "COORDINATE_MISMATCH", distanceM } : null;
}

export function validateConflictResolution(input: {
  resolution: GeoConflictResolution;
  correctedAssertionId: string | null;
  actorKind: GeoActorKind;
  actorRef: string;
  evidenceRef: string;
  reasonCode: string;
}): void {
  if (input.resolution !== "KEEP_ZYARA" && input.resolution !== "CORRECTED" && input.resolution !== "EXTERNAL_ERROR") fail("GEO_CONFLICT_INVALID", "resolution is not recognised");
  if (input.actorKind !== "PROVIDER" && input.actorKind !== "ZYARA_ADMIN") fail("GEO_CONFLICT_INVALID", "a conflict is resolved by a provider or Zyara admin");
  if ((input.resolution === "CORRECTED") !== (input.correctedAssertionId !== null)) fail("GEO_CONFLICT_INVALID", "CORRECTED, and only CORRECTED, names the correcting assertion");
  if (input.correctedAssertionId !== null) opaque(input.correctedAssertionId, "correctedAssertionId", "GEO_CONFLICT_INVALID");
  opaque(input.actorRef, "actorRef", "GEO_CONFLICT_INVALID");
  opaque(input.evidenceRef, "evidenceRef", "GEO_CONFLICT_INVALID");
  reason(input.reasonCode, "GEO_CONFLICT_INVALID");
}

// ---------------------------------------------------------------------------
// Supersession authority and coordinate corrections
// ---------------------------------------------------------------------------

const SOURCE_RANK: Record<GeoSourceKind, number> = {
  EXTERNAL_DATASET: 1,
  PROVIDER_ATTESTATION: 2,
  REGULATOR_REGISTRY: 2,
  ZYARA_VERIFICATION: 3,
};
// A disputed head is resolved by Zyara verification, so a dispute cannot be used as a step to
// replace a verified point with a weaker one.
const REQUIRED_RANK: Record<GeoVerificationState, number> = {
  UNVERIFIED: 1,
  PROVIDER_ATTESTED: 2,
  DISPUTED: 3,
  VERIFIED: 3,
};

// The audited anchor of a chain (ordered root first, as currentGeoAssertion returns it): the
// point of the latest assertion that is the root or the target of a correction record and has a
// point. Mirrors geo_anchor_point in migration 049.
export function anchorPoint(chain: readonly GeoLocationAssertion[], correctedIds: ReadonlySet<string>): GeoPoint | null {
  for (let index = chain.length - 1; index >= 0; index -= 1) {
    const item = chain[index];
    if (item.point !== null && (item.supersedesId === null || correctedIds.has(item.id))) return item.point;
  }
  return null;
}

// The authority rule for any superseding assertion (migration 049 enforces it with a trigger
// on geo_location_assertions). A weaker source cannot supersede a stronger head; a provider or
// regulator may still dispute any head without materially moving it, which only hides it from
// the public directory until Zyara verification resolves it. Returns the move distance and
// whether a correction record is required. The move is measured from the audited anchor (see
// anchorPoint), so neither a detour through UNKNOWN nor small unaudited steps can hide a move.
export function validateSupersession(
  from: GeoLocationAssertion,
  to: GeoLocationAssertion,
  anchor: GeoPoint | null = from.point,
): { movedM: number | null; correctionRequired: boolean } {
  if (to.supersedesId !== from.id || to.tenantId !== from.tenantId || to.branchId !== from.branchId) {
    fail("GEO_CHAIN_INVALID", "the new assertion must directly supersede the head in the same tenant and branch");
  }
  const movedM = anchor !== null && to.point !== null ? haversineMeters(anchor, to.point) : null;
  const rank = SOURCE_RANK[to.source.kind];
  const dispute = to.verificationState === "DISPUTED" && rank >= 2 && (movedM === null || movedM <= MATERIAL_MOVE_M);
  if (!dispute && rank < REQUIRED_RANK[from.verificationState]) {
    fail("GEO_CORRECTION_AUTHORITY_TOO_LOW", `a ${to.source.kind} source cannot supersede a ${from.verificationState} assertion`);
  }
  return { movedM, correctionRequired: movedM !== null && movedM > MATERIAL_MOVE_M };
}

// Validates the correction record that accompanies a superseding assertion. Coordinates are
// corrected only by a provider or Zyara admin with evidence; large and bulk moves need an
// independent reviewer.
export function validateCoordinateCorrection(
  from: GeoLocationAssertion,
  to: GeoLocationAssertion,
  request: GeoCorrectionRequest,
  recent: readonly GeoRecentCorrection[],
  nowIso: string,
  anchor: GeoPoint | null = from.point,
): { movedM: number | null; reviewed: boolean } {
  const { movedM } = validateSupersession(from, to, anchor);
  if (request.actorKind !== "PROVIDER" && request.actorKind !== "ZYARA_ADMIN") fail("GEO_CORRECTION_INVALID", "coordinates are corrected by a provider or Zyara admin");
  const actorRef = opaque(request.actorRef, "actorRef", "GEO_CORRECTION_INVALID");
  opaque(request.evidenceRef, "evidenceRef", "GEO_CORRECTION_INVALID");
  reason(request.reasonCode, "GEO_CORRECTION_INVALID");
  const reviewerRef = request.reviewerRef === null ? null : opaque(request.reviewerRef, "reviewerRef", "GEO_CORRECTION_INVALID");
  if (reviewerRef !== null && reviewerRef === actorRef) fail("GEO_CORRECTION_INVALID", "the reviewer must differ from the actor");

  if (movedM !== null && movedM > LARGE_MOVE_M && reviewerRef === null) {
    fail("GEO_CORRECTION_REVIEW_REQUIRED", `a move of more than ${LARGE_MOVE_M} m needs an independent reviewer`);
  }
  const now = instant(nowIso, "now", "GEO_TIME_INVALID");
  const windowCount = recent.filter((item) => {
    if (item.actorRef !== actorRef) return false;
    const at = instant(item.recordedAt, "recordedAt", "GEO_TIME_INVALID");
    return at > now - BULK_CORRECTION_WINDOW_MS && at <= now;
  }).length;
  if (windowCount >= BULK_CORRECTION_LIMIT && reviewerRef === null) {
    fail("GEO_CORRECTION_RATE_LIMITED", `more than ${BULK_CORRECTION_LIMIT} corrections in 24 hours need an independent reviewer`);
  }
  return { movedM, reviewed: reviewerRef !== null };
}
