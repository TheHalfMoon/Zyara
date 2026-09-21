// N5/C3 authenticated HTTP smoke for approvals + the human exception queue.
//
// This reuses the reusable route harness introduced by N5/C2: `buildServer()` plus Fastify
// `inject()`, with real synthetic OIDC bearer tokens and server-side memberships instead of
// a fabricated route-level shortcut. It proves the C3 API boundary over HTTP rather than
// only in the domain layer:
//   * no C3 surface is reachable without a verified AAL2 session;
//   * a body-supplied requester, approver or authority is refused, never trusted;
//   * an approval is bound to the exact action and parameter digest the approver saw;
//   * self-approval and unauthorised approval are refused;
//   * tenant and branch boundaries hold on read, decide, execute and exception routes;
//   * an exception case is queued as an owned W3 work item and cannot be closed without
//     required evidence or while its resolution is unknown;
//   * C3 truth is derived into C2 activity, and the activity feed cannot authorise anything.
import assert from "node:assert/strict";
import type { BranchRole, Membership } from "@zyara/authorization";
import { buildServer } from "../src/index.js";
import { oidc } from "../src/auth.js";
import { replaceWorkforceMemberships } from "../src/workforce.js";
import { activityProjectionFailures } from "../src/activity.js";
import { approvalStore } from "../src/approvals.js";

const NOW_SEC = Math.floor(Date.now() / 1000);

function membership(
  accountId: string,
  tenantId: string,
  branchId: string | null,
  role: BranchRole,
): Membership {
  return { accountId, tenantId, branchId, role, revoked: false, patientId: null };
}

function token(sub: string, tenant: string, assurance: "aal1" | "aal2" = "aal2"): string {
  return oidc.issue({ sub, sid: `sid-${sub}-${tenant}`, tenant, assurance, exp: NOW_SEC + 3600 });
}

function bearer(value: string) {
  return { authorization: `Bearer ${value}` };
}

replaceWorkforceMemberships("t1", "account-org-admin", [membership("account-org-admin", "t1", null, "org_admin")]);
replaceWorkforceMemberships("t1", "account-aal1", [membership("account-aal1", "t1", null, "org_admin")]);
replaceWorkforceMemberships("t1", "account-front-b1", [membership("account-front-b1", "t1", "b1", "receptionist")]);
replaceWorkforceMemberships("t1", "account-front-b2", [membership("account-front-b2", "t1", "b2", "receptionist")]);
replaceWorkforceMemberships("t1", "account-branch-admin", [membership("account-branch-admin", "t1", "b1", "branch_admin")]);
replaceWorkforceMemberships("t1", "account-clinician", [membership("account-clinician", "t1", "b1", "clinician")]);
replaceWorkforceMemberships("t1", "account-self-approver", [membership("account-self-approver", "t1", "b1", "branch_admin")]);
replaceWorkforceMemberships("t2", "account-t2-admin", [membership("account-t2-admin", "t2", null, "org_admin")]);

const app = buildServer();
await app.ready();

const orgAdmin = token("account-org-admin", "t1");
const lowAssurance = token("account-aal1", "t1", "aal1");
const frontB1 = token("account-front-b1", "t1");
const frontB2 = token("account-front-b2", "t1");
const branchAdmin = token("account-branch-admin", "t1");
const clinician = token("account-clinician", "t1");
const selfApprover = token("account-self-approver", "t1");
const tenantTwoAdmin = token("account-t2-admin", "t2");

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

// W1 workforce fixtures: the exception queue assigns human work through W3, which resolves
// the assignee against the workforce graph.
const assignment = await app.inject({
  method: "POST",
  url: "/workforce/staff-assignments",
  headers: bearer(orgAdmin),
  payload: {
    id: "sa-c3-b1",
    accountId: "account-branch-admin",
    organizationId: "org-1",
    branchId: "b1",
    operationalRole: "nurse_lead",
    effectiveFrom: "2026-01-01",
  },
});
assert.equal(assignment.statusCode, 201);

