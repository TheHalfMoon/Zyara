// GEO-10 synthetic qualification: AI and voice geo capabilities.
//
// Proves, with synthetic data only, that geo tools are typed AIF-01 capabilities resolved by the
// AIF-01B resolver (unauthorized is denied), that model coordinates are view hints only, that
// entity ids resolve only to the session's current tool output, that share state is a coarse
// public allowlist, that voice changes the view only, and that a geocoder result can never move
// a branch coordinate without the human-only admin command.
import assert from "node:assert";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import {
  CapabilityContractError,
  CapabilityContractRegistry,
  CapabilityRegistryState,
  resolveCapability,
  validateCapabilityDefinition,
  validateGrant,
  type AdmittedCapability,
  type AuthenticatedPrincipal,
  type CapabilityGrantRecord,
  type CapabilityResolutionRequest,
  type ConfirmationQuery,
  type ResolverDependencies,
} from "@zyara/capability-gateway";
import {
  GEO_CAPABILITY_DEFINITIONS,
  GEO_CAPABILITY_IDS,
  GEO_CAPABILITY_SCHEMAS,
  GeoContractError,
  GeoResultLedger,
  RESULT_SET_MAX_TTL_MS,
  assertNoModelCoordinates,
  assertOriginAllowed,
  buildPublicShareState,
  parseModelSearchArgs,
  parseModelViewport,
  proposeCorrectionFromGeocoder,
  validateSupersession,
  type GeoContractErrorCode,
  type GeoLocationAssertion,
} from "@zyara/geospatial";

const NOW = "2026-10-06T12:00:00.000Z";
const RELEASE = { kind: "system", principal: "release_pipeline", id: "ci-release" } as const;
const PARAMS = `params_${"b".repeat(64)}`;

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
  }
  const encoded = JSON.stringify(value);
  if (encoded === undefined) throw new Error("schema must be JSON-compatible");
  return encoded;
}

function schemaDigest(schema: unknown): string {
  return `schema_${createHash("sha256").update(canonicalJson(schema)).digest("hex")}`;
}

function human(role: "branch_admin" | "clinician"): AuthenticatedPrincipal {
  return {
    kind: "human",
    context: {
      claims: {
        sub: "acct-geo-admin",
        iss: "https://idp.test",
        aud: "zyara",
        exp: 0,
        iat: 0,
        sid: "sess-geo-10",
        tenant: "t1",
        assurance: "aal2",
      },
      memberships: [{
        accountId: "acct-geo-admin",
        tenantId: "t1",
        branchId: "b1",
        role,
        revoked: false,
        patientId: null,
      }],
    },
  };
}

function expectCode(run: () => unknown, code: GeoContractErrorCode): void {
  assert.throws(run, (error: unknown) => error instanceof GeoContractError && error.code === code, `expected ${code}`);
}

async function geoWorld(): Promise<{ admitted: Map<string, AdmittedCapability>; state: CapabilityRegistryState; deps: ResolverDependencies; confirmations: ConfirmationQuery[] }> {
  const registry = new CapabilityContractRegistry();
  const state = new CapabilityRegistryState({ now: () => NOW });
  const admitted = new Map<string, AdmittedCapability>();
  for (const definition of GEO_CAPABILITY_DEFINITIONS) {
    const capability = await registry.register(definition, RELEASE);
    state.admit(capability);
    admitted.set(definition.id, capability);
  }
  const confirmations: ConfirmationQuery[] = [];
  const deps: ResolverDependencies = {
    clock: { now: () => NOW },
    registry: state.registryPort(),
    grants: state.grantsPort(),
    agents: { resolveAuthority: () => ({ allowed: false, reason: "AGENT_NOT_GRANTED" }) as never },
    approvals: { getRequest: () => null, claimant: state.claimantPort() },
    adapters: { certified: () => null },
    confirmations: {
      isConfirmed: (query) => confirmations.some((item) => JSON.stringify(item) === JSON.stringify(query)),
    },
  };
  return { admitted, state, deps, confirmations };
}

