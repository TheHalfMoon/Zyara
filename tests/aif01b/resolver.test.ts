// AIF-01B synthetic qualification: the deny-by-default capability resolver.
//
// Proves, with synthetic data only, the work packet's decision rules in order: the tenant and
// actor come only from the server-derived principal; every unknown or failing dependency is
// UNDECIDABLE, never ALLOW; agents, workflows and humans are each checked by their own
// existing authority (N5/C1, the grant, M002); approvals bind tenant, branch, action,
// parameters and one invocation; A5 needs a human and an exact confirmation; and every
// decision yields a deterministic, value-free receipt.
import assert from "node:assert";
import { describe, it } from "node:test";
import type { CertifiedAdapter } from "@zyara/adapter-harness";
import type { Membership, RequestContext } from "@zyara/authorization";
import {
  AgentIdentityStore,
  type AgentProvenance,
  type ApprovalRequest,
  type HumanSponsorDirectory,
} from "@zyara/collaboration";
import {
  CapabilityContractError,
  CapabilityContractRegistry,
  CapabilityRegistryState,
  RESOLUTION_VALIDITY_MS,
  resolveCapability,
  type AdmittedCapability,
  type AuthenticatedPrincipal,
  type CapabilityDefinition,
  type CapabilityGrantRecord,
  type CapabilityResolutionRequest,
  type ConfirmationQuery,
  type ResolverDependencies,
} from "@zyara/capability-gateway";

const NOW = "2026-10-06T12:00:00.000Z";
const HEX = "a".repeat(64);
const PARAMS = `params_${"b".repeat(64)}`;
const OTHER_PARAMS = `params_${"c".repeat(64)}`;
const RELEASE = { kind: "system", principal: "release_pipeline", id: "ci-release" } as const;

function definition(overrides: Partial<CapabilityDefinition>): CapabilityDefinition {
  const id = overrides.id ?? "reporting.read";
  return {
    id,
    version: "1.0.0",
    ownerDomain: id.split(".")[0],
    inputSchema: { id: `${id}.input`, version: "1.0.0", digest: `schema_${HEX}` },
    outputSchema: { id: `${id}.output`, version: "1.0.0", digest: `schema_${HEX}` },
    readOrWrite: "read",
    riskClass: "routine",
    authorityClass: "A0_OBSERVE",
    dataClasses: ["INTERNAL"],
    tenantScope: "SINGLE_TENANT",
    branchScope: "TENANT_WIDE",
    consentPurpose: "NOT_REQUIRED",
    credentialBinding: { kind: "none" },
    egressPolicy: "egress_internal_only",
    idempotency: { mode: "NOT_APPLICABLE", enforcedBy: "NONE" },
    timeoutMs: 5000,
    retry: { maxAttempts: 1, retryOn: "TRANSIENT_ONLY" },
    dryRunSupport: false,
    verification: { receiptKind: "read_result", method: "NONE_READ_ONLY", onUnknownOutcome: "RECONCILE" },
    observability: "METADATA_ONLY",
    ...overrides,
  };
}

const WRITE: Partial<CapabilityDefinition> = {
  readOrWrite: "write",
  riskClass: "elevated",
  authorityClass: "A3_EXECUTE_LOW",
  dataClasses: ["PII"],
  branchScope: "BRANCH",
  consentPurpose: "recall",
  idempotency: { mode: "CALLER_KEY", enforcedBy: "PROVIDER" },
  verification: { receiptKind: "provider_receipt", method: "PROVIDER_RECEIPT", onUnknownOutcome: "RECONCILE" },
};

const provenance: AgentProvenance = {
  source: "zyara-native",
  sourceRef: "AIF-01B resolver qualification",
  sourceRevision: "aif01b-test",
  observedAt: "2026-10-06T00:00:00Z",
};

class Sponsors implements HumanSponsorDirectory {
  eligible = new Set(["t1:account-sponsor"]);
  isEligibleHumanSponsor(lookup: { tenantId: string; accountId: string }): boolean {
    return this.eligible.has(`${lookup.tenantId}:${lookup.accountId}`);
  }
}

