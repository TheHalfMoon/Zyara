// Durable external booking and change operations (M037).
// Every operation requires the certified adapter capability. Outcomes are
// CONFIRMED, FAILED, or UNKNOWN. UNKNOWN outcomes (ambiguous writes) are
// recorded and reconciled — never blind-retried. Cancel and reschedule
// verify the current known state first. No confirmation is returned
// without committed truth from the adapter.

import {
  requireCapability,
  type AdapterCapability,
  type CertifiedAdapter,
} from "@zyara/adapter-harness";

export type ExternalOutcome = "CONFIRMED" | "FAILED" | "UNKNOWN";

export interface ExternalOperation {
  id: string;
  tenantId: string;
  adapterId: string;
  kind: "create" | "cancel" | "reschedule";
  idempotencyKey: string;
  state: ExternalOutcome | "PENDING";
  externalId: string | null;
  attempts: number;
  lastError: string | null;
}

export interface AdapterCallResult {
  outcome: ExternalOutcome;
  externalId: string | null;
  error: string | null;
}

export type AdapterCall = (
  op: ExternalOperation,
) => AdapterCallResult | Promise<AdapterCallResult>;

const CAPABILITY_FOR_KIND: Record<ExternalOperation["kind"], AdapterCapability> = {
  create: "create",
  cancel: "cancel",
  reschedule: "reschedule",
};

export class OperationLog {
  private ops = new Map<string, ExternalOperation>();
  findByKey(tenantId: string, key: string): ExternalOperation | null {
    for (const o of this.ops.values()) {
      if (o.tenantId === tenantId && o.idempotencyKey === key) return o;
    }
    return null;
  }
  get(id: string): ExternalOperation | null {
    return this.ops.get(id) ?? null;
  }
  save(op: ExternalOperation): void {
    this.ops.set(op.id, op);
  }
}

export async function executeOperation(
  log: OperationLog,
  adapter: CertifiedAdapter,
  input: {
    id: string; tenantId: string;
    kind: ExternalOperation["kind"]; idempotencyKey: string;
  },
  call: AdapterCall,
): Promise<ExternalOperation | { error: string }> {
  const gate = requireCapability(adapter, CAPABILITY_FOR_KIND[input.kind]);
  if (!gate.ok) return { error: gate.error };
  const replay = log.findByKey(input.tenantId, input.idempotencyKey);
  if (replay) return replay;
  const op: ExternalOperation = {
    id: input.id, tenantId: input.tenantId, adapterId: adapter.adapterId,
    kind: input.kind, idempotencyKey: input.idempotencyKey,
    state: "PENDING", externalId: null, attempts: 0, lastError: null,
  };
  log.save(op);
  const res = await call(op);
  const done: ExternalOperation = {
    ...op,
    state: res.outcome,
    externalId: res.externalId,
    attempts: 1,
    lastError: res.error,
  };
  log.save(done);
  return done;
}

/**
 * Reconcile an UNKNOWN operation by querying current external truth.
 * Reconcile never re-issues the write; it only records the observed state.
 */
export function reconcileUnknown(
  log: OperationLog,
  opId: string,
  observed: { exists: boolean; externalId: string | null },
  atAttempt: number,
): ExternalOperation | { error: string } {
  const op = log.get(opId);
  if (!op) return { error: `Unknown operation ${opId}.` };
  if (op.state !== "UNKNOWN") return { error: `Operation ${opId} is ${op.state}; nothing to reconcile.` };
  const next: ExternalOperation = {
    ...op,
    state: observed.exists ? "CONFIRMED" : "FAILED",
    externalId: observed.externalId,
    attempts: atAttempt,
    lastError: observed.exists ? null : "reconciled-absent",
  };
  log.save(next);
  return next;
}

export function guardCancel(
  knownState: string,
): { ok: true } | { ok: false; error: string } {
  if (knownState === "CONFIRMED") return { ok: true };
  return { ok: false, error: `Cancel requires a confirmed booking; known state is ${knownState}.` };
}