function grant(capabilityId: string, workflowId: string): CapabilityGrantRecord {
  return {
    grantId: `g-${workflowId}-${capabilityId}`,
    grantee: { kind: "workflow", id: workflowId },
    tenantId: "t1",
    branchId: null,
    capabilityId,
    version: "1.0.0",
    grantedAt: "2026-10-01T00:00:00.000Z",
    expiresAt: "2026-11-01T00:00:00.000Z",
    revokedAt: null,
  };
}

function resolveRequest(capability: AdmittedCapability, overrides: Partial<CapabilityResolutionRequest> = {}): CapabilityResolutionRequest {
  return {
    capability: { capabilityId: capability.definition.id, version: capability.definition.version, definitionDigest: capability.digest },
    requestedTenantId: null,
    branchId: null,
    parametersDigest: PARAMS,
    correlationId: "corr-geo-10",
    idempotencyKey: capability.definition.readOrWrite === "write" ? "idem-geo-10" : null,
    approvalRequestId: null,
    confirmationReceiptId: null,
    ...overrides,
  };
}

describe("GEO-10 typed capabilities and authorization", () => {
  it("every geo capability is a valid AIF-01 definition, and correction is human-only", () => {
    assert.deepStrictEqual(GEO_CAPABILITY_DEFINITIONS.map((definition) => definition.id).sort(), Object.values(GEO_CAPABILITY_IDS).sort());
    for (const definition of GEO_CAPABILITY_DEFINITIONS) validateCapabilityDefinition(definition);
    const schemaPairs = [
      [GEO_CAPABILITY_IDS.searchNearby, GEO_CAPABILITY_SCHEMAS.searchNearby],
      [GEO_CAPABILITY_IDS.setView, GEO_CAPABILITY_SCHEMAS.setView],
      [GEO_CAPABILITY_IDS.shareScene, GEO_CAPABILITY_SCHEMAS.shareScene],
      [GEO_CAPABILITY_IDS.proposeCorrection, GEO_CAPABILITY_SCHEMAS.proposeCorrection],
      [GEO_CAPABILITY_IDS.correct, GEO_CAPABILITY_SCHEMAS.correct],
    ] as const;
    for (const [id, schemas] of schemaPairs) {
      const definition = GEO_CAPABILITY_DEFINITIONS.find((item) => item.id === id);
      assert.ok(definition);
      assert.deepStrictEqual(definition.inputSchema, { id: schemas.input.id, version: schemas.input.version, digest: schemas.input.digest });
      assert.deepStrictEqual(definition.outputSchema, { id: schemas.output.id, version: schemas.output.version, digest: schemas.output.digest });
      assert.strictEqual(schemas.input.digest, schemaDigest(schemas.input.schema));
      assert.strictEqual(schemas.output.digest, schemaDigest(schemas.output.schema));
    }
    const correct = GEO_CAPABILITY_DEFINITIONS.find((definition) => definition.id === GEO_CAPABILITY_IDS.correct);
    assert.strictEqual(correct?.authorityClass, "A5_HUMAN_ONLY");
    // Every other write only prepares; nothing but the admin command changes facts.
    for (const definition of GEO_CAPABILITY_DEFINITIONS.filter((item) => item.readOrWrite === "write" && item.id !== GEO_CAPABILITY_IDS.correct)) {
      assert.strictEqual(definition.authorityClass, "A2_PREPARE");
    }
  });

  it("unauthorized capability denied", async () => {
    const { admitted, state, deps } = await geoWorld();
    state.grant(grant(GEO_CAPABILITY_IDS.setView, "wf-geo-assistant"));
    const principal = { kind: "workflow", workflowId: "wf-geo-assistant", tenantId: "t1" } as const;
    const allowed = await resolveCapability(principal, resolveRequest(admitted.get(GEO_CAPABILITY_IDS.setView)!), deps);
    assert.strictEqual(allowed.decision, "ALLOW");
    // No grant: denied. A grant for one capability never authorizes another.
    const denied = await resolveCapability(principal, resolveRequest(admitted.get(GEO_CAPABILITY_IDS.searchNearby)!), deps);
    assert.strictEqual(denied.decision, "DENY");
    const other = await resolveCapability({ kind: "workflow", workflowId: "wf-other", tenantId: "t1" }, resolveRequest(admitted.get(GEO_CAPABILITY_IDS.setView)!), deps);
    assert.strictEqual(other.decision, "DENY");
    // The admin command can never be granted to an agent or a workflow.
    const correct = admitted.get(GEO_CAPABILITY_IDS.correct)!;
    for (const grantee of [{ kind: "agent", id: "agent-geo" }, { kind: "workflow", id: "wf-geo-assistant" }] as const) {
      assert.throws(
        () => validateGrant(correct, { grantee, tenantId: "t1", branchId: "b1", capabilityId: correct.definition.id, version: "1.0.0" }),
        (error: unknown) => error instanceof CapabilityContractError && error.code === "CAPABILITY_HUMAN_ONLY",
      );
    }
    validateGrant(correct, { grantee: { kind: "human_role", id: "branch_admin" }, tenantId: "t1", branchId: "b1", capabilityId: correct.definition.id, version: "1.0.0" });
  });
});