// --- no C3 surface without a verified AAL2 session -----------------------------
assert.equal((await app.inject({ method: "GET", url: "/workforce/approvals" })).statusCode, 401);
assert.equal(
  (
    await app.inject({
      method: "GET",
      url: "/workforce/approvals",
      headers: bearer(lowAssurance),
    })
  ).statusCode,
  403,
);
assert.equal(
  (
    await app.inject({
      method: "GET",
      url: "/workforce/exceptions?branchId=b1",
      headers: bearer(lowAssurance),
    })
  ).statusCode,
  403,
);

// --- a caller can never supply the requester or the approver -------------------
const forgedRequester = await app.inject({
  method: "POST",
  url: "/workforce/approvals",
  headers: bearer(frontB1),
  payload: {
    id: "approval-forged",
    branchId: "b1",
    actionType: "communications.outbound.broadcast",
    parameters: BROADCAST_PARAMETERS,
    requesterAccountId: "account-org-admin",
  },
});
assert.equal(forgedRequester.statusCode, 403);
assert.equal(
  (forgedRequester.json() as { error: string }).error,
  "APPROVAL_REQUESTER_NOT_AUTHORIZED",
);
const forgedAuthority = await app.inject({
  method: "POST",
  url: "/workforce/approvals",
  headers: bearer(frontB1),
  payload: {
    id: "approval-forged-authority",
    branchId: "b1",
    actionType: "communications.outbound.broadcast",
    parameters: BROADCAST_PARAMETERS,
    authority: "org_admin",
  },
});
assert.equal(forgedAuthority.statusCode, 403);

// --- proposal ------------------------------------------------------------------
const proposed = await app.inject({
  method: "POST",
  url: "/workforce/approvals",
  headers: bearer(frontB1),
  payload: {
    id: "approval-http-1",
    branchId: "b1",
    actionType: "communications.outbound.broadcast",
    parameters: BROADCAST_PARAMETERS,
    correlationId: "corr-http-c3",
    idempotencyKey: "idem-http-1",
  },
});
assert.equal(proposed.statusCode, 201);
const request = proposed.json() as Record<string, unknown>;
assert.equal(request.status, "awaiting_approval");
assert.equal(request.requesterAccountId, "account-front-b1");
assert.equal(request.requesterAgentId, null);
// No protected parameter value is returned or stored.
const requestSerialized = JSON.stringify(request);
assert.ok(!requestSerialized.includes("waiting_list"));
assert.ok(!requestSerialized.includes("whatsapp"));
assert.match(String(request.parametersDigest), /^params_[0-9a-f]{64}$/);

// A retry with the same idempotency key reconciles the original request.
const replay = await app.inject({
  method: "POST",
  url: "/workforce/approvals",
  headers: bearer(frontB1),
  payload: {
    id: "approval-http-1-replay",
    branchId: "b1",
    actionType: "communications.outbound.broadcast",
    parameters: BROADCAST_PARAMETERS,
    correlationId: "corr-http-c3",
    idempotencyKey: "idem-http-1",
  },
});
assert.equal(replay.statusCode, 201);
assert.equal((replay.json() as { id: string }).id, "approval-http-1");

// --- boundary: branch, tenant and direct object access -------------------------
assert.equal(
  (
    await app.inject({
      method: "GET",
      url: "/workforce/approvals?branchId=b1",
      headers: bearer(frontB2),
    })
  ).statusCode,
  403,
);
assert.equal(
  (
    await app.inject({
      method: "GET",
      url: "/workforce/approvals",
      headers: bearer(frontB1),
    })
  ).statusCode,
  403,
);
const adminList = await app.inject({
  method: "GET",
  url: "/workforce/approvals?branchId=b1",
  headers: bearer(orgAdmin),
});
assert.equal(adminList.statusCode, 200);
assert.ok(
  (adminList.json() as Array<{ id: string }>).some((row) => row.id === "approval-http-1"),
);
assert.deepEqual(
  (
    await app.inject({
      method: "GET",
      url: "/workforce/approvals?branchId=b1",
      headers: bearer(tenantTwoAdmin),
    })
  ).json(),
  [],
);
assert.equal(
  (
    await app.inject({
      method: "GET",
      url: "/workforce/approvals/approval-http-1",
      headers: bearer(tenantTwoAdmin),
    })
  ).statusCode,
  404,
);

