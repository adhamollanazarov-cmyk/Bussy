import { describe, it, expect } from "vitest";
import {
  extractNumbers,
  detectIntent,
  processWithSmartDemoEngine,
  resolveDebtBurdenAmounts,
} from "./demo-engine";

/* ============================================================
   RAQAM AJRATISH
   ============================================================ */

describe("extractNumbers", () => {
  it("mln qo'shimchasi bilan yozilgan summalarni o'qiydi", () => {
    const { amounts } = extractNumbers("50 mln so‘m kredit");
    expect(amounts).toEqual([50_000_000]);
  });

  it("bo'shliq bilan guruhlangan raqamlarni o'qiydi", () => {
    // Ilgari bu umuman o'qilmas va jimgina standart qiymat qo'yilardi
    const { amounts } = extractNumbers("50 000 000 so‘m kredit");
    expect(amounts).toEqual([50_000_000]);
  });

  it("qo'shimchasiz katta raqamni ham summa deb qabul qiladi", () => {
    const { amounts } = extractNumbers("45000000 tushum");
    expect(amounts).toEqual([45_000_000]);
  });

  it("kasrli mln qiymatini o'qiydi", () => {
    const { amounts } = extractNumbers("1,5 mln so‘m");
    expect(amounts).toEqual([1_500_000]);
  });

  it("mlrd va ming qo'shimchalarini qo'llaydi", () => {
    expect(extractNumbers("2 mlrd so‘m").amounts).toEqual([2_000_000_000]);
    expect(extractNumbers("500 ming so‘m").amounts).toEqual([500_000]);
  });

  it("foiz va muddatni summadan ajratadi", () => {
    const { amounts, rate, months } = extractNumbers(
      "50 mln so‘m kreditni 24 oyga 24% bilan olsam",
    );
    expect(amounts).toEqual([50_000_000]);
    expect(rate).toBe(24);
    expect(months).toBe(24);
    // "24" summalar ro'yxatiga tushmasligi kerak
    expect(amounts).not.toContain(24);
  });

  it("yilni oyga aylantiradi", () => {
    expect(extractNumbers("3 yilga kredit").months).toBe(36);
  });

  it("bir nechta summani tartibda qaytaradi", () => {
    const { amounts } = extractNumbers(
      "Oylik tushum 45 mln, xarajat 28 mln so‘m",
    );
    expect(amounts).toEqual([45_000_000, 28_000_000]);
  });

  it("raqam bo'lmasa bo'sh ro'yxat qaytaradi", () => {
    expect(
      extractNumbers("salom, biznes haqida gaplashamizmi?").amounts,
    ).toEqual([]);
  });
});

/* ============================================================
   NIYAT ANIQLASH
   ============================================================ */

describe("detectIntent", () => {
  it("qarz yuki savolini kredit hisobidan oldin tanidi", () => {
    // Bu regressiya testi: matnda ham "kredit", ham "ko'tar" bor.
    const intent = detectIntent(
      "oylik tushumim 40 mln, xarajatim 25 mln bo‘lsa, ushbu kreditni biznesim ko‘tara oladimi?",
    );
    expect(intent).toBe("DEBT_BURDEN");
  });

  it("oddiy kredit savolini kredit hisobiga yo'naltiradi", () => {
    expect(
      detectIntent(
        "50 mln so‘m kreditni 24 oyga 24% bilan olsam oyiga qancha to‘layman?",
      ),
    ).toBe("LOAN_CALCULATION");
  });

  it("soliq savolini taniydi", () => {
    expect(
      detectIntent(
        "oylik 45 mln tushum bo‘lganda aylanmadan olinadigan 4% soliq qancha bo‘ladi?",
      ),
    ).toBe("TAX_CALCULATION");
  });

  it("«savat» so'zi soliq intentini noto'g'ri qo'zg'atmaydi (vat so'z chegarasi)", () => {
    expect(
      detectIntent("bizning xarid savatida fast food mahsulotlari bor"),
    ).not.toBe("TAX_CALCULATION");
    expect(detectIntent("calculate 12% vat for 50000000")).toBe(
      "TAX_CALCULATION",
    );
  });

  it("bozor tahlilini demo ssenariy bilan aralashtirmaydi", () => {
    // Matnda "urganch" va "fast food" bor, lekin "reja" yo'q
    expect(
      detectIntent(
        "urganchda fast food ochish uchun bozor tahlili va risklarni aytib ber",
      ),
    ).toBe("BUSINESS_IDEA_ANALYSIS");
  });

  it("demo ssenariyni taniydi", () => {
    expect(
      detectIntent(
        "urganchda 100 mln so‘m bilan fast food biznes boshlamoqchiman. menga moliyaviy reja tuzib ber.",
      ),
    ).toBe("DEMO_SCENARIO");
  });

  it("biznes-reja so'rovini taniydi", () => {
    expect(detectIntent("menga 11 bo‘limli biznes-reja tayyorlab ber")).toBe(
      "BUSINESS_PLAN",
    );
  });

  it("kreditni qoplash bo'yicha zanjirli savolni taniydi (CHAINED_LOAN_BREAK_EVEN)", () => {
    expect(
      detectIntent("Kreditni qoplash uchun kuniga nechta sotishim kerak?"),
    ).toBe("CHAINED_LOAN_BREAK_EVEN");
    expect(detectIntent("Kreditni qoplash uchun nechta sotay?")).toBe(
      "CHAINED_LOAN_BREAK_EVEN",
    );
    expect(
      detectIntent(
        "How many units do I need to sell per day to cover the loan?",
      ),
    ).toBe("CHAINED_LOAN_BREAK_EVEN");
  });
});

