import type { Locale } from "../i18n/translations";

export type TaxRegimeType = "turnover" | "general" | "individual";

export interface TaxRegimeConfig {
  id: TaxRegimeType;
  name: string;
  description: string;
  defaultRatePercent?: number;
  profitTaxPercent?: number;
  vatPercent?: number;
  fixedMonthlyAmount?: number;
  socialTaxMonthlyAmount?: number;
}

export const UZ_TAX_REGIMES: Record<TaxRegimeType, TaxRegimeConfig> = {
  turnover: {
    id: "turnover",
    name: "Aylanmadan olinadigan soliq (Soddalashtirilgan)",
    description: "Yillik aylanmasi 1 mlrd so‘mgacha bo‘lgan korxonalar uchun. Barcha tushumdan qat'iy foiz to‘lanadi.",
    defaultRatePercent: 4, // 4% standart stavka
  },
  general: {
    id: "general",
    name: "Umumiy soliq tizimi (Foyda solig‘i + QQS)",
    description: "Yillik aylanmasi 1 mlrd so‘mdan oshgan yoki ixtiyoriy o‘tgan korxonalar uchun. Sof foydadan soliq + 12% QQS.",
    profitTaxPercent: 15, // 15% foyda solig'i (2023-yildan amaldagi umumiy stavka)
    vatPercent: 12, // 12% QQS
  },
  individual: {
    id: "individual",
    name: "YaTT qat'iy belgilangan soliq",
    description: "Yakka tartibdagi tadbirkorlar uchun faoliyat turi va hududiga qarab oylik qat'iy belgilangan to‘lov.",
    fixedMonthlyAmount: 500_000,
    socialTaxMonthlyAmount: 375_000,
  },
};

const EN_TAX_REGIME_COPY: Record<TaxRegimeType, { name: string; description: string }> = {
  turnover: {
    name: "Turnover tax (simplified)",
    description:
      "For businesses with annual turnover up to 1 billion UZS. A flat percentage is paid on all revenue.",
  },
  general: {
    name: "General tax regime (profit tax + VAT)",
    description:
      "For businesses with annual turnover above 1 billion UZS, or that opted in voluntarily. Tax on net profit plus 12% VAT.",
  },
  individual: {
    name: "Individual entrepreneur fixed tax",
    description:
      "For individual entrepreneurs — a fixed monthly payment based on activity type and region.",
  },
};

export function getRegimeCopy(regime: TaxRegimeType, locale: Locale = "uz") {
  if (locale === "en") return EN_TAX_REGIME_COPY[regime];
  return { name: UZ_TAX_REGIMES[regime].name, description: UZ_TAX_REGIMES[regime].description };
}

export interface TaxCalculationInput {
  regime: TaxRegimeType;
  revenue: number;
  expenses: number;
  /** Natija matnlari (nom, breakdown yorliqlari, taxminlar) shu tilda qaytariladi. Standart: "uz". */
  locale?: Locale;
  /** Soliq stavkasi FOIZDA — `turnover` va `general` rejimlari uchun. */
  customRate?: number;
  /**
   * YaTT uchun oylik QAT'IY SUMMA (so'mda).
   * Ilgari buning uchun ham `customRate` ishlatilar va nomi chalg'itardi.
   */
  customFixedAmount?: number;
  /**
   * QQS hisoblanadigan (kirim QQSi mavjud bo‘lgan) xarajatlar — xom-ashyo, tovar,
   * QQS to‘lovchi yetkazib beruvchilardan olingan xizmatlar.
   * Ish haqi, ijtimoiy to‘lovlar va QQS to‘lovchisi bo‘lmagan kontragentlar bundan chiqadi.
   * Berilmasa, `expenses` ning taxminan 60% i kirim QQSiga ega deb olinadi.
   */
  vatableExpenses?: number;
}