interface World {
  state: CapabilityRegistryState;
  caps: Record<"report" | "remind" | "broadcast" | "sign" | "book", AdmittedCapability>;
  agents: AgentIdentityStore;
  sponsors: Sponsors;
  approvals: Map<string, ApprovalRequest>;
  adapters: Map<string, CertifiedAdapter>;
  confirmations: ConfirmationQuery[];
  deps: ResolverDependencies;
  now: { value: string };
}

function grant(overrides: Partial<CapabilityGrantRecord> & Pick<CapabilityGrantRecord, "grantId" | "grantee" | "capabilityId">): CapabilityGrantRecord {
  return {
    tenantId: "t1",
    branchId: "b1",
    version: "1.0.0",
    grantedAt: "2026-10-01T00:00:00.000Z",
    expiresAt: "2026-11-01T00:00:00.000Z",
    revokedAt: null,
    ...overrides,
  };
}

async function world(): Promise<World> {
  const registry = new CapabilityContractRegistry();
  const caps = {
    report: await registry.register(definition({ id: "reporting.read" }), RELEASE),
    remind: await registry.register(definition({ id: "communications.reminder.send", ...WRITE }), RELEASE),
    broadcast: await registry.register(
      definition({ id: "communications.outbound.broadcast", ...WRITE, riskClass: "high" }),
      RELEASE,
    ),
    sign: await registry.register(
      definition({
        id: "documentation.note.sign",
        ...WRITE,
        authorityClass: "A5_HUMAN_ONLY",
        dataClasses: ["PHI", "CLINICAL_SIGNING_REQUIRED"],
        consentPurpose: "care",
      }),
      RELEASE,
    ),
    book: await registry.register(definition({ id: "booking.appointment.create", ...WRITE }), RELEASE),
  };
  const state = new CapabilityRegistryState();
  state.admit(caps.report);
  state.admit(caps.remind);
  state.admit(caps.broadcast);
  state.admit(caps.sign);
  state.admit(caps.book, { adapterId: "pms-1", adapterCapability: "create" });

  const sponsors = new Sponsors();
  const agents = new AgentIdentityStore();
  agents.register(
    {
      id: "agent-ops-1",
      tenantId: "t1",
      branchId: null,
      displayName: "Reporting Agent",
      kind: "reporting_agent",
      humanSponsorAccountId: "account-sponsor",
      effectiveFrom: "2026-10-01T00:00:00Z",
      expiresAt: "2026-12-01T00:00:00Z",
      credentialRef: "secret://synthetic/agents/agent-ops-1",
      provenance,
    },
    "t1",
    sponsors,
  );
  agents.grantCapability("agent-ops-1", "reporting.read", { kind: "human", accountId: "account-sponsor" }, "t1", { at: "2026-10-01T00:00:00Z" });

  state.grant(grant({ grantId: "g-agent-report", grantee: { kind: "agent", id: "agent-ops-1" }, capabilityId: "reporting.read", branchId: null }));
  state.grant(grant({ grantId: "g-wf-remind", grantee: { kind: "workflow", id: "wf-recall" }, capabilityId: "communications.reminder.send" }));
  state.grant(grant({ grantId: "g-wf-broadcast", grantee: { kind: "workflow", id: "wf-recall" }, capabilityId: "communications.outbound.broadcast" }));
  state.grant(grant({ grantId: "g-wf-book", grantee: { kind: "workflow", id: "wf-booking" }, capabilityId: "booking.appointment.create" }));
  state.grant(grant({ grantId: "g-human-sign", grantee: { kind: "human_role", id: "clinician" }, capabilityId: "documentation.note.sign", expiresAt: null }));

  const approvals = new Map<string, ApprovalRequest>();
  const adapters = new Map<string, CertifiedAdapter>([["pms-1", { adapterId: "pms-1", certified: new Set(["read", "create"]) }]]);
  const confirmations: ConfirmationQuery[] = [];
  const now = { value: NOW };
  const deps: ResolverDependencies = {
    clock: { now: () => now.value },
    registry: state.registryPort(),
    grants: state.grantsPort(),
    agents: { resolveAuthority: (agentId, tenantId, request) => agents.resolveAuthority(agentId, tenantId, request, sponsors) },
    approvals: {
      getRequest: (id, tenantId) => {
        const found = approvals.get(id);
        return found && found.tenantId === tenantId ? found : null;
      },
      claimant: state.claimantPort(),
    },
    adapters: { certified: (adapterId) => adapters.get(adapterId) ?? null },
    confirmations: {
      isConfirmed: (query) => confirmations.some((item) => JSON.stringify(item) === JSON.stringify(query)),
    },
  };
  return { state, caps, agents, sponsors, approvals, adapters, confirmations, deps, now };
}

