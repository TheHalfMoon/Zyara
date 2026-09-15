import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  validateForPublish, canConfigure, insuranceActiveAt, draftConfig,
} from "@zyara/services";
import type { ServiceConfig } from "@zyara/services";

function receptionistConfig(): ServiceConfig {
  return {
    serviceId: "s1", branchId: "b1",
    labels: { ar: "استشارة جلدية", en: "Dermatology consult" },
    contact: { phone: "+966500000000", address: "Olaya, Riyadh" },
    accessibility: { wheelchair: true, notes: {} },
    appointmentTypes: [
      { id: "t-init", kind: "initial", durationMin: 30, bufferBeforeMin: 5, bufferAfterMin: 10, resourceId: "room-1", intakeVersion: "v1", policyVersion: "v1" },
      { id: "t-fup", kind: "follow_up", durationMin: 15, bufferBeforeMin: 5, bufferAfterMin: 5, resourceId: "room-1", intakeVersion: "v1", policyVersion: "v1" },
    ],
    insurance: [{ insurer: "TAWUNIYA", network: "gold", serviceId: "s1", branchId: "b1", from: "2026-01-01T00:00:00.000Z", to: null }],
    intakeFields: ["contact_phone", "preferred_language"],
    integrationOwner: "reception-ops",
    authorityState: "checked",
    coordinates: { lat: 24.7136, lng: 46.6753 },
  };
}

test("synthetic receptionist configures initial + follow-up and publishes", () => {
  assert.equal(canConfigure("receptionist"), true);
  const d = validateForPublish(receptionistConfig());
  assert.equal(d.publishable, true);
  assert.deepEqual(d.blockers, []);
});

test("missing duration/resource/authority blocks publish", () => {
  const c = receptionistConfig();
  c.appointmentTypes = [{ id: "t", kind: "initial", durationMin: null, bufferBeforeMin: 0, bufferAfterMin: 0, resourceId: null, intakeVersion: null, policyVersion: null }];
  c.authorityState = "pending";
  const d = validateForPublish(c);
  assert.equal(d.publishable, false);
  for (const b of ["BLOCK_DURATION", "BLOCK_RESOURCE", "BLOCK_AUTHORITY", "BLOCK_INTAKE_VERSION", "BLOCK_POLICY_VERSION"]) {
    assert.ok(d.blockers.includes(b as never), b);
  }
});

test("expired authority blocks publish; completeness stays advisory", () => {
  const c = receptionistConfig();
  c.authorityState = "expired";
  const d = validateForPublish(c);
  assert.equal(d.publishable, false);
  assert.ok(d.blockers.includes("BLOCK_AUTHORITY"));
  assert.ok(d.completeness > 0.5);
});

test("insurance acceptance is dated per branch/network/service", () => {
  const [p] = receptionistConfig().insurance;
  assert.ok(insuranceActiveAt(p!, "2026-06-01T00:00:00.000Z"));
  assert.ok(!insuranceActiveAt(p!, "2025-06-01T00:00:00.000Z"));
  const ended = { ...p!, to: "2026-03-01T00:00:00.000Z" };
  assert.ok(!insuranceActiveAt(ended, "2026-06-01T00:00:00.000Z"));
});

test("restricted intake fields reject national IDs; partial drafts resumable", () => {
  const c = receptionistConfig();
  c.intakeFields = [...c.intakeFields, "national_id"];
  const d = validateForPublish(c);
  assert.ok(d.blockers.includes("BLOCK_INTAKE_FIELD"));
  const draft = draftConfig("s2", "b1");
  const dd = validateForPublish(draft);
  assert.equal(dd.publishable, false);
  assert.ok(dd.completeness < 0.5);
});

test("role permissions: clinician cannot configure; onboarding page labeled", () => {
  assert.equal(canConfigure("clinician"), false);
  assert.equal(canConfigure("patient"), false);
  const page = readFileSync(new URL("../../apps/web/app/[locale]/provider/onboarding/page.tsx", import.meta.url), "utf8");
  assert.ok(page.includes('aria-label="service-onboarding"'));
  assert.ok(!/defaultChecked/.test(page));
});