// --- decisions: self-approval, forged approver and missing authority ------------
// A requester that also holds the deciding role must still not approve its own proposal.
const selfProposal = await app.inject({
  method: "POST",
  url: "/workforce/approvals",
  headers: bearer(selfApprover),
  payload: {
    id: "approval-http-self",
    branchId: "b1",
    actionType: "communications.outbound.broadcast",
    parameters: BROADCAST_PARAMETERS,
  },
});
assert.equal(selfProposal.statusCode, 201);
const selfApproval = await app.inject({
  method: "POST",
  url: "/workforce/approvals/approval-http-self/decision",
  headers: bearer(selfApprover),
  payload: { outcome: "approved", reasonCode: "authorized", evidenceRef: "evidence-1" },
});
assert.equal(selfApproval.statusCode, 403);
assert.equal((selfApproval.json() as { error: string }).error, "APPROVAL_SELF_APPROVAL_FORBIDDEN");

const forgedApprover = await app.inject({
  method: "POST",
  url: "/workforce/approvals/approval-http-1/decision",
  headers: bearer(clinician),
  payload: {
    outcome: "approved",
    reasonCode: "authorized",
    evidenceRef: "evidence-1",
    approverAccountId: "account-branch-admin",
    authority: "branch_admin",
  },
});
assert.equal(forgedApprover.statusCode, 403);
assert.equal((forgedApprover.json() as { error: string }).error, "APPROVAL_APPROVER_NOT_AUTHORIZED");

const unauthorised = await app.inject({
  method: "POST",
  url: "/workforce/approvals/approval-http-1/decision",
  headers: bearer(clinician),
  payload: { outcome: "approved", reasonCode: "authorized", evidenceRef: "evidence-1" },
});
assert.equal(unauthorised.statusCode, 403);
assert.equal(
  (unauthorised.json() as { error: string }).error,
  "APPROVAL_APPROVER_AUTHORITY_MISSING",
);

// A protected action that requires evidence cannot be decided without it.
const unevidenced = await app.inject({
  method: "POST",
  url: "/workforce/approvals/approval-http-1/decision",
  headers: bearer(branchAdmin),
  payload: { outcome: "approved", reasonCode: "authorized" },
});
assert.equal(unevidenced.statusCode, 400);
assert.equal((unevidenced.json() as { error: string }).error, "APPROVAL_EVIDENCE_REQUIRED");

const approved = await app.inject({
  method: "POST",
  url: "/workforce/approvals/approval-http-1/decision",
  headers: bearer(branchAdmin),
  payload: {
    outcome: "approved",
    reasonCode: "authorized",
    evidenceRef: "evidence-1",
    idempotencyKey: "idem-decision-1",
  },
});
assert.equal(approved.statusCode, 200);
const approvedBody = approved.json() as {
  request: { status: string };
  decision: { authority: { authority: string; branchId: string | null } };
};
assert.equal(approvedBody.request.status, "approved");
assert.equal(approvedBody.decision.authority.authority, "branch_admin");
assert.equal(approvedBody.decision.authority.branchId, "b1");

// --- execution: digest binding and evidenced outcome ---------------------------
const wrongDigest = await app.inject({
  method: "POST",
  url: "/workforce/approvals/approval-http-1/executions",
  headers: bearer(branchAdmin),
  payload: { outcome: "attempted", parametersDigest: `params_${"cd".repeat(32)}` },
});
assert.equal(wrongDigest.statusCode, 400);
assert.equal((wrongDigest.json() as { error: string }).error, "APPROVAL_PARAMETERS_CHANGED");

// The approval was invalidated by the parameter mismatch, so a new proposal is required.
const superseded = await app.inject({
  method: "GET",
  url: "/workforce/approvals/approval-http-1",
  headers: bearer(branchAdmin),
});
assert.equal((superseded.json() as { request: { status: string } }).request.status, "superseded");