function request(admitted: AdmittedCapability, overrides: Partial<CapabilityResolutionRequest> = {}): CapabilityResolutionRequest {
  return {
    capability: { capabilityId: admitted.definition.id, version: admitted.definition.version, definitionDigest: admitted.digest },
    requestedTenantId: null,
    branchId: "b1",
    parametersDigest: PARAMS,
    correlationId: "corr-0001",
    idempotencyKey: admitted.definition.readOrWrite === "write" ? "idem-0001" : null,
    approvalRequestId: null,
    confirmationReceiptId: null,
    ...overrides,
  };
}

const AGENT: AuthenticatedPrincipal = { kind: "agent", agentId: "agent-ops-1", tenantId: "t1" };
const WORKFLOW: AuthenticatedPrincipal = { kind: "workflow", workflowId: "wf-recall", tenantId: "t1" };
const BOOKING: AuthenticatedPrincipal = { kind: "workflow", workflowId: "wf-booking", tenantId: "t1" };

function human(memberships: Partial<Membership>[] = [{}], assurance: "aal1" | "aal2" = "aal2"): AuthenticatedPrincipal {
  const context: RequestContext = {
    claims: { sub: "acct-doc-1", iss: "https://idp.test", aud: "zyara", exp: 0, iat: 0, sid: "sess-1", tenant: "t1", assurance },
    memberships: memberships.map((item) => ({
      accountId: "acct-doc-1",
      tenantId: "t1",
      branchId: "b1",
      role: "clinician",
      revoked: false,
      patientId: null,
      ...item,
    })),
  };
  return { kind: "human", context };
}

function approval(overrides: Partial<ApprovalRequest> = {}): ApprovalRequest {
  return {
    id: "appr-1",
    tenantId: "t1",
    branchId: "b1",
    actionType: "communications.outbound.broadcast",
    riskClass: "high",
    requiredAuthority: "branch_admin",
    selfApprovalForbidden: true,
    evidenceRequired: true,
    parametersDigest: PARAMS,
    parameterKeys: ["audienceType", "channel", "scheduledHour"],
    requesterKind: "human",
    requesterAccountId: "acct-ops",
    requesterAgentId: null,
    requesterRef: null,
    status: "approved",
    correlationId: null,
    idempotencyKey: null,
    provenance: { source: "zyara-native", sourceRef: "aif01b", sourceRevision: "aif01b", observedAt: NOW },
    createdAt: "2026-10-06T11:00:00.000Z",
    updatedAt: "2026-10-06T11:30:00.000Z",
    expiresAt: "2026-10-06T12:30:00.000Z",
    ...overrides,
  } as ApprovalRequest;
}

describe("AIF-01B happy paths", () => {
  it("allows an agent, a workflow and a confirmed human through their own authorities", async () => {
    const w = await world();
    const agent = await resolveCapability(AGENT, request(w.caps.report, { branchId: null }), w.deps);
    assert.deepEqual([agent.decision, agent.reasons, agent.grantId], ["ALLOW", ["ALLOWED"], "g-agent-report"]);

    const workflow = await resolveCapability(WORKFLOW, request(w.caps.remind), w.deps);
    assert.deepEqual([workflow.decision, workflow.grantId], ["ALLOW", "g-wf-remind"]);

    const query: ConfirmationQuery = {
      confirmationReceiptId: "conf-1",
      tenantId: "t1",
      accountId: "acct-doc-1",
      capabilityId: "documentation.note.sign",
      version: "1.0.0",
      parametersDigest: PARAMS,
      idempotencyKey: "idem-0001",
    };
    w.confirmations.push(query);
    const signed = await resolveCapability(human(), request(w.caps.sign, { confirmationReceiptId: "conf-1" }), w.deps);
    assert.deepEqual([signed.decision, signed.grantId, signed.actorKind], ["ALLOW", "g-human-sign", "human"]);
  });
});

