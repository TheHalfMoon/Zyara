// N5/C1 synthetic qualification: distinct agent identity and scoped authority.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  AgentAuthorityError,
  AgentAuthorityStore,
  capabilityRequiresHumanApproval,
  type AgentIdentity,
  type AgentGrant,
} from "@zyara/agent-authority";

const BASE = "2026-09-21T16:00:00.000Z";

function identity(overrides: Partial<AgentIdentity> = {}): AgentIdentity {
  return {
    id: "agt_frontdesk01",
    tenantId: "t1",
    branchId: "b1",
    kind: "workflow_agent",
    displayName: "Front Desk Automation",
    purpose: "Assist with bounded administrative clinic work",
    status: "draft",
    createdByAccountId: "admin-1",
    sourceRef: "C1 synthetic test",
    sourceRevision: "c1-test",
    createdAt: BASE,
    updatedAt: BASE,
    ...overrides,
  };
}

function grant(overrides: Partial<AgentGrant> = {}): AgentGrant {
  return {
    id: "grant-1",
    tenantId: "t1",
    agentId: "agt_frontdesk01",
    branchId: "b1",
    capability: "ops.tasks.read",
    requiresHumanApproval: false,
    effectiveFrom: BASE,
    effectiveTo: null,
    grantedByAccountId: "admin-1",
    revokedAt: null,
    revokedByAccountId: null,
    reason: "admin_scoped",
    createdAt: BASE,
    ...overrides,
  };
}

