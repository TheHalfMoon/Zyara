import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

// Every dataset has purpose/owner/region/retention or explicit blocker.
test("data-flow inventory complete", () => {
  const inv = read("../../docs/privacy/DATA_FLOW_INVENTORY.md");
  for (const h of ["Purpose", "Owner", "Region", "Retention", "BLOCKED"]) assert.ok(inv.includes(h));
});

// Reviewers named-or-TBD with pending status (no fabricated approval).
test("no fabricated approvals", () => {
  for (const f of [
    "../../docs/governance/ROLE_OWNERS.md",
    "../../docs/safety/CLINICAL_INTENDED_USE.md",
    "../../docs/governance/PILOT_PROVIDER_AGREEMENT.md",
  ]) {
    const t = read(f);
    assert.ok(t.includes("PENDING"), f);
    assert.ok(!/approved|signed-off/i.test(t.replace(/not approved|REQUIRED before|requires signed|unsigned/i, "")), f);
  }
});

// Gate mechanically distinguishes approved from pending; blocked today.
test("M029 gate blocked while blockers pending", () => {
  const g = read("../../docs/governance/GATE_REGISTER.md");
  const rows = g.split("\n").filter((l) => l.startsWith("- G"));
  assert.ok(rows.length >= 7);
  for (const r of rows) assert.ok(/PENDING|APPROVED/.test(r), r);
  const blocked = rows.some((r) => r.includes("PENDING"));
  assert.equal(blocked, true);
});

// Five-locale notice inventory present.
test("five-locale notice inventory", () => {
  const n = read("../../docs/privacy/CONSENT_NOTICE_DRAFTS.md");
  for (const l of ["ar", "en", "fr", "de", "es"]) assert.ok(n.includes(l));
  assert.ok(n.includes("Arabic"));
});

// Tabletop + rights workflow recorded.
test("tabletop and rights workflow", () => {
  const t = read("../../docs/safety/INCIDENT_TABLETOP_M003.md");
  assert.ok(t.includes("cross-tenant") && t.includes("emergency"));
  assert.ok(t.includes("30-day"));
});
