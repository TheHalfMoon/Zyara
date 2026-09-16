// First negotiated FHIR scheduling adapter, synthetic counterpart (M038).
// Maps FHIR R4 Slot/Appointment to Zyara scheduling truth with strict
// reference, status and time handling. Unknown extensions are tolerated
// and preserved; invalid resources and missing identifiers are rejected
// with typed errors. No production EHR claim.

export type FhirAppointmentStatus =
  | "proposed" | "pending" | "booked" | "arrived" | "fulfilled"
  | "cancelled" | "noshow" | "entered-in-error" | "checked-in"
  | "waitlist";

export type ZyaraSlotState = "free" | "busy" | "busy-unavailable";

export interface FhirSlot {
  resourceType: "Slot";
  id?: string;
  status: "busy" | "free" | "busy-unavailable" | "busy-tentative" | "entered-in-error";
  start: string;
  end: string;
  extension?: Array<{ url: string; valueString?: string }>;
}

export interface FhirAppointment {
  resourceType: "Appointment";
  id?: string;
  status: FhirAppointmentStatus;
  start?: string;
  end?: string;
  participant?: Array<{ actor?: { reference?: string }; status?: string }>;
  extension?: Array<{ url: string; valueString?: string }>;
}

export interface MappedSlot {
  externalId: string;
  state: ZyaraSlotState;
  startUtc: string;
  endUtc: string;
  preservedExtensions: string[];
}

export type MapError =
  | "MISSING_ID"
  | "INVALID_TIME"
  | "ENTERED_IN_ERROR"
  | "MISSING_PARTICIPANT_REFERENCE";

export function mapSlot(
  slot: FhirSlot,
): MappedSlot | { error: MapError; message: string } {
  if (!slot.id) return { error: "MISSING_ID", message: "Slot without id cannot be keyed." };
  const start = Date.parse(slot.start);
  const end = Date.parse(slot.end);
  if (Number.isNaN(start) || Number.isNaN(end) || start >= end) {
    return { error: "INVALID_TIME", message: `Slot ${slot.id} has invalid time range.` };
  }
  if (slot.status === "entered-in-error") {
    return { error: "ENTERED_IN_ERROR", message: `Slot ${slot.id} is entered-in-error.` };
  }
  const state: ZyaraSlotState =
    slot.status === "free" ? "free" : "busy-unavailable";
  return {
    externalId: slot.id,
    state,
    startUtc: new Date(start).toISOString(),
    endUtc: new Date(end).toISOString(),
    preservedExtensions: (slot.extension ?? []).map((e) => e.url),
  };
}

export type ZyaraAppointmentState =
  | "booked" | "cancelled" | "fulfilled" | "noshow" | "proposed";

export function mapAppointmentStatus(
  status: FhirAppointmentStatus,
): ZyaraAppointmentState | { error: MapError; message: string } {
  switch (status) {
    case "booked":
    case "checked-in":
    case "arrived":
      return "booked";
    case "fulfilled":
      return "fulfilled";
    case "cancelled":
      return "cancelled";
    case "noshow":
      return "noshow";
    case "proposed":
    case "pending":
    case "waitlist":
      return "proposed";
    case "entered-in-error":
      return { error: "ENTERED_IN_ERROR", message: "Appointment entered-in-error." };
  }
}

export function validateAppointmentReferences(
  appt: FhirAppointment,
): { ok: true } | { error: MapError; message: string } {
  if (!appt.id) return { error: "MISSING_ID", message: "Appointment without id." };
  const refs = (appt.participant ?? []).map((p) => p.actor?.reference).filter(Boolean);
  if (refs.length === 0) {
    return { error: "MISSING_PARTICIPANT_REFERENCE", message: `Appointment ${appt.id} has no actor reference.` };
  }
  return { ok: true };
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

/** Cursor pagination over a synthetic collection (tombstones omitted). */
export function paginate<T extends { externalId: string }>(
  sorted: readonly T[],
  cursor: string | null,
  limit: number,
): Page<T> {
  const start = cursor ? sorted.findIndex((i) => i.externalId === cursor) + 1 : 0;
  const items = sorted.slice(Math.max(0, start), Math.max(0, start) + limit);
  const last = items[items.length - 1];
  const nextCursor =
    last && Math.max(0, start) + limit < sorted.length ? last.externalId : null;
  return { items, nextCursor };
}