describe("AIF-01B principal binding", () => {
  it("rejects a body-supplied tenant and never evaluates under it", async () => {
    const w = await world();
    const receipt = await resolveCapability(WORKFLOW, request(w.caps.remind, { requestedTenantId: "t2" }), w.deps);
    assert.deepEqual([receipt.decision, receipt.reasons], ["DENY", ["CAPABILITY_CROSS_TENANT"]]);
    assert.equal(receipt.tenantId, "t1");
  });

  it("evaluates an agent only as itself: grants held by a workflow do not apply", async () => {
    const w = await world();
    const receipt = await resolveCapability(
      { kind: "agent", agentId: "agent-ops-1", tenantId: "t1" },
      request(w.caps.remind),
      w.deps,
    );
    assert.equal(receipt.decision, "DENY");
    assert.deepEqual(receipt.reasons, ["CAPABILITY_NOT_AGENT_CAPABILITY"]);
  });

  it("refuses a malformed principal", async () => {
    const w = await world();
    const receipt = await resolveCapability({ kind: "workflow", workflowId: "wf-recall", tenantId: "" }, request(w.caps.remind), w.deps);
    assert.deepEqual([receipt.decision, receipt.reasons], ["DENY", ["PRINCIPAL_INVALID"]]);
  });
});

describe("AIF-01B agent lifecycle (N5/C1)", () => {
  it("denies a revoked agent", async () => {
    const w = await world();
    w.agents.revoke("agent-ops-1", { kind: "human", accountId: "account-sponsor" }, "t1", { at: "2026-10-05T00:00:00Z", reason: "offboarded" });
    const receipt = await resolveCapability(AGENT, request(w.caps.report, { branchId: null }), w.deps);
    assert.deepEqual([receipt.decision, receipt.reasons], ["DENY", ["AGENT_REVOKED"]]);
  });

  it("denies an expired agent at server time", async () => {
    const w = await world();
    w.now.value = "2026-12-02T00:00:00.000Z";
    const receipt = await resolveCapability(AGENT, request(w.caps.report, { branchId: null }), w.deps);
    assert.deepEqual([receipt.decision, receipt.reasons], ["DENY", ["AGENT_EXPIRED"]]);
  });

  it("denies an agent whose sponsor left the tenant", async () => {
    const w = await world();
    w.sponsors.eligible.clear();
    const receipt = await resolveCapability(AGENT, request(w.caps.report, { branchId: null }), w.deps);
    assert.deepEqual([receipt.decision, receipt.reasons], ["DENY", ["AGENT_SPONSOR_INELIGIBLE"]]);
  });

  it("denies human-only capabilities to agents and workflows", async () => {
    const w = await world();
    w.state.grant(grant({ grantId: "g-x", grantee: { kind: "human_role", id: "receptionist" }, capabilityId: "documentation.note.sign", expiresAt: null }));
    const agent = await resolveCapability(AGENT, request(w.caps.sign), w.deps);
    assert.deepEqual([agent.decision, agent.reasons], ["DENY", ["CAPABILITY_HUMAN_ONLY"]]);
    const workflow = await resolveCapability(WORKFLOW, request(w.caps.sign), w.deps);
    assert.deepEqual([workflow.decision, workflow.reasons], ["DENY", ["CAPABILITY_HUMAN_ONLY"]]);
    assert.throws(
      () => w.state.grant(grant({ grantId: "g-y", grantee: { kind: "agent", id: "agent-ops-1" }, capabilityId: "documentation.note.sign" })),
      (error: unknown) => error instanceof CapabilityContractError && error.code === "CAPABILITY_HUMAN_ONLY",
    );
  });
});

