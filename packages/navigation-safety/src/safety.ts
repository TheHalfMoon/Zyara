// Reviewed navigation safety and intent contract (M041).
// The assistant may navigate, explain, and hand off. It must never
// diagnose, prescribe, invent clinical facts, guarantee coverage, or
// fabricate eligibility/authority. Uncertainty and symptom-style input
// escalate to a clinician handoff. Every decision is audit-logged.

export type AllowedIntent = "navigate" | "explain" | "handoff";

export type ProhibitedIntent =
  | "diagnose"
  | "prescribe"
  | "coverage-guarantee"
  | "eligibility-fabrication"
  | "authority-fabrication"
  | "autonomous-clinical-action";

export type Intent = AllowedIntent | ProhibitedIntent;

export interface IntentDecision {
  intent: Intent;
  allowed: boolean;
  escalate: boolean;
  reason: string;
}

const SYMPTOM_MARKERS = [
  "chest pain", "bleeding", "suicid", "overdose", "stroke",
  "ألم صدر", "نزيف",
];

export function mentionsSymptoms(text: string): boolean {
  const lower = text.toLowerCase();
  return SYMPTOM_MARKERS.some((m) => lower.includes(m));
}

export function decideIntent(
  intent: Intent,
  inputText: string,
  confidence: number,
): IntentDecision {
  if (mentionsSymptoms(inputText)) {
    return {
      intent, allowed: false, escalate: true,
      reason: "Symptom-style input triggers the safety gate: handoff, no navigation override.",
    };
  }
  switch (intent) {
    case "navigate":
    case "explain":
      if (confidence < 0.6) {
        return {
          intent, allowed: false, escalate: true,
          reason: `Low confidence (${confidence}); escalate to clinician handoff.`,
        };
      }
      return { intent, allowed: true, escalate: false, reason: "Allowed intent with sufficient confidence." };
    case "handoff":
      return { intent, allowed: true, escalate: true, reason: "Handoff is always allowed and escalates by definition." };
    default:
      return {
        intent, allowed: false, escalate: true,
        reason: `Prohibited intent ${intent}; refused and escalated.`,
      };
  }
}

export interface IntentAuditEntry {
  atUtc: string;
  intent: Intent;
  allowed: boolean;
  escalated: boolean;
  confidence: number;
  reason: string;
}

export function auditDecision(
  decision: IntentDecision,
  confidence: number,
  atUtc: string,
): IntentAuditEntry {
  return {
    atUtc,
    intent: decision.intent,
    allowed: decision.allowed,
    escalated: decision.escalate,
    confidence,
    reason: decision.reason,
  };
}
