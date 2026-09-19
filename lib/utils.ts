import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return "0 so‘m";
  return (
    new Intl.NumberFormat("ru-RU", {
      maximumFractionDigits: 0,
    }).format(Math.round(amount)) + " so‘m"
  );
}

export function formatCompactMoney(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return "0 so‘m";
  if (Math.abs(amount) >= 1_000_000_000) {
    return (amount / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + " mlrd so‘m";
  }
  if (Math.abs(amount) >= 1_000_000) {
    return (amount / 1_000_000).toFixed(1).replace(/\.0$/, "") + " mln so‘m";
  }
  if (Math.abs(amount) >= 1_000) {
    return (amount / 1_000).toFixed(0) + " ming so‘m";
  }
  return formatMoney(amount);
}

/**
 * Foizni formatlash. Qiymat mavjud bo'lmasa "—" qaytaradi:
 * hisoblab bo'lmaydigan ko'rsatkichni "0%" deb ko'rsatish chalg'ituvchi bo'ladi.
 */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return "—";
  return `${(Math.round(value * 10) / 10).toFixed(1).replace(/\.0$/, "")}%`;
}

/** Nisbatni xavfsiz hisoblash — maxrajda 0 bo'lsa null qaytaradi (NaN% o'rniga). */
export function safeRatioPercent(
  numerator: number | null | undefined,
  denominator: number | null | undefined
): number | null {
  if (
    numerator === null ||
    numerator === undefined ||
    !denominator ||
    isNaN(numerator) ||
    isNaN(denominator)
  ) {
    return null;
  }
  return (numerator / denominator) * 100;
}

/**
 * Noma'lum qiymatni songa aylantirish.
 * Recharts tooltip formatter'lari `string | number | (string|number)[] | undefined`
 * uzatadi, shuning uchun `any` ishlatmasdan shu yerda normallashtiramiz.
 */
export function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  if (Array.isArray(value)) return toNumber(value[0]);
  return 0;
}

export function parseNumberInput(str: string | number): number {
  if (typeof str === "number") return isNaN(str) ? 0 : str;
  if (!str) return 0;
  const clean = str.replace(/[^\d.-]/g, "");
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}
