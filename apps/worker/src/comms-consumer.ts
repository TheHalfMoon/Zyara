// Communication delivery consumer (M020). English only.
// Consumes durable outbox delivery tasks and drives the send-time gate from
// @zyara/communication. Booking truth is read-only here: delivery outcomes
// never mutate appointments. A messaging outage pauses this consumer while
// booking, in-app updates, and manual contact continue independently.
import type { QueuedMessage } from "@zyara/communication";

export interface DeliveryTask {
  taskId: string;
  message: QueuedMessage;
}

/** Dedupe by task id: replays return the recorded outcome, never resend. */
export function dedupeDeliveryTask(
  seen: Map<string, string>,
  task: DeliveryTask,
  outcome: string,
): { duplicate: boolean; outcome: string } {
  const existing = seen.get(task.taskId);
  if (existing) return { duplicate: true, outcome: existing };
  seen.set(task.taskId, outcome);
  return { duplicate: false, outcome };
}
