// Text navigation to typed provider and scheduling tools (M042).
// Every call passes the M041 intent gate first. Tools are typed and
// draft-only: draft-booking assembles a candidate but never commits —
// commitment is M043 confirmation + M016/M037 authority. Unknown entities
// return clarification requests, never fabricated ids. Adapter-backed
// tools require the certified capability.

import {
  decideIntent,
  type Intent,
} from "@zyara/navigation-safety";
import {
  requireCapability,
  type CertifiedAdapter,
} from "@zyara/adapter-harness";

export type ToolName =
  | "search-providers"
  | "check-availability"
  | "draft-booking";

export interface ToolCall {
  tool: ToolName;
  intent: Intent;
  inputText: string;
  confidence: number;
  args: Record<string, string>;
}

export type ToolResult =
  | { ok: true; tool: ToolName; summary: string; draftId: string | null }
  | { ok: false; error: string; clarify: string | null };

export interface ToolContext {
  adapter: CertifiedAdapter | null;
  knownProviders: ReadonlySet<string>;
  knownServices: ReadonlySet<string>;
}

export function invokeTool(call: ToolCall, ctx: ToolContext): ToolResult {
  const gate = decideIntent(call.intent, call.inputText, call.confidence);
  if (!gate.allowed) {
    return { ok: false, error: `Intent refused: ${gate.reason}`, clarify: null };
  }
  switch (call.tool) {
    case "search-providers": {
      const service = call.args["service"];
      if (!service || !ctx.knownServices.has(service)) {
        return {
          ok: false, error: "Unknown service.",
          clarify: "Which service do you need? For example: general, dental, imaging.",
        };
      }
      return { ok: true, tool: call.tool, summary: `providers-for:${service}`, draftId: null };
    }
    case "check-availability": {
      if (ctx.adapter) {
        const cap = requireCapability(ctx.adapter, "availability");
        if (!cap.ok) return { ok: false, error: cap.error, clarify: null };
      }
      const provider = call.args["provider"];
      if (!provider || !ctx.knownProviders.has(provider)) {
        return {
          ok: false, error: "Unknown provider.",
          clarify: "Which clinician or clinic did you mean? Please pick from the listed options.",
        };
      }
      return { ok: true, tool: call.tool, summary: `availability-for:${provider}`, draftId: null };
    }
    case "draft-booking": {
      const provider = call.args["provider"];
      const slot = call.args["slot"];
      if (!provider || !ctx.knownProviders.has(provider)) {
        return {
          ok: false, error: "Unknown provider.",
          clarify: "Which clinician or clinic did you mean? Please pick from the listed options.",
        };
      }
      if (!slot) {
        return {
          ok: false, error: "Missing slot.",
          clarify: "Which time works for you? Please pick one of the shown slots.",
        };
      }
      // Draft only: returns a draft id that M043 confirmation must redeem.
      return {
        ok: true, tool: call.tool,
        summary: `draft:${provider}:${slot}`, draftId: `draft-${provider}-${slot}`,
      };
    }
  }
}
