// Five-locale booking outcome copy (M016): booked / conflict /
// needs-reconfirmation / rejected. Synthetic catalog wording. Accountable
// human review of every locale, including Arabic, is required before
// real-patient use. Direction follows the M005 locale contract.
import type { SupportedLocale } from "@zyara/domain";

export const BOOKING_EXPLANATION_KEYS = [
  "booking.booked",
  "booking.conflict",
  "booking.needsReconfirmation",
  "booking.rejected",
] as const;

export type BookingExplanationKey = (typeof BOOKING_EXPLANATION_KEYS)[number];

const ar: Record<BookingExplanationKey, string> = {
  "booking.booked": "تم تأكيد موعدك. أظهر المرجع عند الوصول.",
  "booking.conflict": "هذا الموعد محجوز الآن. اختر بديلا من الخيارات الجديدة.",
  "booking.needsReconfirmation": "تغيرت التفاصيل. يلزم تأكيد جديد قبل المتابعة.",
  "booking.rejected": "تعذر إتمام الحجز حسب القواعد. راجع الخطوة التالية.",
};

const en: Record<BookingExplanationKey, string> = {
  "booking.booked": "Your appointment is confirmed. Show the reference on arrival.",
  "booking.conflict": "That time was just taken. Choose an alternative from the new options.",
  "booking.needsReconfirmation": "Details changed. Fresh confirmation is required before continuing.",
  "booking.rejected": "Booking cannot proceed under the current rules. Review the next step.",
};

const fr: Record<BookingExplanationKey, string> = {
  "booking.booked": "Votre rendez-vous est confirmé. Présentez la référence à l’arrivée.",
  "booking.conflict": "Ce créneau vient d’être pris. Choisissez une alternative.",
  "booking.needsReconfirmation": "Les détails ont changé. Une nouvelle confirmation est requise.",
  "booking.rejected": "La réservation ne peut pas aboutir selon les règles actuelles.",
};

const de: Record<BookingExplanationKey, string> = {
  "booking.booked": "Ihr Termin ist bestätigt. Zeigen Sie die Referenz bei Ankunft.",
  "booking.conflict": "Diese Zeit wurde gerade vergeben. Wählen Sie eine Alternative.",
  "booking.needsReconfirmation": "Details haben sich geändert. Eine erneute Bestätigung ist erforderlich.",
  "booking.rejected": "Die Buchung kann nach den aktuellen Regeln nicht fortgesetzt werden.",
};

const es: Record<BookingExplanationKey, string> = {
  "booking.booked": "Su cita está confirmada. Muestre la referencia al llegar.",
  "booking.conflict": "Ese horario acaba de ocuparse. Elija una alternativa.",
  "booking.needsReconfirmation": "Los detalles cambiaron. Se requiere una nueva confirmación.",
  "booking.rejected": "La reserva no puede continuar según las reglas actuales.",
};

export const BOOKING_EXPLANATIONS: Record<SupportedLocale, Record<BookingExplanationKey, string>> = {
  ar, en, fr, de, es,
};

export type BookingOutcomeCode =
  | "BOOKED" | "CONFLICT" | "NEEDS_RECONFIRMATION" | "REJECTED";

export function explainBooking(locale: SupportedLocale, code: BookingOutcomeCode): string {
  const catalog = BOOKING_EXPLANATIONS[locale];
  switch (code) {
    case "BOOKED": return catalog["booking.booked"];
    case "CONFLICT": return catalog["booking.conflict"];
    case "NEEDS_RECONFIRMATION": return catalog["booking.needsReconfirmation"];
    default: return catalog["booking.rejected"];
  }
}