/* ============================================================
   2-BOSQICHLI ZANJIR (AGENT CHAINING)
   ============================================================ */

describe("2-bosqichli agent zanjiri (kredit -> zararsizlik)", () => {
  it("ikkita vositani ketma-ket hisoblaydi va ikkita qadam qaytaradi", () => {
    const res = processWithSmartDemoEngine(
      "Kreditni qoplash uchun kuniga nechta sotishim kerak?",
    );
    expect(res.intent).toBe("CHAINED_LOAN_BREAK_EVEN");
    expect(res.steps).toHaveLength(2);
    expect(res.steps?.[0].tool).toBe("calculate_loan");
    expect(res.steps?.[1].tool).toBe("calculate_break_even");
    expect(res.content).toContain("2 bosqichli");
    expect(res.content.replace(/\u00a0/g, " ")).toContain("2 643 555");
  });

  it("ingliz tilida ham to'liq 2-qadamli zanjirni qaytaradi", () => {
    const res = processWithSmartDemoEngine(
      "How many units do I need to sell per day to cover the loan?",
      "en",
    );
    expect(res.intent).toBe("CHAINED_LOAN_BREAK_EVEN");
    expect(res.steps).toHaveLength(2);
    expect(res.content).toContain("2-step chained calculation");
  });

  it("foydalanuvchi matnidagi biznes turini taniydi va uning birlik iqtisodiyotini qo'llaydi (B2)", () => {
    const res = processWithSmartDemoEngine(
      "Kofexona uchun 50 mln kreditni qoplashga kuniga nechta sotishim kerak?",
    );
    expect(res.intent).toBe("CHAINED_LOAN_BREAK_EVEN");
    expect(res.content).toContain("Coffee Shop");
    expect(res.content).toContain("chashka");
    expect(res.content).not.toContain("Fast Food");
  });

  it("so'rovda ko'rsatilmagan bazaviy xarajat va parametrlarni javobda ochiq oshkor qiladi (B2)", () => {
    const res = processWithSmartDemoEngine(
      "Kreditni qoplash uchun kuniga nechta sotishim kerak?",
    );
    expect(res.content).toContain(
      "So‘rovingizda ko‘rsatilmagani uchun quyidagilar taxminan olindi",
    );
    expect(res.content.replace(/\u00a0/g, " ")).toContain("15 400 000");
  });

  it("foydalanuvchi kiritgan o'zgarmas xarajatni inobatga oladi (B2)", () => {
    const res = processWithSmartDemoEngine(
      "50 mln kredit va 20 mln o‘zgarmas xarajat bilan kreditni qoplash uchun kuniga nechta sotishim kerak?",
    );
    const breakEvenResult = res.toolResult as {
      breakEven: { fixedCost: number };
    };
    // 20 000 000 + 2 643 555 (oylik to'lov) = 22 643 555
    expect(breakEvenResult.breakEven.fixedCost).toBe(22_643_555);
    expect(res.content).not.toContain("15 400 000 so‘m (demo bazaviy)");
  });
});

