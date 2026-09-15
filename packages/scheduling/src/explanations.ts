// Five-locale eligibility explanations (M013).
// Synthetic catalog wording. Accountable human review of the Arabic medical
// terminology (and every other locale) is required before real-patient use.
// Direction follows the M005 locale contract: ar is RTL, others LTR.
import type { SupportedLocale } from "@zyara/domain";
import type { NextStepCode } from "./rules.js";

export const EXPLANATION_KEYS = [
  "eligibility.allow",
  "eligibility.deny",
  "eligibility.needsInput",
  "eligibility.needsReview",
  "eligibility.sourceUnavailable",
  "eligibility.next.provideInformation",
  "eligibility.next.requestReview",
  "eligibility.next.chooseAnother",
  "eligibility.next.callClinic",
] as const;

export type ExplanationKey = (typeof EXPLANATION_KEYS)[number];

const ar: Record<ExplanationKey, string> = {
  "eligibility.allow": "تستوفي شروط الحجز لهذه الخدمة.",
  "eligibility.deny": "لا تستوفي شروط الحجز لهذه الخدمة.",
  "eligibility.needsInput": "يلزم تقديم معلومات إضافية قبل المتابعة.",
  "eligibility.needsReview": "يحتاج فريق العيادة إلى مراجعة طلبك قبل التأكيد.",
  "eligibility.sourceUnavailable": "تعذر التحقق من المصدر حاليا. لم يتم الرفض.",
  "eligibility.next.provideInformation": "الخطوة التالية: تقديم المعلومات المطلوبة.",
  "eligibility.next.requestReview": "الخطوة التالية: طلب مراجعة العيادة.",
  "eligibility.next.chooseAnother": "الخطوة التالية: اختيار خدمة أخرى.",
  "eligibility.next.callClinic": "الخطوة التالية: الاتصال بالعيادة.",
};

const en: Record<ExplanationKey, string> = {
  "eligibility.allow": "You meet the booking requirements for this service.",
  "eligibility.deny": "You do not meet the booking requirements for this service.",
  "eligibility.needsInput": "More information is needed before continuing.",
  "eligibility.needsReview": "The clinic team must review your request before confirmation.",
  "eligibility.sourceUnavailable": "The source could not be checked right now. This is not a refusal.",
  "eligibility.next.provideInformation": "Next step: provide the requested information.",
  "eligibility.next.requestReview": "Next step: request a clinic review.",
  "eligibility.next.chooseAnother": "Next step: choose another service.",
  "eligibility.next.callClinic": "Next step: call the clinic.",
};

const fr: Record<ExplanationKey, string> = {
  "eligibility.allow": "Vous remplissez les conditions de réservation pour ce service.",
  "eligibility.deny": "Vous ne remplissez pas les conditions de réservation pour ce service.",
  "eligibility.needsInput": "Des informations supplémentaires sont nécessaires avant de continuer.",
  "eligibility.needsReview": "L’équipe de la clinique doit examiner votre demande avant confirmation.",
  "eligibility.sourceUnavailable": "La source n’a pas pu être vérifiée pour le moment. Ce n’est pas un refus.",
  "eligibility.next.provideInformation": "Étape suivante : fournir les informations demandées.",
  "eligibility.next.requestReview": "Étape suivante : demander un examen par la clinique.",
  "eligibility.next.chooseAnother": "Étape suivante : choisir un autre service.",
  "eligibility.next.callClinic": "Étape suivante : appeler la clinique.",
};

const de: Record<ExplanationKey, string> = {
  "eligibility.allow": "Sie erfüllen die Buchungsvoraussetzungen für diesen Service.",
  "eligibility.deny": "Sie erfüllen die Buchungsvoraussetzungen für diesen Service nicht.",
  "eligibility.needsInput": "Vor dem Fortfahren sind weitere Angaben erforderlich.",
  "eligibility.needsReview": "Das Praxisteam muss Ihre Anfrage vor der Bestätigung prüfen.",
  "eligibility.sourceUnavailable": "Die Quelle konnte derzeit nicht geprüft werden. Dies ist keine Ablehnung.",
  "eligibility.next.provideInformation": "Nächster Schritt: Angeforderte Angaben bereitstellen.",
  "eligibility.next.requestReview": "Nächster Schritt: Prüfung durch die Praxis anfordern.",
  "eligibility.next.chooseAnother": "Nächster Schritt: Anderen Service wählen.",
  "eligibility.next.callClinic": "Nächster Schritt: Praxis anrufen.",
};

const es: Record<ExplanationKey, string> = {
  "eligibility.allow": "Cumple los requisitos de reserva para este servicio.",
  "eligibility.deny": "No cumple los requisitos de reserva para este servicio.",
  "eligibility.next.provideInformation": "Siguiente paso: proporcione la información solicitada.",
  "eligibility.needsInput": "Se necesita más información antes de continuar.",
  "eligibility.needsReview": "El equipo de la clínica debe revisar su solicitud antes de confirmar.",
  "eligibility.sourceUnavailable": "No se pudo verificar la fuente en este momento. Esto no es una denegación.",
  "eligibility.next.requestReview": "Siguiente paso: solicitar una revisión de la clínica.",
  "eligibility.next.chooseAnother": "Siguiente paso: elija otro servicio.",
  "eligibility.next.callClinic": "Siguiente paso: llame a la clínica.",
};

export const EXPLANATIONS: Record<SupportedLocale, Record<ExplanationKey, string>> = { ar, en, fr, de, es };

export function explainOutcome(locale: SupportedLocale, outcome: string): string {
  const catalog = EXPLANATIONS[locale];
  switch (outcome) {
    case "ALLOW": return catalog["eligibility.allow"];
    case "DENY": return catalog["eligibility.deny"];
    case "NEEDS_INPUT": return catalog["eligibility.needsInput"];
    case "NEEDS_STAFF_REVIEW": return catalog["eligibility.needsReview"];
    default: return catalog["eligibility.sourceUnavailable"];
  }
}

export function explainNextStep(locale: SupportedLocale, step: NextStepCode): string {
  const catalog = EXPLANATIONS[locale];
  switch (step) {
    case "PROVIDE_INFORMATION": return catalog["eligibility.next.provideInformation"];
    case "REQUEST_REVIEW": return catalog["eligibility.next.requestReview"];
    case "CHOOSE_ANOTHER_SERVICE": return catalog["eligibility.next.chooseAnother"];
    default: return catalog["eligibility.next.callClinic"];
  }
}
