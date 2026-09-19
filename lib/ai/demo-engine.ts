import { calculateLoan } from "../engine/loan";
import { calculateProfit } from "../engine/profit";
import { calculateBreakEven } from "../engine/breakeven";
import { calculateCashflow } from "../engine/cashflow";
import { calculateTax } from "../engine/tax";
import {
  analyzeDebtBurden,
  analyzeBusinessIdea,
  generateStructuredBusinessPlan,
} from "../engine/analyzer";
import {
  COST_SPLIT,
  DEFAULT_TURNOVER_TAX_PERCENT,
  resolveUnitEconomics,
} from "../engine/assumptions";
import { formatMoney, formatPercent } from "../utils";
import type { Locale } from "../i18n/translations";

export interface ChatResponsePayload {
  role: "assistant";
  content: string;
  intent:
    | "DEMO_SCENARIO"
    | "CHAINED_LOAN_BREAK_EVEN"
    | "BUSINESS_PLAN"
    | "LOAN_CALCULATION"
    | "PROFIT_CALCULATION"
    | "BREAK_EVEN"
    | "CASHFLOW"
    | "DEBT_BURDEN"
    | "TAX_CALCULATION"
    | "MARKET_ANALYSIS"
    | "BUSINESS_IDEA_ANALYSIS"
    | "CLARIFICATION"
    | "GENERAL";
  toolCalled?: string;
  toolResult?: unknown;
  steps?: { tool: string; result: unknown }[];
  quickActions?: { label: string; href?: string; prompt?: string }[];
}

/* ============================================================
   1. RAQAMLARNI AJRATIB OLISH
   ============================================================ */

export interface AmountSpan {
  amount: number;
  start: number;
  end: number;
}

export interface ExtractedNumbers {
  /** Pul summalari (so'mda), matnda uchrash tartibida. */
  amounts: number[];
  /** Foiz stavkasi, masalan 24. */
  rate: number | null;
  /** Muddat (oylarda). */
  months: number | null;
  /** Matndagi joylashuvi. */
  spans?: AmountSpan[];
}

const MULTIPLIERS: Record<string, number> = {
  mlrd: 1_000_000_000,
  milliard: 1_000_000_000,
  billion: 1_000_000_000,
  bln: 1_000_000_000,
  mln: 1_000_000,
  million: 1_000_000,
  m: 1_000_000,
  ming: 1_000,
  thousand: 1_000,
  k: 1_000,
};

/**
 * Raqam + undan keyingi belgi (mln, oy, %, ...) juftligini topadi.
 * Guruhlangan raqamlarni ("50 000 000") ham, oddiy raqamlarni ham qo'llaydi.
 * Uz/ru va inglizcha qo'shimchalarning ikkalasi ham qo'llab-quvvatlanadi,
 * shunda inglizcha "50 million UZS" ham to'g'ri o'qiladi.
 */
const TOKEN_RE =
  /(\d{1,3}(?:[\s  ]\d{3})+|\d+(?:[.,]\d+)?)\s*(mlrd|milliard|billion|bln|mln|million|ming|thousand|k|foiz|percent|%|oylik|oyga|oyda|months?|mo|oy|yillik|yilga|years?|yil|m\b)?/gi;

/**
 * Matndan summa, foiz va muddatni ajratib oladi.
 *
 * Ilgari faqat "mln" qo'shimchasi bilan yozilgan raqamlar tanilardi — ya'ni
 * "50 000 000 so'm" umuman o'qilmas va hisob jimgina qat'iy belgilangan
 * standart qiymat bilan bajarilardi.
 */
export function extractNumbers(text: string): ExtractedNumbers {
  const normalized = text.toLowerCase().replace(/[  ]/g, " ");

  const amounts: number[] = [];
  const spans: AmountSpan[] = [];
  let rate: number | null = null;
  let months: number | null = null;

  for (const match of normalized.matchAll(TOKEN_RE)) {
    const rawNumber = match[1];
    const suffix = (match[2] || "").toLowerCase();
    const matchStart = match.index ?? 0;
    const matchEnd = matchStart + match[0].length;

    const isGrouped = /[\s  ]/.test(rawNumber);
    // Guruhlangan raqamda vergul/nuqta ajratuvchi emas; aks holda "1,5" = 1.5
    const numeric = isGrouped
      ? parseFloat(rawNumber.replace(/[\s  ]/g, ""))
      : parseFloat(rawNumber.replace(",", "."));

    if (isNaN(numeric)) continue;

    if (suffix === "%" || suffix === "foiz" || suffix === "percent") {
      if (rate === null) rate = numeric;
      continue;
    }

    if (
      suffix.startsWith("oy") ||
      suffix === "mo" ||
      suffix.startsWith("month")
    ) {
      if (months === null) months = Math.round(numeric);
      continue;
    }

    if (suffix.startsWith("yil") || suffix.startsWith("year")) {
      if (months === null) months = Math.round(numeric * 12);
      continue;
    }

    const multiplier = MULTIPLIERS[suffix];
    if (multiplier) {
      const val = Math.round(numeric * multiplier);
      amounts.push(val);
      spans.push({ amount: val, start: matchStart, end: matchEnd });
      continue;
    }

    // Qo'shimchasiz raqam: faqat guruhlangan yoki yetarlicha katta bo'lsa
    // summa deb qabul qilamiz ("24" — bu summa emas, ehtimol muddat yoki foiz).
    if (isGrouped || numeric >= 10_000) {
      const val = Math.round(numeric);
      amounts.push(val);
      spans.push({ amount: val, start: matchStart, end: matchEnd });
    }
  }

  return { amounts, rate, months, spans };
}

/* ============================================================
   2. NIYATNI (INTENT) ANIQLASH
   ============================================================ */

/**
 * Niyatlar aniqdan umumiyga qarab tekshiriladi.
 *
 * Tartib muhim: "bu kreditni biznesim ko'tara oladimi?" so'rovi ham "kredit",
 * ham "ko'tar" so'zlarini o'z ichiga oladi. Ilgari kredit birinchi tekshirilar
 * va qarz yuki tahlili hech qachon ishga tushmasdi.
 *
 * Har bir qoida uz/ru va inglizcha kalit so'zlarni ham tekshiradi, shunda
 * interfeys ingliz tilida bo'lganda yozilgan savollar ham to'g'ri aniqlanadi.
 */
type Intent = ChatResponsePayload["intent"];

const INTENT_RULES: { intent: Intent; test: (t: string) => boolean }[] = [
  {
    intent: "DEMO_SCENARIO",
    test: (t) =>
      (/urganch/.test(t) &&
        /fast\s*food/.test(t) &&
        /reja|moliyaviy|model|plan|financial/.test(t)) ||
      /demo\s*(rejim|ssenariy|scenario)/.test(t),
  },
  {
    intent: "TAX_CALCULATION",
    test: (t) => /soliq|qqs|yatt|aylanmadan|soliqlar|\btax\b|\bvat\b/.test(t),
  },
  {
    // Kredit so'zidan OLDIN tekshiriladi.
    intent: "DEBT_BURDEN",
    test: (t) =>
      /ko‘tar|ko'tar|kotar|qarz yuki|debt burden|to‘lay olaman|tola olaman|can (i|we) (afford|carry)|afford (this|the) loan/.test(
        t,
      ),
  },
  {
    intent: "BUSINESS_PLAN",
    test: (t) =>
      /biznes-reja|biznes reja|reja tuz|reja tayyorla|business\s*plan|bo‘limli reja/.test(
        t,
      ),
  },
  {
    // 2-bosqichli agent zanjiri (Kredit -> Zararsizlik)
    // Kredit va umumiy zararsizlikdan oldin tekshiriladi
    intent: "CHAINED_LOAN_BREAK_EVEN",
    test: (t) =>
      /(kredit|qarz|loan|debt).*(qopla|nechta|sotish|sotay|cover|pay)/.test(
        t,
      ) ||
      /(qopla|cover|pay).*(kredit|qarz|loan|debt)/.test(t) ||
      /how many.*(cover|pay).*loan/.test(t) ||
      /nechta.*kredit/.test(t),
  },
  {
    intent: "BREAK_EVEN",
    test: (t) => /break[\s-]?even|zararsiz|qopla|nolga chiq/.test(t),
  },
  {
    intent: "LOAN_CALCULATION",
    test: (t) =>
      /kredit|qarz|foiz stavka|annuitet|\bloan\b|\bcredit\b|annuity/.test(t),
  },
  {
    intent: "PROFIT_CALCULATION",
    test: (t) =>
      /foyda|marja|rentabellik|daromad|\bprofit\b|\bmargin\b/.test(t),
  },
  {
    intent: "CASHFLOW",
    test: (t) => /pul oqim|cash[\s-]?flow|kassa/.test(t),
  },
  {
    intent: "BUSINESS_IDEA_ANALYSIS",
    test: (t) =>
      /bozor|g‘oya|g'oya|goya|boshla|ochmoqchi|ochish|\bmarket\b|\bidea\b|\bopen\b|\bstart\b/.test(
        t,
      ),
  },
];

