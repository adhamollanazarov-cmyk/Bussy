import { BreakEvenInput, BreakEvenResult } from "./types";
import { DAYS_PER_MONTH } from "./assumptions";

/**
 * calculateBreakEven
 * Zararsizlik (Break-even) nuqtasini hisoblash.
 * Formula:
 * Contribution Margin (CM) = Price - Variable Cost per unit
 * Break Even Units = Fixed Cost / CM
 * Break Even Revenue = Break Even Units * Price
 */
export function calculateBreakEven(input: BreakEvenInput): BreakEvenResult {
  const { fixedCost, sellingPrice, variableCostPerUnit } = input;

  const contributionMargin = Math.max(0, sellingPrice - variableCostPerUnit);
  const contributionMarginRatio = sellingPrice > 0 ? (contributionMargin / sellingPrice) * 100 : 0;

  if (contributionMargin <= 0 || fixedCost <= 0) {
    return {
      fixedCost,
      sellingPrice,
      variableCostPerUnit,
      contributionMargin: 0,
      contributionMarginRatio: 0,
      breakEvenUnits: 0,
      breakEvenRevenue: 0,
      dailyUnits: 0,
    };
  }

  const breakEvenUnits = Math.ceil(fixedCost / contributionMargin);
  const breakEvenRevenue = breakEvenUnits * sellingPrice;
  const dailyUnits = Math.ceil(breakEvenUnits / DAYS_PER_MONTH);

  return {
    fixedCost: Math.round(fixedCost),
    sellingPrice: Math.round(sellingPrice),
    variableCostPerUnit: Math.round(variableCostPerUnit),
    contributionMargin: Math.round(contributionMargin),
    contributionMarginRatio: Math.round(contributionMarginRatio * 10) / 10,
    breakEvenUnits,
    breakEvenRevenue: Math.round(breakEvenRevenue),
    dailyUnits,
  };
}
