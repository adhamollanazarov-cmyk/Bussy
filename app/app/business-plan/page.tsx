"use client";

import React, { useMemo } from "react";
import { FileText, Printer, Sparkles, MapPin } from "lucide-react";
import { generateStructuredBusinessPlan } from "@/lib/engine/analyzer";
import { COST_SPLIT, DAYS_PER_MONTH, resolveUnitEconomics } from "@/lib/engine/assumptions";
import { BusinessPlanData } from "@/lib/engine/types";
import { useBusiness, useSeededState } from "@/lib/store/business-store";
import { useLanguage } from "@/lib/i18n/language-store";
import { formatMoney, parseNumberInput } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function BusinessPlanPage() {
  const { business, savedBusinessPlan, saveBusinessPlan } = useBusiness();
  const { t, locale } = useLanguage();

  // Form holatlari — saqlangan biznes ma'lumoti yuklangach avtomatik yangilanadi
  const [businessName, setBusinessName] = useSeededState(business.name || "Fast Food Urganch");
  const [businessType, setBusinessType] = useSeededState(business.type || "Fast Food");
  const [location, setLocation] = useSeededState(business.location || "Urganch");
  const [initialCapital, setInitialCapital] = useSeededState<number>(
    business.initialCapital || 100_000_000
  );
  const [potentialLoan, setPotentialLoan] = useSeededState<number>(
    business.potentialLoan || 50_000_000
  );
  const [expectedRevenue, setExpectedRevenue] = useSeededState<number>(
    business.monthlyRevenue || 45_000_000
  );
  const [monthlyExpenses, setMonthlyExpenses] = useSeededState<number>(
    business.monthlyExpenses || 28_000_000
  );
  const [employees, setEmployees] = useSeededState<number>(business.employees || 4);
  const [targetCustomer, setTargetCustomer] = useSeededState(
    business.targetCustomer || "Talabalar, shahar aholisi va yoshlar"
  );

  // Reja formadan jonli hisoblanadi — hech qanday sun'iy kutish yo'q.
  const plan = useMemo<BusinessPlanData>(
    () =>
      generateStructuredBusinessPlan({
        businessName,
        businessType,
        location,
        initialCapital,
        potentialLoan,
        expectedRevenue,
        monthlyExpenses,
        employees,
        targetCustomer,
        locale,
      }),
    [
      businessName,
      businessType,
      location,
      initialCapital,
      potentialLoan,
      expectedRevenue,
      monthlyExpenses,
      employees,
      targetCustomer,
      locale,
    ]
  );

  const handleSave = () => saveBusinessPlan(plan);

  const unitEconomics = resolveUnitEconomics(plan.businessType, locale);
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
  ];

  // Butun reja solishtiriladi: ilgari faqat `businessName` tekshirilar va
  // boshqa maydonni tahrirlaganda "Saqlandi ✓" noto'g'ri qolib ketardi.
  const savedMatchesForm = useMemo(
    () =>
      savedBusinessPlan != null &&
      JSON.stringify(savedBusinessPlan) === JSON.stringify(plan),
    [savedBusinessPlan, plan]
  );

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Non-print Header */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-emerald-600" />
            {t.businessPlan.pageTitle}
          </h1>
          <p className="text-sm text-slate-500">{t.businessPlan.pageDesc}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="emerald" size="sm" onClick={handlePrintPDF}>
            <Printer className="h-4 w-4" />
            <span>{t.businessPlan.downloadPdf}</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form Controls (Hidden on Print) */}
        <div className="print:hidden lg:col-span-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t.businessPlan.paramsHeading}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <Input
                label={t.businessPlan.nameLabel}
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
              <Input
                label={t.businessPlan.typeLabel}
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
              />
              <Input
                label={t.businessPlan.locationLabel}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
              <Input
                label={t.businessPlan.initialCapitalLabel}
                value={initialCapital ? initialCapital.toLocaleString("ru-RU") : ""}
                onChange={(e) => setInitialCapital(parseNumberInput(e.target.value))}
                suffix={t.common.currency}
              />
              <Input
                label={t.businessPlan.loanLabel}
                value={potentialLoan ? potentialLoan.toLocaleString("ru-RU") : ""}
                onChange={(e) => setPotentialLoan(parseNumberInput(e.target.value))}
                suffix={t.common.currency}
              />
              <Input
                label={t.businessPlan.revenueLabel}
                value={expectedRevenue ? expectedRevenue.toLocaleString("ru-RU") : ""}
                onChange={(e) => setExpectedRevenue(parseNumberInput(e.target.value))}
                suffix={t.common.currency}
              />
              <Input
                label={t.businessPlan.expensesLabel}
                value={monthlyExpenses ? monthlyExpenses.toLocaleString("ru-RU") : ""}
                onChange={(e) => setMonthlyExpenses(parseNumberInput(e.target.value))}
                suffix={t.common.currency}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label={t.businessPlan.employeesLabel}
                  type="number"
                  value={employees}
                  onChange={(e) => setEmployees(parseInt(e.target.value) || 1)}
                />
              </div>
              <Input
                label={t.businessPlan.targetCustomerLabel}
                value={targetCustomer}
                onChange={(e) => setTargetCustomer(e.target.value)}
              />

              <Button onClick={handleSave} variant="primary" className="w-full text-xs py-2.5 mt-2">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <span>{savedMatchesForm ? t.businessPlan.savedCta : t.businessPlan.saveCta}</span>
              </Button>
              <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                {t.businessPlan.saveHint}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Preview: 11-Section Document */}
        <div className="lg:col-span-8 print:col-span-12">
          <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-10 shadow-sm print:border-none print:shadow-none print:p-0 space-y-8">
            {/* Document Header */}
            <div className="border-b-2 border-slate-900 pb-6 flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md">
                  {t.businessPlan.docBadge}
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 mt-2 font-mono">
                  {plan.businessName}
                </h2>
                <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <span>{plan.location} • {plan.businessType}</span>
                </p>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-slate-900 font-mono">bussy</span>
                <p className="text-[10px] text-slate-400">{t.businessPlan.docSubtitle}</p>
              </div>
            </div>

            {/* 11 Structured Sections */}
            <div className="space-y-6 text-slate-800 text-sm leading-relaxed">
              {/* 1. Tavsif */}
              <section className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-900 text-[11px] text-white">1</span>
                  {t.businessPlan.sectionOverview}
                </h3>
                <p className="text-slate-700 text-xs sm:text-sm pl-7">{plan.sections?.overview}</p>
              </section>

              {/* 2. Maqsadli mijoz */}
              <section className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-900 text-[11px] text-white">2</span>
                  {t.businessPlan.sectionTargetMarket}
                </h3>
                <p className="text-slate-700 text-xs sm:text-sm pl-7">{plan.sections?.targetMarket}</p>
              </section>

              {/* 3. Mahsulot va xizmat */}
              <section className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-900 text-[11px] text-white">3</span>
                  {t.businessPlan.sectionProductService}
                </h3>
                <p className="text-slate-700 text-xs sm:text-sm pl-7">{plan.sections?.productService}</p>
              </section>

              {/* 4. Boshlang'ich xarajatlar */}
              <section className="space-y-2">
                <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-900 text-[11px] text-white">4</span>
                  {t.businessPlan.sectionStartupCosts}
                </h3>
                <div className="pl-7">
                  <table className="w-full text-xs text-left border border-slate-200 rounded-xl overflow-hidden">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">{t.businessPlan.tableExpenseItem}</th>
                        <th className="p-2.5 text-right">{t.businessPlan.tableAmount}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {plan.sections?.startupCosts.map((sc, i) => (
                        <tr key={i}>
                          <td className="p-2 text-slate-700">{sc.title}</td>
                          <td className="p-2 text-right font-semibold text-slate-900">{formatMoney(sc.amount)}</td>
                        </tr>
                      ))}
                      <tr className="bg-emerald-50/50 font-bold text-emerald-950">
                        <td className="p-2.5">{t.businessPlan.totalStartupCapital}</td>
                        <td className="p-2.5 text-right text-emerald-700">
                          {formatMoney(plan.initialCapital + (plan.potentialLoan || 0))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* 5. Oylik xarajatlar */}
              <section className="space-y-2">
                <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-900 text-[11px] text-white">5</span>
                  {t.businessPlan.sectionMonthlyExpenses}
                </h3>
                <div className="pl-7">
                  <table className="w-full text-xs text-left border border-slate-200 rounded-xl overflow-hidden">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">{t.businessPlan.tableMonthlyExpense}</th>
                        <th className="p-2.5 text-right">{t.businessPlan.tableAmount}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {plan.sections?.monthlyExpensesBreakdown.map((me, i) => (
                        <tr key={i}>
                          <td className="p-2 text-slate-700">{me.title}</td>
                          <td className="p-2 text-right font-medium text-slate-900">{formatMoney(me.amount)}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 font-bold text-slate-900">
                        <td className="p-2.5">{t.businessPlan.totalMonthlyExpense}</td>
                        <td className="p-2.5 text-right text-rose-600">
                          {formatMoney(plan.monthlyExpenses)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* 6. Daromad prognozi */}
              <section className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-900 text-[11px] text-white">6</span>
                  {t.businessPlan.sectionRevenueProjection}
                </h3>
                <p className="text-slate-700 text-xs sm:text-sm pl-7">{plan.sections?.revenueProjection}</p>
              </section>

              {/* 7. Foyda */}
              <section className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-900 text-[11px] text-white">7</span>
                  {t.businessPlan.sectionProfitability}
                </h3>
                <p className="text-slate-700 text-xs sm:text-sm pl-7">{plan.sections?.profitability}</p>
              </section>

              {/* 8. Break-even */}
              <section className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-900 text-[11px] text-white">8</span>
                  {t.businessPlan.sectionBreakEven}
                </h3>
                <p className="text-slate-700 text-xs sm:text-sm pl-7">{plan.sections?.breakEven}</p>
              </section>

              {/* 9. Marketing */}
              <section className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-900 text-[11px] text-white">9</span>
                  {t.businessPlan.sectionMarketing}
                </h3>
                <p className="text-slate-700 text-xs sm:text-sm pl-7">{plan.sections?.marketing}</p>
              </section>

              {/* 10. Risklar */}
              <section className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-900 text-[11px] text-white">10</span>
                  {t.businessPlan.sectionRisks}
                </h3>
                <ul className="pl-11 list-disc text-xs sm:text-sm text-slate-700 space-y-1">
                  {plan.sections?.risks.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </section>

              {/* 11. Moliyalashtirish */}
              <section className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-900 text-[11px] text-white">11</span>
                  {t.businessPlan.sectionFunding}
                </h3>
                <p className="text-slate-700 text-xs sm:text-sm pl-7">{plan.sections?.fundingStrategy}</p>
              </section>
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

            {/* Document Signature Strip */}
            <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-6 text-xs text-slate-500">
              <div>
                <p className="font-semibold text-slate-900">{t.businessPlan.signatureFounder}</p>
                <div className="mt-4 border-b border-slate-300 w-48"></div>
                <p className="mt-1">{t.businessPlan.signatureLine}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-slate-900">{t.businessPlan.signatureEngine}</p>
                <p className="mt-1 text-[11px]">{t.businessPlan.signatureNote}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