export function detectIntent(text: string): Intent {
  const normalized = text.toLowerCase();
  for (const rule of INTENT_RULES) {
    if (rule.test(normalized)) return rule.intent;
  }
  return "GENERAL";
}

/* ============================================================
   3. YORDAMCHILAR
   ============================================================ */

const DISCLAIMER: Record<Locale, string> = {
  uz: "*Eslatma: Bu hisob-kitob siz kiritgan ko‘rsatkichlar asosidagi tahlil bo‘lib, tijorat banki qarori uchun rasmiy yuridik kafolat hisoblanmaydi.*",
  en: "*Note: This calculation is an analysis based on the figures you entered and is not a formal legal guarantee for a commercial bank's decision.*",
};

/**
 * Raqam topilmaganda foydalanuvchidan so'raymiz.
 * Ilgari bu holatda jimgina standart qiymat qo'yilar va foydalanuvchi
 * o'zining emas, boshqa raqamlar asosidagi javobni olardi.
 */
function askFor(
  locale: Locale,
  what: string,
  example: string,
  quickActions?: ChatResponsePayload["quickActions"],
): ChatResponsePayload {
  const content =
    locale === "en"
      ? `I need ${what} to run this calculation — I couldn't find a specific number in your message.

Please send the number. For example:
> ${example}

Then I'll calculate using your actual numbers instead of guessing.`
      : `Hisob-kitobni bajarish uchun menga ${what} kerak — so‘rovingizda aniq raqam topa olmadim.

Iltimos, raqamni yozib yuboring. Masalan:
> ${example}

Shunda men taxmin qilmasdan, aynan sizning raqamlaringiz bo‘yicha hisoblab beraman.`;

  return {
    role: "assistant",
    intent: "CLARIFICATION",
    content,
    quickActions: quickActions || [
      {
        label:
          locale === "en"
            ? "📊 Send an example request"
            : "📊 Misol so‘rovni yuborish",
        prompt: example,
      },
    ],
  };
}

/* ============================================================
   4. ASOSIY DVIGATEL
   ============================================================ */

export function processWithSmartDemoEngine(
  userMessage: string,
  locale: Locale = "uz",
): ChatResponsePayload {
  const text = userMessage.toLowerCase().trim();
  const { amounts, rate, months, spans } = extractNumbers(text);
  const intent = detectIntent(text);

  let response: ChatResponsePayload;
  switch (intent) {
    case "DEMO_SCENARIO":
      response = handleDemoScenario(locale);
      break;
    case "CHAINED_LOAN_BREAK_EVEN":
      response = handleChainedLoanBreakEven(
        text,
        amounts,
        rate,
        months,
        locale,
      );
      break;
    case "TAX_CALCULATION":
      response = handleTax(text, amounts, rate, locale);
      break;
    case "DEBT_BURDEN":
      response = handleDebtBurden(text, amounts, rate, months, locale, spans);
      break;
    case "BUSINESS_PLAN":
      response = handleBusinessPlan(text, amounts, locale);
      break;
    case "BREAK_EVEN":
      response = handleBreakEven(text, amounts, locale);
      break;
    case "LOAN_CALCULATION":
      response = handleLoan(amounts, rate, months, locale);
      break;
    case "PROFIT_CALCULATION":
      response = handleProfit(amounts, locale);
      break;
    case "CASHFLOW":
      response = handleCashflow(amounts, locale);
      break;
    case "BUSINESS_IDEA_ANALYSIS":
      response = handleBusinessIdea(text, amounts, locale);
      break;
    default:
      response = handleGeneral(locale);
      break;
  }

  if (!response.steps && response.toolCalled && response.toolResult) {
    response.steps = [
      { tool: response.toolCalled, result: response.toolResult },
    ];
  }

  return response;
}

/* ---------- Demo ssenariy ---------- */

function handleDemoScenario(locale: Locale): ChatResponsePayload {
  const capital = 100_000_000;
  const loanAmount = 50_000_000;
  const annualRate = 24;
  const loanMonths = 24;
  const expectedRevenue = 45_000_000;
  const monthlyExpenses = 28_000_000;

  const unit = resolveUnitEconomics("fast food", locale);
  const fixedCost = Math.round(monthlyExpenses * COST_SPLIT.fixed);
  const variableCost = Math.round(monthlyExpenses * COST_SPLIT.variable);

  const loanRes = calculateLoan({
    amount: loanAmount,
    annualRate,
    months: loanMonths,
  });
  const profitRes = calculateProfit({
    revenue: expectedRevenue,
    fixedCost,
    variableCost,
    taxRate: DEFAULT_TURNOVER_TAX_PERCENT,
  });
  const breakEvenRes = calculateBreakEven({
    fixedCost,
    sellingPrice: unit.sellingPrice,
    variableCostPerUnit: unit.variableCostPerUnit,
  });
  const cashflowRes = calculateCashflow({
    revenue: expectedRevenue,
    expenses: monthlyExpenses,
    loanPayment: loanRes.monthlyPayment,
    tax: profitRes.taxAmount,
    locale,
  });
  const debtRes = analyzeDebtBurden({
    monthlyRevenue: expectedRevenue,
    monthlyExpenses,
    loanAmount,
    annualRate,
    loanMonths,
    locale,
  });

  const content =
    locale === "en"
      ? `Hello! Based on the information you provided, I've run the initial financial calculations for opening a **Fast Food business in Urganch**.

### 💡 Bussy's analysis and summary:
1. **Fund allocation**: Your initial own capital (${formatMoney(capital)}) plus the loan you'd take (${formatMoney(loanAmount)}) give a total starting budget of **${formatMoney(capital + loanAmount)}**.
2. **Loan burden**: For a 50M UZS loan at a 24% rate, the monthly payment is **${formatMoney(loanRes.monthlyPayment)}**. Your monthly operating cash flow (${formatMoney(cashflowRes.operatingCashflow)}) covers this payment (debt burden: ${formatPercent(debtRes.debtBurdenPercent)}).
3. **Reaching break-even**: To cover monthly fixed costs, you need to sell at least **${breakEvenRes.breakEvenUnits.toLocaleString("en-US")} ${unit.unitLabel}s** per month (about ${breakEvenRes.dailyUnits} per day).
4. **Net cash flow**: After the loan payment and ${DEFAULT_TURNOVER_TAX_PERCENT}% turnover tax, you're left with **${formatMoney(cashflowRes.netCashflow)}** in free cash per month.

${DISCLAIMER.en}`
      : `Assalomu alaykum! Siz taqdim etgan ma’lumotlarni tahlil qilib, **Urganch shahrida Fast Food** ochish bo‘yicha dastlabki moliyaviy hisob-kitoblarni amalga oshirdim.

### 💡 Bussy tahlili va xulosasi:
1. **Mablag‘ taqsimoti**: Boshlang‘ich shaxsiy kapitalingiz (${formatMoney(capital)}) va jalb qilinadigan kredit (${formatMoney(loanAmount)}) hisobiga jami boshlang‘ich byudjet **${formatMoney(capital + loanAmount)}** ni tashkil etadi.
2. **Kredit yuki**: 50 mln so‘m kredit uchun 24% stavkada oylik to‘lov **${formatMoney(loanRes.monthlyPayment)}**. Sizning oylik operatsion pul oqimingiz (${formatMoney(cashflowRes.operatingCashflow)}) bu to‘lovni qoplaydi (Qarz yuki: ${formatPercent(debtRes.debtBurdenPercent)}).
3. **Zararsizlikka chiqish**: Oylik o‘zgarmas xarajatlarni qoplash uchun oyiga kamida **${breakEvenRes.breakEvenUnits.toLocaleString("ru-RU")} ta ${unit.unitLabel}** (kuniga o‘rtacha ${breakEvenRes.dailyUnits} ta) sotishingiz talab etiladi.
4. **Sof pul oqimi**: Kredit va ${DEFAULT_TURNOVER_TAX_PERCENT}% aylanma soliq to‘langandan keyin ixtiyoringizda oyiga **${formatMoney(cashflowRes.netCashflow)}** erkin kassa mablag‘i qoladi.

${DISCLAIMER.uz}`;

  return {
    role: "assistant",
    intent: "DEMO_SCENARIO",
    toolCalled: "financial_model_pipeline",
    toolResult: {
      modelName:
        locale === "en"
          ? "Initial financial model"
          : "Dastlabki moliyaviy model",
      businessType: "Fast Food",
      location: "Urganch",
      capital,
      loanAmount,
      totalFunds: capital + loanAmount,
      revenue: expectedRevenue,
      expenses: monthlyExpenses,
      loan: loanRes,
      profit: profitRes,
      breakEven: breakEvenRes,
      cashflow: cashflowRes,
      debtBurden: debtRes,
    },
    steps: [
      { tool: "calculate_loan", result: loanRes },
      { tool: "calculate_profit", result: profitRes },
      { tool: "calculate_break_even", result: breakEvenRes },
      { tool: "calculate_cashflow", result: cashflowRes },
      { tool: "analyze_debt_burden", result: debtRes },
    ],
    content,
    quickActions:
      locale === "en"
        ? [
            {
              label: "⚡ How many to cover the loan? (2-step chain)",
              prompt:
                "How many units do I need to sell per day to cover the loan?",
            },
            { label: "🎛️ Go to the what-if simulator", href: "/app/simulator" },
            { label: "📄 Build a business plan", href: "/app/business-plan" },
            { label: "💳 View full loan breakdown", href: "/app/loan" },
          ]
        : [
            {
              label: "⚡ Kreditni qoplash uchun kuniga nechta sotish kerak?",
              prompt: "Kreditni qoplash uchun kuniga nechta sotishim kerak?",
            },
            {
              label: "🎛️ What-if simulyatoriga o‘tish",
              href: "/app/simulator",
            },
            { label: "📄 Biznes-reja yaratish", href: "/app/business-plan" },
            { label: "💳 Kreditni batafsil hisoblash", href: "/app/loan" },
          ],
  };
}