describe("AIF-01B grants and scope", () => {
  it("denies cross-branch invocation under a branch grant", async () => {
    const w = await world();
    const receipt = await resolveCapability(WORKFLOW, request(w.caps.remind, { branchId: "b2" }), w.deps);
    assert.deepEqual([receipt.decision, receipt.reasons], ["DENY", ["INVOCATION_CAPABILITY_SCOPE_WIDENING"]]);
  });

  it("denies a human acting on a branch outside their membership", async () => {
    const w = await world();
    w.state.grant(grant({ grantId: "g-sign-wide", grantee: { kind: "human_role", id: "clinician" }, capabilityId: "documentation.note.sign", branchId: "b2", expiresAt: null }));
    const receipt = await resolveCapability(human(), request(w.caps.sign, { branchId: "b2" }), w.deps);
    assert.deepEqual([receipt.decision, receipt.reasons], ["DENY", ["AUTHZ_CROSS_BRANCH"]]);
  });

  it("requires aal2 for human-only capabilities", async () => {
    const w = await world();
    const receipt = await resolveCapability(human([{}], "aal1"), request(w.caps.sign), w.deps);
    assert.deepEqual([receipt.decision, receipt.reasons], ["DENY", ["AUTHZ_ASSURANCE_REQUIRED"]]);
  });

  it("ignores revoked and expired grants, and picks the narrowest active grant", async () => {
    const w = await world();
    w.state.revokeGrant("g-wf-remind", "t1", "2026-10-05T00:00:00.000Z");
    const revoked = await resolveCapability(WORKFLOW, request(w.caps.remind), w.deps);
    assert.deepEqual([revoked.decision, revoked.reasons], ["DENY", ["CAPABILITY_GRANT_MISSING"]]);

    // A branch-scoped capability refuses a tenant-wide grant outright.
    assert.throws(() =>
      w.state.grant(grant({ grantId: "g-wf-remind-wide", grantee: { kind: "workflow", id: "wf-recall" }, capabilityId: "communications.reminder.send", branchId: null })),
    );
    // On a tenant-wide capability the branch grant wins over the tenant-wide one, and a
    // revoked branch grant does not hide the active tenant-wide grant.
    w.state.grant(grant({ grantId: "g-wf-report-wide", grantee: { kind: "workflow", id: "wf-recall" }, capabilityId: "reporting.read", branchId: null }));
    w.state.grant(grant({ grantId: "g-wf-report-b1", grantee: { kind: "workflow", id: "wf-recall" }, capabilityId: "reporting.read" }));
    const narrow = await resolveCapability(WORKFLOW, request(w.caps.report), w.deps);
    assert.deepEqual([narrow.decision, narrow.grantId], ["ALLOW", "g-wf-report-b1"]);
    w.state.revokeGrant("g-wf-report-b1", "t1", "2026-10-06T00:00:00.000Z");
    const wide = await resolveCapability(WORKFLOW, request(w.caps.report), w.deps);
    assert.deepEqual([wide.decision, wide.grantId], ["ALLOW", "g-wf-report-wide"]);
    w.state.grant(grant({ grantId: "g-wf-remind-b1", grantee: { kind: "workflow", id: "wf-recall" }, capabilityId: "communications.reminder.send" }));

    w.now.value = "2026-11-02T00:00:00.000Z";
    const expired = await resolveCapability(WORKFLOW, request(w.caps.remind), w.deps);
    assert.deepEqual([expired.decision, expired.reasons], ["DENY", ["CAPABILITY_GRANT_MISSING"]]);
  });

  it("refuses non-human grants that never expire or live beyond 90 days", async () => {
    const w = await world();
    assert.throws(() => w.state.grant(grant({ grantId: "g-forever", grantee: { kind: "workflow", id: "wf-x" }, capabilityId: "communications.reminder.send", expiresAt: null })));
    assert.throws(() => w.state.grant(grant({ grantId: "g-long", grantee: { kind: "workflow", id: "wf-x" }, capabilityId: "communications.reminder.send", expiresAt: "2027-06-01T00:00:00.000Z" })));
  });
});

