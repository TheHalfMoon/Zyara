// Typed eligibility engine (M013).
// A free time slot is NOT a bookable healthcare slot. Availability alone never
// implies eligibility: evaluation returns an explicit outcome and never
// collapses uncertainty into a boolean.
//
// Precedence: DENY > NEEDS_STAFF_REVIEW > SOURCE_UNAVAILABLE > NEEDS_INPUT > ALLOW.
// Missing data is never ALLOW and never a silent DENY.
//
// Rules are restricted declarative data. No arbitrary provider code path and no
// model decision path exists in this module: evaluation is a pure deterministic
// function of (rules, context, typed input). Provider-authored clinical rules
// (referral, order, intake, interval) without accountable approval evaluate to
// NEEDS_STAFF_REVIEW. Approval is never fabricated.

export type EligibilityOutcome =
  | "ALLOW"
  | "DENY"
  | "NEEDS_INPUT"
  | "NEEDS_STAFF_REVIEW"
  | "SOURCE_UNAVAILABLE";

export type RuleFamily =
  | "age"
  | "new_returning"
  | "service_reason"
  | "insurance"
  | "referral"
  | "order"
  | "provider_site_resources"
  | "language"
  | "telehealth_geography"
  | "intake"
  | "interval"
  | "accepting_new";

export const ALL_RULE_FAMILIES: readonly RuleFamily[] = [
  "age",
  "new_returning",
  "service_reason",
  "insurance",
  "referral",
  "order",
  "provider_site_resources",
  "language",
  "telehealth_geography",
  "intake",
  "interval",
  "accepting_new",
];

/** Lower rank dominates the combined result. Pinned by tests. */
export const RULE_PRECEDENCE: Record<EligibilityOutcome, number> = {
  DENY: 0,
  NEEDS_STAFF_REVIEW: 1,
  SOURCE_UNAVAILABLE: 2,
  NEEDS_INPUT: 3,
  ALLOW: 4,
};
// Restricted declarative parameters: one shape per family, no code strings,
// no predicates, no script references.
export type RuleParams =
  | { family: "age"; minAgeYears: number | null; maxAgeYears: number | null }
  | { family: "new_returning"; accept: "new" | "returning" | "both" }
  | { family: "service_reason"; allowedTypeIds: string[] }
  | { family: "insurance"; accepted: Array<{ insurer: string; network: string }> }
  | { family: "referral"; required: boolean }
  | { family: "order"; required: boolean; orderType: string | null }
  | { family: "provider_site_resources"; requiresActiveRole: boolean }
  | { family: "language"; availableLanguages: string[]; interpreterAvailable: boolean }
  | {
      family: "telehealth_geography";
      mode: "in_person" | "telehealth" | "home";
      allowedJurisdictions: string[];
      homeRadiusKm: number | null;
    }
  | { family: "intake"; requiredIntakeVersion: string; requiresProviderReview: boolean }
  | { family: "interval"; minDaysSinceLastVisit: number | null; maxDaysSinceLastVisit: number | null }
  | { family: "accepting_new"; acceptingNew: boolean };

export interface RuleApproval {
  approvedBy: string;
  approvedAt: string;
}

export interface EligibilityRule {
  /** Stable machine code, e.g. "REFERRAL_REQUIRED". */
  id: string;
  family: RuleFamily;
  /** Immutable version, assigned at publish; never mutated afterwards. */
  version: number;
  serviceId: string;
  /** Type scope, or "*" for every type of the service. */
  typeId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  issuer: "platform" | "provider";
  /** Required for provider-authored clinical families; never defaulted. */
  approval: RuleApproval | null;
  params: RuleParams;
  explanationKey: string;
}

/** Provider-authored clinical requirements need accountable approval. */
export const CLINICAL_FAMILIES: readonly RuleFamily[] = ["referral", "order", "intake", "interval"];