/* ---------- 2-bosqichli zanjir (Agent Chaining): Kredit -> Zararsizlik ---------- */

function handleChainedLoanBreakEven(
  text: string,
  amounts: number[],
  rate: number | null,
  months: number | null,
  locale: Locale,
): ChatResponsePayload {
  let loanAmount = 50_000_000;
  let baselineFixedCost = 15_400_000;
  let hasExplicitLoan = false;
  let hasExplicitFixedCost = false;

  if (amounts.length >= 2) {
    const costPos = text.search(/xarajat|ijara|fixed|operat/i);
    const loanPos = text.search(/kredit|loan/i);
    if (costPos !== -1 && (loanPos === -1 || costPos < loanPos)) {
      baselineFixedCost = amounts[0];
      loanAmount = amounts[1];
    } else {
      loanAmount = amounts[0];
      baselineFixedCost = amounts[1];
    }
    hasExplicitLoan = true;
    hasExplicitFixedCost = true;
  } else if (amounts.length === 1 && amounts[0] >= 1_000_000) {
    const costPos = text.search(/xarajat|ijara|fixed|operat/i);
    const costMatch =
      /(?:xarajat|ijara|fixed|operat)[^\d]{0,20}\d+|\d+[^\w]{0,10}(?:mln|million|ming|k)?[^\w]{0,10}(?:xarajat|ijara|fixed|operat)/i.test(
        text,
      );
    if (costPos !== -1 && costMatch) {
      baselineFixedCost = amounts[0];
      hasExplicitFixedCost = true;
    } else {
      loanAmount = amounts[0];
      hasExplicitLoan = true;
    }
  }

  const annualRate = rate ?? 24;
  const loanMonths = months ?? 24;

  const assumedParts: string[] = [];
  if (!hasExplicitLoan) {
    assumedParts.push(
      locale === "en"
        ? `loan amount ${formatMoney(loanAmount)}`
        : `kredit summasi ${formatMoney(loanAmount)}`,
    );
  }
  if (rate === null) {
    assumedParts.push(
      locale === "en"
        ? `annual rate ${annualRate}%`
        : `yillik foiz ${annualRate}%`,
    );
  }
  if (months === null) {
    assumedParts.push(
      locale === "en" ? `term ${loanMonths} months` : `muddat ${loanMonths} oy`,
    );
  }
  if (!hasExplicitFixedCost) {
    assumedParts.push(
      locale === "en"
        ? `operating fixed costs ${formatMoney(baselineFixedCost)}/mo (demo baseline)`
        : `oylik o‘zgarmas xarajat ${formatMoney(baselineFixedCost)} (demo bazaviy)`,
    );
  }

  // 1-bosqich: Kredit hisobi
  const loanRes = calculateLoan({
    amount: loanAmount,
    annualRate,
    months: loanMonths,
  });

  // 2-bosqich: Birlik iqtisodiyoti va zararsizlik
  const unit = resolveUnitEconomics(text, locale);
  const unitMargin = unit.sellingPrice - unit.variableCostPerUnit;

  // Faqat kredit to'lovini qoplash uchun talab qilinadigan hajm
  const loanUnitsNeeded = Math.ceil(loanRes.monthlyPayment / unitMargin);
  const loanDailyUnitsNeeded = Math.ceil(loanUnitsNeeded / 30);

  // Bazaviy o'zgarmas xarajat + kredit to'lovi
  const totalFixedCostWithLoan = baselineFixedCost + loanRes.monthlyPayment;

  const breakEvenRes = calculateBreakEven({
    fixedCost: totalFixedCostWithLoan,
    sellingPrice: unit.sellingPrice,
    variableCostPerUnit: unit.variableCostPerUnit,
  });

  const content =
    locale === "en"
      ? `To answer this accurately, Bussy performed a **2-step chained calculation (Agent Chaining)**:

### 1️⃣ Step 1: Determining monthly loan payment (\`calculate_loan\`)
- **Loan amount**: ${formatMoney(loanRes.amount)} (${annualRate}% annual rate, ${loanMonths} months)
- **Monthly annuity payment**: **${formatMoney(loanRes.monthlyPayment)}/mo**

### 2️⃣ Step 2: Break-even sales volume (\`calculate_break_even\`)
${unit.displayName} unit economics (${unit.unitLabel} price: ${formatMoney(unit.sellingPrice)}, variable cost: ${formatMoney(unit.variableCostPerUnit)}, unit margin: **${formatMoney(unitMargin)}**):
- **To cover the loan payment alone**: you must sell at least **${loanUnitsNeeded.toLocaleString("en-US")} ${unit.unitLabel}s/month** (~**${loanDailyUnitsNeeded} per day**).
- **To cover all operating fixed costs + loan**: you need **${breakEvenRes.breakEvenUnits.toLocaleString("en-US")} ${unit.unitLabel}s/month** (~**${breakEvenRes.dailyUnits} per day**).
${
  assumedParts.length > 0
    ? `\n⚠️ These weren't in your request, so they were assumed: ${assumedParts.join(
        ", ",
      )}. Send exact numbers and I'll recalculate.`
    : ""
}
### 💡 Bussy's conclusion:
Servicing this loan requires selling only an additional **${loanDailyUnitsNeeded} ${unit.unitLabel}s per day**. Every unit sold beyond ~${breakEvenRes.dailyUnits}/day directly becomes your **net profit**.

${DISCLAIMER.en}`
      : `Ushbu savolga aniq javob berish uchun ketma-ket **2 bosqichli hisob-kitob (Agent Chaining)** o‘tkazildi:

### 1️⃣ 1-bosqich: Kredit oylik to‘lovini aniqlash (\`calculate_loan\`)
- **Kredit summasi**: ${formatMoney(loanRes.amount)} (yillik ${annualRate}%, ${loanMonths} oy muddat)
- **Oylik annuitet to‘lov**: **${formatMoney(loanRes.monthlyPayment)}/oy**

