import assert from "node:assert/strict";
import { buildServer } from "../src/index.js";
import { oidc } from "../src/auth.js";
import { replaceWorkforceMemberships } from "../src/workforce.js";
import { agentAuthorityStore } from "../src/agents.js";

agentAuthorityStore.identities.clear();
agentAuthorityStore.grants.clear();
agentAuthorityStore.events.clear();

const now = Math.floor(Date.now() / 1000);
const adminToken = oidc.issue({
  sub: "admin-1",
  tenant: "t1",
  assurance: "aal2",
  exp: now + 3600,
  sid: "c1-admin-session",
});
const branchAdminToken = oidc.issue({
  sub: "branch-admin-1",
  tenant: "t1",
  assurance: "aal2",
  exp: now + 3600,
  sid: "c1-branch-admin-session",
});
const branchAdminB2Token = oidc.issue({
  sub: "branch-admin-2",
  tenant: "t1",
  assurance: "aal2",
  exp: now + 3600,
  sid: "c1-branch-admin-b2-session",
});

replaceWorkforceMemberships("t1", "admin-1", [{
  accountId: "admin-1",
  tenantId: "t1",
  branchId: null,
  role: "org_admin",
  revoked: false,
  patientId: null,
}]);
replaceWorkforceMemberships("t1", "branch-admin-1", [{
  accountId: "branch-admin-1",
  tenantId: "t1",
  branchId: "b1",
  role: "branch_admin",
  revoked: false,
  patientId: null,
}]);
replaceWorkforceMemberships("t1", "branch-admin-2", [{
  accountId: "branch-admin-2",
  tenantId: "t1",
  branchId: "b2",
  role: "branch_admin",
  revoked: false,
  patientId: null,
}]);

const app = buildServer();
await app.ready();

const auth = (token: string) => ({ authorization: `Bearer ${token}` });

const unauthenticated = await app.inject({
  method: "GET",
  url: "/agents",
});
assert.equal(unauthenticated.statusCode, 401);

const branchCreate = await app.inject({
  method: "POST",
  url: "/agents",
  headers: auth(branchAdminToken),
  payload: {
    id: "agt_frontdesk01",
    branchId: "b1",
    kind: "workflow_agent",
    displayName: "Front Desk Automation",
    purpose: "Bounded administrative work",
  },
});
assert.equal(branchCreate.statusCode, 403);

const secretRejected = await app.inject({
  method: "POST",
  url: "/agents",
  headers: auth(adminToken),
  payload: {
    id: "agt_frontdesk01",
    branchId: "b1",
    kind: "workflow_agent",
    displayName: "Front Desk Automation",
    purpose: "Bounded administrative work",
    token: "must-never-be-accepted",
  },
});
assert.equal(secretRejected.statusCode, 400);
assert.equal(secretRejected.json().error, "AGENT_SECRET_INPUT_REJECTED");

const created = await app.inject({
  method: "POST",
  url: "/agents",
  headers: auth(adminToken),
  payload: {
    id: "agt_frontdesk01",
    tenantId: "t2",
    branchId: "b1",
    kind: "workflow_agent",
    displayName: "Front Desk Automation",
    purpose: "Bounded administrative work",
  },
});
assert.equal(created.statusCode, 201);
assert.equal(created.json().tenantId, "t1");
assert.equal(created.json().status, "draft");

const wrongBranchRead = await app.inject({
  method: "GET",
  url: "/agents/agt_frontdesk01",
  headers: auth(branchAdminB2Token),
});
assert.equal(wrongBranchRead.statusCode, 403);

const activate = await app.inject({
  method: "POST",
  url: "/agents/agt_frontdesk01/status",
  headers: auth(adminToken),
  payload: { next: "active", reasonCode: "approved_activation" },
});
assert.equal(activate.statusCode, 200);
assert.equal(activate.json().status, "active");

const unsafeGrant = await app.inject({
  method: "POST",
  url: "/agents/agt_frontdesk01/grants",
  headers: auth(adminToken),
  payload: {
    id: "grant-mutate-unsafe",
    branchId: "b1",
    capability: "ops.tasks.create",
    requiresHumanApproval: false,
    effectiveFrom: "2026-09-21T00:00:00Z",
    reasonCode: "admin_scoped",
  },
});
assert.equal(unsafeGrant.statusCode, 400);
assert.equal(unsafeGrant.json().error, "AGENT_GRANT_MUTATION_REQUIRES_APPROVAL");

const readGrant = await app.inject({
  method: "POST",
  url: "/agents/agt_frontdesk01/grants",
  headers: auth(adminToken),
  payload: {
    id: "grant-read",
    branchId: "b1",
    capability: "ops.tasks.read",
    requiresHumanApproval: false,
    effectiveFrom: "2026-09-21T00:00:00Z",
    reasonCode: "read_only_scope",
  },
});
assert.equal(readGrant.statusCode, 201);

const mutateGrant = await app.inject({
  method: "POST",
  url: "/agents/agt_frontdesk01/grants",
  headers: auth(adminToken),
  payload: {
    id: "grant-comment",
    branchId: "b1",
    capability: "ops.tasks.comment",
    requiresHumanApproval: true,
    effectiveFrom: "2026-09-21T00:00:00Z",
    reasonCode: "human_approval_required",
  },
});
assert.equal(mutateGrant.statusCode, 201);

const branchRead = await app.inject({
  method: "GET",
  url: "/agents/agt_frontdesk01",
  headers: auth(branchAdminToken),
});
assert.equal(branchRead.statusCode, 200);
assert.equal(branchRead.json().identity.id, "agt_frontdesk01");
assert.equal(branchRead.json().grants.length, 2);
assert.ok(branchRead.json().events.length >= 4);

const revoked = await app.inject({
  method: "POST",
  url: "/agents/agt_frontdesk01/grants/grant-read/revoke",
  headers: auth(adminToken),
});
assert.equal(revoked.statusCode, 200);
assert.equal(revoked.json().revokedByAccountId, "admin-1");

await app.close();
console.log("C1 agent authority HTTP smoke passed.");
