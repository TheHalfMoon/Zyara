// N5/C3 synthetic qualification: approvals + human exception queue.
//
// Proves, without any real clinic, provider, payer or patient data:
//   * an approval binds to one operation, one parameter set, one scope and one expiry;
//   * approving one operation cannot authorize another, and changing the protected
//     parameters after approval invalidates the approval;
//   * an expired approval cannot authorize execution;
//   * approver authority is resolved from the trusted directory at decision time and
//     re-resolved at execution time, so revoked authority invalidates an unused approval;
//   * self-approval is forbidden and an agent can never decide;
//   * an agent requester must resolve to a live bounded C1 identity;
//   * the state machine refuses illegal and terminal jumps, and retries reconcile;
//   * an unknown external outcome stays unknown and hands the request to a human;
//   * the exception queue is owned work: it links to a W3 work item, refuses closure
//     without required evidence, and refuses to close an unknown resolution;
//   * tenant and branch boundaries are enforced on approvals and on exceptions;
//   * no parameter values, prose or credential material are stored.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  APPROVAL_STATUSES,
  APPROVAL_TRANSITIONS,
  EXCEPTION_KINDS,
  EXCEPTION_STATUSES,
  PROTECTED_ACTIONS,
  ApprovalError,
  ApprovalStore,
  approvalParametersDigest,
  exceptionSlaState,
  type ApprovalActor,
  type ApprovalAgentDirectory,
  type ApprovalAgentState,
  type ApprovalAuthorityDirectory,
  type ApprovalAuthoritySnapshot,
  type ApprovalAuthorityLookup,
  type ApproverAuthority,
  type ExceptionKind,
} from "@zyara/collaboration";
import { OpsTaskStore } from "@zyara/enterprise-access";

const NOW = "2026-09-21T10:00:00Z";
const EARLY = "2026-09-21T10:10:00Z";
const LATER = "2026-09-21T10:30:00Z";
const SOON = "2026-09-21T11:00:00Z";
const MUCH_LATER = "2026-09-22T10:00:00Z";

const provenance = {
  source: "zyara-native" as const,
  sourceRef: "n5c3-test",
  sourceRevision: "n5c3-test",
  observedAt: NOW,
};

class FakeAuthorities implements ApprovalAuthorityDirectory {
  private readonly grants = new Map<string, ApprovalAuthoritySnapshot>();

  grant(
    tenantId: string,
    accountId: string,
    authority: ApproverAuthority,
    branchId: string | null,
  ): void {
    this.grants.set(`${tenantId}:${accountId}:${authority}`, {
      authority,
      branchId,
      sourceRef: "test-authority-directory",
      resolvedAt: NOW,
    });
  }

  revoke(tenantId: string, accountId: string, authority: ApproverAuthority): void {
    this.grants.delete(`${tenantId}:${accountId}:${authority}`);
  }

  resolveAuthority(lookup: ApprovalAuthorityLookup): ApprovalAuthoritySnapshot | null {
    const snapshot = this.grants.get(
      `${lookup.tenantId}:${lookup.accountId}:${lookup.authority}`,
    );
    if (!snapshot) return null;
    if (lookup.branchId === null && snapshot.branchId !== null) return null;
    if (
      lookup.branchId !== null &&
      snapshot.branchId !== null &&
      snapshot.branchId !== lookup.branchId
    ) {
      return null;
    }
    return { ...snapshot };
  }
}

class FakeAgents implements ApprovalAgentDirectory {
  private readonly states = new Map<string, ApprovalAgentState>();

  set(tenantId: string, agentIdentityId: string, state: ApprovalAgentState): void {
    this.states.set(`${tenantId}:${agentIdentityId}`, state);
  }

  resolveRequesterState(lookup: {
    tenantId: string;
    agentIdentityId: string;
  }): ApprovalAgentState {
    return this.states.get(`${lookup.tenantId}:${lookup.agentIdentityId}`) ?? "unknown";
  }
}

const authorities = new FakeAuthorities();
authorities.grant("t1", "account-branch-admin", "branch_admin", "b1");
authorities.grant("t1", "account-org-admin", "org_admin", null);
authorities.grant("t1", "account-compliance", "compliance_officer", null);
authorities.grant("t1", "account-requester", "branch_admin", "b1");

const agents = new FakeAgents();
agents.set("t1", "agent-live", "active");
agents.set("t1", "agent-revoked", "revoked");

function deps() {
  return { authorities, agents };
}

async function expectApprovalError(
  run: () => unknown | Promise<unknown>,
  code: string,
  label: string,
): Promise<void> {
  try {
    await run();
  } catch (error) {
    assert.ok(error instanceof ApprovalError, `${label}: expected an ApprovalError`);
    assert.equal((error as ApprovalError).code, code, label);
    return;
  }
  assert.fail(`${label}: expected ${code}, but the call succeeded`);
}

const BROADCAST_PARAMETERS = {
  channel: "whatsapp",
  audienceType: "waiting_list",
  scheduledHour: 9,
};