describe("AIF-01B registry", () => {
  it("denies unknown, wrong-version, wrong-digest and revoked definitions", async () => {
    const w = await world();
    const ref = request(w.caps.remind).capability;
    const unknown = await resolveCapability(WORKFLOW, request(w.caps.remind, { capability: { ...ref, capabilityId: "communications.unknown.send" } }), w.deps);
    const version = await resolveCapability(WORKFLOW, request(w.caps.remind, { capability: { ...ref, version: "2.0.0" } }), w.deps);
    const digest = await resolveCapability(WORKFLOW, request(w.caps.remind, { capability: { ...ref, definitionDigest: `cap_${"f".repeat(64)}` } }), w.deps);
    assert.deepEqual(
      [unknown.reasons, version.reasons, digest.reasons],
      [["CAPABILITY_UNKNOWN"], ["CAPABILITY_VERSION_MISMATCH"], ["CAPABILITY_DIGEST_MISMATCH"]],
    );
    w.state.setStatus("communications.reminder.send", "1.0.0", "quarantined", NOW);
    const quarantined = await resolveCapability(WORKFLOW, request(w.caps.remind), w.deps);
    assert.deepEqual([quarantined.decision, quarantined.reasons], ["DENY", ["CAPABILITY_REVOKED"]]);
    w.state.setStatus("communications.reminder.send", "1.0.0", "active", NOW);
    assert.equal((await resolveCapability(WORKFLOW, request(w.caps.remind), w.deps)).decision, "ALLOW");
  });

  it("denies an uncertified provider adapter and is undecidable for an unknown one", async () => {
    const w = await world();
    assert.equal((await resolveCapability(BOOKING, request(w.caps.book), w.deps)).decision, "ALLOW");
    w.adapters.set("pms-1", { adapterId: "pms-1", certified: new Set(["read"]) });
    const uncertified = await resolveCapability(BOOKING, request(w.caps.book), w.deps);
    assert.deepEqual([uncertified.decision, uncertified.reasons], ["DENY", ["CAPABILITY_ADAPTER_UNCERTIFIED"]]);
    w.adapters.clear();
    assert.equal((await resolveCapability(BOOKING, request(w.caps.book), w.deps)).decision, "UNDECIDABLE");
  });

  it("denies a malformed parameters digest and a write without an idempotency key", async () => {
    const w = await world();
    const malformed = await resolveCapability(WORKFLOW, request(w.caps.remind, { parametersDigest: "send to +966500000000" }), w.deps);
    assert.deepEqual(malformed.reasons, ["INVOCATION_CAPABILITY_PARAMETERS_DIGEST_INVALID"]);
    assert.equal(malformed.parametersDigest, null);
    const keyless = await resolveCapability(WORKFLOW, request(w.caps.remind, { idempotencyKey: null }), w.deps);
    assert.deepEqual(keyless.reasons, ["INVOCATION_CAPABILITY_IDEMPOTENCY_KEY_REQUIRED"]);
  });
});

