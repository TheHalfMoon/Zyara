// Review fraud review and ranking governance (M023). English only.
//
// Commercial incentives and small samples must not distort trust.
// Paid tier is absent from the score dependency graph by construction:
// rank-input audit rejects it. Small samples display uncertainty and count
// instead of confident means. Fraud flags trigger proportionate human
// review and can never silently erase a compliant negative review, nor
// deny medical access. Moderators and sales are separated; appeals reverse.

export const RANK_POLICY_VERSION = "rank-policy-v1";

/** Closed allowlist of rank signals. paid_tier is deliberately absent. */
export const RANK_SIGNAL_ALLOWLIST = [
  "alias_match", "text_match", "specialty_match", "service_match",
  "distance_km", "verification_scope", "freshness_days", "insurer_match",
  "review_confidence",
] as const;

export type RankSignal = (typeof RANK_SIGNAL_ALLOWLIST)[number];

/** Audit rank inputs: any signal outside the allowlist fails closed. */
export function auditRankInputs(signals: string[]): { ok: boolean; code: string } {
  for (const s of signals) {
    if (!(RANK_SIGNAL_ALLOWLIST as readonly string[]).includes(s)) {
      return { ok: false, code: `RANK_SIGNAL_DENIED:${s}` };
    }
  }
  return { ok: true, code: "RANK_INPUTS_APPROVED" };
}

export interface AggregateInput {
  count: number;
  mean: number;
  oldestDays: number;
}

/**
 * Versioned aggregate confidence with shrinkage toward neutral (3.0) and
 * freshness decay. Small samples show uncertainty: callers must display
 * count plus uncertainty instead of a confident mean.
 */
export function governedAggregate(input: AggregateInput): {
  displayMean: number | null; uncertainty: "high" | "medium" | "low"; count: number; policy: string;
} {
  const shrinkage = input.count / (input.count + 5);
  const shrunk = 3.0 + (input.mean - 3.0) * shrinkage;
  const fresh = Math.max(0, 1 - input.oldestDays / 365);
  const displayMean = input.count >= 3 ? Math.round(shrunk * 10) / 10 : null;
  const uncertainty = input.count < 3 ? "high" : fresh < 0.5 ? "medium" : "low";
  return { displayMean, uncertainty, count: input.count, policy: RANK_POLICY_VERSION };
}

export type FraudSignal = "burst_velocity" | "duplicate_text" | "incentivized_pattern";
export type FraudState = "none" | "flagged" | "under_review" | "cleared" | "confirmed";

export interface FraudCase {
  id: string;
  practitionerId: string;
  signals: FraudSignal[];
  state: FraudState;
  audit: string[];
}

export type GovernanceActor = "moderator" | "sales" | "provider" | "system";

/**
 * Fraud flags require proportionate review. Sales and providers cannot open
 * or decide cases. A flag never erases reviews and never denies medical
 * access; it only routes to independent review.
 */
export function openFraudCase(
  id: string,
  practitionerId: string,
  signals: FraudSignal[],
  actor: GovernanceActor,
): FraudCase {
  if (actor === "sales" || actor === "provider") throw new Error("FRAUD_ACTOR_SEPARATION");
  if (signals.length === 0) throw new Error("FRAUD_SIGNALS_REQUIRED");
  return { id, practitionerId, signals: [...signals], state: "flagged", audit: [`OPENED by ${actor}`] };
}

export function decideFraudCase(
  fraudCase: FraudCase,
  actor: GovernanceActor,
  decision: "clear" | "confirm",
  appealable = true,
): FraudCase {
  if (actor !== "moderator") throw new Error("FRAUD_ACTOR_SEPARATION");
  const next: FraudCase = {
    ...fraudCase,
    state: decision === "clear" ? "cleared" : "confirmed",
    audit: [...fraudCase.audit, `DECIDED ${decision} by moderator appealable=${appealable}`],
  };
  return next;
}

/** Independent appeal can reverse a confirmed case; sales cannot appeal. */
export function appealFraudCase(
  fraudCase: FraudCase,
  actor: GovernanceActor,
): FraudCase {
  if (actor === "sales") throw new Error("FRAUD_ACTOR_SEPARATION");
  if (fraudCase.state !== "confirmed") throw new Error("FRAUD_APPEAL_INVALID_STATE");
  return { ...fraudCase, state: "under_review", audit: [...fraudCase.audit, `APPEALED by ${actor}`] };
}

export const GOVERNANCE_LOCALES = ["ar", "en", "fr", "de", "es"] as const;

export function rankExplanationLabel(signal: string, locale: string): string {
  const table: Record<string, Record<string, string>> = {
    review_confidence: {
      ar: "ثقة التقييم", en: "Review confidence", fr: "Confiance des avis",
      de: "Bewertungsvertrauen", es: "Confianza de reseñas",
    },
    verification_scope: {
      ar: "نطاق التحقق", en: "Verification scope", fr: "Portée de vérification",
      de: "Verifizierungsumfang", es: "Alcance de verificación",
    },
  };
  const row = table[signal];
  if (!row) throw new Error("GOVERNANCE_LABEL_UNKNOWN");
  return row[locale] ?? row.en;
}

/** Counts only: policy version, overrides, fairness summaries. */
export function telemetryForGovernance(input: {
  audits: number; flags: number; reversals: number; policy: string;
}): Record<string, string | number> {
  return { ...input };
}
