// Provider monthly reports and B2B entitlements (M025). English only.
//
// Clinics pay for operations value, never for ranking. Subscription state
// is structurally separated from rank and review inputs: no function here
// accepts or returns a score modifier. Lapsed billing preserves existing
// patient appointment access; only commercial extras suspend. Reports
// reconcile to M024 metric fixtures and carry coverage plus exactly three
// source-derived operational recommendations. Manual B2B invoice tracking
// precedes any payment automation. No patient fee or commission exists.

import type { FunnelTotals } from "@zyara/analytics";

export type SubscriptionState = "trial" | "active" | "past_due" | "lapsed";
export type Entitlement = "reports" | "multi_branch" | "api_access" | "priority_support";

const PLAN_ENTITLEMENTS: Record<Exclude<SubscriptionState, "lapsed">, Entitlement[]> = {
  trial: ["reports"],
  active: ["reports", "multi_branch", "api_access", "priority_support"],
  past_due: ["reports"],
};

export function entitlementsFor(state: SubscriptionState): Entitlement[] {
  if (state === "lapsed") return [];
  return [...PLAN_ENTITLEMENTS[state]];
}

/**
 * Appointment continuity is independent of billing: existing patient
 * appointments remain accessible in every subscription state.
 */
export function appointmentAccessPreserved(state: SubscriptionState): boolean {
  void state;
  return true;
}

export interface MonthlyReport {
  tenantId: string;
  monthUtc: string;
  totals: FunnelTotals;
  coverage: string;
  recommendations: [string, string, string];
  entitlements: Entitlement[];
  subscription: SubscriptionState;
}

/** Exactly three source-derived operational recommendations, no paid boost. */
export function buildRecommendations(totals: FunnelTotals): [string, string, string] {
  const recs: string[] = [];
  const known = totals.completed + totals.noShow;
  if (known > 0 && totals.noShow / known > 0.15) {
    recs.push("High no-show share: confirm reminders and overbooking policy with staff.");
  } else {
    recs.push("Attendance is stable: keep the current reminder schedule.");
  }
  if (totals.requests > totals.committed) {
    recs.push("Request backlog exceeds instant bookings: review request triage capacity.");
  } else {
    recs.push("Booking mix is healthy: keep availability windows as configured.");
  }
  const changes = totals.cancelled + totals.rescheduled;
  if (changes > 0 && totals.rescheduled / changes < 0.5) {
    recs.push("Low reschedule retention: offer alternatives before cancelling.");
  } else {
    recs.push("Change handling retains care: keep the alternatives-first flow.");
  }
  return [recs[0], recs[1], recs[2]];
}

export function buildMonthlyReport(args: {
  tenantId: string; monthUtc: string; totals: FunnelTotals; subscription: SubscriptionState;
}): MonthlyReport {
  return {
    tenantId: args.tenantId,
    monthUtc: args.monthUtc,
    totals: { ...args.totals },
    coverage: "native bookings and attendance evidence; unknown outcomes reported separately",
    recommendations: buildRecommendations(args.totals),
    entitlements: entitlementsFor(args.subscription),
    subscription: args.subscription,
  };
}

export interface ManualInvoice {
  id: string;
  tenantId: string;
  monthUtc: string;
  amountSar: number;
  state: "issued" | "paid" | "void";
}

/** Manual B2B invoice tracking. No automated charging exists in this task. */
export function recordInvoicePayment(invoice: ManualInvoice): ManualInvoice {
  if (invoice.state !== "issued") throw new Error("COMMERCE_INVOICE_STATE");
  if (invoice.amountSar < 0) throw new Error("COMMERCE_AMOUNT_INVALID");
  return { ...invoice, state: "paid" };
}

/** SAR currency formatting for supplied monetary values only. */
export function formatSar(amountSar: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "SAR" }).format(amountSar);
}

export const COMMERCE_LOCALES = ["ar", "en", "fr", "de", "es"] as const;

export function reportTitle(locale: string): string {
  const table: Record<string, string> = {
    ar: "التقرير الشهري للعيادة",
    en: "Clinic monthly report",
    fr: "Rapport mensuel de la clinique",
    de: "Monatlicher Klinikbericht",
    es: "Informe mensual de la clínica",
  };
  return table[locale] ?? table.en;
}

/** Counts only: report usage, subscription changes, support cost fields. */
export function telemetryForCommerce(input: {
  reports: number; stateChanges: number;
}): Record<string, number> {
  return { ...input };
}
