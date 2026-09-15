import type { ReactNode } from "react";
import { directionForLocale } from "@zyara/domain";

export default function RootLayout({ children }: { children: ReactNode }) {
  const dir = directionForLocale("ar");
  return (
    <html lang="ar" dir={dir}>
      <body>{children}</body>
    </html>
  );
}
