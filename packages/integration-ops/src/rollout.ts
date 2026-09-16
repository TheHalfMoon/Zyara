// Reconciliation, adapter rollout and integration operations (M040).
// Rollout is staged: synthetic validation, then certified capabilities,
// then an explicit production block that only real M028-M030 evidence can
// lift. Reconciliation sweeps UNKNOWN operations against observed truth
// and re-keys external ids without re-issuing writes.

import type { CertifiedAdapter } from "@zyara/adapter-harness";
import {
  OperationLog,
  reconcileUnknown,
  type ExternalOperation,
} from "@zyara/adapter-ops";

export type RolloutStage =
  | "synthetic"
  | "certified"
  | "production-blocked";

export interface RolloutDecision {
  adapterId: string;
  stage: RolloutStage;
  certifiedCapabilities: string[];
  reason: string;
}

export function decideRolloutStage(
  adapter: CertifiedAdapter,
  requiredCapabilities: readonly string[],
  externalValidationComplete: boolean,
): RolloutDecision {
  const certified = [...adapter.certified];
  const missing = requiredCapabilities.filter((c) => !adapter.certified.has(c as never));
  if (missing.length > 0) {
    return {
      adapterId: adapter.adapterId,
      stage: "synthetic",
      certifiedCapabilities: certified as string[],
      reason: `Missing certified capabilities: ${missing.join(",")}.`,
    };
  }
  if (!externalValidationComplete) {
    return {
      adapterId: adapter.adapterId,
      stage: "production-blocked",
      certifiedCapabilities: certified as string[],
      reason: "Capabilities certified; production awaits M028-M030 real evidence.",
    };
  }
  return {
    adapterId: adapter.adapterId,
    stage: "certified",
    certifiedCapabilities: certified as string[],
    reason: "Certified for contracted synthetic/partner scope.",
  };
}

export interface ObservedTruth {
  opId: string;
  exists: boolean;
  externalId: string | null;
}

/** Sweep every UNKNOWN op against observed truth; returns reconciled ids. */
export function sweepUnknown(
  log: OperationLog,
  unknowns: readonly ExternalOperation[],
  observed: readonly ObservedTruth[],
  attempt: number,
): { reconciled: string[]; errors: string[] } {
  const byId = new Map(observed.map((o) => [o.opId, o]));
  const reconciled: string[] = [];
  const errors: string[] = [];
  for (const op of unknowns) {
    const truth = byId.get(op.id);
    if (!truth) {
      errors.push(`No observed truth for ${op.id}; left UNKNOWN.`);
      continue;
    }
    const res = reconcileUnknown(
      log,
      op.id,
      { exists: truth.exists, externalId: truth.externalId },
      attempt,
    );
    if ("error" in res) errors.push(res.error);
    else reconciled.push(op.id);
  }
  return { reconciled, errors };
}

/** Re-key an external id after vendor-side key change; audited, no rewrite. */
export function rekeyExternalId(
  log: OperationLog,
  opId: string,
  oldExternalId: string,
  newExternalId: string,
): ExternalOperation | { error: string } {
  const op = log.get(opId);
  if (!op) return { error: `Unknown operation ${opId}.` };
  if (op.externalId !== oldExternalId) {
    return { error: `Re-key mismatch: expected ${oldExternalId}.` };
  }
  const next: ExternalOperation = { ...op, externalId: newExternalId };
  log.save(next);
  return next;
}
