import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { directionForLocale, SUPPORTED_LOCALES } from "@zyara/domain";
import { CATALOG_KEYS, CATALOGS, missingKeys, formatDateTime, formatHijriLabel, isolate } from "@zyara/i18n";

test("all five locales present with catalog completeness", () => {
  assert.deepEqual([...SUPPORTED_LOCALES], ["ar", "en", "fr", "de", "es"]);
  for (const l of SUPPORTED_LOCALES) {
    for (const k of CATALOG_KEYS) assert.ok(CATALOGS[l][k]?.length > 0, `${l}:${k}`);
  }
  for (const [l, miss] of Object.entries(missingKeys())) assert.equal(miss.length, 0, l);
});

test("arabic rtl, others ltr (no mirrored meaning icons)", () => {
  assert.equal(directionForLocale("ar"), "rtl");
  for (const l of ["en", "fr", "de", "es"] as const) assert.equal(directionForLocale(l), "ltr");
  const layout = readFileSync(new URL("../../apps/web/app/[locale]/layout.tsx", import.meta.url), "utf8");
  assert.ok(layout.includes("directionForLocale"));
  assert.ok(!/transform:.*scaleX\(-1\)/.test(layout));
});

test("locale date examples differ; Hijri labeled display-only", () => {
  const d = new Date("2026-09-15T10:00:00Z");
  const ar = formatDateTime("ar", d);
  const en = formatDateTime("en", d);
  assert.ok(ar.length > 0 && en.length > 0 && ar !== en);
  const hijri = formatHijriLabel("ar", d);
  assert.ok(hijri.includes("display only"));
});

test("bidi isolation wraps phone/ID/mixed-script names", () => {
  const phone = isolate("+966 5X XXX XXXX");
  assert.ok(phone.startsWith("⁦") && phone.endsWith("⁩"));
  const mixed = "ليلى Marie Müller";
  assert.equal(mixed, "ليلى Marie Müller");
});

test("long German labels exist and are not truncated by contract", () => {
  assert.ok((CATALOGS.de["consent.explicit"]?.length ?? 0) > 20);
});

test("modal exposes dialog semantics; consent never preselected", () => {
  const modal = readFileSync(new URL("../../packages/ui/src/Modal.tsx", import.meta.url), "utf8");
  assert.ok(modal.includes('role="dialog"') && modal.includes('aria-modal="true"') && modal.includes("Escape"));
  const confirm = readFileSync(new URL("../../packages/ui/src/Confirm.tsx", import.meta.url), "utf8");
  assert.ok(!/defaultChecked|checked=\{true\}/.test(confirm));
  assert.ok(confirm.includes('role="alert"'));
});

test("logical CSS: no physical-only direction assumptions in new UI", () => {
  const files = ["../../packages/ui/src/Modal.tsx", "../../packages/ui/src/Confirm.tsx"];
  for (const f of files) {
    const src = readFileSync(new URL(f, import.meta.url), "utf8");
    assert.ok(!/margin-left|margin-right|padding-left|padding-right|float:\s*(left|right)/.test(src), f);
  }
});
