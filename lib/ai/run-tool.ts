import { calculateLoan } from "@/lib/engine/loan";
import { calculateProfit } from "@/lib/engine/profit";
import { calculateBreakEven } from "@/lib/engine/breakeven";
import { calculateCashflow } from "@/lib/engine/cashflow";
import { calculateTax } from "@/lib/engine/tax";
import {
  analyzeDebtBurden,
  analyzeBusinessIdea,
  generateStructuredBusinessPlan,
} from "@/lib/engine/analyzer";
import { DEFAULT_TURNOVER_TAX_PERCENT } from "@/lib/engine/assumptions";
import type { Locale } from "@/lib/i18n/translations";

export type ToolArgs = Record<string, unknown>;

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

/**
 * Model chaqirgan vositani bajaradi.
 *
 * Barcha matematika shu yerda — modelga hech qachon hisoblashga ruxsat
 * berilmaydi. Noma'lum vosita uchun `undefined` qaytaradi.
 */
export function runTool(
  name: string,
  args: ToolArgs,
  locale: Locale = "uz",
): unknown | undefined {
  switch (name) {
    case "calculate_loan":
      return calculateLoan({
        amount: asNumber(args.amount),
        annualRate: asNumber(args.annual_rate),
        months: asNumber(args.months, 1),
      });

    case "calculate_profit":
      return calculateProfit({
        revenue: asNumber(args.revenue),
        fixedCost: asNumber(args.fixed_cost),
        variableCost: asNumber(args.variable_cost),
        taxRate: asNumber(args.tax, DEFAULT_TURNOVER_TAX_PERCENT),
      });

    case "calculate_break_even":
      return calculateBreakEven({
        fixedCost: asNumber(args.fixed_cost),
        sellingPrice: asNumber(args.selling_price),
        variableCostPerUnit: asNumber(args.variable_cost),
      });

    case "calculate_cashflow":
      return calculateCashflow({
        revenue: asNumber(args.revenue),
        expenses: asNumber(args.expenses),
        loanPayment: asNumber(args.loan_payment),
        tax: asNumber(args.tax),
      });

    case "calculate_tax": {
      const regime = asString(args.regime, "turnover");
      return calculateTax({
        regime:
          regime === "general" || regime === "individual"
            ? regime
            : ("turnover" as const),
        revenue: asNumber(args.revenue),
        expenses: asNumber(args.expenses),
        customRate: typeof args.rate === "number" ? args.rate : undefined,
        vatableExpenses:
          typeof args.vatable_expenses === "number"
            ? args.vatable_expenses
            : undefined,
        isVatInclusive:
          typeof args.is_vat_inclusive === "boolean"
            ? args.is_vat_inclusive
            : undefined,
        locale,
      });
    }

    case "analyze_debt_burden":
      return analyzeDebtBurden({
        monthlyRevenue: asNumber(args.revenue),
        monthlyExpenses: asNumber(args.expenses),
        loanAmount: asNumber(args.loan_amount),
        annualRate: asNumber(args.annual_rate),
        loanMonths: asNumber(args.months, 1),
        locale,
      });

    case "analyze_business_idea":
      return analyzeBusinessIdea({
        businessIdea: asString(
          args.business_idea,
          locale === "en" ? "Business" : "Biznes",
        ),
        location: asString(
          args.location,
          locale === "en" ? "Uzbekistan" : "O‘zbekiston",
        ),
        budget: asNumber(args.budget),
        targetCustomer: asString(
          args.target_customer,
          locale === "en" ? "Customers" : "Mijozlar",
        ),
        locale,
      });

    case "generate_business_plan":
      return generateStructuredBusinessPlan({
        businessType: asString(
          args.business_type,
          locale === "en" ? "Business" : "Biznes",
        ),
        location: asString(
          args.location,
          locale === "en" ? "City center" : "Shahar markazi",
        ),
        initialCapital: asNumber(args.initial_capital),
        monthlyExpenses: asNumber(args.monthly_expenses),
        expectedRevenue: asNumber(args.expected_revenue),
        employees: asNumber(args.employees, 2),
        targetCustomer: asString(
          args.target_customer,
          locale === "en" ? "Customers" : "Mijozlar",
        ),
        locale,
      });

    default:
      return undefined;
  }
}

/** Mavjud vositalar ro'yxati — testlar va UI uchun. */
export const TOOL_NAMES = [
  "calculate_loan",
  "calculate_profit",
  "calculate_break_even",
  "calculate_cashflow",
  "calculate_tax",
  "analyze_debt_burden",
  "analyze_business_idea",
  "generate_business_plan",
] as const;
