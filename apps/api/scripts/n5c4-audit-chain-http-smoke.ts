// N5/C4 authenticated HTTP smoke: cross-slice audit-chain reconstruction.
//
// It builds one real chain through the public routes (a W3 task, a C3 protected action that
// was approved, executed and then gave up to the human exception queue, plus the derived
// activity those operations emitted), and then asks the audit-chain route to reconstruct it.
// The chain is not fabricated: every entry the reconstruction reports comes from a record the
// owning slice actually wrote during this run.
import assert from "node:assert/strict";
import type { BranchRole, Membership } from "@zyara/authorization";
import { buildServer } from "../src/index.js";
import { oidc } from "../src/auth.js";
import { replaceWorkforceMemberships } from "../src/workforce.js";

const NOW_SEC = Math.floor(Date.now() / 1000);
const CORRELATION = "corr-c4-http-1";

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

replaceWorkforceMemberships("t1", "account-org-admin", [
  membership("account-org-admin", "t1", null, "org_admin"),
]);
replaceWorkforceMemberships("t1", "account-aal1", [
  membership("account-aal1", "t1", null, "org_admin"),
]);
replaceWorkforceMemberships("t1", "account-front-b1", [
  membership("account-front-b1", "t1", "b1", "receptionist"),
]);
replaceWorkforceMemberships("t1", "account-branch-admin", [
  membership("account-branch-admin", "t1", "b1", "branch_admin"),
]);
replaceWorkforceMemberships("t2", "account-t2-admin", [
  membership("account-t2-admin", "t2", null, "org_admin"),
]);

const app = buildServer();
await app.ready();

const orgAdmin = token("account-org-admin", "t1");
const lowAssurance = token("account-aal1", "t1", "aal1");
const frontB1 = token("account-front-b1", "t1");
const branchAdmin = token("account-branch-admin", "t1");
const tenantTwoAdmin = token("account-t2-admin", "t2");

// --- build one real chain ------------------------------------------------------
// W1 workforce fixture: the W2 coverage exception references a real shift.
assert.equal(
  (
    await app.inject({
      method: "POST",
      url: "/workforce/staff-assignments",
      headers: bearer(orgAdmin),
      payload: {
        id: "sa-c4-http-1",
        accountId: "account-nurse",
        organizationId: "org-1",
        branchId: "b1",
        operationalRole: "nurse",
        effectiveFrom: "2026-01-01",
      },
    })
  ).statusCode,
  201,
);
assert.equal(
  (
    await app.inject({
      method: "POST",
      url: "/workforce/shifts",
      headers: bearer(orgAdmin),
      payload: {
        id: "shift-c4-http-1",
        staffAssignmentId: "sa-c4-http-1",
        branchId: "b1",
        startsAt: "2026-09-22T08:00:00Z",
        endsAt: "2026-09-22T16:00:00Z",
      },
    })
  ).statusCode,
  201,
);

const task = await app.inject({
  method: "POST",
  url: "/workforce/tasks",
  headers: bearer(frontB1),
  payload: {
    id: "task-c4-http-1",
    branchId: "b1",
    kind: "facility_helpdesk",
    title: "Chain reconstruction fixture task",
    correlationId: CORRELATION,
  },
});
assert.equal(task.statusCode, 201);

const proposed = await app.inject({
  method: "POST",
  url: "/workforce/approvals",
  headers: bearer(frontB1),
  payload: {
    id: "approval-c4-http-1",
    branchId: "b1",
    actionType: "workforce.coverage_override",
    parameters: {
      staffAssignmentRef: "staff-assignment-1",
      shiftRef: "shift-1",
      reasonCode: "roster_error",
    },
    correlationId: CORRELATION,
  },
});
assert.equal(proposed.statusCode, 201);
const digest = String((proposed.json() as { parametersDigest: string }).parametersDigest);

const approved = await app.inject({
  method: "POST",
  url: "/workforce/approvals/approval-c4-http-1/decision",
  headers: bearer(branchAdmin),
  payload: { outcome: "approved", reasonCode: "authorized" },
});
assert.equal(approved.statusCode, 200);

const attempted = await app.inject({
  method: "POST",
  url: "/workforce/approvals/approval-c4-http-1/executions",
  headers: bearer(branchAdmin),
  payload: { outcome: "attempted", parametersDigest: digest },
});
assert.equal(attempted.statusCode, 200);

const unknown = await app.inject({
  method: "POST",
  url: "/workforce/approvals/approval-c4-http-1/executions",
  headers: bearer(branchAdmin),
  payload: { outcome: "unknown", parametersDigest: digest },
});
assert.equal(unknown.statusCode, 200);
assert.equal((unknown.json() as { request: { status: string } }).request.status, "needs_human");

const exceptionCase = await app.inject({
  method: "POST",
  url: "/workforce/exceptions",
  headers: bearer(frontB1),
  payload: {
    id: "exception-c4-http-1",
    branchId: "b1",
    kind: "approval_outcome_unknown",
    severity: "high",
    approvalRequestId: "approval-c4-http-1",
  },
});
assert.equal(exceptionCase.statusCode, 201);
assert.equal(
  (exceptionCase.json() as { correlationId: string | null }).correlationId,
  CORRELATION,
);

