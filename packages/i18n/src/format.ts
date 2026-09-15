import type { SupportedLocale } from "@zyara/domain";

export const DEFAULT_TIME_ZONE = "Asia/Riyadh";

// Gregorian canonical formatting with explicit zone; Hijri is a labeled
// display option only, never the canonical store.
export function formatDateTime(
  locale: SupportedLocale,
  date: Date,
  timeZone: string = DEFAULT_TIME_ZONE,
): string {
  return new Intl.DateTimeFormat(`${locale}-u-nu-latn`, {
    dateStyle: "full",
    timeStyle: "short",
    timeZone,
  }).format(date);
}

export function formatHijriLabel(locale: SupportedLocale, date: Date): string {
  const hijri = new Intl.DateTimeFormat(`${locale}-u-ca-islamic-umalqura`, {
    dateStyle: "long",
    timeZone: DEFAULT_TIME_ZONE,
  }).format(date);
  return `${hijri} (Hijri, display only)`;
}

export function formatNumber(locale: SupportedLocale, value: number): string {
  return new Intl.NumberFormat(locale).format(value);
}

// Bidi-safe embedding for phone numbers, IDs and mixed-script names so
// neutral characters do not reorder inside RTL text.
export function isolate(value: string): string {
  return `⁦${value}⁩`;
}
