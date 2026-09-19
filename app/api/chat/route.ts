import { NextRequest, NextResponse } from "next/server";
import { processWithSmartDemoEngine, detectIntent } from "@/lib/ai/demo-engine";
import { getSystemPrompt } from "@/lib/ai/prompts";
import { BUSSY_TOOLS } from "@/lib/ai/tools";
import { runTool, getToolResultForModel, type ToolArgs } from "@/lib/ai/run-tool";
import { DEFAULT_LOCALE, translations, type Locale } from "@/lib/i18n/translations";
import {
  MAX_AGENT_STEPS,
  ChatRequestSchema,
  trimConversation,
  type ChatMessage,
} from "@/lib/ai/chat-config";

/* ============================================================
   KIRISH MA'LUMOTLARINI TEKSHIRISH
   ------------------------------------------------------------
   Mijozdan faqat `user` va `assistant` rollari qabul qilinadi.
   `system` rolini mijoz yubora olsa, u tizim ko'rsatmasidagi
   xavfsizlik qoidalarini bekor qila olardi.

   Chegaralar, sxema va `trimConversation` `lib/ai/chat-config.ts`da
   e'lon qilingan — Next.js route handler fayli faqat HTTP metod
   eksportlarini qabul qiladi, boshqa eksportlar `next build` route
   turlarini generatsiya qilishda xatolikka olib keladi.
   ============================================================ */

/**
 * Serverless funksiyaning eng ko'p bajarilish vaqti (sekundda).
 *
 * Bu HTTP metod eksporti emas, balki Next.js ning shtatli "route segment
 * config" eksporti — `route.ts` uchun hujjatlashtirilgan va `next build`
 * route turlarini generatsiya qilishga xalaqit bermaydi.
 * Ruxsat etilganlari: `runtime`, `preferredRegion`, `dynamicParams`,
 * `maxDuration`. Boshqa har qanday eksport buildni buzadi.
 */
export const maxDuration = 60;

/**
 * Bitta OpenAI chaqiruvining kutish vaqti.
 *
 * Agent tsikli bitta savolga MAX_AGENT_STEPS (5) martagacha OpenAI ga
 * murojaat qiladi. 30 sekundda serverless funksiya javob o'rtasida
 * o'ldirilishi mumkin edi: 5 × 30 s = 150 s > maxDuration. 15 sekundda
 * eng yomon holat ham chegara ichida qoladi va sekin javob zaxira
 * dvigatelga tezroq tushadi.
 */
const OPENAI_TIMEOUT_MS = 15_000;
const OPENAI_MODEL = "gpt-4o-mini";

import {
  getClientKey,
  checkRateLimit,
  RATE_MAX_AI,
  RATE_MAX_LOCAL,
  RATE_MAX_AI_GLOBAL,
} from "@/lib/ai/rate-limiter";

/* ============================================================
   OPENAI
   ============================================================ */

interface OpenAIToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface OpenAIMessage {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
}

async function callOpenAI(apiKey: string, body: Record<string, unknown>) {
  return fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS),
  });
}

interface AgentStep {
  tool: string;
  result: unknown;
}

/**
 * Agent tsikli.
 *
 * Ilgari faqat BITTA raund bo'lardi: model vosita chaqirardi, natija
 * qaytarilar, model tushuntirardi — tamom. Model bir vositaning natijasini
 * ko'rib, keyingisini chaqira olmasdi. Masalan "kreditni qoplash uchun
 * kuniga nechta sotishim kerak?" savoli calculate_loan -> (oylik to'lov) ->
 * calculate_break_even zanjirini talab qiladi.
 *
 * Endi model `MAX_AGENT_STEPS` marta vosita chaqira oladi.
 */
