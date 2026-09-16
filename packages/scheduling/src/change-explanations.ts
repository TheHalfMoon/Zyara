// Five-locale change policy/time/cutoff explanations (M018).
// Synthetic copy; human review required before real-patient use.
import type { SupportedLocale } from "@zyara/domain";

export type ChangeExplanationKey =
  | "change.cutoff"
  | "change.retained"
  | "change.cancelled"
  | "change.replaced";

const ar: Record<ChangeExplanationKey, string> = {
  "change.cutoff": "U,U.U1O_ U.O-O�U, U.O-U.U_ O�U. U,U.O�O�O� U,U�U^U,Oc.",
  "change.retained": "O�U. O�O,U�O� U.O�O,U,U, O1U+U. USU,O�U. O�O�U�O�O1 U,U.U+U.U�.",
  "change.cancelled": "O�U. O�U,O�O� U.U^U,U^O1O_.",
  "change.replaced": "O�U. U,U�U^O_U� O�U,U.U+ U�O�USO_. U,U� U,U.U+O� U,USO�U� U,O�U_O. U_U�O�.",
};

const en: Record<ChangeExplanationKey, string> = {
  "change.cutoff": "The free change window has passed. Contact assistance to change this booking.",
  "change.retained": "The change failed safely. Your original appointment is unchanged.",
  "change.cancelled": "Your appointment is cancelled.",
  "change.replaced": "Your appointment moved to the new time. This counts as a move, not a missed visit.",
};

const fr: Record<ChangeExplanationKey, string> = {
  "change.cutoff": "Le dAclai de modification est dAcpassAc. Contactez lassistance.",
  "change.retained": "La modification a AcchouAc sans risque. Votre rendez-vous dorigine est inchangAc.",
  "change.cancelled": "Votre rendez-vous est annulAc.",
  "change.replaced": "Votre rendez-vous est dAcplacAc. Il sagit dun dAcplacement, pas dune absence.",
};

const de: Record<ChangeExplanationKey, string> = {
  "change.cutoff": "Die kostenlose Underungsfrist ist abgelaufen. Wenden Sie sich an die Hilfe.",
  "change.retained": "Die Underung ist sicher fehlgeschlagen. Ihr ursprA�nglicher Termin bleibt bestehen.",
  "change.cancelled": "Ihr Termin ist storniert.",
  "change.replaced": "Ihr Termin wurde verlegt. Das zAhlt als Verlegung, nicht als VersAumnis.",
};

const es: Record<ChangeExplanationKey, string> = {
  "change.cutoff": "El plazo de cambio ha pasado. Contacte con asistencia.",
  "change.retained": "El cambio fallA3 sin riesgo. Su cita original no ha cambiado.",
  "change.cancelled": "Su cita estA� cancelada.",
  "change.replaced": "Su cita se ha trasladado. Cuenta como traslado, no como ausencia.",
};

export const CHANGE_EXPLANATIONS: Record<SupportedLocale, Record<ChangeExplanationKey, string>> = {
  ar, en, fr, de, es,
};

export function explainChange(locale: SupportedLocale, key: ChangeExplanationKey): string {
  return CHANGE_EXPLANATIONS[locale][key];
}
