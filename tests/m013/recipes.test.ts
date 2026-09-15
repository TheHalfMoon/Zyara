// M013 resource recipe + immutability proofs (synthetic only).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { RecipeRegistry, matchRecipe } from "@zyara/scheduling";
import type { ResourceRecipe, ResourceUnit } from "@zyara/scheduling";
import { RuleRegistry, evaluateRules } from "@zyara/scheduling";

function dentalRecipe(): Omit<ResourceRecipe, "version"> {
  return {
    id: "dental-cleaning",
    serviceId: "dental",
    typeId: "t-clean",
    durationMin: 40,
    items: [
      { slot: "clinician", kindsAllowed: ["dentist", "hygienist"], requiredQualifications: ["DENTAL_CLEANING"], quantity: 1, substitutable: true, durationMin: 40 },
      { slot: "chair", kindsAllowed: ["chair"], requiredQualifications: ["DENTAL_CHAIR"], quantity: 1, substitutable: false, durationMin: 40 },
      { slot: "assistant", kindsAllowed: ["assistant"], requiredQualifications: ["CHAIR_ASSIST"], quantity: 1, substitutable: true, durationMin: 40 },
    ],
  };
}

function dentalUnits(): ResourceUnit[] {
  return [
    { id: "dentist-1", kind: "dentist", qualifications: ["DENTAL_CLEANING", "FILLING"], capacity: 1, active: true },
    { id: "chair-1", kind: "chair", qualifications: ["DENTAL_CHAIR"], capacity: 1, active: true },
    { id: "assist-1", kind: "assistant", qualifications: ["CHAIR_ASSIST"], capacity: 1, active: true },
  ];
}

test("canonical acceptance 2: multi-resource recipe preserves qualifications", () => {
  const reg = new RecipeRegistry();
  const recipe = reg.publish(dentalRecipe());
  const m = matchRecipe(recipe, dentalUnits());
  assert.equal(m.code, "MATCH_OK");
  assert.equal(m.assignments.length, 3);
  const clinician = m.assignments.find((a) => a.slot === "clinician");
  assert.ok(clinician?.qualifications[0]?.includes("DENTAL_CLEANING"));
});

test("unqualified substitution rejected even when slot is substitutable", () => {
  const reg = new RecipeRegistry();
  const recipe = reg.publish(dentalRecipe());
  const units: ResourceUnit[] = [
    { id: "dentist-9", kind: "dentist", qualifications: ["FILLING"], capacity: 1, active: true },
    { id: "chair-1", kind: "chair", qualifications: ["DENTAL_CHAIR"], capacity: 1, active: true },
    { id: "assist-1", kind: "assistant", qualifications: ["CHAIR_ASSIST"], capacity: 1, active: true },
  ];
  const m = matchRecipe(recipe, units);
  assert.equal(m.code, "UNQUALIFIED_SUBSTITUTION");
  assert.deepEqual(m.assignments, []);
});

test("wrong-kind candidate rejected; qualifications stay typed codes", () => {
  const reg = new RecipeRegistry();
  const recipe = reg.publish(dentalRecipe());
  const units: ResourceUnit[] = [
    { id: "room-1", kind: "room", qualifications: ["DENTAL_CLEANING"], capacity: 1, active: true },
    { id: "chair-1", kind: "chair", qualifications: ["DENTAL_CHAIR"], capacity: 1, active: true },
    { id: "assist-1", kind: "assistant", qualifications: ["CHAIR_ASSIST"], capacity: 1, active: true },
  ];
  assert.equal(matchRecipe(recipe, units).code, "KIND_NOT_ALLOWED");
  const src = readFileSync(new URL("../../packages/scheduling/src/resources.ts", import.meta.url), "utf8");
  assert.ok(src.includes("Never free text"));
});

test("duration mismatch and inactive units rejected explicitly", () => {
  const reg = new RecipeRegistry();
  const recipe = reg.publish(dentalRecipe());
  const bad: ResourceRecipe = { ...recipe, durationMin: 60 };
  assert.equal(matchRecipe(bad, dentalUnits()).code, "DURATION_MISMATCH");
  const inactive = dentalUnits().map((u) => (u.id === "chair-1" ? { ...u, active: false } : u));
  assert.equal(matchRecipe(recipe, inactive).code, "UNIT_INACTIVE");
  const missingChair = dentalUnits().filter((u) => u.id !== "chair-1");
  assert.equal(matchRecipe(recipe, missingChair).code, "INSUFFICIENT_CAPACITY");
});

test("canonical acceptance 3: rule and recipe changes produce new immutable versions", () => {
  const rules = new RuleRegistry();
  const base = { id: "REF", family: "referral" as const, serviceId: "s", typeId: "*", effectiveFrom: "2026-01-01", effectiveTo: null, issuer: "provider" as const, approval: { approvedBy: "r", approvedAt: "2026-01-01" }, params: { family: "referral" as const, required: true }, explanationKey: "e" };
  const v1 = rules.publish(base);
  const v2 = rules.publish(base);
  assert.equal(v1.version, 1);
  assert.equal(v2.version, 2);
  assert.ok(Object.isFrozen(v1));
  assert.notEqual(v1, v2);
  const recipes = new RecipeRegistry();
  const r1 = recipes.publish(dentalRecipe());
  const longer: Omit<typeof r1, "version"> = {
    ...dentalRecipe(),
    durationMin: 60,
    items: dentalRecipe().items.map((i) => ({ ...i, durationMin: 60 })),
  };
  const r2 = recipes.publish(longer);
  assert.equal(r1.version, 1);
  assert.equal(r2.version, 2);
  assert.equal(r1.durationMin, 40);
  assert.equal(r2.durationMin, 60);
  assert.ok(Object.isFrozen(r1));
  const old = evaluateRules(
    [{ ...base, version: 1 }],
    { serviceId: "s", typeId: "t", visitDate: "2026-10-01" },
    { dateOfBirth: null, isReturningPatient: null, requestedTypeId: null, insurer: null, insurerSourceAvailable: true, referral: null, order: null, orderSourceAvailable: true, providerActive: null, language: null, needsInterpreter: false, jurisdiction: null, homeDistanceKm: null, intakeAnswersVersion: null, intakeComplete: null, lastVisitDate: null },
  );
  assert.equal(old.outcome, "NEEDS_INPUT");
});
