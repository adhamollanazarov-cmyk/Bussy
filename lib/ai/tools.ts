export const BUSSY_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "calculate_loan",
      description:
        "Kredit bo‘yicha oylik annuitet to‘lov, jami to‘lov va jami foizni hisoblash",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number", description: "Kredit summasi (so‘mda)" },
          annual_rate: {
            type: "number",
            description: "Yillik foiz stavkasi (masalan, 24)",
          },
          months: {
            type: "number",
            description: "Kredit muddati (oylarda, masalan 24)",
          },
        },
        required: ["amount", "annual_rate", "months"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "calculate_profit",
      description:
        "Oylik tushum, o‘zgarmas va o‘zgaruvchan xarajatlar asosida yalpi va sof foydani hisoblash",
      parameters: {
        type: "object",
        properties: {
          revenue: {
            type: "number",
            description: "Oylik kutilayotgan tushum (so‘mda)",
          },
          fixed_cost: {
            type: "number",
            description: "Oylik o‘zgarmas xarajatlar (ijara, maosh)",
          },
          variable_cost: {
            type: "number",
            description: "Oylik o‘zgaruvchan xarajatlar (xom-ashyo)",
          },
          tax: {
            type: "number",
            description: "Soliq stavkasi foizda (masalan, 4)",
          },
        },
        required: ["revenue", "fixed_cost", "variable_cost"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "calculate_break_even",
      description:
        "Zararsizlik (break-even) nuqtasini dona va so‘mda hisoblash. Kredit to‘lovini qoplash yoki zararsizlikka chiqish uchun kuniga va oyiga nechta mahsulot sotish kerakligini hisoblaydi.",
      parameters: {
        type: "object",
        properties: {
          fixed_cost: {
            type: "number",
            description:
              "Oylik o‘zgarmas xarajatlar (so‘mda). Kreditni qoplash tahlilida kredit oylik to‘lovi ham o‘zgarmas xarajatga qo‘shiladi.",
          },
          selling_price: {
            type: "number",
            description: "Bitta mahsulot/chek o‘rtacha sotish narxi (so‘mda)",
          },
          variable_cost: {
            type: "number",
            description: "Bitta mahsulotning o‘zgaruvchan tannarxi (so‘mda)",
          },
        },
        required: ["fixed_cost", "selling_price", "variable_cost"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "calculate_cashflow",
      description:
        "Oylik sof pul oqimi (cash-flow) va likvidlik holatini hisoblash",
      parameters: {
        type: "object",
        properties: {
          revenue: { type: "number", description: "Oylik umumiy tushum" },
          expenses: { type: "number", description: "Oylik jami xarajatlar" },
          loan_payment: { type: "number", description: "Oylik kredit to‘lovi" },
          tax: { type: "number", description: "Oylik soliq to‘lovi" },
        },
        required: ["revenue", "expenses"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "calculate_tax",
      description:
        "O‘zbekiston soliq rejimlari (aylanma, umumiy, YaTT) bo‘yicha oylik soliq yukini va soliqdan keyingi sof foydani hisoblash",
      parameters: {
        type: "object",
        properties: {
          regime: {
            type: "string",
            enum: ["turnover", "general", "individual"],
            description:
              "Soliq rejimi: turnover — aylanmadan olinadigan soliq, general — umumiy tizim (foyda solig‘i + QQS), individual — YaTT qat'iy soliq",
          },
          revenue: {
            type: "number",
            description: "Oylik jami tushum (so‘mda)",
          },
          expenses: {
            type: "number",
            description: "Oylik jami xarajatlar (so‘mda)",
          },
          rate: {
            type: "number",
            description:
              "Ixtiyoriy: soliq stavkasi foizda (aylanma soliq uchun, masalan 4)",
          },
          vatable_expenses: {
            type: "number",
            description:
              "Ixtiyoriy: kirim QQSiga ega xarajatlar summasi (xom-ashyo, tovar). Ish haqi bunga kirmaydi. Umumiy soliq tizimida QQSni aniqroq hisoblash uchun.",
          },
          is_vat_inclusive: {
            type: "boolean",
            description:
              "Ixtiyoriy: tushum va xarajatlar QQS ichida (yalpi) deb hisoblansinmi. Standart: true (12/112 hisobi). false bo'lsa, QQSsiz (net) deb hisoblanadi (12% ustama).",
          },
        },
        required: ["regime", "revenue", "expenses"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "generate_business_plan",
      description: "To‘liq 11 bo‘limli biznes-reja tuzilmasini yaratish",
      parameters: {
        type: "object",
        properties: {
          business_type: {
            type: "string",
            description: "Biznes turi (masalan, fast food, novvoyxona, kofe)",
          },
          location: {
            type: "string",
            description: "Shahar yoki hudud (masalan, Urganch, Toshkent)",
          },
          initial_capital: {
            type: "number",
            description: "Boshlang‘ich shaxsiy kapital",
          },
          monthly_expenses: {
            type: "number",
            description: "Taxminiy oylik xarajatlar",
          },
          expected_revenue: {
            type: "number",
            description: "Kutilayotgan oylik tushum",
          },
          employees: { type: "number", description: "Xodimlar soni" },
          target_customer: { type: "string", description: "Maqsadli mijozlar" },
        },
        required: [
          "business_type",
          "location",
          "initial_capital",
          "monthly_expenses",
          "expected_revenue",
        ],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "analyze_business_idea",
      description:
        "Biznes g‘oyasini boshlang‘ich kapital, xarajatlar, risklar va tekshirish gipotezalari bo‘yicha tahlil qilish",
      parameters: {
        type: "object",
        properties: {
          business_idea: {
            type: "string",
            description: "Biznes g‘oyasi tavsifi",
          },
          location: { type: "string", description: "Joylashuv" },
          budget: { type: "number", description: "Mavjud byudjet (so‘mda)" },
          target_customer: { type: "string", description: "Mijozlar toifasi" },
        },
        required: ["business_idea", "location", "budget"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "analyze_debt_burden",
      description:
        "Biznesning kredit to‘lovini ko‘tara olish qobiliyatini (Debt Burden) tahlil qilish",
      parameters: {
        type: "object",
        properties: {
          revenue: { type: "number", description: "Oylik tushum" },
          expenses: { type: "number", description: "Oylik xarajatlar" },
          loan_amount: { type: "number", description: "Kredit summasi" },
          annual_rate: { type: "number", description: "Yillik foiz" },
          months: { type: "number", description: "Muddat (oylarda)" },
        },
        required: [
          "revenue",
          "expenses",
          "loan_amount",
          "annual_rate",
          "months",
        ],
      },
    },
  },
];
