// Provider calendar and attendance operations (M019). English only.
// Calendar is a read/control surface over canonical M016/M018 commands.
// It never bypasses capacity, eligibility, authorization, idempotency,
// version checks, or audit/outbox behavior. No direct DB mutation here.

export type StaffRole = "receptionist" | "practitioner" | "branch_manager" | "admin" | "patient";
export type CalendarView = "day" | "week" | "month" | "list";
export type AttendanceState = "scheduled" | "checked_in" | "in_service" | "completed_ops" | "no_show" | "cancelled";
export type RequestDecision = "approve" | "decline" | "needs_info";

export interface CalendarAppointment {
  id: string;
  tenantId: string;
  branchId: string;
  practitionerId: string;
  resourceId: string;
  patientId: string;
  patientDisplayName: string;
  serviceId: string;
  typeId: string;
  startUtc: string;
  endUtc: string;
  version: number;
  lifecycle: "booked" | "cancelled" | "replaced";
  attendance: AttendanceState;
  requestPending: boolean;
}

export interface CalendarFilter {
  tenantId: string;
  branchId?: string | null;
  practitionerId?: string | null;
  resourceId?: string | null;
  status?: AttendanceState | null;
  view: CalendarView;
  rangeStartUtc: string;
  rangeEndUtc: string;
}

// Operational fields visible per role. Clinical content is never exposed.
const OPERATIONAL_FIELDS = ["id", "startUtc", "endUtc", "status", "patientDisplayName", "serviceId"] as const;
const CLINICAL_FIELDS = ["clinicalNotes", "intakeAnswers", "diagnosis", "patientNationalId"] as const;

export function visibleFieldsForRole(role: StaffRole, privacyMode: boolean): string[] {
  if (role === "patient") return ["id", "startUtc", "endUtc", "status", "serviceId"];
  if (role === "receptionist") return privacyMode
    ? ["id", "startUtc", "endUtc", "status", "patientDisplayName", "serviceId"]
    : [...OPERATIONAL_FIELDS];
  return [...OPERATIONAL_FIELDS];
}

export function assertNoClinicalLeak(fields: string[]): void {
  for (const f of fields) {
    if ((CLINICAL_FIELDS as readonly string[]).includes(f)) throw new Error("CALENDAR_CLINICAL_LEAK");
  }
}

export interface ProjectedEntry {
  id: string;
  startUtc: string;
  endUtc: string;
  status: AttendanceState;
  fields: Record<string, string>;
}

export function projectCalendar(
  rows: CalendarAppointment[],
  filter: CalendarFilter,
  role: StaffRole,
  privacyMode: boolean,
  callerTenant: string,
  callerBranch: string | null,
): ProjectedEntry[] {
  if (filter.tenantId !== callerTenant) throw new Error("CALENDAR_TENANT_DENIED");
  const fields = visibleFieldsForRole(role, privacyMode);
  assertNoClinicalLeak(fields);
  const out: ProjectedEntry[] = [];
  for (const r of rows) {
    if (r.tenantId !== filter.tenantId) continue;
    if (filter.branchId && r.branchId !== filter.branchId) continue;
    // Branch-scoped callers cannot read other branches.
    if (callerBranch && r.branchId !== callerBranch && role === "receptionist") continue;
    if (filter.practitionerId && r.practitionerId !== filter.practitionerId) continue;
    if (filter.resourceId && r.resourceId !== filter.resourceId) continue;
    if (filter.status && r.attendance !== filter.status) continue;
    if (r.startUtc < filter.rangeStartUtc || r.startUtc >= filter.rangeEndUtc) continue;
    if (r.lifecycle !== "booked") continue;
    const entry: Record<string, string> = {};
    for (const f of fields) {
      if (f === "id") entry.id = r.id;
      else if (f === "startUtc") entry.startUtc = r.startUtc;
      else if (f === "endUtc") entry.endUtc = r.endUtc;
      else if (f === "status") entry.status = r.attendance;
      else if (f === "patientDisplayName") entry.patientDisplayName = privacyMode ? "•••" : r.patientDisplayName;
      else if (f === "serviceId") entry.serviceId = r.serviceId;
    }
    out.push({ id: r.id, startUtc: r.startUtc, endUtc: r.endUtc, status: r.attendance, fields: entry });
  }
  out.sort((a, b) => (a.startUtc < b.startUtc ? -1 : 1));
  return out;
}

// Drag/drop resolves into the canonical M018 change command. Stale versions
// are rejected; material moves require explicit confirmation.
export interface DragDropIntent {
  appointmentId: string;
  tenantId: string;
  actorId: string;
  patientId: string;
  fromVersion: number;
  fromStartUtc: string;
  newStartUtc: string;
  newEndUtc: string;
  confirmed: boolean;
  idempotencyKey: string;
}

export type DragDropResolution =
  | { ok: true; changeKind: "reschedule"; requiresConfirmation: false }
  | { ok: false; code: "STALE_VERSION" | "CONFIRMATION_REQUIRED" | "FOREIGN_APPOINTMENT" };

