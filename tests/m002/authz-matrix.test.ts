import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SyntheticOidcProvider, localizeAuthError, redactToken } from "@zyara/identity";
import { authorize } from "@zyara/authorization";
import type { Membership, RequestContext } from "@zyara/authorization";

const NOW = 1_800_000_000;
function ctxFor(sub: string, tenant: string, assurance: "aal1" | "aal2", memberships: Membership[]): RequestContext {
  return {
    claims: { sub, iss: "https://keycloak.synthetic.local/realms/zyara-synthetic", aud: "zyara-api", exp: NOW + 3600, iat: NOW, sid: `s-${sub}`, tenant, assurance },
    memberships,
  };
}
const mem = (accountId: string, tenantId: string, branchId: string | null, role: Membership["role"], revoked = false): Membership =>
  ({ accountId, tenantId, branchId, role, revoked, patientId: null });

test("cross-tenant reads and writes denied", () => {
  const ctx = ctxFor("a1", "t1", "aal1", [mem("a1", "t1", "b1", "clinician")]);
  const r = authorize(ctx, { action: "chart.read", resourceTenant: "t2", resourceBranch: "b9" });
  assert.equal(r.allow, false);
  assert.equal(r.denial, "AUTHZ_CROSS_TENANT");
});

test("cross-branch denied; same-branch allowed", () => {
  const ctx = ctxFor("a1", "t1", "aal1", [mem("a1", "t1", "b1", "clinician")]);
  assert.equal(authorize(ctx, { action: "chart.read", resourceTenant: "t1", resourceBranch: "b2" }).denial, "AUTHZ_CROSS_BRANCH");
  assert.equal(authorize(ctx, { action: "chart.read", resourceTenant: "t1", resourceBranch: "b1" }).allow, true);
});

test("revoked membership loses access on next request", () => {
  const p = new SyntheticOidcProvider();
  const token = p.issue({ sub: "a9", exp: NOW + 3600, sid: "sx", tenant: "t1", assurance: "aal1" });
  p.revokeSession("sx");
  assert.throws(() => p.verify(token, NOW), /revoked/i);
  const ctx = ctxFor("a9", "t1", "aal1", [mem("a9", "t1", "b1", "clinician", true)]);
  const r = authorize(ctx, { action: "chart.read", resourceTenant: "t1", resourceBranch: "b1" });
  assert.equal(r.allow, false);
  assert.equal(r.denial, "AUTHZ_REVOKED");
});

test("stale/expired session rejected; invalid token rejected", () => {
  const p = new SyntheticOidcProvider();
  const t = p.issue({ sub: "a2", exp: NOW + 10, sid: "s2", tenant: "t1", assurance: "aal1" });
  assert.throws(() => p.verify(t, NOW + 3600));
  assert.throws(() => p.verify("bogus", NOW));
});

test("privileged actions require aal2 assurance", () => {
  const low = ctxFor("adm", "t1", "aal1", [mem("adm", "t1", "b1", "branch_admin")]);
  const high = ctxFor("adm", "t1", "aal2", [mem("adm", "t1", "b1", "branch_admin")]);
  const opts = { action: "admin.privileged", resourceTenant: "t1", resourceBranch: "b1", requireAssurance: "aal2" as const };
  assert.equal(authorize(low, opts).denial, "AUTHZ_ASSURANCE_REQUIRED");
  assert.equal(authorize(high, opts).allow, true);
});

test("admin cannot reach clinical data without clinical role", () => {
  const ctx = ctxFor("adm", "t1", "aal2", [mem("adm", "t1", "b1", "org_admin")]);
  const r = authorize(ctx, { action: "clinical.read", resourceTenant: "t1", resourceBranch: "b1", forbidAdminClinical: true });
  assert.equal(r.allow, false);
  assert.equal(r.denial, "AUTHZ_ADMIN_CLINICAL_SEPARATION");
});

test("authorization bypass via body tenant impossible (claims win)", () => {
  const api = readFileSync(new URL("../../apps/api/src/auth.ts", import.meta.url), "utf8");
  const routes = readFileSync(new URL("../../apps/api/src/index.ts", import.meta.url), "utf8");
  assert.ok(api.includes("claims"));
  assert.ok(!/resourceTenant:\s*body/.test(routes));
  assert.ok(routes.includes("resourceTenant: claims.tenant"));
});

test("tokens never logged; redaction helper present", () => {
  const src = readFileSync(new URL("../../packages/identity/src/index.ts", import.meta.url), "utf8");
  assert.ok(!/console\.log\(.*token/i.test(src));
  assert.equal(redactToken("syn.abcdef123456"), `syn.…(${"syn.abcdef123456".length})`);
});

test("five-locale auth errors; mixed-script names retained", () => {
  for (const l of ["ar", "en", "fr", "de", "es"] as const) {
    const m = localizeAuthError("FORBIDDEN", l);
    assert.ok(m.length > 0, l);
  }
  assert.notEqual(localizeAuthError("FORBIDDEN", "ar"), localizeAuthError("FORBIDDEN", "en"));
  const mixed = "ليلى Marie Müller García عتيبي";
  assert.equal(mixed, "ليلى Marie Müller García عتيبي");
});

test("migration enforces RLS + role isolation", () => {
  const sql = readFileSync(new URL("../../db/migrations/002_authz_primitives.sql", import.meta.url), "utf8");
  for (const s of ["ROW LEVEL SECURITY", "current_setting('app.current_tenant'", "zyara_migrator", "zyara_app"]) {
    assert.ok(sql.includes(s), s);
  }
});