### 2️⃣ 2-bosqich: Zararsizlik nuqtasini hisoblash (\`calculate_break_even\`)
${unit.displayName} birlik iqtisodiyoti (${unit.unitLabel} narxi: ${formatMoney(unit.sellingPrice)}, tannarxi: ${formatMoney(unit.variableCostPerUnit)}, 1 ta mahsulot sof marjasi: **${formatMoney(unitMargin)}**):
- **Faqat kredit to‘lovini qoplash uchun**: oyiga kamida **${loanUnitsNeeded.toLocaleString("ru-RU")} ta** (kuniga **${loanDailyUnitsNeeded} ta**) ${unit.unitLabel} sotish kerak.
- **Barcha o‘zgarmas xarajatlar + kredit to‘lovini to‘liq qoplash uchun**: oyiga jami **${breakEvenRes.breakEvenUnits.toLocaleString("ru-RU")} ta** (kuniga o‘rtacha **${breakEvenRes.dailyUnits} ta**) sotishingiz talab etiladi.
${
  assumedParts.length > 0
    ? `\n⚠️ So‘rovingizda ko‘rsatilmagani uchun quyidagilar taxminan olindi: ${assumedParts.join(
        ", ",
      )}. Aniq raqamlarni yozsangiz, qayta hisoblab beraman.`
    : ""
}
### 💡 Bussy xulosasi:
Kredit yuki biznesingizdan kuniga qo‘shimcha atigi **${loanDailyUnitsNeeded} ta** mijozga xizmat ko‘rsatishni talab qiladi. Kuniga ${breakEvenRes.dailyUnits} tadan ortiq sotilgan har bir ${unit.unitLabel} esa to‘g‘ridan-to‘g‘ri sizning **sof foydangizga** aylanadi.

${DISCLAIMER.uz}`;

  return {
    role: "assistant",
    intent: "CHAINED_LOAN_BREAK_EVEN",
    toolCalled: "calculate_break_even",
    toolResult: {
      loan: loanRes,
      breakEven: breakEvenRes,
      loanUnitsNeeded,
      loanDailyUnitsNeeded,
      unitMargin,
    },
    steps: [
      { tool: "calculate_loan", result: loanRes },
      { tool: "calculate_break_even", result: breakEvenRes },
    ],
    content,
    quickActions:
      locale === "en"
        ? [
            { label: "🎛️ Test what-if simulator", href: "/app/simulator" },
            {
              label: "📄 Build 11-section business plan",
              href: "/app/business-plan",
            },
            { label: "💳 View full loan schedule", href: "/app/loan" },
          ]
        : [
            {
              label: "🎛️ What-if simulyatorini sinash",
              href: "/app/simulator",
            },
            {
              label: "📄 11 bo‘limli biznes-reja tuzish",
              href: "/app/business-plan",
            },
            { label: "💳 To‘liq kredit jadvali", href: "/app/loan" },
          ],
  };
}

/* ---------- Soliq ---------- */

function handleTax(
  text: string,
  amounts: number[],
  rate: number | null,
  locale: Locale,
): ChatResponsePayload {
  if (amounts.length === 0) {
    return askFor(
      locale,
      locale === "en" ? "the monthly revenue amount" : "oylik tushum summasi",
      locale === "en"
        ? "My monthly revenue is 45M UZS and expenses are 28M UZS. How much is the turnover tax?"
        : "Oylik tushumim 45 mln so‘m, xarajatim 28 mln so‘m. Aylanma soliq qancha bo‘ladi?",
    );
  }

  const revenue = amounts[0];
  const expenses = amounts[1] ?? 0;

  const regime = /yatt|yakka tartib/.test(text)
    ? ("individual" as const)
    : /qqs|umumiy soliq|foyda solig|\bvat\b|general regime/.test(text)
      ? ("general" as const)
      : ("turnover" as const);

  const taxRes = calculateTax({
    regime,
    revenue,
    expenses,
    customRate: regime === "turnover" && rate !== null ? rate : undefined,
    locale,
  });

  const breakdownLines = taxRes.breakdown
    .map((item) => `- ${item.label}: **${formatMoney(item.amount)}**`)
    .join("\n");

  const content =
    locale === "en"
      ? `The calculation under **${taxRes.regimeName}** is complete:

- **Monthly revenue**: ${formatMoney(revenue)}
${expenses > 0 ? `- **Monthly expenses**: ${formatMoney(expenses)}\n` : ""}- **Taxable base**: ${formatMoney(taxRes.taxBase)}

### 🧾 Tax line items:
${breakdownLines}
- **Total tax burden**: **${formatMoney(taxRes.taxAmount)}** (effective rate: ${formatPercent(
          taxRes.effectiveTaxRate,
        )})
${expenses > 0 ? `- **Net profit after tax**: **${formatMoney(taxRes.profitAfterTax)}**` : ""}

### ⚠️ Assumptions used in this calculation:
${taxRes.assumptions.map((a) => `• ${a}`).join("\n")}

${taxRes.disclaimer}`
      : `**${taxRes.regimeName}** bo‘yicha hisob-kitob bajarildi:

- **Oylik tushum**: ${formatMoney(revenue)}
${expenses > 0 ? `- **Oylik xarajat**: ${formatMoney(expenses)}\n` : ""}- **Soliq solinadigan baza**: ${formatMoney(taxRes.taxBase)}

### 🧾 Soliq moddalari:
${breakdownLines}
- **Jami soliq yuki**: **${formatMoney(taxRes.taxAmount)}** (effektiv yuklama: ${formatPercent(
          taxRes.effectiveTaxRate,
        )})
${expenses > 0 ? `- **Soliqdan keyingi sof foyda**: **${formatMoney(taxRes.profitAfterTax)}**` : ""}

### ⚠️ Hisobda qabul qilingan taxminlar:
${taxRes.assumptions.map((a) => `• ${a}`).join("\n")}

