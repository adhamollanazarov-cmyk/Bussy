"use client";

import { useLanguage } from "@/lib/i18n/language-store";

/**
 * Ilova bo'limlari orasida o'tishda ko'rsatiladigan skelet.
 * Yon panel va header layout'da qoladi — faqat asosiy qism almashadi.
 */
export default function AppLoading() {
  const { t } = useLanguage();
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">{t.common.loading}</span>

      {/* Sarlavha */}
      <div className="space-y-2 border-b border-slate-200/80 pb-4">
        <div className="h-7 w-64 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-slate-100" />
      </div>

      {/* KPI kartochkalari */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
          >
            <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
            <div className="mt-3 h-7 w-32 animate-pulse rounded-lg bg-slate-200" />
            <div className="mt-2 h-3 w-20 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>

      {/* Asosiy kontent */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-5">
          <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        </div>
        <div className="space-y-4 lg:col-span-7">
          <div className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        </div>
      </div>
    </div>
  );
}
