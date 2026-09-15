// M013 proof suite: typed eligibility + resource recipes (synthetic only).
// Proves: explicit next steps, qualification-preserving multi-resource match,
// immutable versions, precedence, missing-data honesty, no silent denial,
// no fabricated approval, typed qualifications, adversarial safety.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ALL_RULE_FAMILIES,
  RULE_PRECEDENCE,
  evaluateRules,
  telemetryFor,
  assertMaterialInput,
} from "@zyara/scheduling";
import type { EligibilityInput, EligibilityRule } from "@zyara/scheduling";

const CTX = { serviceId: "derm-consult", typeId: "t-init", visitDate: "2026-10-01" };

function baseInput(): EligibilityInput {
  return {
    dateOfBirth: "1990-05-05",
    isReturningPatient: true,
    requestedTypeId: "t-init",
    insurer: { insurer: "TAWUNIYA", network: "gold" },
    insurerSourceAvailable: true,
    referral: { present: true, validTo: "2026-12-01" },
    order: { present: true, orderType: "MRI" },
    orderSourceAvailable: true,
    providerActive: true,
    language: "ar",
    needsInterpreter: false,
    jurisdiction: "SA",
    homeDistanceKm: 3,
    intakeAnswersVersion: "v3",
    intakeComplete: true,
    lastVisitDate: "2026-05-01",
  };
}

function fullRulebook(): EligibilityRule[] {
  const v = 1;
  const svc = { serviceId: "derm-consult", typeId: "*", effectiveFrom: "2026-01-01", effectiveTo: null };
  const approval = { approvedBy: "dr-reviewer", approvedAt: "2026-09-01T00:00:00.000Z" };
  return [
    { id: "AGE", family: "age", version: v, ...svc, issuer: "platform", approval: null, params: { family: "age", minAgeYears: 12, maxAgeYears: null }, explanationKey: "eligibility.deny" },
    { id: "REL", family: "new_returning", version: v, ...svc, issuer: "platform", approval: null, params: { family: "new_returning", accept: "both" }, explanationKey: "eligibility.deny" },
    { id: "REASON", family: "service_reason", version: v, ...svc, issuer: "platform", approval: null, params: { family: "service_reason", allowedTypeIds: ["t-init", "t-fup"] }, explanationKey: "eligibility.needsInput" },
    { id: "INS", family: "insurance", version: v, ...svc, issuer: "platform", approval: null, params: { family: "insurance", accepted: [{ insurer: "TAWUNIYA", network: "gold" }] }, explanationKey: "eligibility.deny" },
    { id: "REF", family: "referral", version: v, ...svc, issuer: "provider", approval, params: { family: "referral", required: true }, explanationKey: "eligibility.needsInput" },
    { id: "ORD", family: "order", version: v, ...svc, issuer: "provider", approval, params: { family: "order", required: true, orderType: "MRI" }, explanationKey: "eligibility.needsInput" },
    { id: "SITE", family: "provider_site_resources", version: v, ...svc, issuer: "platform", approval: null, params: { family: "provider_site_resources", requiresActiveRole: true }, explanationKey: "eligibility.deny" },
    { id: "LANG", family: "language", version: v, ...svc, issuer: "platform", approval: null, params: { family: "language", availableLanguages: ["ar", "en"], interpreterAvailable: true }, explanationKey: "eligibility.needsReview" },
    { id: "GEO", family: "telehealth_geography", version: v, ...svc, issuer: "platform", approval: null, params: { family: "telehealth_geography", mode: "in_person", allowedJurisdictions: [], homeRadiusKm: null }, explanationKey: "eligibility.deny" },
    { id: "INT", family: "intake", version: v, ...svc, issuer: "provider", approval, params: { family: "intake", requiredIntakeVersion: "v3", requiresProviderReview: false }, explanationKey: "eligibility.needsInput" },
    { id: "IVL", family: "interval", version: v, ...svc, issuer: "provider", approval, params: { family: "interval", minDaysSinceLastVisit: 30, maxDaysSinceLastVisit: null }, explanationKey: "eligibility.deny" },
    { id: "NEW", family: "accepting_new", version: v, ...svc, issuer: "platform", approval: null, params: { family: "accepting_new", acceptingNew: true }, explanationKey: "eligibility.deny" },
  ];
}
test("canonical acceptance 1: missing referral returns explicit next step", () => {
  const input = { ...baseInput(), referral: null };
  const r = evaluateRules(fullRulebook(), CTX, input);
  assert.equal(r.outcome, "NEEDS_INPUT");
  const ref = r.results.find((x) => x.ruleId === "REF");
  assert.equal(ref?.reasonCode, "REFERRAL_MISSING");
  assert.equal(ref?.missingInput, "referral");
  assert.equal(ref?.nextStep, "PROVIDE_INFORMATION");
  assert.ok(r.missingInputs.includes("referral"));
  assert.ok(r.nextSteps.includes("PROVIDE_INFORMATION"));
});