const second = await app.inject({
  method: "POST",
  url: "/workforce/approvals",
  headers: bearer(frontB1),
  payload: {
    id: "approval-http-2",
    branchId: "b1",
    actionType: "communications.outbound.broadcast",
    parameters: { ...BROADCAST_PARAMETERS, scheduledHour: 11 },
  },
});
assert.equal(second.statusCode, 201);
const digest2 = String((second.json() as { parametersDigest: string }).parametersDigest);
await app.inject({
  method: "POST",
  url: "/workforce/approvals/approval-http-2/decision",
  headers: bearer(branchAdmin),
  payload: { outcome: "approved", reasonCode: "authorized", evidenceRef: "evidence-2" },
});
const started = await app.inject({
  method: "POST",
  url: "/workforce/approvals/approval-http-2/executions",
  headers: bearer(branchAdmin),
  payload: { outcome: "attempted", parametersDigest: digest2 },
});
assert.equal(started.statusCode, 200);
assert.equal((started.json() as { request: { status: string } }).request.status, "executing");
const unevidencedOutcome = await app.inject({
  method: "POST",
  url: "/workforce/approvals/approval-http-2/executions",
  headers: bearer(branchAdmin),
  payload: { outcome: "succeeded", parametersDigest: digest2 },
});
assert.equal(unevidencedOutcome.statusCode, 400);
assert.equal(
  (unevidencedOutcome.json() as { error: string }).error,
  "APPROVAL_EVIDENCE_REQUIRED",
);
const succeeded = await app.inject({
  method: "POST",
  url: "/workforce/approvals/approval-http-2/executions",
  headers: bearer(branchAdmin),
  payload: { outcome: "succeeded", parametersDigest: digest2, receiptRef: "receipt-http-1" },
});
assert.equal(succeeded.statusCode, 200);
assert.equal((succeeded.json() as { request: { status: string } }).request.status, "succeeded");

// --- expiry sweep is an explicit administrator action --------------------------
assert.equal(
  (
    await app.inject({
      method: "POST",
      url: "/workforce/approvals/expiry-sweep",
      headers: bearer(branchAdmin),
    })
  ).statusCode,
  403,
);
const sweep = await app.inject({
  method: "POST",
  url: "/workforce/approvals/expiry-sweep",
  headers: bearer(orgAdmin),
});
assert.equal(sweep.statusCode, 200);
assert.deepEqual((sweep.json() as { expired: string[] }).expired, []);

// --- unknown external outcome -> human exception queue -------------------------
// Approval expiry over HTTP. The window itself is exercised synthetically: the request is
// proposed through the route with the smallest allowed TTL, approved, and then the stored
// expiry is moved into the past so the route's own expiry rule is what refuses execution.
const expiring = await app.inject({
  method: "POST",
  url: "/workforce/approvals",
  headers: bearer(frontB1),
  payload: {
    id: "approval-http-expiry",
    branchId: "b1",
    actionType: "workforce.coverage_override",
    parameters: COVERAGE_PARAMETERS,
    ttlMinutes: 1,
  },
});
assert.equal(expiring.statusCode, 201);
const expiringDigest = String((expiring.json() as { parametersDigest: string }).parametersDigest);
await app.inject({
  method: "POST",
  url: "/workforce/approvals/approval-http-expiry/decision",
  headers: bearer(branchAdmin),
  payload: { outcome: "approved", reasonCode: "authorized" },
});
const storedExpiring = approvalStore.requests.get("approval-http-expiry");
assert.ok(storedExpiring);
approvalStore.requests.set("approval-http-expiry", {
  ...storedExpiring,
  expiresAt: new Date(Date.now() - 60_000).toISOString(),
});
const expiredExecution = await app.inject({
  method: "POST",
  url: "/workforce/approvals/approval-http-expiry/executions",
  headers: bearer(branchAdmin),
  payload: { outcome: "attempted", parametersDigest: expiringDigest },
});
assert.equal(expiredExecution.statusCode, 400);
assert.equal((expiredExecution.json() as { error: string }).error, "APPROVAL_EXPIRED");
const expiredRead = await app.inject({
  method: "GET",
  url: "/workforce/approvals/approval-http-expiry",
  headers: bearer(branchAdmin),
});
const expiredBody = expiredRead.json() as {
  request: { status: string; effectiveStatus: string };
};
assert.equal(expiredBody.request.status, "expired");
assert.equal(expiredBody.request.effectiveStatus, "expired");