describe("GEO-10 model coordinates are untrusted", () => {
  it("a model viewport is a clamped view hint, never a fact", () => {
    const hint = parseModelViewport({ center: { lon: 46.6753, lat: 24.7136 }, zoom: 25.4 });
    assert.deepStrictEqual(hint, { center: { lon: 46.6753, lat: 24.7136 }, zoom: 18, trust: "UNTRUSTED_VIEW_HINT" });
    expectCode(() => parseModelViewport({ center: { lon: 200, lat: 24 }, zoom: 10 }), "GEO_LONGITUDE_OUT_OF_RANGE");
    expectCode(() => parseModelViewport({ center: { lon: 46.6, lat: 24.7 }, zoom: Number.NaN }), "GEO_AI_ARGUMENT_INVALID");
  });

  it("a search origin is a current result entity or a device-location reference, never model coordinates", () => {
    assert.strictEqual(parseModelSearchArgs({ origin: { kind: "DEVICE_LOCATION_REF", ref: "devloc-123" }, specialtyCode: "dental" }).origin.kind, "DEVICE_LOCATION_REF");
    assert.strictEqual(parseModelSearchArgs({ origin: { kind: "RESULT_ENTITY", resultSetId: "rs-1", entityId: "b1" } }).specialtyCode, null);
    expectCode(() => parseModelSearchArgs({ lat: 24.7, lon: 46.6 }), "GEO_AI_MODEL_COORDINATE_UNTRUSTED");
    expectCode(() => parseModelSearchArgs({ origin: { lat: 24.7, lon: 46.6 } }), "GEO_AI_MODEL_COORDINATE_UNTRUSTED");
    expectCode(() => parseModelSearchArgs({ origin: { kind: "DEVICE_LOCATION_REF", ref: "devloc-1", lat: 24.7 } }), "GEO_AI_MODEL_COORDINATE_UNTRUSTED");
    expectCode(() => parseModelSearchArgs({ origin: { kind: "DEVICE_LOCATION_REF", ref: "devloc-1" }, note: "x" }), "GEO_AI_ARGUMENT_INVALID");
  });

  it("write arguments never accept coordinates at any depth", () => {
    assertNoModelCoordinates({ branchId: "b1", evidenceRef: "ev-1" });
    expectCode(() => assertNoModelCoordinates({ branchId: "b1", proposal: { location: { lat: 24.7, lon: 46.6 } } }), "GEO_AI_MODEL_COORDINATE_UNTRUSTED");
    expectCode(() => assertNoModelCoordinates({ items: [{ Latitude: 24.7 }] }), "GEO_AI_MODEL_COORDINATE_UNTRUSTED");
  });
});

