import { ProfitCalculationInput, ProfitCalculationResult } from "./types";

/**
 * calculateProfit
 * Yalpi va sof foyda, xarajatlar va rentabellik marjasini hisoblash.
 */
export function calculateProfit(input: ProfitCalculationInput): ProfitCalculationResult {
  const { revenue, fixedCost, variableCost, taxRate = 4, taxAmount: explicitTax } = input;

  const totalCost = fixedCost + variableCost;
  // Yalpi foyda manfiy ham bo'lishi mumkin: agar mahsulot tannarxi tushumdan
  // yuqori bo'lsa, buni yashirish emas, ko'rsatish kerak. (Ilgari Math.max(0, …)
  // bilan chegaralangan edi va zarar ko'rayotgan biznes musbat yalpi marja
  // bilan ko'rinardi.)
  const grossProfit = revenue - variableCost;
  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

  // Soliq hisobi: agar explicitTax berilgan bo'lsa uni olamiz, aks holda tushumdan taxRate% (O'zbekistondagi aylanma soliq 4%)
  const calculatedTax = explicitTax !== undefined ? explicitTax : (revenue * (taxRate / 100));

  const netProfit = revenue - totalCost - calculatedTax;
  const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  return {
    revenue: Math.round(revenue),
    fixedCost: Math.round(fixedCost),
    variableCost: Math.round(variableCost),
    totalCost: Math.round(totalCost),
    grossProfit: Math.round(grossProfit),
    grossMargin: Math.round(grossMargin * 10) / 10,
    taxAmount: Math.round(calculatedTax),
    netProfit: Math.round(netProfit),
    netMargin: Math.round(netMargin * 10) / 10,
  };
}