export interface EligibilityContext {
  serviceId: string;
  typeId: string;
  /** Planned visit day, ISO date (YYYY-MM-DD). Age and windows anchor here. */
  visitDate: string;
}
// Minimal material input only. No narrative, no documents, no identifiers
// beyond what a rule family materially needs. Unknown fields are rejected.
export interface EligibilityInput {
  dateOfBirth: string | null;
  isReturningPatient: boolean | null;
  requestedTypeId: string | null;
  insurer: { insurer: string; network: string } | null;
  insurerSourceAvailable: boolean;
  referral: { present: boolean; validTo: string | null } | null;
  order: { present: boolean; orderType: string | null } | null;
  orderSourceAvailable: boolean;
  providerActive: boolean | null;
  language: string | null;
  needsInterpreter: boolean;
  jurisdiction: string | null;
  homeDistanceKm: number | null;
  intakeAnswersVersion: string | null;
  intakeComplete: boolean | null;
  lastVisitDate: string | null;
}

export const MATERIAL_INPUT_KEYS: readonly string[] = [
  "dateOfBirth",
  "isReturningPatient",
  "requestedTypeId",
  "insurer",
  "insurerSourceAvailable",
  "referral",
  "order",
  "orderSourceAvailable",
  "providerActive",
  "language",
  "needsInterpreter",
  "jurisdiction",
  "homeDistanceKm",
  "intakeAnswersVersion",
  "intakeComplete",
  "lastVisitDate",
];

/** Reject excess clinical-data collection at the boundary. */
export function assertMaterialInput(input: unknown): asserts input is EligibilityInput {
  if (typeof input !== "object" || input === null) throw new Error("INPUT_MUST_BE_OBJECT");
  for (const key of Object.keys(input)) {
    if (!(MATERIAL_INPUT_KEYS as readonly string[]).includes(key)) {
      throw new Error(`INPUT_FIELD_NOT_COLLECTED:${key}`);
    }
  }
}

export type NextStepCode =
  | "PROVIDE_INFORMATION"
  | "REQUEST_REVIEW"
  | "CHOOSE_ANOTHER_SERVICE"
  | "CALL_CLINIC";

export interface RuleResult {
  ruleId: string;
  family: RuleFamily;
  version: number;
  outcome: EligibilityOutcome;
  reasonCode: string;
  missingInput: string | null;
  nextStep: NextStepCode;
}

export interface EvaluationResult {
  outcome: EligibilityOutcome;
  results: RuleResult[];
  evaluatedRuleVersions: string[];
  missingInputs: string[];
  sourceCodes: string[];
  nextSteps: NextStepCode[];
}

function one(
  rule: EligibilityRule,
  outcome: EligibilityOutcome,
  reasonCode: string,
  nextStep: NextStepCode,
  missingInput: string | null = null,
): RuleResult {
  return { ruleId: rule.id, family: rule.family, version: rule.version, outcome, reasonCode, missingInput, nextStep };
}

function ageAtVisit(dateOfBirth: string, visitDate: string): number {
  const b = dateOfBirth.split("-").map(Number);
  const v = visitDate.split("-").map(Number);
  let age = (v[0] as number) - (b[0] as number);
  if ((v[1] as number) < (b[1] as number) || ((v[1] as number) === (b[1] as number) && (v[2] as number) < (b[2] as number))) {
    age -= 1;
  }
  return age;
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 86_400_000);
}

function approvalGate(rule: EligibilityRule): RuleResult | null {
  if (rule.issuer === "provider" && CLINICAL_FAMILIES.includes(rule.family) && rule.approval === null) {
    return one(rule, "NEEDS_STAFF_REVIEW", "APPROVAL_MISSING", "REQUEST_REVIEW");
  }
  return null;
}