describe("GEO-10 result ids", () => {
  it("stale result ids rejected", () => {
    const ledger = new GeoResultLedger();
    const first = ledger.issue({ tenantId: "t1", sessionRef: "s1", entityIds: ["b1", "b2"], issuedAt: NOW, ttlMs: 600_000 });
    assert.strictEqual(ledger.resolveEntity({ tenantId: "t1", sessionRef: "s1", resultSetId: first, entityId: "b1", now: NOW }), "b1");
    // Never returned, another session, another tenant, unknown set.
    assert.throws(() => ledger.resolveEntity({ tenantId: "t1", sessionRef: "s1", resultSetId: first, entityId: "b9", now: NOW }), (e: unknown) => e instanceof GeoContractError && e.code === "GEO_AI_RESULT_STALE");
    assert.throws(() => ledger.resolveEntity({ tenantId: "t1", sessionRef: "s2", resultSetId: first, entityId: "b1", now: NOW }), (e: unknown) => e instanceof GeoContractError && e.code === "GEO_AI_RESULT_STALE");
    assert.throws(() => ledger.resolveEntity({ tenantId: "t2", sessionRef: "s1", resultSetId: first, entityId: "b1", now: NOW }), (e: unknown) => e instanceof GeoContractError && e.code === "GEO_AI_RESULT_STALE");
    assert.throws(() => ledger.resolveEntity({ tenantId: "t1", sessionRef: "s1", resultSetId: "rs-forged", entityId: "b1", now: NOW }), (e: unknown) => e instanceof GeoContractError && e.code === "GEO_AI_RESULT_STALE");
    // Expired.
    assert.throws(() => ledger.resolveEntity({ tenantId: "t1", sessionRef: "s1", resultSetId: first, entityId: "b1", now: "2026-10-06T12:10:00.000Z" }), (e: unknown) => e instanceof GeoContractError && e.code === "GEO_AI_RESULT_STALE");
    // Superseded by a newer tool output in the same session.
    const second = ledger.issue({ tenantId: "t1", sessionRef: "s1", entityIds: ["b3"], issuedAt: NOW, ttlMs: 600_000 });
    assert.throws(() => ledger.resolveEntity({ tenantId: "t1", sessionRef: "s1", resultSetId: first, entityId: "b1", now: NOW }), (e: unknown) => e instanceof GeoContractError && e.code === "GEO_AI_RESULT_STALE");
    assert.strictEqual(ledger.resolveEntity({ tenantId: "t1", sessionRef: "s1", resultSetId: second, entityId: "b3", now: NOW }), "b3");
    expectCode(() => ledger.issue({ tenantId: "t1", sessionRef: "s1", entityIds: [], issuedAt: NOW, ttlMs: RESULT_SET_MAX_TTL_MS + 1 }), "GEO_AI_ARGUMENT_INVALID");
  });
});

describe("GEO-10 public share state", () => {
  it("public share state strips private fields", () => {
    const scene = {
      viewport: { center: { lon: 46.675312, lat: 24.713641 }, zoom: 17 },
      layers: ["providers", "patient_heat", "entrances"],
      branchIds: ["b1", "b-internal"],
      origin: { lon: 46.6801, lat: 24.7201 },
      searchText: "fertility clinic near my home",
      specialtyCode: "fertility",
      patientRef: "patient-77",
      accountId: "acct-9",
      sessionRef: "s1",
    };
    const share = buildPublicShareState(scene, new Set(["b1"]));
    assert.deepStrictEqual(share, { viewport: { center: { lon: 46.68, lat: 24.71 }, zoom: 14 }, layers: ["entrances", "providers"], branchIds: ["b1"] });
    const json = JSON.stringify(share);
    for (const forbidden of ["origin", "fertility", "patient", "acct", "s1", "b-internal", "46.6801", "46.675312"]) assert.ok(!json.includes(forbidden), `share state leaked ${forbidden}`);
  });
});

