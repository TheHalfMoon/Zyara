// Zyara geospatial GEO-10: AI and voice geo capabilities.
//
// Authority: docs/canonical/ZYARA_GEOSPATIAL_PLATFORM_PLAN_2026-09-22.md §§16, 16A, 20, 23 and
// docs/evidence/GEO/GEO-10/WORK_PACKET.md. AI may interpret, retrieve, navigate, explain, draft
// and propose; structured Zyara systems and authorized humans own facts and actions. Geo tools
// are typed AIF-01 capabilities resolved by the AIF-01B resolver; model coordinates are view
// hints only, entity ids must resolve to the session's current tool output, share state is a
// coarse public allowlist, voice changes the view only, and a branch coordinate changes only
// through the human-only admin command (GEO-01C correction).

import type { CapabilityDefinition } from "@zyara/capability-gateway";
import { GeoContractError, type GeoContractErrorCode, type GeoPoint, validateGeoPoint } from "./assertion.js";

const OPAQUE_ID_SCHEMA = { type: "string", pattern: "^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$" } as const;
const GEO_POINT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    lon: { type: "number", minimum: -180, maximum: 180 },
    lat: { type: "number", minimum: -90, maximum: 90 },
  },
  required: ["lon", "lat"],
} as const;

// Exact JSON-compatible AIF-01 schema references. The digest is SHA-256 over canonical JSON
// (recursively sorted object keys, array order preserved) of the adjacent schema body.
// Write-capability inputs deliberately carry opaque refs only; resolved coordinates never
// originate in a model-produced write payload.
export const GEO_CAPABILITY_SCHEMAS = Object.freeze({
  searchNearby: {
    input: {
      id: "geo.directory.search_nearby.input",
      version: "1.0.0",
      digest: "schema_875c00ca849070d62bb2b5094ac13c229bfd99acbfc2f985dd47c2483cfd5e93",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          origin: {
            oneOf: [
              {
                type: "object",
                additionalProperties: false,
                properties: {
                  kind: { const: "RESULT_ENTITY" },
                  resultSetId: OPAQUE_ID_SCHEMA,
                  entityId: OPAQUE_ID_SCHEMA,
                },
                required: ["kind", "resultSetId", "entityId"],
              },
              {
                type: "object",
                additionalProperties: false,
                properties: { kind: { const: "DEVICE_LOCATION_REF" }, ref: OPAQUE_ID_SCHEMA },
                required: ["kind", "ref"],
              },
            ],
          },
          specialtyCode: {
            oneOf: [{ type: "null" }, { type: "string", pattern: "^[a-z][a-z0-9_]{1,63}$" }],
          },
        },
        required: ["origin"],
      },
    },
    output: {
      id: "geo.directory.search_nearby.output",
      version: "1.0.0",
      digest: "schema_b54e1584052d3f3291ea352207664253a46e5320334ee85c733e85858a08a75e",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          resultSetId: OPAQUE_ID_SCHEMA,
          entityIds: { type: "array", items: OPAQUE_ID_SCHEMA, uniqueItems: true },
          expiresAt: { type: "string", format: "date-time" },
        },
        required: ["resultSetId", "entityIds", "expiresAt"],
      },
    },
  },
  setView: {
    input: {
      id: "geo.map.set_view.input",
      version: "1.0.0",
      digest: "schema_4287aca4cd923753882d1de2d45df8178c68736c92d9562ee5f99e20cbee0b2b",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: { center: GEO_POINT_SCHEMA, zoom: { type: "number" } },
        required: ["center", "zoom"],
      },
    },
    output: {
      id: "geo.map.set_view.output",
      version: "1.0.0",
      digest: "schema_bb8831e978872d3616155856d95ee556da770b3d1d6345322670845283797b9f",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          center: GEO_POINT_SCHEMA,
          zoom: { type: "integer", minimum: 3, maximum: 18 },
          trust: { const: "UNTRUSTED_VIEW_HINT" },
        },
        required: ["center", "zoom", "trust"],
      },
    },
  },
  shareScene: {
    input: {
      id: "geo.scene.share.input",
      version: "1.0.0",
      digest: "schema_baa3a4fea5451ba4d3eaab1d94a28091a433aec31b741d19cb639b88c212d567",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: { sceneRef: OPAQUE_ID_SCHEMA },
        required: ["sceneRef"],
      },
    },
    output: {
      id: "geo.scene.share.output",
      version: "1.0.0",
      digest: "schema_9b9e6f9b241a30b7943b90cfa9e8786c5b7518b6c6d5dd6ccef5410608fad363",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          viewport: {
            type: "object",
            additionalProperties: false,
            properties: {
              center: GEO_POINT_SCHEMA,
              zoom: { type: "integer", minimum: 3, maximum: 14 },
            },
            required: ["center", "zoom"],
          },
          layers: {
            type: "array",
            items: { type: "string", enum: ["providers", "entrances", "accessibility", "parking"] },
            uniqueItems: true,
          },
          branchIds: { type: "array", items: OPAQUE_ID_SCHEMA, uniqueItems: true },
        },
        required: ["viewport", "layers", "branchIds"],
      },
    },
  },
  proposeCorrection: {
    input: {
      id: "geo.location.propose_correction.input",
      version: "1.0.0",
      digest: "schema_5c7252faf738252f1e24a2e4199b89f4a0730258208162673ea9600a3c516056",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: { branchId: OPAQUE_ID_SCHEMA, geocoderResultRef: OPAQUE_ID_SCHEMA },
        required: ["branchId", "geocoderResultRef"],
      },
    },
    output: {
      id: "geo.location.propose_correction.output",
      version: "1.0.0",
      digest: "schema_adcbe2ea0518c19ba33dfa9104bb26b0ca736b202a1a83d68be0b208a4c719d9",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          proposalRef: OPAQUE_ID_SCHEMA,
          status: { const: "PENDING_REVIEW" },
          requiresCapability: { const: "geo.location.correct" },
        },
        required: ["proposalRef", "status", "requiresCapability"],
      },
    },
  },
  correct: {
    input: {
      id: "geo.location.correct.input",
      version: "1.0.0",
      digest: "schema_af6b91c1a0516e6b1082bd06dd9409e50ac01e633e7a4634fad365902c132c31",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: { branchId: OPAQUE_ID_SCHEMA, proposalRef: OPAQUE_ID_SCHEMA },
        required: ["branchId", "proposalRef"],
      },
    },
    output: {
      id: "geo.location.correct.output",
      version: "1.0.0",
      digest: "schema_38392fb7c0f688666cc77153625be70c18e49e767af308ea61156722651ae420",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: { correctionRef: OPAQUE_ID_SCHEMA, status: { const: "RECORDED" } },
        required: ["correctionRef", "status"],
      },
    },
  },
} as const);

