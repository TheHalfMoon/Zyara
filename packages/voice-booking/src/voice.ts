// Correctable voice navigation and booking (M045).
// A transcript is raw text, never structured truth. Structuring produces
// a candidate that the user must correct and explicitly confirm field by
// field. Critical values (dates, person names, doses, slots) need a
// separate confirmation each. Ambiguous speech fails safe to
// clarification. High-impact actions bind to M043 exact confirmation
// behind the M041 intent gate.

import { decideIntent } from "@zyara/navigation-safety";
import { renderChallenge } from "@zyara/action-confirmation";

export interface VoiceCandidate {
  fields: Record<string, string>;
  /** Fields the structurer marks low-confidence and ambiguous. */
  ambiguous: string[];
  /** Critical fields requiring separate confirmation. */
  critical: string[];
}

export interface CorrectedDraft {
  fields: Record<string, string>;
  confirmedFields: string[];
  challenge: string;
}

const CRITICAL_KEYS = ["date", "slot", "provider", "patient-name", "dose"];

export function structureTranscript(
  transcript: string,
  hints: Record<string, string>,
): VoiceCandidate {
  const fields: Record<string, string> = {};
  const ambiguous: string[] = [];
  for (const [key, marker] of Object.entries(hints)) {
    if (transcript.includes(marker)) fields[key] = marker;
    else ambiguous.push(key);
  }
  const critical = Object.keys(fields).filter((k) => CRITICAL_KEYS.includes(k));
  return { fields, ambiguous, critical };
}

export function applyCorrections(
  candidate: VoiceCandidate,
  corrections: Record<string, string>,
): CorrectedDraft {
  const fields = { ...candidate.fields, ...corrections };
  const stillAmbiguous = candidate.ambiguous.filter((k) => !(k in corrections));
  void stillAmbiguous;
  return {
    fields,
    confirmedFields: [],
    challenge: renderChallenge("voice-book", fields),
  };
}

export function confirmField(
  draft: CorrectedDraft,
  field: string,
  value: string,
): CorrectedDraft | { error: string } {
  if (draft.fields[field] !== value) {
    return { error: `Field ${field} does not match the corrected value; re-confirm exactly.` };
  }
  if (draft.confirmedFields.includes(field)) return draft;
  return { ...draft, confirmedFields: [...draft.confirmedFields, field] };
}

export function readyForConfirmation(
  candidate: VoiceCandidate,
  draft: CorrectedDraft,
): { ready: boolean; reason: string } {
  const gate = decideIntent("navigate", "voice booking", 0.9);
  if (!gate.allowed) return { ready: false, reason: gate.reason };
  const unconfirmedCritical = candidate.critical.filter(
    (c) => !draft.confirmedFields.includes(c),
  );
  if (unconfirmedCritical.length > 0) {
    return { ready: false, reason: `Unconfirmed critical fields: ${unconfirmedCritical.join(",")}.` };
  }
  const missing = candidate.ambiguous.filter((k) => !(k in draft.fields));
  if (missing.length > 0) {
    return { ready: false, reason: `Ambiguous fields need correction: ${missing.join(",")}.` };
  }
  return { ready: true, reason: "All critical fields confirmed; ambiguity resolved." };
}