// --- unknown external outcome -> human exception queue -------------------------
const coverage = await app.inject({
  method: "POST",
  url: "/workforce/approvals",
  headers: bearer(frontB1),
  payload: {
    id: "approval-http-3",
    branchId: "b1",
    actionType: "workforce.coverage_override",
    parameters: COVERAGE_PARAMETERS,
    correlationId: "corr-http-c3-unknown",
  },
});
assert.equal(coverage.statusCode, 201);
const coverageDigest = String((coverage.json() as { parametersDigest: string }).parametersDigest);
await app.inject({
  method: "POST",
  url: "/workforce/approvals/approval-http-3/decision",
  headers: bearer(branchAdmin),
  payload: { outcome: "approved", reasonCode: "authorized" },
});
const unknown = await app.inject({
  method: "POST",
  url: "/workforce/approvals/approval-http-3/executions",
  headers: bearer(branchAdmin),
  payload: { outcome: "unknown", parametersDigest: coverageDigest },
});
assert.equal(unknown.statusCode, 200);
assert.equal((unknown.json() as { request: { status: string } }).request.status, "needs_human");

// A client-declared automation origin without a C3-driven reason is refused.
const forgedAutomation = await app.inject({
  method: "POST",
  url: "/workforce/exceptions",
  headers: bearer(frontB1),
  payload: {
    id: "exception-http-forged",
    branchId: "b1",
    kind: "external_provider_timeout",
    severity: "high",
    originKind: "automation",
  },
});
assert.equal(forgedAutomation.statusCode, 403);
assert.equal(
  (forgedAutomation.json() as { error: string }).error,
  "EXCEPTION_ORIGIN_NOT_AUTHORIZED",
);

// A case can be linked to the request the server itself placed in needs_human.
const opened = await app.inject({
  method: "POST",
  url: "/workforce/exceptions",
  headers: bearer(frontB1),
  payload: {
    id: "exception-http-1",
    branchId: "b1",
    kind: "approval_outcome_unknown",
    severity: "high",
    approvalRequestId: "approval-http-3",
  },
});
assert.equal(opened.statusCode, 201);
const exceptionCase = opened.json() as {
  id: string;
  status: string;
  evidenceRequired: boolean;
  correlationId: string | null;
  workItemTaskId: string;
  workItem: { id: string; status: string; originKind: string; dueAt: string | null } | null;
  slaState: string;
};
assert.equal(exceptionCase.status, "open");
assert.equal(exceptionCase.evidenceRequired, true);
// The correlation chain is inherited from the approval that gave up.
assert.equal(exceptionCase.correlationId, "corr-http-c3-unknown");
assert.ok(exceptionCase.workItem, "the case must be owned by a W3 work item");
assert.equal(exceptionCase.workItem?.originKind, "automation");
assert.equal(exceptionCase.workItem?.status, "open");
assert.ok(exceptionCase.workItem?.dueAt, "the work item carries the SLA due time");
assert.equal(exceptionCase.slaState, "on_time");

// Linking to a request that is not awaiting a human is refused.
const wrongLink = await app.inject({
  method: "POST",
  url: "/workforce/exceptions",
  headers: bearer(frontB1),
  payload: {
    id: "exception-http-bad-link",
    branchId: "b1",
    kind: "approval_outcome_unknown",
    severity: "low",
    approvalRequestId: "approval-http-2",
  },
});
assert.equal(wrongLink.statusCode, 400);

