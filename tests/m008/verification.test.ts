import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { VerificationQueue } from "@zyara/verification";
import type { Claim } from "@zyara/verification";

const NOW = "2026-09-15T02:00:00.000Z";
const LATER = "2026-12-01T00:00:00.000Z";

function claim(id = "c1"): Claim {
  return {
    id, tenant: "t1", branchId: "b1", claimantAccount: "acct-1",
    representativeRole: "manager", state: "pending", evidence: [],
    reviewer: null, decidedAt: null, disputeOf: null,
  };
}

const evidence = [{
  id: "e1", kind: "role_registration" as const, privateRef: "vault://synthetic/e1",
  scope: "commercial registration", observedAt: NOW, expiresAt: "2027-01-01T00:00:00.000Z",
}];

test("badge describes evidence scope in five locales", () => {
  const q = new VerificationQueue();
  q.submit(claim());
  q.attest("c1", evidence);
  q.decide("c1", "rev-1", "trust_reviewer", true, NOW);
  const badge = q.badgeFor("c1");
  assert.ok(badge);
  for (const l of ["ar", "en", "fr", "de", "es"]) {
    assert.ok(badge?.scopeByLocale[l]?.includes("commercial registration"), l);
  }
});

test("expiry disables affected supply; recheck emits projection updates", () => {
  const q = new VerificationQueue();
  q.submit(claim());
  q.attest("c1", [{ ...evidence[0]!, expiresAt: "2026-10-01T00:00:00.000Z" }]);
  q.decide("c1", "rev-1", "trust_reviewer", true, NOW);
  assert.equal(q.supplyBlocked("b1"), false);
  const expired = q.recheck(LATER);
  assert.deepEqual(expired, ["c1"]);
  assert.equal(q.supplyBlocked("b1"), true);
  assert.equal(q.badgeFor("c1"), null);
});

test("reviewer role enforced; no self-approval; sales cannot override", () => {
  const q = new VerificationQueue();
  q.submit(claim());
  q.attest("c1", evidence);
  assert.throws(() => q.decide("c1", "sales-1", "sales", true, NOW), /REVIEWER_ROLE/);
  assert.throws(() => q.decide("c1", "acct-1", "trust_reviewer", true, NOW), /NO_SELF_APPROVAL/);
  const src = readFileSync(new URL("../../packages/verification/src/index.ts", import.meta.url), "utf8");
  assert.ok(src.includes("trust_reviewer"));
  assert.ok(!/"sales"/.test(src));
});

test("competing claim dispute never hands control to unverified actor", () => {
  const q = new VerificationQueue();
  q.submit(claim());
  q.attest("c1", evidence);
  q.decide("c1", "rev-1", "trust_reviewer", true, NOW);
  const counter = q.dispute("c1", "attacker", NOW);
  assert.equal(counter.state, "disputed");
  // Original holder keeps no badge while disputed; disputant gets none either.
  assert.equal(q.badgeFor("c1"), null);
  assert.equal(q.badgeFor(counter.id), null);
  assert.equal(q.supplyBlocked("b1"), true);
});

test("public projection redacts private evidence refs", () => {
  const q = new VerificationQueue();
  q.submit(claim());
  q.attest("c1", evidence);
  q.decide("c1", "rev-1", "trust_reviewer", true, NOW);
  const proj = JSON.stringify(q.publicProjection("c1"));
  assert.ok(!proj.includes("vault://"));
  assert.ok(proj.includes("commercial registration"));
});

test("API claim routes are tenant-scoped; provider page is labeled", () => {
  const api = readFileSync(new URL("../../apps/api/src/verify.ts", import.meta.url), "utf8");
  assert.ok(api.includes("claims.tenant") && api.includes("publicProjection"));
  assert.ok(!api.includes("body.tenant"));
  const page = readFileSync(new URL("../../apps/web/app/[locale]/provider/verify/page.tsx", import.meta.url), "utf8");
  assert.ok(page.includes('aria-label="verification-status"') && page.includes("aria-required"));
});
