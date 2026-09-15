// Canonical five-locale contract (M001). No translations yet.
export const SUPPORTED_LOCALES = ["ar", "en", "fr", "de", "es"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export type TextDirection = "rtl" | "ltr";

export function directionForLocale(locale: SupportedLocale): TextDirection {
  return locale === "ar" ? "rtl" : "ltr";
}

export function isSupportedLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}
