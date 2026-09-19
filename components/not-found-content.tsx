"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, MessageSquare } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-store";

export function NotFoundContent() {
  const { t } = useLanguage();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-16 text-center">
      <div className="w-full max-w-md space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl overflow-hidden bg-white border border-slate-200/80 shadow-md">
          <Image
            src="/logo.png"
            alt="Bussy"
            width={64}
            height={64}
            className="h-full w-full object-contain p-2"
          />
        </div>

        <div className="space-y-2">
          <p className="font-mono text-5xl font-extrabold tracking-tight text-slate-950">404</p>
          <h1 className="text-xl font-bold text-slate-900">{t.notFound.title}</h1>
          <p className="text-sm leading-relaxed text-slate-500">{t.notFound.description}</p>
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <Link
            href="/app"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500"
          >
            <span>{t.common.goToApp}</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/app/chat"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            <MessageSquare className="h-4 w-4 text-slate-400" />
            <span>{t.common.openChat}</span>
          </Link>
        </div>

        <p className="pt-2 text-xs text-slate-400">
          <Link href="/" className="font-medium text-slate-500 underline-offset-4 hover:underline">
            {t.common.goHome}
          </Link>
        </p>
      </div>
    </div>
  );
}
