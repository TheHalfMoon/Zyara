// Message templates for M020. English only.
// Five locales with synthetic copy. External previews are generic: they
// never include specialty, diagnosis, clinical reason, dependent names, or
// sensitive intake. Human review is required before real patient use.

export const COMMS_LOCALES = ["ar", "en", "fr", "de", "es"] as const;
export type CommsLocale = (typeof COMMS_LOCALES)[number];

export type TemplateId = "reminder" | "cancellation" | "reschedule" | "request_update";

const TEMPLATES: Record<TemplateId, Record<CommsLocale, string>> = {
  reminder: {
    ar: "تذكير: لديك موعد قادم. سجل الدخول لعرض التفاصيل.",
    en: "Reminder: you have an upcoming appointment. Sign in to view details.",
    fr: "Rappel : vous avez un rendez-vous à venir. Connectez-vous pour voir les détails.",
    de: "Erinnerung: Sie haben einen bevorstehenden Termin. Melden Sie sich an, um Details zu sehen.",
    es: "Recordatorio: tiene una cita próxima. Inicie sesión para ver los detalles.",
  },
  cancellation: {
    ar: "تم إلغاء موعدك. سجل الدخول لعرض الخيارات المتاحة.",
    en: "Your appointment was cancelled. Sign in to view available options.",
    fr: "Votre rendez-vous a été annulé. Connectez-vous pour voir les options.",
    de: "Ihr Termin wurde storniert. Melden Sie sich an, um Optionen zu sehen.",
    es: "Su cita fue cancelada. Inicie sesión para ver las opciones.",
  },
  reschedule: {
    ar: "تم تغيير موعدك. سجل الدخول لمراجعة الوقت الجديد.",
    en: "Your appointment time changed. Sign in to review the new time.",
    fr: "L’heure de votre rendez-vous a changé. Connectez-vous pour vérifier.",
    de: "Ihre Terminzeit hat sich geändert. Melden Sie sich an, um sie zu prüfen.",
    es: "La hora de su cita cambió. Inicie sesión para revisarla.",
  },
  request_update: {
    ar: "تم تحديث حالة طلبك. سجل الدخول لعرض الحالة.",
    en: "Your request status was updated. Sign in to view the status.",
    fr: "Le statut de votre demande a été mis à jour. Connectez-vous pour le voir.",
    de: "Der Status Ihrer Anfrage wurde aktualisiert. Melden Sie sich an, um ihn zu sehen.",
    es: "El estado de su solicitud se actualizó. Inicie sesión para verlo.",
  },
};

/** Rendered external preview. Generic by construction. */
export function renderPreview(templateId: TemplateId, locale: string): string {
  const row = TEMPLATES[templateId];
  if (!row) throw new Error("COMMS_TEMPLATE_UNKNOWN");
  return row[locale as CommsLocale] ?? row.en;
}

/** Guard: external previews must not contain clinical or identifying tokens. */
const BANNED_PREVIEW_TOKENS = [
  "cardio", "dermato", "onco", "psych", "diagnosis", "clinic-note",
  "national-id", "dependent",
];

export function assertPreviewSafe(preview: string): void {
  const lower = preview.toLowerCase();
  for (const token of BANNED_PREVIEW_TOKENS) {
    if (lower.includes(token)) throw new Error("COMMS_PREVIEW_LEAK");
  }
}

export interface SmsSegments {
  segments: number;
  encoding: "gsm7" | "ucs2";
  units: number;
}

/**
 * SMS segmentation estimate for Arabic (UCS-2) versus Latin (GSM-7) text.
 * Any non-Latin codepoint forces UCS-2: 70 units single, 67 per
 * concatenated segment. GSM-7: 160 single, 153 per concatenated segment.
 */
export function smsSegmentsFor(text: string): SmsSegments {
  let nonGsm = false;
  for (const ch of text) {
    if (ch.codePointAt(0)! > 127) { nonGsm = true; break; }
  }
  if (!nonGsm) {
    const units = text.length;
    return { encoding: "gsm7", units, segments: units <= 160 ? 1 : Math.ceil(units / 153) };
  }
  const units = [...text].length;
  return { encoding: "ucs2", units, segments: units <= 70 ? 1 : Math.ceil(units / 67) };
}
