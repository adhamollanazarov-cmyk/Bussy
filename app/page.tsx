"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Sparkles,
  ArrowRight,
  MessageSquare,
  CreditCard,
  BarChart3,
  FileText,
  TrendingUp,
  CheckCircle2,
  Zap,
  Sliders,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/i18n/language-toggle";
import { useLanguage } from "@/lib/i18n/language-store";
import { calculateLoan } from "@/lib/engine/loan";
import { calculateBreakEven } from "@/lib/engine/breakeven";
import { analyzeDebtBurden } from "@/lib/engine/analyzer";
import { COST_SPLIT, resolveUnitEconomics } from "@/lib/engine/assumptions";
import { formatCompactMoney, formatMoney, formatPercent } from "@/lib/utils";

/**
 * Bosh sahifadagi namunaviy suhbat raqamlari haqiqiy kalkulyatorlardan olinadi,
 * shunda marketing va ilova bir xil natijani ko'rsatadi.
 * (Ilgari bu yerda 941 / 2.65 mln / 15.5% qat'iy yozilgan edi.)
 */
const DEMO = (() => {
  const revenue = 45_000_000;
  const expenses = 28_000_000;
  const loan = calculateLoan({ amount: 50_000_000, annualRate: 24, months: 24 });
  const unit = resolveUnitEconomics("fast food");
  const breakEven = calculateBreakEven({
    fixedCost: Math.round(expenses * COST_SPLIT.fixed),
    sellingPrice: unit.sellingPrice,
    variableCostPerUnit: unit.variableCostPerUnit,
  });
  const debt = analyzeDebtBurden({
    monthlyRevenue: revenue,
    monthlyExpenses: expenses,
    loanAmount: 50_000_000,
    annualRate: 24,
    loanMonths: 24,
  });
  return { loan, breakEven, debt, unit, totalBudget: 150_000_000 };
})();

const FEATURE_ICONS = [MessageSquare, CreditCard, BarChart3, Sliders, FileText, TrendingUp];
const FEATURE_COLORS = [
  "bg-blue-50 text-blue-700",
  "bg-emerald-50 text-emerald-700",
  "bg-purple-50 text-purple-700",
  "bg-amber-50 text-amber-700",
  "bg-cyan-50 text-cyan-700",
  "bg-rose-50 text-rose-700",
];

