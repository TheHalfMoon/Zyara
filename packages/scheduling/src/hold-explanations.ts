// Five-locale hold explanations (M015): held / expired / needs-reconfirmation.
// Synthetic catalog wording. Accountable human review of every locale,
// including Arabic, is required before real-patient use. Direction follows
// the M005 locale contract: ar is RTL, others LTR.
import type { SupportedLocale } from "@zyara/domain";

export const HOLD_EXPLANATION_KEYS = [
  "holds.held",
  "holds.expired",
  "holds.needsReconfirmation",
  "holds.conflict",
] as const;

export type HoldExplanationKey = (typeof HOLD_EXPLANATION_KEYS)[number];

const ar: Record<HoldExplanationKey, string> = {
  "holds.held": "تم حجز الموعد مؤقتا. أكمل التأكيد قبل انتهاء المهلة.",
  "holds.expired": "انتهت مهلة الحجز المؤقت. اختر موعدا جديدا.",
  "holds.needsReconfirmation": "تغيرت التفاصيل. يلزم تأكيد جديد قبل المتابعة.",
  "holds.conflict": "هذا الموعد محجوز الآن. اختر بديلا من الخيارات الجديدة.",
};

const en: Record<HoldExplanationKey, string> = {
  "holds.held": "Your time is temporarily reserved. Complete confirmation before it expires.",
  "holds.expired": "The temporary reservation expired. Please choose a new time.",
  "holds.needsReconfirmation": "Details changed. Fresh confirmation is required before continuing.",
  "holds.conflict": "That time was just taken. Choose an alternative from the new options.",
};

const fr: Record<HoldExplanationKey, string> = {
  "holds.held": "Votre créneau est temporairement réservé. Confirmez avant expiration.",
  "holds.expired": "La réservation temporaire a expiré. Veuillez choisir un autre créneau.",
  "holds.needsReconfirmation": "Les détails ont changé. Une nouvelle confirmation est requise.",
  "holds.conflict": "Ce créneau vient d’être pris. Choisissez une alternative.",
};

const de: Record<HoldExplanationKey, string> = {
  "holds.held": "Ihre Zeit ist vorläufig reserviert. Schließen Sie die Bestätigung vor Ablauf ab.",
  "holds.expired": "Die vorläufige Reservierung ist abgelaufen. Bitte wählen Sie eine neue Zeit.",
  "holds.needsReconfirmation": "Details haben sich geändert. Eine erneute Bestätigung ist erforderlich.",
  "holds.conflict": "Diese Zeit wurde gerade vergeben. Wählen Sie eine Alternative.",
};

const es: Record<HoldExplanationKey, string> = {
  "holds.held": "Su horario está reservado temporalmente. Complete la confirmación antes de que venza.",
  "holds.expired": "La reserva temporal venció. Elija un nuevo horario.",
  "holds.needsReconfirmation": "Los detalles cambiaron. Se requiere una nueva confirmación.",
  "holds.conflict": "Ese horario acaba de ocuparse. Elija una alternativa.",
};

export const HOLD_EXPLANATIONS: Record<SupportedLocale, Record<HoldExplanationKey, string>> = {
  ar, en, fr, de, es,
};

export type HoldOutcomeCode =
  | "HELD" | "EXPIRED" | "NEEDS_RECONFIRMATION" | "CONFLICT";

export function explainHold(locale: SupportedLocale, code: HoldOutcomeCode): string {
  const catalog = HOLD_EXPLANATIONS[locale];
  switch (code) {
    case "HELD": return catalog["holds.held"];
    case "EXPIRED": return catalog["holds.expired"];
    case "NEEDS_RECONFIRMATION": return catalog["holds.needsReconfirmation"];
    default: return catalog["holds.conflict"];
  }
}