const COVERAGE_PARAMETERS = {
  staffAssignmentRef: "staff-assignment-1",
  shiftRef: "shift-1",
  reasonCode: "roster_error",
};

function human(accountId: string): ApprovalActor {
  return { kind: "human", accountId };
}

async function broadcastProposal(
  store: ApprovalStore,
  overrides: Record<string, unknown> = {},
) {
  return store.propose(
    {
      id: "approval-1",
      tenantId: "t1",
      branchId: "b1",
      actionType: "communications.outbound.broadcast",
      parameters: BROADCAST_PARAMETERS,
      requester: human("account-requester"),
      proposedAt: NOW,
      provenance,
      ...overrides,
    },
    "t1",
    deps(),
  );
}

async function coverageProposal(store: ApprovalStore, id = "approval-coverage") {
  return store.propose(
    {
      id,
      tenantId: "t1",
      branchId: "b1",
      actionType: "workforce.coverage_override",
      parameters: COVERAGE_PARAMETERS,
      requester: human("account-requester"),
      proposedAt: NOW,
      provenance,
    },
    "t1",
    deps(),
  );
}

function approve(store: ApprovalStore, id: string, at = LATER) {
  return store.decide(
    id,
    { outcome: "approved", reasonCode: "authorized", evidenceRef: "evidence-1", decidedAt: at },
    human("account-branch-admin"),
    "t1",
    deps(),
  );
}