${taxRes.disclaimer}`;

  return {
    role: "assistant",
    intent: "TAX_CALCULATION",
    toolCalled: "calculate_tax",
    toolResult: taxRes,
    content,
    quickActions:
      locale === "en"
        ? [
            { label: "🧾 Tax calculator page", href: "/app/tax" },
            { label: "📊 Full financial analysis", href: "/app/finance" },
          ]
        : [
            { label: "🧾 Soliq kalkulyatori sahifasi", href: "/app/tax" },
            { label: "📊 To‘liq moliyaviy tahlil", href: "/app/finance" },
          ],
  };
}

/* ---------- Qarz yuki ---------- */

export interface DebtBurdenResolvedAmounts {
  rev?: number;
  exp?: number;
  loanAmt?: number;
  missing?: "revenue" | "expenses" | "loan";
}

const DEBT_BURDEN_KEYWORDS = {
  loan: /(?:kredit\w*|qarz\w*(?![\s-]yuki)|кредит\w*|за[её]м\w*|долг\w*(?![\s-]нагруз)|\bloan\w*(?![\s-]burden)|\bdebt\w*(?![\s-]burden)|\bborrow\w*)/gi,
  rev: /(?:tushum\w*|daromad\w*|kassa\w*|oborot\w*|aylanma\w*|выручк\w*|доход\w*|оборот\w*|касс\w*|\brevenue\w*|\bincome\w*|\bsales\b|\bturnover\w*)/gi,
  exp: /(?:xarajat\w*|chiqim\w*|sarf\w*|расход\w*|затрат\w*|издержк\w*|\bexpense\w*|\bcost\w*|\bspending\w*)/gi,
};

function getKeywordSpans(
  text: string,
  re: RegExp,
): { start: number; end: number }[] {
  const result: { start: number; end: number }[] = [];
  for (const m of text.matchAll(re)) {
    if (m.index !== undefined) {
      result.push({ start: m.index, end: m.index + m[0].length });
    }
  }
  return result;
}

function getRoleAffinity(
  span: AmountSpan,
  keywords: { start: number; end: number }[],
  maxDist = 60,
): number {
  let min = Infinity;
  for (const kw of keywords) {
    let d = 0;
    if (span.end <= kw.start) {
      d = kw.start - span.end;
    } else if (kw.end <= span.start) {
      d = span.start - kw.end;
    }
    if (d < min) min = d;
  }
  if (min > maxDist) return 0;
  return Math.max(1, maxDist - min);
}

export function resolveDebtBurdenAmounts(
  text: string,
  amounts: number[],
  spans?: AmountSpan[],
): DebtBurdenResolvedAmounts {
  if (amounts.length === 0) return {};

  const actualSpans: AmountSpan[] =
    spans && spans.length >= amounts.length
      ? spans
      : (() => {
          const extracted = extractNumbers(text).spans;
          if (extracted && extracted.length >= amounts.length) {
            return extracted;
          }
          return amounts.map((amount, idx) => ({
            amount,
            start: idx * 20,
            end: idx * 20 + 5,
          }));
        })();

  const loanKw = getKeywordSpans(text, DEBT_BURDEN_KEYWORDS.loan);
  const revKw = getKeywordSpans(text, DEBT_BURDEN_KEYWORDS.rev);
  const expKw = getKeywordSpans(text, DEBT_BURDEN_KEYWORDS.exp);

  if (amounts.length >= 3) {
    const candidateIndices = [0, 1, 2];
    let bestScore = -1;
    let bestAssignment = { r: 0, e: 1, l: 2 };

    for (const r of candidateIndices) {
      for (const e of candidateIndices) {
        if (e === r) continue;
        for (const l of candidateIndices) {
          if (l === r || l === e) continue;

          const score =
            getRoleAffinity(actualSpans[r], revKw) +
            getRoleAffinity(actualSpans[e], expKw) +
            getRoleAffinity(actualSpans[l], loanKw) +
            (r === 0 && e === 1 && l === 2 ? 0.1 : 0);

          if (score > bestScore) {
            bestScore = score;
            bestAssignment = { r, e, l };
          }
        }
      }
    }

    return {
      rev: actualSpans[bestAssignment.r].amount,
      exp: actualSpans[bestAssignment.e].amount,
      loanAmt: actualSpans[bestAssignment.l].amount,
    };
  }

  if (amounts.length === 2) {
    const pairs: {
      revIdx?: number;
      expIdx?: number;
      loanIdx?: number;
      missing: "revenue" | "expenses" | "loan";
      canonicalBonus: number;
    }[] = [
      { revIdx: 0, expIdx: 1, missing: "loan", canonicalBonus: 0.1 },
      { revIdx: 1, expIdx: 0, missing: "loan", canonicalBonus: 0 },
      { loanIdx: 0, revIdx: 1, missing: "expenses", canonicalBonus: 0 },
      { loanIdx: 1, revIdx: 0, missing: "expenses", canonicalBonus: 0 },
      { loanIdx: 0, expIdx: 1, missing: "revenue", canonicalBonus: 0 },
      { loanIdx: 1, expIdx: 0, missing: "revenue", canonicalBonus: 0 },
    ];

    let bestScore = -1;
    let bestPair = pairs[0];

    for (const p of pairs) {
      let score = p.canonicalBonus;
      if (p.revIdx !== undefined)
        score += getRoleAffinity(actualSpans[p.revIdx], revKw);
      if (p.expIdx !== undefined)
        score += getRoleAffinity(actualSpans[p.expIdx], expKw);
      if (p.loanIdx !== undefined)
        score += getRoleAffinity(actualSpans[p.loanIdx], loanKw);

      if (score > bestScore) {
        bestScore = score;
        bestPair = p;
      }
    }

    return {
      rev:
        bestPair.revIdx !== undefined
          ? actualSpans[bestPair.revIdx].amount
          : undefined,
      exp:
        bestPair.expIdx !== undefined
          ? actualSpans[bestPair.expIdx].amount
          : undefined,
      loanAmt:
        bestPair.loanIdx !== undefined
          ? actualSpans[bestPair.loanIdx].amount
          : undefined,
      missing: bestPair.missing,
    };
  }

  return {};
}

function handleDebtBurden(
  text: string,
  amounts: number[],
  rate: number | null,
  months: number | null,
  locale: Locale,
  spans?: AmountSpan[],
): ChatResponsePayload {
  const example =
    locale === "en"
      ? "My monthly revenue is 40M, expenses are 25M. Can I carry a 50M UZS loan over 24 months at 24%?"
      : "Oylik tushumim 40 mln, xarajatim 25 mln. 50 mln so‘m kreditni 24 oyga 24% bilan ko‘tara olamanmi?";

  if (amounts.length < 2) {
    return askFor(
      locale,
      locale === "en"
        ? "monthly revenue, monthly expenses and the loan amount"
        : "oylik tushum, oylik xarajat va kredit summasi",
      example,
    );
  }

  const resolved = resolveDebtBurdenAmounts(text, amounts, spans);

  if (
    resolved.loanAmt === undefined ||
    resolved.rev === undefined ||
    resolved.exp === undefined
  ) {
    let missingLabel: string;
    if (resolved.missing === "revenue") {
      missingLabel = locale === "en" ? "monthly revenue" : "oylik tushum";
    } else if (resolved.missing === "expenses") {
      missingLabel = locale === "en" ? "monthly expenses" : "oylik xarajat";
    } else {
      missingLabel = locale === "en" ? "the loan amount" : "kredit summasi";
    }
    return askFor(locale, missingLabel, example);
  }

  const { rev, exp, loanAmt } = resolved;

  const annualRate = rate ?? 24;
  const loanMonths = months ?? 24;

  const debtRes = analyzeDebtBurden({
    monthlyRevenue: rev,
    monthlyExpenses: exp,
    loanAmount: loanAmt,
    annualRate,
    loanMonths,
    locale,
  });

  const content =
    locale === "en"
      ? `Your business's ability to carry the loan payment has been analyzed:

- **Monthly revenue**: ${formatMoney(rev)}
- **Monthly expenses**: ${formatMoney(exp)}
- **Loan**: ${formatMoney(loanAmt)} — ${annualRate}%, ${loanMonths} months
- **Operating cash flow (cash in)**: ${formatMoney(debtRes.operatingCashflow)}
- **Monthly loan payment**: ${formatMoney(debtRes.monthlyLoanPayment)}
- **Debt burden**: **${formatPercent(debtRes.debtBurdenPercent)}**

### 💡 Bussy's conclusion:
> **${debtRes.verdict}**
> ${debtRes.recommendation}

${DISCLAIMER.en}`
      : `Biznesingizning kredit to‘lovini qoplash qobiliyati tahlil qilindi:

- **Oylik tushum**: ${formatMoney(rev)}
- **Oylik xarajat**: ${formatMoney(exp)}
- **Kredit**: ${formatMoney(loanAmt)} — ${annualRate}%, ${loanMonths} oy
- **Operatsion pul oqimi (kassaga kirim)**: ${formatMoney(debtRes.operatingCashflow)}
- **Kredit oylik to‘lovi**: ${formatMoney(debtRes.monthlyLoanPayment)}
- **Qarz yuki (Debt Burden)**: **${formatPercent(debtRes.debtBurdenPercent)}**

### 💡 Bussy xulosasi:
> **${debtRes.verdict}**
> ${debtRes.recommendation}

${DISCLAIMER.uz}`;

  return {
    role: "assistant",
    intent: "DEBT_BURDEN",
    toolCalled: "analyze_debt_burden",
    toolResult: debtRes,
    content,
    quickActions:
      locale === "en"
        ? [
            { label: "📊 What-if simulator", href: "/app/simulator" },
            { label: "📄 Build a business plan", href: "/app/business-plan" },
          ]
        : [
            { label: "📊 What-if simulyatsiyasi", href: "/app/simulator" },
            { label: "📄 Biznes-reja tuzish", href: "/app/business-plan" },
          ],
  };
}

/* ---------- Kredit ---------- */

function handleLoan(
  amounts: number[],
  rate: number | null,
  months: number | null,
  locale: Locale,
): ChatResponsePayload {
  if (amounts.length === 0) {
    return askFor(
      locale,
      locale === "en" ? "the loan amount" : "kredit summasi",
      locale === "en"
        ? "If I take a 50M UZS loan for 24 months at 24%, how much do I pay per month?"
        : "50 mln so‘m kreditni 24 oyga 24% bilan olsam oyiga qancha to‘layman?",
    );
  }

  const amount = amounts[0];
  const annualRate = rate ?? 24;
  const loanMonths = months ?? 24;
  const loanRes = calculateLoan({ amount, annualRate, months: loanMonths });

  const years = loanMonths / 12;
  const yearsLabel =
    locale === "en"
      ? Number.isInteger(years)
        ? `${years} yr`
        : `${years.toFixed(1)} yr`
      : Number.isInteger(years)
        ? `${years} yil`
        : `${years.toFixed(1)} yil`;

  const assumedParts: string[] = [];
  if (rate === null)
    assumedParts.push(
      locale === "en"
        ? `annual rate ${annualRate}%`
        : `yillik foiz ${annualRate}%`,
    );
  if (months === null)
    assumedParts.push(
      locale === "en" ? `term ${loanMonths} months` : `muddat ${loanMonths} oy`,
    );

  const content =
    locale === "en"
      ? `Based on the parameters you gave, the **loan calculator** ran an exact annuity calculation:

- **Loan amount**: ${formatMoney(loanRes.amount)}
- **Annual interest rate**: ${loanRes.annualRate}%
- **Term**: ${loanRes.months} months (${yearsLabel})

### 💳 Calculation result:
- **Monthly payment**: **${formatMoney(loanRes.monthlyPayment)}**
- **Total amount paid**: **${formatMoney(loanRes.totalPayment)}**
- **Total interest**: **${formatMoney(loanRes.totalInterest)}**
${
  assumedParts.length > 0
    ? `\n⚠️ These weren't in your request, so they were assumed: ${assumedParts.join(
        ", ",
      )}. Send exact numbers and I'll recalculate.`
    : ""
}

