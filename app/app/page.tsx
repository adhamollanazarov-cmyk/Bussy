"use client";

import React from "react";
import Link from "next/link";
import {
  FileText,
  CreditCard,
  BarChart3,
  TrendingUp,
  Coins,
  Receipt,
  Layers,
  Sparkles,
  ArrowRight,
  Zap,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { calculateLoan } from "@/lib/engine/loan";
import { calculateProfit } from "@/lib/engine/profit";
import { calculateCashflow } from "@/lib/engine/cashflow";
import { COST_SPLIT, DEFAULT_TURNOVER_TAX_PERCENT } from "@/lib/engine/assumptions";
import { useBusiness } from "@/lib/store/business-store";
import { useLanguage } from "@/lib/i18n/language-store";
import { formatMoney, formatPercent, safeRatioPercent } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const QUICK_ACTION_META = [
  { icon: FileText, href: "/app/business-plan", color: "bg-blue-50 text-blue-700 border-blue-100" },
  { icon: CreditCard, href: "/app/loan", color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  { icon: BarChart3, href: "/app/finance", color: "bg-purple-50 text-purple-700 border-purple-100" },
  { icon: TrendingUp, href: "/app/chat", color: "bg-amber-50 text-amber-700 border-amber-100" },
];

export default function DashboardPage() {
  const { business } = useBusiness();
  const { t } = useLanguage();

  const revenue = business.monthlyRevenue;
  const expenses = business.monthlyExpenses;

  // Barcha ko'rsatkichlar kalkulyator modullari orqali — inline formulalar emas,
  // kredit to'lovi ham qat'iy 2 650 000 emas, biznes ma'lumotidan hisoblanadi.
  const loanRes = calculateLoan({
    amount: business.potentialLoan,
    annualRate: business.loanRate,
    months: business.loanMonths,
  });

  const profitRes = calculateProfit({
    revenue,
    fixedCost: Math.round(expenses * COST_SPLIT.fixed),
    variableCost: Math.round(expenses * COST_SPLIT.variable),
    taxRate: DEFAULT_TURNOVER_TAX_PERCENT,
  });

  const cashflowRes = calculateCashflow({
    revenue,
    expenses,
    loanPayment: loanRes.monthlyPayment,
    tax: profitRes.taxAmount,
  });

  const netProfit = profitRes.netProfit;
  const cashflow = cashflowRes.netCashflow;

  const QUICK_ACTIONS = t.dashboard.quickActions.map((action, idx) => ({
    ...action,
    ...QUICK_ACTION_META[idx],
  }));

  return (
    <div className="space-y-8">
      {/* Top Welcome Header (Section 11) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950">
              {t.dashboard.greeting}
            </h1>
            <Badge variant="success">{t.dashboard.demoBadge}</Badge>
          </div>
          <p className="text-sm sm:text-base text-slate-500 mt-1">{t.dashboard.subtitle}</p>
        </div>

        <Link href="/app/chat">
          <Button variant="emerald" size="md" className="shadow-sm">
            <Sparkles className="h-4 w-4" />
            <span>{t.dashboard.heroCta}</span>
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>

      {/* Hackathon Demo Highlight Hero Card (Section 28) */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 p-6 sm:p-8 text-white shadow-md">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
            <Zap className="h-3.5 w-3.5 fill-emerald-400 text-emerald-400" />
            <span>{t.dashboard.heroBadge}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            {t.dashboard.heroTitle}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{t.dashboard.heroDesc}</p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link href="/app/chat">
              <Button variant="emerald" size="md" className="font-semibold shadow-md">
                <span>{t.dashboard.heroCtaPrimary}</span>
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
            <Link href="/app/simulator">
              <Button variant="outline" size="md" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                <span>{t.dashboard.heroCtaSecondary}</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Ambient decorative circle */}
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      </div>

      {/* 4 Main Dashboard Metric Cards (Section 11) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {business.name} — {t.dashboard.metricsHeading}
          </h3>
          <span className="text-xs text-slate-400">{business.location}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
              <span>{t.dashboard.metricRevenue}</span>
              <Coins className="h-4 w-4 text-slate-400" />
            </div>
            <div className="text-2xl font-extrabold text-slate-950">{formatMoney(revenue)}</div>
            <p className="text-[11px] text-slate-400 mt-1">{t.dashboard.metricRevenueSub}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
              <span>{t.dashboard.metricExpenses}</span>
              <Receipt className="h-4 w-4 text-rose-400" />
            </div>
            <div className="text-2xl font-extrabold text-rose-600">{formatMoney(expenses)}</div>
            <p className="text-[11px] text-slate-400 mt-1">{t.dashboard.metricExpensesSub}</p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs text-emerald-800 font-medium mb-1">
              <span>{t.dashboard.metricNetProfit}</span>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-950">{formatMoney(netProfit)}</div>
            <p className="text-[11px] text-emerald-700 font-medium mt-1">
              {t.dashboard.metricNetProfitSub.replace(
                "{margin}",
                formatPercent(safeRatioPercent(netProfit, revenue))
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
              <span>{t.dashboard.metricCashflow}</span>
              <Layers className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-950">{formatMoney(cashflow)}</div>
            <p className="text-[11px] text-blue-600 font-medium mt-1">{t.dashboard.metricCashflowSub}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid (Section 11) */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          {t.dashboard.quickActionsHeading}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK_ACTIONS.map((action, idx) => {
            const Icon = action.icon;
            return (
              <Link
                key={idx}
                href={action.href}
                className="group rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  <div className={`h-10 w-10 rounded-xl border flex items-center justify-center mb-3 ${action.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    {action.title}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">{action.desc}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 group-hover:text-emerald-600">
                  <span>{t.dashboard.quickActionOpen}</span>
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Trust & Methodology footer banner */}
      <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{t.dashboard.trustFooter}</span>
        </div>
        <Link href="/app/chat" className="text-emerald-700 font-semibold hover:underline">
          {t.dashboard.trustFooterCta}
        </Link>
      </div>
    </div>
  );
}