describe("AIF-01B approvals (N5/C3)", () => {
  it("asks for an approval, then allows exactly the approved invocation", async () => {
    const w = await world();
    const ask = await resolveCapability(WORKFLOW, request(w.caps.broadcast), w.deps);
    assert.deepEqual([ask.decision, ask.reasons], ["ASK", ["APPROVAL_REQUIRED"]]);
    w.approvals.set("appr-1", approval());
    const allow = await resolveCapability(WORKFLOW, request(w.caps.broadcast, { approvalRequestId: "appr-1" }), w.deps);
    assert.deepEqual([allow.decision, allow.approvalRequestId], ["ALLOW", "appr-1"]);
  });

  it("denies stale, mismatched and parameter-changed approvals", async () => {
    const w = await world();
    const cases: [Partial<ApprovalRequest>, string][] = [
      [{ status: "awaiting_approval" }, "CAPABILITY_APPROVAL_STALE"],
      [{ status: "rejected" }, "CAPABILITY_APPROVAL_STALE"],
      [{ status: "superseded" }, "CAPABILITY_APPROVAL_STALE"],
      [{ status: "executing" }, "CAPABILITY_APPROVAL_STALE"],
      [{ expiresAt: "2026-10-06T11:59:59.000Z" }, "CAPABILITY_APPROVAL_STALE"],
      [{ branchId: "b2" }, "CAPABILITY_APPROVAL_MISMATCH"],
      [{ actionType: "workforce.coverage_override" }, "CAPABILITY_APPROVAL_MISMATCH"],
      [{ parametersDigest: OTHER_PARAMS }, "CAPABILITY_APPROVAL_PARAMETERS_CHANGED"],
    ];
    for (const [overrides, reason] of cases) {
      w.approvals.set("appr-1", approval(overrides));
      const receipt = await resolveCapability(WORKFLOW, request(w.caps.broadcast, { approvalRequestId: "appr-1" }), w.deps);
      assert.deepEqual([receipt.decision, receipt.reasons], ["DENY", [reason]], JSON.stringify(overrides));
    }
    w.approvals.clear();
    const unknown = await resolveCapability(WORKFLOW, request(w.caps.broadcast, { approvalRequestId: "appr-1" }), w.deps);
    assert.deepEqual(unknown.reasons, ["CAPABILITY_APPROVAL_UNKNOWN"]);
    w.approvals.set("appr-t2", approval({ id: "appr-t2", tenantId: "t2" }));
    const foreign = await resolveCapability(WORKFLOW, request(w.caps.broadcast, { approvalRequestId: "appr-t2" }), w.deps);
    assert.deepEqual(foreign.reasons, ["CAPABILITY_APPROVAL_UNKNOWN"]);
  });

  it("lets one approval allow one invocation only", async () => {
    const w = await world();
    w.approvals.set("appr-1", approval());
    const first = await resolveCapability(WORKFLOW, request(w.caps.broadcast, { approvalRequestId: "appr-1" }), w.deps);
    assert.equal(w.state.record(first), "CLAIMED");
    const again = await resolveCapability(WORKFLOW, request(w.caps.broadcast, { approvalRequestId: "appr-1" }), w.deps);
    assert.equal(again.decision, "ALLOW");
    assert.equal(w.state.record(again), "SAME_INVOCATION");
    const other = await resolveCapability(WORKFLOW, request(w.caps.broadcast, { approvalRequestId: "appr-1", idempotencyKey: "idem-0002" }), w.deps);
    assert.deepEqual([other.decision, other.reasons], ["DENY", ["CAPABILITY_APPROVAL_CONSUMED"]]);
  });

  it("detects a lost claim race: two ALLOWs computed before either was recorded", async () => {
    const w = await world();
    w.approvals.set("appr-1", approval());
    const a = await resolveCapability(WORKFLOW, request(w.caps.broadcast, { approvalRequestId: "appr-1" }), w.deps);
    const b = await resolveCapability(WORKFLOW, request(w.caps.broadcast, { approvalRequestId: "appr-1", idempotencyKey: "idem-0002" }), w.deps);
    assert.deepEqual([a.decision, b.decision], ["ALLOW", "ALLOW"]);
    assert.equal(w.state.record(a), "CLAIMED");
    assert.equal(w.state.record(b), "CLAIMED_BY_OTHER");
  });

  it("denies an approval-gated capability that has no N5/C3 protected-action rule", async () => {
    const w = await world();
    const registry = new CapabilityContractRegistry();
    const unruled = await registry.register(definition({ id: "communications.campaign.launch", ...WRITE, riskClass: "critical" }), RELEASE);
    w.state.admit(unruled);
    w.state.grant(grant({ grantId: "g-campaign", grantee: { kind: "workflow", id: "wf-recall" }, capabilityId: "communications.campaign.launch" }));
    const receipt = await resolveCapability(WORKFLOW, request(unruled), w.deps);
    assert.deepEqual([receipt.decision, receipt.reasons], ["DENY", ["CAPABILITY_APPROVAL_RULE_MISSING"]]);
  });
});

describe("AIF-01B exact confirmation", () => {
  it("asks for confirmation and refuses one bound to other parameters", async () => {
    const w = await world();
    const ask = await resolveCapability(human(), request(w.caps.sign), w.deps);
    assert.deepEqual([ask.decision, ask.reasons], ["ASK", ["CONFIRMATION_REQUIRED"]]);
    w.confirmations.push({
      confirmationReceiptId: "conf-1",
      tenantId: "t1",
      accountId: "acct-doc-1",
      capabilityId: "documentation.note.sign",
      version: "1.0.0",
      parametersDigest: OTHER_PARAMS,
      idempotencyKey: "idem-0001",
    });
    const wrong = await resolveCapability(human(), request(w.caps.sign, { confirmationReceiptId: "conf-1" }), w.deps);
    assert.deepEqual([wrong.decision, wrong.reasons], ["DENY", ["CAPABILITY_CONFIRMATION_INVALID"]]);
  });
});

