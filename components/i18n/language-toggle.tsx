"use client";

import { useLanguage } from "@/lib/i18n/language-store";
import { cn } from "@/lib/utils";
import { Locale } from "@/lib/i18n/translations";

const OPTIONS: Locale[] = ["uz", "en"];

export function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale, t } = useLanguage();

  return (
    <div
      role="radiogroup"
      aria-label={t.languageToggle.label}
      className={cn(
        "inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[11px] font-semibold",
        className
      )}
    >
      {OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={locale === option}
          onClick={() => setLocale(option)}
          className={cn(
            "flex-1 rounded-md px-2.5 py-1 uppercase tracking-wide transition-colors",
            locale === option
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-500 hover:text-slate-800"
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
