// Consented recall and recovery campaigns (M034).
// A campaign fans out from active, unsuppressed M033 plans. Each recipient
// needs an explicit consented channel; first contact defers past quiet
// hours; per-recipient idempotency keys prevent duplicates; stop
// conditions and declines halt further outreach. Event payloads carry plan
// and campaign ids only — never clinical free text.

import { suppressesWork, type RecallPlan } from "@zyara/recall-plans";
import {
  effectiveFirstContact,
  type QuietHours,
} from "@zyara/waitlist";

export interface CampaignTarget {
  plan: RecallPlan;
  patientId: string;
  timeZone: string;
  consentedChannel: string | null;
  declined: boolean;
}

export interface CampaignRun {
  id: string;
  tenantId: string;
  template: string;
  stopConditions: string[];
  stopped: boolean;
  stopReason: string | null;
}

export interface OutreachTask {
  idempotencyKey: string;
  campaignId: string;
  planId: string;
  patientId: string;
  channel: string;
  firstContactAtUtc: string;
}

export function planEligibleForCampaign(
  target: CampaignTarget,
  run: CampaignRun,
): { eligible: boolean; reason: string } {
  if (run.stopped) return { eligible: false, reason: "campaign-stopped" };
  if (target.plan.state !== "active") {
    return { eligible: false, reason: `plan-${target.plan.state}` };
  }
  if (suppressesWork(target.plan)) {
    return { eligible: false, reason: "plan-suppressed" };
  }
  if (target.declined) return { eligible: false, reason: "patient-declined" };
  if (!target.consentedChannel) {
    return { eligible: false, reason: "no-consented-channel" };
  }
  return { eligible: true, reason: "eligible" };
}

export function enqueueCampaign(
  run: CampaignRun,
  targets: readonly CampaignTarget[],
  requestedAtUtc: string,
  quiet: QuietHours,
  issuedKeys: ReadonlySet<string>,
): { tasks: OutreachTask[]; skipped: Array<{ planId: string; reason: string }> } {
  const tasks: OutreachTask[] = [];
  const skipped: Array<{ planId: string; reason: string }> = [];
  const seen = new Set<string>(issuedKeys);
  for (const t of targets) {
    const check = planEligibleForCampaign(t, run);
    if (!check.eligible) {
      skipped.push({ planId: t.plan.id, reason: check.reason });
      continue;
    }
    const key = `${run.id}:${t.plan.id}:${t.consentedChannel}`;
    if (seen.has(key)) {
      skipped.push({ planId: t.plan.id, reason: "duplicate-suppressed" });
      continue;
    }
    seen.add(key);
    tasks.push({
      idempotencyKey: key,
      campaignId: run.id,
      planId: t.plan.id,
      patientId: t.patientId,
      channel: t.consentedChannel as string,
      firstContactAtUtc: effectiveFirstContact(
        requestedAtUtc,
        t.timeZone,
        quiet,
      ),
    });
  }
  return { tasks, skipped };
}

export function applyStopCondition(
  run: CampaignRun,
  condition: string,
  reason: string,
): CampaignRun {
  if (!run.stopConditions.includes(condition)) return run;
  return { ...run, stopped: true, stopReason: reason };
}
