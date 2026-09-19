"use client";

import React, { useState, useMemo } from "react";
import {
  Sliders,
  Sparkles,
  TrendingUp,
  Layers,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Zap,
} from "lucide-react";
import { calculateProfit } from "@/lib/engine/profit";
import { calculateLoan } from "@/lib/engine/loan";
import { calculateBreakEven } from "@/lib/engine/breakeven";
import { calculateCashflow } from "@/lib/engine/cashflow";
import {
  COST_SPLIT,
  DAYS_PER_MONTH,
  DEFAULT_TURNOVER_TAX_PERCENT,
  resolveUnitEconomics,
} from "@/lib/engine/assumptions";
import { useBusiness } from "@/lib/store/business-store";
import { useLanguage } from "@/lib/i18n/language-store";
import {
  formatMoney,
  formatPercent,
  safeRatioPercent,
  classifyBreakEven,
} from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function WhatIfSimulatorPage() {
  const { business } = useBusiness();
  const { t, locale } = useLanguage();

  // Baseline boshlang'ich qiymatlar
  const baselineRevenue = business.monthlyRevenue || 45_000_000;
  const baselineCost = business.monthlyExpenses || 28_000_000;
  const baselineLoan = business.potentialLoan || 50_000_000;
  const baselineRate = business.loanRate || 24;

  // Slayder holatlari (ko'paytiruvchilar yoki absolute)
  const [salesVolumeMultiplier, setSalesVolumeMultiplier] = useState<number>(100); // % (80% - 160%)
  const [priceMultiplier, setPriceMultiplier] = useState<number>(100); // % (80% - 140%)
  const [costMultiplier, setCostMultiplier] = useState<number>(100); // % (70% - 150%)
  const [simLoanAmount, setSimLoanAmount] = useState<number>(baselineLoan);
  const [simLoanRate, setSimLoanRate] = useState<number>(baselineRate);

  // Xulosa matni
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  // Biznes turiga mos birlik iqtisodiyoti (narx va tannarx)
  const unitEconomics = useMemo(
    () => resolveUnitEconomics(business.type, locale),
    [business.type, locale]
  );

  const percentFormatter = new Intl.NumberFormat(locale, { style: "percent" });
  const assumptions = [
    t.calculationAssumptions.costSplit
      .replace("{fixed}", percentFormatter.format(COST_SPLIT.fixed))
      .replace("{variable}", percentFormatter.format(COST_SPLIT.variable)),
    t.calculationAssumptions.daysPerMonth.replace("{days}", String(DAYS_PER_MONTH)),
    t.calculationAssumptions.unitEconomics
      .replace("{type}", unitEconomics.displayName)
      .replace("{price}", formatMoney(unitEconomics.sellingPrice))
      .replace("{cost}", formatMoney(unitEconomics.variableCostPerUnit)),
    t.calculationAssumptions.simulatorAdjustments,
  ];

  // Baseline hisob — foyda ham kalkulyator orqali, inline formula bilan emas
  const baseLoanRes = useMemo(
    () => calculateLoan({ amount: baselineLoan, annualRate: baselineRate, months: 24 }),
    [baselineLoan, baselineRate]
  );

  const baseFixedCost = Math.round(baselineCost * COST_SPLIT.fixed);
  const baseVariableCost = Math.round(baselineCost * COST_SPLIT.variable);

  const baseProfitRes = useMemo(
    () =>
      calculateProfit({
        revenue: baselineRevenue,
        fixedCost: baseFixedCost,
        variableCost: baseVariableCost,
        taxRate: DEFAULT_TURNOVER_TAX_PERCENT,
      }),
    [baselineRevenue, baseFixedCost, baseVariableCost]
  );

  const baseCashflowRes = useMemo(
    () =>
      calculateCashflow({
        revenue: baselineRevenue,
        expenses: baselineCost,
        loanPayment: baseLoanRes.monthlyPayment,
        tax: baseProfitRes.taxAmount,
      }),
    [baselineRevenue, baselineCost, baseLoanRes.monthlyPayment, baseProfitRes.taxAmount]
  );

  const baseBreakEvenRes = useMemo(
    () =>
      calculateBreakEven({
        fixedCost: baseFixedCost,
        sellingPrice: unitEconomics.sellingPrice,
        variableCostPerUnit: unitEconomics.variableCostPerUnit,
      }),
    [baseFixedCost, unitEconomics]
  );

  // Dinamik simulyatsiya qilingan qiymatlar
  const simulatedRevenue = Math.round(
    baselineRevenue * (salesVolumeMultiplier / 100) * (priceMultiplier / 100)
  );
  const simulatedFixedCost = Math.round(baselineCost * COST_SPLIT.fixed * (costMultiplier / 100));
  const simulatedVariableCost = Math.round(
    baselineCost * COST_SPLIT.variable * (salesVolumeMultiplier / 100) * (costMultiplier / 100)
  );
  const simulatedTotalCost = simulatedFixedCost + simulatedVariableCost;

  // Kredit hisobi
  const simLoanRes = useMemo(() => {
    return calculateLoan({
      amount: simLoanAmount,
      annualRate: simLoanRate,
      months: 24,
    });
  }, [simLoanAmount, simLoanRate]);

  // Simulyatsiya qilingan foyda
  const simProfitRes = useMemo(() => {
    return calculateProfit({
      revenue: simulatedRevenue,
      fixedCost: simulatedFixedCost,
      variableCost: simulatedVariableCost,
      taxRate: DEFAULT_TURNOVER_TAX_PERCENT,
    });
  }, [simulatedRevenue, simulatedFixedCost, simulatedVariableCost]);

  // Simulyatsiya qilingan cashflow
  const simCashflowRes = useMemo(() => {
    return calculateCashflow({
      revenue: simulatedRevenue,
      expenses: simulatedTotalCost,
      loanPayment: simLoanRes.monthlyPayment,
      tax: simProfitRes.taxAmount,
    });
  }, [simulatedRevenue, simulatedTotalCost, simLoanRes.monthlyPayment, simProfitRes.taxAmount]);

  // Simulyatsiya qilingan break-even
  const simBreakEvenRes = useMemo(() => {
    return calculateBreakEven({
      fixedCost: simulatedFixedCost,
      sellingPrice: unitEconomics.sellingPrice * (priceMultiplier / 100),
      variableCostPerUnit: unitEconomics.variableCostPerUnit * (costMultiplier / 100),
    });
  }, [simulatedFixedCost, priceMultiplier, costMultiplier, unitEconomics]);

  // Slayderlar narxni tannarxdan pastga tushira oladi — o'shanda zararsizlik
  // "0 ta" emas, "erishib bo'lmaydi" bo'lishi kerak. O'zgarmas xarajat nol
  // bo'lgan holat esa butunlay boshqa xabar beradi.
  const baseBreakEvenStatus = classifyBreakEven(baseBreakEvenRes);
  const simBreakEvenStatus = classifyBreakEven(simBreakEvenRes);

  // Farqlar (Delta)
  const profitDelta = simProfitRes.netProfit - baseProfitRes.netProfit;
  const cashflowDelta = simCashflowRes.netCashflow - baseCashflowRes.netCashflow;

  const handleResetSliders = () => {
    setSalesVolumeMultiplier(100);
    setPriceMultiplier(100);
    setCostMultiplier(100);
    setSimLoanAmount(baselineLoan);
    setSimLoanRate(baselineRate);
    setAiAnalysis(null);
  };

  // Xulosa aniq raqamlardan bir zumda tuziladi — sun'iy "o'ylash" kutishi yo'q.
  const handleRunAnalysis = () => {
    const volumeDiff = salesVolumeMultiplier - 100;
    const priceDiff = priceMultiplier - 100;
    const costDiff = costMultiplier - 100;

    const changes: string[] = [];
    if (volumeDiff !== 0)
      changes.push(
        t.simulator.analysisVolumeChange
          .replace("{sign}", volumeDiff > 0 ? "+" : "")
          .replace("{value}", String(volumeDiff))
      );
    if (priceDiff !== 0)
      changes.push(
        t.simulator.analysisPriceChange
          .replace("{sign}", priceDiff > 0 ? "+" : "")
          .replace("{value}", String(priceDiff))
      );
    if (costDiff !== 0)
      changes.push(
        t.simulator.analysisCostChange
          .replace("{sign}", costDiff > 0 ? "+" : "")
          .replace("{value}", String(costDiff))
      );

    let msg =
      changes.length > 0
        ? t.simulator.analysisChangedIntro.replace("{changes}", changes.join(", "))
        : t.simulator.analysisUnchangedIntro;

    msg += t.simulator.analysisBody
      .replace("{revenue}", formatMoney(simulatedRevenue))
      .replace("{sign}", profitDelta >= 0 ? "+" : "")
      .replace("{profitDiff}", formatMoney(profitDelta))
      .replace(
        "{percent}",
        formatPercent(safeRatioPercent(profitDelta, Math.abs(baseProfitRes.netProfit)))
      );

    if (simCashflowRes.netCashflow > 0) {
      msg += t.simulator.analysisCashflowPositive.replace(
        "{cashflow}",
        formatMoney(simCashflowRes.netCashflow)
      );
    } else {
      msg += t.simulator.analysisCashflowNegative;
    }

    setAiAnalysis(msg);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Sliders className="h-6 w-6 text-emerald-600" />
            {t.simulator.pageTitle}
          </h1>
          <p className="text-sm text-slate-500">{t.simulator.pageDesc}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleResetSliders} className="text-xs">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>{t.simulator.resetCta}</span>
          </Button>
          <Badge variant="success">{t.simulator.liveBadge}</Badge>
        </div>
      </div>

      {/* Dynamic Results Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Foyda card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider">{t.simulator.cardSimulatedProfit}</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {formatMoney(simProfitRes.netProfit)}
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs">
            {profitDelta >= 0 ? (
              <span className="inline-flex items-center text-emerald-700 font-semibold">
                <ArrowUpRight className="h-3.5 w-3.5" />
                +{formatMoney(profitDelta)} {t.simulator.cardBaselineSuffix}
              </span>
            ) : (
              <span className="inline-flex items-center text-rose-600 font-semibold">
                <ArrowDownRight className="h-3.5 w-3.5" />
                {formatMoney(profitDelta)} {t.simulator.cardBaselineSuffix}
              </span>
            )}
          </div>
        </div>

        {/* Cashflow card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider">{t.simulator.cardSimulatedCashflow}</span>
            <Layers className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {formatMoney(simCashflowRes.netCashflow)}
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs">
            {cashflowDelta >= 0 ? (
              <span className="inline-flex items-center text-blue-700 font-semibold">
                <ArrowUpRight className="h-3.5 w-3.5" />
                +{formatMoney(cashflowDelta)}
              </span>
            ) : (
              <span className="inline-flex items-center text-rose-600 font-semibold">
                <ArrowDownRight className="h-3.5 w-3.5" />
                {formatMoney(cashflowDelta)}
              </span>
            )}
          </div>
        </div>

        {/* Break-even card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold uppercase tracking-wider">{t.simulator.cardBreakEven}</span>
            <Target className="h-4 w-4 text-purple-600" />
          </div>
          {simBreakEvenStatus === "unreachable" ? (
            <>
              <div className="text-lg font-extrabold text-rose-700">
                {t.breakEven.unreachableShort}
              </div>
              <div className="mt-2 text-xs text-slate-600 leading-relaxed">
                {t.breakEven.unreachableBody
                  .replace("{price}", formatMoney(simBreakEvenRes.sellingPrice))
                  .replace("{cost}", formatMoney(simBreakEvenRes.variableCostPerUnit))}
              </div>
            </>
          ) : simBreakEvenStatus === "noFixedCost" ? (
            <>
              <div className="text-lg font-extrabold text-emerald-700">
                {t.breakEven.noFixedCostShort}
              </div>
              <div className="mt-2 text-xs text-slate-600 leading-relaxed">
                {t.breakEven.noFixedCostBody}
              </div>
            </>
          ) : (
            <>
              <div className="text-2xl font-extrabold text-slate-900">
                {simBreakEvenRes.breakEvenUnits.toLocaleString(locale === "en" ? "en-US" : "ru-RU")}
                {locale === "uz" ? " ta" : ""}
              </div>
              <div className="mt-2 text-xs text-slate-500">
                {t.simulator.cardBreakEvenSub
                  .replace("{daily}", String(simBreakEvenRes.dailyUnits))
                  .replace("{unit}", unitEconomics.unitLabel)}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main interactive sliders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                <span>{t.simulator.slidersHeading}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
              {/* Sotuv hajmi */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-700">{t.simulator.volumeLabel}</span>
                  <span className="text-emerald-700 font-mono font-bold">{salesVolumeMultiplier}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="200"
                  step="5"
                  value={salesVolumeMultiplier}
                  onChange={(e) => setSalesVolumeMultiplier(parseInt(e.target.value))}
                  className="w-full accent-emerald-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>{t.simulator.volumeMin}</span>
                  <span>{t.simulator.volumeMid}</span>
                  <span>{t.simulator.volumeMax}</span>
                </div>
              </div>

              {/* Mahsulot narxi */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-700">{t.simulator.priceLabel}</span>
                  <span className="text-emerald-700 font-mono font-bold">{priceMultiplier}%</span>
                </div>
                <input
                  type="range"
                  min="70"
                  max="150"
                  step="5"
                  value={priceMultiplier}
                  onChange={(e) => setPriceMultiplier(parseInt(e.target.value))}
                  className="w-full accent-emerald-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>{t.simulator.priceMin}</span>
                  <span>{t.simulator.priceMid}</span>
                  <span>{t.simulator.priceMax}</span>
                </div>
              </div>

              {/* Xarajatlar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-700">{t.simulator.costLabel}</span>
                  <span className={`font-mono font-bold ${costMultiplier > 100 ? "text-rose-600" : "text-emerald-700"}`}>
                    {costMultiplier}%
                  </span>
                </div>
                <input
                  type="range"
                  min="70"
                  max="160"
                  step="5"
                  value={costMultiplier}
                  onChange={(e) => setCostMultiplier(parseInt(e.target.value))}
                  className="w-full accent-emerald-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>{t.simulator.costMin}</span>
                  <span>{t.simulator.costMid}</span>
                  <span>{t.simulator.costMax}</span>
                </div>
              </div>

              {/* Kredit summasi va foizi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-700">{t.simulator.loanAmountLabel}</span>
                    <span className="text-slate-900 font-bold">{formatMoney(simLoanAmount)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="150000000"
                    step="5000000"
                    value={simLoanAmount}
                    onChange={(e) => setSimLoanAmount(parseInt(e.target.value))}
                    className="w-full accent-emerald-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-700">{t.simulator.loanRateLabel}</span>
                    <span className="text-slate-900 font-bold">{simLoanRate}%</span>
                  </div>
                  <input
                    type="range"
                    min="14"
                    max="34"
                    step="1"
                    value={simLoanRate}
                    onChange={(e) => setSimLoanRate(parseInt(e.target.value))}
                    className="w-full accent-emerald-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* AI Trigger */}
              <div className="pt-2">
                <Button
                  onClick={handleRunAnalysis}
                  variant="emerald"
                  className="w-full py-3 text-sm font-semibold"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>{t.simulator.analyzeCta}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right side: AI Insight & Comparison Table */}
        <div className="lg:col-span-5 space-y-4">
          {aiAnalysis && (
            <div className="rounded-2xl border-2 border-emerald-500/80 bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-5 shadow-sm animate-fade-in">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center">
                  <Sparkles className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">{t.simulator.analysisHeading}</h3>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed bg-white/80 p-3.5 rounded-xl border border-slate-200/80">
                {aiAnalysis}
              </p>
            </div>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">{t.simulator.comparisonHeading}</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-semibold">
                    <th className="pb-2">{t.simulator.tableMetric}</th>
                    <th className="pb-2 text-right">{t.simulator.tableBaseline}</th>
                    <th className="pb-2 text-right">{t.simulator.tableSimulated}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr>
                    <td className="py-2.5 text-slate-600">{t.simulator.rowRevenue}</td>
                    <td className="py-2.5 text-right font-medium">{formatMoney(baselineRevenue)}</td>
                    <td className="py-2.5 text-right font-bold text-slate-900">{formatMoney(simulatedRevenue)}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-slate-600">{t.simulator.rowExpenses}</td>
                    <td className="py-2.5 text-right font-medium">{formatMoney(baselineCost)}</td>
                    <td className="py-2.5 text-right font-bold text-rose-600">{formatMoney(simulatedTotalCost)}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-slate-600">{t.simulator.rowLoanPayment}</td>
                    <td className="py-2.5 text-right font-medium">{formatMoney(baseLoanRes.monthlyPayment)}</td>
                    <td className="py-2.5 text-right font-bold text-slate-900">{formatMoney(simLoanRes.monthlyPayment)}</td>
                  </tr>
                  <tr className="bg-emerald-50/60 font-semibold text-emerald-950">
                    <td className="py-2.5 pl-2 rounded-l-lg">{t.simulator.rowNetProfit}</td>
                    <td className="py-2.5 text-right text-slate-700">
                      {formatMoney(baseProfitRes.netProfit)}
                    </td>
                    <td className="py-2.5 pr-2 text-right text-emerald-700 font-bold rounded-r-lg">{formatMoney(simProfitRes.netProfit)}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-slate-600">
                      {t.simulator.rowBreakEven.replace("{unit}", unitEconomics.unitLabel)}
                    </td>
                    <td className="py-2.5 text-right font-medium">
                      {baseBreakEvenStatus === "unreachable" ? (
                        <span className="text-rose-600">{t.breakEven.unreachableShort}</span>
                      ) : baseBreakEvenStatus === "noFixedCost" ? (
                        <span className="text-slate-500">{t.breakEven.noFixedCostShort}</span>
                      ) : (
                        <>
                          {baseBreakEvenRes.breakEvenUnits.toLocaleString(locale === "en" ? "en-US" : "ru-RU")}
                          {locale === "uz" ? " ta" : ""}
                        </>
                      )}
                    </td>
                    <td className="py-2.5 text-right font-bold text-purple-700">
                      {simBreakEvenStatus === "unreachable" ? (
                        <span className="text-rose-600">{t.breakEven.unreachableShort}</span>
                      ) : simBreakEvenStatus === "noFixedCost" ? (
                        <span className="text-slate-500">{t.breakEven.noFixedCostShort}</span>
                      ) : (
                        <>
                          {simBreakEvenRes.breakEvenUnits.toLocaleString(locale === "en" ? "en-US" : "ru-RU")}
                          {locale === "uz" ? " ta" : ""}
                        </>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="text-[11px] text-slate-500 space-y-1">
        <h3 className="text-sm font-bold text-slate-900">{t.calculationAssumptions.heading}</h3>
        {assumptions.map((asm, i) => (
          <p key={i} className="flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span>
            <span>{asm}</span>
          </p>
        ))}
      </div>
    </div>
  );
}