/* ============================================================
   ILOVADAGI TAYYOR SAVOLLAR (regressiya)
   ------------------------------------------------------------
   Bu ro'yxat app/app/chat/page.tsx dagi INITIAL_QUICK_PROMPTS bilan
   mos bo'lishi kerak — demoda ko'rsatiladigan savollar.
   ============================================================ */

const SHIPPED_PROMPTS: { prompt: string; expected: string }[] = [
  {
    prompt:
      "Urganchda 100 mln so‘m bilan fast food biznes boshlamoqchiman. Yana 50 mln so‘m kredit olishim mumkin. Menga moliyaviy reja tuzib ber.",
    expected: "DEMO_SCENARIO",
  },
  {
    prompt: "Kreditni qoplash uchun kuniga nechta sotishim kerak?",
    expected: "CHAINED_LOAN_BREAK_EVEN",
  },
  {
    prompt:
      "50 mln so‘m kreditni 24 oyga 24% bilan olsam oyiga qancha to‘layman?",
    expected: "LOAN_CALCULATION",
  },
  {
    prompt:
      "Oylik tushum 45 mln, xarajat 28 mln so‘m bo‘lsa sof foydam va marjam qancha?",
    expected: "PROFIT_CALCULATION",
  },
  {
    prompt:
      "100 mln so‘m bilan mini novvoyxona ochmoqchiman. Menga 11 bo‘limli biznes-reja tayyorlab ber.",
    expected: "BUSINESS_PLAN",
  },
  {
    prompt:
      "Oylik 45 mln tushum bo‘lganda Aylanmadan olinadigan 4% soliq qancha bo‘ladi?",
    expected: "TAX_CALCULATION",
  },
  {
    prompt:
      "Urganchda Fast food ochish uchun bozor tahlili va asosiy risklarni aytib ber.",
    expected: "BUSINESS_IDEA_ANALYSIS",
  },
  {
    prompt:
      "Coffee shop ochish uchun 70 mln so‘m byudjet bilan qanday boshlash kerak?",
    expected: "BUSINESS_IDEA_ANALYSIS",
  },
];

describe("ilovadagi tayyor savollar", () => {
  it.each(SHIPPED_PROMPTS)("«$prompt» → $expected", ({ prompt, expected }) => {
    expect(processWithSmartDemoEngine(prompt).intent).toBe(expected);
  });

  it("hech biri umumiy javobga tushib qolmaydi", () => {
    for (const { prompt } of SHIPPED_PROMPTS) {
      const res = processWithSmartDemoEngine(prompt);
      expect(res.intent).not.toBe("GENERAL");
      expect(res.intent).not.toBe("CLARIFICATION");
    }
  });

  it("coffee shop so'rovi Fast Food deb javob bermaydi", () => {
    const res = processWithSmartDemoEngine(
      "Coffee shop ochish uchun 70 mln so‘m byudjet bilan qanday boshlash kerak?",
    );
    expect(res.content).toContain("Coffee Shop");
    expect(res.content).not.toContain("Fast Food");
  });
});

/* ============================================================
   RAQAMSIZ SO'ROVLAR — taxmin qilmaslik
   ============================================================ */

describe("raqam topilmaganda", () => {
  it("kredit so'raladi, standart qiymat jimgina qo'yilmaydi", () => {
    const res = processWithSmartDemoEngine("menga kredit hisoblab ber");
    expect(res.intent).toBe("CLARIFICATION");
    expect(res.content).toContain("kredit summasi");
  });

  it("foyda uchun tushum va xarajat so'raladi", () => {
    const res = processWithSmartDemoEngine("foydamni hisoblab ber");
    expect(res.intent).toBe("CLARIFICATION");
  });

  it("foydalanuvchi raqam bersa, aynan shu raqam ishlatiladi", () => {
    const res = processWithSmartDemoEngine(
      "80 000 000 so‘m kreditni 12 oyga 18% bilan olsam?",
    );
    expect(res.intent).toBe("LOAN_CALCULATION");
    const result = res.toolResult as {
      amount: number;
      months: number;
      annualRate: number;
    };
    expect(result.amount).toBe(80_000_000);
    expect(result.months).toBe(12);
    expect(result.annualRate).toBe(18);
  });
});

