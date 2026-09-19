# Bussy — Kod ko'rigi va texnik holat hisoboti

**Ko'rik sanasi:** 2026-09-19 · branch `main` · commit `4d1fe5f` + commit qilinmagan ish nusxasi
**Qamrov:** `app/`, `components/`, `lib/`, `supabase/schema.sql` — 13 465 satr TS/TSX/SQL (git kuzatuvidagi fayllar)
**Stack:** Next.js 16.3.5 (App Router, webpack build) · React 19.2.8 · Tailwind CSS v4 · TypeScript 5 · Recharts 3 · Zod 4 · Vitest 5
**Metodika:** har bir tasdiq quyidagi buyruqlar natijasi yoki `fayl:satr` havolasi bilan tasdiqlangan. Tekshirilmagan da'vo bu hujjatga kiritilmadi.

---

## 1. Qisqacha xulosa

Loyihaning **yadrosi mustahkam**: moliyaviy matematika sof funksiyalarda ajratilgan, model hech qachon raqamni o'zi hisoblamaydi, 117 ta test yashil, `tsc` / ESLint / `next build` toza o'tadi. Arxitekturaviy asosiy qaror — LLM'ni "hisoblagich" emas, "vosita tanlovchi" sifatida ishlatish — to'g'ri va kodda izchil qo'llangan.