describe("GEO-10 voice and provider truth", () => {
  it("voice changes the view only, not provider truth", () => {
    assertOriginAllowed("VOICE", GEO_CAPABILITY_IDS.setView);
    assertOriginAllowed("VOICE", GEO_CAPABILITY_IDS.searchNearby);
    for (const capabilityId of [GEO_CAPABILITY_IDS.shareScene, GEO_CAPABILITY_IDS.proposeCorrection, GEO_CAPABILITY_IDS.correct, "booking.appointment.create"]) {
      expectCode(() => assertOriginAllowed("VOICE", capabilityId), "GEO_AI_VOICE_VIEW_ONLY");
    }
    assertOriginAllowed("UI", GEO_CAPABILITY_IDS.shareScene);
  });

  it("geocoder output cannot update a branch coordinate without the admin command", async () => {
    const proposal = proposeCorrectionFromGeocoder({ tenantId: "t1", branchId: "b1", result: { provider: "geocoder-x", resultRef: "abc123", point: { lon: 46.725, lat: 24.7136 }, observedAt: NOW } });
    assert.deepStrictEqual([proposal.kind, proposal.status, proposal.sourceKind, proposal.requiresCapability], ["CORRECTION_PROPOSAL", "PENDING_REVIEW", "EXTERNAL_DATASET", "geo.location.correct"]);

    // Authority comes from AIF-01B, never from a local actor-kind helper.
    const { admitted, state, deps, confirmations } = await geoWorld();
    const correct = admitted.get(GEO_CAPABILITY_IDS.correct)!;
    const workflow = await resolveCapability(
      { kind: "workflow", workflowId: "wf-geo", tenantId: "t1" },
      resolveRequest(correct, { branchId: "b1" }),
      deps,
    );
    assert.deepStrictEqual([workflow.decision, workflow.reasons], ["DENY", ["CAPABILITY_HUMAN_ONLY"]]);
    const noGrant = await resolveCapability(human("clinician"), resolveRequest(correct, { branchId: "b1" }), deps);
    assert.deepStrictEqual([noGrant.decision, noGrant.reasons], ["DENY", ["CAPABILITY_GRANT_MISSING"]]);

    state.grant({
      grantId: "g-geo-admin-correct",
      grantee: { kind: "human_role", id: "branch_admin" },
      tenantId: "t1",
      branchId: "b1",
      capabilityId: GEO_CAPABILITY_IDS.correct,
      version: "1.0.0",
      grantedAt: "2026-10-01T00:00:00.000Z",
      expiresAt: "2026-11-01T00:00:00.000Z",
      revokedAt: null,
    });
    const ask = await resolveCapability(human("branch_admin"), resolveRequest(correct, { branchId: "b1" }), deps);
    assert.deepStrictEqual([ask.decision, ask.reasons, ask.grantId], ["ASK", ["CONFIRMATION_REQUIRED"], "g-geo-admin-correct"]);
    confirmations.push({
      confirmationReceiptId: "conf-geo-correct",
      tenantId: "t1",
      accountId: "acct-geo-admin",
      capabilityId: GEO_CAPABILITY_IDS.correct,
      version: "1.0.0",
      parametersDigest: PARAMS,
      idempotencyKey: "idem-geo-10",
    });
    const allowed = await resolveCapability(
      human("branch_admin"),
      resolveRequest(correct, { branchId: "b1", confirmationReceiptId: "conf-geo-correct" }),
      deps,
    );
    assert.deepStrictEqual([allowed.decision, allowed.grantId, allowed.actorKind], ["ALLOW", "g-geo-admin-correct", "human"]);

    // Even then, the geocoder's EXTERNAL_DATASET source cannot supersede a verified head (GEO-01C).
    const verified: GeoLocationAssertion = {
      id: "geo-1", tenantId: "t1", branchId: "b1", point: { lon: 46.6753, lat: 24.7136 }, accuracyM: 10, precision: "VERIFIED_ENTRANCE", verificationState: "VERIFIED",
      verificationMethod: "site_visit", evidenceRef: "evidence-1", source: { kind: "ZYARA_VERIFICATION", ref: "v-1", revision: "r1" },
      observedAt: "2026-10-01T00:00:00.000Z", expiresAt: "2027-10-01T00:00:00.000Z", visibility: "PUBLIC_DIRECTORY", supersedesId: null,
    };
    const fromGeocoder: GeoLocationAssertion = {
      ...verified, id: "geo-2", supersedesId: "geo-1", point: proposal.proposedPoint, accuracyM: 500, precision: "APPROXIMATE_AREA", verificationState: "UNVERIFIED",
      verificationMethod: null, evidenceRef: null, source: { kind: proposal.sourceKind, ref: "geocoder-x", revision: "abc123" }, visibility: "TENANT_INTERNAL",
    };
    expectCode(() => validateSupersession(verified, fromGeocoder, verified.point), "GEO_CORRECTION_AUTHORITY_TOO_LOW");
  });
});
