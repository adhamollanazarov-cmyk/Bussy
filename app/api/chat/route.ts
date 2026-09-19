import { NextRequest, NextResponse } from "next/server";
import { processWithSmartDemoEngine } from "@/lib/ai/demo-engine";
import { getSystemPrompt } from "@/lib/ai/prompts";
import { BUSSY_TOOLS } from "@/lib/ai/tools";
import { runTool, type ToolArgs } from "@/lib/ai/run-tool";
import type { Locale } from "@/lib/i18n/translations";
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

const OPENAI_TIMEOUT_MS = 30_000;
const OPENAI_MODEL = "gpt-4o-mini";

/* ============================================================
   TEZLIK CHEKLOVI (RATE LIMIT)
   ------------------------------------------------------------
   Xotirada saqlanadi — bitta instans uchun. Serverless/ko'p instansli
   muhitda Redis (masalan Upstash) kerak bo'ladi.
   ============================================================ */

const RATE_WINDOW_MS = 60_000;
/** Pullik (OpenAI) yo'l uchun — kalitni himoya qiladi. */
const RATE_MAX_AI = 12;
/** Lokal hisoblash dvigateli uchun — tashqi xarajat yo'q, faqat DoS himoyasi. */
const RATE_MAX_LOCAL = 60;
/** Barcha mijozlar bo'yicha umumiy AI chegarasi — sarfni cheklaydi. */
const RATE_MAX_AI_GLOBAL = 120;

const buckets = new Map<string, { count: number; resetAt: number }>();

/**
 * Mijoz identifikatori.
 *
 * `x-forwarded-for` ni mijozning o'zi yubora oladi, shuning uchun unga
 * oxirgi navbatda ishonamiz. Platforma o'rnatadigan sarlavhalar (Vercel)
 * ustunlikka ega — ularni mijoz soxtalashtira olmaydi.
 */
function getClientKey(req: NextRequest): string {
  const trusted =
    req.headers.get("x-vercel-forwarded-for") ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip");
  if (trusted) return trusted.split(",")[0].trim();

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return "xff:" + forwarded.split(",")[0].trim();

  return "unknown";
}

function hit(key: string, max: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    if (buckets.size > 5_000) {
      for (const [k, v] of buckets) if (now > v.resetAt) buckets.delete(k);
    }
    return false;
  }

  bucket.count += 1;
  return bucket.count > max;
}

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
  locale: Locale
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
            error: `Noma'lum hisoblash vositasi: ${call.function.name}`,
          }),
        });
        continue;
      }

      steps.push({ tool: call.function.name, result: output });
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(output),
      });
    }
  }

  return null;
}

/* ============================================================
   HANDLER
   ============================================================ */

export async function POST(req: NextRequest) {
  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: "So‘rov formati noto‘g‘ri." }, { status: 400 });
    }

    const parsed = ChatRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "So‘rov ma’lumotlari noto‘g‘ri yoki juda uzun." },
        { status: 400 }
      );
    }

    const { messages, userMessage, locale = "uz" } = parsed.data;
    const query = (userMessage || messages?.[messages.length - 1]?.content || "").trim();

    if (!query) {
      return NextResponse.json(
        { error: "Xabar matni bo‘sh bo‘lishi mumkin emas." },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const clientKey = getClientKey(req);

    // Chegara pullik yo'lda qattiqroq: lokal dvigatelda tashqi xarajat yo'q,
    // shuning uchun demo rejimida foydalanuvchini bo'g'ib qo'ymaymiz.
    const limited = apiKey
      ? hit(`ai:${clientKey}`, RATE_MAX_AI) || hit("ai:__global__", RATE_MAX_AI_GLOBAL)
      : hit(`local:${clientKey}`, RATE_MAX_LOCAL);

    if (limited) {
      return NextResponse.json(
        {
          error:
            locale === "en"
              ? "Too many requests. Please try again in a minute."
              : "Juda ko‘p so‘rov yuborildi. Bir daqiqadan so‘ng qayta urinib ko‘ring.",
        },
        { status: 429 }
      );
    }

    if (apiKey) {
      try {
        // Rad etish emas, qisqartirish (H1)
        const conversation = trimConversation(
          messages?.length ? messages : [{ role: "user", content: query }]
        );

        const result = await runAgent(apiKey, conversation, locale);

        if (result) {
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
      } catch (err) {
        console.warn("OpenAI agent failed, falling back to Smart Demo Engine:", err);
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
      { error: "Hozir AI xizmati vaqtincha ishlamayapti. Demo rejimida davom etishingiz mumkin." },
      { status: 500 }
    );
  }
}
