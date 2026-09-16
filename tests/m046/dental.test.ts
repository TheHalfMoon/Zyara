// M046 synthetic qualification.
import assert from "node:assert";
import { describe, it } from "node:test";
import {
  DENTAL_RECIPES,
  holdAllResources,
  recallTemplateFor,
  scopeAllowed,
} from "@zyara/specialty-dental";

describe("M046 dental services", () => {
  it("every service has a complete multi-resource recipe", () => {
    for (const [svc, recipe] of Object.entries(DENTAL_RECIPES)) {
      assert.ok(recipe.length >= 2, svc);
      assert.ok(recipe.some((r) => r.kind === "chair"), svc);
      assert.ok(recipe.some((r) => r.kind === "clinician"), svc);
    }
  });
  it("holds all recipe resources atomically", () => {
    const full = new Set([
      "chair:dental-chair", "clinician:dentist",
      "assistant:dental-assistant", "equipment:restorative-kit",
    ]);
    const ok = holdAllResources("filling", full);
    assert.equal(ok.ok, true);
    assert.equal(ok.rolledBack, false);
    const partial = holdAllResources("filling", new Set(["chair:dental-chair"]));
    assert.equal(partial.ok, false);
    assert.equal(partial.rolledBack, true);
    assert.ok(partial.holds.every((h) => h.held === false));
  });
  it("enforces clinician scope qualifications", () => {
    assert.equal(scopeAllowed("cleaning", "hygienist"), true);
    assert.equal(scopeAllowed("filling", "hygienist"), false);
    assert.equal(scopeAllowed("root-canal", "dentist"), false);
    assert.equal(scopeAllowed("root-canal", "dentist-endodontist"), true);
  });
  it("links preventive services to dental-preventive recall", () => {
    assert.equal(recallTemplateFor("checkup"), "dental-preventive");
    assert.equal(recallTemplateFor("cleaning"), "dental-preventive");
    assert.equal(recallTemplateFor("extraction"), "follow-up");
  });
});
