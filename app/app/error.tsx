"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, MessageSquare } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-store";

/**
 * Ilova bo'limi uchun xatolik chegarasi.
 *
 * `app/app/layout.tsx` bu chegaradan TASHQARIDA qoladi, shuning uchun yon panel
 * va header ishlashda davom etadi — foydalanuvchi boshqa bo'limga o'tib keta oladi.
 */
export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const { t } = useLanguage();

  useEffect(() => {
    console.error("Bussy app error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200/90 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-200">
          <AlertTriangle className="h-6 w-6" />
        </div>

        <h2 className="text-lg font-bold text-slate-900">{t.appError.title}</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
          {t.appError.description}
        </p>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <button
            onClick={() => retry()}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500"
          >
            <RotateCcw className="h-4 w-4" />
            <span>{t.common.retry}</span>
          </button>
          <Link
            href="/app/chat"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <MessageSquare className="h-4 w-4 text-slate-400" />
            <span>{t.appError.chatLink}</span>
          </Link>
        </div>

        {error.digest && (
          <p className="mt-5 font-mono text-[11px] text-slate-400">
            {t.appError.errorCode}: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
