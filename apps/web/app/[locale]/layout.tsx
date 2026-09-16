import type { ReactNode } from "react";
import { directionForLocale, isSupportedLocale, SUPPORTED_LOCALES } from "@zyara/domain";

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const active = isSupportedLocale(locale) ? locale : "ar";
  return (
    <div lang={active} dir={directionForLocale(active)}>
      {children}
    </div>
  );
}