// The W2 correlation gap is closed, so a coverage exception can join the same chain.
const coverage = await app.inject({
  method: "POST",
  url: "/workforce/coverage",
  headers: bearer(branchAdmin),
  payload: {
    id: "coverage-c4-http-1",
    branchId: "b1",
    shiftId: "shift-c4-http-1",
    kind: "coverage_gap",
    detail: "synthetic",
    correlationId: CORRELATION,
  },
});
assert.equal(coverage.statusCode, 201);
assert.equal((coverage.json() as { correlationId: string | null }).correlationId, CORRELATION);

// --- reconstruct it -----------------------------------------------------------
const chain = await app.inject({
  method: "GET",
  url: `/workforce/audit-chain?correlationId=${CORRELATION}&profile=approval_driven`,
  headers: bearer(orgAdmin),
});
assert.equal(chain.statusCode, 200);
const report = chain.json() as {
  reconstructable: boolean;
  missingSteps: string[];
  entries: Array<{ step: string; sourceDomain: string; recordRef: string; tenantId: string }>;
  steps: Array<{ step: string; status: string }>;
  fingerprint: string;
  gaps: string[];
  gapRegister: Array<{ code: string; status: string }>;
  summary: { presentSteps: number; sourceDomains: string[]; openGaps: number };
};
assert.equal(report.reconstructable, true, `missing: ${report.missingSteps.join(",")}`);
assert.deepEqual(report.missingSteps, []);
assert.match(report.fingerprint, /^chain_[0-9a-f]{64}$/);
const steps = new Map(report.steps.map((step) => [step.step, step.status]));
for (const step of [
  "initiator",
  "identity",
  "scope",
  "authority",
  "policy_decision",
  "human_approval",
  "typed_action",
  "canonical_outcome",
  "derived_activity",
]) {
  assert.equal(steps.get(step), "present", `step ${step} must be reconstructed`);
}
// The chain is genuinely cross-slice: each domain contributed from its own records.
for (const domain of ["workforce.tasks", "collaboration.approvals", "workforce.coverage"]) {
  assert.ok(
    report.entries.some((entry) => entry.sourceDomain === domain),
    `${domain} must contribute evidence`,
  );
}
assert.ok(report.entries.every((entry) => entry.tenantId === "t1"));
assert.ok(report.entries.some((entry) => entry.recordRef.startsWith("approval-decision:")));
// The register travels with every report so a reconstruction is never mistaken for custody.
assert.ok(report.gapRegister.some((gap) => gap.code === "NO_CRYPTOGRAPHIC_TAMPER_EVIDENCE"));
assert.ok(report.gapRegister.some((gap) => gap.status === "closed_by_c4"));
assert.equal(report.summary.openGaps, report.gapRegister.filter((gap) => gap.status === "open").length);
// The response carries no prose, no parameter value and no receipt reference.
const serialized = JSON.stringify(report);
assert.ok(!serialized.includes("roster_error"));
assert.ok(!serialized.includes("Chain reconstruction fixture task"));

const fingerprint = await app.inject({
  method: "GET",
  url: `/workforce/audit-chain/${CORRELATION}/fingerprint`,
  headers: bearer(orgAdmin),
});
assert.equal(fingerprint.statusCode, 200);
const fingerprintBody = fingerprint.json() as {
  fingerprint: string;
  recomputed: string;
  reconstructable: boolean;
};
assert.equal(fingerprintBody.fingerprint, report.fingerprint);
assert.equal(fingerprintBody.recomputed, report.fingerprint);
assert.equal(fingerprintBody.reconstructable, true);

// --- boundaries ---------------------------------------------------------------
assert.equal(
  (await app.inject({ method: "GET", url: `/workforce/audit-chain?correlationId=${CORRELATION}` }))
    .statusCode,
  401,
);
assert.equal(
  (
    await app.inject({
      method: "GET",
      url: `/workforce/audit-chain?correlationId=${CORRELATION}`,
      headers: bearer(lowAssurance),
    })
  ).statusCode,
  403,
);
// A branch-scoped operator cannot run a tenant-wide reconstruction.
assert.equal(
  (
    await app.inject({
      method: "GET",
      url: `/workforce/audit-chain?correlationId=${CORRELATION}`,
      headers: bearer(branchAdmin),
    })
  ).statusCode,
  403,
);
// A foreign tenant reconstructs nothing: the readers are tenant-scoped.
const foreign = await app.inject({
  method: "GET",
  url: `/workforce/audit-chain?correlationId=${CORRELATION}`,
  headers: bearer(tenantTwoAdmin),
});
assert.equal(foreign.statusCode, 200);
const foreignReport = foreign.json() as { reconstructable: boolean; entries: unknown[] };
assert.equal(foreignReport.reconstructable, false);
assert.deepEqual(foreignReport.entries, []);
// A malformed or unknown request is refused rather than defaulted.
assert.equal(
  (
    await app.inject({
      method: "GET",
      url: "/workforce/audit-chain?correlationId=corr-c4-http-1&profile=anything_goes",
      headers: bearer(orgAdmin),
    })
  ).statusCode,
  400,
);
assert.equal(
  (
    await app.inject({
      method: "GET",
      url: "/workforce/audit-chain?correlationId=secret%3A%2F%2Fvault%2Fchain",
      headers: bearer(orgAdmin),
    })
  ).statusCode,
  400,
);
// There is no write route: a reconstruction is a read.
assert.equal(
  (
    await app.inject({
      method: "POST",
      url: "/workforce/audit-chain",
      headers: bearer(orgAdmin),
      payload: { correlationId: CORRELATION, tenantId: "t2" },
    })
  ).statusCode,
  404,
);

await app.close();
console.log("N5/C4 audit-chain HTTP smoke passed.");