type GeoCapabilitySchemaPair = (typeof GEO_CAPABILITY_SCHEMAS)[keyof typeof GEO_CAPABILITY_SCHEMAS];

function geoCapability(
  id: string,
  schemas: GeoCapabilitySchemaPair,
  overrides: Pick<CapabilityDefinition, "readOrWrite" | "authorityClass" | "dataClasses" | "branchScope" | "riskClass"> &
    Partial<CapabilityDefinition>,
): CapabilityDefinition {
  const write = overrides.readOrWrite === "write";
  return Object.freeze({
    id,
    version: "1.0.0",
    ownerDomain: "geo",
    inputSchema: { id: schemas.input.id, version: schemas.input.version, digest: schemas.input.digest },
    outputSchema: { id: schemas.output.id, version: schemas.output.version, digest: schemas.output.digest },
    tenantScope: "SINGLE_TENANT",
    consentPurpose: "NOT_REQUIRED",
    credentialBinding: { kind: "none" },
    egressPolicy: "egress_internal_only",
    idempotency: write ? { mode: "CALLER_KEY", enforcedBy: "ZYARA_LEDGER" } : { mode: "NOT_APPLICABLE", enforcedBy: "NONE" },
    timeoutMs: 5000,
    retry: { maxAttempts: 1, retryOn: "TRANSIENT_ONLY" },
    dryRunSupport: write,
    verification: write
      ? { receiptKind: "zyara_ledger_receipt", method: "READ_BACK", onUnknownOutcome: "RECONCILE" }
      : { receiptKind: "read_result", method: "NONE_READ_ONLY", onUnknownOutcome: "RECONCILE" },
    observability: "METADATA_ONLY",
    ...overrides,
  }) as CapabilityDefinition;
}

