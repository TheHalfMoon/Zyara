// Enterprise access governance and support contracts (M056).
// Branch admins are bounded to their branches. Privileged actions
// require assurance plus a distinct second approver; claimant and sales
// self-approval are refused. Application admin never confers clinical-
// data authority. Support contracts record SLOs and escalation paths.

export interface BranchAdmin {
  adminId: string;
  branchIds: string[];
}

export function branchAuthorized(
  admin: BranchAdmin,
  branchId: string,
): boolean {
  return admin.branchIds.includes(branchId);
}

export interface PrivilegedRequest {
  requestId: string;
  requesterId: string;
  action: string;
  assurance: "mfa" | "none";
  approverId: string | null;
}

export function authorizePrivileged(
  req: PrivilegedRequest,
): { authorized: boolean; reason: string } {
  if (req.assurance !== "mfa") {
    return { authorized: false, reason: "Privileged actions require MFA assurance." };
  }
  if (!req.approverId) {
    return { authorized: false, reason: "Privileged actions require a second approver." };
  }
  if (req.approverId === req.requesterId) {
    return { authorized: false, reason: "Self-approval is refused." };
  }
  return { authorized: true, reason: "Two-person rule satisfied with MFA." };
}

/** App admin is operational only; clinical-data authority needs a care role. */
export function clinicalAuthority(
  roles: readonly string[],
): boolean {
  return roles.includes("clinician") || roles.includes("care-team-lead");
}

export interface SupportContract {
  contractId: string;
  tenantId: string;
  slo: string;
  escalation: string;
  signed: boolean;
}

export function contractComplete(c: SupportContract): boolean {
  return c.signed && c.slo.length > 0 && c.escalation.length > 0;
}
