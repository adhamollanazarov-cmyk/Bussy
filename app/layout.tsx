import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LanguageProvider } from "@/lib/i18n/language-store";
import { HtmlLangSync } from "@/components/i18n/html-lang-sync";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Bussy — Biznesingiz uchun aqlli yordamchi | AI Moliyaviy Maslahatchi",
    template: "%s | Bussy",
  },
  description:
    "Kichik va o‘rta biznes egalari uchun AI moliyaviy maslahatchi: kredit kalkulyatori, 11 bo‘limli biznes-reja, foyda va break-even tahlili, what-if simulyatori.",
  keywords: [
    "Bussy",
    "biznes-reja",
    "kredit kalkulyatori",
    "moliyaviy tahlil",
    "O‘zbekiston",
    "fintech",
    "tadbirkorlik",
  ],
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">
        <LanguageProvider>
          <HtmlLangSync />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
