// Clinician-originated follow-up and recall plans (M033).
// A plan has an accountable clinical issuer, source, window, service,
// prerequisites and stop conditions. Booking an appointment satisfies
// access work but never closes clinical completion. Completed, cancelled
// and superseded plans suppress obsolete work. A missed visit reopens work
// only within approved policy.

export type PlanState =
  | "active"
  | "completed"
  | "cancelled"
  | "superseded"
  | "declined";

export type PlanTemplate =
  | "follow-up"
  | "dental-preventive"
  | "rehab"
  | "screening";

export interface RecallPlan {
  id: string;
  tenantId: string;
  patientId: string;
  /** Accountable clinical issuer; must hold an authorized issuer role. */
  issuerId: string;
  issuerRole: string;
  source: string;
  template: PlanTemplate;
  serviceId: string;
  windowStartUtc: string;
  windowEndUtc: string;
  prerequisites: string[];
  stopConditions: string[];
  version: number;
  supersedesId: string | null;
  state: PlanState;
  /** Clinical completion is separate from booking; set only by issuer role. */
  clinicallyCompleted: boolean;
  bookedAppointmentId: string | null;
  declineReason: string | null;
}

export const AUTHORIZED_ISSUER_ROLES: readonly string[] = [
  "clinician",
  "care-team-lead",
  "dental-clinician",
];

export type PlanError =
  | "UNAUTHORIZED_ISSUER"
  | "BAD_WINDOW"
  | "MISSING_SOURCE"
  | "TERMINAL_PLAN_IMMUTABLE"
  | "COMPLETION_REQUIRES_ISSUER_ROLE";

export interface CreatePlanInput {
  id: string;
  tenantId: string;
  patientId: string;
  issuerId: string;
  issuerRole: string;
  source: string;
  template: PlanTemplate;
  serviceId: string;
  windowStartUtc: string;
  windowEndUtc: string;
  prerequisites?: string[];
  stopConditions?: string[];
}

export function createPlan(
  input: CreatePlanInput,
): RecallPlan | { error: PlanError; message: string } {
  if (!AUTHORIZED_ISSUER_ROLES.includes(input.issuerRole)) {
    return {
      error: "UNAUTHORIZED_ISSUER",
      message: `Role ${input.issuerRole} cannot issue recall plans.`,
    };
  }
  if (!input.source || input.source.trim().length === 0) {
    return { error: "MISSING_SOURCE", message: "Plan source is required." };
  }
  if (input.windowStartUtc >= input.windowEndUtc) {
    return { error: "BAD_WINDOW", message: "Window start must precede end." };
  }
  return {
    id: input.id,
    tenantId: input.tenantId,
    patientId: input.patientId,
    issuerId: input.issuerId,
    issuerRole: input.issuerRole,
    source: input.source,
    template: input.template,
    serviceId: input.serviceId,
    windowStartUtc: input.windowStartUtc,
    windowEndUtc: input.windowEndUtc,
    prerequisites: input.prerequisites ?? [],
    stopConditions: input.stopConditions ?? [],
    version: 1,
    supersedesId: null,
    state: "active",
    clinicallyCompleted: false,
    bookedAppointmentId: null,
    declineReason: null,
  };
}

export function recordBooking(
  plan: RecallPlan,
  appointmentId: string,
): RecallPlan | { error: PlanError; message: string } {
  if (plan.state !== "active") {
    return {
      error: "TERMINAL_PLAN_IMMUTABLE",
      message: `Plan ${plan.id} is ${plan.state}; booking cannot attach.`,
    };
  }
  // Booking satisfies access; clinical completion stays false.
  return { ...plan, bookedAppointmentId: appointmentId };
}

export function completeClinically(
  plan: RecallPlan,
  actorRole: string,
): RecallPlan | { error: PlanError; message: string } {
  if (!AUTHORIZED_ISSUER_ROLES.includes(actorRole)) {
    return {
      error: "COMPLETION_REQUIRES_ISSUER_ROLE",
      message: "Only an authorized clinical role closes completion.",
    };
  }
  if (plan.state !== "active") {
    return {
      error: "TERMINAL_PLAN_IMMUTABLE",
      message: `Plan ${plan.id} is ${plan.state}.`,
    };
  }
  return { ...plan, state: "completed", clinicallyCompleted: true };
}

export function supersedePlan(
  plan: RecallPlan,
  next: RecallPlan,
): { current: RecallPlan; replacement: RecallPlan } {
  const current: RecallPlan = { ...plan, state: "superseded" };
  const replacement: RecallPlan = {
    ...next,
    version: plan.version + 1,
    supersedesId: plan.id,
  };
  return { current, replacement };
}

export function cancelPlan(plan: RecallPlan): RecallPlan {
  if (plan.state !== "active") return plan;
  return { ...plan, state: "cancelled" };
}

export function declinePlan(plan: RecallPlan, reason: string): RecallPlan {
  if (plan.state !== "active") return plan;
  return { ...plan, state: "declined", declineReason: reason };
}

/**
 * A missed visit reopens access work only within approved policy:
 * the plan must still be active and the miss must fall inside the
 * clinical window. Otherwise the plan is left for clinician review.
 */
export function shouldReopenAfterMiss(
  plan: RecallPlan,
  missedAtUtc: string,
): boolean {
  if (plan.state !== "active") return false;
  return missedAtUtc >= plan.windowStartUtc && missedAtUtc <= plan.windowEndUtc;
}

/** Terminal states suppress obsolete downstream work. */
export function suppressesWork(plan: RecallPlan): boolean {
  return (
    plan.state === "completed" ||
    plan.state === "cancelled" ||
    plan.state === "superseded"
  );
}

export function isDuplicatePlan(
  candidate: CreatePlanInput,
  existing: readonly RecallPlan[],
): boolean {
  return existing.some(
    (p) =>
      p.tenantId === candidate.tenantId &&
      p.patientId === candidate.patientId &&
      p.serviceId === candidate.serviceId &&
      p.template === candidate.template &&
      p.state === "active" &&
      p.windowStartUtc === candidate.windowStartUtc &&
      p.windowEndUtc === candidate.windowEndUtc,
  );
}
