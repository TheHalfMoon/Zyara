// Preference-aware waitlist enrollment (M031).
// Enrollment never cancels the original visit. Preferences distinguish hard
// constraints from acceptable alternatives. Priority is an explicit
// clinician-set band plus FIFO within band; no opaque no-show or
// revenue-based scoring exists anywhere in this module.

export interface PreferenceWindow {
  /** IANA timezone for interpreting local window fields. */
  timeZone: string;
  /** Local HH:MM 24h bounds, e.g. "08:00". At least one window required. */
  windows: Array<{ startLocal: string; endLocal: string }>;
  /** ISO weekday numbers 1 (Mon) - 7 (Sun) allowed; default all days. */
  weekdays?: number[];
}

export interface ClinicianPreference {
  /** Hard-required clinician ids; empty means no hard clinician constraint. */
  required: string[];
  /** Acceptable alternates when required clinicians are unavailable. */
  alternates: string[];
}

export interface LocationPreference {
  required: string[];
  alternates: string[];
}

export type ContactChannel = "sms" | "email" | "whatsapp" | "push";

export interface ChannelConsent {
  channel: ContactChannel;
  consented: boolean;
}

/** Clinician-set priority band. Lower rank = earlier consideration. */
export type PriorityBand = "urgent-clinical" | "time-sensitive" | "routine";

export const PRIORITY_BAND_RANK: Record<PriorityBand, number> = {
  "urgent-clinical": 0,
  "time-sensitive": 1,
  routine: 2,
};

export interface EnrollmentRequest {
  tenantId: string;
  patientId: string;
  /** Original booked appointment that must be preserved. */
  originalAppointmentId: string;
  serviceId: string;
  typeId: string;
  window: PreferenceWindow;
  clinicians: ClinicianPreference;
  locations: LocationPreference;
  accessibilityNeeds: string[];
  language: string;
  consents: ChannelConsent[];
  /** Explicit permission to auto-switch booking on accepted offer. */
  allowAutoSwitch: boolean;
  /** Client-supplied idempotency key, opaque, max 128 chars. */
  idempotencyKey: string;
  priorityBand: PriorityBand;
  /** Reason the clinician set this band; required for auditability. */
  priorityReason: string;
}

export interface EnrollmentRecord {
  id: string;
  tenantId: string;
  patientId: string;
  originalAppointmentId: string;
  serviceId: string;
  typeId: string;
  window: PreferenceWindow;
  clinicians: ClinicianPreference;
  locations: LocationPreference;
  accessibilityNeeds: string[];
  language: string;
  consents: ChannelConsent[];
  allowAutoSwitch: boolean;
  idempotencyKey: string;
  priorityBand: PriorityBand;
  priorityReason: string;
  /** Monotonic FIFO tiebreak within a band (ISO instant + sequence). */
  enrolledAtUtc: string;
  sequence: number;
  state: "waiting" | "offered" | "fulfilled" | "withdrawn" | "expired";
}

export interface EnrollmentRejection {
  ok: false;
  code:
    | "EMPTY_IDEMPOTENCY_KEY"
    | "IDEMPOTENCY_KEY_TOO_LONG"
    | "MISSING_WINDOW"
    | "BAD_TIME_FORMAT"
    | "BAD_TIMEZONE"
    | "NO_CONSENTED_CHANNEL"
    | "MISSING_PRIORITY_REASON"
    | "OVERLAPPING_CLINICIAN_SETS"
    | "OVERLAPPING_LOCATION_SETS"
    | "DUPLICATE_ENROLLMENT";
  message: string;
}

export type EnrollmentValidation = { ok: true } | EnrollmentRejection;

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function hasConsentedChannel(consents: ChannelConsent[]): boolean {
  return consents.some((c) => c.consented);
}

function overlaps(a: string[], b: string[]): string[] {
  const inB = new Set(b);
  return a.filter((x) => inB.has(x));
}

