import { z } from "zod";

/* ============================================================
   KIRISH MA'LUMOTLARINI TEKSHIRISH
   ------------------------------------------------------------
   Mijozdan faqat `user` va `assistant` rollari qabul qilinadi.
   `system` rolini mijoz yubora olsa, u tizim ko'rsatmasidagi
   xavfsizlik qoidalarini bekor qila olardi.

   Bu konstantalar va yordamchilar `app/api/chat/route.ts`dan ajratilgan —
   Next.js route handler fayli faqat HTTP metod eksportlarini (POST va h.k.)
   qabul qiladi, boshqa har qanday eksport `next build` bosqichida route
   turlarini generatsiya qilishda xatolikka olib keladi.
   ============================================================ */

/** Modelga yuboriladigan xabarlar soni chegarasi. */
export const MAX_MESSAGES = 30;
/** Bitta xabardagi belgilar chegarasi. */
export const MAX_MESSAGE_CHARS = 4_000;
/** Suhbatdagi umumiy belgilar chegarasi. */
export const MAX_TOTAL_CHARS = 24_000;
/** Mijoz yubora oladigan eng katta tarix — bundan ortig'i rad etiladi. */
export const HARD_MESSAGE_LIMIT = 200;
/** Agent bitta savolga necha marta vosita chaqira olishi. */
export const MAX_AGENT_STEPS = 5;

const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(MAX_MESSAGE_CHARS),
});

export const ChatRequestSchema = z.object({
  userMessage: z.string().max(MAX_MESSAGE_CHARS).optional(),
  messages: z.array(ChatMessageSchema).max(HARD_MESSAGE_LIMIT).optional(),
  locale: z.enum(["uz", "en"]).optional(),
  stream: z.boolean().optional(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

/**
 * Suhbatni chegaralarga moslash — RAD ETMAYDI, qisqartiradi.
 *
 * Ilgari 30 tadan ortiq xabar 400 xatosi bilan qaytarilar va chat butunlay
 * ishlamay qolardi. Uzoq suhbat eng eski kontekstini yo'qotishi kerak,
 * to'xtab qolishi emas.
 */
export function trimConversation(messages: ChatMessage[]): ChatMessage[] {
  // Eng yangi xabarlardan boshlab orqaga yig'amiz
  const kept: ChatMessage[] = [];
  let total = 0;

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (kept.length >= MAX_MESSAGES) break;
    if (total + msg.content.length > MAX_TOTAL_CHARS) break;
    total += msg.content.length;
    kept.unshift(msg);
  }

  // Suhbat foydalanuvchi xabaridan boshlanishi mantiqiyroq
  while (kept.length > 1 && kept[0].role === "assistant") {
    kept.shift();
  }

  return kept;
}
