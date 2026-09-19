import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/chat/route";
import { MAX_AGENT_STEPS } from "@/lib/ai/chat-config";

/* ============================================================
   AGENT TSIKLI
   ------------------------------------------------------------
   OpenAI mock qilinadi: model nima qaytarishini biz boshqaramiz,
   shunda ko'p bosqichli zanjir haqiqatan ishlashini tekshira olamiz.
   ============================================================ */

function toolCallResponse(calls: { name: string; args: Record<string, unknown> }[]) {
  return {
    ok: true,
    json: async () => ({
      choices: [
        {
          message: {
            role: "assistant",
            content: null,
            tool_calls: calls.map((c, i) => ({
              id: `call_${i}`,
              type: "function",
              function: { name: c.name, arguments: JSON.stringify(c.args) },
            })),
          },
        },
      ],
    }),
  };
}

function textResponse(content: string) {
  return {
    ok: true,
    json: async () => ({ choices: [{ message: { role: "assistant", content } }] }),
  };
}

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": `test-${Math.random()}` },
    body: JSON.stringify(body),
  });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  process.env.OPENAI_API_KEY = "test-key";
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  delete process.env.OPENAI_API_KEY;
  vi.unstubAllGlobals();
});

describe("agent tsikli", () => {
  it("ketma-ket ikki vositani chaqira oladi (zanjir)", async () => {
    // 1-qadam: kredit hisobi. 2-qadam: uning natijasidan keyin zararsizlik.
    // Ilgari bu mumkin emasdi — faqat bitta raund bo'lardi.
    fetchMock
      .mockResolvedValueOnce(
        toolCallResponse([
          { name: "calculate_loan", args: { amount: 50_000_000, annual_rate: 24, months: 24 } },
        ])
      )
      .mockResolvedValueOnce(
        toolCallResponse([
          {
            name: "calculate_break_even",
            args: { fixed_cost: 19_443_555, selling_price: 35_000, variable_cost: 18_000 },
          },
        ])
      )
      .mockResolvedValueOnce(textResponse("Kuniga 39 ta sotishingiz kerak."));

    const res = await POST(makeRequest({ userMessage: "Kreditni qoplash uchun nechta sotay?" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.source).toBe("ai");
    expect(body.steps).toHaveLength(2);
    expect(body.steps[0].tool).toBe("calculate_loan");
    expect(body.steps[1].tool).toBe("calculate_break_even");
    // Matematika kodda bajarilgan, model o'ylab topmagan
    expect(body.steps[0].result.monthlyPayment).toBeGreaterThan(2_600_000);
    expect(body.content).toContain("39");
  });

  it("bitta vosita yetarli bo'lsa bitta qadam qiladi", async () => {
    fetchMock
      .mockResolvedValueOnce(
        toolCallResponse([
          { name: "calculate_loan", args: { amount: 50_000_000, annual_rate: 24, months: 24 } },
        ])
      )
      .mockResolvedValueOnce(textResponse("Oylik to‘lov 2 643 555 so‘m."));

    const body = await (await POST(makeRequest({ userMessage: "50 mln kredit" }))).json();
    expect(body.steps).toHaveLength(1);
    expect(body.toolCalled).toBe("calculate_loan");
  });

  it("bitta javobda bir nechta vosita chaqirilsa, hammasi bajariladi", async () => {
    fetchMock
      .mockResolvedValueOnce(
        toolCallResponse([
          { name: "calculate_loan", args: { amount: 50_000_000, annual_rate: 24, months: 24 } },
          { name: "calculate_profit", args: { revenue: 45e6, fixed_cost: 16e6, variable_cost: 12e6 } },
        ])
      )
      .mockResolvedValueOnce(textResponse("Tayyor."));

    const body = await (await POST(makeRequest({ userMessage: "hisobla" }))).json();
    expect(body.steps.map((s: { tool: string }) => s.tool)).toEqual([
      "calculate_loan",
      "calculate_profit",
    ]);
  });

  it("noma'lum vosita tsiklni buzmaydi", async () => {
    fetchMock
      .mockResolvedValueOnce(toolCallResponse([{ name: "calculate_nonsense", args: {} }]))
      .mockResolvedValueOnce(textResponse("Kechirasiz, bu hisobni bajara olmadim."));

    const res = await POST(makeRequest({ userMessage: "test" }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.steps).toHaveLength(0);
    expect(body.content).toBeTruthy();
  });

  it("cheksiz tsikldan himoyalangan — qadamlar soni cheklangan", async () => {
    // Model har safar yana vosita chaqiradi
    fetchMock.mockResolvedValue(
      toolCallResponse([
        { name: "calculate_loan", args: { amount: 1_000_000, annual_rate: 10, months: 12 } },
      ])
    );

    const body = await (await POST(makeRequest({ userMessage: "loop" }))).json();

    // Tsikl to'xtaydi va lokal dvigatelga tushadi (model xulosa bermadi)
    expect(body.source).toBe("fallback");
    // OpenAI ga MAX_AGENT_STEPS martadan ko'p murojaat qilinmagan
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(MAX_AGENT_STEPS);
  });

  it("OpenAI ishlamasa lokal dvigatelga tushadi", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    const res = await POST(makeRequest({ userMessage: "50 mln so‘m kredit 24 oyga 24%" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.source).toBe("fallback");
    expect(body.intent).toBe("LOAN_CALCULATION");
  });

  it("kalit bo'lmasa OpenAI ga umuman murojaat qilmaydi", async () => {
    delete process.env.OPENAI_API_KEY;

    const body = await (await POST(makeRequest({ userMessage: "50 mln kredit" }))).json();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(body.source).toBe("local");
  });

  it("tizim ko'rsatmasi har doim serverda qo'shiladi", async () => {
    fetchMock
      .mockResolvedValueOnce(textResponse("javob"))
      .mockResolvedValue(textResponse("javob"));

    await POST(
      makeRequest({
        userMessage: "salom",
        messages: [{ role: "user", content: "salom" }],
      })
    );

    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.messages[0].role).toBe("system");
    expect(sent.messages[0].content).toContain("Bussy");
  });
});
