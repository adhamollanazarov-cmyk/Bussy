import { NextRequest } from "next/server";

/* ============================================================
   TEZLIK CHEKLOVI (RATE LIMIT) & KLIENT IDENTIFIKATSIYASI (B6)
   ------------------------------------------------------------
   Serverless va ko'p instansli muhit uchun taqsimlangan rate limit.
   UPSTASH_REDIS_REST_URL va UPSTASH_REDIS_REST_TOKEN berilgan bo'lsa,
   Upstash Redis REST API orqali barcha lambda instanslar bo'yicha
   cheklov sinxronlashadi.
   Agar Redis sozlanmagan bo'lsa yoki tarmoq xatosi yuz bersa,
   avtomatik xotiradagi (in-memory) Map ga o'tadi.
   ============================================================ */

export const RATE_WINDOW_MS = 60_000;
/** Pullik (OpenAI) yo'l uchun — kalitni himoya qiladi. */
export const RATE_MAX_AI = 12;
/** Lokal hisoblash dvigateli uchun — tashqi xarajat yo'q, faqat DoS himoyasi. */
export const RATE_MAX_LOCAL = 60;
/** Barcha mijozlar bo'yicha umumiy AI chegarasi — sarfni cheklaydi. */
export const RATE_MAX_AI_GLOBAL = 120;

export const buckets = new Map<string, { count: number; resetAt: number }>();

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Mijoz identifikatori (B6).
 *
 * `x-forwarded-for` ni mijozning o'zi yubora oladi, shuning uchun unga
 * oxirgi navbatda ishonamiz. Platforma o'rnatadigan sarlavhalar (Vercel, Cloudflare)
 * ustunlikka ega — ularni mijoz soxtalashtira olmaydi.
 * Proksi bo'lmagan lokal/self-hosted muhitda barcha foydalanuvchilar bitta
 * "unknown" bucketga tushib qolmasligi uchun req.ip, x-client-id yoki
 * brauzer signaturasidan foydalaniladi.
 */
export function getClientKey(req: NextRequest): string {
  const trusted =
    req.headers.get("x-vercel-forwarded-for") ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip");
  if (trusted) return trusted.split(",")[0].trim();

  // Next.js runtime ip (agar mavjud bo'lsa)
  const reqIp = (req as unknown as { ip?: string }).ip;
  if (reqIp) return reqIp.trim();

  // Klient / sessiya sarlavhalari (mobil ilova yoki frontend sessiya)
  const clientSession =
    req.headers.get("x-client-id") || req.headers.get("x-session-id");
  if (clientSession) return "sid:" + clientSession.trim();

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return "xff:" + forwarded.split(",")[0].trim();

  const host = req.headers.get("host") || "local";
  const userAgent = req.headers.get("user-agent") || "generic";
  return `dev:${host}:${hashString(userAgent)}`;
}

export function hitMemory(
  key: string,
  max: number,
  windowMs: number = RATE_WINDOW_MS,
): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 5_000) {
      for (const [k, v] of buckets) if (now > v.resetAt) buckets.delete(k);
    }
    return false;
  }

  bucket.count += 1;
  return bucket.count > max;
}

export const hit = hitMemory;

/**
 * Serverless va ko'p instansli muhit uchun taqsimlangan rate limit (B6).
 * UPSTASH_REDIS_REST_URL va UPSTASH_REDIS_REST_TOKEN berilgan bo'lsa,
 * Upstash Redis REST API orqali barcha lambda instanslar bo'yicha cheklov sinxronlashadi.
 * Agar Redis sozlanmagan bo'lsa yoki tarmoq xatosi yuz bersa, avtomatik xotiradagi
 * `hitMemory` ga o'tadi.
 */
export async function checkRateLimit(
  key: string,
  max: number,
  windowMs: number = RATE_WINDOW_MS,
): Promise<boolean> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    try {
      const res = await fetch(`${redisUrl}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${redisToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ["INCR", `ratelimit:${key}`],
          ["EXPIRE", `ratelimit:${key}`, Math.ceil(windowMs / 1000), "NX"],
        ]),
        signal: AbortSignal.timeout(1000),
      });

      if (res.ok) {
        const data = (await res.json()) as [{ result: number }, unknown];
        const count = data?.[0]?.result;
        if (typeof count === "number") {
          return count > max;
        }
      }
    } catch (err) {
      console.warn(
        "Upstash Redis rate limit check failed, falling back to in-memory:",
        err,
      );
    }
  }

  return hitMemory(key, max, windowMs);
}
