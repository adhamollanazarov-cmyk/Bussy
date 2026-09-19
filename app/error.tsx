"use client"; // Error boundary'lar Client Component bo'lishi shart

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-store";

/**
 * Ildiz segment uchun xatolik chegarasi (landing sahifa va boshqalar).
 *
 * DIQQAT: bu versiyada prop `retry` deb ataladi (ilgari `reset` edi).
 */
export default function RootError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const { t } = useLanguage();

  useEffect(() => {
    // Ishlab chiqarishda bu yerda xatolikni kuzatuv xizmatiga yuborish mumkin
    console.error("Bussy root error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-16 text-center">
      <div className="w-full max-w-md space-y-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-rose-50 text-rose-600 ring-1 ring-rose-200">
          <AlertTriangle className="h-7 w-7" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-slate-900">{t.rootError.title}</h1>
          <p className="text-sm leading-relaxed text-slate-500">{t.rootError.description}</p>
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <button
            onClick={() => retry()}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800"
          >
            <RotateCcw className="h-4 w-4" />
            <span>{t.common.retry}</span>
          </button>
          <Link
            href="/app"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            <Home className="h-4 w-4 text-slate-400" />
            <span>{t.common.goHome}</span>
          </Link>
        </div>

        {error.digest && (
          <p className="pt-2 font-mono text-[11px] text-slate-400">
            {t.rootError.errorCode}: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
