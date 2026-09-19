"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Menu, X, Sparkles, Zap, ArrowRight } from "lucide-react";
import { Sidebar } from "./sidebar";
import { Button } from "../ui/button";
import { LanguageToggle } from "@/components/i18n/language-toggle";
import { useLanguage } from "@/lib/i18n/language-store";

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 sm:px-6 backdrop-blur-md print:hidden">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100"
            aria-label={t.header.menuLabel}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">Bussy Platform</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200/70">
              <Zap className="h-3 w-3 fill-emerald-500 text-emerald-500" />
              {t.common.demoMode}
            </span>
          </div>
        </div>

        {/* Right quick actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageToggle className="hidden sm:inline-flex" />
          <Link href="/app/chat">
            <Button variant="emerald" size="sm" className="hidden sm:inline-flex shadow-xs">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{t.sidebar.nav.chat}</span>
            </Button>
          </Link>
          <Link href="/app/simulator">
            <Button variant="outline" size="sm" className="text-xs">
              <span>{t.sidebar.nav.simulator}</span>
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex w-72 max-w-xs flex-1 flex-col bg-white shadow-2xl">
            <div className="absolute top-3 right-3">
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <Sidebar onCloseMobile={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
