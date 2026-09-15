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
