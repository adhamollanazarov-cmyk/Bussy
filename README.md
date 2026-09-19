# Bussy — Biznesingiz uchun aqlli yordamchi

**Demo:** https://bussy-git-main-adhamollanazarov-cmyks-projects.vercel.app/
**Taqdimot (pitch deck):** [BUSSY_pitch_deck.pptx](./BUSSY_pitch_deck.pptx)
**Xakaton:** Umummilliy AI Xakaton, Xorazm · vazifa №20 (Savdo-sanoat palatasi)

O‘zbekistondagi kichik va o‘rta biznes egalari uchun moliyaviy yordamchi: kredit
kalkulyatori, foyda va zararsizlik tahlili, soliq hisobi, 11 bo‘limli biznes-reja
generatori va what-if simulyatori — barchasi o‘zbek tilida.

## Asosiy tamoyil

**Matematika sun’iy intellektdan ajratilgan.** Barcha moliyaviy hisob-kitoblar
`lib/engine/` ichidagi sof (pure) funksiyalarda bajariladi. AI faqat foydalanuvchi
savolini tushunadi, kerakli kalkulyatorni chaqiradi va natijani o‘zbek tilida
tushuntiradi — raqamlarni hech qachon o‘zi o‘ylab topmaydi.

## Ishga tushirish

```bash
npm install
cp .env.example .env.local   # ixtiyoriy, pastga qarang
npm run dev
```

Brauzerda [http://localhost:3000](http://localhost:3000) ni oching.

### Muhit o‘zgaruvchilari

| O‘zgaruvchi | Majburiy | Tavsif |
|---|---|---|
| `OPENAI_API_KEY` | Yo‘q | Bo‘lsa, chat OpenAI (gpt-4o-mini) orqali tool-calling bilan ishlaydi. Bo‘lmasa — `lib/ai/demo-engine.ts` zaxira dvigateli. Ikkala holatda ham matematika bir xil kalkulyatorlarda hisoblanadi. |

## Skriptlar

| Buyruq | Tavsif |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Production serverni ishga tushirish |
| `npm run lint` | ESLint |
| `npm test` | Vitest (moliyaviy dvigatel testlari) |

> **Eslatma — `build` nega `--webpack` bilan ishlaydi?**
> `next build` Turbopack bilan Windows'da `lightningcss` native modulini yuklay
> olmay xato beradi (Tailwind v4 + Turbopack muammosi). `next dev` Turbopack bilan
> normal ishlaydi. Yuqori oqimda tuzatilgach, `package.json` dagi `--webpack`
> bayrog‘ini olib tashlash mumkin.

## Loyiha tuzilishi

```
app/
  page.tsx              Landing sahifa
  api/chat/route.ts     Chat endpoint (validatsiya + rate limit + OpenAI/zaxira)
  app/                  Ilova sahifalari (dashboard, chat, finance, loan, ...)
components/
  charts/               Recharts grafiklari
  chat/                 Chat xabarlari va hisob-kitob kartochkalari
  layout/               Sidebar va header
  ui/                   Button, Card, Input, Badge
lib/
  engine/               💡 Moliyaviy dvigatel — sof funksiyalar
    assumptions.ts      Markazlashtirilgan taxminlar (narx, tannarx, taqsimot)
    loan.ts             Annuitet kredit + amortizatsiya jadvali
    profit.ts           Yalpi/sof foyda va marjalar
    breakeven.ts        Zararsizlik nuqtasi
    cashflow.ts         Pul oqimi va likvidlik
    tax.ts              O‘zbekiston soliq rejimlari
    analyzer.ts         Qarz yuki, g‘oya tahlili, biznes-reja
  ai/
    prompts.ts          Tizim ko‘rsatmasi (xavfsizlik qoidalari)
    tools.ts            OpenAI tool ta'riflari
    demo-engine.ts      Kalit so'zli zaxira dvigatel
  store/                Biznes ma'lumoti (localStorage + useSyncExternalStore)
supabase/schema.sql     ⚠️ Hozircha ulanmagan — pastga qarang
```

## Testlar

```bash
npm test
```

Testlar `lib/engine/` ni qamrab oladi: annuitet formulasi, zararsizlik nuqtasi,
soliq moddalarining yig‘indisi, va chat dvigatelining niyat aniqlash tartibi.

## Ma'lum cheklovlar

- **Soliq stavkalari tasdiqlanishi kerak.** `lib/engine/tax.ts` dagi stavkalar
  umumiy qoidalarga asoslangan. Ishlab chiqarishga chiqarishdan oldin buxgalter
  ko‘rigidan o‘tkazing. QQS qo‘shilgan qiymatdan hisoblanadi, lekin kirim QQSiga
  ega xarajatlar ulushi taxminiy (60%).
- **`supabase/schema.sql` ulanmagan.** Bu kelajakdagi persistensiya uchun loyiha
  eskizi — hech qayerdan import qilinmaydi va `@supabase/supabase-js` o‘rnatilmagan.
  Ishlatishdan oldin **har bir jadvalga RLS siyosatlari** qo‘shilishi shart.
- **Rate limit xotirada.** `app/api/chat/route.ts` dagi cheklov bitta instans uchun
  ishlaydi. Serverless/ko‘p instansli deployda Redis kabi tashqi hisoblagich kerak.
- **Autentifikatsiya yo‘q.** Ma'lumotlar faqat brauzer `localStorage` ida saqlanadi.

## Texnologiyalar

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Recharts · Zod · Vitest
