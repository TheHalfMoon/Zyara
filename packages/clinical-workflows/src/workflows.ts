// Imaging, laboratory and nursing service workflows (M047).
// Orders flow: ordered → scheduled → collected/performed → resulted →
// reviewed. Results distinguish pending, preliminary and final —
// preliminary is never presented as final. Nursing tasks carry a
// delegation guard: licensed-only tasks require a licensed role. Orders
// link back to the originating referral where one exists.

export type OrderKind = "imaging" | "laboratory" | "nursing";

export type OrderState =
  | "ordered"
  | "scheduled"
  | "collected"
  | "performed"
  | "resulted"
  | "reviewed"
  | "cancelled";

export type ResultState = "pending" | "preliminary" | "final";

export interface ServiceOrder {
  id: string;
  tenantId: string;
  patientId: string;
  kind: OrderKind;
  referralId: string | null;
  state: OrderState;
  result: ResultState;
  resultPayload: string | null;
}

const TRANSITIONS: Record<OrderState, readonly OrderState[]> = {
  ordered: ["scheduled", "cancelled"],
  scheduled: ["collected", "performed", "cancelled"],
  collected: ["resulted", "cancelled"],
  performed: ["resulted", "cancelled"],
  resulted: ["reviewed"],
  reviewed: [],
  cancelled: [],
};

export function transitionOrder(
  order: ServiceOrder,
  to: OrderState,
): ServiceOrder | { error: string } {
  if (!TRANSITIONS[order.state].includes(to)) {
    return { error: `Order ${order.id} cannot move ${order.state} → ${to}.` };
  }
  return { ...order, state: to };
}

export function recordResult(
  order: ServiceOrder,
  result: ResultState,
  payload: string | null,
): ServiceOrder | { error: string } {
  if (order.state !== "collected" && order.state !== "performed") {
    return { error: `Order ${order.id} cannot record results in ${order.state}.` };
  }
  if (result !== "pending" && !payload) {
    return { error: "Non-pending results require a payload reference." };
  }
  return { ...order, state: "resulted", result, resultPayload: payload };
}

/** Preliminary results are never presented as final. */
export function displayResult(order: ServiceOrder): { label: string; final: boolean } {
  if (order.result === "final") return { label: "Final result", final: true };
  if (order.result === "preliminary") {
    return { label: "Preliminary result — awaiting final confirmation", final: false };
  }
  return { label: "Result pending", final: false };
}

export type NursingRole = "registered-nurse" | "assistant" | "clinician";

export interface NursingTask {
  id: string;
  licensedOnly: boolean;
  assigneeRole: NursingRole;
}

export function delegateNursingTask(
  task: NursingTask,
  to: NursingRole,
): NursingTask | { error: string } {
  if (task.licensedOnly && to === "assistant") {
    return { error: `Task ${task.id} requires a licensed role; cannot delegate to assistant.` };
  }
  return { ...task, assigneeRole: to };
}
