"use client";

import React from "react";
import {
  CreditCard,
  TrendingUp,
  Target,
  ShieldCheck,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  Receipt,
  Layers,
  Lightbulb,
} from "lucide-react";
import { formatMoney, formatPercent } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/language-store";
import { Badge } from "../ui/badge";
import type {
  LoanCalculationResult,
  ProfitCalculationResult,
  BreakEvenResult,
  CashflowResult,
  DebtBurdenAnalysisResult,
  BusinessPlanData,
} from "@/lib/engine/types";
import type { TaxCalculationResult } from "@/lib/engine/tax";

/** Demo ssenariyda qaytariladigan birlashgan model. */
interface FinancialModelResult {
  modelName: string;
  businessType: string;
  location: string;
  capital: number;
  loanAmount: number;
  totalFunds: number;
  revenue: number;
  expenses: number;
  loan: LoanCalculationResult;
  profit: ProfitCalculationResult;
  breakEven: BreakEvenResult;
  cashflow: CashflowResult;
  debtBurden: DebtBurdenAnalysisResult;
}

interface BusinessIdeaResult {
  businessIdea: string;
  location: string;
  budget: number;
  targetCustomer: string;
  businessModel: string;
  startupCostsBreakdown: { name: string; amount: number }[];
  financialProjection: {
    estimatedMonthlyRevenue: number;
    estimatedMonthlyExpenses: number;
    estimatedMonthlyProfit: number;
    paybackPeriodMonths: number;
  };
  risks: string[];
  requiredValidation: string[];
  nextSteps: string[];
}

interface CalculationCardProps {
  toolCalled: string;
  result: unknown;
}

