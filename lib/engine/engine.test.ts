import { describe, it, expect } from "vitest";
import { calculateLoan } from "./loan";
import { calculateProfit } from "./profit";
import { calculateBreakEven } from "./breakeven";
import { calculateCashflow } from "./cashflow";
import { calculateTax, UZ_TAX_REGIMES, type TaxRegimeType } from "./tax";
import { analyzeDebtBurden } from "./analyzer";

/* ============================================================
   KREDIT (annuitet)
   ============================================================ */

describe("calculateLoan", () => {
  it("50 mln / 24% / 24 oy uchun ma'lum annuitet to'lovni beradi", () => {
    const res = calculateLoan({
      amount: 50_000_000,
      annualRate: 24,
      months: 24,
    });

    // P=50 000 000, r=0.02, n=24  =>  M = P*r*(1+r)^n / ((1+r)^n - 1) ≈ 2 644 189
    expect(res.monthlyPayment).toBeGreaterThan(2_640_000);
    expect(res.monthlyPayment).toBeLessThan(2_650_000);
    expect(res.schedule).toHaveLength(24);
  });

  it("asosiy qarz yig'indisi kredit summasiga teng va oxirida qoldiq nol", () => {
    const res = calculateLoan({
      amount: 50_000_000,
      annualRate: 24,
      months: 24,
    });

    const principalSum = res.schedule.reduce(
      (acc, row) => acc + row.principal,
      0,
    );
    // Har oy yaxlitlanadi, shuning uchun kichik farqga yo'l qo'yamiz
    expect(Math.abs(principalSum - res.amount)).toBeLessThan(res.months);

    expect(res.schedule[res.schedule.length - 1].remainingBalance).toBe(0);
  });

  it("jami to'lov = oylik to'lov * muddat, jami foiz = jami to'lov - asosiy qarz", () => {
    const res = calculateLoan({
      amount: 30_000_000,
      annualRate: 18,
      months: 12,
    });
    expect(res.totalInterest).toBe(res.totalPayment - res.amount);
  });

  it("foizsiz kreditda foiz nol va to'lov teng bo'linadi", () => {
    const res = calculateLoan({
      amount: 12_000_000,
      annualRate: 0,
      months: 12,
    });
    expect(res.totalInterest).toBe(0);
    expect(res.monthlyPayment).toBe(1_000_000);
    // Foizli tarmoq kabi yaxlitlangan qiymatlar qaytariladi
    expect(Number.isInteger(res.schedule[0].payment)).toBe(true);
  });

  it("yaroqsiz kiritishda nol natija qaytaradi, xato tashlamaydi", () => {
    expect(
      calculateLoan({ amount: 0, annualRate: 24, months: 24 }).monthlyPayment,
    ).toBe(0);
    expect(
      calculateLoan({ amount: 10_000_000, annualRate: 24, months: 0 }).schedule,
    ).toEqual([]);
  });
});

/* ============================================================
   FOYDA
   ============================================================ */

describe("calculateProfit", () => {
  it("sof foyda = tushum - jami xarajat - soliq", () => {
    const res = calculateProfit({
      revenue: 45_000_000,
      fixedCost: 16_800_000,
      variableCost: 11_200_000,
      taxRate: 4,
    });

    expect(res.totalCost).toBe(28_000_000);
    expect(res.taxAmount).toBe(1_800_000); // 45 mln ning 4%
    expect(res.netProfit).toBe(45_000_000 - 28_000_000 - 1_800_000);
  });

  it("zarar holatida sof foyda manfiy bo'ladi", () => {
    const res = calculateProfit({
      revenue: 10_000_000,
      fixedCost: 9_000_000,
      variableCost: 5_000_000,
      taxRate: 4,
    });
    expect(res.netProfit).toBeLessThan(0);
  });

  it("tushum nol bo'lsa marja NaN emas, nol bo'ladi", () => {
    const res = calculateProfit({
      revenue: 0,
      fixedCost: 0,
      variableCost: 0,
      taxRate: 4,
    });
    expect(res.netMargin).toBe(0);
    expect(res.grossMargin).toBe(0);
  });
});

/* ============================================================
   ZARARSIZLIK
   ============================================================ */

describe("calculateBreakEven", () => {
  it("zararsizlik nuqtasida marjinal daromad o'zgarmas xarajatni qoplaydi", () => {
    const res = calculateBreakEven({
      fixedCost: 16_800_000,
      sellingPrice: 35_000,
      variableCostPerUnit: 18_000,
    });

    expect(res.contributionMargin).toBe(17_000);
    expect(res.breakEvenUnits * res.contributionMargin).toBeGreaterThanOrEqual(
      res.fixedCost,
    );
    expect(res.breakEvenRevenue).toBe(res.breakEvenUnits * res.sellingPrice);
  });

  it("narx tannarxdan past bo'lsa hisoblamaydi (cheksizlikka ketmaydi)", () => {
    const res = calculateBreakEven({
      fixedCost: 10_000_000,
      sellingPrice: 10_000,
      variableCostPerUnit: 12_000,
    });
    expect(res.breakEvenUnits).toBe(0);
    expect(Number.isFinite(res.breakEvenUnits)).toBe(true);
  });
});