**B1–B7, O2 va O4 hal qilindi** va har biri kod bilan tasdiqlandi (4-bo'limga qarang). B1 ning zaxira dvigatel fallback'i endi striming yo'lida ham ishlaydi va test bilan qulflangan.

### ⚠️ Bu ko'rik boshlanganda daraxt umuman kompilyatsiya bo'lmasdi

Oldingi tahrir uchta faylni **yarim birlashtirilgan holda** qoldirgan edi — eski va yangi bloklar bir-biriga kirishib ketgan, qavslar yopilmagan. `tsc`, ESLint, Vitest va `next build` — to'rtalasi ham yiqilardi, garchi hujjatning o'zi "113 ta test, 100% green" deb yozgan bo'lsa ham.

| Fayl | Muammo |
| ---- | ------ |
| `lib/store/business-store.tsx:194` | Eski bir qatorli `if (event.key === ...)` yangi uch kalitli `if` ustida qolgan — ikkita ochiq qavs, bitta yopiq |
| `components/layout/sidebar.tsx:141-145, :203-205, :228-233` | Eski avatar/footer bo'laklari yangi rol tanlagichga kirishib ketgan; bittasi `role === "consultant" &&` shoxi ichiga tushib qolgan |
| `app/app/tax/page.tsx:4, :16, :72` | Takrorlangan `lucide-react` importi, takrorlangan `useBusiness()` destrukturizatsiyasi, ikki marta chizilgan `<Badge>` |
| `lib/i18n/translations.ts:46, :655, :694, :1303-1304` | Takrorlangan `demoUser` va `point3Title` / `point3Desc` kalitlari (TS1117) |
| `app/app/tax/page.tsx:42` | **Runtime crash:** `["turnover", "general", "yatt"]` — rejim identifikatori `"individual"`, `"yatt"` emas |

Bularning hammasi shu ko'rik davomida tuzatildi. Diqqat qiling: `tsc` sintaktik xato bo'lganda semantik tekshiruvni **umuman bajarmaydi**, shuning uchun `translations.ts` va `tax/page.tsx` dagi xatolar birinchi ikkita parse xatosi ortida yashirin edi va faqat ular tuzatilgandan keyin ko'rindi.

**Xulosa:** faqat `npm test` ning yashil chiqishiga ishonmang — ishga tushmagan test fayli "yashil" ko'rinadi. `tsc`, ESLint va `next build` ham har commitdan oldin majburiy.

### Oldingi hisobotdagi noaniqliklar

Avvalgi `review.md` ba'zi da'volarda kod bilan mos kelmasdi. Tuzatildi:

| Oldingi da'vo                                       | Haqiqiy holat                                                                                                                             |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/engine/break-even.ts`, `lib/engine/scoring.ts` | Bunday fayllar yo'q. Mavjud: `breakeven.ts`, `analyzer.ts`, `assumptions.ts`, `cashflow.ts`, `loan.ts`, `profit.ts`, `tax.ts`, `types.ts` |
| `loan.ts (annuitet/diff)`                           | Faqat **annuitet** amalga oshirilgan. Differensial (kamayuvchi) jadval yozilmagan                                                         |
| "14 marshrut build bo'ladi"                         | Build jadvalida **12 marshrut**, prerender qilingan sahifalar **14 ta**                                                                   |
| Diagrammada `runAgent()` alohida modul kabi         | `runAgent` — `app/api/chat/route.ts:128` ichidagi lokal funksiya, alohida fayl emas                                                       |
| "sahnada qulamaslik (zero-crash) kafolati"          | O'sha paytda striming yo'lida tarmoq xatosi zaxira dvigatelga tushmasdi. **B1 da tuzatildi** — endi kafolat haqiqiy va test bilan qulflangan |
| 11 728 satr                                         | 13 465 satr (commit `4d1fe5f` + ish nusxasi)                                                                                             |

Qo'shimcha: loyihada `openai` npm paketi **yo'q** — REST API'ga to'g'ridan-to'g'ri `fetch` qilinadi (`route.ts:100`). Bu ataylab qilingan va yaxshi qaror: bog'liqlik kamayadi, bundle kichik qoladi.

---

## 2. Tekshirilgan holat

Barcha buyruqlar 2026-09-19 kuni shu commitda ishga tushirildi:

| Buyruq             | Natija                    | Izoh                                                   |
| ------------------ | ------------------------- | ------------------------------------------------------ |
| `npx tsc --noEmit` | **exit 0**                | Strict rejimda 0 xato                                  |
| `npm run lint`     | **exit 0**                | 0 xato, 0 ogohlantirish                                |
| `npm test`         | **117/117 o'tdi, 6 fayl** | 1.33 s                                                 |
| `npm run build`    | **exit 0**                | 12 marshrut, 14 sahifa prerender, 14.6 s kompilyatsiya |

Test fayllari: `lib/engine/engine.test.ts`, `lib/ai/agent.test.ts`, `lib/ai/demo-engine.test.ts`, `lib/ai/run-tool.test.ts`, `lib/ai/conversation.test.ts`, `lib/store/business-store.test.ts`.

Bu raqamlar **tuzatishlardan keyingi** holat. Ko'rik boshlanganda: `tsc` exit 1 (11 xato), ESLint exit 1 (2 parse xatosi), `vitest` exit 1 (117 emas, 113 test — `business-store.test.ts` umuman yuklanmagan), `next build` **FAILED**.

`lib/i18n/translations.ts` dagi `point3Title` ("117 ta avtomatlashtirilgan test") hozir haqiqiy songa mos. Test soni o'zgarganda bu satrni ham yangilash kerak — aks holda namoyish ekranida noto'g'ri raqam chiqadi.

**Build marshrutlari:** `/`, `/_not-found`, `/api/chat` (dinamik), `/app`, `/app/business-plan`, `/app/chat`, `/app/finance`, `/app/loan`, `/app/market`, `/app/simulator`, `/app/tax`, `/icon.png`.

**CI:** `.github/workflows/ci.yml` — `push: main` va har bir PR'da typecheck → lint → test → build. To'rt bosqich ham majburiy. Node 24, `npm ci`. Sozlama to'g'ri.

### Matematikaning mustaqil tekshiruvi

Demo ssenariysidagi raqamlar qo'lda qayta hisoblandi va **aniq mos keldi**:

| Ko'rsatkich                                              | Kod natijasi | Mustaqil hisob |
| -------------------------------------------------------- | ------------ | -------------- |
| 50 mln, 24%, 24 oy — oylik annuitet to'lov               | 2 643 555    | 2 643 555 ✅   |
| Marja (35 000 − 18 000) bo'yicha kredit uchun oylik hajm | 156 ta       | 156 ta ✅      |
| Kunlik hajm (30 kun)                                     | 6 ta         | 6 ta ✅        |

`calculateLoan` (`lib/engine/loan.ts:52`) standart annuitet formulasini to'g'ri qo'llaydi, 0% va nol muddat chekka holatlari alohida ishlangan.

---

## 3. Arxitektura (kod bilan tekshirilgan)

```
              [ Foydalanuvchi / DemoGuide doki ]
                              │
                              │ POST /api/chat   { stream: true }
                              ▼
        ┌─────────────────────────────────────────┐
        │ app/api/chat/route.ts                   │
        │  · ChatRequestSchema (Zod) — faqat      │
        │    user/assistant rollari qabul qilinadi│
        │  · hit() — xotiradagi rate limit        │
        │  · ReadableStream (SSE)                 │
        │  · runAgent() — shu fayl ichida (:128)  │
        └───────────────┬─────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        ▼ kalit bor                     ▼ kalit yo'q / natija to'liq emas
┌─────────────────────┐        ┌──────────────────────────────┐
│ runAgent()          │        │ lib/ai/demo-engine.ts        │
│ fetch → OpenAI REST │        │ · extractNumbers()           │
│ gpt-4o-mini         │        │ · detectIntent() — 11 qoida  │
│ MAX_AGENT_STEPS = 5 │        │ · 10 ta handler              │
└──────────┬──────────┘        └───────────────┬──────────────┘
           │                                    │
           └─────────────┬──────────────────────┘
                         ▼  lib/ai/run-tool.ts — 8 ta vosita
              ┌──────────────────────────────┐
              │ lib/engine/*  ◄── SOF MATEMATIKA
              │  loan.ts · profit.ts         │  Tashqi bog'liqliksiz,
              │  breakeven.ts · cashflow.ts  │  determinstik, testlangan
              │  tax.ts · analyzer.ts        │
              │  assumptions.ts ◄ yagona     │
              │    taxminlar manbai          │
              └──────────────┬───────────────┘
                             ▼ SSE: status → step → done
                  components/chat/ — CalculationCard
```

### Kuchli tomon: `lib/engine/` ning tozaligi

Dvigatel sof funksiyalardan iborat, hech qanday I/O yoki global holatga bog'liq emas. `lib/engine/assumptions.ts` esa alohida maqtovga loyiq: barcha taxminiy koeffitsiyentlar (`COST_SPLIT`, `UNIT_ECONOMICS`, `DEFAULT_TURNOVER_TAX_PERCENT`) bitta faylda markazlashtirilgan. Fayl izohida yozilishicha, ilgari bu raqamlar 5 ta faylda takrorlanib, bir-biriga zid bo'lgan. Bu to'g'ri tuzatish.

### Kuchli tomon: server tomonda prompt nazorati

`ChatRequestSchema` (`lib/ai/chat-config.ts:27`) mijozdan faqat `user` va `assistant` rollarini qabul qiladi. Tizim ko'rsatmasi har doim serverda qo'shiladi (`route.ts:135`) va bu `agent.test.ts:189` da test bilan qulflangan. Prompt injection orqali tizim qoidalarini almashtirish yo'li yopiq.

---

## 4. Topilmalar

### 🟢 B1 · Striming yo'lida OpenAI xatosi zaxira dvigatelga tushmaydi — [HAL QILINDI]

**Holat:** `runAgent` chaqiruvi endi o'z `try/catch` iga olingan (`route.ts:241-289`), `catch` faqat `console.warn` qiladi va boshqaruv pastdagi zaxira dvigatelga o'tadi — JSON yo'lidagi naqsh bilan aynan bir xil. Test `agent.test.ts:211-235` da: `stream: true` bilan `fetch` rad etiladi, SSE oqimi o'qiladi va `done` hodisasi `source: "fallback"`, `intent: "LOAN_CALCULATION"` bilan kelishi hamda **birorta `error` hodisasi bo'lmasligi** tekshiriladi. Striming yo'li endi test bilan qoplangan.

Quyidagi tahlil muammo qanday topilganini hujjatlashtirish uchun saqlanadi.

**Fayl:** `app/api/chat/route.ts:283`, `:309`, `:342`
**Jiddiylik:** Yuqori — namoyish paytida ko'rinadigan xato

Striming yo'lida `runAgent` hech qanday o'z `try/catch` iga o'ralmagan:

```ts
// route.ts:269 — stream start() ichidagi tashqi try
try {
  if (apiKey) {
    const result = await runAgent(apiKey, conversation, locale, ...);  // :283
    if (result) { /* done */ }
  }
  const engineResult = processWithSmartDemoEngine(query, locale);      // :309 — zaxira
  ...
} catch (err) {
  send({ type: "error", ... });                                        // :342
}
```

`runAgent` **qaytarganda** (`null` yoki zanjir to'liq emas) — zaxira dvigatel ishlaydi, hammasi joyida. Lekin `runAgent` **exception tashlaganda** boshqaruv to'g'ridan-to'g'ri `:342` ga sakraydi va `:309` dagi zaxira umuman bajarilmaydi. Foydalanuvchi hisob-kitob o'rniga xato xabarini oladi.

Qachon exception tashlanadi:

- `AbortSignal.timeout(30_000)` ishga tushsa (`route.ts:108`) — OpenAI sekin javob bersa;
- `fetch` tarmoq darajasida yiqilsa — DNS, internet uzilishi, TLS xatosi.

Ya'ni bu **aynan "internet uzilsa"** ssenariysi — namoyish rejasining 6-qadamida kafolat sifatida aytiladigan holat.

Nega e'tibordan chetda qolgan:

1. JSON yo'lida zaxira **bor** (`route.ts:371-399`) — u yerda `runAgent` `try/catch` ichida;
2. Yagona zaxira testi (`agent.test.ts:154`) `stream: true` yubormaydi, ya'ni JSON yo'lini tekshiradi;
3. UI esa doimo `stream: true` yuboradi (`app/app/chat/page.tsx:102`).

Natijada testlar yashil, lekin jonli yo'l himoyalanmagan. **Striming yo'li umuman test bilan qoplanmagan.**

**Yechim:** `runAgent` chaqiruvini alohida `try/catch` ga olish, `catch` da hech narsa qilmasdan pastdagi zaxira dvigatelga o'tkazib yuborish — JSON yo'lidagi naqsh bilan bir xil. Va `stream: true` uchun zaxira testini qo'shish.

---

### 🟡 B2 · Zanjir handleri foydalanuvchi ma'lumotini e'tiborsiz qoldiradi — [QISMAN HAL QILINDI]

**Holat:** ikkala aniq kamchilik ham tuzatildi — `resolveUnitEconomics(text, locale)` endi foydalanuvchi matnini oladi (kofexona so'ralganda kofexona raqamlari chiqadi), va `assumedParts` har bir taxmin qilingan parametrni javob matnida ikkala tilda ochiq yozadi, `handleLoan` o'rnatgan naqsh bo'yicha. Lekin o'rniga kelgan pozitsion evristika yangi B8 muammosini keltirib chiqardi — pastga qarang.

**Fayl:** `lib/ai/demo-engine.ts:449`, `:457`
**Jiddiylik:** O'rta — "raqamlar to'qilmaydi" da'vosiga zid

`handleChainedLoanBreakEven` ichida ikkita qat'iy belgilangan qiymat bor:

```ts
const unit = resolveUnitEconomics("fast food", locale); // :449 — matn emas, konstanta
const baselineFixedCost = 15_400_000; // :457 — Urganch demosining xarajati
```

**Birinchisi:** biznes turi foydalanuvchi matnidan olinmaydi. Taqqoslash uchun — `handleBreakEven:984` xuddi shu funksiyani `text` bilan chaqiradi va kofexona so'ralganda kofexona raqamlarini beradi. Zanjir handlerida esa kofexona haqidagi savol ham fast food birlik iqtisodiyotini (35 000 / 18 000) qaytaradi.

**Ikkinchisi jiddiyroq:** `baselineFixedCost` — demo ssenariysining o'zgarmas xarajati. Javobda chiqadigan _"barcha o'zgarmas xarajatlar + kreditni qoplash uchun oyiga 1 062 ta (kuniga 36 ta)"_ raqami foydalanuvchi kiritgan summadan qat'i nazar shu 15,4 mln asosida chiqadi. Foydalanuvchi 200 mln kredit haqida so'rasa ham, baza xarajat o'zgarmaydi.

Muhimi: **bu taxmin javob matnida oshkor qilinmagan.** Boshqa handlerlar bu borada namunali — `handleLoan:747` taxmin qilingan parametrlarni "⚠️ So'rovingizda ko'rsatilmagani uchun quyidagilar taxminan olindi" deb ochiq yozadi, `handleBusinessPlan:1116` ham shunday. Zanjir handleri esa jim qoladi.

Faqat kredit to'lovini qoplash uchun kerak bo'lgan hajm (156 ta / kuniga 6 ta) to'liq to'g'ri va faqat foydalanuvchi raqamlariga asoslangan — muammo faqat ikkinchi, "to'liq qoplash" raqamida.

**Yechim:** `text` ni `resolveUnitEconomics` ga uzatish; `baselineFixedCost` ni `amounts` dan olish yoki topilmasa javobda taxmin sifatida ochiq yozish.

---

### 🟢 B3 · QQS bazasi ehtimol oshirib hisoblangan — [HAL QILINDI]

**Holat:** `TaxCalculationInput` ga `isVatInclusive?: boolean` qo'shildi, standart `true`. Yalpi konvensiyada chiqim QQSi `revenue × 12/112`, kirim QQSi `vatableCosts × 12/112`, foyda solig'i bazasi esa sof tushum va sof xarajat farqidan olinadi. Tanlangan konvensiya `assumptions` ro'yxatida ikkala tilda ochiq yoziladi va sahifada chiziladi (`tax/page.tsx:327`). `engine.test.ts:243-267` 112 mln / 56 mln misolida 6 mln QQSni tekshiradi.

Muhimi: yalpi konvensiyada `profitAfterTax` hamon `revenue − expenses − taxAmount` ga **aniq teng** bo'lib qoladi (`outputVat` va `inputVat` hadlari qisqaradi), shuning uchun kartadagi raqamlar bir-biriga mos kelaveradi. Sof (`isVatInclusive: false`) konvensiyada esa QQS ataylab foydadan ayirilmaydi — bu to'g'ri buxgalteriya va `assumptions` da shunday deb yozilgan.

⚠️ Standart `true` bo'lgani uchun **mavjud foydalanuvchilarning umumiy rejimdagi QQS raqami ~11% ga o'zgardi**, va UI'da bu konvensiyani almashtirish tugmasi yo'q — faqat `assumptions` matnida ko'rinadi. Buxgalter roli uchun toggle qo'shish tavsiya etiladi.

**Fayl:** `lib/engine/tax.ts:168-173`, `:193`
**Jiddiylik:** O'rta — buxgalter tasdig'i talab qilinadi

```ts
const addedValue = Math.max(0, revenue - vatableCosts);
const netVat = addedValue * (vatRate / 100); // 12%
```

Kod `revenue` ni **QQS'siz (net)** summa deb qabul qiladi. Amalda tadbirkor "oylik tushum" maydoniga kassaga tushgan **yalpi** summani yozadi — unda QQS allaqachon ichida bo'ladi. Bunday holda chiqim QQSi `revenue × 12 / 112` (≈ 10,71%) bo'lishi kerak, `revenue × 12%` emas. Farq taxminan **12% ga ortiqcha QQS**.

Ikkinchi masala — `:193`:

```ts
profitAfterTax: Math.round(revenue - expenses - taxAmount);
```

`taxAmount` ichida sof QQS bor. QQS esa mijozdan undiriladi va byudjetga o'tkaziladi — u korxonaning xarajati emas. Agar `revenue` QQS'siz bo'lsa, QQSni foydadan ayirish sof foydani kamaytirib ko'rsatadi.

Bu sof kod xatosi emas — modellashtirish qarori. Lekin qaysi konvensiya tanlangani hech qayerda yozilmagan, `assumptions` ro'yxatida ham yo'q.

**Yechim:** `TaxCalculationInput` ga `isVatInclusive?: boolean` qo'shish (standart: `true`, chunki foydalanuvchi odatda yalpi summa yozadi) va tanlangan konvensiyani `assumptions` matniga kiritish. Aylanma va YaTT rejimlarida bu masala yo'q — ular to'g'ri.

---

### 🟢 B4 · `getServerSnapshot` har chaqiruvda yangi obyekt qaytarishi — [HAL QILINDI]

**Fayl:** `lib/store/demo-store.ts:133-139`
**Holat:** Modul darajasidagi barqaror `DEFAULT_SERVER_SNAPSHOT` obyekti va `getDemoServerSnapshot()` funksiyasi yaratildi. Har bir SSR renderda bitta kesh obyekt qaytariladi, React cheksiz sikl xavfi to'liq bartaraf etildi.

---

### 🟢 B5 · Raqamlar tartibi jimgina ahamiyatli bo'lishi — [HAL QILINDI]

**Fayl:** `lib/ai/demo-engine.ts`
**Holat:** `extractNumbers` ga matndagi har bir summa o'rnini qaytaruvchi `spans` qo'shildi va `resolveDebtBurdenAmounts` funksiyasi joriy etildi. Foydalanuvchi kreditni birinchi yozsa ham (masalan, _"50 mln kredit olsam, tushumim 40 mln, xarajatim 25 mln"_), kalit so'z yaqinligi (affinity scoring) bo'yicha tushum (40 mln), xarajat (25 mln) va kredit (50 mln) xatosiz bog'lanadi. Agar 2 ta ko'rsatkich kiritilsa, aynan qaysi biri yetishmayotgani aniqlanadi va aniq so'raladi.

---

### 🟢 B6 · Rate limit ko'p instansli muhitda sinxronlashishi va klient kaliti — [HAL QILINDI]

**Fayl:** `lib/ai/rate-limiter.ts`, `app/api/chat/route.ts`
**Holat:** Taqsimlangan rate limit moduli yaratildi (`checkRateLimit`):

- `UPSTASH_REDIS_REST_URL` va `UPSTASH_REDIS_REST_TOKEN` mavjud bo'lsa, Upstash Redis REST API orqali pipeline (INCR + EXPIRE) bilan barcha serverless/lambda instanslar bo'yicha yagona rate limit ta'minlanadi.
- Redis sozlanmagan bo'lsa yoki tarmoq xatosi bo'lsa, zaxira sifatida xotiradagi (in-memory) `hitMemory` ga xavfsiz va shaffof o'tadi (fallback).
- `getClientKey` yaxshilandi: platforma sarlavhalari (`x-vercel-forwarded-for`, `cf-connecting-ip`, `x-real-ip`), Next.js runtime `req.ip`, sessiya sarlavhalari (`x-client-id`) tekshiriladi; proksisiz lokal/self-hosted muhitda barcha foydalanuvchilar bitta "unknown"ga tushib qolmasligi uchun brauzer signaturasi bilan differensiatsiya qilinadi.
- To'liq Vitest testlari yozildi (`lib/ai/agent.test.ts`).

---

### 🟢 B7 · Mayda tozalash — [HAL QILINDI]

| Joy                         | Muammo / Holat                                                                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `lib/ai/chat-config.ts:63`  | `total -= kept[0].content.length` — o'lik kod olib tashlandi [HAL QILINDI]                                                                       |
| `logo.png` (ildizda)        | Ortiqcha dublikat fayl repo ildizidan o'chirildi (`git rm logo.png`), barcha havolalar `public/logo.png` dan to'g'ri ishlamoqda [HAL QILINDI]    |
| `app/icon.png`              | 293 KB — favikon uchun katta. Keyingi optimizatsiyada siqish tavsiya etiladi                                                                     |
| `lib/ai/demo-engine.ts:164` | `vat\b` old chegarasizligi `\bvat\b` ga o'zgartirildi, "savat" kabi so'zlarda noto'g'ri soliq intenti qo'zg'alishi bartaraf etildi [HAL QILINDI] |

---

### 🟠 B8 · Zanjir handleri tushum kalit so'zlarini bilmaydi

**Fayl:** `lib/ai/demo-engine.ts:486-511`
**Jiddiylik:** O'rta — "raqamlar to'qilmaydi" da'vosiga qisman zid

`handleChainedLoanBreakEven` o'z pozitsion evristikasini yuritadi: ikki yoki undan ko'p summa bo'lsa, `amounts[0]` → kredit, `amounts[1]` → o'zgarmas xarajat deb belgilaydi, faqat `xarajat|ijara|fixed|operat` va `kredit|loan` kalit so'zlarining matndagi o'rniga qarab. **Tushum tushunchasi umuman yo'q**, shuning uchun _"50 mln kredit oldim, oyiga 100 mln tushum"_ so'rovida 100 mln tushum jimgina o'zgarmas xarajat sifatida ishlatiladi.

Shu bilan birga yangi `resolveDebtBurdenAmounts` (`demo-engine.ts:775-899`) aynan shu vazifani to'g'ri bajaradi: tushum, xarajat va kredit kalit so'z oilalari bo'yicha span asosidagi affinity scoring, hamda 2 ta summa kiritilganda qaysi biri yetishmayotganini aniqlash.

**Yechim:** `resolveDebtBurdenAmounts` ni umumlashtirib zanjir handleridan chaqirish; ikkinchi, kuchsizroq nusxani saqlamaslik.

---

### 🟠 B9 · Bank xodimi roli hech narsa qilmaydi

**Fayl:** `lib/i18n/translations.ts`, `components/layout/sidebar.tsx:153`
**Jiddiylik:** O'rta — namoyishda ko'rinadigan bo'shliq

Yangi "Mutaxassis roli" tanlagichi 4 ta rolni taklif qiladi, lekin **Bank xodimi** rolini tanlash ilovada hech narsani o'zgartirmaydi — faqat avatar harflari `BK` ga aylanadi. Tarjimalarda tayyor turgan, ammo **hech qayerda chizilmaydigan** kalitlar:

`underwritingHeading`, `underwritingBadge`, `dtiLabel`, `dtiSafe`, `dtiModerate`, `dtiHigh`, `dscrLabel`, `bankDecisionLabel`, `roles.activeRoleBadge`, `roles.selectRole` — ikkala tilda.

Taqqoslash uchun: **Buxgalter** roli `/app/tax` da 3 rejimli jadvalni ochadi, **Konsultant** roli sidebar'da mijoz profillarini ochadi. Bu ikkalasi ishlaydi.

**Yechim:** yo DTI/DSCR panelini qurish (matematika `lib/engine/` da tayyor — `analyze_debt_burden`, `calculateLoan`), yo rolni tanlagichdan va kalitlarni `translations.ts` dan olib tashlash. Namoyishda ishlamaydigan tugma bo'lgani — umuman bo'lmaganidan yomonroq.

---

### 🟢 B10 · QQSsiz shoxdagi o'lik kod

**Fayl:** `lib/engine/tax.ts:214-220`
**Jiddiylik:** Past — tozalash

`isVatInclusive === false` shoxida `outputVat` va `inputVat` hisoblanadi, lekin **hech qayerda o'qilmaydi** — `netVat` mustaqil ravishda `max(0, revenue − vatableCosts) × stavka` sifatida chiqariladi. Matematik natija bir xil, farq faqat `Math.max` ning qayerda qo'llanilishida (bazaga emas, natijaga).

**Yechim:** `netVat = max(0, outputVat − inputVat)` qilib yozish — shunda clamping yalpi shox bilan bir xil bo'ladi va o'zgaruvchilar ishlatiladi; yoki ikkala tayinlashni olib tashlash.

---

### 🟢 B11 · QQSsiz konvensiyada effektiv stavka oshirib ko'rsatiladi

**Fayl:** `lib/engine/tax.ts:246`
**Jiddiylik:** Past

`effectiveTaxRate = taxAmount / revenue`, va `taxAmount` ichida `netVat` bor. Sof (QQSsiz) konvensiyada QQS tushumning **ustiga** qo'shib undiriladi, undan ayirilmaydi — shuning uchun uni sof tushumga bo'lish soliq yuklamasini oshirib ko'rsatadi. Shu shoxning o'zi `assumptions` da "QQS korxona xarajati hisoblanmagani uchun sof foydadan ayirilmaydi" deb yozadi, ya'ni hujjat va hisob bir-biriga zid.

**Yechim:** `isVatInclusive === false` bo'lganda `netVat` ni nisbatdan chiqarish.

---

### 🟢 B12 · `NextRequest.ip` bu Next.js versiyasida mavjud emas

**Fayl:** `lib/ai/rate-limiter.ts:51-52`
**Jiddiylik:** Past — o'lik kod, lekin xavfsizlik izohi aniqlashtirilishi kerak

```ts
const reqIp = (req as unknown as { ip?: string }).ip;
```

`ip` xossasi `NextRequest` dan shu versiyadan (16.3.5) oldin olib tashlangan — `unknown` orqali cast qilingani uchun TypeScript indamaydi, lekin qiymat **doim `undefined`**.

Ikkinchi, muhimroq nuqta: `x-client-id` va `x-session-id` `x-forwarded-for` dan **oldin** tekshiriladi (`:55-57`). Ikkalasi ham mijoz yuboradigan sarlavha, ya'ni chaqiruvchi har so'rovda yangi `x-client-id` yuborib o'zining shaxsiy AI chegarasini nolga qaytara oladi. Amaliy himoya — `ai:__global__` (120/daqiqa) chegarasi. Demo uchun bu maqbul, lekin izohda shundoq yozilishi kerak, hozir esa aksi nazarda tutilgandek o'qiladi.

**Yechim:** `req.ip` blokini olib tashlash; `getClientKey` izohiga "sessiya sarlavhalari soxtalashtirilishi mumkin, haqiqiy chegara — global bucket" deb yozish.

---

## 5. Ochiq arxitektura masalalari

### O1 · Soliq stavkalarini buxgalter tasdiqlashi

`UZ_TAX_REGIMES` (`tax.ts:16`) tuzilmasi to'g'ri va `sumBreakdown` yig'indi bilan jadval mos kelishini kafolatlaydi. Lekin B3 dagi QQS bazasi masalasi va YaTT qat'iy summasi (500 000 + 375 000) amaliyotchi buxgalter ko'rigidan o'tishi kerak — bular hudud va faoliyat turiga qarab farq qiladi.

### 🟢 O2 · Stavkalar kodda qattiq yozilgan bo'lishi — [HAL QILINDI]

`lib/engine/tax.ts` dagi `calculateTax` funksiyasiga ixtiyoriy `customConfig?: Partial<Record<TaxRegimeType, Partial<TaxRegimeConfig>>>` parametri qo'shildi. Endi stavkalarni DB yoki boshqaruv panelidan uzatish mumkin, deploy talab etilmaydi. O'tkazilmagan holda standart `UZ_TAX_REGIMES` avtomatik qo'llanadi.

### O3 · Supabase ulanmagan

`supabase/schema.sql` (175 satr) — jadvallar va RLS siyosatlari tayyor, lekin `@supabase/supabase-js` `package.json` da yo'q. Barcha holat `localStorage` / `sessionStorage` da (`business-store.tsx`, `language-store.tsx`, `demo-store.ts`). Sidebar'dagi "Demo Tadbirkor" statik.

Hakaton uchun bu **to'g'ri tanlov** — hakam ro'yxatdan o'tmasdan darhol foydalana oladi. Ko'p qurilmali sinxronizatsiya va admin panel uchun keyin ulanadi.

### 🟢 O4 · Test qamrovidagi bo'shliqlar — [HAL QILINDI]

- `/api/chat` ning striming yo'li — B1 da test bilan to'liq qoplandi (`agent.test.ts`).
- `lib/engine/tax.ts` ning `general` rejimi QQS chekka holatlari — zarar ko'rayotgan biznes (`expenses > revenue`), tushum nol bo'lgan holat va xarajatdan oshgan `vatableExpenses` cheklovlari bo'yicha alohida testlar qo'shildi (`engine.test.ts`).
- B6 rate limit va klient aniqlash bo'yicha keng qamrovli testlar yozildi (`agent.test.ts`), Upstash Redis yo'li ham mock `fetch` bilan qoplangan. Jami testlar soni **117** ta (6 fayl, hammasi yashil).

**Qolgan bo'shliq — komponent testlari yo'q.** Aynan shuning uchun `tax/page.tsx:42` dagi `"yatt"` crash'i, sidebar va business-store'dagi uchta buzilgan render testlardan o'tib ketdi: `vitest` faqat sof funksiyalar va route handler'ni tekshiradi, birorta `.tsx` render qilinmaydi. `@testing-library/react` qo'shilishi kerak.

---

## 6. Namoyish ssenariysi (3 daqiqa)

Header'dagi **`[ 🎬 3-Daqiqalik Demo ]`** tugmasi pastki boshqaruv dokini ochadi (`components/layout/demo-guide.tsx`, holat `lib/store/demo-store.ts` da, 6 bosqich).

| #   | Bosqich      | Vaqt | Harakat va gap                                                                                                                                                                                     |
| --- | ------------ | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Kirish       | 15 s | Asosiy sahifa. _"O'zbekistonda kichik biznes ochayotganlarning katta qismi moliyaviy hisob-kitobni tushunmagani uchun birinchi yilda qiynaladi. Bussy — ularning moliyaviy tahlilchisi."_          |
| 2   | Ssenariy     | 45 s | `Ssenariyni yuborish` (Urganch Fast Food, 100 mln, 50 mln kredit). _"Kartalardagi raqamlar AI tomonidan to'qilmagan — ular `lib/engine/` dagi formulalardan chiqqan."_                             |
| 3   | **Zanjir**   | 45 s | `Zanjirni ishga tushirish`. Avval `calculate_loan` → **2 643 555 so'm/oy**, so'ng `calculate_break_even` → kuniga **6 ta** qo'shimcha sotuv. _"Agent ikkita mustaqil vositani zanjirga bog'ladi."_ |
| 4   | Simulyator   | 30 s | `/app/simulator` — slayderlar, real vaqtda qayta hisob                                                                                                                                             |
| 5   | Biznes-reja  | 30 s | `/app/business-plan` → PDF                                                                                                                                                                         |
| 6   | Ishonchlilik | 15 s | 117 ta test, sof dvigatel                                                                                                                                                                          |

**✅ 6-qadam bo'yicha:** "internet uzilsa ham ishlaydi" kafolatini endi bemalol ayting — B1 hal qilindi va striming yo'lidagi tarmoq uzilishi `agent.test.ts:211-235` da test bilan qulflangan. Demo paytida Wi-Fi ni o'chirib ko'rsatish ham mumkin.

Shunga qaramay **kalitsiz namoyish qilish hamon ishonchliroq**: `OPENAI_API_KEY` bo'lmasa lokal dvigatel ishlaydi, zanjir deterministik bo'ladi va sahnada model kutilmagan javob bermaydi (`agent.test.ts:174`).

**⚠️ Rol tanlagichini namoyish qilsangiz:** Buxgalter (3 rejimli soliq jadvali) va Konsultant (mijoz profillari) ishlaydi. **Bank xodimi rolini ko'rsatmang** — u hozircha hech narsa qilmaydi (B9).

---

## 7. Yo'l xaritasi (texnik qarz)

> **Mahsulot yo'l xaritasi bu yerda emas** — u `AGENTS.md` dagi "Продуктовый роадмап"
> bo'limida (buxgalter tasdig'i → Supabase → to'lovlar → Telegram bot → Mini App → Didox).
> Navbatdagi muhandislik vazifalari esa `TASKS.md` da. Bu bo'lim faqat muhandislik
> qarzini kuzatadi.

### Hakaton oldidan

- [x] **B1** — striming yo'liga zaxira dvigatel fallback'ini qo'shish _(eng ustuvor, ~10 satr)_
- [x] **B1-test** — `stream: true` bilan tarmoq xatosi testi
- [x] **B2** — zanjir handleriga `text` uzatish; qat'iy xarajatni javobda oshkor qilish
- [x] **Buzilgan birlashtirishlarni tuzatish** — `tsc`, ESLint, `vitest`, `next build` to'rtalasi ham yashil
- [ ] **B9** — Bank xodimi rolini yo qurish, yo tanlagichdan olib tashlash _(namoyishdan oldin eng ustuvor)_
- [ ] 3 daqiqalik namoyishni dok orqali 2 marta to'liq mashq qilish

### 1-oy

1. [x] **B3** — QQS konvensiyasini aniqlash va joriy qilish (`isVatInclusive?: boolean`, 12/112 yalpi konvensiya, sof foyda hisobi)
2. [x] **B4, B5, B7** — barqarorlik va tozalash
3. [ ] **B8** — zanjir handlerini `resolveDebtBurdenAmounts` ga o'tkazish
4. [ ] **B10, B11, B12** — `tax.ts` va `rate-limiter.ts` dagi tozalash
5. [ ] **QQS toggle'i** — buxgalter roli uchun yalpi/sof konvensiyani almashtirish tugmasi (B3 ga qarang)
6. [ ] **Komponent testlari** — `@testing-library/react` _(B9 va `"yatt"` crash'i aynan shu bo'shliqdan o'tgan)_
7. [x] **Redis rate limit** (B6) — ko'p instansli muhit uchun (Upstash Redis REST + in-memory fallback)

---

## 8. Ilgari bartaraf etilgan muammolar

Bular kod va izohlar bo'yicha tasdiqlangan — oldingi bosqichlarda hal qilingan:

| Yo'nalish   | Muammo                                                       | Yechim                                                                               | Tasdiq                                                               |
| ----------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------- | ------------------ |
| Xavfsizlik  | Mijoz `system` rolini yubora olardi                          | Zod sxemasi faqat `user`/`assistant` ga ruxsat beradi                                | `chat-config.ts:27`, test `agent.test.ts:189`                        |
| Xavfsizlik  | XSS (`dangerouslySetInnerHTML`)                              | React komponentlari bilan almashtirildi                                              | Butun kod bo'yicha qidiruvda faqat izoh qoldi: `chat-message.tsx:33` |
| Aniqlik     | QQS sof foydadan 12% deb olinardi                            | Qo'shilgan qiymat zanjiriga o'tkazildi                                               | `tax.ts:166-173` (B3 — qolgan nuance)                                |
| Aniqlik     | YaTT ijtimoiy solig'i jadvalda ko'rinib, jamiga qo'shilmasdi | `sumBreakdown` yig'indini kafolatlaydi                                               | `tax.ts:233`                                                         |
| Aniqlik     | `"50 000 000"` umuman o'qilmasdi                             | `TOKEN_RE` guruhlangan raqamlarni qo'llaydi                                          | `demo-engine.ts:73`                                                  |
| Aniqlik     | Barcha biznes turlari bir xil 35 000/18 000 olardi           | 5 ta tur bo'yicha birlik iqtisodiyoti                                                | `assumptions.ts:45`                                                  |
| Aniqlik     | Taxminlar 5 ta faylda takrorlanib, zid edi                   | `assumptions.ts` — yagona manba                                                      | `assumptions.ts:1-10`                                                |
| Barqarorlik | 30 tadan ortiq xabar 400 xato berardi                        | `trimConversation` — rad etmaydi, qisqartiradi                                       | `chat-config.ts:48`                                                  |
| Barqarorlik | Agent faqat 1 raund vosita chaqirardi                        | `MAX_AGENT_STEPS = 5` tsikli                                                         | `route.ts:140`, test `agent.test.ts:63`                              |
| UX          | Agent ichida nima bo'layotgani ko'rinmasdi                   | SSE `status` / `step` / `done`                                                       | `route.ts:257-368`                                                   |
| UX          | 404 va xatolik sahifalari yo'q edi                           | `not-found.tsx`, `error.tsx`, `global-error.tsx`, `app/app/error.tsx`, `loading.tsx` | fayllar mavjud                                                       |
| UX          | Barcha sahifada bitta `<title>`                              | `%s                                                                                  | Bussy`shabloni + 7 ta segment`layout.tsx`                            | build: 12 marshrut |
| Sifat       | Testlar yo'q edi                                             | 117 ta Vitest testi + 4 bosqichli CI                                                 | `npm test`, `ci.yml`                                                 |

---

## 9. Yakuniy baho

| Jihat               | Baho             | Izoh                                                                                   |
| ------------------- | ---------------- | -------------------------------------------------------------------------------------- |
| Arxitektura         | **Kuchli**       | Dvigatel / agent / UI ajratilgani namunali. LLM hisoblamaydi — tanlaydi                |
| Matematika aniqligi | **Kuchli**       | Mustaqil tekshiruvda mos keldi. QQS konvensiyasi aniqlandi va oshkor qilinadi (B3)     |
| Xavfsizlik          | **Yetarli**      | Prompt injection yopiq; taqsimlangan rate limit bor, lekin klient kaliti soxtalashtirilishi mumkin (B12) |
| Test qamrovi        | **O'rtacha**     | Dvigatel, agent va striming yo'li yaxshi qoplangan; **komponent testlari umuman yo'q** |
| Xatoga chidamlilik  | **Kuchli**       | JSON ham, striming ham zaxira dvigatelga tushadi va ikkalasi test bilan qulflangan     |
| Jarayon intizomi    | **Bo'shliq bor** | Kompilyatsiya bo'lmaydigan daraxt "100% green" deb hujjatlashtirilgan edi               |
| Hujjatlashtirish    | **Kuchli**       | Kod izohlari nima uchun shunday qilinganini tushuntiradi — kamdan-kam uchraydi         |

**Xulosa:** loyihaning muhandislik sifati yuqori, ayniqsa izohlar orqali qarorlar sababini saqlash odati, va B1–B7 tuzatishlarining o'zi sifatli bajarilgan. Eng katta xavf endi kodda emas, **jarayonda**: buzilgan daraxt yashil deb yozilgan bo'lsa, hujjatga ishonib bo'lmaydi.

Namoyishdan oldin majburiy emas, lekin qat'iy tavsiya etiladi: **B9** (Bank xodimi rolini yo qurish, yo olib tashlash) — hakam aynan o'sha tugmani bosishi ehtimoli yuqori.