describe("N5/C1 agent authority", () => {
  it("creates an exact agent identity that is distinct from human accounts", () => {
    const store = new AgentAuthorityStore();
    const created = store.createIdentity(identity(), "t1");
    assert.equal(created.id, "agt_frontdesk01");
    assert.equal(created.status, "draft");
    assert.equal(store.listEvents(created.id, "t1")[0].action, "identity_created");
    assert.throws(
      () => store.createIdentity(identity({ id: "admin-1" }), "t1"),
      (error: unknown) =>
        error instanceof AgentAuthorityError && error.code === "AGENT_INVALID_ID",
    );
  });

  it("uses conservative status transitions and revoked is terminal", () => {
    const store = new AgentAuthorityStore();
    store.createIdentity(identity(), "t1");
    assert.throws(
      () => store.transitionIdentity(
        "agt_frontdesk01", "t1", "paused", BASE, "admin-1", "pause_before_activation",
      ),
      (error: unknown) =>
        error instanceof AgentAuthorityError && error.code === "AGENT_INVALID_TRANSITION",
    );
    store.transitionIdentity(
      "agt_frontdesk01", "t1", "active", "2026-09-21T16:01:00Z", "admin-1", "approved_activation",
    );
    store.transitionIdentity(
      "agt_frontdesk01", "t1", "paused", "2026-09-21T16:02:00Z", "admin-1", "operator_pause",
    );
    store.transitionIdentity(
      "agt_frontdesk01", "t1", "active", "2026-09-21T16:03:00Z", "admin-1", "operator_resume",
    );
    store.transitionIdentity(
      "agt_frontdesk01", "t1", "revoked", "2026-09-21T16:04:00Z", "admin-1", "retired",
    );
    assert.throws(
      () => store.transitionIdentity(
        "agt_frontdesk01", "t1", "active", "2026-09-21T16:05:00Z", "admin-1", "invalid_resume",
      ),
      (error: unknown) =>
        error instanceof AgentAuthorityError && error.code === "AGENT_INVALID_TRANSITION",
    );
  });

  it("denies cross-tenant and cross-branch grants", () => {
    const store = new AgentAuthorityStore();
    store.createIdentity(identity(), "t1");
    assert.throws(
      () => store.grant(grant({ tenantId: "t2" }), "t1"),
      (error: unknown) =>
        error instanceof AgentAuthorityError && error.code === "AGENT_CROSS_TENANT",
    );
    assert.throws(
      () => store.grant(grant({ branchId: "b2" }), "t1"),
      (error: unknown) =>
        error instanceof AgentAuthorityError && error.code === "AGENT_CROSS_BRANCH",
    );
  });

  it("forces human approval for mutating agent capabilities", () => {
    assert.equal(capabilityRequiresHumanApproval("ops.tasks.create"), true);
    assert.equal(capabilityRequiresHumanApproval("ops.tasks.read"), false);

    const store = new AgentAuthorityStore();
    store.createIdentity(identity(), "t1");
    assert.throws(
      () => store.grant(grant({
        capability: "ops.tasks.create",
        requiresHumanApproval: false,
      }), "t1"),
      (error: unknown) =>
        error instanceof AgentAuthorityError &&
        error.code === "AGENT_GRANT_MUTATION_REQUIRES_APPROVAL",
    );
    const created = store.grant(grant({
      capability: "ops.tasks.create",
      requiresHumanApproval: true,
    }), "t1");
    assert.equal(created.requiresHumanApproval, true);
  });

  it("authorizes only active, in-scope, time-valid grants", () => {
    const store = new AgentAuthorityStore();
    store.createIdentity(identity(), "t1");
    store.grant(grant(), "t1");

    assert.equal(store.authorize({
      tenantId: "t1",
      agentId: "agt_frontdesk01",
      branchId: "b1",
      capability: "ops.tasks.read",
      at: "2026-09-21T16:10:00Z",
      verifiedHumanApproval: false,
    }).reason, "agent_not_active");

    store.transitionIdentity(
      "agt_frontdesk01", "t1", "active", "2026-09-21T16:01:00Z", "admin-1", "approved_activation",
    );
    assert.deepEqual(store.authorize({
      tenantId: "t1",
      agentId: "agt_frontdesk01",
      branchId: "b1",
      capability: "ops.tasks.read",
      at: "2026-09-21T16:10:00Z",
      verifiedHumanApproval: false,
    }).allow, true);
    assert.equal(store.authorize({
      tenantId: "t1",
      agentId: "agt_frontdesk01",
      branchId: "b2",
      capability: "ops.tasks.read",
      at: "2026-09-21T16:10:00Z",
      verifiedHumanApproval: false,
    }).reason, "branch_out_of_scope");
  });

  it("does not let mutating grants act without the separately supplied approval signal", () => {
    const store = new AgentAuthorityStore();
    store.createIdentity(identity(), "t1");
    store.grant(grant({
      capability: "ops.tasks.comment",
      requiresHumanApproval: true,
    }), "t1");
    store.transitionIdentity(
      "agt_frontdesk01", "t1", "active", "2026-09-21T16:01:00Z", "admin-1", "approved_activation",
    );

    const denied = store.authorize({
      tenantId: "t1",
      agentId: "agt_frontdesk01",
      branchId: "b1",
      capability: "ops.tasks.comment",
      at: "2026-09-21T16:10:00Z",
      verifiedHumanApproval: false,
    });
    assert.equal(denied.allow, false);
    assert.equal(denied.reason, "human_approval_required");

    const allowed = store.authorize({
      tenantId: "t1",
      agentId: "agt_frontdesk01",
      branchId: "b1",
      capability: "ops.tasks.comment",
      at: "2026-09-21T16:10:00Z",
      verifiedHumanApproval: true,
    });
    assert.equal(allowed.allow, true);
  });

  it("revocation is idempotent and immediately removes effective authority", () => {
    const store = new AgentAuthorityStore();
    store.createIdentity(identity(), "t1");
    store.grant(grant(), "t1");
    store.transitionIdentity(
      "agt_frontdesk01", "t1", "active", "2026-09-21T16:01:00Z", "admin-1", "approved_activation",
    );
    store.revokeGrant("grant-1", "t1", "admin-1", "2026-09-21T16:05:00Z");
    store.revokeGrant("grant-1", "t1", "admin-1", "2026-09-21T16:06:00Z");
    assert.equal(store.authorize({
      tenantId: "t1",
      agentId: "agt_frontdesk01",
      branchId: "b1",
      capability: "ops.tasks.read",
      at: "2026-09-21T16:10:00Z",
      verifiedHumanApproval: false,
    }).reason, "grant_missing");
  });

  it("schema has no runtime secret, generic shell, or clinical capability", () => {
    const sql = readFileSync(new URL("../../db/migrations/042_agent_identities.sql", import.meta.url), "utf8");
    for (const token of [
      "agent_identities",
      "agent_grants",
      "agent_authority_events",
      "FORCE ROW LEVEL SECURITY",
      "WITH CHECK",
      "ops.tasks.read",
      "requires_human_approval",
    ]) assert.ok(sql.includes(token), token);

    for (const forbidden of [
      "api_token",
      "private_key",
      "access_token",
      "shell.exec",
      "file.write",
      "clinical.write",
      "prescription.write",
      "claim.write",
    ]) assert.equal(sql.includes(forbidden), false, forbidden);
  });
});
