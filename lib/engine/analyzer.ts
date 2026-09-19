import { calculateLoan } from "./loan";
import { calculateProfit } from "./profit";
import { calculateBreakEven } from "./breakeven";
import {
  DebtBurdenAnalysisInput,
  DebtBurdenAnalysisResult,
  BusinessPlanData,
} from "./types";
import {
  COST_SPLIT,
  DAYS_PER_MONTH,
  DEFAULT_TURNOVER_TAX_PERCENT,
  resolveUnitEconomics,
} from "./assumptions";
import { formatMoney, formatPercent } from "../utils";
import type { Locale } from "../i18n/translations";

/**
 * `analyzeBusinessIdea` uchun namunaviy modellashtirish koeffitsiyentlari.
 * Bular statistik ma'lumot emas — dastlabki qo'pol baho uchun ishlatiladi
 * va sahifada "tekshirilishi shart" deb belgilanadi.
 */
const IDEA_MODEL = {
  /** Oylik tushum boshlang'ich byudjetning ulushi sifatida. */
  monthlyRevenueOfBudget: 0.4,
  /** Oylik xarajat tushumning ulushi sifatida. */
  monthlyExpenseOfRevenue: 0.65,
  /** Boshlang'ich xarajatlar taqsimoti (yig'indisi = 1). */
  startupAllocation: [
    { name: "Joy ijarasi (avans + depozit)", share: 0.2 },
    { name: "Uskunalar va jihozlar", share: 0.45 },
    { name: "Ta'mirlash va dizayn", share: 0.15 },
    { name: "Dastlabki xom-ashyo / tovar zaxirasi", share: 0.12 },
    { name: "Marketing va ochilish tadbiri", share: 0.08 },
  ],
} as const;

const EN_STARTUP_ALLOCATION_NAMES: Record<string, string> = {
  "Joy ijarasi (avans + depozit)": "Location rent (advance + deposit)",
  "Uskunalar va jihozlar": "Equipment and fixtures",
  "Ta'mirlash va dizayn": "Renovation and design",
  "Dastlabki xom-ashyo / tovar zaxirasi": "Initial raw materials / stock",
  "Marketing va ochilish tadbiri": "Marketing and opening event",
};

/**
 * analyzeDebtBurden
 * "Bussy, bu kreditni biznesim ko‘tara oladimi?" tahlil moduli.
 */