export const GEO_CAPABILITY_IDS = {
  searchNearby: "geo.directory.search_nearby",
  setView: "geo.map.set_view",
  shareScene: "geo.scene.share",
  proposeCorrection: "geo.location.propose_correction",
  correct: "geo.location.correct",
} as const;

// The complete set of geo capabilities. There is no other geo write: the only path that changes
// a branch coordinate is geo.location.correct, which is A5_HUMAN_ONLY.
export const GEO_CAPABILITY_DEFINITIONS: readonly CapabilityDefinition[] = Object.freeze([
  geoCapability(GEO_CAPABILITY_IDS.searchNearby, GEO_CAPABILITY_SCHEMAS.searchNearby, { readOrWrite: "read", authorityClass: "A0_OBSERVE", dataClasses: ["PUBLIC"], branchScope: "TENANT_WIDE", riskClass: "routine" }),
  geoCapability(GEO_CAPABILITY_IDS.setView, GEO_CAPABILITY_SCHEMAS.setView, { readOrWrite: "read", authorityClass: "A0_OBSERVE", dataClasses: ["PUBLIC"], branchScope: "TENANT_WIDE", riskClass: "routine" }),
  geoCapability(GEO_CAPABILITY_IDS.shareScene, GEO_CAPABILITY_SCHEMAS.shareScene, { readOrWrite: "write", authorityClass: "A2_PREPARE", dataClasses: ["PUBLIC"], branchScope: "TENANT_WIDE", riskClass: "routine" }),
  geoCapability(GEO_CAPABILITY_IDS.proposeCorrection, GEO_CAPABILITY_SCHEMAS.proposeCorrection, { readOrWrite: "write", authorityClass: "A2_PREPARE", dataClasses: ["INTERNAL"], branchScope: "BRANCH", riskClass: "routine" }),
  geoCapability(GEO_CAPABILITY_IDS.correct, GEO_CAPABILITY_SCHEMAS.correct, { readOrWrite: "write", authorityClass: "A5_HUMAN_ONLY", dataClasses: ["INTERNAL"], branchScope: "BRANCH", riskClass: "elevated" }),
]);

function fail(code: GeoContractErrorCode, message: string): never {
  throw new GeoContractError(code, message);
}

const OPAQUE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
const COORDINATE_KEYS = /^(lat|lon|lng|latitude|longitude|coordinates?|point|position|location|origin|center|centre)$/i;

function opaque(value: unknown, label: string): string {
  if (typeof value !== "string" || !OPAQUE.test(value)) fail("GEO_AI_ARGUMENT_INVALID", `${label} must be an opaque id`);
  return value;
}

function instant(value: unknown, label: string): number {
  const parsed = typeof value === "string" && ISO_INSTANT.test(value) ? Date.parse(value) : Number.NaN;
  if (Number.isNaN(parsed) || new Date(parsed).toISOString().slice(0, 10) !== (value as string).slice(0, 10)) fail("GEO_TIME_INVALID", `${label} must be an ISO-8601 UTC instant`);
  return parsed;
}

// ---------------------------------------------------------------------------
// Model coordinates are untrusted
// ---------------------------------------------------------------------------

