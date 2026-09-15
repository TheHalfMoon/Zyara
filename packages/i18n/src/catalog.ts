import type { SupportedLocale } from "@zyara/domain";

// Synthetic foundation catalog (M005). Human language review still required
// before any patient-facing release; see docs/evidence/M005.
export const CATALOG_KEYS = [
  "common.confirm",
  "common.cancel",
  "common.close",
  "common.back",
  "common.retry",
  "form.required",
  "form.invalidPhone",
  "auth.forbidden",
  "consent.explicit",
] as const;

export type CatalogKey = (typeof CATALOG_KEYS)[number];
export type Catalog = Record<CatalogKey, string>;

const ar: Catalog = {
  "common.confirm": "تأكيد",
  "common.cancel": "إلغاء",
  "common.close": "إغلاق",
  "common.back": "رجوع",
  "common.retry": "إعادة المحاولة",
  "form.required": "هذا الحقل مطلوب",
  "form.invalidPhone": "رقم الهاتف غير صالح",
  "auth.forbidden": "غير مسموح. ليست لديك صلاحية.",
  "consent.explicit": "أوافق صراحة (غير محدد مسبقا)",
};

const en: Catalog = {
  "common.confirm": "Confirm",
  "common.cancel": "Cancel",
  "common.close": "Close",
  "common.back": "Back",
  "common.retry": "Retry",
  "form.required": "This field is required",
  "form.invalidPhone": "Invalid phone number",
  "auth.forbidden": "Forbidden. You lack permission.",
  "consent.explicit": "I explicitly consent (never preselected)",
};

const fr: Catalog = {
  "common.confirm": "Confirmer",
  "common.cancel": "Annuler",
  "common.close": "Fermer",
  "common.back": "Retour",
  "common.retry": "Réessayer",
  "form.required": "Ce champ est obligatoire",
  "form.invalidPhone": "Numéro de téléphone invalide",
  "auth.forbidden": "Interdit. Permission insuffisante.",
  "consent.explicit": "Je consens explicitement (jamais présélectionné)",
};

const de: Catalog = {
  "common.confirm": "Bestätigen",
  "common.cancel": "Abbrechen",
  "common.close": "Schließen",
  "common.back": "Zurück",
  "common.retry": "Erneut versuchen",
  "form.required": "Dieses Feld ist erforderlich",
  "form.invalidPhone": "Ungültige Telefonnummer",
  "auth.forbidden": "Verboten. Fehlende Berechtigung.",
  "consent.explicit": "Ich stimme ausdrücklich zu (niemals vorausgewählt)",
};

const es: Catalog = {
  "common.confirm": "Confirmar",
  "common.cancel": "Cancel",
  "common.close": "Cerrar",
  "common.back": "Atrás",
  "common.retry": "Reintentar",
  "form.required": "Este campo es obligatorio",
  "form.invalidPhone": "Número de teléfono no válido",
  "auth.forbidden": "Prohibido. Sin permiso suficiente.",
  "consent.explicit": "Doy mi consentimiento explícito (nunca preseleccionado)",
};

export const CATALOGS: Record<SupportedLocale, Catalog> = { ar, en, fr, de, es };

export function translate(locale: SupportedLocale, key: CatalogKey): string {
  return CATALOGS[locale][key];
}

// Missing-key telemetry without user inputs: returns absent keys per locale.
export function missingKeys(): Record<SupportedLocale, string[]> {
  const out = {} as Record<SupportedLocale, string[]>;
  for (const locale of Object.keys(CATALOGS) as SupportedLocale[]) {
    out[locale] = CATALOG_KEYS.filter((k) => !(k in CATALOGS[locale]));
  }
  return out;
}