💡 **Bussy's tip**: With an annuity, each monthly payment is the same size, but early payments are mostly interest, while later ones are mostly principal.`
      : `Kiritilgan parametrlar bo‘yicha **kredit kalkulyatori** orqali aniq annuitet hisob-kitob bajarildi:

- **Kredit summasi**: ${formatMoney(loanRes.amount)}
- **Yillik foiz stavkasi**: ${loanRes.annualRate}%
- **Muddat**: ${loanRes.months} oy (${yearsLabel})

### 💳 Hisob-kitob natijasi:
- **Oylik to‘lov**: **${formatMoney(loanRes.monthlyPayment)}**
- **Jami to‘lanadigan summa**: **${formatMoney(loanRes.totalPayment)}**
- **Jami hisoblangan foiz**: **${formatMoney(loanRes.totalInterest)}**
${
  assumedParts.length > 0
    ? `\n⚠️ So‘rovingizda ko‘rsatilmagani uchun quyidagilar taxminan olindi: ${assumedParts.join(
        ", ",
      )}. Aniq raqamlarni yozsangiz, qayta hisoblab beraman.`
    : ""
}

💡 **Bussy maslahati**: Annuitet tizimida har oylik to‘lov teng miqdorda bo‘ladi, lekin dastlabki oylarda to‘lovning asosiy qismi foizga, oxirgi oylarda esa asosiy qarzga ketadi.`;

  return {
    role: "assistant",
    intent: "LOAN_CALCULATION",
    toolCalled: "calculate_loan",
    toolResult: loanRes,
    content,
    quickActions:
      locale === "en"
        ? [
            {
              label: "Bussy, can my business carry this loan?",
              prompt: `My monthly revenue is 40M, expenses are 25M. Can I carry a ${formatMoney(
                loanRes.amount,
              )} loan over ${loanRes.months} months at ${loanRes.annualRate}%?`,
            },
            { label: "💳 Full loan page", href: "/app/loan" },
          ]
        : [
            {
              label: "Bussy, bu kreditni biznesim ko‘tara oladimi?",
              prompt: `Oylik tushumim 40 mln, xarajatim 25 mln bo‘lsa, ${formatMoney(
                loanRes.amount,
              )} kreditni ${loanRes.months} oyga ${loanRes.annualRate}% bilan ko‘tara olamanmi?`,
            },
            { label: "💳 Kredit to‘liq sahifasi", href: "/app/loan" },
          ],
  };
}

/* ---------- Foyda ---------- */

function handleProfit(amounts: number[], locale: Locale): ChatResponsePayload {
  if (amounts.length < 2) {
    return askFor(
      locale,
      locale === "en"
        ? "monthly revenue and monthly expenses"
        : "oylik tushum va oylik xarajat",
      locale === "en"
        ? "If monthly revenue is 45M and expenses are 28M UZS, what's my net profit?"
        : "Oylik tushum 45 mln, xarajat 28 mln so‘m bo‘lsa sof foydam qancha?",
    );
  }

  const rev = amounts[0];
  const exp = amounts[1];
  const fixed = Math.round(exp * COST_SPLIT.fixed);
  const variable = Math.round(exp * COST_SPLIT.variable);

  const profitRes = calculateProfit({
    revenue: rev,
    fixedCost: fixed,
    variableCost: variable,
    taxRate: DEFAULT_TURNOVER_TAX_PERCENT,
  });

  const content =
    locale === "en"
      ? `Profitability and profit have been calculated from the figures you entered:

- **Monthly revenue**: ${formatMoney(profitRes.revenue)}
- **Gross profit**: ${formatMoney(profitRes.grossProfit)} (Margin: ${formatPercent(profitRes.grossMargin)})
- **Total cost**: ${formatMoney(profitRes.totalCost)}
- **Turnover tax (${DEFAULT_TURNOVER_TAX_PERCENT}%)**: ${formatMoney(profitRes.taxAmount)}
- **Net profit**: **${formatMoney(profitRes.netProfit)}** (Net margin: **${formatPercent(
          profitRes.netMargin,
        )}**)

💡 **Bussy's analysis**: Your business's net profitability comes to ${formatPercent(
          profitRes.netMargin,
        )}. Costs were assumed to split ${Math.round(COST_SPLIT.fixed * 100)}% fixed / ${Math.round(
          COST_SPLIT.variable * 100,
        )}% variable — enter your exact line items on the "Financial analysis" page for a more precise number.`
      : `Kiritilgan ko‘rsatkichlar bo‘yicha rentabellik va foyda hisoblandi:

- **Oylik tushum**: ${formatMoney(profitRes.revenue)}
- **Yalpi foyda**: ${formatMoney(profitRes.grossProfit)} (Marja: ${formatPercent(profitRes.grossMargin)})
- **Jami xarajat**: ${formatMoney(profitRes.totalCost)}
- **Aylanma soliq (${DEFAULT_TURNOVER_TAX_PERCENT}%)**: ${formatMoney(profitRes.taxAmount)}
- **Sof foyda**: **${formatMoney(profitRes.netProfit)}** (Sof marja: **${formatPercent(
          profitRes.netMargin,
        )}**)

💡 **Bussy tahlili**: Biznesingiz sof rentabelligi ${formatPercent(
          profitRes.netMargin,
        )} ni tashkil qilmoqda. Xarajatlar ${Math.round(
          COST_SPLIT.fixed * 100,
        )}% o‘zgarmas / ${Math.round(
          COST_SPLIT.variable * 100,
        )}% o‘zgaruvchan nisbatda taxmin qilindi — aniq moddalarni "Moliyaviy tahlil" sahifasida kiritsangiz, hisob aniqroq bo‘ladi.`;

  return {
    role: "assistant",
    intent: "PROFIT_CALCULATION",
    toolCalled: "calculate_profit",
    toolResult: profitRes,
    content,
    quickActions:
      locale === "en"
        ? [
            { label: "📊 Full financial analysis", href: "/app/finance" },
            { label: "🧾 Calculate tax", href: "/app/tax" },
          ]
        : [
            { label: "📊 To‘liq moliyaviy tahlil", href: "/app/finance" },
            { label: "🧾 Soliqni hisoblash", href: "/app/tax" },
          ],
  };
}

/* ---------- Pul oqimi ---------- */

function handleCashflow(
  amounts: number[],
  locale: Locale,
): ChatResponsePayload {
  if (amounts.length < 2) {
    return askFor(
      locale,
      locale === "en"
        ? "monthly revenue and monthly expenses"
        : "oylik tushum va oylik xarajat",
      locale === "en"
        ? "My monthly revenue is 45M, expenses are 28M. What's my cash flow?"
        : "Oylik tushumim 45 mln, xarajatim 28 mln. Pul oqimim qanday?",
    );
  }

  const cashflowRes = calculateCashflow({
    revenue: amounts[0],
    expenses: amounts[1],
    loanPayment: amounts[2] ?? 0,
    tax: Math.round(amounts[0] * (DEFAULT_TURNOVER_TAX_PERCENT / 100)),
    locale,
  });

  const content =
    locale === "en"
      ? `**Cash flow** analysis:

- **Monthly revenue**: ${formatMoney(cashflowRes.revenue)}
- **Monthly expenses**: ${formatMoney(cashflowRes.expenses)}
- **Operating cash flow**: ${formatMoney(cashflowRes.operatingCashflow)}
- **Loan payment**: ${formatMoney(cashflowRes.loanPayment)}
- **Tax (${DEFAULT_TURNOVER_TAX_PERCENT}%)**: ${formatMoney(cashflowRes.tax)}
- **Net free cash flow**: **${formatMoney(cashflowRes.netCashflow)}**

### 💡 Bussy's conclusion:
> ${cashflowRes.statusText}

${DISCLAIMER.en}`
      : `**Pul oqimi (Cash-flow)** tahlili:

- **Oylik tushum**: ${formatMoney(cashflowRes.revenue)}
- **Oylik xarajat**: ${formatMoney(cashflowRes.expenses)}
- **Operatsion pul oqimi**: ${formatMoney(cashflowRes.operatingCashflow)}
- **Kredit to‘lovi**: ${formatMoney(cashflowRes.loanPayment)}
- **Soliq (${DEFAULT_TURNOVER_TAX_PERCENT}%)**: ${formatMoney(cashflowRes.tax)}
- **Sof erkin pul oqimi**: **${formatMoney(cashflowRes.netCashflow)}**

### 💡 Bussy xulosasi:
> ${cashflowRes.statusText}

${DISCLAIMER.uz}`;

  return {
    role: "assistant",
    intent: "CASHFLOW",
    toolCalled: "calculate_cashflow",
    toolResult: cashflowRes,
    content,
    quickActions:
      locale === "en"
        ? [
            { label: "📊 Financial analysis page", href: "/app/finance" },
            { label: "🎛️ What-if simulator", href: "/app/simulator" },
          ]
        : [
            { label: "📊 Moliyaviy tahlil sahifasi", href: "/app/finance" },
            { label: "🎛️ What-if simulyatori", href: "/app/simulator" },
          ],
  };
}