async function runAgent(
  apiKey: string,
  conversation: ChatMessage[],
  locale: Locale,
  onStep?: (step: AgentStep) => void,
): Promise<{ content: string; steps: AgentStep[] } | null> {
  const messages: OpenAIMessage[] = [
    { role: "system", content: getSystemPrompt(locale) },
    ...conversation,
  ];
  const steps: AgentStep[] = [];

  for (let iteration = 0; iteration < MAX_AGENT_STEPS; iteration++) {
    const isLastIteration = iteration === MAX_AGENT_STEPS - 1;

    const response = await callOpenAI(apiKey, {
      model: OPENAI_MODEL,
      messages,
      // Oxirgi qadamda vositalarni bermaymiz — model xulosa yozishi shart
      ...(isLastIteration ? {} : { tools: BUSSY_TOOLS, tool_choice: "auto" }),
      temperature: 0.3,
    });

    if (!response.ok) return null;

    const data = await response.json();
    const choice: OpenAIMessage | undefined = data.choices?.[0]?.message;
    if (!choice) return null;

    const toolCalls = choice.tool_calls ?? [];

    // Vosita chaqirilmadi -> yakuniy javob
    if (toolCalls.length === 0) {
      const content = (choice.content || "").trim();
      return content ? { content, steps } : null;
    }

    messages.push(choice);

    // Har bir chaqiruvga javob qaytarish SHART, aks holda OpenAI keyingi
    // so'rovni rad etadi.
    for (const call of toolCalls) {
      let args: ToolArgs = {};
      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch {
        args = {};
      }

      const output = runTool(call.function.name, args, locale);

      if (output === undefined) {
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify({
            error: translations[locale].chatErrors.unknownTool.replace("{tool}", call.function.name),
          }),
        });
        continue;
      }

      const stepItem = { tool: call.function.name, result: output };
      steps.push(stepItem);
      onStep?.(stepItem);
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(getToolResultForModel(call.function.name, output)),
      });
    }
  }

  return null;
}

/* ============================================================
   HANDLER
   ============================================================ */

