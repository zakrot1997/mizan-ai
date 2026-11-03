import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";

const plex = IBM_Plex_Sans_Arabic({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["arabic", "latin"],
  variable: "--font-plex",
});

export const metadata: Metadata = {
  title: "ميزان AI — مكتب الأعمال الذكي",
  description:
    "نظام إدارة أعمال ومشاريع يعمل بالذكاء الاصطناعي داخل المتصفح: وكيل يدير مشاريعك وماليتك ويتحكم بمتصفح مدمج. يعمل محلياً على نماذج GGUF (LFM3) أو بمفاتيح API سحابية.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/logo.png" },
};

export const viewport: Viewport = {
  themeColor: "#0a0e17",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={plex.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
