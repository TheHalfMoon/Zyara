import type { Metadata } from "next";
import type { ReactNode } from "react";
import { directionForLocale } from "@zyara/domain";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zyara — Better care, closer to you",
  description: "Discover trusted clinics and doctors, understand distance and opening hours, get directions, and book care with confidence.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const dir = directionForLocale("ar");
  return (
    <html lang="ar" dir={dir}>
      <body>{children}</body>
    </html>
  );
}
