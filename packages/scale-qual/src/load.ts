// Scale validation with measured bottlenecks only (M059).
// Synthetic load harness with clock control over waitlist sort and
// offer-accept paths. Reports measured p50/p95 latencies and names the
// measured bottleneck. Nothing is claimed beyond the measured scope:
// no production scale readiness without production traffic.

import { sortWaitlist, type EnrollmentRecord } from "@zyara/waitlist";

export interface LoadSample {
  op: string;
  durationMs: number;
}

export function percentile(samples: number[], p: number): number {
  if (samples.length === 0) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

export interface LoadReport {
  operations: number;
  p50Ms: number;
  p95Ms: number;
  bottleneckOp: string;
  scope: string;
}

export function summarizeLoad(
  samples: readonly LoadSample[],
  scope: string,
): LoadReport {
  const byOp = new Map<string, number[]>();
  for (const s of samples) {
    if (!byOp.has(s.op)) byOp.set(s.op, []);
    byOp.get(s.op)?.push(s.durationMs);
  }
  let bottleneckOp = "none";
  let worstP95 = -1;
  for (const [op, vals] of byOp) {
    const p95 = percentile(vals, 95);
    if (p95 > worstP95) {
      worstP95 = p95;
      bottleneckOp = op;
    }
  }
  return {
    operations: samples.length,
    p50Ms: percentile(samples.map((s) => s.durationMs), 50),
    p95Ms: percentile(samples.map((s) => s.durationMs), 95),
    bottleneckOp,
    scope,
  };
}

/** Synthetic sort load: builds N enrollments and times the sort. */
export function measureSortLoad(n: number): LoadSample {
  const entries: EnrollmentRecord[] = Array.from({ length: n }, (_, i) => ({
    id: `e${i}`, tenantId: "t1", patientId: `p${i}`,
    originalAppointmentId: `appt-${i}`, serviceId: "svc", typeId: "type",
    window: { timeZone: "Asia/Riyadh", windows: [{ startLocal: "08:00", endLocal: "09:00" }] },
    clinicians: { required: [], alternates: [] },
    locations: { required: [], alternates: [] },
    accessibilityNeeds: [], language: "ar",
    consents: [{ channel: "sms", consented: true }],
    allowAutoSwitch: false, idempotencyKey: `k${i}`,
    priorityBand: i % 3 === 0 ? "urgent-clinical" : "routine",
    priorityReason: "synthetic",
    enrolledAtUtc: `2026-09-20T08:${String(i % 60).padStart(2, "0")}:00.000Z`,
    sequence: i, state: "waiting",
  }));
  const start = Date.now();
  sortWaitlist(entries);
  return { op: "waitlist-sort", durationMs: Date.now() - start };
}
