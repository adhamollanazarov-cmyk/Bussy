import { describe, it, expect } from "vitest";
import { extractNumbers, detectIntent, processWithSmartDemoEngine } from "./demo-engine";

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
      "50 mln so‘m kreditni 24 oyga 24% bilan olsam"
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
    const { amounts } = extractNumbers("Oylik tushum 45 mln, xarajat 28 mln so‘m");
    expect(amounts).toEqual([45_000_000, 28_000_000]);
  });

  it("raqam bo'lmasa bo'sh ro'yxat qaytaradi", () => {
    expect(extractNumbers("salom, biznes haqida gaplashamizmi?").amounts).toEqual([]);
  });
});

/* ============================================================
   NIYAT ANIQLASH
   ============================================================ */

describe("detectIntent", () => {
  it("qarz yuki savolini kredit hisobidan oldin tanidi", () => {
    // Bu regressiya testi: matnda ham "kredit", ham "ko'tar" bor.
    const intent = detectIntent(
      "oylik tushumim 40 mln, xarajatim 25 mln bo‘lsa, ushbu kreditni biznesim ko‘tara oladimi?"
    );
    expect(intent).toBe("DEBT_BURDEN");
  });

  it("oddiy kredit savolini kredit hisobiga yo'naltiradi", () => {
    expect(detectIntent("50 mln so‘m kreditni 24 oyga 24% bilan olsam oyiga qancha to‘layman?")).toBe(
      "LOAN_CALCULATION"
    );
  });

  it("soliq savolini taniydi", () => {
    expect(
      detectIntent("oylik 45 mln tushum bo‘lganda aylanmadan olinadigan 4% soliq qancha bo‘ladi?")
    ).toBe("TAX_CALCULATION");
  });

  it("bozor tahlilini demo ssenariy bilan aralashtirmaydi", () => {
    // Matnda "urganch" va "fast food" bor, lekin "reja" yo'q
    expect(detectIntent("urganchda fast food ochish uchun bozor tahlili va risklarni aytib ber")).toBe(
      "BUSINESS_IDEA_ANALYSIS"
    );
  });

  it("demo ssenariyni taniydi", () => {
    expect(
      detectIntent(
        "urganchda 100 mln so‘m bilan fast food biznes boshlamoqchiman. menga moliyaviy reja tuzib ber."
      )
    ).toBe("DEMO_SCENARIO");
  });

  it("biznes-reja so'rovini taniydi", () => {
    expect(detectIntent("menga 11 bo‘limli biznes-reja tayyorlab ber")).toBe("BUSINESS_PLAN");
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
    prompt: "50 mln so‘m kreditni 24 oyga 24% bilan olsam oyiga qancha to‘layman?",
    expected: "LOAN_CALCULATION",
  },
  {
    prompt: "Oylik tushum 45 mln, xarajat 28 mln so‘m bo‘lsa sof foydam va marjam qancha?",
    expected: "PROFIT_CALCULATION",
  },
  {
    prompt: "100 mln so‘m bilan mini novvoyxona ochmoqchiman. Menga 11 bo‘limli biznes-reja tayyorlab ber.",
    expected: "BUSINESS_PLAN",
  },
  {
    prompt: "Oylik 45 mln tushum bo‘lganda Aylanmadan olinadigan 4% soliq qancha bo‘ladi?",
    expected: "TAX_CALCULATION",
  },
  {
    prompt: "Urganchda Fast food ochish uchun bozor tahlili va asosiy risklarni aytib ber.",
    expected: "BUSINESS_IDEA_ANALYSIS",
  },
  {
    prompt: "Coffee shop ochish uchun 70 mln so‘m byudjet bilan qanday boshlash kerak?",
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
      "Coffee shop ochish uchun 70 mln so‘m byudjet bilan qanday boshlash kerak?"
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
    const res = processWithSmartDemoEngine("80 000 000 so‘m kreditni 12 oyga 18% bilan olsam?");
    expect(res.intent).toBe("LOAN_CALCULATION");
    const result = res.toolResult as { amount: number; months: number; annualRate: number };
    expect(result.amount).toBe(80_000_000);
    expect(result.months).toBe(12);
    expect(result.annualRate).toBe(18);
  });
});