export function analyzeDebtBurden(input: DebtBurdenAnalysisInput): DebtBurdenAnalysisResult {
  const {
    monthlyRevenue,
    monthlyExpenses,
    loanAmount,
    annualRate,
    loanMonths,
    otherObligations = 0,
    locale = "uz",
  } = input;

  const loanRes = calculateLoan({
    amount: loanAmount,
    annualRate,
    months: loanMonths,
  });

  const operatingCashflow = monthlyRevenue - monthlyExpenses - otherObligations;
  const monthlyLoanPayment = loanRes.monthlyPayment;
  const remainingCashflow = operatingCashflow - monthlyLoanPayment;

  // Operatsion pul oqimi musbat bo'lmasa, nisbatni hisoblashning ma'nosi yo'q.
  const debtBurdenPercent =
    operatingCashflow > 0 ? (monthlyLoanPayment / operatingCashflow) * 100 : null;

  let riskLevel: "safe" | "moderate" | "high" = "safe";
  let recommendation = "";
  let verdict = "";

  if (debtBurdenPercent === null) {
    riskLevel = "high";
    if (locale === "en") {
      verdict = "Taking this loan right now poses a serious risk!";
      recommendation =
        "Your current operating cash flow is negative or zero. Making the loan payment would require funds from outside the business. We recommend cutting operating expenses or increasing revenue first.";
    } else {
      verdict = "Kreditni hozirgi holatda olish jiddiy xavf tug‘diradi!";
      recommendation =
        "Sizning joriy operatsion pul oqimingiz manfiy yoki nolga teng. Kredit to‘lovini amalga oshirish uchun biznesingizdan tashqari qo‘shimcha mablag‘ zarur bo‘ladi. Avval operatsion xarajatlarni qisqartirish yoki tushumni oshirish tavsiya etiladi.";
    }
  } else if (debtBurdenPercent <= 30) {
    riskLevel = "safe";
    if (locale === "en") {
      verdict = "Your business can comfortably carry this loan.";
      recommendation = `Your monthly operating cash flow is ${formatMoney(
        operatingCashflow
      )}. The loan payment is ${formatMoney(
        monthlyLoanPayment
      )} (debt burden: ${formatPercent(
        debtBurdenPercent
      )}). Even after the loan payment, the business keeps ${formatMoney(
        remainingCashflow
      )} in free cash. This is a safe level.`;
    } else {
      verdict = "Biznesingiz bu kredit yukini bemalol ko‘tara oladi.";
      recommendation = `Oylik operatsion pul oqimingiz ${formatMoney(
        operatingCashflow
      )} ni tashkil qiladi. Kredit to‘lovi esa ${formatMoney(
        monthlyLoanPayment
      )} (qarz yuki: ${formatPercent(
        debtBurdenPercent
      )}). Kredit to‘langandan keyin ham biznesda ${formatMoney(
        remainingCashflow
      )} erkin aylanma mablag‘ qoladi. Bu xavfsiz ko‘rsatkich.`;
    }
  } else if (debtBurdenPercent <= 50) {
    riskLevel = "moderate";
    if (locale === "en") {
      verdict = "The loan is manageable, but caution is needed.";
      recommendation = `The monthly loan payment takes up ${formatPercent(
        debtBurdenPercent
      )} of operating cash flow. With the remaining ${formatMoney(
        remainingCashflow
      )}, you should build a reserve cushion of at least 2-3 months to absorb unexpected costs or seasonal dips.`;
    } else {
      verdict = "Kreditni ko‘tarish mumkin, biroq ehtiyotkorlik talab etiladi.";
      recommendation = `Oylik kredit to‘lovi operatsion pul oqimining ${formatPercent(
        debtBurdenPercent
      )} qismini tashkil qiladi. Qolgan ${formatMoney(
        remainingCashflow
      )} bilan kutilmagan xarajatlar yoki mavsumiy pasayishlarni yengish uchun kamida 2-3 oylik zaxira fondi (reserve cushion) shakllantirish zarur.`;
    }
  } else {
    riskLevel = "high";
    if (locale === "en") {
      verdict = "High debt burden! Serious financial pressure on the business.";
      recommendation = `The loan payment takes up more than half of monthly cash flow (${formatPercent(
        debtBurdenPercent
      )}). The remaining free cash (${formatMoney(
        remainingCashflow
      )}) may not be enough for business growth and operating risk. Consider reducing the loan amount or extending the term.`;
    } else {
      verdict = "Yuqori qarz yuki! Biznes uchun jiddiy moliyaviy bosim.";
      recommendation = `Kredit to‘lovi oylik pul oqimining yarmidan ko‘pini (${formatPercent(
        debtBurdenPercent
      )}) band qiladi. Qolgan erkin mablag‘ (${formatMoney(
        remainingCashflow
      )}) biznes rivoji va operatsion xatarlar uchun yetarli bo‘lmasligi mumkin. Kredit summasini kamaytirish yoki muddatni uzaytirishni ko‘rib chiqing.`;
    }
  }

  const assumptions =
    locale === "en"
      ? [
          "The calculation assumes the entered revenue and expenses stay constant.",
          "Loan interest is computed on an annual annuity rate.",
          "This conclusion is not a bank's loan approval guarantee — it's only an internal financial burden analysis.",
        ]
      : [
          "Hisob-kitob kiritilgan doimiy tushum va xarajatlar saqlanib qolishi taxminiga asoslangan.",
          "Kredit foizi yillik annuitet stavka bo‘yicha hisoblangan.",
          "Ushbu xulosa tijorat banki tomonidan kredit tasdiqlanishi kafolati emas, faqat ichki moliyaviy yuklama tahlilidir.",
        ];

  return {
    operatingCashflow: Math.round(operatingCashflow),
    monthlyLoanPayment: Math.round(monthlyLoanPayment),
    remainingCashflow: Math.round(remainingCashflow),
    debtBurdenPercent:
      debtBurdenPercent === null ? null : Math.round(debtBurdenPercent * 10) / 10,
    riskLevel,
    verdict,
    recommendation,
    assumptions,
  };
}

/**
 * analyzeBusinessIdea
 * Biznes g'oyasini kompleks moliyaviy va strategik baholash.
 */
