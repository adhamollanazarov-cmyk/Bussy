"use client";

import React, { useState, useMemo } from "react";
import { Receipt, ShieldAlert, Check } from "lucide-react";
import { calculateTax, getRegimeCopy, TaxRegimeType, UZ_TAX_REGIMES } from "@/lib/engine/tax";
import { useBusiness, useSeededState } from "@/lib/store/business-store";
import { useLanguage } from "@/lib/i18n/language-store";
import { formatMoney, formatPercent, parseNumberInput } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function TaxCalculatorPage() {
  const { business } = useBusiness();
  const { t, locale } = useLanguage();

  const [selectedRegime, setSelectedRegime] = useState<TaxRegimeType>("turnover");
  const [revenue, setRevenue] = useSeededState<number>(business.monthlyRevenue || 45_000_000);
  const [expenses, setExpenses] = useSeededState<number>(business.monthlyExpenses || 28_000_000);
  const [customRate, setCustomRate] = useState<number | undefined>(undefined);
  // QQS bazasini foydalanuvchi aniqlashtira olishi kerak — standart 60% taxmin
  // QQS summasini sezilarli o'zgartiradi.
  const [vatableExpenses, setVatableExpenses] = useState<number | undefined>(undefined);

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
        <Badge variant="warning">{t.tax.demoBadge}</Badge>
      </div>

      {/* Legal & Regulatory Disclaimer Banner */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold">{t.tax.disclaimerTitle}</p>
          <p className="leading-relaxed">{t.tax.disclaimerBody}</p>
        </div>
      </div>

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
                  <div className="flex gap-2 mt-2">
                    {[4, 1, 2].map((r) => (
                      <button
                        key={r}
                        onClick={() => setCustomRate(r)}
                        className="text-[10px] px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                      >
                        {r}% {r === 4 ? t.tax.turnoverRateStandard : t.tax.turnoverRatePreferential}
                      </button>
                    ))}
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
                  <div key={idx} className="py-2.5 flex justify-between items-center">
                    <span className="text-slate-700 font-medium">{item.label}</span>
                    <span className="text-slate-900 font-bold">{formatMoney(item.amount)}</span>
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