// --- exception queue: ownership, evidence and closure --------------------------
const assigned = await app.inject({
  method: "POST",
  url: "/workforce/exceptions/exception-http-1/assign",
  headers: bearer(branchAdmin),
  payload: { assigneeAccountId: "account-branch-admin", assigneeStaffAssignmentId: "sa-c3-b1" },
});
assert.equal(assigned.statusCode, 200);
const assignedBody = assigned.json() as {
  status: string;
  workItem: { assigneeAccountId: string | null } | null;
};
assert.equal(assignedBody.status, "assigned");
assert.equal(assignedBody.workItem?.assigneeAccountId, "account-branch-admin");

// Assignment is W3-owned: the transition route refuses to fake it.
const fakeAssign = await app.inject({
  method: "POST",
  url: "/workforce/exceptions/exception-http-1/transition",
  headers: bearer(branchAdmin),
  payload: { status: "assigned", reasonCode: "manual" },
});
assert.equal(fakeAssign.statusCode, 400);

const inReview = await app.inject({
  method: "POST",
  url: "/workforce/exceptions/exception-http-1/transition",
  headers: bearer(branchAdmin),
  payload: { status: "in_review", reasonCode: "review_started" },
});
assert.equal(inReview.statusCode, 200);
assert.equal(
  (inReview.json() as { workItem: { status: string } | null }).workItem?.status,
  "in_progress",
);

const resolved = await app.inject({
  method: "POST",
  url: "/workforce/exceptions/exception-http-1/transition",
  headers: bearer(branchAdmin),
  payload: {
    status: "resolved",
    resolutionCode: "resolved_with_evidence",
    reasonCode: "provider_confirmed",
  },
});
assert.equal(resolved.statusCode, 200);
assert.equal((resolved.json() as { workItem: { status: string } | null }).workItem?.status, "resolved");

const closeWithoutEvidence = await app.inject({
  method: "POST",
  url: "/workforce/exceptions/exception-http-1/transition",
  headers: bearer(branchAdmin),
  payload: { status: "closed", reasonCode: "closed_without_evidence" },
});
assert.equal(closeWithoutEvidence.statusCode, 400);
assert.equal(
  (closeWithoutEvidence.json() as { error: string }).error,
  "EXCEPTION_EVIDENCE_REQUIRED",
);

const closed = await app.inject({
  method: "POST",
  url: "/workforce/exceptions/exception-http-1/transition",
  headers: bearer(branchAdmin),
  payload: {
    status: "closed",
    evidenceRef: "evidence-provider-receipt-1",
    reasonCode: "closed_with_evidence",
  },
});
assert.equal(closed.statusCode, 200);
const closedCase = closed.json() as {
  status: string;
  closureEvidenceRef: string | null;
  slaState: string;
};
assert.equal(closedCase.status, "closed");
assert.equal(closedCase.closureEvidenceRef, "evidence-provider-receipt-1");
assert.equal(closedCase.slaState, "closed");

// A case whose resolution is unknown can never be closed.
const unknownCase = await app.inject({
  method: "POST",
  url: "/workforce/exceptions",
  headers: bearer(frontB1),
  payload: {
    id: "exception-http-2",
    branchId: "b1",
    kind: "external_provider_timeout",
    severity: "critical",
  },
});
assert.equal(unknownCase.statusCode, 201);
assert.equal((unknownCase.json() as { evidenceRequired: boolean }).evidenceRequired, false);
const openedCaseId = (unknownCase.json() as { id: string }).id;
await app.inject({
  method: "POST",
  url: `/workforce/exceptions/${openedCaseId}/transition`,
  headers: bearer(branchAdmin),
  payload: { status: "in_review", reasonCode: "investigating" },
});
await app.inject({
  method: "POST",
  url: `/workforce/exceptions/${openedCaseId}/transition`,
  headers: bearer(branchAdmin),
  payload: {
    status: "resolved",
    resolutionCode: "unknown_outcome",
    reasonCode: "provider_did_not_answer",
  },
});
const closeUnknown = await app.inject({
  method: "POST",
  url: `/workforce/exceptions/${openedCaseId}/transition`,
  headers: bearer(branchAdmin),
  payload: { status: "closed", reasonCode: "closed_anyway" },
});
assert.equal(closeUnknown.statusCode, 400);
assert.equal((closeUnknown.json() as { error: string }).error, "EXCEPTION_UNKNOWN_CANNOT_CLOSE");

