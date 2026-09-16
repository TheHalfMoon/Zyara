// M056 synthetic qualification.
import assert from "node:assert";
import { describe, it } from "node:test";
import {
  authorizePrivileged,
  branchAuthorized,
  clinicalAuthority,
  contractComplete,
} from "@zyara/enterprise-access";

describe("M056 enterprise governance", () => {
  it("bounds branch admins to their branches", () => {
    const admin = { adminId: "a1", branchIds: ["b1"] };
    assert.equal(branchAuthorized(admin, "b1"), true);
    assert.equal(branchAuthorized(admin, "b2"), false);
  });
  it("refuses self-approval and missing assurance/approver", () => {
    assert.equal(authorizePrivileged(
      { requestId: "r", requesterId: "u", action: "x", assurance: "none", approverId: "v" }).authorized, false);
    assert.equal(authorizePrivileged(
      { requestId: "r", requesterId: "u", action: "x", assurance: "mfa", approverId: null }).authorized, false);
    assert.equal(authorizePrivileged(
      { requestId: "r", requesterId: "u", action: "x", assurance: "mfa", approverId: "u" }).authorized, false);
    assert.equal(authorizePrivileged(
      { requestId: "r", requesterId: "u", action: "x", assurance: "mfa", approverId: "v" }).authorized, true);
  });
  it("separates app admin from clinical authority", () => {
    assert.equal(clinicalAuthority(["app-admin"]), false);
    assert.equal(clinicalAuthority(["app-admin", "clinician"]), true);
  });
  it("requires complete signed support contracts", () => {
    assert.equal(contractComplete({ contractId: "c", tenantId: "t", slo: "99.5%", escalation: "on-call", signed: true }), true);
    assert.equal(contractComplete({ contractId: "c", tenantId: "t", slo: "", escalation: "on-call", signed: true }), false);
    assert.equal(contractComplete({ contractId: "c", tenantId: "t", slo: "99.5%", escalation: "on-call", signed: false }), false);
  });
});
