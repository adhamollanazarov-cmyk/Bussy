"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/i18n/language-store";

const ROUTE_TITLES: Record<string, { uz: string; en: string }> = {
  "/": {
    uz: "Bussy — Biznesingiz uchun aqlli yordamchi | AI Moliyaviy Maslahatchi",
    en: "Bussy — Smart Assistant for Your Business | AI Financial Advisor",
  },
  "/app": {
    uz: "Boshqaruv paneli | Bussy",
    en: "Dashboard | Bussy",
  },
  "/app/chat": {
    uz: "AI Maslahatchi | Bussy",
    en: "AI Advisor | Bussy",
  },
  "/app/finance": {
    uz: "Moliyaviy tahlil | Bussy",
    en: "Financial analysis | Bussy",
  },
  "/app/loan": {
    uz: "Kredit kalkulyatori | Bussy",
    en: "Loan calculator | Bussy",
  },
  "/app/simulator": {
    uz: "What-if simulyatori | Bussy",
    en: "What-if simulator | Bussy",
  },
  "/app/business-plan": {
    uz: "Biznes-reja | Bussy",
    en: "Business plan | Bussy",
  },
  "/app/tax": {
    uz: "Soliq kalkulyatori | Bussy",
    en: "Tax calculator | Bussy",
  },
  "/app/market": {
    uz: "Bozor tahlili | Bussy",
    en: "Market analysis | Bussy",
  },
};

/**
 * `app/layout.tsx` server component bo'lgani uchun `<html lang>` va
 * dinamik til almashtirishda `document.title` ni to'g'ridan-to'g'ri state'ga
 * bog'lab bo'lmaydi — shu klient komponent tilni almashtirilganda
 * hamda sahifalararo harakatlanganda sarlavha va til atributini sinxronlashtiradi.
 */
export function HtmlLangSync() {
  const { locale } = useLanguage();
  const pathname = usePathname();

  useEffect(() => {
    document.documentElement.lang = locale;

    const normalizedPath = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
    const matched = ROUTE_TITLES[normalizedPath];
    if (matched) {
      document.title = matched[locale] || matched.uz;
    }
  }, [locale, pathname]);

  return null;
}
