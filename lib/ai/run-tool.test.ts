import { describe, it, expect } from "vitest";
import { runTool, TOOL_NAMES } from "./run-tool";
import { BUSSY_TOOLS } from "./tools";

/* ============================================================
   VOSITA DISPETCHERI
   ------------------------------------------------------------
   Bu qatlam ilgari umuman test bilan qoplanmagan edi — aynan shu
   yerda regressiyalar paydo bo'lgandi.
   ============================================================ */

describe("runTool", () => {
  it("har bir e'lon qilingan vosita bajariladi", () => {
    // BUSSY_TOOLS dagi har bir nom uchun dispetcherda tarmoq bo'lishi shart,
    // aks holda model chaqiradi-yu, hech narsa qaytmaydi.
    const declared = BUSSY_TOOLS.map((t) => t.function.name).sort();
    expect(declared).toEqual([...TOOL_NAMES].sort());
  });

  it.each([...TOOL_NAMES])("%s nomi undefined qaytarmaydi", (name) => {
    const args: Record<string, unknown> = {
      amount: 50_000_000,
      annual_rate: 24,
      months: 24,
      revenue: 45_000_000,
      expenses: 28_000_000,
      fixed_cost: 16_800_000,
      variable_cost: 11_200_000,
      selling_price: 35_000,
      loan_amount: 50_000_000,
      budget: 100_000_000,
      business_idea: "Fast Food",
      business_type: "Fast Food",
      location: "Urganch",
      initial_capital: 100_000_000,
      monthly_expenses: 28_000_000,
      expected_revenue: 45_000_000,
      regime: "turnover",
    };
    expect(runTool(name, args)).toBeDefined();
  });

  it("noma'lum vosita uchun undefined qaytaradi", () => {
    expect(runTool("calculate_nonsense", {})).toBeUndefined();
  });

  it("yaroqsiz argumentlarda ham xato tashlamaydi", () => {
    expect(() =>
      runTool("calculate_loan", { amount: "ko‘p", annual_rate: null, months: undefined })
    ).not.toThrow();
  });

  it("calculate_tax vatable_expenses ni uzatadi", () => {
    const withVat = runTool("calculate_tax", {
      regime: "general",
      revenue: 100_000_000,
      expenses: 60_000_000,
      vatable_expenses: 60_000_000,
    }) as { breakdown: { label: string; amount: number }[] };

    const vatLine = withVat.breakdown.find((b) => b.label.includes("QQS"));
    // Qo'shilgan qiymat = 100 - 60 = 40 mln, QQS = 4.8 mln
    expect(vatLine?.amount).toBe(4_800_000);
  });
});