function evalAge(rule: EligibilityRule, ctx: EligibilityContext, input: EligibilityInput): RuleResult {
  const p = rule.params;
  if (p.family !== "age") throw new Error("PARAM_FAMILY_MISMATCH");
  if (input.dateOfBirth === null) return one(rule, "NEEDS_INPUT", "AGE_DOB_MISSING", "PROVIDE_INFORMATION", "dateOfBirth");
  const age = ageAtVisit(input.dateOfBirth, ctx.visitDate);
  if (p.minAgeYears !== null && age < p.minAgeYears) return one(rule, "DENY", "AGE_BELOW_MIN", "CHOOSE_ANOTHER_SERVICE");
  if (p.maxAgeYears !== null && age > p.maxAgeYears) return one(rule, "DENY", "AGE_ABOVE_MAX", "CHOOSE_ANOTHER_SERVICE");
  return one(rule, "ALLOW", "AGE_OK", "PROVIDE_INFORMATION");
}

function evalNewReturning(rule: EligibilityRule, input: EligibilityInput): RuleResult {
  const p = rule.params;
  if (p.family !== "new_returning") throw new Error("PARAM_FAMILY_MISMATCH");
  if (p.accept === "both") return one(rule, "ALLOW", "RELATIONSHIP_ANY", "PROVIDE_INFORMATION");
  if (input.isReturningPatient === null) {
    return one(rule, "NEEDS_INPUT", "RELATIONSHIP_UNKNOWN", "PROVIDE_INFORMATION", "isReturningPatient");
  }
  if (p.accept === "returning" && !input.isReturningPatient) return one(rule, "DENY", "RETURNING_ONLY", "CHOOSE_ANOTHER_SERVICE");
  if (p.accept === "new" && input.isReturningPatient) return one(rule, "DENY", "NEW_ONLY", "CHOOSE_ANOTHER_SERVICE");
  return one(rule, "ALLOW", "RELATIONSHIP_OK", "PROVIDE_INFORMATION");
}

function evalServiceReason(rule: EligibilityRule, input: EligibilityInput): RuleResult {
  const p = rule.params;
  if (p.family !== "service_reason") throw new Error("PARAM_FAMILY_MISMATCH");
  if (input.requestedTypeId === null) return one(rule, "NEEDS_INPUT", "TYPE_UNSELECTED", "PROVIDE_INFORMATION", "requestedTypeId");
  if (!p.allowedTypeIds.includes(input.requestedTypeId)) return one(rule, "DENY", "TYPE_NOT_OFFERED", "CHOOSE_ANOTHER_SERVICE");
  return one(rule, "ALLOW", "TYPE_OK", "PROVIDE_INFORMATION");
}

function evalInsurance(rule: EligibilityRule, input: EligibilityInput): RuleResult {
  const p = rule.params;
  if (p.family !== "insurance") throw new Error("PARAM_FAMILY_MISMATCH");
  if (input.insurer === null) return one(rule, "NEEDS_INPUT", "INSURER_UNKNOWN", "PROVIDE_INFORMATION", "insurer");
  if (!input.insurerSourceAvailable) return one(rule, "SOURCE_UNAVAILABLE", "INSURER_SOURCE_DOWN", "CALL_CLINIC");
  const accepted = p.accepted.some((a) => a.insurer === input.insurer?.insurer && a.network === input.insurer?.network);
  if (!accepted) return one(rule, "DENY", "INSURER_NOT_ACCEPTED", "CALL_CLINIC");
  return one(rule, "ALLOW", "INSURER_ACCEPTED", "PROVIDE_INFORMATION");
}

function evalReferral(rule: EligibilityRule, ctx: EligibilityContext, input: EligibilityInput): RuleResult {
  const p = rule.params;
  if (p.family !== "referral") throw new Error("PARAM_FAMILY_MISMATCH");
  if (!p.required) return one(rule, "ALLOW", "REFERRAL_NOT_REQUIRED", "PROVIDE_INFORMATION");
  if (input.referral === null || !input.referral.present) {
    return one(rule, "NEEDS_INPUT", "REFERRAL_MISSING", "PROVIDE_INFORMATION", "referral");
  }
  if (input.referral.validTo !== null && input.referral.validTo < ctx.visitDate) {
    return one(rule, "NEEDS_STAFF_REVIEW", "REFERRAL_EXPIRED", "REQUEST_REVIEW");
  }
  return one(rule, "ALLOW", "REFERRAL_OK", "PROVIDE_INFORMATION");
}

