import { isSupportedLocale } from "@zyara/domain";
import { translate, formatDateTime } from "@zyara/i18n";

export default async function LocaleHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const active = isSupportedLocale(locale) ? locale : "ar";
  return (
    <main>
      <h1>{translate(active, "common.confirm")}</h1>
      <p>{formatDateTime(active, new Date("2026-09-15T10:00:00Z"))}</p>
    </main>
  );
}