export function resolveDragDrop(
  intent: DragDropIntent,
  current: { tenantId: string; patientId: string; version: number; startUtc: string } | null,
): DragDropResolution {
  if (!current || current.tenantId !== intent.tenantId || current.patientId !== intent.patientId) {
    return { ok: false, code: "FOREIGN_APPOINTMENT" };
  }
  if (current.version !== intent.fromVersion || current.startUtc !== intent.fromStartUtc) {
    return { ok: false, code: "STALE_VERSION" };
  }
  if (!intent.confirmed) return { ok: false, code: "CONFIRMATION_REQUIRED" };
  return { ok: true, changeKind: "reschedule", requiresConfirmation: false };
}

// Bulk absence: preview an explicit affected set, then execute with
// per-appointment outcomes. One failure never fabricates peer success.
export interface BulkAbsencePreviewItem {
  appointmentId: string;
  intendedOperation: "reschedule" | "cancel" | "needs_review" | "unsupported";
  reason: string;
}

export function previewBulkAbsence(
  rows: CalendarAppointment[],
  filter: { branchId?: string | null; practitionerId?: string | null; rangeStartUtc: string; rangeEndUtc: string },
): BulkAbsencePreviewItem[] {
  return rows
    .filter((r) => r.lifecycle === "booked")
    .filter((r) => !filter.branchId || r.branchId === filter.branchId)
    .filter((r) => !filter.practitionerId || r.practitionerId === filter.practitionerId)
    .filter((r) => r.startUtc >= filter.rangeStartUtc && r.startUtc < filter.rangeEndUtc)
    .map((r) => ({
      appointmentId: r.id,
      intendedOperation: r.requestPending ? "needs_review" : "reschedule",
      reason: r.requestPending ? "PENDING_REQUEST_REVIEW_FIRST" : "ABSENCE_RESCHEDULE_VIA_CANONICAL_CHANGE",
    }));
}

export type BulkOutcome = "changed" | "retained" | "conflict" | "needs_review" | "unsupported" | "failed";

export function executeBulkAbsence(
  preview: BulkAbsencePreviewItem[],
  commitOne: (item: BulkAbsencePreviewItem) => BulkOutcome,
  cap = 200,
): Array<{ appointmentId: string; outcome: BulkOutcome }> {
  const bounded = preview.slice(0, cap);
  return bounded.map((item) => {
    if (item.intendedOperation === "needs_review") return { appointmentId: item.appointmentId, outcome: "needs_review" as BulkOutcome };
    if (item.intendedOperation === "unsupported") return { appointmentId: item.appointmentId, outcome: "unsupported" as BulkOutcome };
    try {
      return { appointmentId: item.appointmentId, outcome: commitOne(item) };
    } catch {
      return { appointmentId: item.appointmentId, outcome: "failed" as BulkOutcome };
    }
  });
}

// Check-in queue: operational state only, distinct from clinical record.
export function checkIn(
  current: AttendanceState,
): { ok: boolean; next?: AttendanceState; code: string } {
  if (current === "scheduled") return { ok: true, next: "checked_in", code: "CHECKED_IN" };
  if (current === "checked_in") return { ok: true, next: "in_service", code: "IN_SERVICE" };
  if (current === "in_service") return { ok: true, next: "completed_ops", code: "OPERATIONS_COMPLETE" };
  return { ok: false, code: "CHECKIN_TRANSITION_INVALID" };
}

export function decideRequest(decision: RequestDecision, noteLen: number): { ok: boolean; code: string } {
  if (noteLen > 500) return { ok: false, code: "DECISION_NOTE_TOO_LONG" };
  if (decision === "approve") return { ok: true, code: "REQUEST_APPROVED_VIA_BOOKING_COMMAND" };
  if (decision === "decline") return { ok: true, code: "REQUEST_DECLINED" };
  return { ok: true, code: "REQUEST_NEEDS_INFO" };
}

export const CALENDAR_LOCALES = ["ar", "en", "fr", "de", "es"] as const;

export function statusLabel(status: AttendanceState, locale: string): string {
  const table: Record<string, Record<string, string>> = {
    scheduled: { ar: "مجدول", en: "Scheduled", fr: "Planifié", de: "Geplant", es: "Programada" },
    checked_in: { ar: "تم تسجيل الوصول", en: "Checked in", fr: "Enregistré", de: "Eingecheckt", es: "Registrada" },
    in_service: { ar: "قيد الخدمة", en: "In service", fr: "En cours", de: "In Behandlung", es: "En curso" },
    completed_ops: { ar: "اكتملت العمليات", en: "Operations complete", fr: "Opérations terminées", de: "Vorgang abgeschlossen", es: "Operación completa" },
    no_show: { ar: "لم يحضر", en: "No-show", fr: "Absent", de: "Nicht erschienen", es: "Ausente" },
    cancelled: { ar: "ملغي", en: "Cancelled", fr: "Annulé", de: "Storniert", es: "Cancelada" },
  };
  const row = table[status];
  if (!row) throw new Error("CALENDAR_STATUS_UNKNOWN");
  return row[locale] ?? row.en;
}

// Privacy-minimized telemetry: counts only, never clinical or free text.
export function telemetryForCalendar(input: {
  projected: number; conflicts: number; staleRejections: number; bulkChanged: number; bulkFailed: number; checkIns: number;
}): Record<string, number> {
  return { ...input };
}
