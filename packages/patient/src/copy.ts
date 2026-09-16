// M017 five-locale honest booking copy. English source of truth.
// Synthetic translations; human review required before real-patient use.

export type M017Locale = "ar" | "en" | "fr" | "de" | "es";

export const RTL_LOCALES: M017Locale[] = ["ar"];

export function isRtl(locale: M017Locale): boolean {
  return RTL_LOCALES.includes(locale);
}

export interface ModeCopy {
  instantCommitted: string;
  instantUncommitted: string;
  requestPending: string;
  callMode: string;
  redirectMode: string;
}

const COPY: Record<M017Locale, ModeCopy> = {
  en: {
    instantCommitted: "Booked and confirmed. Show the reference on arrival.",
    instantUncommitted: "Not booked yet. Commit first; do not treat this time as yours.",
    requestPending: "Request pending. This is not an appointment and holds no availability.",
    callMode: "Call the clinic to book. Zyara did not make an appointment.",
    redirectMode: "You are leaving Zyara. Returning does not prove success.",
  },
  ar: {
    instantCommitted: "تم الحجز والتأكيد. أظهر المرجع عند الوصول.",
    instantUncommitted: "لم يتم الحجز بعد. أكمل التأكيد أولا.",
    requestPending: "الطلب قيد الانتظار. هذا ليس موعدا ولا يحجز أي وقت.",
    callMode: "اتصل بالعيادة للحجز. لم تقم زيارة بإنشاء موعد.",
    redirectMode: "أنت تغادر زيارة. العودة لا تثبت نجاح الحجز.",
  },
  fr: {
    instantCommitted: "Réservation confirmée. Présentez la référence à larrivée.",
    instantUncommitted: "Pas encore réservé. Validez dabord.",
    requestPending: "Demande en attente. Ce nest pas un rendez-vous.",
    callMode: "Appelez la clinique. Zyara na pris aucun rendez-vous.",
    redirectMode: "Vous quittez Zyara. Le retour ne prouve rien.",
  },
  de: {
    instantCommitted: "Gebucht und bestätigt. Referenz bei Ankunft zeigen.",
    instantUncommitted: "Noch nicht gebucht. Erst bestätigen.",
    requestPending: "Anfrage ausstehend. Kein Termin, keine Reservierung.",
    callMode: "Rufen Sie die Klinik an. Zyara hat nichts gebucht.",
    redirectMode: "Sie verlassen Zyara. Rückkehr beweist nichts.",
  },
  es: {
    instantCommitted: "Cita confirmada. Muestre la referencia al llegar.",
    instantUncommitted: "Aún no reservado. Confirme primero.",
    requestPending: "Solicitud pendiente. No es una cita ni reserva.",
    callMode: "Llame a la clínica. Zyara no hizo ninguna cita.",
    redirectMode: "Está saliendo de Zyara. Volver no prueba nada.",
  },
};

export function modeCopy(locale: M017Locale): ModeCopy {
  return COPY[locale];
}