export async function POST(req: NextRequest) {
  let locale: Locale = DEFAULT_LOCALE;
  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json(
        { error: translations[locale].chatErrors.invalidJson },
        { status: 400 },
      );
    }

    // Boshqa maydonlar yaroqsiz bo'lsa ham, xato so'rov tilida qaytariladi.
    if (rawBody && typeof rawBody === "object" && "locale" in rawBody) {
      if (rawBody.locale === "uz" || rawBody.locale === "en") {
        locale = rawBody.locale;
      }
    }

    const parsed = ChatRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: translations[locale].chatErrors.invalidRequest },
        { status: 400 },
      );
    }

    const {
      messages,
      userMessage,
      stream = false,
    } = parsed.data;
    const query = (
      userMessage ||
      messages?.[messages.length - 1]?.content ||
      ""
    ).trim();

    if (!query) {
      return NextResponse.json(
        { error: translations[locale].chatErrors.emptyMessage },
        { status: 400 },
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const clientKey = getClientKey(req);

    // Chegara pullik yo'lda qattiqroq: lokal dvigatelda tashqi xarajat yo'q,
    // shuning uchun demo rejimida foydalanuvchini bo'g'ib qo'ymaymiz.
    const limited = apiKey
      ? (await checkRateLimit(`ai:${clientKey}`, RATE_MAX_AI)) ||
        (await checkRateLimit("ai:__global__", RATE_MAX_AI_GLOBAL))
      : await checkRateLimit(`local:${clientKey}`, RATE_MAX_LOCAL);

    if (limited) {
      return NextResponse.json(
        {
          error: translations[locale].chatErrors.rateLimited,
        },
        { status: 429 },
      );
    }

    // --- STRIMING (PROGRESS) YO'NALISHI ---
    if (stream) {
      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          const send = (data: unknown) => {
            try {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
              );
            } catch {
              // Mijoz aloqani uzgan bo'lishi mumkin
            }
          };

          try {
            if (apiKey) {
              try {
                send({
                  type: "status",
                  message:
                    locale === "en"
                      ? "AI agent is analyzing the request..."
                      : "AI agent so‘rovni tahlil qilmoqda...",
                });

                const conversation = trimConversation(
                  messages?.length
                    ? messages
                    : [{ role: "user", content: query }],
                );

                const result = await runAgent(
                  apiKey,
                  conversation,
                  locale,
                  (step) => {
                    send({ type: "step", step });
                  },
                );

                if (result) {
                  const isChaining =
                    detectIntent(query) === "CHAINED_LOAN_BREAK_EVEN";
                  if (!isChaining || result.steps.length >= 2) {
                    const last = result.steps[result.steps.length - 1];
                    send({
                      type: "done",
                      message: {
                        role: "assistant",
                        content: result.content,
                        toolCalled: last?.tool,
                        toolResult: last?.result,
                        steps: result.steps,
                        source: "ai",
                      },
                    });
                    controller.close();
                    return;
                  }
                }
              } catch (err) {
                console.warn(
                  "OpenAI streaming agent failed, falling back to Smart Demo Engine:",
                  err,
                );
              }
            }

            // OpenAI bo'lmasa yoki rad etilsa — aqlli lokal dvigatel
            const engineResult = processWithSmartDemoEngine(query, locale);
            const steps = engineResult.steps || [];

            send({
              type: "status",
              message:
                locale === "en"
                  ? "Bussy calculation engine started..."
                  : "Bussy hisoblash dvigateli ishga tushdi...",
            });

            // Har bir qadamni ketma-ket chiqarish
            for (let i = 0; i < steps.length; i++) {
              await new Promise((r) => setTimeout(r, 260));
              send({
                type: "step",
                step: steps[i],
                index: i,
                total: steps.length,
              });
            }

            if (steps.length > 0) {
              await new Promise((r) => setTimeout(r, 180));
            }

            const last = steps[steps.length - 1];
            send({
              type: "done",
              message: {
                ...engineResult,
                role: "assistant",
                toolCalled: engineResult.toolCalled || last?.tool,
                toolResult: engineResult.toolResult || last?.result,
                steps,
                source: apiKey ? "fallback" : "local",
              },
            });
          } catch (err) {
            console.error("Streaming error:", err);
            send({
              type: "error",
              error: translations[locale].chatErrors.processingFailed,
            });
          } finally {
            try {
              controller.close();
            } catch {
              // allready closed
            }
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          // Buferlovchi proksi (nginx) oqimni to'plab, barcha qadamlarni
          // oxirida birdan bermasligi uchun — aks holda agent progressi
          // productionda ko'rinmay qoladi.
          "X-Accel-Buffering": "no",
        },
      });
    }

    // --- AN'ANAVIY JSON JAVOB (TESTLAR VA ODDIY SO'ROVLAR UCHUN) ---
    if (apiKey) {
      try {
        // Rad etish emas, qisqartirish (H1)
        const conversation = trimConversation(
          messages?.length ? messages : [{ role: "user", content: query }],
        );

        const result = await runAgent(apiKey, conversation, locale);

        if (result) {
          const isChaining = detectIntent(query) === "CHAINED_LOAN_BREAK_EVEN";
          if (!isChaining || result.steps.length >= 2) {
            const last = result.steps[result.steps.length - 1];
            return NextResponse.json({
              role: "assistant",
              content: result.content,
              // Eski mijozlar uchun moslik
              toolCalled: last?.tool,
              toolResult: last?.result,
              // Barcha qadamlar — UI ularning hammasini ko'rsatadi
              steps: result.steps,
              source: "ai",
            });
          }
        }
      } catch (err) {
        console.warn(
          "OpenAI agent failed, falling back to Smart Demo Engine:",
          err,
        );
      }
    }

    // Zaxira: aniq kalkulyatorlarga asoslangan lokal dvigatel
    return NextResponse.json({
      ...processWithSmartDemoEngine(query, locale),
      source: apiKey ? "fallback" : "local",
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      {
        error: translations[locale].chatErrors.serviceUnavailable,
      },
      { status: 500 },
    );
  }
}