export function validateEnrollmentRequest(
  req: EnrollmentRequest,
  existingIdempotencyKeys: ReadonlySet<string>,
): EnrollmentValidation {
  if (!req.idempotencyKey || req.idempotencyKey.length === 0) {
    return {
      ok: false,
      code: "EMPTY_IDEMPOTENCY_KEY",
      message: "Idempotency key is required.",
    };
  }
  if (req.idempotencyKey.length > 128) {
    return {
      ok: false,
      code: "IDEMPOTENCY_KEY_TOO_LONG",
      message: "Idempotency key must be at most 128 chars.",
    };
  }
  if (existingIdempotencyKeys.has(req.idempotencyKey)) {
    return {
      ok: false,
      code: "DUPLICATE_ENROLLMENT",
      message: "Duplicate enrollment for this idempotency key.",
    };
  }
  if (!req.window || req.window.windows.length === 0) {
    return {
      ok: false,
      code: "MISSING_WINDOW",
      message: "At least one date/time window is required.",
    };
  }
  try {
    Intl.DateTimeFormat(undefined, { timeZone: req.window.timeZone });
  } catch {
    return {
      ok: false,
      code: "BAD_TIMEZONE",
      message: "Unknown IANA timezone.",
    };
  }
  for (const w of req.window.windows) {
    if (!TIME_RE.test(w.startLocal) || !TIME_RE.test(w.endLocal)) {
      return {
        ok: false,
        code: "BAD_TIME_FORMAT",
        message: "Window bounds must be local HH:MM.",
      };
    }
    if (w.startLocal >= w.endLocal) {
      return {
        ok: false,
        code: "BAD_TIME_FORMAT",
        message: "Window start must be before window end.",
      };
    }
  }
  if (!hasConsentedChannel(req.consents)) {
    return {
      ok: false,
      code: "NO_CONSENTED_CHANNEL",
      message: "At least one consented contact channel is required.",
    };
  }
  if (!req.priorityReason || req.priorityReason.trim().length === 0) {
    return {
      ok: false,
      code: "MISSING_PRIORITY_REASON",
      message: "Priority band requires a recorded clinician reason.",
    };
  }
  const dupClin = overlaps(req.clinicians.required, req.clinicians.alternates);
  if (dupClin.length > 0) {
    return {
      ok: false,
      code: "OVERLAPPING_CLINICIAN_SETS",
      message: `Clinicians cannot be both required and alternate: ${dupClin.join(",")}.`,
    };
  }
  const dupLoc = overlaps(req.locations.required, req.locations.alternates);
  if (dupLoc.length > 0) {
    return {
      ok: false,
      code: "OVERLAPPING_LOCATION_SETS",
      message: `Locations cannot be both required and alternate: ${dupLoc.join(",")}.`,
    };
  }
  return { ok: true };
}

/**
 * Deterministic ordering: priority band rank first, then enrolledAtUtc,
 * then sequence. FIFO is preserved inside equivalent bands.
 */
export function compareEnrollments(
  a: EnrollmentRecord,
  b: EnrollmentRecord,
): number {
  const band = PRIORITY_BAND_RANK[a.priorityBand] - PRIORITY_BAND_RANK[b.priorityBand];
  if (band !== 0) return band;
  if (a.enrolledAtUtc !== b.enrolledAtUtc) {
    return a.enrolledAtUtc < b.enrolledAtUtc ? -1 : 1;
  }
  return a.sequence - b.sequence;
}

export function sortWaitlist(
  entries: readonly EnrollmentRecord[],
): EnrollmentRecord[] {
  return [...entries].sort(compareEnrollments);
}

export interface PriorityOverrideAudit {
  enrollmentId: string;
  actorId: string;
  fromBand: PriorityBand;
  toBand: PriorityBand;
  reason: string;
  atUtc: string;
}

export function auditPriorityOverride(
  entry: EnrollmentRecord,
  actorId: string,
  toBand: PriorityBand,
  reason: string,
  atUtc: string,
): { entry: EnrollmentRecord; audit: PriorityOverrideAudit } | { error: string } {
  if (!reason || reason.trim().length === 0) {
    return { error: "Priority override requires a recorded reason." };
  }
  const audit: PriorityOverrideAudit = {
    enrollmentId: entry.id,
    actorId,
    fromBand: entry.priorityBand,
    toBand,
    reason,
    atUtc,
  };
  return { entry: { ...entry, priorityBand: toBand, priorityReason: reason }, audit };
}
