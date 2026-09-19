"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, Sparkles, Zap, ArrowRight } from "lucide-react";
import { Sidebar } from "./sidebar";
import { Button } from "../ui/button";
import { LanguageToggle } from "@/components/i18n/language-toggle";
import { useLanguage } from "@/lib/i18n/language-store";
import { DemoGuide } from "./demo-guide";
import { useDemoGuide } from "@/lib/store/demo-store";

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useLanguage();
  const demoGuide = useDemoGuide();

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 sm:px-6 backdrop-blur-md print:hidden">
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100"
            aria-label={t.header.menuLabel}
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Mobile Brand Link */}
          <Link href="/app" className="flex md:hidden items-center gap-2">
            <div className="relative flex h-7 w-7 items-center justify-center rounded-lg overflow-hidden bg-white border border-slate-200 shadow-2xs">
              <Image
                src="/logo.png"
                alt="Bussy"
                width={28}
                height={28}
                className="h-full w-full object-contain p-0.5"
              />
            </div>
            <span className="text-base font-bold text-slate-950 font-mono">bussy</span>
          </Link>

          <div className="hidden sm:flex items-center gap-2">
            <div className="relative flex h-6 w-6 items-center justify-center rounded-md overflow-hidden bg-white border border-slate-200/80 shadow-2xs">
              <Image
                src="/logo.png"
                alt="Bussy"
                width={24}
                height={24}
                className="h-full w-full object-contain"
              />
            </div>
            <span className="text-sm font-semibold text-slate-900">Bussy Platform</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200/70">
              <Zap className="h-3 w-3 fill-emerald-500 text-emerald-500" />
              {t.common.demoMode}
            </span>
          </div>
        </div>

        {/* Right quick actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => demoGuide.open()}
            className="relative inline-flex items-center gap-1.5 border-emerald-300/80 bg-emerald-50/70 text-emerald-900 hover:bg-emerald-100 hover:text-emerald-950 text-xs font-semibold shadow-2xs"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
            <span className="hidden sm:inline">{t.demoGuide.triggerButton}</span>
            <span className="sm:hidden">{t.demoGuide.triggerButtonShort}</span>
          </Button>
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

      {/* Global Presentation Dock / Demo Guide */}
      <DemoGuide />

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
