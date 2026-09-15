// Shared API contracts safe for apps to import (M001).
export interface ReadyResponse {
  status: "healthy" | "not_ready";
  database: "reachable" | "unavailable";
  build: string;
  version: string;
}

export interface LiveResponse {
  alive: true;
}

// Onboarding publish contract (M009): blockers gate publish; completeness advisory.
export type OnboardingBlocker =
  | "BLOCK_DURATION"
  | "BLOCK_RESOURCE"
  | "BLOCK_AUTHORITY"
  | "BLOCK_INTAKE_VERSION"
  | "BLOCK_POLICY_VERSION"
  | "BLOCK_INTAKE_FIELD";

export interface PublishDecisionContract {
  serviceId: string;
  publishable: boolean;
  blockers: OnboardingBlocker[];
  completeness: number;
}

// Authoritative native booking contract (M016): confirmation follows commit.
// A booked response carries the committed appointment id and snapshot token.
// Any other outcome carries a stable machine code the UI must explain.
export type BookingOutcomeCodeContract =
  | "BOOKED"
  | "PENDING"
  | "CONFLICT"
  | "NEEDS_RECONFIRMATION"
  | "REJECTED"
  | "PATIENT_DUPLICATE"
  | "IDEMPOTENCY_CONFLICT";

export interface BookingStatusContract {
  operationId: string;
  state: "pending" | "booked" | "conflict" | "needs_reconfirmation" | "rejected";
  appointmentId: string | null;
  reason: string | null;
}

export interface BookResponseContract {
  outcome: BookingOutcomeCodeContract;
  operationId: string;
  appointmentId: string | null;
  snapshotToken: string | null;
  reason: string | null;
}
