// Safe documents and informational medication reminders (M054).
// Child packet M054.1: reminder transport uses consented channels with
// quiet-hour deferral (shared helper) and idempotent keys. Documents are
// stored with scan status and consent. Medication reminders are strictly
// informational: name + time only, never dose changes or clinical advice.
// Any critical medication claim requires a clinician source.

import { effectiveFirstContact, type QuietHours } from "@zyara/waitlist";

export interface PatientDocument {
  docId: string;
  patientId: string;
  kind: string;
  scanStatus: "pending" | "clean" | "infected";
  consented: boolean;
}

export function acceptDocument(
  doc: PatientDocument,
): PatientDocument | { error: string } {
  if (!doc.consented) return { error: `Document ${doc.docId} lacks upload consent.` };
  if (doc.scanStatus === "infected") {
    return { error: `Document ${doc.docId} failed virus scan; quarantined.` };
  }
  if (doc.scanStatus === "pending") {
    return { error: `Document ${doc.docId} awaits scan; not yet available.` };
  }
  return doc;
}

export interface MedicationReminder {
  reminderId: string;
  patientId: string;
  medicationName: string;
  timeLocal: string;
  consentedChannel: string | null;
  clinicianSourced: boolean;
  timeZone: string;
}

export function scheduleReminder(
  reminder: MedicationReminder,
  requestedAtUtc: string,
  quiet: QuietHours,
): { firstContactAtUtc: string; idempotencyKey: string } | { error: string } {
  if (!reminder.consentedChannel) {
    return { error: `Reminder ${reminder.reminderId} has no consented channel.` };
  }
  return {
    firstContactAtUtc: effectiveFirstContact(requestedAtUtc, reminder.timeZone, quiet),
    idempotencyKey: `med-reminder:${reminder.reminderId}:${reminder.consentedChannel}`,
  };
}

/** Informational copy: name + time only. Dose changes are refused. */
export function reminderCopy(
  reminder: MedicationReminder,
): { copy: string } | { error: string } {
  if (!reminder.clinicianSourced && /dose|mg|dosage/i.test(reminder.medicationName)) {
    return { error: "Dose information requires a clinician source; refusing." };
  }
  return { copy: `Reminder: ${reminder.medicationName} at ${reminder.timeLocal}. This is informational only; follow your clinician's instructions.` };
}