describe("AIF-01B unknown state is UNDECIDABLE, never ALLOW", () => {
  const failures: [string, (deps: ResolverDependencies) => void][] = [
    ["registry unavailable", (deps) => (deps.registry.findCapability = () => "UNAVAILABLE")],
    ["registry throws", (deps) => (deps.registry.findCapability = () => { throw new Error("db down"); })],
    ["grants unavailable", (deps) => (deps.grants.grantsFor = () => "UNAVAILABLE")],
    ["approvals unavailable", (deps) => (deps.approvals.getRequest = () => "UNAVAILABLE")],
    ["claims unavailable", (deps) => (deps.approvals.claimant = () => "UNAVAILABLE")],
    ["clock unavailable", (deps) => (deps.clock.now = () => { throw new Error("no time"); })],
    ["clock malformed", (deps) => (deps.clock.now = () => "yesterday")],
  ];
  for (const [label, breakIt] of failures) {
    it(`${label}`, async () => {
      const w = await world();
      w.approvals.set("appr-1", approval());
      breakIt(w.deps);
      const receipt = await resolveCapability(WORKFLOW, request(w.caps.broadcast, { approvalRequestId: "appr-1" }), w.deps);
      assert.deepEqual([receipt.decision, receipt.reasons], ["UNDECIDABLE", ["DEPENDENCY_UNAVAILABLE"]]);
    });
  }

  it("agent authority, adapter and confirmation outages are undecidable", async () => {
    const w = await world();
    w.deps.agents.resolveAuthority = () => "UNAVAILABLE";
    assert.equal((await resolveCapability(AGENT, request(w.caps.report, { branchId: null }), w.deps)).decision, "UNDECIDABLE");
    w.deps.adapters.certified = () => "UNAVAILABLE";
    assert.equal((await resolveCapability(BOOKING, request(w.caps.book), w.deps)).decision, "UNDECIDABLE");
    w.deps.confirmations.isConfirmed = () => "UNAVAILABLE";
    const signed = await resolveCapability(human(), request(w.caps.sign, { confirmationReceiptId: "conf-1" }), w.deps);
    assert.equal(signed.decision, "UNDECIDABLE");
  });
});

describe("AIF-01B receipts", () => {
  it("receipts every decision with server time, validity and a deterministic digest", async () => {
    const w = await world();
    const allow = await resolveCapability(WORKFLOW, request(w.caps.remind), w.deps);
    assert.equal(allow.decidedAt, NOW);
    assert.equal(Date.parse(allow.validUntil ?? "") - Date.parse(NOW), RESOLUTION_VALIDITY_MS);
    assert.match(allow.receiptDigest, /^res_[0-9a-f]{64}$/);
    const again = await resolveCapability(WORKFLOW, request(w.caps.remind), w.deps);
    assert.equal(again.receiptDigest, allow.receiptDigest);
    const deny = await resolveCapability(WORKFLOW, request(w.caps.remind, { branchId: "b2" }), w.deps);
    assert.equal(deny.validUntil, deny.decidedAt);
    assert.notEqual(deny.receiptDigest, allow.receiptDigest);
    w.state.record(allow);
    w.state.record(deny);
    assert.equal(w.state.receipts("t1").length, 2);
    assert.ok(Object.isFrozen(allow));
  });

  it("never echoes unsafe request text into a receipt", async () => {
    const w = await world();
    const receipt = await resolveCapability(
      WORKFLOW,
      {
        capability: { capabilityId: "call 0501234567 now", version: "v1", definitionDigest: "Bearer abc.def" },
        requestedTenantId: null,
        branchId: "b1 drop table",
        parametersDigest: "patient=Ahmed",
        correlationId: "patient-1012345678",
        idempotencyKey: "sk_live_abcdefghijklmnop",
        approvalRequestId: "AKIAIOSFODNN7EXAMPLE",
        confirmationReceiptId: null,
      },
      w.deps,
    );
    assert.equal(receipt.decision, "DENY");
    const text = JSON.stringify(receipt);
    for (const leaked of ["0501234567", "Bearer", "Ahmed", "1012345678", "sk_live", "AKIA", "drop table"]) {
      assert.ok(!text.includes(leaked), `receipt leaked ${leaked}`);
    }
    const timeless = await resolveCapability(WORKFLOW, request(w.caps.remind), { ...w.deps, clock: { now: () => { throw new Error("x"); } } });
    assert.deepEqual([timeless.decidedAt, timeless.validUntil], [null, null]);
  });
});
