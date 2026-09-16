// Attendance evidence and review eligibility (M021). English only.
//
// A review needs defensible attendance without allowing provider
// suppression. Evidence records source, actor, and confidence; corrections
// supersede rather than erase. Eligibility derives from evidence, never
// from reminder delivery. Disputes route to an independent reviewer path,
// never to the provider under review or to sales authority.

export type AttendanceOutcome = "completed" | "no_show" | "unknown";
export type EvidenceSource = "provider_checkin" | "reception" | "imported" | "patient_dispute" | "reviewer_correction";
export type ActorRole = "provider" | "receptionist" | "system" | "patient" | "trust_reviewer" | "importer";

export interface AttendanceEvidence {
  id: string;
  tenantId: string;
  appointmentId: string;
  patientId: string;
  outcome: AttendanceOutcome;
  source: EvidenceSource;
  actorRole: ActorRole;
  actorId: string;
  confidence: number;
  recordedAtUtc: string;
  superseded: boolean;
  provenance: string | null;
}

export interface EligibilityDecision {
  appointmentId: string;
  patientId: string;
  eligible: boolean;
  code: string;
  evidenceId: string | null;
}

export function recordEvidence(
  existing: AttendanceEvidence[],
  next: Omit<AttendanceEvidence, "superseded">,
  nextId: string,
): AttendanceEvidence[] {
  if (next.confidence < 0 || next.confidence > 1) throw new Error("ATTENDANCE_CONFIDENCE_INVALID");
  if (!next.tenantId || !next.appointmentId || !next.patientId) throw new Error("ATTENDANCE_PARTY_INVALID");
  // Imported attendance must carry provenance for matching review.
  if (next.source === "imported" && !next.provenance) throw new Error("ATTENDANCE_PROVENANCE_REQUIRED");
  // Cross-patient evidence injection is rejected: same appointment id must
  // always reference the same patient.
  for (const e of existing) {
    if (e.appointmentId === next.appointmentId && e.patientId !== next.patientId) {
      throw new Error("ATTENDANCE_PATIENT_MISMATCH");
    }
  }
  const updated = existing.map((e) =>
    e.appointmentId === next.appointmentId && !e.superseded ? { ...e, superseded: true } : e,
  );
  updated.push({ ...next, id: nextId, superseded: false });
  return updated;
}

/** Current (non-superseded) evidence per appointment. */
export function currentEvidenceFor(
  all: AttendanceEvidence[],
  appointmentId: string,
): AttendanceEvidence | null {
  const rows = all.filter((e) => e.appointmentId === appointmentId && !e.superseded);
  if (rows.length === 0) return null;
  if (rows.length > 1) throw new Error("ATTENDANCE_AMBIGUOUS_CURRENT");
  return rows[0];
}

/**
 * One-visit review eligibility. Only completed attendance with a current
 * evidence record grants eligibility, exactly once per appointment.
 * Reminder delivery, no-show, and unknown outcomes never grant it.
 */
export function deriveEligibility(
  evidence: AttendanceEvidence | null,
  alreadyGrantedFor: Set<string>,
  reminderDelivered: boolean,
): EligibilityDecision {
  void reminderDelivered;
  if (!evidence) {
    return { appointmentId: "", patientId: "", eligible: false, code: "NO_EVIDENCE", evidenceId: null };
  }
  if (evidence.outcome !== "completed") {
    return {
      appointmentId: evidence.appointmentId, patientId: evidence.patientId,
      eligible: false, code: evidence.outcome === "no_show" ? "NO_SHOW_INELIGIBLE" : "UNKNOWN_INELIGIBLE",
      evidenceId: evidence.id,
    };
  }
  if (alreadyGrantedFor.has(evidence.appointmentId)) {
    return {
      appointmentId: evidence.appointmentId, patientId: evidence.patientId,
      eligible: false, code: "DUPLICATE_VISIT", evidenceId: evidence.id,
    };
  }
  return {
    appointmentId: evidence.appointmentId, patientId: evidence.patientId,
    eligible: true, code: "ELIGIBLE_ONE_VISIT", evidenceId: evidence.id,
  };
}

export type DisputeOutcome = "upheld" | "corrected" | "rejected";

export interface AttendanceDispute {
  id: string;
  appointmentId: string;
  patientId: string;
  raisedBy: "patient" | "provider";
  reason: string;
  reviewer: ActorRole;
  outcome: DisputeOutcome | null;
}

/**
 * Independent evidence review. Provider no-show labels can be appealed by
 * the patient; the reviewer must be a trust reviewer, never the provider
 * under review and never sales. A correction supersedes the evidence and
 * the caller re-derives eligibility.
 */
export function reviewDispute(
  dispute: AttendanceDispute,
  reviewerRole: ActorRole,
  decision: DisputeOutcome,
): AttendanceDispute {
  if (reviewerRole !== "trust_reviewer") throw new Error("ATTENDANCE_REVIEWER_SEPARATION");
  if (dispute.reason.length > 500) throw new Error("ATTENDANCE_DISPUTE_NOTE_TOO_LONG");
  return { ...dispute, reviewer: reviewerRole, outcome: decision };
}

export const ATTENDANCE_LOCALES = ["ar", "en", "fr", "de", "es"] as const;

export function eligibilityText(eligible: boolean, locale: string): string {
  const table: Record<string, Record<string, string>> = {
    eligible: {
      ar: "يمكنك مشاركة تجربتك حول هذه الزيارة.",
      en: "You may share your experience of this visit.",
      fr: "Vous pouvez partager votre expérience de cette visite.",
      de: "Sie können Ihre Erfahrung mit diesem Besuch teilen.",
      es: "Puede compartir su experiencia de esta visita.",
    },
    ineligible: {
      ar: "لا تتوفر مراجعة لهذه الزيارة حاليا.",
      en: "No review is available for this visit right now.",
      fr: "Aucun avis n’est disponible pour cette visite pour le moment.",
      de: "Für diesen Besuch ist derzeit keine Bewertung verfügbar.",
      es: "No hay reseña disponible para esta visita por ahora.",
    },
  };
  const row = eligible ? table.eligible : table.ineligible;
  return row[locale] ?? row.en;
}

/** Non-accusatory no-show wording across locales. */
export function noShowText(locale: string): string {
  const table: Record<string, string> = {
    ar: "تم تسجيل عدم الحضور. يمكنك طلب مراجعة إذا كان هذا غير صحيح.",
    en: "Recorded as not attended. You may request a review if this is incorrect.",
    fr: "Enregistré comme non présenté. Vous pouvez demander un réexamen si c’est inexact.",
    de: "Als nicht wahrgenommen erfasst. Sie können eine Überprüfung anfordern, falls dies nicht stimmt.",
    es: "Registrado como no asistida. Puede solicitar una revisión si no es correcto.",
  };
  return table[locale] ?? table.en;
}

/** Counts only: unknown coverage, disputes, correction rate inputs. */
export function telemetryForAttendance(input: {
  unknown: number; disputes: number; corrections: number; eligible: number;
}): Record<string, number> {
  return { ...input };
}