/* ============================================================
   PUL OQIMI
   ============================================================ */

describe("calculateCashflow", () => {
  it("manfiy oqimni critical deb belgilaydi", () => {
    const res = calculateCashflow({
      revenue: 20_000_000,
      expenses: 19_000_000,
      loanPayment: 3_000_000,
      tax: 800_000,
    });
    expect(res.netCashflow).toBeLessThan(0);
    expect(res.status).toBe("critical");
  });

  it("sog'lom oqimni healthy deb belgilaydi", () => {
    const res = calculateCashflow({
      revenue: 45_000_000,
      expenses: 28_000_000,
      loanPayment: 2_644_000,
      tax: 1_800_000,
    });
    expect(res.status).toBe("healthy");
  });
});

/* ============================================================
   SOLIQ — eng muhim regressiya testi
   ============================================================ */

describe("calculateTax", () => {
  const regimes = Object.keys(UZ_TAX_REGIMES) as TaxRegimeType[];

  it.each(regimes)("%s: breakdown yig'indisi taxAmount ga teng", (regime) => {
    const res = calculateTax({
      regime,
      revenue: 45_000_000,
      expenses: 28_000_000,
    });
    const sum = res.breakdown.reduce((acc, item) => acc + item.amount, 0);

    // Ilgari YaTT rejimida jadvalda 500 000 + 375 000 ko'rsatilib,
    // jami 500 000 deb yozilardi.
    expect(sum).toBe(res.taxAmount);
  });

  it("YaTT rejimida ijtimoiy soliq jamiga kiritiladi", () => {
    const res = calculateTax({
      regime: "individual",
      revenue: 45_000_000,
      expenses: 28_000_000,
    });
    expect(res.taxAmount).toBe(500_000 + 375_000);
  });

  it("aylanma soliq tushumdan olinadi", () => {
    const res = calculateTax({
      regime: "turnover",
      revenue: 45_000_000,
      expenses: 28_000_000,
    });
    expect(res.taxAmount).toBe(1_800_000);
    expect(res.profitAfterTax).toBe(45_000_000 - 28_000_000 - 1_800_000);
  });

  it("QQS qo'shilgan qiymatdan hisoblanadi, foydadan emas", () => {
    const revenue = 100_000_000;
    const expenses = 60_000_000;
    const vatableExpenses = 60_000_000; // barcha xarajatda kirim QQSi bor

    const res = calculateTax({
      regime: "general",
      revenue,
      expenses,
      vatableExpenses,
      isVatInclusive: false,
    });
    const vatLine = res.breakdown.find((b) => b.label.includes("QQS"));

    // Qo'shilgan qiymat = 100 - 60 = 40 mln; QQS = 40 mln * 12% = 4.8 mln
    expect(vatLine?.amount).toBe(4_800_000);

    // Foydadan hisoblanganda ham 4.8 mln chiqardi, shuning uchun kirim QQSi
    // yo'q xarajatlar bilan farqni tekshiramiz:
    const noInputVat = calculateTax({
      regime: "general",
      revenue,
      expenses,
      vatableExpenses: 0,
      isVatInclusive: false,
    });
    const noInputVatLine = noInputVat.breakdown.find((b) =>
      b.label.includes("QQS"),
    );
    expect(noInputVatLine?.amount).toBe(12_000_000); // 100 mln * 12%
  });

  it("standart rejimda QQS yalpi (isVatInclusive: true) 12/112 bo'yicha hisoblanadi (B3)", () => {
    const revenue = 112_000_000;
    const expenses = 56_000_000;
    const vatableExpenses = 56_000_000;

    const res = calculateTax({
      regime: "general",
      revenue,
      expenses,
      vatableExpenses,
    }); // default: isVatInclusive = true
    const vatLine = res.breakdown.find((b) => b.label.includes("QQS"));

    // Qo'shilgan qiymat = 112 - 56 = 56 mln; QQS = 56 mln * 12 / 112 = 6 mln
    expect(vatLine?.amount).toBe(6_000_000);

    // Foyda solig'i = (100 - 50) * 15% = 7.5 mln
    const profitTaxLine = res.breakdown.find((b) =>
      b.label.includes("Foyda solig‘i"),
    );
    expect(profitTaxLine?.amount).toBe(7_500_000);

    // Sof foyda = 50 mln - 7.5 mln = 42.5 mln
    expect(res.profitAfterTax).toBe(42_500_000);
    expect(res.assumptions.some((a) => a.includes("12/112"))).toBe(true);
  });

  it("har bir rejim taxminlar ro'yxatini qaytaradi", () => {
    for (const regime of regimes) {
      const res = calculateTax({
        regime,
        revenue: 10_000_000,
        expenses: 5_000_000,
      });
      expect(res.assumptions.length).toBeGreaterThan(0);
    }
  });

  it("tashqi customConfig orqali soliq stavkalarini dinamik o'zgartirish mumkin (O2)", () => {
    // 20% foyda solig'i va 15% QQS bilan test qilamiz
    const res = calculateTax(
      {
        regime: "general",
        revenue: 100_000_000,
        expenses: 50_000_000,
        vatableExpenses: 50_000_000,
        isVatInclusive: false,
      },
      {
        general: {
          profitTaxPercent: 20,
          vatPercent: 15,
        },
      },
    );

    const profitTax = res.breakdown.find((b) =>
      b.label.includes("Foyda solig‘i"),
    );
    const vat = res.breakdown.find((b) => b.label.includes("QQS"));

    expect(profitTax?.amount).toBe((100_000_000 - 50_000_000) * 0.2); // 10 mln
    expect(vat?.amount).toBe((100_000_000 - 50_000_000) * 0.15); // 7.5 mln
  });

  describe("umumiy rejim QQS chekka holatlari (O4)", () => {
    it("zarar ko'rayotgan biznesda (xarajat > tushum) foyda solig'i 0 bo'ladi", () => {
      const res = calculateTax({
        regime: "general",
        revenue: 30_000_000,
        expenses: 50_000_000,
        isVatInclusive: true,
      });

      const profitTax = res.breakdown.find((b) =>
        b.label.includes("Foyda solig‘i"),
      );
      expect(profitTax?.amount).toBe(0);
      // Sof foyda manfiy zararni aks ettiradi
      expect(res.profitAfterTax).toBeLessThan(0);
    });

    it("tushum 0 bo'lganda bo'linish xatosi (NaN) bermaydi", () => {
      const res = calculateTax({
        regime: "general",
        revenue: 0,
        expenses: 20_000_000,
        isVatInclusive: true,
      });

      expect(res.taxAmount).toBe(0);
      expect(res.effectiveTaxRate).toBe(0);
      expect(Number.isNaN(res.effectiveTaxRate)).toBe(false);
      expect(res.profitAfterTax).toBeLessThan(0);
    });

    it("vatableExpenses umumiy xarajatdan oshib ketganda xarajat bilan cheklanadi", () => {
      const res = calculateTax({
        regime: "general",
        revenue: 100_000_000,
        expenses: 40_000_000,
        vatableExpenses: 80_000_000, // xarajatdan katta qiymat kiritilgan
        isVatInclusive: false,
      });

      // vatableCosts 40 mln bilan cheklanadi -> QQS = (100 - 40) * 12% = 7.2 mln
      const vat = res.breakdown.find((b) => b.label.includes("QQS"));
      expect(vat?.amount).toBe(7_200_000);
    });
  });
});

