// Legacy SIU ingestion and batch/calendar fallback (M039).
// Child packet M039.1: SIU S12 transport parse. Synthetic-only; no live
// HL7 feed. ACK classes: AA (accept), AE (error), AR (reject). Unknown
// segments are tolerated; structurally invalid messages are rejected.
// Fallback modes are honest: batch import and calendar reads never create
// fake holds and never act as clinical eligibility authority.

export type AckCode = "AA" | "AE" | "AR";

export interface SiuAppointment {
  messageControlId: string;
  eventType: string;
  patientId: string;
  scheduleId: string;
  startUtc: string;
  endUtc: string;
  fillerAppointmentId: string | null;
}

export type SiuError =
  | "MISSING_MSH"
  | "MISSING_SCH"
  | "MISSING_PID"
  | "BAD_EVENT"
  | "INVALID_TIME";

function segmentMap(message: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const line of message.split(/\r\n|\r|\n/)) {
    const seg = line.trim();
    if (seg.length < 3) continue;
    const name = seg.slice(0, 3);
    if (!map.has(name)) map.set(name, []);
    map.get(name)?.push(seg);
  }
  return map;
}

function field(seg: string, index: number): string {
  return (seg.split("|")[index] ?? "").trim();
}

export function parseSiuS12(
  message: string,
): SiuAppointment | { error: SiuError; message: string } {
  const segs = segmentMap(message);
  const msh = segs.get("MSH")?.[0];
  if (!msh) return { error: "MISSING_MSH", message: "SIU message lacks MSH." };
  const controlId = field(msh, 9) || field(msh, 8);
  const evn = segs.get("EVN")?.[0];
  const eventType = evn ? field(evn, 1) : "S12";
  if (eventType !== "S12") {
    return { error: "BAD_EVENT", message: `Expected S12, got ${eventType}.` };
  }
  const pid = segs.get("PID")?.[0];
  if (!pid) return { error: "MISSING_PID", message: "SIU message lacks PID." };
  const sch = segs.get("SCH")?.[0];
  if (!sch) return { error: "MISSING_SCH", message: "SIU message lacks SCH." };
  const startRaw = field(sch, 3);
  const endRaw = field(sch, 4);
  const start = Date.parse(startRaw);
  const end = Date.parse(endRaw);
  if (Number.isNaN(start) || Number.isNaN(end) || start >= end) {
    return { error: "INVALID_TIME", message: "SCH has invalid time range." };
  }
  return {
    messageControlId: controlId || "unknown",
    eventType,
    patientId: field(pid, 3) || field(pid, 2),
    scheduleId: field(sch, 1),
    startUtc: new Date(start).toISOString(),
    endUtc: new Date(end).toISOString(),
    fillerAppointmentId: field(sch, 2) || null,
  };
}

export function buildAck(
  controlId: string,
  code: AckCode,
  text: string,
): string {
  return [
    `MSH|^~\\&|ZYARA|ZYARA|LEGACY|LEGACY|${new Date().toISOString()}||ACK|${controlId}|P|2.5`,
    `MSA|${code}|${controlId}|${text}`,
  ].join("\r");
}

export type FallbackMode = "batch-import" | "calendar-read";

export interface FallbackResult {
  mode: FallbackMode;
  honestInvitationOnly: boolean;
  createsHold: boolean;
  clinicalAuthority: boolean;
  note: string;
}

/** Fallback modes never create holds and never carry clinical authority. */
export function fallbackSemantics(mode: FallbackMode): FallbackResult {
  return {
    mode,
    honestInvitationOnly: true,
    createsHold: false,
    clinicalAuthority: false,
    note:
      mode === "batch-import"
        ? "Batch rows are requests; availability invitations only."
        : "Calendar reads inform display; booking needs authoritative path.",
  };
}