/** Kartochka sarlavhasi — barcha turlar uchun bir xil ko'rinish. */
function CardShell({
  icon,
  iconClass,
  title,
  badge,
  children,
}: {
  icon: React.ReactNode;
  iconClass: string;
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="my-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
        <div className="flex items-center gap-2">
          <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${iconClass}`}>
            {icon}
          </div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">{title}</h4>
        </div>
        {badge}
      </div>
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "positive" | "negative" | "warning";
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-700"
      : tone === "negative"
      ? "text-rose-600"
      : tone === "warning"
      ? "text-amber-700"
      : "text-slate-900";
  return (
    <div className="p-2.5 rounded-xl bg-slate-50">
      <span className="text-slate-500 block text-[11px]">{label}</span>
      <span className={`font-bold block ${toneClass}`}>{value}</span>
    </div>
  );
}

export function CalculationCard({ toolCalled, result }: CalculationCardProps) {
  const { t, locale } = useLanguage();
  if (!result) return null;
  const numLocale = locale === "en" ? "en-US" : "ru-RU";

  // Dispatch faqat `toolCalled` bo'yicha. Ilgari natija shakli bo'yicha ham
  // taxmin qilinardi (duck-typing), bu esa yangi maydon qo'shilganda
  // noto'g'ri kartochka chizilishiga olib kelishi mumkin edi.
  switch (toolCalled) {
    /* ---------- Demo ssenariy: to'liq moliyaviy model ---------- */
    case "financial_model_pipeline": {
      const r = result as FinancialModelResult;
      return (
        <div className="my-3 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/50 via-white to-slate-50 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-emerald-100 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                <FileSpreadsheet className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">{t.calcCard.modelTitle}</h4>
                <p className="text-[11px] text-slate-500">
                  {r.businessType} • {r.location}
                </p>
              </div>
            </div>
            <Badge variant="success">{t.calcCard.exactBadge}</Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <Stat label={t.calcCard.initialCapital} value={formatMoney(r.capital)} />
            <Stat label={t.calcCard.loanAmount} value={formatMoney(r.loanAmount)} />
            <Stat label={t.calcCard.totalFunds} value={formatMoney(r.totalFunds)} tone="positive" />
            <Stat label={t.calcCard.revenue} value={formatMoney(r.revenue)} />
            <Stat label={t.calcCard.expenses} value={formatMoney(r.expenses)} tone="negative" />
            <Stat
              label={t.calcCard.estNetProfit}
              value={formatMoney(r.profit?.netProfit)}
              tone="positive"
            />
          </div>

          <div className="mt-3 pt-3 border-t border-emerald-100/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-slate-500" />
              <span>
                {t.calcCard.monthlyLoanPayment} <strong>{formatMoney(r.loan?.monthlyPayment)}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-slate-500" />
              <span>
                {t.calcCard.breakEven}{" "}
                <strong>
                  {r.breakEven?.breakEvenUnits?.toLocaleString(numLocale)} {t.calcCard.breakEvenUnitSuffix}
                </strong>
              </span>
            </div>
          </div>
        </div>
      );
    }

    /* ---------- Kredit ---------- */
    case "calculate_loan": {
      const r = result as LoanCalculationResult;
      return (
        <CardShell
          icon={<CreditCard className="h-4 w-4" />}
          iconClass="bg-blue-100 text-blue-700"
          title={t.calcCard.loanTitle}
          badge={<Badge variant="secondary">{t.calcCard.annuityBadge}</Badge>}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                  <th className="pb-2">{t.calcCard.metric}</th>
                  <th className="pb-2 text-right">{t.calcCard.result}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                <tr>
                  <td className="py-2 text-slate-600">{t.calcCard.loanAmountRow}</td>
                  <td className="py-2 text-right font-medium">{formatMoney(r.amount)}</td>
                </tr>
                <tr>
                  <td className="py-2 text-slate-600">{t.calcCard.term}</td>
                  <td className="py-2 text-right font-medium">
                    {r.months} {t.calcCard.termUnit}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 text-slate-600">{t.calcCard.annualRate}</td>
                  <td className="py-2 text-right font-medium">{r.annualRate}%</td>
                </tr>
                <tr className="bg-emerald-50/60 font-semibold text-emerald-900">
                  <td className="py-2 pl-2 rounded-l-lg">{t.calcCard.monthlyPayment}</td>
                  <td className="py-2 pr-2 text-right text-emerald-700 font-bold rounded-r-lg">
                    {formatMoney(r.monthlyPayment)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 text-slate-600">{t.calcCard.totalInterest}</td>
                  <td className="py-2 text-right text-amber-700 font-medium">
                    {formatMoney(r.totalInterest)}
                  </td>
                </tr>
                <tr className="font-semibold">
                  <td className="py-2 text-slate-900">{t.calcCard.totalPayment}</td>
                  <td className="py-2 text-right text-slate-900">{formatMoney(r.totalPayment)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardShell>
      );
    }

    /* ---------- Foyda ---------- */
    case "calculate_profit": {
      const r = result as ProfitCalculationResult;
      return (
        <CardShell
          icon={<TrendingUp className="h-4 w-4" />}
          iconClass="bg-emerald-100 text-emerald-700"
          title={t.calcCard.profitTitle}
          badge={
            <Badge variant={r.netProfit >= 0 ? "success" : "danger"}>
              {t.calcCard.netMarginBadge.replace("{percent}", formatPercent(r.netMargin))}
            </Badge>
          }
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <Stat label={t.calcCard.revenue} value={formatMoney(r.revenue)} />
            <Stat label={t.calcCard.totalCost} value={formatMoney(r.totalCost)} />
            <Stat label={t.calcCard.tax} value={formatMoney(r.taxAmount)} tone="warning" />
            <Stat
              label={t.calcCard.netProfit}
              value={formatMoney(r.netProfit)}
              tone={r.netProfit >= 0 ? "positive" : "negative"}
            />
          </div>
        </CardShell>
      );
    }

    /* ---------- Zararsizlik ---------- */
    case "calculate_break_even": {
      const r = result as BreakEvenResult;
      return (
        <CardShell
          icon={<Target className="h-4 w-4" />}
          iconClass="bg-purple-100 text-purple-700"
          title={t.calcCard.breakEvenTitle}
          badge={<Badge variant="secondary">{r.dailyUnits}{t.calcCard.perDaySuffix}</Badge>}
        >
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-100">
              <span className="text-purple-700 block text-[11px]">{t.calcCard.minMonthlyVolume}</span>
              <span className="font-bold text-slate-900 text-base mt-0.5 block">
                {r.breakEvenUnits?.toLocaleString(numLocale)} {t.calcCard.unitsSuffix}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-100">
              <span className="text-purple-700 block text-[11px]">{t.calcCard.minMonthlyRevenue}</span>
              <span className="font-bold text-slate-900 text-base mt-0.5 block">
                {formatMoney(r.breakEvenRevenue)}
              </span>
            </div>
          </div>
        </CardShell>
      );
    }

    /* ---------- Pul oqimi ---------- */
    case "calculate_cashflow": {
      const r = result as CashflowResult;
      const tone =
        r.status === "healthy" ? "success" : r.status === "warning" ? "warning" : "danger";
      return (
        <CardShell
          icon={<Layers className="h-4 w-4" />}
          iconClass="bg-blue-100 text-blue-700"
          title={t.calcCard.cashflowTitle}
          badge={<Badge variant={tone}>{formatMoney(r.netCashflow)}</Badge>}
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <Stat label={t.calcCard.revenue} value={formatMoney(r.revenue)} />
            <Stat label={t.calcCard.expenses} value={formatMoney(r.expenses)} tone="negative" />
            <Stat label={t.calcCard.loanPayment} value={formatMoney(r.loanPayment)} tone="warning" />
            <Stat
              label={t.calcCard.netCashflow}
              value={formatMoney(r.netCashflow)}
              tone={r.netCashflow >= 0 ? "positive" : "negative"}
            />
          </div>
          <p className="mt-3 text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/70">
            {r.statusText}
          </p>
        </CardShell>
      );
    }

    /* ---------- Soliq ---------- */
    case "calculate_tax": {
      const r = result as TaxCalculationResult;
      return (
        <CardShell
          icon={<Receipt className="h-4 w-4" />}
          iconClass="bg-amber-100 text-amber-700"
          title={t.calcCard.taxTitle}
          badge={<Badge variant="warning">{formatPercent(r.effectiveTaxRate)}</Badge>}
        >
          <p className="text-[11px] text-slate-500 mb-2">{r.regimeName}</p>
          <div className="divide-y divide-slate-100 text-xs">
            {r.breakdown.map((item, idx) => (
              <div key={idx} className="py-2 flex justify-between items-center">
                <span className="text-slate-600">{item.label}</span>
                <span className="text-slate-900 font-semibold">{formatMoney(item.amount)}</span>
              </div>
            ))}
            <div className="py-2 flex justify-between items-center font-bold">
              <span className="text-slate-900">{t.calcCard.totalTaxBurden}</span>
              <span className="text-rose-600">{formatMoney(r.taxAmount)}</span>
            </div>
          </div>
        </CardShell>
      );
    }

    /* ---------- Qarz yuki ---------- */
    case "analyze_debt_burden": {
      const r = result as DebtBurdenAnalysisResult;
      const isSafe = r.riskLevel === "safe";
      const isMod = r.riskLevel === "moderate";
      return (
        <CardShell
          icon={isSafe ? <ShieldCheck className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          iconClass={
            isSafe
              ? "bg-emerald-100 text-emerald-700"
              : isMod
              ? "bg-amber-100 text-amber-700"
              : "bg-rose-100 text-rose-700"
          }
          title={t.calcCard.debtBurdenTitle}
          badge={
            <Badge variant={isSafe ? "success" : isMod ? "warning" : "danger"}>
              {t.calcCard.debtBurdenBadge.replace("{percent}", formatPercent(r.debtBurdenPercent))}
            </Badge>
          }
        >
          <div className="grid grid-cols-3 gap-2 text-xs mb-3">
            <Stat label={t.calcCard.operatingCashflow} value={formatMoney(r.operatingCashflow)} />
            <Stat label={t.calcCard.loanPayment} value={formatMoney(r.monthlyLoanPayment)} tone="negative" />
            <Stat
              label={t.calcCard.remainingCashflow}
              value={formatMoney(r.remainingCashflow)}
              tone={r.remainingCashflow >= 0 ? "positive" : "negative"}
            />
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
            <div className="font-semibold text-slate-900 mb-1">{r.verdict}</div>
            <div className="text-slate-600 leading-relaxed">{r.recommendation}</div>
          </div>
        </CardShell>
      );
    }

    /* ---------- Biznes-reja ---------- */
    case "generate_business_plan": {
      const r = result as BusinessPlanData;
      const totalStartup = (r.sections?.startupCosts || []).reduce((a, b) => a + b.amount, 0);
      return (
        <CardShell
          icon={<FileText className="h-4 w-4" />}
          iconClass="bg-cyan-100 text-cyan-700"
          title={t.calcCard.businessPlanTitle}
          badge={<Badge variant="secondary">{t.calcCard.sectionsBadge}</Badge>}
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-3">
            <Stat label={t.calcCard.businessType} value={r.businessType} />
            <Stat label={t.calcCard.location} value={r.location} />
            <Stat label={t.calcCard.initialFunds} value={formatMoney(totalStartup)} tone="positive" />
            <Stat label={t.calcCard.revenue} value={formatMoney(r.expectedRevenue)} />
          </div>
          {r.sections?.startupCosts && (
            <div className="divide-y divide-slate-100 text-xs">
              {r.sections.startupCosts.slice(0, 3).map((sc, i) => (
                <div key={i} className="py-1.5 flex justify-between">
                  <span className="text-slate-600">{sc.title}</span>
                  <span className="text-slate-900 font-medium">{formatMoney(sc.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </CardShell>
      );
    }

    /* ---------- Biznes g'oyasi ---------- */
    case "analyze_business_idea": {
      const r = result as BusinessIdeaResult;
      return (
        <CardShell
          icon={<Lightbulb className="h-4 w-4" />}
          iconClass="bg-amber-100 text-amber-700"
          title={t.calcCard.businessIdeaTitle}
          badge={
            <Badge variant="outline">
              {t.calcCard.paybackBadge.replace(
                "{months}",
                String(r.financialProjection?.paybackPeriodMonths)
              )}
            </Badge>
          }
        >
          <div className="grid grid-cols-3 gap-2 text-xs mb-3">
            <Stat label={t.calcCard.budget} value={formatMoney(r.budget)} />
            <Stat
              label={t.calcCard.estRevenue}
              value={formatMoney(r.financialProjection?.estimatedMonthlyRevenue)}
            />
            <Stat
              label={t.calcCard.estProfit}
              value={formatMoney(r.financialProjection?.estimatedMonthlyProfit)}
              tone="positive"
            />
          </div>
          <p className="text-[11px] text-amber-800 bg-amber-50/70 border border-amber-200 p-2.5 rounded-xl leading-relaxed">
            {t.calcCard.ideaDisclaimer}
          </p>
        </CardShell>
      );
    }

    default:
      return null;
  }
}