export function analyzeBusinessIdea(params: {
  businessIdea: string;
  location: string;
  budget: number;
  targetCustomer?: string;
  locale?: Locale;
}) {
  const {
    businessIdea,
    location,
    budget,
    targetCustomer = params.locale === "en" ? "Residents and visitors" : "Aholi va mehmonlar",
    locale = "uz",
  } = params;

  // Taxminiy parametrlar (namuna model) — koeffitsiyentlar IDEA_MODEL da izohlangan
  const estimatedStartupCosts = IDEA_MODEL.startupAllocation.map((item) => ({
    name: locale === "en" ? EN_STARTUP_ALLOCATION_NAMES[item.name] ?? item.name : item.name,
    amount: Math.round(budget * item.share),
  }));

  const estimatedMonthlyRevenue = Math.round(budget * IDEA_MODEL.monthlyRevenueOfBudget);
  const estimatedMonthlyExpenses = Math.round(
    estimatedMonthlyRevenue * IDEA_MODEL.monthlyExpenseOfRevenue
  );
  const estimatedMonthlyProfit = estimatedMonthlyRevenue - estimatedMonthlyExpenses;

  if (locale === "en") {
    return {
      businessIdea,
      location,
      budget,
      targetCustomer,
      businessModel: `A direct-to-consumer (B2C) model for ${businessIdea} in ${location}. The focus is on quality, speed and a convenient location.`,
      startupCostsBreakdown: estimatedStartupCosts,
      financialProjection: {
        estimatedMonthlyRevenue,
        estimatedMonthlyExpenses,
        estimatedMonthlyProfit,
        paybackPeriodMonths: Math.ceil(budget / Math.max(1, estimatedMonthlyProfit)),
      },
      risks: [
        "Foot traffic and customer flow at the chosen location may be lower than expected.",
        "Seasonal swings in raw material and product prices.",
        "Difficulty finding and retaining qualified staff.",
        "Direct or indirect competitors appearing nearby.",
      ],
      requiredValidation: [
        "Count foot traffic at the chosen address for at least 3 days.",
        "Study the average ticket size and customer count of the 3 nearest competitors.",
        "Check whether a long-term lease at a fixed price is available.",
      ],
      nextSteps: [
        "Pick an exact location and negotiate with the landlord.",
        "Get quotes from at least 3 suppliers for the equipment you need.",
        "Generate a detailed 11-section business plan through Bussy and download it as a PDF.",
      ],
    };
  }

  return {
    businessIdea,
    location,
    budget,
    targetCustomer,
    businessModel: `${location} sharoitida ${businessIdea} bo‘yicha to‘g‘ridan-to‘g‘ri mijozlarga xizmat ko‘rsatish (B2C) modeli. Asosiy e'tibor sifat, tezlik va qulay lokatsiyaga qaratiladi.`,
    startupCostsBreakdown: estimatedStartupCosts,
    financialProjection: {
      estimatedMonthlyRevenue,
      estimatedMonthlyExpenses,
      estimatedMonthlyProfit,
      paybackPeriodMonths: Math.ceil(budget / Math.max(1, estimatedMonthlyProfit)),
    },
    risks: [
      "Lokatsiya tanlashda piyodalar va mijozlar oqimi kutilganidan kam bo‘lishi xavfi.",
      "Xom-ashyo va mahsulot narxlarining mavsumiy tebranishi.",
      "Malakali xodimlarni topish va ushlab qolish muammosi.",
      "Yaqin atrofda to‘g‘ridan-to‘g‘ri yoki bilvosita raqobatchilar paydo bo‘lishi.",
    ],
    requiredValidation: [
      "Tanlangan manzildagi piyodalar oqimini kamida 3 kun davomida hisoblash.",
      "Eng yaqin 3 ta raqobatchining o‘rtacha cheki va mijozlar sonini o‘rganish.",
      "Ijara shartnomasini uzoq muddatga qat'iy narxda imzolash imkoniyatini tekshirish.",
    ],
    nextSteps: [
      "Aniq joy tanlash va ijara egasi bilan muzokara o‘tkazish.",
      "Kerakli uskunalar uchun kamida 3 ta yetkazib beruvchidan narx taklifi olish.",
      "Bussy orqali batafsil 11 bo‘limli biznes-reja yaratish va PDF yuklab olish.",
    ],
  };
}

/**
 * generateStructuredBusinessPlan
 * 11 bo'limli professional biznes-reja generatori
 */
