import { describe, expect, it } from "vitest";
import { TAX_SOURCES } from "./tax-sources";
import { calculateTax, type TaxRegimeType } from "./tax";

describe("soliq stavkalari manbalari", () => {
  it("buxgalter tekshirguncha huquqiy asoslar bo'sh va sana 2026-01-01", () => {
    for (const [rateId, source] of Object.entries(TAX_SOURCES)) {
      expect(source.rateId).toBe(rateId);
      expect(source.legalBasis).toBe("");
      expect(source.effectiveFrom).toBe("2026-01-01");
      expect(source).not.toHaveProperty("verifiedBy");
    }
  });

  const expectedSources: Record<TaxRegimeType, string[]> = {
    turnover: ["turnover"],
    general: ["profit", "vat"],
    individual: ["individual", "social"],
  };

  for (const locale of ["uz", "en"] as const) {
    for (const regime of Object.keys(expectedSources) as TaxRegimeType[]) {
      it(`${locale}: ${regime} hisobining har bir moddasi to'g'ri manbaga bog'langan`, () => {
        const result = calculateTax({ regime, revenue: 45_000_000, expenses: 28_000_000, locale });

        expect(result.breakdown.map((item) => item.source.rateId)).toEqual(expectedSources[regime]);
        for (const item of result.breakdown) {
          expect(item.source.legalBasis).toBe("");
          expect(item.source.effectiveFrom).toBe("2026-01-01");
        }
      });
    }
  }
});