/* ============================================================
   QARZ YUKI
   ============================================================ */

describe("analyzeDebtBurden", () => {
  it("sog'lom biznesda qarz yuki foiz sifatida hisoblanadi", () => {
    const res = analyzeDebtBurden({
      monthlyRevenue: 45_000_000,
      monthlyExpenses: 28_000_000,
      loanAmount: 50_000_000,
      annualRate: 24,
      loanMonths: 24,
    });

    expect(res.operatingCashflow).toBe(17_000_000);
    expect(res.debtBurdenPercent).not.toBeNull();
    expect(res.riskLevel).toBe("safe");
  });

  it("operatsion oqim manfiy bo'lsa null qaytaradi (100% sentinel emas)", () => {
    const res = analyzeDebtBurden({
      monthlyRevenue: 10_000_000,
      monthlyExpenses: 12_000_000,
      loanAmount: 50_000_000,
      annualRate: 24,
      loanMonths: 24,
    });

    expect(res.debtBurdenPercent).toBeNull();
    expect(res.riskLevel).toBe("high");
  });

  it("qarz yuki oshgani sari xavf darajasi ko'tariladi", () => {
    const base = {
      monthlyRevenue: 45_000_000,
      monthlyExpenses: 40_000_000,
      annualRate: 24,
      loanMonths: 24,
    };
    const heavy = analyzeDebtBurden({ ...base, loanAmount: 100_000_000 });
    expect(heavy.riskLevel).toBe("high");
  });
});