export const VIEW_ZOOM_MIN = 3;
export const VIEW_ZOOM_MAX = 18;

export interface UntrustedViewHint {
  center: GeoPoint;
  zoom: number;
  trust: "UNTRUSTED_VIEW_HINT";
}

// A model may suggest where the map looks. The suggestion moves the client viewport only; it is
// never a fact, a search origin or a patient location.
export function parseModelViewport(args: unknown): UntrustedViewHint {
  if (typeof args !== "object" || args === null) fail("GEO_AI_ARGUMENT_INVALID", "view arguments must be an object");
  const { center, zoom } = args as Record<string, unknown>;
  const point = validateGeoPoint(center);
  if (typeof zoom !== "number" || !Number.isFinite(zoom)) fail("GEO_AI_ARGUMENT_INVALID", "zoom must be a finite number");
  return Object.freeze({ center: Object.freeze(point), zoom: Math.min(VIEW_ZOOM_MAX, Math.max(VIEW_ZOOM_MIN, Math.round(zoom))), trust: "UNTRUSTED_VIEW_HINT" as const });
}

export type SearchOrigin =
  | { kind: "RESULT_ENTITY"; resultSetId: string; entityId: string }
  // Issued by the client after the patient consents to share location for this search; the
  // coordinates themselves stay on the client side of the boundary.
  | { kind: "DEVICE_LOCATION_REF"; ref: string };

export interface ModelSearchArgs {
  origin: SearchOrigin;
  specialtyCode: string | null;
}

export function parseModelSearchArgs(args: unknown): ModelSearchArgs {
  if (typeof args !== "object" || args === null) fail("GEO_AI_ARGUMENT_INVALID", "search arguments must be an object");
  const record = args as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (key !== "origin" && key !== "specialtyCode") fail(COORDINATE_KEYS.test(key) ? "GEO_AI_MODEL_COORDINATE_UNTRUSTED" : "GEO_AI_ARGUMENT_INVALID", `search argument ${key} is not accepted`);
  }
  const origin = record.origin as Record<string, unknown> | null;
  if (typeof origin !== "object" || origin === null) fail("GEO_AI_ARGUMENT_INVALID", "a search needs an origin reference");
  let parsed: SearchOrigin;
  if (origin.kind === "RESULT_ENTITY" && Object.keys(origin).length === 3) {
    parsed = { kind: "RESULT_ENTITY", resultSetId: opaque(origin.resultSetId, "origin.resultSetId"), entityId: opaque(origin.entityId, "origin.entityId") };
  } else if (origin.kind === "DEVICE_LOCATION_REF" && Object.keys(origin).length === 2) {
    parsed = { kind: "DEVICE_LOCATION_REF", ref: opaque(origin.ref, "origin.ref") };
  } else {
    fail("GEO_AI_MODEL_COORDINATE_UNTRUSTED", "a search origin is a current result entity or a device-location reference, never model coordinates");
  }
  const specialtyCode = record.specialtyCode ?? null;
  if (specialtyCode !== null && (typeof specialtyCode !== "string" || !/^[a-z][a-z0-9_]{1,63}$/.test(specialtyCode))) fail("GEO_AI_ARGUMENT_INVALID", "specialtyCode must be a code");
  return Object.freeze({ origin: Object.freeze(parsed), specialtyCode: specialtyCode as string | null });
}

// Write-capability arguments never carry coordinates, at any depth.
export function assertNoModelCoordinates(args: unknown, path = "args"): void {
  if (Array.isArray(args)) {
    args.forEach((item, index) => assertNoModelCoordinates(item, `${path}[${index}]`));
    return;
  }
  if (typeof args !== "object" || args === null) return;
  for (const [key, value] of Object.entries(args)) {
    if (COORDINATE_KEYS.test(key)) fail("GEO_AI_MODEL_COORDINATE_UNTRUSTED", `${path}.${key}: a write never accepts model coordinates`);
    assertNoModelCoordinates(value, `${path}.${key}`);
  }
}

