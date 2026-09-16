// Expansion readiness decision framework (M060).
// The framework consumes gate inputs and outputs go / iterate / stop
// with recorded reasons. Any missing real-evidence gate vetoes go:
// safety, measured access, economics, and unresolved-risk review must
// all be genuinely satisfied. Repository implementation being complete
// never substitutes for real evidence.

export type GateStatus = "satisfied" | "pending" | "failed";

export interface ExpansionGates {
  safety: GateStatus;
  measuredAccess: GateStatus;
  economics: GateStatus;
  riskReview: GateStatus;
  unresolvedRisks: string[];
}

export type ExpansionDecision = "go" | "iterate" | "stop";

export interface DecisionOutput {
  decision: ExpansionDecision;
  reasons: string[];
}

export function decideExpansion(gates: ExpansionGates): DecisionOutput {
  const reasons: string[] = [];
  const statuses: Array<[string, GateStatus]> = [
    ["safety", gates.safety],
    ["measured-access", gates.measuredAccess],
    ["economics", gates.economics],
    ["risk-review", gates.riskReview],
  ];
  for (const [name, status] of statuses) {
    if (status !== "satisfied") reasons.push(`${name}:${status}`);
  }
  for (const r of gates.unresolvedRisks) reasons.push(`unresolved:${r}`);
  if (reasons.length > 0) {
    const failed = statuses.some(([, s]) => s === "failed");
    return { decision: failed ? "stop" : "iterate", reasons };
  }
  return { decision: "go", reasons: ["all-gates-satisfied"] };
}

/** Current honest program state: implementation done, real evidence pending. */
export function currentProgramState(): Record<string, boolean | string> {
  return {
    PRODUCT_IMPLEMENTATION_COMPLETE: true,
    SYNTHETIC_QUALIFICATION_COMPLETE: true,
    M028_REAL_VALIDATION_COMPLETE: false,
    M029_REAL_PILOT_COMPLETE: false,
    M030_COMMERCIAL_VALIDATION_COMPLETE: false,
    REAL_PRODUCTION_AUTHORIZED: false,
    REAL_EXPANSION_READY: false,
    ZYARA_PROJECT_COMPLETE: false,
    NOTE: "Repository implementation exhausted; external validation pending with exact action packets in docs/evidence/M028/BLOCKER.md.",
  };
}