export interface TaxCalculationResult {
  regime: TaxRegimeType;
  regimeName: string;
  taxBase: number;
  taxAmount: number;
  effectiveTaxRate: number;
  profitAfterTax: number;
  breakdown: { label: string; amount: number }[];
  isDemo: boolean;
  disclaimer: string;
  /** Hisob-kitobda ishlatilgan taxminlar — foydalanuvchiga ko‘rsatish uchun. */
  assumptions: string[];
}

/**
 * Kirim QQSiga ega bo‘lgan xarajatlarning taxminiy ulushi.
 * Ish haqi jamg‘armasi odatda umumiy xarajatning katta qismini tashkil qiladi
 * va unda kirim QQSi bo‘lmaydi.
 */
const DEFAULT_VATABLE_EXPENSE_RATIO = 0.6;

const DISCLAIMER: Record<Locale, string> = {
  uz: "⚠️ Diqqat: Mazkur hisob-kitob taxminiy demo ma’lumotlarga asoslangan va O‘zbekiston Respublikasi Soliq kodeksiga muvofiq umumiy qoidalarni ifodalaydi. Rasmiy soliq hisoboti uchun buxgalter yoki soliq maslahatchisiga murojaat qiling.",
  en: "⚠️ Note: This is an approximate demo calculation reflecting the general rules of Uzbekistan's Tax Code. Consult an accountant or tax advisor for an official tax filing.",
};

/** Yig'indi breakdown bilan mos kelishini kafolatlaydi (yaxlitlash xatolarisiz). */
function sumBreakdown(breakdown: { label: string; amount: number }[]): number {
  return breakdown.reduce((acc, item) => acc + item.amount, 0);
}