// ---------------------------------------------------------------------------
// Result ledger: entity ids resolve only to the session's current tool output
// ---------------------------------------------------------------------------

export const RESULT_SET_MAX_TTL_MS = 15 * 60 * 1000;

interface ResultSet {
  id: string;
  tenantId: string;
  sessionRef: string;
  entityIds: ReadonlySet<string>;
  expiresAt: number;
}

export class GeoResultLedger {
  readonly #sets = new Map<string, ResultSet>();
  readonly #current = new Map<string, string>();
  #counter = 0;

  // Records a tool output and makes it the session's current result set; earlier sets of the
  // session are superseded.
  issue(input: { tenantId: string; sessionRef: string; entityIds: readonly string[]; issuedAt: string; ttlMs: number }): string {
    const tenantId = opaque(input.tenantId, "tenantId");
    const sessionRef = opaque(input.sessionRef, "sessionRef");
    const issuedAt = instant(input.issuedAt, "issuedAt");
    if (!Number.isInteger(input.ttlMs) || input.ttlMs <= 0 || input.ttlMs > RESULT_SET_MAX_TTL_MS) fail("GEO_AI_ARGUMENT_INVALID", `ttlMs must be in (0, ${RESULT_SET_MAX_TTL_MS}]`);
    const entityIds = new Set(input.entityIds.map((id) => opaque(id, "entityId")));
    this.#counter += 1;
    const id = `rs-${sessionRef}-${this.#counter}`;
    this.#sets.set(id, { id, tenantId, sessionRef, entityIds, expiresAt: issuedAt + input.ttlMs });
    this.#current.set(`${tenantId}\u0000${sessionRef}`, id);
    return id;
  }