function evalOrder(rule: EligibilityRule, input: EligibilityInput): RuleResult {
  const p = rule.params;
  if (p.family !== "order") throw new Error("PARAM_FAMILY_MISMATCH");
  if (!p.required) return one(rule, "ALLOW", "ORDER_NOT_REQUIRED", "PROVIDE_INFORMATION");
  if (input.order === null || !input.order.present) {
    return one(rule, "NEEDS_INPUT", "ORDER_MISSING", "PROVIDE_INFORMATION", "order");
  }
  if (!input.orderSourceAvailable) return one(rule, "SOURCE_UNAVAILABLE", "ORDER_SOURCE_DOWN", "CALL_CLINIC");
  if (p.orderType !== null && input.order.orderType !== p.orderType) {
    return one(rule, "NEEDS_STAFF_REVIEW", "ORDER_TYPE_MISMATCH", "REQUEST_REVIEW");
  }
  return one(rule, "ALLOW", "ORDER_OK", "PROVIDE_INFORMATION");
}

function evalProviderSite(rule: EligibilityRule, input: EligibilityInput): RuleResult {
  const p = rule.params;
  if (p.family !== "provider_site_resources") throw new Error("PARAM_FAMILY_MISMATCH");
  if (!p.requiresActiveRole) return one(rule, "ALLOW", "PROVIDER_CHECK_SKIPPED", "PROVIDE_INFORMATION");
  if (input.providerActive === null) return one(rule, "SOURCE_UNAVAILABLE", "PROVIDER_STATUS_UNKNOWN", "CALL_CLINIC");
  if (!input.providerActive) return one(rule, "DENY", "PROVIDER_NOT_AVAILABLE", "CHOOSE_ANOTHER_SERVICE");
  return one(rule, "ALLOW", "ROLE_ACTIVE", "PROVIDE_INFORMATION");
}
function evalLanguage(rule: EligibilityRule, input: EligibilityInput): RuleResult {
  const p = rule.params;
  if (p.family !== "language") throw new Error("PARAM_FAMILY_MISMATCH");
  if (input.language === null) return one(rule, "NEEDS_INPUT", "LANGUAGE_UNKNOWN", "PROVIDE_INFORMATION", "language");
  if (p.availableLanguages.includes(input.language) && !input.needsInterpreter) {
    return one(rule, "ALLOW", "LANGUAGE_OK", "PROVIDE_INFORMATION");
  }
  if (p.interpreterAvailable) return one(rule, "NEEDS_STAFF_REVIEW", "INTERPRETER_TO_ARRANGE", "REQUEST_REVIEW");
  return one(rule, "DENY", "LANGUAGE_UNAVAILABLE", "CHOOSE_ANOTHER_SERVICE");
}

function evalTelehealth(rule: EligibilityRule, input: EligibilityInput): RuleResult {
  const p = rule.params;
  if (p.family !== "telehealth_geography") throw new Error("PARAM_FAMILY_MISMATCH");
  if (p.mode === "in_person") return one(rule, "ALLOW", "SITE_VISIT", "PROVIDE_INFORMATION");
  if (p.mode === "telehealth") {
    if (input.jurisdiction === null) return one(rule, "NEEDS_INPUT", "JURISDICTION_UNKNOWN", "PROVIDE_INFORMATION", "jurisdiction");
    if (!p.allowedJurisdictions.includes(input.jurisdiction)) {
      return one(rule, "DENY", "JURISDICTION_OUTSIDE", "CHOOSE_ANOTHER_SERVICE");
    }
    return one(rule, "ALLOW", "JURISDICTION_OK", "PROVIDE_INFORMATION");
  }
  if (input.homeDistanceKm === null) {
    return one(rule, "NEEDS_INPUT", "HOME_DISTANCE_UNKNOWN", "PROVIDE_INFORMATION", "homeDistanceKm");
  }
  if (p.homeRadiusKm !== null && input.homeDistanceKm > p.homeRadiusKm) {
    return one(rule, "DENY", "HOME_OUTSIDE_RADIUS", "CHOOSE_ANOTHER_SERVICE");
  }
  return one(rule, "ALLOW", "HOME_IN_RADIUS", "PROVIDE_INFORMATION");
}

