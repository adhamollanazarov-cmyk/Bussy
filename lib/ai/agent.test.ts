import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/chat/route";
import {
  getClientKey,
  checkRateLimit,
  hitMemory,
  buckets,
} from "@/lib/ai/rate-limiter";
import { MAX_AGENT_STEPS } from "@/lib/ai/chat-config";

/* ============================================================
   AGENT TSIKLI
   ------------------------------------------------------------
   OpenAI mock qilinadi: model nima qaytarishini biz boshqaramiz,
   shunda ko'p bosqichli zanjir haqiqatan ishlashini tekshira olamiz.
   ============================================================ */

function toolCallResponse(
  calls: { name: string; args: Record<string, unknown> }[],
) {
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
    json: async () => ({
      choices: [{ message: { role: "assistant", content } }],
    }),
  };
}

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-real-ip": `test-${Math.random()}`,
    },
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
          {
            name: "calculate_loan",
            args: { amount: 50_000_000, annual_rate: 24, months: 24 },
          },
        ]),
      )
      .mockResolvedValueOnce(
        toolCallResponse([
          {
            name: "calculate_break_even",
            args: {
              fixed_cost: 19_443_555,
              selling_price: 35_000,
              variable_cost: 18_000,
            },
          },
        ]),
      )
      .mockResolvedValueOnce(textResponse("Kuniga 39 ta sotishingiz kerak."));

    const res = await POST(
      makeRequest({ userMessage: "Kreditni qoplash uchun nechta sotay?" }),
    );
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
          {
            name: "calculate_loan",
            args: { amount: 50_000_000, annual_rate: 24, months: 24 },
          },
        ]),
      )
      .mockResolvedValueOnce(textResponse("Oylik to‘lov 2 643 555 so‘m."));

    const body = await (
      await POST(makeRequest({ userMessage: "50 mln kredit" }))
    ).json();
    expect(body.steps).toHaveLength(1);
    expect(body.toolCalled).toBe("calculate_loan");
  });

  it("bitta javobda bir nechta vosita chaqirilsa, hammasi bajariladi", async () => {
    fetchMock
      .mockResolvedValueOnce(
        toolCallResponse([
          {
            name: "calculate_loan",
            args: { amount: 50_000_000, annual_rate: 24, months: 24 },
          },
          {
            name: "calculate_profit",
            args: { revenue: 45e6, fixed_cost: 16e6, variable_cost: 12e6 },
          },
        ]),
      )
      .mockResolvedValueOnce(textResponse("Tayyor."));

    const body = await (
      await POST(makeRequest({ userMessage: "hisobla" }))
    ).json();
    expect(body.steps.map((s: { tool: string }) => s.tool)).toEqual([
      "calculate_loan",
      "calculate_profit",
    ]);
  });

  it("noma'lum vosita tsiklni buzmaydi", async () => {
    fetchMock
      .mockResolvedValueOnce(
        toolCallResponse([{ name: "calculate_nonsense", args: {} }]),
      )
      .mockResolvedValueOnce(
        textResponse("Kechirasiz, bu hisobni bajara olmadim."),
      );

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
        {
          name: "calculate_loan",
          args: { amount: 1_000_000, annual_rate: 10, months: 12 },
        },
      ]),
    );

    const body = await (
      await POST(makeRequest({ userMessage: "loop" }))
    ).json();

    // Tsikl to'xtaydi va lokal dvigatelga tushadi (model xulosa bermadi)
    expect(body.source).toBe("fallback");
    // OpenAI ga MAX_AGENT_STEPS martadan ko'p murojaat qilinmagan
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(MAX_AGENT_STEPS);
  });

  it("OpenAI ishlamasa lokal dvigatelga tushadi", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    const res = await POST(
      makeRequest({ userMessage: "50 mln so‘m kredit 24 oyga 24%" }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.source).toBe("fallback");
    expect(body.intent).toBe("LOAN_CALCULATION");
  });

  it("OpenAI ishlamasa striming yo'lida ham lokal dvigatelga fallback qiladi", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    const res = await POST(
      makeRequest({
        userMessage: "50 mln so‘m kredit 24 oyga 24%",
        stream: true,
      }),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");

    const text = await res.text();
    const lines = text
      .split("\n\n")
      .map((b) => b.trim())
      .filter(Boolean);
    const events = lines
      .filter((b) => b.startsWith("data:"))
      .map((b) => JSON.parse(b.replace(/^data:\s*/, "")));

    const doneEvent = events.find((e) => e.type === "done");
    expect(doneEvent).toBeDefined();
    expect(doneEvent.message.source).toBe("fallback");
    expect(doneEvent.message.intent).toBe("LOAN_CALCULATION");
    expect(events.some((e) => e.type === "error")).toBe(false);
  });

  it("striming javobi buferlanmaslik sarlavhalari bilan keladi", async () => {
    delete process.env.OPENAI_API_KEY;

    const res = await POST(
      makeRequest({
        userMessage: "50 mln so‘m kredit 24 oyga 24%",
        stream: true,
      }),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    // Buferlovchi proksi qadamlarni oxirida birdan bermasligi uchun
    expect(res.headers.get("x-accel-buffering")).toBe("no");
    expect(res.headers.get("cache-control")).toContain("no-transform");

    // Oqim hamon qadamlarni ketma-ket beradi
    const text = await res.text();
    const events = text
      .split("\n\n")
      .map((b) => b.trim())
      .filter((b) => b.startsWith("data:"))
      .map((b) => JSON.parse(b.replace(/^data:\s*/, "")));

    expect(events.filter((e) => e.type === "step").length).toBeGreaterThan(0);
    expect(events.some((e) => e.type === "done")).toBe(true);
  });

  it("kalit bo'lmasa OpenAI ga umuman murojaat qilmaydi", async () => {
    delete process.env.OPENAI_API_KEY;

    const body = await (
      await POST(makeRequest({ userMessage: "50 mln kredit" }))
    ).json();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(body.source).toBe("local");
  });

  it("kalitsiz (lokal rejimda) ham zanjirli savol 2 qadamli natija beradi", async () => {
    delete process.env.OPENAI_API_KEY;

    const res = await POST(
      makeRequest({
        userMessage: "Kreditni qoplash uchun kuniga nechta sotishim kerak?",
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.source).toBe("local");
    expect(body.steps).toHaveLength(2);
    expect(body.steps[0].tool).toBe("calculate_loan");
    expect(body.steps[1].tool).toBe("calculate_break_even");
  });

  it("tizim ko'rsatmasi har doim serverda qo'shiladi", async () => {
    fetchMock
      .mockResolvedValueOnce(textResponse("javob"))
      .mockResolvedValue(textResponse("javob"));

    await POST(
      makeRequest({
        userMessage: "salom",
        messages: [{ role: "user", content: "salom" }],
      }),
    );

    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.messages[0].role).toBe("system");
    expect(sent.messages[0].content).toContain("Bussy");
  });
});

