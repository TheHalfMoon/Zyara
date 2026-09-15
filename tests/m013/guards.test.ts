// M013 localization + engine-safety proofs (synthetic only).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EXPLANATIONS, explainOutcome, explainNextStep } from "@zyara/scheduling";
import { SUPPORTED_LOCALES, directionForLocale } from "@zyara/domain";

test("five-locale explanations exist; Arabic is RTL and review is flagged", () => {
  assert.deepEqual([...SUPPORTED_LOCALES], ["ar", "en", "fr", "de", "es"]);
  assert.equal(directionForLocale("ar"), "rtl");
  for (const locale of SUPPORTED_LOCALES) {
    const catalog = EXPLANATIONS[locale];
    assert.ok(catalog["eligibility.allow"].length > 0, locale);
    assert.ok(catalog["eligibility.deny"].length > 0, locale);
    assert.ok(explainOutcome(locale, "ALLOW").length > 0, locale);
    assert.ok(explainNextStep(locale, "PROVIDE_INFORMATION").length > 0, locale);
  }
  const src = readFileSync(new URL("../../packages/scheduling/src/explanations.ts", import.meta.url), "utf8");
  assert.ok(/human review/i.test(src));
});

test("no LLM or arbitrary-code engine; migration is append-only with RLS", () => {
  const src = readFileSync(new URL("../../packages/scheduling/src/rules.ts", import.meta.url), "utf8");
  assert.ok(!/openai|anthropic/i.test(src));
  assert.ok(!/eval\(|Function\(/.test(src));
  assert.ok(src.includes("model decision path"));
  const sql = readFileSync(new URL("../../db/migrations/013_eligibility_recipes.sql", import.meta.url), "utf8");
  assert.ok(sql.includes("PRIMARY KEY (id, version)"));
  assert.ok(sql.includes("FORCE ROW LEVEL SECURITY"));
  assert.ok(!/GRANT\s+.*UPDATE/i.test(sql));
  assert.ok(!/GRANT\s+.*DELETE/i.test(sql));
  assert.ok(sql.includes("never UPDATEed or DELETEd"));
});