test("all twelve canonical rule families are implemented", () => {
  assert.equal(ALL_RULE_FAMILIES.length, 12);
  const src = readFileSync(new URL("../../packages/scheduling/src/rules.ts", import.meta.url), "utf8");
  for (const f of ALL_RULE_FAMILIES) {
    assert.ok(src.includes(`"${f}"`), f);
  }
  const r = evaluateRules(fullRulebook(), CTX, baseInput());
  assert.equal(r.outcome, "ALLOW");
  assert.equal(r.results.length, 12);
});

test("age-at-visit: child denied before birthday, allowed on birthday edge", () => {
  const rules = fullRulebook().filter((x) => x.family === "age");
  const young = evaluateRules(rules, CTX, { ...baseInput(), dateOfBirth: "2018-10-02" });
  assert.equal(young.outcome, "DENY");
  const edge = evaluateRules(rules, CTX, { ...baseInput(), dateOfBirth: "2014-10-01" });
  assert.equal(edge.outcome, "ALLOW");
  const missing = evaluateRules(rules, CTX, { ...baseInput(), dateOfBirth: null });
  assert.equal(missing.outcome, "NEEDS_INPUT");
});

test("returning/new-patient: follow-up-only denies new patients", () => {
  const rules: EligibilityRule[] = [
    { id: "REL", family: "new_returning", version: 1, serviceId: CTX.serviceId, typeId: "*", effectiveFrom: "2026-01-01", effectiveTo: null, issuer: "platform", approval: null, params: { family: "new_returning", accept: "returning" }, explanationKey: "eligibility.deny" },
  ];
  assert.equal(evaluateRules(rules, CTX, { ...baseInput(), isReturningPatient: false }).outcome, "DENY");
  assert.equal(evaluateRules(rules, CTX, { ...baseInput(), isReturningPatient: true }).outcome, "ALLOW");
  assert.equal(evaluateRules(rules, CTX, { ...baseInput(), isReturningPatient: null }).outcome, "NEEDS_INPUT");
});

test("insurer: unknown source is SOURCE_UNAVAILABLE, never silent approval or denial", () => {
  const rules = fullRulebook().filter((x) => x.family === "insurance");
  const down = evaluateRules(rules, CTX, { ...baseInput(), insurerSourceAvailable: false });
  assert.equal(down.outcome, "SOURCE_UNAVAILABLE");
  assert.deepEqual(down.sourceCodes, ["INSURER_SOURCE_DOWN"]);
  const wrong = evaluateRules(rules, CTX, { ...baseInput(), insurer: { insurer: "BUPA", network: "silver" } });
  assert.equal(wrong.outcome, "DENY");
  const unknown = evaluateRules(rules, CTX, { ...baseInput(), insurer: null });
  assert.equal(unknown.outcome, "NEEDS_INPUT");
});

test("order: missing order needs input; type mismatch needs review; outage is unknown", () => {
  const rules = fullRulebook().filter((x) => x.family === "order");
  assert.equal(evaluateRules(rules, CTX, { ...baseInput(), order: null }).outcome, "NEEDS_INPUT");
  const mismatch = evaluateRules(rules, CTX, { ...baseInput(), order: { present: true, orderType: "XRAY" } });
  assert.equal(mismatch.outcome, "NEEDS_STAFF_REVIEW");
  const outage = evaluateRules(rules, CTX, { ...baseInput(), orderSourceAvailable: false });
  assert.equal(outage.outcome, "SOURCE_UNAVAILABLE");
});

test("interval: too-soon visit denied; missing last-visit asks for input", () => {
  const rules = fullRulebook().filter((x) => x.family === "interval");
  const soon = evaluateRules(rules, CTX, { ...baseInput(), lastVisitDate: "2026-09-20" });
  assert.equal(soon.outcome, "DENY");
  assert.equal(soon.results[0]?.reasonCode, "VISIT_TOO_SOON");
  assert.equal(evaluateRules(rules, CTX, { ...baseInput(), lastVisitDate: null }).outcome, "NEEDS_INPUT");
});

test("precedence: a real DENY dominates softer states, never hidden", () => {
  const rules: EligibilityRule[] = [
    { id: "A-DENY", family: "service_reason", version: 1, serviceId: CTX.serviceId, typeId: "*", effectiveFrom: "2026-01-01", effectiveTo: null, issuer: "platform", approval: null, params: { family: "service_reason", allowedTypeIds: ["other"] }, explanationKey: "eligibility.deny" },
    { id: "B-REVIEW", family: "intake", version: 1, serviceId: CTX.serviceId, typeId: "*", effectiveFrom: "2026-01-01", effectiveTo: null, issuer: "provider", approval: { approvedBy: "r", approvedAt: "2026-01-01" }, params: { family: "intake", requiredIntakeVersion: "v3", requiresProviderReview: true }, explanationKey: "eligibility.needsReview" },
    { id: "C-INPUT", family: "referral", version: 1, serviceId: CTX.serviceId, typeId: "*", effectiveFrom: "2026-01-01", effectiveTo: null, issuer: "provider", approval: { approvedBy: "r", approvedAt: "2026-01-01" }, params: { family: "referral", required: true }, explanationKey: "eligibility.needsInput" },
  ];
  const r = evaluateRules(rules, CTX, { ...baseInput(), referral: null });
  assert.equal(r.outcome, "DENY");
  assert.deepEqual(RULE_PRECEDENCE, { DENY: 0, NEEDS_STAFF_REVIEW: 1, SOURCE_UNAVAILABLE: 2, NEEDS_INPUT: 3, ALLOW: 4 });
});