/* ---------- Zararsizlik ---------- */

function handleBreakEven(
  text: string,
  amounts: number[],
  locale: Locale,
): ChatResponsePayload {
  if (amounts.length === 0) {
    return askFor(
      locale,
      locale === "en"
        ? "the monthly fixed cost amount"
        : "oylik o‘zgarmas xarajat summasi",
      locale === "en"
        ? "My fixed costs are 16M UZS. How many units do I need to sell to break even?"
        : "O‘zgarmas xarajatim 16 mln so‘m bo‘lsa, zararsizlikka chiqish uchun nechta sotishim kerak?",
    );
  }

  const unit = resolveUnitEconomics(text, locale);
  const breakEvenRes = calculateBreakEven({
    fixedCost: amounts[0],
    sellingPrice: unit.sellingPrice,
    variableCostPerUnit: unit.variableCostPerUnit,
  });

  if (breakEvenRes.breakEvenUnits === 0) {
    return {
      role: "assistant",
      intent: "BREAK_EVEN",
      content:
        locale === "en"
          ? "I couldn't calculate a break-even point with the data given: a single product's price must be higher than its variable cost. Tell me the price and cost and I'll recalculate."
          : "Kiritilgan ma’lumotlar bilan zararsizlik nuqtasini hisoblab bo‘lmadi: bitta mahsulot narxi uning o‘zgaruvchan tannarxidan yuqori bo‘lishi shart. Narx va tannarxni aniq ko‘rsatsangiz, qayta hisoblab beraman.",
      quickActions: [
        {
          label:
            locale === "en"
              ? "📊 Financial analysis page"
              : "📊 Moliyaviy tahlil sahifasi",
          href: "/app/finance",
        },
      ],
    };
  }

  const content =
    locale === "en"
      ? `**Break-even point** calculated (based on average figures for ${unit.displayName}):

- **Monthly fixed costs**: ${formatMoney(breakEvenRes.fixedCost)} (rent, staff, utilities)
- **Average price per ${unit.unitLabel}**: ${formatMoney(breakEvenRes.sellingPrice)}
- **Cost per ${unit.unitLabel}**: ${formatMoney(breakEvenRes.variableCostPerUnit)}
- **Contribution margin**: ${formatMoney(breakEvenRes.contributionMargin)} (${formatPercent(
          breakEvenRes.contributionMarginRatio,
        )})

### 🎯 What you need to hit:
- Monthly break-even: **${breakEvenRes.breakEvenUnits.toLocaleString("en-US")} ${unit.unitLabel}s** sold
- Minimum monthly revenue: **${formatMoney(breakEvenRes.breakEvenRevenue)}**
- Minimum daily sales: **${breakEvenRes.dailyUnits}**

💡 **Bussy's conclusion**: Every ${unit.unitLabel} sold beyond ${breakEvenRes.dailyUnits} per day starts adding pure profit to your business. If your price or cost differ, enter your exact numbers on the "Financial analysis" page.`
      : `**Zararsizlik (Break-even) nuqtasi** hisoblandi (${unit.displayName} uchun o‘rtacha ko‘rsatkichlar asosida):

- **Oylik o‘zgarmas xarajat**: ${formatMoney(breakEvenRes.fixedCost)} (ijara, xodimlar, kommunal)
- **O‘rtacha bitta ${unit.unitLabel} narxi**: ${formatMoney(breakEvenRes.sellingPrice)}
- **Bitta ${unit.unitLabel} tannarxi**: ${formatMoney(breakEvenRes.variableCostPerUnit)}
- **Marjinal foyda**: ${formatMoney(breakEvenRes.contributionMargin)} (${formatPercent(
          breakEvenRes.contributionMarginRatio,
        )})

### 🎯 Sizning vazifangiz:
- Oylik zararsizlik uchun: **${breakEvenRes.breakEvenUnits.toLocaleString("ru-RU")} ta ${
          unit.unitLabel
        }** sotuv
- Oylik minimal tushum: **${formatMoney(breakEvenRes.breakEvenRevenue)}**
- Kunlik minimal sotuv: **${breakEvenRes.dailyUnits} ta**

💡 **Bussy xulosasi**: Kuniga ${breakEvenRes.dailyUnits} tadan ortiq sotilgan har bir ${
          unit.unitLabel
        } biznesingizga toza foyda keltira boshlaydi. Narx va tannarx o‘zingizda boshqacha bo‘lsa, "Moliyaviy tahlil" sahifasida aniq raqamlarni kiriting.`;

  return {
    role: "assistant",
    intent: "BREAK_EVEN",
    toolCalled: "calculate_break_even",
    toolResult: breakEvenRes,
    content,
    quickActions:
      locale === "en"
        ? [
            { label: "📊 Financial analysis page", href: "/app/finance" },
            { label: "🎛️ Try it in what-if", href: "/app/simulator" },
          ]
        : [
            { label: "📊 Moliyaviy tahlil sahifasi", href: "/app/finance" },
            { label: "🎛️ What-if da sinab ko‘rish", href: "/app/simulator" },
          ],
  };
}

/* ---------- Biznes-reja ---------- */

function handleBusinessPlan(
  text: string,
  amounts: number[],
  locale: Locale,
): ChatResponsePayload {
  const unit = resolveUnitEconomics(text, locale);
  const location = /toshkent|tashkent/.test(text)
    ? "Toshkent"
    : /urganch/.test(text)
      ? "Urganch"
      : /samarqand/.test(text)
        ? "Samarqand"
        : /buxoro|bukhara/.test(text)
          ? "Buxoro"
          : locale === "en"
            ? "City center"
            : "Shahar markazi";

  const initialCapital = amounts[0] ?? 100_000_000;
  const potentialLoan = amounts[1] ?? 0;

  const planData = generateStructuredBusinessPlan({
    businessType: unit.displayName,
    location,
    initialCapital,
    potentialLoan,
    monthlyExpenses: 28_000_000,
    expectedRevenue: 45_000_000,
    employees: 4,
    targetCustomer:
      locale === "en"
        ? "Young people, students and city residents"
        : "Yoshlar, talabalar va shahar aholisi",
    locale,
  });

  const content =
    locale === "en"
      ? `Your **11-section business plan draft** is ready!

1. **Business description**: ${planData.sections?.overview}
2. **Initial funds**: ${formatMoney(initialCapital + potentialLoan)}
3. **Expected monthly revenue**: ${formatMoney(planData.expectedRevenue)}
4. **Monthly expenses**: ${formatMoney(planData.monthlyExpenses)}
5. **Financial profitability**: ${planData.sections?.profitability}

⚠️ The monthly revenue and expense figures are sample values — enter your own numbers on the business plan page and regenerate the plan.

Click below to view the full plan and **download it as a PDF**:`
      : `Siz uchun **11 bo‘limdan iborat biznes-reja loyihasi** tayyorlandi!

1. **Biznes tavsifi**: ${planData.sections?.overview}
2. **Boshlang‘ich mablag‘**: ${formatMoney(initialCapital + potentialLoan)}
3. **Kutilayotgan oylik tushum**: ${formatMoney(planData.expectedRevenue)}
4. **Oylik xarajatlar**: ${formatMoney(planData.monthlyExpenses)}
5. **Moliyaviy rentabellik**: ${planData.sections?.profitability}

⚠️ Oylik tushum va xarajat ko‘rsatkichlari namunaviy qiymatlar — biznes-reja sahifasida o‘z raqamlaringizni kiritib, rejani qayta generatsiya qiling.

To‘liq rejani ko‘rish va **PDF formatda yuklab olish** uchun quyidagi tugmani bosing:`;

  return {
    role: "assistant",
    intent: "BUSINESS_PLAN",
    toolCalled: "generate_business_plan",
    toolResult: planData,
    content,
    quickActions:
      locale === "en"
        ? [
            {
              label: "📄 Open the business plan & download PDF",
              href: "/app/business-plan",
            },
          ]
        : [
            {
              label: "📄 Biznes-rejani ochish va PDF yuklab olish",
              href: "/app/business-plan",
            },
          ],
  };
}

/* ---------- G'oya / bozor ---------- */

