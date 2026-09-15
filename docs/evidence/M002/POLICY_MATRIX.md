# M002 Authorization Policy Matrix

Deny by default. Tenant from verified session claims only.

| Actor | Tenant | Branch | Action | Expect |
|---|---|---|---|---|
| clinician t1/b1 | t1 | b1 | chart.read | ALLOW |
| clinician t1/b1 | t2 | b9 | chart.read/write | DENY AUTHZ_CROSS_TENANT |
| clinician t1/b1 | t1 | b2 | chart.read | DENY AUTHZ_CROSS_BRANCH |
| revoked clinician | t1 | b1 | chart.read | DENY AUTHZ_REVOKED |
| no membership | t1 | b1 | any | DENY AUTHZ_STALE_MEMBERSHIP |
| branch_admin aal1 | t1 | b1 | admin.privileged | DENY AUTHZ_ASSURANCE_REQUIRED |
| branch_admin aal2 | t1 | b1 | admin.privileged | ALLOW |
| org_admin (no clinical role) | t1 | b1 | clinical.read | DENY AUTHZ_ADMIN_CLINICAL_SEPARATION |
| wrong role for action | t1 | b1 | restricted | DENY AUTHZ_PRIVILEGE_ESCALATION |

Revocation: SyntheticOidcProvider.revokeSession(sid) deletes session; next
verify() throws SESSION_REVOKED; authorize() with revoked membership denies.

Audit: every decision emits {at, actor, tenant, branch, action, decision, denial}.
Denial codes stable: see matrix. No tokens or bodies logged (redactToken only).
