// Zyara authorization primitives (M002). Deny by default.
// Tenant authority derives ONLY from verified server-side session claims,
// never from request-body data.

import type { MinimalClaims } from "@zyara/identity";
import { authError } from "@zyara/identity";
import type { Locale } from "@zyara/identity";

export type BranchRole =
  | "org_admin"
  | "branch_admin"
  | "clinician"
  | "receptionist"
  | "patient";

export interface Membership {
  accountId: string;
  tenantId: string;
  branchId: string | null;
  role: BranchRole;
  revoked: boolean;
  // Healthcare identity is separate from login identity: a login account
  // links to at most one patient identity per tenant via explicit grant.
  patientId: string | null;
}

export type DenialCode =
  | "AUTHZ_CROSS_TENANT"
  | "AUTHZ_CROSS_BRANCH"
  | "AUTHZ_REVOKED"
  | "AUTHZ_STALE_MEMBERSHIP"
  | "AUTHZ_PRIVILEGE_ESCALATION"
  | "AUTHZ_ADMIN_CLINICAL_SEPARATION"
  | "AUTHZ_ASSURANCE_REQUIRED";

export interface AuthzDecision {
  allow: boolean;
  denial?: DenialCode;
  audit: AuditEvent;
}

export interface AuditEvent {
  at: string;
  actor: string;
  tenant: string;
  branch: string | null;
  action: string;
  decision: "allow" | "deny";
  denial?: DenialCode;
}

export interface RequestContext {
  claims: MinimalClaims;
  memberships: Membership[];
  nowIso?: string;
}

const PRIVILEGED_ROLES: BranchRole[] = ["org_admin", "branch_admin", "clinician"];

function audit(
  ctx: RequestContext,
  action: string,
  decision: "allow" | "deny",
  denial?: DenialCode,
): AuditEvent {
  return {
    at: ctx.nowIso ?? new Date().toISOString(),
    actor: ctx.claims.sub,
    tenant: ctx.claims.tenant,
    branch: null,
    action,
    decision,
    denial,
  };
}

// Core guard: authorize an action against server-side memberships.
// resourceTenant/resourceBranch come from the server route target, never
// from client-supplied authority.
export function authorize(
  ctx: RequestContext,
  opts: {
    action: string;
    resourceTenant: string;
    resourceBranch?: string | null;
    requireAssurance?: "aal1" | "aal2";
    allowRoles?: BranchRole[];
    forbidAdminClinical?: boolean;
  },
): AuthzDecision {
  const tenantMemberships = ctx.memberships.filter(
    (m) => m.tenantId === ctx.claims.tenant,
  );
  if (opts.resourceTenant !== ctx.claims.tenant) {
    return { allow: false, denial: "AUTHZ_CROSS_TENANT", audit: audit(ctx, opts.action, "deny", "AUTHZ_CROSS_TENANT") };
  }
  const active = tenantMemberships.filter((m) => !m.revoked);
  if (active.length === 0) {
    const anyRevoked = tenantMemberships.some((m) => m.revoked);
    const denial = anyRevoked ? "AUTHZ_REVOKED" : "AUTHZ_STALE_MEMBERSHIP";
    return { allow: false, denial, audit: audit(ctx, opts.action, "deny", denial) };
  }
  if (opts.requireAssurance === "aal2" && ctx.claims.assurance !== "aal2") {
    return { allow: false, denial: "AUTHZ_ASSURANCE_REQUIRED", audit: audit(ctx, opts.action, "deny", "AUTHZ_ASSURANCE_REQUIRED") };
  }
  const allowedRoles = opts.allowRoles ?? PRIVILEGED_ROLES.concat(["receptionist", "patient"]);
  const matching = active.filter((m) => allowedRoles.includes(m.role));
  if (matching.length === 0) {
    return { allow: false, denial: "AUTHZ_PRIVILEGE_ESCALATION", audit: audit(ctx, opts.action, "deny", "AUTHZ_PRIVILEGE_ESCALATION") };
  }
  if (opts.resourceBranch) {
    const branchScoped = matching.filter(
      (m) => m.role === "org_admin" || m.branchId === opts.resourceBranch,
    );
    if (branchScoped.length === 0) {
      return { allow: false, denial: "AUTHZ_CROSS_BRANCH", audit: audit(ctx, opts.action, "deny", "AUTHZ_CROSS_BRANCH") };
    }
    // Admin/clinical separation: pure admins cannot access clinical actions.
    if (opts.forbidAdminClinical) {
      const clinical = branchScoped.filter((m) => m.role === "clinician");
      if (clinical.length === 0 && branchScoped.some((m) => m.role === "org_admin" || m.role === "branch_admin")) {
        return { allow: false, denial: "AUTHZ_ADMIN_CLINICAL_SEPARATION", audit: audit(ctx, opts.action, "deny", "AUTHZ_ADMIN_CLINICAL_SEPARATION") };
      }
    }
    const ev = audit(ctx, opts.action, "allow");
    ev.branch = opts.resourceBranch;
    return { allow: true, audit: ev };
  }
  return { allow: true, audit: audit(ctx, opts.action, "allow") };
}

export function requireAllow(decision: AuthzDecision, locale: Locale): void {
  if (!decision.allow) throw authError("FORBIDDEN", locale);
}
