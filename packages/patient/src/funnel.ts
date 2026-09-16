// M017 observability: funnel stage counts only. English only.
// Never records raw intake answers, medical free text, identifiers, or tokens.

export type FunnelStage =
  | "availability_viewed"
  | "mode_selected"
  | "contact_started"
  | "contact_completed"
  | "confirmation_reached"
  | "request_pending"
  | "booking_committed"
  | "abandoned";

export interface FunnelTracker {
  counts: Record<FunnelStage, number>;
  pendingRequests: number;
}

export function createFunnel(): FunnelTracker {
  return {
    counts: {
      availability_viewed: 0,
      mode_selected: 0,
      contact_started: 0,
      contact_completed: 0,
      confirmation_reached: 0,
      request_pending: 0,
      booking_committed: 0,
      abandoned: 0,
    },
    pendingRequests: 0,
  };
}

export function recordStage(tracker: FunnelTracker, stage: FunnelStage): void {
  tracker.counts[stage] += 1;
  if (stage === "request_pending") tracker.pendingRequests += 1;
}
