import { describe, it, expect } from "vitest";
import { calculateLoan } from "./loan";
import { calculateProfit } from "./profit";
import { calculateBreakEven } from "./breakeven";
import { calculateCashflow } from "./cashflow";
import { calculateTax, UZ_TAX_REGIMES, type TaxRegimeType } from "./tax";
import { analyzeDebtBurden } from "./analyzer";
import { classifyBreakEven } from "@/lib/utils";

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
   ZARARSIZLIKNI KO'RSATISH UCHUN TASNIFLASH (T3)
   ------------------------------------------------------------
   Dvigatel ikkita butunlay boshqa holatda ham `breakEvenUnits: 0`
   qaytaradi va sahifalar ikkalasini "0 ta" deb chizardi.
   ============================================================ */

describe("classifyBreakEven", () => {
  it("narx tannarxdan past bo'lsa — erishib bo'lmaydi", () => {
    const res = calculateBreakEven({
      fixedCost: 10_000_000,
      sellingPrice: 10_000,
      variableCostPerUnit: 12_000,
    });
    expect(classifyBreakEven(res)).toBe("unreachable");
  });

  it("narx tannarxga TENG bo'lsa ham — erishib bo'lmaydi", () => {
    const res = calculateBreakEven({
      fixedCost: 10_000_000,
      sellingPrice: 12_000,
      variableCostPerUnit: 12_000,
    });
    expect(classifyBreakEven(res)).toBe("unreachable");
  });

  it("o'zgarmas xarajat nol bo'lsa — bu BOSHQA holat", () => {
    const res = calculateBreakEven({
      fixedCost: 0,
      sellingPrice: 35_000,
      variableCostPerUnit: 18_000,
    });
    expect(classifyBreakEven(res)).toBe("noFixedCost");
  });

  it("ikkalasi ham muammoli bo'lsa, narx muammosi ustun", () => {
    const res = calculateBreakEven({
      fixedCost: 0,
      sellingPrice: 10_000,
      variableCostPerUnit: 12_000,
    });
    expect(classifyBreakEven(res)).toBe("unreachable");
  });

  it("normal holatda raqam ko'rsatiladi", () => {
    const res = calculateBreakEven({
      fixedCost: 16_800_000,
      sellingPrice: 35_000,
      variableCostPerUnit: 18_000,
    });
    expect(classifyBreakEven(res)).toBe("ok");
    expect(res.breakEvenUnits).toBeGreaterThan(0);
  });

  it("contributionMargin bo'yicha ajratib BO'LMAYDI — shuning uchun kirishlar bo'yicha ajratamiz", () => {
    // Bu dvigatelning hozirgi xatti-harakatini qulflaydi: erta qaytishda
    // `contributionMargin` HAR IKKALA holatda ham 0 ga tenglashtiriladi,
    // shuning uchun u tasniflash uchun yaroqsiz.
    const priceTooLow = calculateBreakEven({
      fixedCost: 10_000_000,
      sellingPrice: 10_000,
      variableCostPerUnit: 12_000,
    });
    const noFixedCost = calculateBreakEven({
      fixedCost: 0,
      sellingPrice: 35_000,
      variableCostPerUnit: 18_000,
    });

    expect(priceTooLow.contributionMargin).toBe(0);
    expect(noFixedCost.contributionMargin).toBe(0);
    expect(priceTooLow.breakEvenUnits).toBe(0);
    expect(noFixedCost.breakEvenUnits).toBe(0);

    // Bir xil ko'rinsa ham, tasnif har xil
    expect(classifyBreakEven(priceTooLow)).not.toBe(classifyBreakEven(noFixedCost));
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

  /* ---------- Nol tushum (T4) ---------- */

  it("revenue = 0 va expenses = 0 bo'lsa healthy BO'LMAYDI", () => {
    const res = calculateCashflow({ revenue: 0, expenses: 0 });

    // Ilgari: netCashflow = 0 → ikkala shart ham o'tmas → "healthy"
    expect(res.netCashflow).toBe(0);
    expect(res.status).not.toBe("healthy");
    expect(res.status).toBe("warning");
  });

  it("nol tushum uchun matn aynan shu holatni tushuntiradi", () => {
    const uz = calculateCashflow({ revenue: 0, expenses: 0 });
    const en = calculateCashflow({ revenue: 0, expenses: 0, locale: "en" });

    // "Past erkin pul oqimi" emas — tushum yo'qligi haqidagi matn
    expect(uz.statusText).toContain("Tushum nol");
    expect(en.statusText).toContain("Revenue is zero");

    // Ikkala lokal ham o'z tilida javob beradi
    expect(uz.statusText).not.toBe(en.statusText);
  });

  it("tushum nol, xarajat bor bo'lsa — critical", () => {
    const res = calculateCashflow({ revenue: 0, expenses: 5_000_000 });
    expect(res.netCashflow).toBeLessThan(0);
    expect(res.status).toBe("critical");
    // Bu yerda manfiy oqim matni aniqroq, "tushum nol" matni emas
    expect(res.statusText).not.toContain("Tushum nol");
  });

  it("tushum bor, lekin oqim nol bo'lsa — warning (nol tushum matni emas)", () => {
    const res = calculateCashflow({ revenue: 10_000_000, expenses: 10_000_000 });
    expect(res.status).toBe("warning");
    expect(res.statusText).not.toContain("Tushum nol");
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

  /* ---------- Imtiyozli aylanma stavkasi (T7) ---------- */

  describe("aylanma soliq — imtiyozli stavka", () => {
    const revenue = 100_000_000;
    const expenses = 60_000_000;

    it("standart stavka (customRate berilmagan) — 4%", () => {
      const res = calculateTax({ regime: "turnover", revenue, expenses });
      expect(res.taxAmount).toBe(4_000_000);
      expect(res.effectiveTaxRate).toBe(4);
    });

    it("imtiyozli 1% stavkasi customRate orqali qo'llanadi", () => {
      const res = calculateTax({
        regime: "turnover",
        revenue,
        expenses,
        customRate: 1,
      });

      expect(res.taxAmount).toBe(1_000_000);
      expect(res.taxBase).toBe(revenue);
      expect(res.effectiveTaxRate).toBe(1);
      // Xarajatlar aylanma solig'ida hisobga olinmaydi, lekin sof foydadan ayriladi
      expect(res.profitAfterTax).toBe(revenue - expenses - 1_000_000);
    });

    it("1% stavkasi jadval satrida ham ko'rinadi (ikkala tilda)", () => {
      const uz = calculateTax({
        regime: "turnover",
        revenue,
        expenses,
        customRate: 1,
      });
      const en = calculateTax({
        regime: "turnover",
        revenue,
        expenses,
        customRate: 1,
        locale: "en",
      });

      expect(uz.breakdown[0].label).toContain("1%");
      expect(en.breakdown[0].label).toContain("1%");
      expect(uz.breakdown[0].amount).toBe(1_000_000);
      expect(en.breakdown[0].amount).toBe(1_000_000);
    });

    it("1% 4% dan aynan 4 barobar kam soliq beradi", () => {
      const standard = calculateTax({ regime: "turnover", revenue, expenses });
      const preferential = calculateTax({
        regime: "turnover",
        revenue,
        expenses,
        customRate: 1,
      });
      expect(standard.taxAmount).toBe(preferential.taxAmount * 4);
    });

    it("2% imtiyozli stavkasi ham ishlaydi", () => {
      const res = calculateTax({
        regime: "turnover",
        revenue,
        expenses,
        customRate: 2,
      });
      expect(res.taxAmount).toBe(2_000_000);
    });

    it("breakdown yig'indisi imtiyozli stavkada ham taxAmount ga teng", () => {
      const res = calculateTax({
        regime: "turnover",
        revenue,
        expenses,
        customRate: 1,
      });
      const sum = res.breakdown.reduce((acc, i) => acc + i.amount, 0);
      expect(sum).toBe(res.taxAmount);
    });
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
