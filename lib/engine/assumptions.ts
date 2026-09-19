/**
 * Markazlashtirilgan taxminlar (assumptions).
 *
 * Ilgari bu raqamlar 5 ta faylda takrorlangan va bir-biriga zid edi
 * (masalan, xarajat taqsimoti analyzer.ts da 60/40, simulyatorda esa 55/45).
 * Barcha modullar endi shu yerdan o'qiydi — bitta manba, bitta haqiqat.
 *
 * DIQQAT: bular namunaviy (demo) o'rtacha ko'rsatkichlar, rasmiy statistika emas.
 * Real hisob-kitob uchun foydalanuvchi o'z raqamlarini kiritishi kerak.
 */

/** Oyiga necha kun ishlaydi deb hisoblaymiz (kunlik sotuvni chiqarish uchun). */
export const DAYS_PER_MONTH = 30;

/** O'zbekistondagi standart aylanma soliq stavkasi (%). */
export const DEFAULT_TURNOVER_TAX_PERCENT = 4;

/**
 * Umumiy oylik xarajatni o'zgarmas va o'zgaruvchan qismlarga bo'lish nisbati.
 * Faqat foydalanuvchi aniq moddalarni kiritmaganda ishlatiladi.
 */
export const COST_SPLIT = {
  fixed: 0.6,
  variable: 0.4,
} as const;

export interface UnitEconomics {
  /** Bitta mahsulot/xizmatning o'rtacha sotish narxi (so'm). */
  sellingPrice: number;
  /** Bitta mahsulotning o'zgaruvchan tannarxi (so'm). */
  variableCostPerUnit: number;
  /** Hisobot matnlarida ishlatiladigan birlik nomi. */
  unitLabel: string;
  /** Inson o'qiy oladigan biznes turi nomi. */
  displayName: string;
}

export type BusinessTypeKey = "fastFood" | "coffee" | "bakery" | "retail" | "service";

/**
 * Biznes turlari bo'yicha birlik iqtisodiyoti.
 * Avval barcha biznes turlari uchun bitta 35 000 / 18 000 juftligi ishlatilardi —
 * nonvoyxona ham, kofexona ham bir xil o'rtacha chek olardi.
 */
export const UNIT_ECONOMICS: Record<BusinessTypeKey, UnitEconomics> = {
  fastFood: {
    sellingPrice: 35_000,
    variableCostPerUnit: 18_000,
    unitLabel: "buyurtma",
    displayName: "Fast Food",
  },
  coffee: {
    sellingPrice: 25_000,
    variableCostPerUnit: 8_500,
    unitLabel: "chashka",
    displayName: "Coffee Shop",
  },
  bakery: {
    sellingPrice: 6_000,
    variableCostPerUnit: 2_800,
    unitLabel: "non",
    displayName: "Nonvoyxona",
  },
  retail: {
    sellingPrice: 45_000,
    variableCostPerUnit: 30_000,
    unitLabel: "mahsulot",
    displayName: "Savdo do‘koni",
  },
  service: {
    sellingPrice: 120_000,
    variableCostPerUnit: 35_000,
    unitLabel: "xizmat",
    displayName: "Xizmat ko‘rsatish",
  },
};

export const DEFAULT_BUSINESS_TYPE: BusinessTypeKey = "fastFood";

/** Inglizcha hisobot matnlari uchun birlik nomi va biznes turi nomi. */
const EN_UNIT_ECONOMICS_COPY: Record<BusinessTypeKey, { unitLabel: string; displayName: string }> = {
  fastFood: { unitLabel: "order", displayName: "Fast Food" },
  coffee: { unitLabel: "cup", displayName: "Coffee Shop" },
  bakery: { unitLabel: "loaf", displayName: "Bakery" },
  retail: { unitLabel: "item", displayName: "Retail Store" },
  service: { unitLabel: "service", displayName: "Service Business" },
};

/**
 * Erkin matndan (o'zbekcha yoki inglizcha) biznes turini aniqlash.
 * Ilgari faqat "kofe" tekshirilardi, shuning uchun "Coffee shop" so'rovi
 * Fast Food deb javob olardi.
 */
const TYPE_PATTERNS: { key: BusinessTypeKey; pattern: RegExp }[] = [
  { key: "coffee", pattern: /kofe|coffee|qahva|kahva|kofexona|kofeyn/i },
  { key: "bakery", pattern: /novvoy|nonvoy|non\s|nonvoyxona|bakery|tandir|pishiriq/i },
  { key: "fastFood", pattern: /fast\s*food|fastfood|lavash|burger|shaurma|somsa|choyxona/i },
  { key: "retail", pattern: /do‘kon|dokon|do'kon|savdo|market|magazin|retail|shop/i },
  { key: "service", pattern: /xizmat|salon|servis|service|ta'mirlash|tamirlash|atelye/i },
];

export function resolveBusinessTypeKey(text: string | undefined | null): BusinessTypeKey {
  if (!text) return DEFAULT_BUSINESS_TYPE;
  for (const { key, pattern } of TYPE_PATTERNS) {
    if (pattern.test(text)) return key;
  }
  return DEFAULT_BUSINESS_TYPE;
}

/** Erkin matnli biznes turidan birlik iqtisodiyotini olish. */
export function resolveUnitEconomics(
  text: string | undefined | null,
  locale: "uz" | "en" = "uz"
): UnitEconomics {
  const key = resolveBusinessTypeKey(text);
  const base = UNIT_ECONOMICS[key];
  if (locale === "en") {
    return { ...base, ...EN_UNIT_ECONOMICS_COPY[key] };
  }
  return base;
}
