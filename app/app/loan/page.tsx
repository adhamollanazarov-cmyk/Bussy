"use client";

import React, { useState, useMemo } from "react";
import {
  CreditCard,
  Calendar,
  Percent,
  Coins,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { calculateLoan } from "@/lib/engine/loan";
import { analyzeDebtBurden } from "@/lib/engine/analyzer";
import { LoanChart } from "@/components/charts/loan-chart";
import { useBusiness, useSeededState } from "@/lib/store/business-store";
import { useLanguage } from "@/lib/i18n/language-store";
import { formatMoney, formatPercent, parseNumberInput, safeRatioPercent } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function LoanCalculatorPage() {
  const { business } = useBusiness();
  const { t, locale } = useLanguage();

  // Input holatlari — saqlangan biznes ma'lumoti yuklangach avtomatik yangilanadi
  const [amount, setAmount] = useSeededState<number>(business.potentialLoan || 50_000_000);
  const [annualRate, setAnnualRate] = useSeededState<number>(business.loanRate || 24);
  const [months, setMonths] = useSeededState<number>(business.loanMonths || 24);

  // Jadvalni kengaytirish
  const [showFullSchedule, setShowFullSchedule] = useState(false);

  // "Bussy, bu kreditni biznesim ko'tara oladimi?" tahlilini ko'rsatish
  const [analyzed, setAnalyzed] = useState(false);

  // Aniq matematik hisob-kitob
  const loanResult = useMemo(() => {
    return calculateLoan({
      amount: Number(amount) || 0,
      annualRate: Number(annualRate) || 0,
      months: Number(months) || 1,
    });
  }, [amount, annualRate, months]);

  // Qarz yuki tahlili
  const debtBurden = useMemo(() => {
    return analyzeDebtBurden({
      monthlyRevenue: business.monthlyRevenue,
      monthlyExpenses: business.monthlyExpenses,
      loanAmount: amount,
      annualRate,
      loanMonths: months,
      locale,
    });
  }, [business.monthlyRevenue, business.monthlyExpenses, amount, annualRate, months, locale]);

  // Tahlil aniq formulalar bilan bir zumda hisoblanadi — sun'iy kutish yo'q.
  const handleRunAnalysis = () => setAnalyzed(true);

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-emerald-600" />
            {t.loan.pageTitle}
          </h1>
          <p className="text-sm text-slate-500">{t.loan.pageDesc}</p>
        </div>
        <Badge variant="secondary">{t.loan.engineBadge}</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Inputs */}
        <div className="lg:col-span-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <span>{t.loan.paramsHeading}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Input
                  label={t.loan.amountLabel}
                  type="text"
                  inputMode="numeric"
                  value={amount ? amount.toLocaleString("ru-RU") : ""}
                  onChange={(e) => setAmount(parseNumberInput(e.target.value))}
                  placeholder="50 000 000"
                  suffix={t.common.currency}
                />
                <div className="flex gap-1.5 mt-2">
                  {[20_000_000, 50_000_000, 100_000_000].map((val) => (
                    <button
                      key={val}
                      onClick={() => setAmount(val)}
                      className="text-[10px] px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                    >
                      {val / 1_000_000} {t.loan.amountPresetSuffix}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Input
                  label={t.loan.rateLabel}
                  type="number"
                  min={0}
                  max={100}
                  value={annualRate || ""}
                  onChange={(e) => setAnnualRate(parseFloat(e.target.value) || 0)}
                  placeholder="24"
                  suffix="%"
                />
                <div className="flex gap-1.5 mt-2">
                  {[18, 22, 24, 28].map((val) => (
                    <button
                      key={val}
                      onClick={() => setAnnualRate(val)}
                      className="text-[10px] px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                    >
                      {val}%
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Input
                  label={t.loan.monthsLabel}
                  type="number"
                  min={1}
                  max={360}
                  value={months || ""}
                  onChange={(e) => setMonths(parseInt(e.target.value) || 1)}
                  placeholder="24"
                  suffix={t.loan.monthsShort}
                />
                <div className="flex gap-1.5 mt-2">
                  {[12, 24, 36, 48].map((val) => (
                    <button
                      key={val}
                      onClick={() => setMonths(val)}
                      className="text-[10px] px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                    >
                      {t.loan.monthsPresetTemplate
                        .replace("{months}", String(val))
                        .replace("{years}", String(val / 12))}
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Analysis Trigger button */}
              <div className="pt-2">
                <Button
                  onClick={handleRunAnalysis}
                  disabled={analyzed}
                  variant="emerald"
                  className="w-full text-xs sm:text-sm py-2.5 shadow-sm"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>{t.loan.analyzeCta}</span>
                </Button>
                <p className="text-[11px] text-slate-400 text-center mt-1.5">{t.loan.analyzeHint}</p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Business Context */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-100/60 p-4 text-xs space-y-1 text-slate-600">
            <span className="font-semibold text-slate-800 block">{t.loan.currentBusinessHeading}</span>
            <div className="flex justify-between">
              <span>{t.loan.currentRevenue}</span>
              <span className="font-semibold text-slate-900">{formatMoney(business.monthlyRevenue)}</span>
            </div>
            <div className="flex justify-between">
              <span>{t.loan.currentExpenses}</span>
              <span className="font-semibold text-slate-900">{formatMoney(business.monthlyExpenses)}</span>
            </div>
          </div>
        </div>

        {/* Right column: Results & Charts */}
        <div className="lg:col-span-8 space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs text-emerald-800 font-medium mb-1">
                <span>{t.loan.metricMonthlyPayment}</span>
                <Coins className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-emerald-950">
                {formatMoney(loanResult.monthlyPayment)}
              </div>
              <div className="text-[11px] text-emerald-700/80 mt-1">{t.loan.metricMonthlyPaymentSub}</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
                <span>{t.loan.metricTotalInterest}</span>
                <Percent className="h-4 w-4 text-amber-500" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900">
                {formatMoney(loanResult.totalInterest)}
              </div>
              <div className="text-[11px] text-amber-600 mt-1">
                {t.loan.metricTotalInterestSub.replace(
                  "{percent}",
                  formatPercent(safeRatioPercent(loanResult.totalInterest, loanResult.amount))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
                <span>{t.loan.metricTotalPayment}</span>
                <Calendar className="h-4 w-4 text-slate-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900">
                {formatMoney(loanResult.totalPayment)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">{t.loan.metricTotalPaymentSub}</div>
            </div>
          </div>

          {/* AI Debt Burden Section (Section 17) */}
          {analyzed && (
            <div className="rounded-2xl border-2 border-emerald-500/80 bg-gradient-to-br from-emerald-50/60 via-white to-slate-50 p-5 shadow-sm transition-all animate-fade-in">
              <div className="flex items-center justify-between border-b border-emerald-100 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>{t.loan.analysisHeading}</span>
                      <Badge
                        variant={
                          debtBurden.riskLevel === "safe"
                            ? "success"
                            : debtBurden.riskLevel === "moderate"
                            ? "warning"
                            : "danger"
                        }
                      >
                        {t.loan.debtBurdenBadge.replace(
                          "{percent}",
                          formatPercent(debtBurden.debtBurdenPercent)
                        )}
                      </Badge>
                    </h3>
                    <p className="text-xs text-slate-500">{debtBurden.verdict}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
                <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                  <span className="text-slate-500 text-[11px] block">{t.loan.statOperatingCashflow}</span>
                  <span className="font-bold text-slate-900 text-sm block mt-0.5">
                    {formatMoney(debtBurden.operatingCashflow)}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                  <span className="text-slate-500 text-[11px] block">{t.loan.statLoanPayment}</span>
                  <span className="font-bold text-rose-600 text-sm block mt-0.5">
                    {formatMoney(debtBurden.monthlyLoanPayment)}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                  <span className="text-slate-500 text-[11px] block">{t.loan.statRemainingCashflow}</span>
                  <span className="font-bold text-emerald-700 text-sm block mt-0.5">
                    {formatMoney(debtBurden.remainingCashflow)}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                  <span className="text-slate-500 text-[11px] block">{t.loan.statRiskLevel}</span>
                  <span className="font-bold text-slate-900 text-sm block mt-0.5 uppercase">
                    {debtBurden.riskLevel === "safe"
                      ? t.loan.riskSafe
                      : debtBurden.riskLevel === "moderate"
                      ? t.loan.riskModerate
                      : t.loan.riskHigh}
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-700 bg-white/90 p-3.5 rounded-xl border border-slate-200/70 leading-relaxed mb-3">
                {debtBurden.recommendation}
              </div>

              <div className="text-[11px] text-slate-500 space-y-1">
                {debtBurden.assumptions.map((asm, i) => (
                  <p key={i} className="flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                    <span>{asm}</span>
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Chart Section */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span>{t.loan.chartHeading}</span>
                <span className="text-xs font-normal text-slate-400">{t.loan.chartSubheading}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LoanChart schedule={loanResult.schedule} />
            </CardContent>
          </Card>

          {/* Amortization Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold">{t.loan.scheduleHeading}</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFullSchedule(!showFullSchedule)}
                className="text-xs text-slate-600"
              >
                <span>
                  {showFullSchedule
                    ? t.loan.scheduleCollapse
                    : t.loan.scheduleExpand.replace("{count}", String(loanResult.schedule.length))}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showFullSchedule ? "rotate-180" : ""}`} />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase font-semibold">
                      <th className="pb-2">{t.loan.tableMonth}</th>
                      <th className="pb-2 text-right">{t.loan.tablePayment}</th>
                      <th className="pb-2 text-right">{t.loan.tablePrincipal}</th>
                      <th className="pb-2 text-right">{t.loan.tableInterest}</th>
                      <th className="pb-2 text-right">{t.loan.tableBalance}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {(showFullSchedule
                      ? loanResult.schedule
                      : loanResult.schedule.slice(0, 6)
                    ).map((item) => (
                      <tr key={item.month} className="hover:bg-slate-50/80">
                        <td className="py-2 font-medium text-slate-900">
                          {t.loan.monthLabelTemplate.replace("{n}", String(item.month))}
                        </td>
                        <td className="py-2 text-right font-semibold text-slate-900">
                          {formatMoney(item.payment)}
                        </td>
                        <td className="py-2 text-right text-emerald-700 font-medium">
                          {formatMoney(item.principal)}
                        </td>
                        <td className="py-2 text-right text-amber-600">
                          {formatMoney(item.interest)}
                        </td>
                        <td className="py-2 text-right text-slate-500">
                          {formatMoney(item.remainingBalance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
