// Referral and order-to-schedule work queues (M035).
// A referral carries an accountable source, target service, eligibility
// context and expiry. Expired referrals never schedule. Duplicates are
// suppressed on (tenant, patient, service, order id). Queue order is
// deterministic: clinical urgency rank first, then oldest first.

export type ReferralState =
  | "pending"
  | "scheduled"
  | "expired"
  | "declined"
  | "cancelled";

export type ReferralUrgency = "urgent" | "soon" | "routine";

export const URGENCY_RANK: Record<ReferralUrgency, number> = {
  urgent: 0,
  soon: 1,
  routine: 2,
};

export interface Referral {
  id: string;
  tenantId: string;
  patientId: string;
  sourceId: string;
  sourceRole: string;
  serviceId: string;
  orderId: string;
  urgency: ReferralUrgency;
  eligibilityContext: string[];
  expiresAtUtc: string;
  createdAtUtc: string;
  state: ReferralState;
  scheduledAppointmentId: string | null;
  transitions: Array<{ atUtc: string; from: ReferralState; to: ReferralState; actorId: string; reason: string }>;
}

export const AUTHORIZED_REFERRAL_ROLES: readonly string[] = [
  "clinician",
  "care-team-lead",
  "dental-clinician",
];

export function createReferral(input: {
  id: string; tenantId: string; patientId: string;
  sourceId: string; sourceRole: string; serviceId: string; orderId: string;
  urgency: ReferralUrgency; eligibilityContext?: string[];
  expiresAtUtc: string; createdAtUtc: string;
}): Referral | { error: string } {
  if (!AUTHORIZED_REFERRAL_ROLES.includes(input.sourceRole)) {
    return { error: `Role ${input.sourceRole} cannot issue referrals.` };
  }
  if (input.expiresAtUtc <= input.createdAtUtc) {
    return { error: "Referral expiry must follow creation." };
  }
  return {
    id: input.id, tenantId: input.tenantId, patientId: input.patientId,
    sourceId: input.sourceId, sourceRole: input.sourceRole,
    serviceId: input.serviceId, orderId: input.orderId,
    urgency: input.urgency, eligibilityContext: input.eligibilityContext ?? [],
    expiresAtUtc: input.expiresAtUtc, createdAtUtc: input.createdAtUtc,
    state: "pending", scheduledAppointmentId: null, transitions: [],
  };
}

export function transitionReferral(
  ref: Referral,
  to: ReferralState,
  actorId: string,
  reason: string,
  atUtc: string,
): Referral | { error: string } {
  if (ref.state !== "pending") {
    return { error: `Referral ${ref.id} is ${ref.state}; immutable.` };
  }
  if (!reason || reason.trim().length === 0) {
    return { error: "Transition requires a recorded reason." };
  }
  if (to === "scheduled" && atUtc >= ref.expiresAtUtc) {
    return { error: "Expired referrals never schedule." };
  }
  return {
    ...ref,
    state: to,
    transitions: [...ref.transitions, { atUtc, from: ref.state, to, actorId, reason }],
  };
}

export function sweepExpired(
  refs: readonly Referral[],
  nowUtc: string,
): Referral[] {
  return refs.map((r) =>
    r.state === "pending" && nowUtc >= r.expiresAtUtc
      ? {
          ...r, state: "expired" as const,
          transitions: [...r.transitions, { atUtc: nowUtc, from: r.state, to: "expired" as const, actorId: "system", reason: "expiry-sweep" }],
        }
      : r,
  );
}

export function isDuplicateReferral(
  candidate: { tenantId: string; patientId: string; serviceId: string; orderId: string },
  existing: readonly Referral[],
): boolean {
  return existing.some(
    (r) =>
      r.tenantId === candidate.tenantId &&
      r.patientId === candidate.patientId &&
      r.serviceId === candidate.serviceId &&
      r.orderId === candidate.orderId &&
      r.state === "pending",
  );
}

export function orderQueue(refs: readonly Referral[]): Referral[] {
  return [...refs]
    .filter((r) => r.state === "pending")
    .sort(
      (a, b) =>
        URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency] ||
        (a.createdAtUtc < b.createdAtUtc ? -1 : a.createdAtUtc > b.createdAtUtc ? 1 : 0),
    );
}
