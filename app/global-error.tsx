"use client";

import { getCurrentLocale } from "@/lib/i18n/language-store";

/**
 * Ildiz layout'ning o'zida xatolik yuz berganda ishlaydi — oxirgi himoya chizig'i.
 *
 * DIQQAT: bu fayl ildiz layout'ni butunlay ALMASHTIRADI — shu jumladan
 * `LanguageProvider`ni ham. Shuning uchun React context o'rniga localStorage'dan
 * to'g'ridan-to'g'ri o'qiladi (`getCurrentLocale`), Tailwind yetib kelmaydi va
 * barcha uslublar inline yozilgan.
 */
const COPY = {
  uz: {
    title: "Ilovada jiddiy xatolik",
    description:
      "Bussy'ni yuklab bo'lmadi. Sahifani qayta yuklab ko'ring — biznes ma'lumotlaringiz brauzeringizda saqlanib qoladi.",
    retry: "Qayta urinish",
    home: "Bosh sahifa",
    errorCode: "Xatolik kodi",
  },
  en: {
    title: "Something went seriously wrong",
    description:
      "Bussy couldn't load. Try reloading the page — your business data will still be there, saved in your browser.",
    retry: "Try again",
    home: "Home",
    errorCode: "Error code",
  },
};

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const copy = COPY[getCurrentLocale()];

  return (
    <html lang={getCurrentLocale()}>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f8fafc",
          color: "#0f172a",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          padding: "24px",
        }}
      >
        <title>Xatolik — Bussy</title>

        <div style={{ maxWidth: "420px", width: "100%", textAlign: "center" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              margin: "0 auto 20px",
              borderRadius: "18px",
              backgroundColor: "#0f172a",
              color: "#34d399",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              fontWeight: 700,
            }}
          >
            !
          </div>

          <h1 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 8px" }}>{copy.title}</h1>
          <p
            style={{
              fontSize: "14px",
              lineHeight: 1.6,
              color: "#64748b",
              margin: "0 0 24px",
            }}
          >
            {copy.description}
          </p>

          <div
            style={{
              display: "flex",
              gap: "10px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => retry()}
              style={{
                cursor: "pointer",
                border: "none",
                borderRadius: "12px",
                backgroundColor: "#059669",
                color: "#ffffff",
                fontSize: "14px",
                fontWeight: 600,
                padding: "10px 20px",
              }}
            >
              {copy.retry}
            </button>
            <a
              href="/app"
              style={{
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                backgroundColor: "#ffffff",
                color: "#334155",
                fontSize: "14px",
                fontWeight: 500,
                padding: "10px 20px",
                textDecoration: "none",
              }}
            >
              {copy.home}
            </a>
          </div>

          {error.digest && (
            <p
              style={{
                marginTop: "20px",
                fontSize: "11px",
                color: "#94a3b8",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              }}
            >
              {copy.errorCode}: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