/* ============================================================
   QARZ YUKIDA RAQAMLAR TARTIBI (B5)
   ============================================================ */

describe("resolveDebtBurdenAmounts & qarz yuki kalit so'zlar bog'lanishi", () => {
  it("kredit birinchi yozilganda ham tushum, xarajat va kreditni to'g'ri bog'laydi", () => {
    const resolved = resolveDebtBurdenAmounts(
      "50 mln kredit olsam, tushumim 40 mln, xarajatim 25 mln",
      [50_000_000, 40_000_000, 25_000_000],
    );
    expect(resolved).toEqual({
      rev: 40_000_000,
      exp: 25_000_000,
      loanAmt: 50_000_000,
    });
  });

  it("standart tartibda (tushum, xarajat, kredit) to'g'ri ishlaydi", () => {
    const resolved = resolveDebtBurdenAmounts(
      "Oylik tushumim 40 mln, xarajatim 25 mln. 50 mln so‘m kredit",
      [40_000_000, 25_000_000, 50_000_000],
    );
    expect(resolved).toEqual({
      rev: 40_000_000,
      exp: 25_000_000,
      loanAmt: 50_000_000,
    });
  });

  it("ingliz tilida kredit birinchi yozilganda to'g'ri ishlaydi", () => {
    const resolved = resolveDebtBurdenAmounts(
      "Can I afford a 50M loan if my revenue is 40M and expenses are 25M?",
      [50_000_000, 40_000_000, 25_000_000],
    );
    expect(resolved).toEqual({
      rev: 40_000_000,
      exp: 25_000_000,
      loanAmt: 50_000_000,
    });
  });

  it("ikkita summa berilganda yetishmayotgan ko'rsatkichni to'g'ri topadi", () => {
    const res1 = resolveDebtBurdenAmounts(
      "50 mln kredit olsam, tushumim 40 mln",
      [50_000_000, 40_000_000],
    );
    expect(res1.loanAmt).toBe(50_000_000);
    expect(res1.rev).toBe(40_000_000);
    expect(res1.missing).toBe("expenses");

    const res2 = resolveDebtBurdenAmounts(
      "50 mln kredit olsam, xarajatim 25 mln",
      [50_000_000, 25_000_000],
    );
    expect(res2.loanAmt).toBe(50_000_000);
    expect(res2.exp).toBe(25_000_000);
    expect(res2.missing).toBe("revenue");

    const res3 = resolveDebtBurdenAmounts(
      "oylik tushum 40 mln, xarajat 25 mln",
      [40_000_000, 25_000_000],
    );
    expect(res3.rev).toBe(40_000_000);
    expect(res3.exp).toBe(25_000_000);
    expect(res3.missing).toBe("loan");
  });

  it("processWithSmartDemoEngine kredit birinchi kelganda to'g'ri qarz yukini hisoblaydi", () => {
    const res = processWithSmartDemoEngine(
      "50 mln kredit olsam, oylik tushumim 40 mln, xarajatim 25 mln. 24 oyga 24% bilan ko‘tara olamanmi?",
    );
    expect(res.intent).toBe("DEBT_BURDEN");
    expect(res.toolCalled).toBe("analyze_debt_burden");
    const result = res.toolResult as {
      operatingCashflow: number;
      monthlyLoanPayment: number;
      debtBurdenPercent: number;
    };
    // Operatsion pul oqimi = 40 mln tushum - 25 mln xarajat = 15 mln
    // Agar 50 mln tushum deb olinganda edi, 50 - 40 = 10 mln bo'lardi
    expect(result.operatingCashflow).toBe(15_000_000);
    expect(res.content).toMatch(/40[\s\u00A0]000[\s\u00A0]000/);
    expect(res.content).toMatch(/25[\s\u00A0]000[\s\u00A0]000/);
    expect(res.content).toMatch(/50[\s\u00A0]000[\s\u00A0]000/);
  });

  it("faqat kredit va tushum berilganda aynan oylik xarajatni so'raydi", () => {
    const res = processWithSmartDemoEngine(
      "50 mln kredit olsam, tushumim 40 mln. qarz yukini hisoblab ber",
    );
    expect(res.intent).toBe("CLARIFICATION");
    expect(res.content).toContain("oylik xarajat");
  });
});