export function generateStructuredBusinessPlan(data: BusinessPlanData): BusinessPlanData {
  const {
    businessType,
    businessName,
    location,
    initialCapital,
    potentialLoan = 0,
    monthlyExpenses,
    expectedRevenue,
    employees,
    targetCustomer,
    locale = "uz",
  } = data;
  const resolvedBusinessName = businessName ?? (locale === "en" ? "My Business" : "Mening Biznesim");

  const totalFunds = initialCapital + potentialLoan;

  const fixedCost = Math.round(monthlyExpenses * COST_SPLIT.fixed);
  const variableCost = Math.round(monthlyExpenses * COST_SPLIT.variable);

  // Birlik iqtisodiyoti biznes turiga qarab tanlanadi — ilgari barcha turlar
  // uchun bitta 35 000 / 18 000 juftligi qat'iy yozilgan edi.
  const unitEconomics = resolveUnitEconomics(businessType, locale);

  const profitRes = calculateProfit({
    revenue: expectedRevenue,
    fixedCost,
    variableCost,
    taxRate: DEFAULT_TURNOVER_TAX_PERCENT,
  });

  const breakEvenRes = calculateBreakEven({
    fixedCost,
    sellingPrice: unitEconomics.sellingPrice,
    variableCostPerUnit: unitEconomics.variableCostPerUnit,
  });

  const startupCosts =
    locale === "en"
      ? [
          { title: "Renovating and fitting out the space", amount: Math.round(totalFunds * 0.3) },
          { title: "Buying equipment and technology", amount: Math.round(totalFunds * 0.4) },
          { title: "Initial stock / raw materials", amount: Math.round(totalFunds * 0.15) },
          { title: "Licenses, permits and marketing", amount: Math.round(totalFunds * 0.05) },
          { title: "Contingency reserve (cash)", amount: Math.round(totalFunds * 0.1) },
        ]
      : [
          { title: "Joyni ta'mirlash va jihozlash", amount: Math.round(totalFunds * 0.3) },
          { title: "Texnologik asbob-uskunalar sotib olish", amount: Math.round(totalFunds * 0.4) },
          { title: "Dastlabki tovar/xom-ashyo zaxirasi", amount: Math.round(totalFunds * 0.15) },
          { title: "Litsenziya, ruxsatnomalar va marketing", amount: Math.round(totalFunds * 0.05) },
          { title: "Kutilmagan xarajatlar uchun zaxira (kassa)", amount: Math.round(totalFunds * 0.1) },
        ];

  const monthlyExpensesBreakdown =
    locale === "en"
      ? [
          { title: "Building rent", amount: Math.round(monthlyExpenses * 0.25) },
          {
            title: `Payroll (${employees} staff)`,
            amount: Math.round(monthlyExpenses * 0.35),
          },
          { title: "Raw materials and supplies", amount: Math.round(monthlyExpenses * 0.25) },
          { title: "Utilities and services", amount: Math.round(monthlyExpenses * 0.07) },
          { title: "Marketing and advertising", amount: Math.round(monthlyExpenses * 0.08) },
        ]
      : [
          { title: "Bino ijarasi", amount: Math.round(monthlyExpenses * 0.25) },
          {
            title: `Ish haqi jamg‘armasi (${employees} nafar xodim)`,
            amount: Math.round(monthlyExpenses * 0.35),
          },
          { title: "Xom-ashyo va materiallar", amount: Math.round(monthlyExpenses * 0.25) },
          { title: "Kommunal to‘lovlar va xizmatlar", amount: Math.round(monthlyExpenses * 0.07) },
          { title: "Marketing va reklama", amount: Math.round(monthlyExpenses * 0.08) },
        ];

  if (locale === "en") {
    return {
      ...data,
      businessName: resolvedBusinessName,
      sections: {
        overview: `A modern "${businessType}" venture operating in ${location}. The project's core goal is to build a sustainably profitable business by offering residents quality, affordable, and convenient service.`,
        targetMarket: `Primary target audience: ${targetCustomer}. Areas in ${location} with high foot and vehicle traffic are targeted.`,
        productService:
          "The core assortment and services on offer are geared toward everyday demand, built on quality standards and fast, convenient service.",
        startupCosts,
        monthlyExpensesBreakdown,
        revenueProjection: `Expected total monthly revenue is ${formatMoney(
          expectedRevenue
        )}. Average daily revenue comes to roughly ${formatMoney(expectedRevenue / DAYS_PER_MONTH)}.`,
        profitability: `Monthly gross profit: ${formatMoney(
          profitRes.grossProfit
        )} (gross margin: ${profitRes.grossMargin}%). Net profit after tax: ${formatMoney(
          profitRes.netProfit
        )} (net margin: ${profitRes.netMargin}%).`,
        breakEven: `Reaching monthly break-even requires selling at least ${breakEvenRes.breakEvenUnits.toLocaleString(
          "en-US"
        )} ${unitEconomics.unitLabel}s (${formatMoney(
          breakEvenRes.breakEvenRevenue
        )} per month). That's an average of ${
          breakEvenRes.dailyUnits
        } sales per day. The calculation assumes an average price of ${formatMoney(
          unitEconomics.sellingPrice
        )} per ${unitEconomics.unitLabel}.`,
        marketing:
          "Social media (Instagram, Telegram), local geo-marketing (maps and outdoor signage), an opening promotion, and a loyalty bonus program for repeat customers.",
        risks: [
          "Seasonal shifts in customer traffic",
          "Rising raw material costs",
          "Increased competitor activity",
          "Staff turnover",
        ],
        fundingStrategy: `The project's total cost is ${formatMoney(
          totalFunds
        )}, made up of ${formatMoney(initialCapital)} in the founder's own capital and ${formatMoney(
          potentialLoan
        )} in bank financing.`,
      },
    };
  }

  return {
    ...data,
    businessName: resolvedBusinessName,
    sections: {
      overview: `${location} shahrida faoliyat yurituvchi zamonaviy "${businessType}" loyihasi. Loyihaning asosiy maqsadi — aholiga sifatli, hamyonbop va qulay xizmat ko‘rsatish orqali barqaror daromad keltiruvchi tadbirkorlik subyektini shakllantirishdir.`,
      targetMarket: `Asosiy maqsadli auditoriya: ${targetCustomer}. ${location} bo‘yicha yuqori piyodalar va transport harakati mavjud bo‘lgan hududlar nishon qilib olinadi.`,
      productService: `Taklif etilayotgan asosiy assortiment va xizmatlar talabgir va kundalik ehtiyojga qaratilgan bo‘lib, sifat standartlari hamda qulay xizmat ko‘rsatish tezligiga asoslanadi.`,
      startupCosts,
      monthlyExpensesBreakdown,
      revenueProjection: `Kutilayotgan oylik umumiy tushum ${formatMoney(
        expectedRevenue
      )} ni tashkil etadi. Kunlik o‘rtacha tushum taxminan ${formatMoney(
        expectedRevenue / DAYS_PER_MONTH
      )} ga teng.`,
      profitability: `Oylik yalpi foyda: ${formatMoney(
        profitRes.grossProfit
      )} (yalpi marja: ${profitRes.grossMargin}%). Soliq to‘lovlaridan keyingi sof foyda: ${formatMoney(
        profitRes.netProfit
      )} (sof marja: ${profitRes.netMargin}%).`,
      breakEven: `Oylik zararsizlikka erishish uchun kamida ${breakEvenRes.breakEvenUnits.toLocaleString(
        "ru-RU"
      )} ta ${unitEconomics.unitLabel} (oyiga ${formatMoney(
        breakEvenRes.breakEvenRevenue
      )}) sotilishi zarur. Bu kuniga o‘rtacha ${breakEvenRes.dailyUnits} ta sotuvni tashkil qiladi. Hisob bitta ${
        unitEconomics.unitLabel
      } uchun o‘rtacha ${formatMoney(unitEconomics.sellingPrice)} narx asosida bajarilgan.`,
      marketing: `Ijtimoiy tarmoqlar (Instagram, Telegram), mahalliy geomarketing (xaritalar va tashqi yorqin belgilar), ochilish aksiyalari va doimiy mijozlar uchun bonus tizimi.`,
      risks: [
        "Mijozlar oqimining mavsumiy o‘zgarishi",
        "Xom-ashyo narxlarining oshishi",
        "Raqobatchilar faollashuvi",
        "Xodimlar qo‘nimsizligi",
      ],
      fundingStrategy: `Loyiha umumiy qiymati ${formatMoney(
        totalFunds
      )} bo‘lib, shundan ${formatMoney(
        initialCapital
      )} muassisning o‘z mablag‘i hamda ${formatMoney(
        potentialLoan
      )} bank krediti hisobidan shakllantiriladi.`,
    },
  };
}
