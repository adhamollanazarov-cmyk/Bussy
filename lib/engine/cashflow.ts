import { CashflowInput, CashflowResult } from "./types";
import type { Locale } from "../i18n/translations";

const STATUS_TEXT: Record<Locale, Record<"healthy" | "warning" | "critical", string>> = {
  uz: {
    healthy:
      "Ijobiy va barqaror pul oqimi. Biznes operatsion xarajatlarni to‘liq qoplab, erkin pul qoldirmoqda.",
    critical:
      "Manfiy pul oqimi! Tushum jami xarajat va kredit to‘lovlarini qoplashga yetmayapti. Kassa uzilishi (cash gap) xavfi yuqori.",
    warning:
      "Past erkin pul oqimi. Kutilmagan xarajatlar yuzaga kelsa, likvidlik tanqisligi yuz berishi mumkin. Zaxira shakllantirish tavsiya etiladi.",
  },
  en: {
    healthy:
      "Positive, stable cash flow. The business fully covers operating expenses and still has cash left over.",
    critical:
      "Negative cash flow! Revenue doesn't cover total expenses and loan payments. High risk of a cash gap.",
    warning:
      "Low free cash flow. An unexpected expense could create a liquidity shortfall. Building a cash reserve is recommended.",
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

  let status: "healthy" | "warning" | "critical" = "healthy";

  if (netCashflow < 0) {
    status = "critical";
  } else if (revenue > 0 && netCashflow < revenue * 0.1) {
    status = "warning";
  }

  const statusText = STATUS_TEXT[locale][status];

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
