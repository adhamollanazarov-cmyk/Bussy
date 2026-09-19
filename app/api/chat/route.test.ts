import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { checkRateLimit } from "@/lib/ai/rate-limiter";
import { processWithSmartDemoEngine } from "@/lib/ai/demo-engine";
import { translations } from "@/lib/i18n/translations";
import { calculateLoan } from "@/lib/engine/loan";

vi.mock("@/lib/ai/rate-limiter", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/ai/rate-limiter")>(),
  checkRateLimit: vi.fn(),
}));

vi.mock("@/lib/ai/demo-engine", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/ai/demo-engine")>(),
  processWithSmartDemoEngine: vi.fn(),
}));

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.stubEnv("OPENAI_API_KEY", "");
  vi.mocked(checkRateLimit).mockResolvedValue(false);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.resetAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/chat xatolari tili", () => {
  for (const locale of ["uz", "en"] as const) {
    const errors = translations[locale].chatErrors;

    for (const stream of [false, true]) {
      it(`${locale}, stream=${stream}: yaroqsiz maydonlar uchun 400`, async () => {
        const res = await POST(makeRequest({ locale, stream, messages: [{ role: "system", content: "test" }] }));
        expect(res.status).toBe(400);
        expect(await res.json()).toEqual({ error: errors.invalidRequest });
      });

      it(`${locale}, stream=${stream}: bo'sh savol uchun 400`, async () => {
        const res = await POST(makeRequest({ locale, stream, userMessage: "   " }));
        expect(res.status).toBe(400);
        expect(await res.json()).toEqual({ error: errors.emptyMessage });
      });

      it(`${locale}, stream=${stream}: cheklov uchun 429`, async () => {
        vi.mocked(checkRateLimit).mockResolvedValue(true);
        const res = await POST(makeRequest({ locale, stream, userMessage: "test" }));
        expect(res.status).toBe(429);
        expect(await res.json()).toEqual({ error: errors.rateLimited });
      });

      it(`${locale}, stream=${stream}: oqim ochilishidan oldingi xato uchun 500`, async () => {
        vi.mocked(checkRateLimit).mockRejectedValue(new Error("test"));
        const res = await POST(makeRequest({ locale, stream, userMessage: "test" }));
        expect(res.status).toBe(500);
        expect(await res.json()).toEqual({ error: errors.serviceUnavailable });
      });
    }

    it(`${locale}: lokal dvigatel xatosi uchun 500`, async () => {
      vi.mocked(processWithSmartDemoEngine).mockImplementation(() => { throw new Error("test"); });
      const res = await POST(makeRequest({ locale, userMessage: "test" }));
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: errors.serviceUnavailable });
    });

    it(`${locale}: SSE xato hodisasi ham tarjima qilinadi`, async () => {
      vi.mocked(processWithSmartDemoEngine).mockImplementation(() => { throw new Error("test"); });
      const res = await POST(makeRequest({ locale, stream: true, userMessage: "test" }));
      expect(res.status).toBe(200);
      const event = JSON.parse((await res.text()).trim().replace(/^data:\s*/, ""));
      expect(event).toEqual({ type: "error", error: errors.processingFailed });
    });
  }

  it("JSON o'qilmasa standart uz tili ishlatiladi", async () => {
    const res = await POST(new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: translations.uz.chatErrors.invalidJson });
  });

  it.each([{}, { locale: "ru" }, null, []])("til yo'q yoki yaroqsiz bo'lsa uz: %j", async (body) => {
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
    const expected = body && !Array.isArray(body) && !("locale" in body)
      ? translations.uz.chatErrors.emptyMessage
      : translations.uz.chatErrors.invalidRequest;
    expect(await res.json()).toEqual({ error: expected });
  });
});

describe("kredit natijasi model va UI uchun", () => {
  for (const stream of [false, true]) {
    it.each([24, 60])(`stream=${stream}: %i oylik jadval faqat UI ga yuboriladi`, async (months) => {
      vi.stubEnv("OPENAI_API_KEY", "test-key");
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ choices: [{ message: {
            role: "assistant",
            content: null,
            tool_calls: [{
              id: "loan-call",
              type: "function",
              function: {
                name: "calculate_loan",
                arguments: JSON.stringify({ amount: 50_000_000, annual_rate: 24, months }),
              },
            }],
          } }] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ choices: [{ message: { role: "assistant", content: "Tayyor." } }] }),
        });
      vi.stubGlobal("fetch", fetchMock);

      const expected = calculateLoan({ amount: 50_000_000, annualRate: 24, months });
      const res = await POST(makeRequest({ userMessage: "50 mln kredit", stream }));
      expect(res.status).toBe(200);

      if (stream) {
        const events = (await res.text()).trim().split("\n\n")
          .map((block) => JSON.parse(block.replace(/^data:\s*/, "")));
        expect(events.find((event) => event.type === "step").step.result).toEqual(expected);
        const message = events.find((event) => event.type === "done").message;
        expect(message.steps[0].result).toEqual(expected);
        expect(message.toolResult).toEqual(expected);
      } else {
        const body = await res.json();
        expect(body.steps[0].result).toEqual(expected);
        expect(body.toolResult).toEqual(expected);
      }

      expect(expected.schedule).toHaveLength(months);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      const modelRequest = JSON.parse(fetchMock.mock.calls[1][1].body);
      const toolMessage = modelRequest.messages.find((message: { role: string }) => message.role === "tool");
      expect(JSON.parse(toolMessage.content)).toEqual({
        monthlyPayment: expected.monthlyPayment,
        totalPayment: expected.totalPayment,
        totalInterest: expected.totalInterest,
      });
    });
  }
});