function evalIntake(rule: EligibilityRule, input: EligibilityInput): RuleResult {
  const p = rule.params;
  if (p.family !== "intake") throw new Error("PARAM_FAMILY_MISMATCH");
  if (input.intakeComplete !== true || input.intakeAnswersVersion === null) {
    return one(rule, "NEEDS_INPUT", "INTAKE_INCOMPLETE", "PROVIDE_INFORMATION", "intakeAnswersVersion");
  }
  if (input.intakeAnswersVersion !== p.requiredIntakeVersion) {
    return one(rule, "NEEDS_INPUT", "INTAKE_VERSION_STALE", "PROVIDE_INFORMATION", "intakeAnswersVersion");
  }
  if (p.requiresProviderReview) return one(rule, "NEEDS_STAFF_REVIEW", "INTAKE_PENDING_REVIEW", "REQUEST_REVIEW");
  return one(rule, "ALLOW", "INTAKE_OK", "PROVIDE_INFORMATION");
}

function evalInterval(rule: EligibilityRule, ctx: EligibilityContext, input: EligibilityInput): RuleResult {
  const p = rule.params;
  if (p.family !== "interval") throw new Error("PARAM_FAMILY_MISMATCH");
  if (p.minDaysSinceLastVisit === null && p.maxDaysSinceLastVisit === null) {
    return one(rule, "ALLOW", "INTERVAL_NO_CONSTRAINT", "PROVIDE_INFORMATION");
  }
  if (input.lastVisitDate === null) {
    return one(rule, "NEEDS_INPUT", "LAST_VISIT_UNKNOWN", "PROVIDE_INFORMATION", "lastVisitDate");
  }
  const days = daysBetween(input.lastVisitDate, ctx.visitDate);
  if (p.minDaysSinceLastVisit !== null && days < p.minDaysSinceLastVisit) {
    return one(rule, "DENY", "VISIT_TOO_SOON", "CALL_CLINIC");
  }
  if (p.maxDaysSinceLastVisit !== null && days > p.maxDaysSinceLastVisit) {
    return one(rule, "NEEDS_STAFF_REVIEW", "VISIT_WINDOW_PASSED", "REQUEST_REVIEW");
  }
  return one(rule, "ALLOW", "INTERVAL_OK", "PROVIDE_INFORMATION");
}

function evalAcceptingNew(rule: EligibilityRule, input: EligibilityInput): RuleResult {
  const p = rule.params;
  if (p.family !== "accepting_new") throw new Error("PARAM_FAMILY_MISMATCH");
  if (p.acceptingNew) return one(rule, "ALLOW", "ACCEPTING_NEW", "PROVIDE_INFORMATION");
  if (input.isReturningPatient === true) return one(rule, "ALLOW", "CONTINUITY_OK", "PROVIDE_INFORMATION");
  if (input.isReturningPatient === null) {
    return one(rule, "NEEDS_INPUT", "RELATIONSHIP_UNKNOWN", "PROVIDE_INFORMATION", "isReturningPatient");
  }
  return one(rule, "DENY", "NEW_PATIENT_PAUSED", "CHOOSE_ANOTHER_SERVICE");
}

