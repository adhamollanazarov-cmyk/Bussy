"use client";

import React, { useMemo } from "react";
import {
  TrendingUp,
  AlertTriangle,
  Target,
  CheckCircle2,
  Compass,
} from "lucide-react";
import { analyzeBusinessIdea } from "@/lib/engine/analyzer";
import { useBusiness, useSeededState } from "@/lib/store/business-store";
import { useLanguage } from "@/lib/i18n/language-store";
import { formatMoney, parseNumberInput } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function MarketAnalysisPage() {
  const { business } = useBusiness();
  const { t, locale } = useLanguage();

  const [businessType, setBusinessType] = useSeededState(business.type || "Fast Food");
  const [location, setLocation] = useSeededState(business.location || "Urganch");
  const [budget, setBudget] = useSeededState<number>(business.initialCapital || 100_000_000);
  const [targetCustomer, setTargetCustomer] = useSeededState(
    business.targetCustomer || "Talabalar va aholi"
  );

  // Tahlil sof funksiya — kiritishlar o'zgarishi bilan darhol qayta hisoblanadi.
  // Ilgari bu yerda 450 ms sun'iy kutish bor edi va natija "AI" deb ko'rsatilardi.
  const analysis = useMemo(
    () =>
      analyzeBusinessIdea({
        businessIdea: businessType,
        location,
        budget,
        targetCustomer,
        locale,
      }),
    [businessType, location, budget, targetCustomer, locale]
  );

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-emerald-600" />
            {t.market.pageTitle}
          </h1>
          <p className="text-sm text-slate-500">{t.market.pageDesc}</p>
        </div>
        <Badge variant="outline">{t.market.hypothesisBadge}</Badge>
      </div>

      {/* Mandatory Disclaimer (Section 22) */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold">{t.market.disclaimerTitle}</p>
          <p className="leading-relaxed">{t.market.disclaimerBody}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Inputs */}
        <div className="lg:col-span-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t.market.paramsHeading}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                label={t.market.typeLabel}
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
              />
              <Input
                label={t.market.locationLabel}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
              <Input
                label={t.market.budgetLabel}
                value={budget ? budget.toLocaleString("ru-RU") : ""}
                onChange={(e) => setBudget(parseNumberInput(e.target.value))}
                suffix={t.common.currency}
              />
              <Input
                label={t.market.targetCustomerLabel}
                value={targetCustomer}
                onChange={(e) => setTargetCustomer(e.target.value)}
              />

              <p className="text-[11px] text-slate-400 leading-relaxed pt-1">{t.market.liveHint}</p>
            </CardContent>
          </Card>
        </div>

        {/* Right Output Modules */}
        <div className="lg:col-span-8 space-y-4">
          {/* Card: Biznes modeli & Bozor holati */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Compass className="h-4 w-4 text-emerald-600" />
                <span>{t.market.modelHeading}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-slate-700">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 leading-relaxed">
                {analysis.businessModel}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-white border border-slate-200">
                  <span className="text-[11px] text-slate-400 block mb-1">{t.market.targetAudienceLabel}</span>
                  <span className="font-semibold text-slate-900">{analysis.targetCustomer}</span>
                </div>
                <div className="p-3 rounded-xl bg-white border border-slate-200">
                  <span className="text-[11px] text-slate-400 block mb-1">{t.market.paybackLabel}</span>
                  <span className="font-semibold text-emerald-700">
                    {t.market.paybackValue.replace(
                      "{months}",
                      String(analysis.financialProjection.paybackPeriodMonths)
                    )}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white border border-slate-200">
                  <span className="text-[11px] text-slate-400 block mb-1">{t.market.estRevenueLabel}</span>
                  <span className="font-semibold text-slate-900">
                    {formatMoney(analysis.financialProjection.estimatedMonthlyRevenue)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white border border-slate-200">
                  <span className="text-[11px] text-slate-400 block mb-1">{t.market.estProfitLabel}</span>
                  <span className="font-semibold text-emerald-700">
                    {formatMoney(analysis.financialProjection.estimatedMonthlyProfit)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card: Tekshirilishi kerak bo'lgan gipotezalar (Section 22) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                <span>{t.market.validationHeading}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-xs text-slate-700">
                {analysis.requiredValidation.map((val, idx) => (
                  <li key={idx} className="flex items-start gap-2 bg-blue-50/50 p-2.5 rounded-xl border border-blue-100">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-bold">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{val}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Card: Risklar va Keyingi qadamlar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>{t.market.risksHeading}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5 text-xs text-slate-600">
                  {analysis.risks.map((r, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-rose-500 font-bold">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5" />
                  <span>{t.market.nextStepsHeading}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5 text-xs text-slate-600">
                  {analysis.nextSteps.map((s, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