function handleBusinessIdea(
  text: string,
  amounts: number[],
  locale: Locale,
): ChatResponsePayload {
  const unit = resolveUnitEconomics(text, locale);
  const location = /urganch/.test(text)
    ? "Urganch"
    : /toshkent|tashkent/.test(text)
      ? "Toshkent"
      : /samarqand/.test(text)
        ? "Samarqand"
        : locale === "en"
          ? "Cities in Uzbekistan"
          : "O‘zbekiston shaharlari";

  // Byudjet ko'rsatilmasa — moliyaviy prognozsiz, faqat sifat tahlili beramiz.
  // (Raqamni o'ylab topmaymiz, lekin foydali javobni ham bermay qo'ymaymiz.)
  if (amounts.length === 0) {
    const qualitative = analyzeBusinessIdea({
      businessIdea: unit.displayName,
      location,
      budget: 0,
      locale,
    });

    const content =
      locale === "en"
        ? `Market analysis for **${unit.displayName}** (${location}):

### 📍 Business model
${qualitative.businessModel}

### ⚠️ Key risks
${qualitative.risks.map((r) => `• ${r}`).join("\n")}

### ✅ Assumptions that must be verified
${qualitative.requiredValidation.map((v) => `• ${v}`).join("\n")}

💡 **Send your budget for a financial forecast** — for example, "I have a 100M UZS budget." I'll then work out the initial cost split and payback period too.

*Note: This analysis is a hypothesis based on general experience, not real market data — verify on the ground.*`
        : `**${unit.displayName}** (${location}) yo‘nalishi bo‘yicha bozor tahlili:

### 📍 Biznes modeli
${qualitative.businessModel}

### ⚠️ Asosiy risklar
${qualitative.risks.map((r) => `• ${r}`).join("\n")}

### ✅ Tekshirilishi shart bo‘lgan omillar
${qualitative.requiredValidation.map((v) => `• ${v}`).join("\n")}

💡 **Moliyaviy prognoz uchun byudjetingizni yozing** — masalan "100 mln so‘m byudjetim bor". Shunda boshlang‘ich xarajatlar taqsimoti va o‘zini oqlash muddatini ham hisoblab beraman.

*Eslatma: Ushbu tahlil umumiy tajribaga asoslangan gipoteza bo‘lib, real bozor ma’lumoti emas — joyida tekshiring.*`;

    return {
      role: "assistant",
      intent: "BUSINESS_IDEA_ANALYSIS",
      content,
      quickActions:
        locale === "en"
          ? [
              { label: "📈 Market analysis module", href: "/app/market" },
              {
                label: "💰 Calculate with a budget",
                prompt: `I have a 100M UZS budget to open ${unit.displayName}. Analyze it for me.`,
              },
            ]
          : [
              { label: "📈 Bozor tahlili moduli", href: "/app/market" },
              {
                label: "💰 Byudjet bilan hisoblash",
                prompt: `${unit.displayName} ochish uchun 100 mln so‘m byudjetim bor. Tahlil qilib ber.`,
              },
            ],
    };
  }

  const analysis = analyzeBusinessIdea({
    businessIdea: unit.displayName,
    location,
    budget: amounts[0],
    locale,
  });

  const content =
    locale === "en"
      ? `Your business idea has been analyzed:

- **Business type**: ${analysis.businessIdea}
- **Location**: ${analysis.location}
- **Starting budget**: ${formatMoney(analysis.budget)}

### 📊 Key findings:
- **Estimated monthly revenue**: ~${formatMoney(analysis.financialProjection.estimatedMonthlyRevenue)}
- **Estimated monthly net profit**: ~${formatMoney(analysis.financialProjection.estimatedMonthlyProfit)}
- **Payback period**: About ${analysis.financialProjection.paybackPeriodMonths} months

⚠️ **Assumptions that must be verified:**
${analysis.requiredValidation.map((v) => `• ${v}`).join("\n")}

*Note: This analysis is an estimate based on sample modeling coefficients, not real market data. Verify on the ground before deciding.*`
      : `Biznes g‘oyangiz dastlabki tahlil qilindi:

- **Biznes yo‘nalishi**: ${analysis.businessIdea}
- **Lokatsiya**: ${analysis.location}
- **Boshlang‘ich byudjet**: ${formatMoney(analysis.budget)}

### 📊 Asosiy xulosalar:
- **Taxminiy oylik tushum**: ~${formatMoney(analysis.financialProjection.estimatedMonthlyRevenue)}
- **Taxminiy oylik sof foyda**: ~${formatMoney(analysis.financialProjection.estimatedMonthlyProfit)}
- **O‘zini oqlash muddati**: Taxminan ${analysis.financialProjection.paybackPeriodMonths} oy

⚠️ **Tekshirilishi shart bo‘lgan omillar:**
${analysis.requiredValidation.map((v) => `• ${v}`).join("\n")}

*Eslatma: Ushbu tahlil namunaviy modellashtirish koeffitsiyentlariga asoslangan taxmin bo‘lib, real bozor ma’lumoti emas. Qaror qabul qilishdan oldin joyida tekshiring.*`;

  return {
    role: "assistant",
    intent: "BUSINESS_IDEA_ANALYSIS",
    toolCalled: "analyze_business_idea",
    toolResult: analysis,
    content,
    quickActions:
      locale === "en"
        ? [
            { label: "📈 Market analysis module", href: "/app/market" },
            { label: "📄 Build a business plan", href: "/app/business-plan" },
          ]
        : [
            { label: "📈 Bozor tahlili moduli", href: "/app/market" },
            { label: "📄 Biznes-reja tuzish", href: "/app/business-plan" },
          ],
  };
}

/* ---------- Umumiy ---------- */

function handleGeneral(locale: Locale): ChatResponsePayload {
  const content =
    locale === "en"
      ? `Hello! I'm **Bussy** — your smart financial advisor for your business.

I can help you with:
- **Loan calculations**: Monthly payment, interest, and debt burden analysis;
- **Profit and break-even**: How many units you need to sell;
- **Tax**: The tax burden under the turnover, general, and individual entrepreneur regimes;
- **Cash flow**: Seeing your free cash on hand;
- **Business plan generator**: An 11-section plan with PDF export;
- **What-if simulator**: Seeing how profit changes when price or costs change.

If you include specific numbers in your question (like "45M" or "45,000,000"), I'll calculate using your exact figures.`
      : `Assalomu alaykum! Men **Bussy** — biznesingiz uchun aqlli moliyaviy maslahatchiman.

Sizga quyidagi yo‘nalishlarda yordam bera olaman:
- **Kredit hisoblash**: Oylik to‘lov, foiz va qarz yukini tahlil qilish;
- **Foyda va zararsizlik (Break-even)**: Nechta mahsulot sotish kerakligini hisoblash;
- **Soliq**: Aylanma, umumiy va YaTT rejimlari bo‘yicha soliq yuki;
- **Pul oqimi (Cash-flow)**: Kassadagi erkin mablag‘ni ko‘rish;
- **Biznes-reja generatori**: 11 bo‘limli reja va PDF eksport;
- **What-if simulyatori**: Narx yoki xarajat o‘zgarganda foyda qanday o‘zgarishini ko‘rish.

Savolingizda aniq raqamlarni yozsangiz (masalan "45 mln" yoki "45 000 000"), men aynan sizning ko‘rsatkichlaringiz bo‘yicha hisoblab beraman.`;

  return {
    role: "assistant",
    intent: "GENERAL",
    content,
    quickActions:
      locale === "en"
        ? [
            {
              label: "🚀 Run the demo scenario",
              prompt:
                "I want to start a fast food business in Urganch with 100M UZS. I can also get a 50M UZS loan. Build me a financial plan.",
            },
            {
              label: "💳 Calculate a loan",
              prompt:
                "If I take a 50M UZS loan for 24 months at 24%, how much do I pay per month?",
            },
            {
              label: "📊 Calculate profit",
              prompt:
                "If monthly revenue is 45M and expenses are 28M UZS, what's my profit?",
            },
          ]
        : [
            {
              label: "🚀 Demo rejimini ishga tushirish",
              prompt:
                "Urganchda 100 mln so‘m bilan fast food biznes boshlamoqchiman. Yana 50 mln so‘m kredit olishim mumkin. Menga moliyaviy reja tuzib ber.",
            },
            {
              label: "💳 Kreditni hisoblash",
              prompt:
                "50 mln so‘m kreditni 24 oyga 24% bilan olsam oyiga qancha to‘layman?",
            },
            {
              label: "📊 Foydani hisoblash",
              prompt:
                "Oylik tushum 45 mln, xarajat 28 mln so‘m bo‘lsa foydam qancha?",
            },
          ],
  };
}
