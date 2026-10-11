import type { Metadata, Viewport } from "next";
import { Analytics } from '@vercel/analytics/next';
import "./globals.css";

export const metadata: Metadata = {
  title: "Porsi — Catat makan, lebih tenang",
  description: "Pencatat makanan Indonesia dengan estimasi yang mudah diperiksa dan disesuaikan.",
  applicationName: "Porsi",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Porsi" },
};

export const viewport: Viewport = { themeColor: "#f7f8f3", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