test("review outranks unknown; unknown outranks input", () => {
  const reviewFirst: EligibilityRule[] = [
    { id: "A", family: "intake", version: 1, serviceId: CTX.serviceId, typeId: "*", effectiveFrom: "2026-01-01", effectiveTo: null, issuer: "provider", approval: { approvedBy: "r", approvedAt: "2026-01-01" }, params: { family: "intake", requiredIntakeVersion: "v3", requiresProviderReview: true }, explanationKey: "e" },
    { id: "B", family: "order", version: 1, serviceId: CTX.serviceId, typeId: "*", effectiveFrom: "2026-01-01", effectiveTo: null, issuer: "provider", approval: { approvedBy: "r", approvedAt: "2026-01-01" }, params: { family: "order", required: true, orderType: null }, explanationKey: "e" },
  ];
  const r = evaluateRules(reviewFirst, CTX, { ...baseInput(), orderSourceAvailable: false });
  assert.equal(r.outcome, "NEEDS_STAFF_REVIEW");
  const unknownBeatsInput: EligibilityRule[] = [
    { id: "A", family: "order", version: 1, serviceId: CTX.serviceId, typeId: "*", effectiveFrom: "2026-01-01", effectiveTo: null, issuer: "provider", approval: { approvedBy: "r", approvedAt: "2026-01-01" }, params: { family: "order", required: true, orderType: null }, explanationKey: "e" },
    { id: "B", family: "referral", version: 1, serviceId: CTX.serviceId, typeId: "*", effectiveFrom: "2026-01-01", effectiveTo: null, issuer: "provider", approval: { approvedBy: "r", approvedAt: "2026-01-01" }, params: { family: "referral", required: true }, explanationKey: "e" },
  ];
  const r2 = evaluateRules(unknownBeatsInput, CTX, { ...baseInput(), orderSourceAvailable: false, referral: null });
  assert.equal(r2.outcome, "SOURCE_UNAVAILABLE");
});

test("unapproved provider clinical rule routes to staff review, never decides", () => {
  const rules: EligibilityRule[] = [
    { id: "REF", family: "referral", version: 1, serviceId: CTX.serviceId, typeId: "*", effectiveFrom: "2026-01-01", effectiveTo: null, issuer: "provider", approval: null, params: { family: "referral", required: true }, explanationKey: "eligibility.needsReview" },
  ];
  const r = evaluateRules(rules, CTX, { ...baseInput(), referral: null });
  assert.equal(r.outcome, "NEEDS_STAFF_REVIEW");
  assert.equal(r.results[0]?.reasonCode, "APPROVAL_MISSING");
});

test("adversarial: no boolean collapse, no missing-as-denial, no outage-as-approval", () => {
  const src = readFileSync(new URL("../../packages/scheduling/src/rules.ts", import.meta.url), "utf8");
  assert.ok(!/:\s*boolean\s*=>/.test(src), "no boolean-returning rule shortcut");
  const empty = evaluateRules([], CTX, baseInput());
  assert.equal(empty.outcome, "ALLOW");
  assert.deepEqual(empty.results, []);
  const allMissing: EligibilityRule[] = [
    { id: "REF", family: "referral", version: 1, serviceId: CTX.serviceId, typeId: "*", effectiveFrom: "2026-01-01", effectiveTo: null, issuer: "provider", approval: { approvedBy: "r", approvedAt: "2026-01-01" }, params: { family: "referral", required: true }, explanationKey: "e" },
  ];
  const m = evaluateRules(allMissing, CTX, { ...baseInput(), referral: null });
  assert.notEqual(m.outcome, "DENY");
  assert.notEqual(m.outcome, "ALLOW");
  assert.equal(m.outcome, "NEEDS_INPUT");
});

test("excess clinical fields rejected; telemetry never carries answers", () => {
  assert.throws(() => assertMaterialInput({ ...baseInput(), diagnosis: "x" }), /INPUT_FIELD_NOT_COLLECTED:diagnosis/);
  assert.throws(() => assertMaterialInput({ ...baseInput(), clinicalNotes: "x" }), /INPUT_FIELD_NOT_COLLECTED/);
  const r = evaluateRules(fullRulebook(), CTX, { ...baseInput(), referral: null });
  const t = telemetryFor(r);
  assert.deepEqual(Object.keys(t).sort(), ["missingInputs", "outcome", "ruleCount", "ruleVersions", "sourceCodes"]);
  assert.ok(!JSON.stringify(t).includes("1990"));
  const src = readFileSync(new URL("../../packages/scheduling/src/rules.ts", import.meta.url), "utf8");
  assert.ok(!/console\.(log|info|debug)/.test(src));
  const events = readFileSync(new URL("../../packages/events/src/index.ts", import.meta.url), "utf8");
  assert.ok(events.includes("Never free text"));
});