describe("N5/C3 approvals + human exception queue", () => {
  it("binds a proposal to tenant, branch, action, parameters, authority, risk and expiry", async () => {
    const store = new ApprovalStore();
    const request = await broadcastProposal(store, { correlationId: "corr-1" });
    assert.equal(request.tenantId, "t1");
    assert.equal(request.branchId, "b1");
    assert.equal(request.actionType, "communications.outbound.broadcast");
    assert.equal(request.riskClass, "high");
    assert.equal(request.requiredAuthority, "branch_admin");
    assert.equal(request.selfApprovalForbidden, true);
    assert.equal(request.evidenceRequired, true);
    assert.match(request.parametersDigest, /^params_[0-9a-f]{64}$/);
    assert.deepEqual([...request.parameterKeys].sort(), [
      "audienceType",
      "channel",
      "scheduledHour",
    ]);
    assert.equal(request.requesterAccountId, "account-requester");
    assert.equal(request.requesterAgentId, null);
    assert.equal(request.correlationId, "corr-1");
    // proposed -> awaiting_approval is walked explicitly, so the trail shows both steps.
    assert.equal(request.status, "awaiting_approval");
    const trail = store.eventsFor(request.id, "t1");
    assert.equal(trail.length, 2);
    assert.equal(trail[0].toStatus, "proposed");
    assert.equal(trail[0].fromStatus, null);
    assert.equal(trail[1].fromStatus, "proposed");
    assert.equal(trail[1].toStatus, "awaiting_approval");
    const ttl = PROTECTED_ACTIONS["communications.outbound.broadcast"].maxTtlMinutes;
    assert.equal(request.expiresAt, new Date(Date.parse(NOW) + ttl * 60_000).toISOString());
  });

  it("refuses an unsupported protected action, a mismatched parameter set and a bad TTL", async () => {
    const store = new ApprovalStore();
    await expectApprovalError(
      () => broadcastProposal(store, { actionType: "clinical.prescribe" }),
      "APPROVAL_UNKNOWN_ACTION_TYPE",
      "an action outside the closed protected registry must be refused",
    );
    await expectApprovalError(
      () =>
        broadcastProposal(store, {
          parameters: { ...BROADCAST_PARAMETERS, extraKey: "x" },
        }),
      "APPROVAL_PARAMETER_SET_MISMATCH",
      "a parameter key outside the action's declared set must be refused",
    );
    await expectApprovalError(
      () =>
        broadcastProposal(store, {
          parameters: { ...BROADCAST_PARAMETERS, channel: "carrier_pigeon" },
        }),
      "APPROVAL_PARAMETER_INVALID",
      "a protected parameter value outside its closed vocabulary must be refused",
    );
    await expectApprovalError(
      () =>
        broadcastProposal(store, {
          parameters: { ...BROADCAST_PARAMETERS, channel: "app_secret_value" },
        }),
      "APPROVAL_SECRET_REFUSED",
      "credential-shaped parameter content must be refused",
    );
    await expectApprovalError(
      () => broadcastProposal(store, { ttlMinutes: 600 }),
      "APPROVAL_INVALID_TTL",
      "a TTL beyond the action's bound must be refused",
    );
  });

  it("requires a live human approver authority and records the resolved snapshot", async () => {
    const store = new ApprovalStore();
    const request = await broadcastProposal(store);
    const decided = approve(store, request.id);
    assert.equal(decided.request.status, "approved");
    assert.equal(decided.decision.approverKind, "human");
    assert.equal(decided.decision.approverAccountId, "account-branch-admin");
    assert.equal(decided.decision.authority.authority, "branch_admin");
    assert.equal(decided.decision.authority.branchId, "b1");
    assert.equal(decided.decision.authority.sourceRef, "test-authority-directory");
    assert.equal(decided.decision.evidenceRef, "evidence-1");
    assert.equal(store.decisionsFor(request.id, "t1").length, 1);
  });

  it("refuses an approver without the required live authority, including a body-supplied one", async () => {
    const store = new ApprovalStore();
    const request = await broadcastProposal(store);
    // An account holding no approval authority at all cannot decide.
    await expectApprovalError(
      () =>
        store.decide(
          request.id,
          {
            outcome: "approved",
            reasonCode: "authorized",
            evidenceRef: "evidence-1",
            decidedAt: LATER,
            authority: "org_admin",
          } as never,
          human("account-clinician"),
          "t1",
          deps(),
        ),
      "APPROVAL_APPROVER_AUTHORITY_MISSING",
      "a caller without the required authority must not decide",
    );
    assert.equal(store.getRequest(request.id, "t1").status, "awaiting_approval");
    assert.equal(store.decisions.size, 0);
  });

  it("forbids self-approval and forbids any agent from deciding", async () => {
    const store = new ApprovalStore();
    const request = await broadcastProposal(store);
    await expectApprovalError(
      () =>
        store.decide(
          request.id,
          { outcome: "approved", reasonCode: "authorized", evidenceRef: "evidence-1", decidedAt: LATER },
          { kind: "agent", agentIdentityId: "agent-live" },
          "t1",
          deps(),
        ),
      "APPROVAL_AGENT_APPROVER_FORBIDDEN",
      "an agent must never decide, even for another agent's proposal",
    );
    // account-requester also holds branch_admin authority, and is still refused.
    await expectApprovalError(
      () =>
        store.decide(
          request.id,
          { outcome: "approved", reasonCode: "authorized", evidenceRef: "evidence-1", decidedAt: LATER },
          human("account-requester"),
          "t1",
          deps(),
        ),
      "APPROVAL_SELF_APPROVAL_FORBIDDEN",
      "a requester that also holds the authority must still not approve its own proposal",
    );
    assert.equal(store.getRequest(request.id, "t1").status, "awaiting_approval");
    assert.equal(store.decisions.size, 0);
  });

  it("accepts an agent requester only when the bounded C1 identity is live", async () => {
    const store = new ApprovalStore();
    const proposed = await store.propose(
      {
        id: "approval-agent",
        tenantId: "t1",
        branchId: "b1",
        actionType: "workforce.coverage_override",
        parameters: COVERAGE_PARAMETERS,
        requester: { kind: "agent", agentIdentityId: "agent-live" },
        proposedAt: NOW,
        provenance,
      },
      "t1",
      deps(),
    );
    assert.equal(proposed.requesterKind, "agent");
    assert.equal(proposed.requesterAgentId, "agent-live");
    assert.equal(proposed.requesterAccountId, null);
    for (const agentIdentityId of ["agent-revoked", "agent-not-registered"]) {
      await expectApprovalError(
        () =>
          store.propose(
            {
              id: `approval-${agentIdentityId}`,
              tenantId: "t1",
              branchId: "b1",
              actionType: "workforce.coverage_override",
              parameters: COVERAGE_PARAMETERS,
              requester: { kind: "agent", agentIdentityId },
              proposedAt: NOW,
              provenance,
            },
            "t1",
            deps(),
          ),
        "APPROVAL_REQUESTER_AGENT_INELIGIBLE",
        `agent requester ${agentIdentityId} must not propose`,
      );
    }
    // A free-text requester name can never satisfy the actor model.
    await expectApprovalError(
      () =>
        store.propose(
          {
            id: "approval-free-text",
            tenantId: "t1",
            branchId: "b1",
            actionType: "workforce.coverage_override",
            parameters: COVERAGE_PARAMETERS,
            requester: { kind: "human" },
            proposedAt: NOW,
            provenance,
          },
          "t1",
          deps(),
        ),
      "APPROVAL_REQUESTER_REQUIRED",
      "an untyped requester must be refused",
    );
  });

  it("refuses a cross-tenant write and a cross-branch or scope-widening approval", async () => {
    const store = new ApprovalStore();
    const request = await broadcastProposal(store);
    await expectApprovalError(
      () => store.getRequest(request.id, "t2"),
      "APPROVAL_UNKNOWN_REFERENCE",
      "another tenant must not read this approval",
    );
    await expectApprovalError(
      () =>
        store.propose(
          {
            id: "approval-cross-tenant",
            tenantId: "t2",
            branchId: "b1",
            actionType: "workforce.coverage_override",
            parameters: COVERAGE_PARAMETERS,
            requester: human("account-t2-admin"),
            proposedAt: NOW,
            provenance,
          },
          "t1",
          deps(),
        ),
      "APPROVAL_CROSS_TENANT",
      "a proposal cannot be written into another tenant",
    );
    authorities.grant("t1", "account-other-branch", "branch_admin", "b2");
    await expectApprovalError(
      () =>
        store.decide(
          request.id,
          { outcome: "approved", reasonCode: "authorized", evidenceRef: "evidence-1", decidedAt: LATER },
          human("account-other-branch"),
          "t1",
          deps(),
        ),
      "APPROVAL_APPROVER_AUTHORITY_MISSING",
      "a cross-branch authority must not decide this branch's action",
    );
    const tenantWide = await store.propose(
      {
        id: "approval-tenant-wide",
        tenantId: "t1",
        actionType: "data.export.patient_records",
        parameters: { exportFormat: "csv", purposeCode: "audit", recordCount: 3 },
        requester: human("account-org-admin"),
        proposedAt: NOW,
        provenance,
      },
      "t1",
      deps(),
    );
    assert.equal(tenantWide.branchId, null);
    await expectApprovalError(
      () =>
        store.decide(
          tenantWide.id,
          { outcome: "approved", reasonCode: "authorized", evidenceRef: "evidence-1", decidedAt: EARLY },
          human("account-branch-admin"),
          "t1",
          deps(),
        ),
      "APPROVAL_APPROVER_AUTHORITY_MISSING",
      "a branch authority must not decide a tenant-wide action",
    );
    const compliance = store.decide(
      tenantWide.id,
      { outcome: "approved", reasonCode: "authorized", evidenceRef: "evidence-1", decidedAt: EARLY },
      human("account-compliance"),
      "t1",
      deps(),
    );
    assert.equal(compliance.request.status, "approved");
    assert.equal(compliance.decision.authority.branchId, null);
  });

  it("cannot reuse an approval for different parameters and invalidates it when they change", async () => {
    const store = new ApprovalStore();
    const request = await broadcastProposal(store);
    approve(store, request.id);
    const otherDigest = await approvalParametersDigest("t1", "communications.outbound.broadcast", {
      channel: "sms",
      audienceType: "care_gap_list",
      scheduledHour: 9,
    });
    assert.notEqual(otherDigest.digest, request.parametersDigest);
    await expectApprovalError(
      () =>
        store.execute(
          request.id,
          { outcome: "attempted", parametersDigest: otherDigest.digest, occurredAt: SOON },
          human("account-branch-admin"),
          "t1",
          deps(),
        ),
      "APPROVAL_PARAMETERS_CHANGED",
      "an approval must not authorize a different parameter set",
    );
    assert.equal(store.getRequest(request.id, "t1").status, "superseded");
    await expectApprovalError(
      () =>
        store.execute(
          request.id,
          { outcome: "attempted", parametersDigest: request.parametersDigest, occurredAt: SOON },
          human("account-branch-admin"),
          "t1",
          deps(),
        ),
      "APPROVAL_TERMINAL_IMMUTABLE",
      "a superseded approval must never execute",
    );
    await expectApprovalError(
      () => store.getRequest("approval-does-not-exist", "t1"),
      "APPROVAL_UNKNOWN_REFERENCE",
      "an unknown request cannot be executed",
    );
  });

  it("refuses an expired approval, before and after a decision", async () => {
    const store = new ApprovalStore();
    const request = await broadcastProposal(store, { ttlMinutes: 10 });
    approve(store, request.id, "2026-09-21T10:05:00Z");
    assert.equal(store.getRequest(request.id, "t1").status, "approved");
    await expectApprovalError(
      () =>
        store.execute(
          request.id,
          { outcome: "attempted", parametersDigest: request.parametersDigest, occurredAt: MUCH_LATER },
          human("account-branch-admin"),
          "t1",
          deps(),
        ),
      "APPROVAL_EXPIRED",
      "an expired approval must not authorize execution",
    );
    assert.equal(store.getRequest(request.id, "t1").status, "expired");
    const store2 = new ApprovalStore();
    const other = await broadcastProposal(store2, { id: "approval-late", ttlMinutes: 10 });
    await expectApprovalError(() => approve(store2, other.id, MUCH_LATER), "APPROVAL_EXPIRED", "a decision after expiry must be refused");
    assert.equal(store2.getRequest(other.id, "t1").status, "expired");
  });

  it("expires unused approvals on the explicit sweep and keeps every expired one terminal", async () => {
    const store = new ApprovalStore();
    const request = await coverageProposal(store, "approval-sweep");
    approve(store, request.id);
    assert.deepEqual(store.expireDue("t1", LATER), []);
    const expired = store.expireDue("t1", MUCH_LATER);
    assert.deepEqual(expired.map((row) => row.id), ["approval-sweep"]);
    assert.equal(store.getRequest(request.id, "t1").status, "expired");
    assert.deepEqual(store.expireDue("t2", MUCH_LATER), []);
  });

  it("invalidates an unused approval when the approver's authority is revoked", async () => {
    const store = new ApprovalStore();
    const request = await coverageProposal(store);
    approve(store, request.id);
    authorities.revoke("t1", "account-branch-admin", "branch_admin");
    await expectApprovalError(
      () =>
        store.execute(
          request.id,
          { outcome: "attempted", parametersDigest: request.parametersDigest, occurredAt: SOON },
          human("account-branch-admin"),
          "t1",
          deps(),
        ),
      "APPROVAL_APPROVER_AUTHORITY_REVOKED",
      "revoked approver authority must invalidate the unused approval",
    );
    assert.equal(store.getRequest(request.id, "t1").status, "superseded");
    authorities.grant("t1", "account-branch-admin", "branch_admin", "b1");
  });

  it("walks the state machine through execution and keeps terminal states frozen", async () => {
    const store = new ApprovalStore();
    const request = await coverageProposal(store, "approval-exec");
    approve(store, request.id);
    // A definitive outcome cannot be recorded before the attempt itself.
    await expectApprovalError(
      () =>
        store.execute(
          request.id,
          {
            outcome: "succeeded",
            parametersDigest: request.parametersDigest,
            receiptRef: "receipt-1",
            occurredAt: SOON,
          },
          human("account-branch-admin"),
          "t1",
          deps(),
        ),
      "APPROVAL_INVALID_TRANSITION",
      "a definitive outcome requires an attempt first",
    );
    store.execute(
      request.id,
      { outcome: "attempted", parametersDigest: request.parametersDigest, occurredAt: SOON },
      human("account-branch-admin"),
      "t1",
      deps(),
    );
    assert.equal(store.getRequest(request.id, "t1").status, "executing");
    // An evidenced definitive outcome is required: an external result is never assumed.
    await expectApprovalError(
      () =>
        store.execute(
          request.id,
          { outcome: "succeeded", parametersDigest: request.parametersDigest, occurredAt: SOON },
          human("account-branch-admin"),
          "t1",
          deps(),
        ),
      "APPROVAL_EVIDENCE_REQUIRED",
      "a definitive outcome must be evidenced",
    );
    const finished = store.execute(
      request.id,
      {
        outcome: "succeeded",
        parametersDigest: request.parametersDigest,
        receiptRef: "receipt-1",
        occurredAt: SOON,
      },
      human("account-branch-admin"),
      "t1",
      deps(),
    );
    assert.equal(finished.request.status, "succeeded");
    assert.equal(finished.execution.attempt, 1);
    assert.equal(finished.execution.executorKind, "human");
    assert.equal(finished.execution.executorAccountId, "account-branch-admin");
    await expectApprovalError(
      () =>
        store.execute(
          request.id,
          { outcome: "attempted", parametersDigest: request.parametersDigest, occurredAt: SOON },
          human("account-branch-admin"),
          "t1",
          deps(),
        ),
      "APPROVAL_TERMINAL_IMMUTABLE",
      "a succeeded approval must never execute again",
    );
    await expectApprovalError(
      () =>
        store.decide(
          request.id,
          { outcome: "rejected", reasonCode: "out_of_policy", decidedAt: SOON },
          human("account-branch-admin"),
          "t1",
          deps(),
        ),
      "APPROVAL_ALREADY_DECIDED",
      "a decided request must not be decided twice",
    );
    // The declared transition table is closed: no status may be missing from it.
    assert.deepEqual(Object.keys(APPROVAL_TRANSITIONS).sort(), [...APPROVAL_STATUSES].sort());
  });

  it("keeps an unknown external outcome unknown and hands it to a human", async () => {
    const store = new ApprovalStore();
    const request = await coverageProposal(store, "approval-unknown");
    approve(store, request.id);
    const unknown = store.recordUnknownOutcome(
      request.id,
      { parametersDigest: request.parametersDigest, occurredAt: SOON },
      human("account-branch-admin"),
      "t1",
      deps(),
    );
    assert.equal(unknown.execution.outcome, "unknown");
    assert.equal(unknown.request.status, "needs_human");
    assert.equal(store.executionsFor(request.id, "t1")[0].attempt, 1);
    // A definitive outcome for the unresolved attempt is refused, with or without framing.
    await expectApprovalError(
      () =>
        store.execute(
          request.id,
          { outcome: "succeeded", parametersDigest: request.parametersDigest, occurredAt: SOON },
          human("account-branch-admin"),
          "t1",
          deps(),
        ),
      "APPROVAL_EVIDENCE_REQUIRED",
      "an unevidenced definitive result must be refused",
    );
    await expectApprovalError(
      () =>
        store.execute(
          request.id,
          {
            outcome: "failed",
            parametersDigest: request.parametersDigest,
            receiptRef: "receipt-late",
            occurredAt: SOON,
          },
          human("account-branch-admin"),
          "t1",
          deps(),
        ),
      "APPROVAL_UNKNOWN_REQUIRES_EVIDENCE",
      "an unsettled attempt must be resolved through a fresh attempt, not relabelled",
    );
    assert.equal(store.getRequest(request.id, "t1").status, "needs_human");
    // A human resolution may start a fresh attempt with its own ordinal.
    const retry = store.execute(
      request.id,
      { outcome: "attempted", parametersDigest: request.parametersDigest, occurredAt: SOON },
      human("account-branch-admin"),
      "t1",
      deps(),
    );
    assert.equal(retry.execution.attempt, 2);
    const resolved = store.execute(
      request.id,
      {
        outcome: "succeeded",
        parametersDigest: request.parametersDigest,
        receiptRef: "receipt-2",
        occurredAt: SOON,
      },
      human("account-branch-admin"),
      "t1",
      deps(),
    );
    assert.equal(resolved.request.status, "succeeded");
    assert.deepEqual(
      store.executionsFor(request.id, "t1").map((row) => row.outcome),
      ["unknown", "attempted", "succeeded"],
    );
    assert.deepEqual(
      store.executionsFor(request.id, "t1").map((row) => row.attempt),
      [1, 2, 2],
    );
  });

  it("reconciles duplicate idempotency keys and refuses a divergent reuse", async () => {
    const store = new ApprovalStore();
    const first = await broadcastProposal(store, { idempotencyKey: "idem-1" });
    const replay = await broadcastProposal(store, {
      id: "approval-replay",
      idempotencyKey: "idem-1",
    });
    assert.equal(replay.id, first.id, "a retry must reconcile the original request");
    assert.equal(store.requests.size, 1);
    await expectApprovalError(
      () =>
        broadcastProposal(store, {
          idempotencyKey: "idem-1",
          parameters: { ...BROADCAST_PARAMETERS, channel: "sms" },
        }),
      "APPROVAL_IDEMPOTENCY_CONFLICT",
      "a divergent retry under the same key must be refused",
    );
    const decisionInput = {
      outcome: "approved" as const,
      reasonCode: "authorized" as const,
      evidenceRef: "evidence-1",
      decidedAt: LATER,
      idempotencyKey: "idem-decision",
    };
    const decided = store.decide(first.id, decisionInput, human("account-branch-admin"), "t1", deps());
    const replayDecision = store.decide(
      first.id,
      decisionInput,
      human("account-branch-admin"),
      "t1",
      deps(),
    );
    assert.equal(replayDecision.decision.id, decided.decision.id);
    assert.equal(store.decisions.size, 1);
    await expectApprovalError(
      () =>
        store.decide(
          first.id,
          {
            outcome: "rejected",
            reasonCode: "out_of_policy",
            decidedAt: LATER,
            idempotencyKey: "idem-decision",
          },
          human("account-branch-admin"),
          "t1",
          deps(),
        ),
      "APPROVAL_IDEMPOTENCY_CONFLICT",
      "a divergent decision reuse must be refused",
    );
    const executionInput = {
      outcome: "attempted" as const,
      parametersDigest: first.parametersDigest,
      occurredAt: LATER,
      idempotencyKey: "idem-execution",
    };
    store.execute(first.id, executionInput, human("account-branch-admin"), "t1", deps());
    store.execute(first.id, executionInput, human("account-branch-admin"), "t1", deps());
    assert.equal(store.executions.size, 1);
  });

  it("keeps a concurrent duplicate submission and the expiry instant deterministic", async () => {
    const store = new ApprovalStore();
    // Two interleaved submissions of the same content under the same key must reconcile to a
    // single request: the idempotency decision happens after the last await, so the second
    // continuation observes the first write instead of racing it.
    const [first, second] = await Promise.all([
      broadcastProposal(store, { idempotencyKey: "idem-concurrent" }),
      broadcastProposal(store, { id: "approval-1-b", idempotencyKey: "idem-concurrent" }),
    ]);
    assert.equal(first.id, second.id);
    assert.equal(store.requests.size, 1);
    assert.equal(store.eventsFor(first.id, "t1").length, 2);

    // The expiry instant itself is already expired: an approval never authorises an action at
    // or after its expiry, and the boundary is not left to chance.
    const store2 = new ApprovalStore();
    const request = await broadcastProposal(store2, { id: "approval-boundary", ttlMinutes: 10 });
    const expiresAt = request.expiresAt;
    approve(store2, request.id, "2026-09-21T10:05:00Z");
    await expectApprovalError(
      () =>
        store2.execute(
          request.id,
          { outcome: "attempted", parametersDigest: request.parametersDigest, occurredAt: expiresAt },
          human("account-branch-admin"),
          "t1",
          deps(),
        ),
      "APPROVAL_EXPIRED",
      "an execution exactly at the expiry instant must be refused",
    );
    assert.equal(store2.getRequest(request.id, "t1").status, "expired");
  });

  it("stores no parameter values, no prose and no credential material", async () => {
    const store = new ApprovalStore();
    const request = await broadcastProposal(store, { idempotencyKey: "idem-privacy" });
    const serialized = JSON.stringify({ request, events: store.eventsFor(request.id, "t1") });
    assert.ok(!serialized.includes("waiting_list"));
    assert.ok(!serialized.includes("whatsapp"));
    assert.ok(!serialized.includes("secret://"));
    assert.ok(!serialized.includes("bearer"));
    // Only the digest and the declared key names are retained.
    assert.ok(serialized.includes(request.parametersDigest));
    assert.ok(serialized.includes("scheduledHour"));
    // The domain module holds no handle to a domain store or a framework.
    const source = readFileSync(
      new URL("../../packages/collaboration/src/approvals.ts", import.meta.url),
      "utf8",
    );
    assert.ok(!/from\s+["']@zyara\/(api|web|worker)/.test(source));
    assert.ok(!/from\s+["'](pg|fastify)["']/.test(source));
  });

  it("opens an owned exception case with a closed kind, an SLA and a W3 work item", async () => {
    const store = new ApprovalStore();
    const tasks = new OpsTaskStore();
    tasks.createTask(
      {
        id: "task-1",
        tenantId: "t1",
        branchId: "b1",
        kind: "automation_handoff",
        title: "Human exception case",
        requesterAccountId: "account-system",
        origin: { kind: "automation", ref: "account-system" },
        provenance: {
          source: "zyara-native",
          sourceRef: "n5c3-test",
          sourceRevision: "n5c3-test",
          observedAt: NOW,
        },
        createdAt: NOW,
      },
      "t1",
    );
    const opened = await store.openException(
      {
        id: "exception-1",
        tenantId: "t1",
        branchId: "b1",
        kind: "unknown_external_outcome",
        severity: "high",
        workItemTaskId: "task-1",
        subjectId: "internal-request-1",
        openedAt: NOW,
        provenance,
      },
      "t1",
      human("account-reception"),
    );
    assert.equal(opened.status, "open");
    assert.equal(opened.evidenceRequired, true);
    assert.equal(opened.workItemTaskId, "task-1");
    assert.match(opened.subjectRef ?? "", /^subject_[0-9a-f]{64}$/);
    // The internal identifier is pseudonymised and never stored verbatim.
    assert.ok(!JSON.stringify(opened).includes("internal-request-1"));
    assert.equal(opened.slaDueAt, new Date(Date.parse(NOW) + 8 * 3_600_000).toISOString());
    assert.equal(exceptionSlaState(opened, NOW), "on_time");
    assert.equal(exceptionSlaState(opened, MUCH_LATER), "overdue");
    assert.deepEqual(
      store.exceptionEventsFor(opened.id, "t1").map((event) => event.action),
      ["opened"],
    );
    // The evidence requirement is a property of the kind, not of the caller.
    const lowEvidence = await store.openException(
      {
        id: "exception-low-evidence",
        tenantId: "t1",
        branchId: "b1",
        kind: "stale_schedule",
        severity: "low",
        workItemTaskId: "task-2",
        openedAt: NOW,
        provenance,
      },
      "t1",
      human("account-reception"),
    );
    assert.equal(lowEvidence.evidenceRequired, false);
    // An unowned case is not expressible: the work item is required.
    await expectApprovalError(
      () =>
        store.openException(
          {
            id: "exception-unowned",
            tenantId: "t1",
            branchId: "b1",
            kind: "policy_refusal",
            severity: "low",
            workItemTaskId: "",
            openedAt: NOW,
            provenance,
          },
          "t1",
          human("account-reception"),
        ),
      "EXCEPTION_WORK_ITEM_REQUIRED",
      "an exception case must name the work item that owns it",
    );
    await expectApprovalError(
      () =>
        store.openException(
          {
            id: "exception-bad-kind",
            tenantId: "t1",
            branchId: "b1",
            kind: "patient_was_upset" as ExceptionKind,
            severity: "low",
            workItemTaskId: "task-1",
            openedAt: NOW,
            provenance,
          },
          "t1",
          human("account-reception"),
        ),
      "EXCEPTION_UNKNOWN_KIND",
      "a free-text exception kind must be refused",
    );
  });

  it("refuses to close a case without required evidence", async () => {
    const store = new ApprovalStore();
    const opened = await store.openException(
      {
        id: "exception-evidence",
        tenantId: "t1",
        branchId: "b1",
        kind: "missing_consent",
        severity: "medium",
        workItemTaskId: "task-evidence",
        openedAt: NOW,
        provenance,
      },
      "t1",
      human("account-reception"),
    );
    assert.equal(opened.evidenceRequired, true);
    const assigned = store.assignException(
      opened.id,
      {
        assigneeAccountId: "account-nurse",
        assigneeStaffAssignmentId: "staff-1",
        workItemStatus: "open",
        at: LATER,
      },
      human("account-branch-admin"),
      "t1",
    );
    assert.equal(assigned.status, "assigned");
    store.transitionException(
      opened.id,
      { status: "in_review", reasonCode: "review_started", at: LATER },
      human("account-nurse"),
      "t1",
    );
    store.transitionException(
      opened.id,
      {
        status: "resolved",
        resolutionCode: "resolved_with_evidence",
        reasonCode: "consent_recorded",
        at: LATER,
      },
      human("account-nurse"),
      "t1",
    );
    await expectApprovalError(
      () =>
        store.transitionException(
          opened.id,
          { status: "closed", reasonCode: "closed_without_evidence", at: LATER },
          human("account-branch-admin"),
          "t1",
        ),
      "EXCEPTION_EVIDENCE_REQUIRED",
      "a kind that requires evidence cannot be closed without it",
    );
    assert.equal(store.getException(opened.id, "t1").status, "resolved");
    const closed = store.transitionException(
      opened.id,
      {
        status: "closed",
        evidenceRef: "evidence-clinic-note-1",
        reasonCode: "closed_with_evidence",
        at: LATER,
      },
      human("account-branch-admin"),
      "t1",
    );
    assert.equal(closed.status, "closed");
    assert.equal(closed.closedAt, LATER);
    assert.equal(closed.closureEvidenceRef, "evidence-clinic-note-1");
    await expectApprovalError(
      () =>
        store.transitionException(
          opened.id,
          { status: "in_review", reasonCode: "reopen", at: MUCH_LATER },
          human("account-branch-admin"),
          "t1",
        ),
      "EXCEPTION_TERMINAL_IMMUTABLE",
      "a closed case is frozen",
    );
    assert.deepEqual(
      store.exceptionEventsFor(opened.id, "t1").map((event) => event.toStatus),
      ["open", "assigned", "in_review", "resolved", "closed"],
    );
  });

  it("keeps an unknown resolution unknown: it may be escalated, never closed", async () => {
    const store = new ApprovalStore();
    const unknownCase = await store.openException(
      {
        id: "exception-unknown",
        tenantId: "t1",
        branchId: "b1",
        kind: "external_provider_timeout",
        severity: "critical",
        workItemTaskId: "task-unknown",
        openedAt: NOW,
        provenance,
      },
      "t1",
      human("account-reception"),
    );
    assert.equal(unknownCase.evidenceRequired, false);
    store.transitionException(
      unknownCase.id,
      { status: "in_review", reasonCode: "investigating", at: LATER },
      human("account-nurse"),
      "t1",
    );
    const escalated = store.escalateException(
      unknownCase.id,
      { reasonCode: "needs_clinician", at: LATER },
      human("account-nurse"),
      "t1",
    );
    assert.equal(escalated.status, "escalated");
    store.transitionException(
      unknownCase.id,
      {
        status: "resolved",
        resolutionCode: "unknown_outcome",
        reasonCode: "provider_did_not_answer",
        at: LATER,
      },
      human("account-nurse"),
      "t1",
    );
    await expectApprovalError(
      () =>
        store.transitionException(
          unknownCase.id,
          { status: "closed", reasonCode: "closed_anyway", at: MUCH_LATER },
          human("account-branch-admin"),
          "t1",
        ),
      "EXCEPTION_UNKNOWN_CANNOT_CLOSE",
      "an unknown outcome must remain unknown",
    );
    assert.equal(store.getException(unknownCase.id, "t1").resolutionCode, "unknown_outcome");
    assert.equal(store.getException(unknownCase.id, "t1").status, "resolved");
  });

  it("enforces the exception state machine, resolution and tenant isolation on the queue", async () => {
    const store = new ApprovalStore();
    const opened = await store.openException(
      {
        id: "exception-machine",
        tenantId: "t1",
        branchId: "b1",
        kind: "stale_schedule",
        severity: "low",
        workItemTaskId: "task-machine",
        openedAt: NOW,
        provenance,
      },
      "t1",
      human("account-reception"),
    );
    await expectApprovalError(
      () =>
        store.transitionException(
          opened.id,
          { status: "closed", reasonCode: "skip_states", at: LATER },
          human("account-branch-admin"),
          "t1",
        ),
      "EXCEPTION_INVALID_TRANSITION",
      "a case cannot jump from open to closed",
    );
    await expectApprovalError(
      () =>
        store.transitionException(
          opened.id,
          { status: "resolved", reasonCode: "no_resolution_code", at: LATER },
          human("account-nurse"),
          "t1",
        ),
      "EXCEPTION_INVALID_TRANSITION",
      "resolving from open is not an enumerated edge",
    );
    await expectApprovalError(
      () => store.getException(opened.id, "t2"),
      "EXCEPTION_UNKNOWN_REFERENCE",
      "another tenant must not read this case",
    );
    await expectApprovalError(
      () =>
        store.openException(
          {
            id: "exception-cross-tenant",
            tenantId: "t2",
            branchId: "b1",
            kind: "stale_schedule",
            severity: "low",
            workItemTaskId: "task-other",
            openedAt: NOW,
            provenance,
          },
          "t1",
          human("account-reception"),
        ),
      "EXCEPTION_CROSS_TENANT",
      "a case cannot be written into another tenant",
    );
    store.transitionException(
      opened.id,
      { status: "in_review", reasonCode: "review_started", at: LATER },
      human("account-nurse"),
      "t1",
    );
    await expectApprovalError(
      () =>
        store.transitionException(
          opened.id,
          { status: "resolved", reasonCode: "no_resolution_code", at: LATER },
          human("account-nurse"),
          "t1",
        ),
      "EXCEPTION_MISSING_RESOLUTION",
      "resolving a case requires a resolution code",
    );
    // The closed registries stay closed.
    assert.equal(EXCEPTION_KINDS.length, 15);
    assert.equal(EXCEPTION_STATUSES.length, 7);
    assert.ok(!(EXCEPTION_KINDS as readonly string[]).includes("patient_complaint"));
    assert.ok(!(EXCEPTION_STATUSES as readonly string[]).includes("waiting"));
    assert.ok(!Object.keys(PROTECTED_ACTIONS).includes("clinical.prescribe"));
  });
});
