"use client";

import React, { useState, useMemo } from "react";
import { Receipt, ShieldAlert, Check, Calculator } from "lucide-react";
import { calculateTax, getRegimeCopy, TaxRegimeType, UZ_TAX_REGIMES } from "@/lib/engine/tax";
import { useBusiness, useSeededState } from "@/lib/store/business-store";
import { useLanguage } from "@/lib/i18n/language-store";
import { formatMoney, formatPercent, parseNumberInput, cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function TaxCalculatorPage() {
  const { business, role } = useBusiness();
  const { t, locale } = useLanguage();

  const [selectedRegime, setSelectedRegime] = useState<TaxRegimeType>("turnover");
  const [revenue, setRevenue] = useSeededState<number>(business.monthlyRevenue || 45_000_000);
  const [expenses, setExpenses] = useSeededState<number>(business.monthlyExpenses || 28_000_000);
  const [customRate, setCustomRate] = useState<number | undefined>(undefined);
  // QQS bazasini foydalanuvchi aniqlashtira olishi kerak — standart 60% taxmin
  // QQS summasini sezilarli o'zgartiradi.
  const [vatableExpenses, setVatableExpenses] = useState<number | undefined>(undefined);
  const [showComparison, setShowComparison] = useState(false);

  const taxResult = useMemo(() => {
    return calculateTax({
      regime: selectedRegime,
      revenue,
      expenses,
      customRate,
      vatableExpenses: selectedRegime === "general" ? vatableExpenses : undefined,
      locale,
    });
  }, [selectedRegime, revenue, expenses, customRate, vatableExpenses, locale]);

  // Buxgalter roli yoki soliq taqqoslash rejimi uchun 3 ta rejimni parallel hisoblash
  const allRegimesComparison = useMemo(() => {
    const regimes: TaxRegimeType[] = ["turnover", "general", "individual"];
    const results = regimes.map((r) => {
      const res = calculateTax({
        regime: r,
        revenue,
        expenses,
        customRate: r === selectedRegime ? customRate : undefined,
        vatableExpenses: r === "general" ? vatableExpenses : undefined,
        locale,
      });
      const copy = getRegimeCopy(r, locale);
      return { regime: r, copy, res };
    });

    const optimal = [...results].sort((a, b) => a.res.taxAmount - b.res.taxAmount)[0];
    const worst = [...results].sort((a, b) => b.res.taxAmount - a.res.taxAmount)[0];
    const annualSavings = (worst.res.taxAmount - optimal.res.taxAmount) * 12;

    return { results, optimal, annualSavings };
  }, [revenue, expenses, selectedRegime, customRate, vatableExpenses, locale]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Receipt className="h-6 w-6 text-emerald-600" />
            {t.tax.pageTitle}
          </h1>
          <p className="text-sm text-slate-500">{t.tax.pageDesc}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showComparison || role === "accountant" ? "primary" : "outline"}
            size="sm"
            onClick={() => setShowComparison((prev) => !prev)}
            className="text-xs font-semibold"
          >
            <Calculator className="h-3.5 w-3.5 mr-1" />
            <span>{t.tax.comparisonHeading.split("(")[0]}</span>
          </Button>
          <Badge variant="warning">{t.tax.demoBadge}</Badge>
        </div>
      </div>

      {/* Legal & Regulatory Disclaimer Banner */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold">{t.tax.disclaimerTitle}</p>
          <p className="leading-relaxed">{t.tax.disclaimerBody}</p>
        </div>
      </div>

      {/* Accountant / Comparison View: 3 Regimes Side-by-Side Audit Card */}
      {(role === "accountant" || showComparison) && (
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/40 via-white to-white shadow-xs">
          <CardHeader className="pb-3 border-b border-emerald-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2 text-emerald-950">
                  <Calculator className="h-5 w-5 text-emerald-600" />
                  <span>{t.tax.comparisonHeading}</span>
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">{t.tax.comparisonSub}</p>
              </div>
              <Badge variant="success" className="self-start sm:self-auto font-semibold">
                {t.tax.optimalRegimeBadge}: {allRegimesComparison.optimal.copy.name.split("(")[0]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">{t.tax.regimeCol}</th>
                    <th className="py-2.5 px-3">{t.tax.taxBaseCol}</th>
                    <th className="py-2.5 px-3">{t.tax.taxAmountCol}</th>
                    <th className="py-2.5 px-3">{t.tax.effectiveRateCol}</th>
                    <th className="py-2.5 px-3">{t.tax.profitAfterTaxCol}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allRegimesComparison.results.map(({ regime, copy, res }) => {
                    const isOptimal = regime === allRegimesComparison.optimal.regime;
                    return (
                      <tr
                        key={regime}
                        className={isOptimal ? "bg-emerald-50/70 font-semibold" : "hover:bg-slate-50"}
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <span>{copy.name.split("(")[0]}</span>
                            {isOptimal && (
                              <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-bold">
                                {t.tax.optimalRegimeBadge}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono">{formatMoney(res.taxBase)}</td>
                        <td className="py-3 px-3 font-mono text-rose-600 font-bold">
                          {formatMoney(res.taxAmount)}
                        </td>
                        <td className="py-3 px-3 font-mono">{formatPercent(res.effectiveTaxRate)}</td>
                        <td className="py-3 px-3 font-mono text-emerald-700 font-bold">
                          {formatMoney(res.profitAfterTax)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {allRegimesComparison.annualSavings > 0 && (
              <div className="rounded-xl border border-emerald-300 bg-emerald-100/60 p-3 text-xs text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span>
                  💡 <strong>{t.tax.optimalRegimeBadge}:</strong> {allRegimesComparison.optimal.copy.name.split("(")[0]} rejimini tanlash orqali:
                </span>
                <span className="font-bold text-sm text-emerald-800">
                  {t.tax.taxDiffLabel.replace("{amount}", formatMoney(allRegimesComparison.annualSavings))}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Regime Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(Object.keys(UZ_TAX_REGIMES) as TaxRegimeType[]).map((regId) => {
          const reg = getRegimeCopy(regId, locale);
          const isSelected = selectedRegime === regId;
          return (
            <button
              key={regId}
              onClick={() => {
                setSelectedRegime(regId);
                setCustomRate(undefined);
              }}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? "border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20 shadow-xs"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-900">{reg.name.split("(")[0]}</span>
                {isSelected && <Check className="h-4 w-4 text-emerald-600" />}
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">{reg.description}</p>
            </button>
          );
        })}
      </div>

      {/* Main calculation area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Inputs */}
        <div className="lg:col-span-5 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t.tax.financialFiguresHeading}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label={t.tax.revenueLabel}
                value={revenue ? revenue.toLocaleString("ru-RU") : ""}
                onChange={(e) => setRevenue(parseNumberInput(e.target.value))}
                suffix={t.common.currency}
              />
              <Input
                label={t.tax.expensesLabel}
                value={expenses ? expenses.toLocaleString("ru-RU") : ""}
                onChange={(e) => setExpenses(parseNumberInput(e.target.value))}
                suffix={t.common.currency}
              />

              {selectedRegime === "turnover" && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    {t.tax.turnoverRateLabel}
                  </label>
                  <Input
                    type="number"
                    value={customRate !== undefined ? customRate : 4}
                    onChange={(e) => setCustomRate(parseFloat(e.target.value) || 0)}
                    suffix="%"
                  />
                  <div className="flex gap-2 mt-2" role="radiogroup" aria-label={t.tax.turnoverRateLabel}>
                    {[4, 1, 2].map((r) => {
                      // customRate berilmagan bo'lsa standart 4% tanlangan hisoblanadi
                      const isActive = (customRate ?? 4) === r;
                      return (
                        <button
                          key={r}
                          type="button"
                          role="radio"
                          aria-checked={isActive}
                          onClick={() => setCustomRate(r)}
                          className={cn(
                            "text-[10px] px-2.5 py-1 rounded font-medium transition-colors",
                            isActive
                              ? "bg-slate-900 text-white shadow-xs"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                          )}
                        >
                          {r}% {r === 4 ? t.tax.turnoverRateStandard : t.tax.turnoverRatePreferential}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1.5 text-[10px] text-slate-400 leading-relaxed">
                    {t.tax.turnoverRateFootnote}
                  </p>
                </div>
              )}

              {selectedRegime === "general" && (
                <div>
                  <Input
                    label={t.tax.vatableExpensesLabel}
                    type="text"
                    value={
                      vatableExpenses !== undefined
                        ? vatableExpenses.toLocaleString("ru-RU")
                        : Math.round(expenses * 0.6).toLocaleString("ru-RU")
                    }
                    onChange={(e) => setVatableExpenses(parseNumberInput(e.target.value))}
                    suffix={t.common.currency}
                  />
                  <p className="mt-1.5 text-[10px] text-slate-400 leading-relaxed">
                    {t.tax.vatableExpensesFootnote}
                    {vatableExpenses === undefined && t.tax.vatableExpensesDefaultNote}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Outputs */}
        <div className="lg:col-span-7 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-[11px] text-slate-500 block">{t.tax.taxBaseLabel}</span>
              <span className="text-lg font-bold text-slate-900 block mt-1">
                {formatMoney(taxResult.taxBase)}
              </span>
            </div>

            <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 shadow-xs">
              <span className="text-[11px] text-rose-700 block">{t.tax.taxAmountLabel}</span>
              <span className="text-lg font-bold text-rose-900 block mt-1">
                {formatMoney(taxResult.taxAmount)}
              </span>
              <span className="text-[10px] text-rose-600/80 mt-1 block">
                {t.tax.effectiveRateLabel.replace("{percent}", formatPercent(taxResult.effectiveTaxRate))}
              </span>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
              <span className="text-[11px] text-emerald-800 block">{t.tax.profitAfterTaxLabel}</span>
              <span className="text-lg font-bold text-emerald-950 block mt-1">
                {formatMoney(taxResult.profitAfterTax)}
              </span>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">{t.tax.breakdownHeading}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-slate-100 text-xs">
                {taxResult.breakdown.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <span className="text-slate-700 font-medium">{item.label}</span>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {t.tax.rateEffectiveFrom.replace("{date}", item.source.effectiveFrom)}
                      </p>
                      {item.source.legalBasis.trim() ? (
                        <a
                          href={item.source.legalBasis}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 block text-[11px] text-emerald-700 underline break-words"
                        >
                          {t.tax.rateLegalBasis}
                        </a>
                      ) : (
                        <p className="mt-1 text-[11px] text-amber-700">{t.tax.ratePendingVerification}</p>
                      )}
                    </div>
                    <span className="text-slate-900 font-bold shrink-0">{formatMoney(item.amount)}</span>
                  </div>
                ))}
                <div className="py-2.5 flex justify-between items-center font-bold text-slate-900">
                  <span>{t.tax.totalTaxLabel}</span>
                  <span className="text-rose-600">{formatMoney(taxResult.taxAmount)}</span>
                </div>
              </div>

              {/* Hisobda qabul qilingan taxminlar — foydalanuvchi nimaga ishonayotganini bilishi kerak */}
              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="text-[11px] font-semibold text-slate-600 mb-1.5">
                  {t.tax.assumptionsHeading}
                </p>
                <ul className="space-y-1">
                  {taxResult.assumptions.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-500">
                      <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="mt-3 text-[11px] text-slate-400 leading-relaxed border-t border-slate-100 pt-3">
                {taxResult.disclaimer}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