function evaluateSingle(rule: EligibilityRule, ctx: EligibilityContext, input: EligibilityInput): RuleResult {
  const gate = approvalGate(rule);
  if (gate) return gate;
  switch (rule.family) {
    case "age": return evalAge(rule, ctx, input);
    case "new_returning": return evalNewReturning(rule, input);
    case "service_reason": return evalServiceReason(rule, input);
    case "insurance": return evalInsurance(rule, input);
    case "referral": return evalReferral(rule, ctx, input);
    case "order": return evalOrder(rule, input);
    case "provider_site_resources": return evalProviderSite(rule, input);
    case "language": return evalLanguage(rule, input);
    case "telehealth_geography": return evalTelehealth(rule, input);
    case "intake": return evalIntake(rule, input);
    case "interval": return evalInterval(rule, ctx, input);
    case "accepting_new": return evalAcceptingNew(rule, input);
  }
}

/** Deterministic: same (rules, context, input) always yields the same result. */
export function evaluateRules(
  rules: EligibilityRule[],
  ctx: EligibilityContext,
  input: EligibilityInput,
): EvaluationResult {
  assertMaterialInput(input);
  const effective = rules
    .filter(
      (r) =>
        r.serviceId === ctx.serviceId &&
        (r.typeId === "*" || r.typeId === ctx.typeId) &&
        r.effectiveFrom <= ctx.visitDate &&
        (r.effectiveTo === null || ctx.visitDate <= r.effectiveTo),
    )
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : a.version - b.version));
  const results = effective.map((r) => evaluateSingle(r, ctx, input));
  let outcome: EligibilityOutcome = "ALLOW";
  for (const r of results) {
    if (RULE_PRECEDENCE[r.outcome] < RULE_PRECEDENCE[outcome]) outcome = r.outcome;
  }
  const missingInputs = [...new Set(results.flatMap((r) => (r.missingInput ? [r.missingInput] : [])))].sort();
  const sourceCodes = [...new Set(results.filter((r) => r.outcome === "SOURCE_UNAVAILABLE").map((r) => r.reasonCode))].sort();
  const nextSteps = [...new Set(results.filter((r) => r.outcome !== "ALLOW").map((r) => r.nextStep))].sort();
  return {
    outcome,
    results,
    evaluatedRuleVersions: effective.map((r) => `${r.id}:v${r.version}`),
    missingInputs,
    sourceCodes,
    nextSteps,
  };
}

/** Privacy-safe telemetry: codes, versions and counts only. Never answers. */
export function telemetryFor(evaluation: EvaluationResult): {
  outcome: EligibilityOutcome;
  ruleCount: number;
  ruleVersions: string[];
  missingInputs: string[];
  sourceCodes: string[];
} {
  return {
    outcome: evaluation.outcome,
    ruleCount: evaluation.results.length,
    ruleVersions: [...evaluation.evaluatedRuleVersions],
    missingInputs: [...evaluation.missingInputs],
    sourceCodes: [...evaluation.sourceCodes],
  };
}

// Immutable version registry: publish appends a frozen new version.
// History is never mutated in place; old versions keep old semantics.
export class RuleRegistry {
  private history = new Map<string, EligibilityRule[]>();

  publish(draft: Omit<EligibilityRule, "version">): EligibilityRule {
    if (draft.params.family !== draft.family) throw new Error("PARAM_FAMILY_MISMATCH");
    const prior = this.history.get(draft.id) ?? [];
    const versioned: EligibilityRule = Object.freeze({ ...draft, version: prior.length + 1 });
    this.history.set(draft.id, [...prior, versioned]);
    return versioned;
  }

  versions(id: string): readonly EligibilityRule[] {
    return this.history.get(id) ?? [];
  }

  latest(id: string): EligibilityRule | null {
    const list = this.history.get(id);
    return list && list.length > 0 ? (list[list.length - 1] as EligibilityRule) : null;
  }
}

