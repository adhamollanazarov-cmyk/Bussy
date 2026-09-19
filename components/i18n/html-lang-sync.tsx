"use client";

import { useEffect } from "react";
import { useLanguage } from "@/lib/i18n/language-store";

/**
 * `app/layout.tsx` server component bo'lgani uchun `<html lang>` ni
 * to'g'ridan-to'g'ri state'ga bog'lab bo'lmaydi — shu kichik klient
 * komponent tilni almashtirilganda `documentElement.lang` ni yangilaydi.
 */
export function HtmlLangSync() {
  const { locale } = useLanguage();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
