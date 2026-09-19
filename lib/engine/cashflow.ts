import { CashflowInput, CashflowResult } from "./types";
import type { Locale } from "../i18n/translations";

/**
 * `noRevenue` — bu alohida STATUS emas, alohida MATN.
 *
 * `CashflowResult.status` hamon uchta qiymatdan iborat ("healthy" | "warning" |
 * "critical") — uni kengaytirish `lib/engine/types.ts` dagi ommaviy tipni
 * o'zgartirardi va barcha iste'molchilarga (kartochka, finance, simulyator)
 * tegib ketardi. Shuning uchun tushum nol bo'lganda status "warning" bo'ladi,
 * matn esa aynan shu holatni tushuntiradi.
 */
const STATUS_TEXT: Record<
  Locale,
  Record<"healthy" | "warning" | "critical" | "noRevenue", string>
> = {
  uz: {
    healthy:
      "Ijobiy va barqaror pul oqimi. Biznes operatsion xarajatlarni to‘liq qoplab, erkin pul qoldirmoqda.",
    critical:
      "Manfiy pul oqimi! Tushum jami xarajat va kredit to‘lovlarini qoplashga yetmayapti. Kassa uzilishi (cash gap) xavfi yuqori.",
    warning:
      "Past erkin pul oqimi. Kutilmagan xarajatlar yuzaga kelsa, likvidlik tanqisligi yuz berishi mumkin. Zaxira shakllantirish tavsiya etiladi.",
    noRevenue:
      "Tushum nol. Pul oqimi manfiy bo‘lmasa ham, buni sog‘lom deb bo‘lmaydi: biznes hali hech narsa ishlab topmayapti. Oylik tushumni kiriting yoki sotuvni yo‘lga qo‘ying — usiz likvidlikni baholash mumkin emas.",
  },
  en: {
    healthy:
      "Positive, stable cash flow. The business fully covers operating expenses and still has cash left over.",
    critical:
      "Negative cash flow! Revenue doesn't cover total expenses and loan payments. High risk of a cash gap.",
    warning:
      "Low free cash flow. An unexpected expense could create a liquidity shortfall. Building a cash reserve is recommended.",
    noRevenue:
      "Revenue is zero. Even though cash flow is not negative, this cannot be called healthy: the business is not earning anything yet. Enter the monthly revenue or start making sales — liquidity cannot be assessed without it.",
  },
};

/**
 * calculateCashflow
 * Pul oqimi (Cash-flow) tahlili va likvidlik bahosi.
 */
export function calculateCashflow(
  input: CashflowInput & { locale?: Locale }
): CashflowResult {
  const { revenue, expenses, loanPayment = 0, tax = 0, locale = "uz" } = input;

  const operatingCashflow = revenue - expenses;
  const netCashflow = operatingCashflow - loanPayment - tax;

  // Tushum yo'q. Ilgari revenue = 0 va expenses = 0 bo'lganda netCashflow = 0
  // chiqar, ikkala shart ham o'tmas va status "healthy" bo'lib qolardi —
  // hech narsa ishlab topmayotgan biznes "barqaror ijobiy oqim" deb
  // ko'rsatilardi. Manfiy tushum ham shu yerga tushadi (yaroqsiz kirish).
  const hasNoRevenue = revenue <= 0;

  let status: "healthy" | "warning" | "critical" = "healthy";

  if (netCashflow < 0) {
    // Tushum nol bo'lsa-yu xarajat bo'lsa, bu allaqachon manfiy oqim —
    // "critical" aniqroq va uning matni ham shu holatni tushuntiradi.
    status = "critical";
  } else if (hasNoRevenue) {
    status = "warning";
  } else if (netCashflow < revenue * 0.1) {
    status = "warning";
  }

  const statusText =
    hasNoRevenue && status !== "critical"
      ? STATUS_TEXT[locale].noRevenue
      : STATUS_TEXT[locale][status];

  return {
    revenue: Math.round(revenue),
    expenses: Math.round(expenses),
    operatingCashflow: Math.round(operatingCashflow),
    loanPayment: Math.round(loanPayment),
    tax: Math.round(tax),
    netCashflow: Math.round(netCashflow),
    status,
    statusText,
  };
}