export function calculateTax(input: TaxCalculationInput): TaxCalculationResult {
  const { regime, revenue, expenses, customRate, customFixedAmount, vatableExpenses } = input;
  const locale: Locale = input.locale ?? "uz";
  const config = UZ_TAX_REGIMES[regime];
  const regimeName = getRegimeCopy(regime, locale).name;

  if (regime === "turnover") {
    const rate = customRate !== undefined ? customRate : config.defaultRatePercent || 4;
    const taxBase = Math.max(0, revenue);

    const breakdown = [
      {
        label:
          locale === "en"
            ? `Tax on total revenue (${rate}%)`
            : `Jami tushumdan soliq (${rate}%)`,
        amount: Math.round(taxBase * (rate / 100)),
      },
    ];
    const taxAmount = sumBreakdown(breakdown);

    return {
      regime,
      regimeName,
      taxBase: Math.round(taxBase),
      taxAmount,
      effectiveTaxRate: revenue > 0 ? Math.round((taxAmount / revenue) * 1000) / 10 : 0,
      profitAfterTax: Math.round(revenue - expenses - taxAmount),
      breakdown,
      isDemo: true,
      disclaimer: DISCLAIMER[locale],
      assumptions:
        locale === "en"
          ? [
              "Turnover tax is charged on all revenue, without deducting expenses.",
              "Preferential rates (1%, 2%) apply only to certain regions and activity types.",
            ]
          : [
              "Aylanma soliq barcha tushumdan, xarajatlarni hisobga olmagan holda olinadi.",
              "Imtiyozli stavkalar (1%, 2%) faqat ayrim hudud va faoliyat turlariga taalluqli.",
            ],
    };
  }

  if (regime === "general") {
    const profitTaxRate = customRate !== undefined ? customRate : config.profitTaxPercent || 15;
    const vatRate = config.vatPercent || 12;

    const profitBeforeTax = Math.max(0, revenue - expenses);
    const profitTax = profitBeforeTax * (profitTaxRate / 100);

    // QQS — qo'shilgan qiymatdan olinadi: chiqim QQSi minus kirim QQSi.
    // (Ilgari bu noto'g'ri tarzda sof foydaning 12% i sifatida hisoblanardi.)
    const vatableCosts =
      vatableExpenses !== undefined
        ? Math.min(Math.max(0, vatableExpenses), Math.max(0, expenses))
        : Math.max(0, expenses) * DEFAULT_VATABLE_EXPENSE_RATIO;
    const addedValue = Math.max(0, revenue - vatableCosts);
    const netVat = addedValue * (vatRate / 100);

    const breakdown =
      locale === "en"
        ? [
            { label: `Profit tax (${profitTaxRate}%)`, amount: Math.round(profitTax) },
            { label: `VAT — on value added (${vatRate}%)`, amount: Math.round(netVat) },
          ]
        : [
            { label: `Foyda solig‘i (${profitTaxRate}%)`, amount: Math.round(profitTax) },
            { label: `QQS — qo‘shilgan qiymatdan (${vatRate}%)`, amount: Math.round(netVat) },
          ];
    const taxAmount = sumBreakdown(breakdown);

    return {
      regime,
      regimeName,
      taxBase: Math.round(profitBeforeTax),
      taxAmount,
      effectiveTaxRate: revenue > 0 ? Math.round((taxAmount / revenue) * 1000) / 10 : 0,
      profitAfterTax: Math.round(revenue - expenses - taxAmount),
      breakdown,
      isDemo: true,
      disclaimer: DISCLAIMER[locale],
      assumptions:
        locale === "en"
          ? [
              `VAT was computed as output VAT minus input VAT. ${Math.round(
                (vatableCosts / Math.max(1, expenses)) * 100
              )}% of expenses were assumed to carry input VAT.`,
              "Salaries and social payments carry no input VAT.",
              "The profit-tax base is accounting profit with no tax-purpose adjustments.",
            ]
          : [
              `QQS chiqim QQSi minus kirim QQSi sifatida hisoblandi. Xarajatlarning ${Math.round(
                (vatableCosts / Math.max(1, expenses)) * 100
              )}% ida kirim QQSi bor deb olindi.`,
              "Ish haqi va ijtimoiy to‘lovlarda kirim QQSi bo‘lmaydi.",
              "Foyda solig‘i bazasi soliq maqsadidagi tuzatishlarsiz, buxgalteriya foydasidan olindi.",
            ],
    };
  }

  // individual — YaTT qat'iy belgilangan soliq
  const fixedAmount =
    customFixedAmount !== undefined ? customFixedAmount : config.fixedMonthlyAmount || 500_000;
  const socialTax = config.socialTaxMonthlyAmount || 0;

  const breakdown =
    locale === "en"
      ? [
          { label: "Fixed monthly tax", amount: Math.round(fixedAmount) },
          { label: "Social tax (base unit calculation)", amount: Math.round(socialTax) },
        ]
      : [
          { label: "Oylik qat'iy belgilangan soliq", amount: Math.round(fixedAmount) },
          { label: "Ijtimoiy soliq (1 BHM bazaviy hisob)", amount: Math.round(socialTax) },
        ];
  // Ilgari ijtimoiy soliq jadvalda ko'rsatilardi, lekin jamiga qo'shilmasdi —
  // sahifada 500 000 + 375 000 chiqib, jami 500 000 deb yozilardi.
  const taxAmount = sumBreakdown(breakdown);

  return {
    regime,
    regimeName,
    taxBase: Math.round(revenue),
    taxAmount,
    effectiveTaxRate: revenue > 0 ? Math.round((taxAmount / revenue) * 1000) / 10 : 0,
    profitAfterTax: Math.round(revenue - expenses - taxAmount),
    breakdown,
    isDemo: true,
    disclaimer: DISCLAIMER[locale],
    assumptions:
      locale === "en"
        ? [
            "The fixed tax amount varies by activity type and region — an average value is used here.",
            "Social tax is shown as a monthly amount based on one base calculation unit.",
          ]
        : [
            "Qat'iy soliq summasi faoliyat turi va hududga qarab farq qiladi — bu yerda o‘rtacha qiymat olingan.",
            "Ijtimoiy soliq 1 BHM bazasida oylik hisobda ko‘rsatilgan.",
          ],
  };
}