// --- boundaries on the queue ---------------------------------------------------
assert.equal(
  (
    await app.inject({
      method: "GET",
      url: "/workforce/exceptions?branchId=b1",
      headers: bearer(frontB2),
    })
  ).statusCode,
  403,
);
assert.equal(
  (
    await app.inject({
      method: "GET",
      url: "/workforce/exceptions/exception-http-1",
      headers: bearer(tenantTwoAdmin),
    })
  ).statusCode,
  404,
);
const queue = await app.inject({
  method: "GET",
  url: "/workforce/exceptions?branchId=b1",
  headers: bearer(branchAdmin),
});
assert.equal(queue.statusCode, 200);
const queueRows = queue.json() as Array<{ id: string; slaState: string; workItem: unknown }>;
assert.ok(queueRows.some((row) => row.id === "exception-http-1"));
assert.ok(queueRows.every((row) => row.workItem !== null));
assert.equal(
  (
    await app.inject({
      method: "GET",
      url: "/workforce/exceptions?branchId=b1&status=waiting",
      headers: bearer(branchAdmin),
    })
  ).statusCode,
  400,
);

// --- C3 truth is derived into C2 activity, which cannot authorise anything ------
const feed = await app.inject({
  method: "GET",
  url: "/workforce/activity?branchId=b1",
  headers: bearer(branchAdmin),
});
assert.equal(feed.statusCode, 200);
const activityRows = feed.json() as Array<Record<string, unknown>>;
const approvalRows = activityRows.filter((row) => row.category === "approval");
const exceptionRows = activityRows.filter((row) => row.category === "exception");
assert.ok(approvalRows.length >= 4, "approval transitions must be derived into activity");
assert.ok(exceptionRows.length >= 4, "exception transitions must be derived into activity");
const approvalAction = approvalRows.find((row) => row.action === "approved");
assert.ok(approvalAction);
assert.equal(approvalAction.sourceDomain, "collaboration.approvals");
assert.equal(approvalAction.subjectType, "approval_request");
assert.equal(approvalAction.title, "Protected action approved");
assert.deepEqual(approvalAction.payload, {
  approvalStatus: "approved",
  requiredAuthority: "branch_admin",
  riskClass: "high",
});
const exceptionOpened = exceptionRows.find((row) => row.action === "opened");
assert.ok(exceptionOpened);
assert.equal(exceptionOpened.title, "Human exception case opened");
assert.equal(exceptionOpened.correlationId, "corr-http-c3-unknown");
const exceptionPayload = exceptionOpened.payload as Record<string, unknown>;
assert.equal(exceptionPayload.exceptionKind, "approval_outcome_unknown");
assert.equal(exceptionPayload.exceptionSeverity, "high");
assert.equal(exceptionPayload.exceptionStatus, "open");
// Activity is derived: no C3 state can be written through a feed route.
const activityWrite = await app.inject({
  method: "POST",
  url: "/workforce/activity",
  headers: bearer(branchAdmin),
  payload: { tenantId: "t1", sourceDomain: "collaboration.approvals", action: "approved" },
});
assert.equal(activityWrite.statusCode, 404);
// The feed carries no prose and no protected parameter value.
const feedSerialized = JSON.stringify(activityRows);
assert.ok(!feedSerialized.includes("waiting_list"));
assert.ok(!feedSerialized.includes("receipt-http-1"));

// A clinician may read restricted activity, but the C3 rows stay operational metadata.
const clinicianFeed = await app.inject({
  method: "GET",
  url: "/workforce/activity?branchId=b1&includeRestricted=true",
  headers: bearer(clinician),
});
assert.equal(clinicianFeed.statusCode, 200);

assert.deepEqual(activityProjectionFailures, []);

await app.close();
console.log("N5/C3 approvals HTTP smoke passed.");