  resolveEntity(input: { tenantId: string; sessionRef: string; resultSetId: string; entityId: string; now: string }): string {
    const set = this.#sets.get(input.resultSetId);
    const now = instant(input.now, "now");
    if (set === undefined) fail("GEO_AI_RESULT_STALE", "unknown result set");
    if (set.tenantId !== input.tenantId || set.sessionRef !== input.sessionRef) fail("GEO_AI_RESULT_STALE", "the result set belongs to another session");
    if (this.#current.get(`${set.tenantId}\u0000${set.sessionRef}`) !== set.id) fail("GEO_AI_RESULT_STALE", "the result set was superseded by a newer tool output");
    if (now >= set.expiresAt) fail("GEO_AI_RESULT_STALE", "the result set expired");
    if (!set.entityIds.has(input.entityId)) fail("GEO_AI_RESULT_STALE", "the entity was not part of this tool output");
    return input.entityId;
  }
}

// ---------------------------------------------------------------------------
// Public share state
// ---------------------------------------------------------------------------

export const SHARE_MAX_ZOOM = 14;
export const PUBLIC_SHARE_LAYERS: ReadonlySet<string> = new Set(["providers", "entrances", "accessibility", "parking"]);

export interface PublicShareState {
  viewport: { center: GeoPoint; zoom: number };
  layers: string[];
  branchIds: string[];
}

function coarse(value: number): number {
  return Math.round(value * 100) / 100;
}

// Builds share state from an allowlist. Everything else in the scene (patient origin, search
// text, specialty or care intent, patient/account/session refs, tenant-internal branches) is
// dropped, so a share URL never carries private or sensitive context (plan §§16, 16A, 20).
export function buildPublicShareState(scene: unknown, publicBranchIds: ReadonlySet<string>): PublicShareState {
  if (typeof scene !== "object" || scene === null) fail("GEO_AI_ARGUMENT_INVALID", "scene must be an object");
  const record = scene as Record<string, unknown>;
  const viewport = (record.viewport ?? null) as Record<string, unknown> | null;
  if (typeof viewport !== "object" || viewport === null) fail("GEO_AI_ARGUMENT_INVALID", "scene needs a viewport");
  const center = validateGeoPoint(viewport.center);
  const zoom = typeof viewport.zoom === "number" && Number.isFinite(viewport.zoom) ? viewport.zoom : SHARE_MAX_ZOOM;
  const layers = Array.isArray(record.layers) ? [...new Set(record.layers.filter((layer): layer is string => typeof layer === "string" && PUBLIC_SHARE_LAYERS.has(layer)))].sort() : [];
  const branchIds = Array.isArray(record.branchIds)
    ? [...new Set(record.branchIds.filter((id): id is string => typeof id === "string" && publicBranchIds.has(id)))].sort()
    : [];
  return {
    viewport: { center: { lon: coarse(center.lon), lat: coarse(center.lat) }, zoom: Math.min(SHARE_MAX_ZOOM, Math.max(VIEW_ZOOM_MIN, Math.round(zoom))) },
    layers,
    branchIds,
  };
}

// ---------------------------------------------------------------------------
// Voice changes the view only
// ---------------------------------------------------------------------------

export type InvocationOrigin = "VOICE" | "CHAT" | "UI";
export const VOICE_CAPABILITIES: ReadonlySet<string> = new Set([GEO_CAPABILITY_IDS.setView, GEO_CAPABILITY_IDS.searchNearby]);

// Checked before resolution: a voice-originated call may only change the view or retrieve public
// results. It can never prepare, propose or perform a write, so voice never changes provider truth.
export function assertOriginAllowed(origin: InvocationOrigin, capabilityId: string): void {
  if (origin !== "VOICE" && origin !== "CHAT" && origin !== "UI") fail("GEO_AI_ARGUMENT_INVALID", "unknown invocation origin");
  if (origin === "VOICE" && !VOICE_CAPABILITIES.has(capabilityId)) fail("GEO_AI_VOICE_VIEW_ONLY", "voice may only change the map view or search public results");
}

// ---------------------------------------------------------------------------
// Geocoder output never updates a branch coordinate by itself
// ---------------------------------------------------------------------------

export interface GeocoderResult {
  provider: string;
  resultRef: string;
  point: GeoPoint;
  observedAt: string;
}

export interface CoordinateCorrectionProposal {
  kind: "CORRECTION_PROPOSAL";
  tenantId: string;
  branchId: string;
  proposedPoint: GeoPoint;
  sourceKind: "EXTERNAL_DATASET";
  sourceRef: string;
  observedAt: string;
  requiresCapability: typeof GEO_CAPABILITY_IDS.correct;
  status: "PENDING_REVIEW";
}

// A geocoder (or model) result becomes a draft for review, never a location assertion. Applying
// it is the GEO-01C correction: a superseding assertion plus a correction record, by a provider
// or Zyara admin, through geo.location.correct.
export function proposeCorrectionFromGeocoder(input: { tenantId: string; branchId: string; result: GeocoderResult }): CoordinateCorrectionProposal {
  const result = input.result;
  if (typeof result !== "object" || result === null) fail("GEO_AI_ARGUMENT_INVALID", "a geocoder result is required");
  const provider = opaque(result.provider, "result.provider");
  const resultRef = opaque(result.resultRef, "result.resultRef");
  instant(result.observedAt, "result.observedAt");
  return Object.freeze({
    kind: "CORRECTION_PROPOSAL",
    tenantId: opaque(input.tenantId, "tenantId"),
    branchId: opaque(input.branchId, "branchId"),
    proposedPoint: Object.freeze(validateGeoPoint(result.point)),
    sourceKind: "EXTERNAL_DATASET",
    sourceRef: `${provider}:${resultRef}`.slice(0, 128),
    observedAt: result.observedAt,
    requiresCapability: GEO_CAPABILITY_IDS.correct,
    status: "PENDING_REVIEW",
  });
}

