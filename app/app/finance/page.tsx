"use client";

import React, { useState, useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  Coins,
  Receipt,
  Sparkles,
  ArrowUpRight,
  Layers,
} from "lucide-react";
import { calculateProfit } from "@/lib/engine/profit";
import { calculateCashflow } from "@/lib/engine/cashflow";
import { calculateBreakEven } from "@/lib/engine/breakeven";
import { calculateLoan } from "@/lib/engine/loan";
import { DEFAULT_TURNOVER_TAX_PERCENT, resolveUnitEconomics } from "@/lib/engine/assumptions";
import { FinanceChart } from "@/components/charts/finance-chart";
import { BreakEvenChart } from "@/components/charts/breakeven-chart";
import { useBusiness, useSeededState } from "@/lib/store/business-store";
import { useLanguage } from "@/lib/i18n/language-store";
import { formatMoney, formatPercent, parseNumberInput, safeRatioPercent } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function FinanceAnalysisPage() {
  const { business, updateBusiness } = useBusiness();
  const { t, locale } = useLanguage();

  // Biznes ma'lumotidan kelib chiqqan kredit to'lovi (qat'iy raqam o'rniga)
  const derivedLoanPayment = useMemo(
    () =>
      calculateLoan({
        amount: business.potentialLoan,
        annualRate: business.loanRate,
        months: business.loanMonths,
      }).monthlyPayment,
    [business.potentialLoan, business.loanRate, business.loanMonths]
  );

  // Form inputs
  const [revenue, setRevenue] = useSeededState<number>(business.monthlyRevenue || 45_000_000);
  const [rent, setRent] = useState<number>(7_000_000);
  const [salaries, setSalaries] = useState<number>(10_000_000);
  const [marketing, setMarketing] = useState<number>(2_500_000);
  const [cogs, setCogs] = useState<number>(12_000_000); // mahsulot tannarxi / xom-ashyo
  const [otherCosts, setOtherCosts] = useState<number>(2_000_000);
  const [loanPayment, setLoanPayment] = useSeededState<number>(derivedLoanPayment);
  const [taxRate, setTaxRate] = useState<number>(DEFAULT_TURNOVER_TAX_PERCENT);

  // Hisob-kitoblar
  const fixedCost = rent + salaries + otherCosts;
  const variableCost = cogs + marketing;
  const totalExpenses = fixedCost + variableCost;

  const profitResult = useMemo(() => {
    return calculateProfit({
      revenue,
      fixedCost,
      variableCost,
      taxRate,
    });
  }, [revenue, fixedCost, variableCost, taxRate]);

  const cashflowResult = useMemo(() => {
    return calculateCashflow({
      revenue,
      expenses: totalExpenses,
      loanPayment,
      tax: profitResult.taxAmount,
    });
  }, [revenue, totalExpenses, loanPayment, profitResult.taxAmount]);

  // Birlik iqtisodiyoti biznes turiga qarab boshlanadi, lekin foydalanuvchi
  // o'z narxlarini kiritishi mumkin — aks holda u aniq xarajatlarini kiritib
  // ham zararsizlikni o'rtacha namunaviy chek bo'yicha olardi.
  const unitEconomics = useMemo(
    () => resolveUnitEconomics(business.type, locale),
    [business.type, locale]
  );
  const [sellingPrice, setSellingPrice] = useSeededState<number>(unitEconomics.sellingPrice);
  const [unitCost, setUnitCost] = useSeededState<number>(unitEconomics.variableCostPerUnit);

  const breakEvenResult = useMemo(() => {
    return calculateBreakEven({
      fixedCost,
      sellingPrice,
      variableCostPerUnit: unitCost,
    });
  }, [fixedCost, sellingPrice, unitCost]);

  // AI Insights hisoblash (Section 20)
  const insights = useMemo(() => {
    const expenseCategories = [
      { name: t.finance.expenseCategoryRent, amount: rent },
      { name: t.finance.expenseCategorySalaries, amount: salaries },
      { name: t.finance.expenseCategoryCogs, amount: cogs },
      { name: t.finance.expenseCategoryMarketing, amount: marketing },
      { name: t.finance.expenseCategoryOther, amount: otherCosts },
    ];
    expenseCategories.sort((a, b) => b.amount - a.amount);
    const topExpense = expenseCategories[0];

    // Tushum 15% oshganda qanday bo'ladi? — kalkulyator orqali, inline formula emas
    const elevated = calculateProfit({
      revenue: Math.round(revenue * 1.15),
      fixedCost,
      variableCost,
      taxRate,
    });
    const profitDiff = elevated.netProfit - profitResult.netProfit;

    return {
      topExpense,
      elevatedProfit: elevated.netProfit,
      profitDiff,
    };
  }, [
    rent,
    salaries,
    cogs,
    marketing,
    otherCosts,
    revenue,
    fixedCost,
    variableCost,
    taxRate,
    profitResult.netProfit,
    t,
  ]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-emerald-600" />
            {t.finance.pageTitle}
          </h1>
          <p className="text-sm text-slate-500">{t.finance.pageDesc}</p>
        </div>
        <button
          onClick={() => {
            updateBusiness({ monthlyRevenue: revenue, monthlyExpenses: totalExpenses });
          }}
          className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium"
        >
          {t.finance.saveToBusiness}
        </button>
      </div>

      {/* Top 4 KPI Cards (Section 11) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span>{t.finance.kpiRevenue}</span>
            <Coins className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-900">{formatMoney(revenue)}</div>
          <div className="text-[11px] text-emerald-600 mt-1 flex items-center">
            <ArrowUpRight className="h-3 w-3" />
            <span>{t.finance.kpiRevenueSub}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span>{t.finance.kpiExpenses}</span>
            <Receipt className="h-4 w-4 text-rose-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-rose-600">
            {formatMoney(totalExpenses)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">{t.finance.kpiExpensesSub}</div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-medium mb-1">
            <span>{t.finance.kpiNetProfit}</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-emerald-950">
            {formatMoney(profitResult.netProfit)}
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-1">
            {t.finance.kpiNetProfitSub.replace("{margin}", String(profitResult.netMargin))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span>{t.finance.kpiCashflow}</span>
            <Layers className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-900">
            {formatMoney(cashflowResult.netCashflow)}
          </div>
          <div className="text-[11px] text-blue-600 mt-1">{t.finance.kpiCashflowSub}</div>
        </div>
      </div>

      {/* AI Insights Banner (Section 20) */}
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/70 via-white to-slate-50 p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-7 w-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
            <Sparkles className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">{t.finance.insightsHeading}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-700">
          <div className="bg-white p-3 rounded-xl border border-slate-200/80">
            <span className="text-[11px] text-slate-400 block mb-1">{t.finance.insightTopExpenseLabel}</span>
            <p className="font-semibold text-slate-900">
              {t.finance.insightTopExpenseBody
                .replace("{name}", insights.topExpense.name)
                .replace("{amount}", formatMoney(insights.topExpense.amount))}
            </p>
            <span className="text-[10px] text-slate-500 block mt-1">
              {t.finance.insightTopExpenseSub.replace(
                "{percent}",
                formatPercent(safeRatioPercent(insights.topExpense.amount, totalExpenses))
              )}
            </span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200/80">
            <span className="text-[11px] text-slate-400 block mb-1">{t.finance.insightRevenueUpLabel}</span>
            <p className="font-semibold text-emerald-800">
              {t.finance.insightRevenueUpBody.replace("{amount}", formatMoney(insights.profitDiff))}
            </p>
            <span className="text-[10px] text-slate-500 block mt-1">
              {t.finance.insightRevenueUpSub.replace("{amount}", formatMoney(insights.elevatedProfit))}
            </span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200/80">
            <span className="text-[11px] text-slate-400 block mb-1">{t.finance.insightBreakEvenLabel}</span>
            <p className="font-semibold text-slate-900">
              {t.finance.insightBreakEvenBody.replace(
                "{units}",
                `${breakEvenResult.breakEvenUnits.toLocaleString(locale === "en" ? "en-US" : "ru-RU")} ${unitEconomics.unitLabel}${locale === "en" ? "s" : ""}`
              )}
            </p>
            <span className="text-[10px] text-slate-500 block mt-1">
              {t.finance.insightBreakEvenSub
                .replace("{daily}", String(breakEvenResult.dailyUnits))
                .replace("{price}", formatMoney(unitEconomics.sellingPrice))}
            </span>
          </div>
        </div>
      </div>

      {/* Main Breakdown & Inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cost input breakdown */}
        <div className="lg:col-span-5 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t.finance.costsHeading}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                label={t.finance.revenueLabel}
                type="text"
                value={revenue ? revenue.toLocaleString("ru-RU") : ""}
                onChange={(e) => setRevenue(parseNumberInput(e.target.value))}
                suffix={t.common.currency}
              />
              <Input
                label={t.finance.rentLabel}
                type="text"
                value={rent ? rent.toLocaleString("ru-RU") : ""}
                onChange={(e) => setRent(parseNumberInput(e.target.value))}
                suffix={t.common.currency}
              />
              <Input
                label={t.finance.salariesLabel}
                type="text"
                value={salaries ? salaries.toLocaleString("ru-RU") : ""}
                onChange={(e) => setSalaries(parseNumberInput(e.target.value))}
                suffix={t.common.currency}
              />
              <Input
                label={t.finance.cogsLabel}
                type="text"
                value={cogs ? cogs.toLocaleString("ru-RU") : ""}
                onChange={(e) => setCogs(parseNumberInput(e.target.value))}
                suffix={t.common.currency}
              />
              <Input
                label={t.finance.marketingLabel}
                type="text"
                value={marketing ? marketing.toLocaleString("ru-RU") : ""}
                onChange={(e) => setMarketing(parseNumberInput(e.target.value))}
                suffix={t.common.currency}
              />
              <Input
                label={t.finance.otherCostsLabel}
                type="text"
                value={otherCosts ? otherCosts.toLocaleString("ru-RU") : ""}
                onChange={(e) => setOtherCosts(parseNumberInput(e.target.value))}
                suffix={t.common.currency}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label={t.finance.loanPaymentLabel}
                  type="text"
                  value={loanPayment ? loanPayment.toLocaleString("ru-RU") : ""}
                  onChange={(e) => setLoanPayment(parseNumberInput(e.target.value))}
                  suffix={t.common.currency}
                />
                <Input
                  label={t.finance.taxRateLabel}
                  type="number"
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  suffix="%"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {t.finance.unitEconHeading}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label={t.finance.avgTicketLabel}
                    type="text"
                    value={sellingPrice ? sellingPrice.toLocaleString("ru-RU") : ""}
                    onChange={(e) => setSellingPrice(parseNumberInput(e.target.value))}
                    suffix={t.common.currency}
                  />
                  <Input
                    label={t.finance.unitCostLabel}
                    type="text"
                    value={unitCost ? unitCost.toLocaleString("ru-RU") : ""}
                    onChange={(e) => setUnitCost(parseNumberInput(e.target.value))}
                    suffix={t.common.currency}
                  />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {t.finance.unitEconFootnote.replace("{type}", unitEconomics.displayName)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts & Visuals */}
        <div className="lg:col-span-7 space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span>{t.finance.chartRevenueHeading}</span>
                <Badge variant="outline">{t.finance.chartComparisonBadge}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FinanceChart
                revenue={revenue}
                expenses={totalExpenses}
                netProfit={profitResult.netProfit}
                taxAmount={profitResult.taxAmount}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span>{t.finance.chartBreakEvenHeading}</span>
                <Badge variant="secondary">
                  {t.finance.chartBreakEvenBadge.replace(
                    "{units}",
                    `${breakEvenResult.breakEvenUnits} ${unitEconomics.unitLabel}${locale === "en" ? "s" : ""}`
                  )}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BreakEvenChart
                fixedCost={fixedCost}
                sellingPrice={breakEvenResult.sellingPrice}
                variableCostPerUnit={breakEvenResult.variableCostPerUnit}
                breakEvenUnits={breakEvenResult.breakEvenUnits}
                breakEvenRevenue={breakEvenResult.breakEvenRevenue}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
