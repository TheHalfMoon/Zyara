// M042 synthetic qualification.
import assert from "node:assert";
import { describe, it } from "node:test";
import { invokeTool, type ToolContext } from "@zyara/navigation-tools";

const CTX: ToolContext = {
  adapter: null,
  knownProviders: new Set(["clin-a"]),
  knownServices: new Set(["dental"]),
};
const NOCAP: ToolContext = {
  adapter: { adapterId: "x", certified: new Set() },
  knownProviders: new Set(["clin-a"]),
  knownServices: new Set(["dental"]),
};

describe("M042 navigation tools", () => {
  it("gates every call on the safety intent decision", () => {
    const res = invokeTool(
      { tool: "search-providers", intent: "diagnose", inputText: "help", confidence: 0.9, args: { service: "dental" } },
      CTX,
    );
    assert.equal(res.ok, false);
  });
  it("clarifies unknown services and providers instead of fabricating", () => {
    const svc = invokeTool(
      { tool: "search-providers", intent: "navigate", inputText: "find care", confidence: 0.9, args: { service: "unknown-x" } },
      CTX,
    );
    assert.equal(svc.ok, false);
    if (!svc.ok) assert.ok(svc.clarify);
    const prov = invokeTool(
      { tool: "check-availability", intent: "navigate", inputText: "slots?", confidence: 0.9, args: { provider: "dr-nobody" } },
      CTX,
    );
    assert.equal(prov.ok, false);
    if (!prov.ok) assert.ok(prov.clarify);
  });
  it("draft-booking is draft-only and needs provider plus slot", () => {
    const missing = invokeTool(
      { tool: "draft-booking", intent: "navigate", inputText: "book", confidence: 0.9, args: { provider: "clin-a" } },
      CTX,
    );
    assert.equal(missing.ok, false);
    const draft = invokeTool(
      { tool: "draft-booking", intent: "navigate", inputText: "book clin-a morning", confidence: 0.9, args: { provider: "clin-a", slot: "s1" } },
      CTX,
    );
    assert.equal(draft.ok, true);
    if (draft.ok) {
      assert.ok(draft.draftId?.startsWith("draft-"));
      assert.ok(!draft.summary.includes("booked"));
    }
  });
  it("adapter tools require certified capabilities", () => {
    const res = invokeTool(
      { tool: "check-availability", intent: "navigate", inputText: "slots?", confidence: 0.9, args: { provider: "clin-a" } },
      NOCAP,
    );
    assert.equal(res.ok, false);
  });
});