export default function LandingPage() {
  const { t, locale } = useLanguage();
  const demoUnitLabel = resolveUnitEconomics("fast food", locale).unitLabel;
  const FEATURES = t.landing.features.map((feat, idx) => ({
    ...feat,
    icon: FEATURE_ICONS[idx] || MessageSquare,
    color: FEATURE_COLORS[idx] || "bg-emerald-50 text-emerald-700",
  }));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl overflow-hidden bg-white border border-slate-200/80 shadow-xs">
              <Image
                src="/logo.png"
                alt="Bussy"
                width={36}
                height={36}
                className="h-full w-full object-contain p-0.5"
                priority
              />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-950 font-mono">
              bussy
            </span>
          </div>

          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Link href="/app/chat">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex text-xs">
                <span>{t.landing.navDemoMode}</span>
              </Button>
            </Link>
            <Link href="/app">
              <Button variant="emerald" size="sm" className="shadow-xs text-xs">
                <span>{t.landing.navCta}</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section (Section 34) */}
      <section className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-3.5 py-1 text-xs font-semibold text-emerald-800 shadow-2xs">
            <Zap className="h-3.5 w-3.5 fill-emerald-600 text-emerald-600" />
            <span>{t.landing.badge}</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-950 font-mono">
            bussy
          </h1>

          <p className="text-xl sm:text-2xl font-semibold text-slate-800 max-w-2xl mx-auto">
            {t.landing.tagline}
          </p>

          <p className="text-base sm:text-lg text-slate-600 max-w-xl mx-auto leading-relaxed">
            <strong>{t.landing.descriptionEmphasis}</strong>
            {t.landing.descriptionRest}
          </p>

          {/* CTAs */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/app" className="w-full sm:w-auto">
              <Button variant="emerald" size="lg" className="w-full sm:w-auto font-semibold shadow-md">
                <span>{t.landing.ctaPrimary}</span>
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link href="/app/chat" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto bg-white">
                <Sparkles className="h-4 w-4 text-emerald-600 mr-1.5" />
                <span>{t.landing.ctaSecondary}</span>
              </Button>
            </Link>
          </div>

          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{t.landing.trust1}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{t.landing.trust2}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{t.landing.trust3}</span>
            </div>
          </div>
        </div>

        {/* Live Interactive Concept Demo Preview Box */}
        <div className="max-w-4xl mx-auto mt-12 px-4 sm:px-6">
          <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-400"></span>
                <span className="w-3 h-3 rounded-full bg-amber-400"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
                <span className="text-xs font-mono font-medium text-slate-400 ml-2">
                  {t.landing.previewLabel}
                </span>
              </div>
              <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                {t.landing.previewTag}
              </span>
            </div>

            {/* Conversation Simulation snippet */}
            <div className="space-y-3 text-xs">
              <div className="flex justify-end">
                <div className="bg-slate-900 text-white p-3 rounded-2xl rounded-tr-xs max-w-md">
                  {t.landing.demoUserMessage}
                </div>
              </div>

              <div className="flex justify-start">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl rounded-tl-xs max-w-lg space-y-2">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{t.landing.aiAnalysisLabel}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 bg-white p-2.5 rounded-xl border border-slate-200/80">
                    <div>
                      <span className="text-[10px] text-slate-400 block">{t.landing.statBudget}</span>
                      <span className="font-bold text-slate-900">
                        {formatCompactMoney(DEMO.totalBudget)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">{t.landing.statLoanPayment}</span>
                      <span className="font-bold text-slate-900">
                        {formatCompactMoney(DEMO.loan.monthlyPayment)}
                        {t.landing.perMonthSuffix}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">{t.landing.statBreakeven}</span>
                      <span className="font-bold text-emerald-700">
                        {DEMO.breakEven.breakEvenUnits.toLocaleString(locale === "en" ? "en-US" : "ru-RU")}{" "}
                        {t.landing.unitsSuffix} {demoUnitLabel}
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    {t.landing.summaryTemplate
                      .replace("{cashflow}", formatCompactMoney(DEMO.debt.operatingCashflow))
                      .replace("{payment}", formatMoney(DEMO.loan.monthlyPayment))
                      .replace("{percent}", formatPercent(DEMO.debt.debtBurdenPercent))}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid (Section 34) */}
      <section className="py-16 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-700">
              {t.landing.featuresEyebrow}
            </h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-950">
              {t.landing.featuresHeading}
            </p>
            <p className="text-sm text-slate-500">{t.landing.featuresSubheading}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div
                  key={idx}
                  className="rounded-3xl border border-slate-200/80 bg-slate-50/50 p-6 hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className={`h-10 w-10 rounded-2xl flex items-center justify-center ${feat.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{feat.title}</h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{feat.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA Banner (Section 35) */}
      <section className="py-16 sm:py-20 bg-slate-900 text-white relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            <span>{t.landing.ctaBadge}</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight font-mono">
            {t.landing.ctaHeading}
          </h2>

          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto">
            {t.landing.ctaParagraph}
          </p>

          <div className="pt-2">
            <Link href="/app">
              <Button variant="emerald" size="lg" className="font-semibold shadow-lg shadow-emerald-600/30">
                <span>{t.landing.ctaPrimary}</span>
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-white border-t border-slate-200 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="relative h-5 w-5 shrink-0 overflow-hidden rounded-md">
              <Image
                src="/logo.png"
                alt="Bussy"
                width={20}
                height={20}
                className="h-full w-full object-contain"
              />
            </div>
            <span className="font-bold text-slate-900 font-mono">bussy</span>
            <span>— {t.landing.footerTagline}</span>
          </div>
          <div>© {new Date().getFullYear()} Bussy Fintech AI. {t.landing.footerRights}</div>
        </div>
      </footer>
    </div>
  );
}