/* ============================================================
   RATE LIMIT VA KLIENTNI ANIQLASH (B6)
   ============================================================ */

describe("getClientKey & checkRateLimit (B6)", () => {
  beforeEach(() => {
    buckets.clear();
  });

  describe("getClientKey", () => {
    it("Vercel sarlavhasini ishonchli deb birinchi o'qiydi", () => {
      const req = new NextRequest("http://localhost:3000/api/chat", {
        headers: {
          "x-vercel-forwarded-for": "203.0.113.195, 10.0.0.1",
          "x-forwarded-for": "192.168.1.1",
        },
      });
      expect(getClientKey(req)).toBe("203.0.113.195");
    });

    it("Cloudflare cf-connecting-ip sarlavhasini taniydi", () => {
      const req = new NextRequest("http://localhost:3000/api/chat", {
        headers: { "cf-connecting-ip": "198.51.100.4" },
      });
      expect(getClientKey(req)).toBe("198.51.100.4");
    });

    it("x-real-ip sarlavhasini taniydi", () => {
      const req = new NextRequest("http://localhost:3000/api/chat", {
        headers: { "x-real-ip": "198.51.100.12" },
      });
      expect(getClientKey(req)).toBe("198.51.100.12");
    });

    it("mobil ilova yoki frontend x-client-id sarlavhasini taniydi", () => {
      const req = new NextRequest("http://localhost:3000/api/chat", {
        headers: { "x-client-id": "client-uuid-12345" },
      });
      expect(getClientKey(req)).toBe("sid:client-uuid-12345");
    });

    it("proksi sarlavhasi bo'lmaganda yagona «unknown» emas, dev signatura qaytaradi", () => {
      const req1 = new NextRequest("http://localhost:3000/api/chat", {
        headers: { host: "localhost:3000", "user-agent": "Mozilla/5.0 Chrome" },
      });
      const req2 = new NextRequest("http://localhost:3000/api/chat", {
        headers: { host: "localhost:3000", "user-agent": "Mozilla/5.0 Safari" },
      });

      const key1 = getClientKey(req1);
      const key2 = getClientKey(req2);

      expect(key1).toContain("dev:localhost:3000:");
      expect(key2).toContain("dev:localhost:3000:");
      expect(key1).not.toBe(key2); // brauzerlar bir-birini bloklamaydi
    });
  });

  describe("checkRateLimit & hitMemory", () => {
    it("xotiradagi limit oshganda cheklaydi", async () => {
      const key = "test-key-memory";
      expect(await checkRateLimit(key, 2)).toBe(false); // 1-chi
      expect(await checkRateLimit(key, 2)).toBe(false); // 2-chi
      expect(await checkRateLimit(key, 2)).toBe(true); // 3-chi (oshdi)
    });

    it("oyna muddati o'tganda hisoblagichni yangilaydi", () => {
      const key = "test-key-expire";
      expect(hitMemory(key, 1, 100)).toBe(false);
      expect(hitMemory(key, 1, 100)).toBe(true);

      // Vaqt o'tganini ko'rsatamiz
      const bucket = buckets.get(key);
      if (bucket) bucket.resetAt = Date.now() - 1;

      expect(hitMemory(key, 1, 100)).toBe(false);
    });

    it("Upstash Redis sozlanganda REST orqali tekshiradi", async () => {
      process.env.UPSTASH_REDIS_REST_URL = "https://mock-redis.upstash.io";
      process.env.UPSTASH_REDIS_REST_TOKEN = "mock-token";

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ result: 5 }, { result: 1 }],
      });

      const limited = await checkRateLimit("user-test", 4);
      expect(limited).toBe(true); // 5 > 4

      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
    });

    it("Upstash Redis so'rovi xato bersa, xotiradagi limitga fallback qiladi", async () => {
      process.env.UPSTASH_REDIS_REST_URL = "https://mock-redis.upstash.io";
      process.env.UPSTASH_REDIS_REST_TOKEN = "mock-token";

      fetchMock.mockRejectedValueOnce(new Error("Upstash down"));

      const limited = await checkRateLimit("user-fallback", 10);
      expect(limited).toBe(false); // in-memory fallback ishladi

      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
    });
  });
});
