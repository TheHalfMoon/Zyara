// Readiness status interpretation. Pure domain logic, no framework imports.
export type ReadinessStatus = "healthy" | "not_ready";
export type DatabaseState = "reachable" | "unavailable";

export interface ReadinessInput {
  database: DatabaseState;
}

export function interpretReadiness(input: ReadinessInput): ReadinessStatus {
  return input.database === "reachable" ? "healthy" : "not_ready";
}
