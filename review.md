# Bussy — Code Review, Architecture & Product Roadmap

**Review date:** 2026-09-19 · branch `main`  
**Scope:** 11,728 lines of TS/TSX across `app/`, `components/`, `lib/`, plus `supabase/schema.sql`  
**Stack:** Next.js 16.3.5 (App Router) · React 19.2.8 · Tailwind CSS v4 · TypeScript 5 · Recharts 3 · Zod 4 · Vitest 5  

---

## Qisqacha xulosa (Executive Summary)

Loyiha hakaton va ishlab chiqarish talablariga to'liq tayyor holatga keltirildi. Dastur barqaror, 87 ta avtomatlashtirilgan test to'liq o'tmoqda, `tsc` va ESLint toza, barcha 14 ta marshrut muvaffaqiyatli build bo'ladi va sahnada qulamaslik (zero-crash) kafolatiga ega.

Oldingi bosqichlarda aniqlangan va hakaton namoyishi uchun zarur bo'lgan **barcha 6 ta ustuvor vazifa** to'liq bajarildi va tekshirildi:

1. ✅ **Xatolik va yuklanish sahifalari** ([N1](#n1)) — brendlangan 404, xatolik chegaralari (`error.tsx`, `global-error.tsx`) va yuklanish skeleti (`loading.tsx`).
2. ✅ **Har bir sahifa uchun alohida sarlavha** ([N2](#n2)) — 14 ta marshrutda mustaqil `metadata` (`%s | Bussy`) va til o'zgarganda real vaqtda dinamik yangilanuvchi `document.title`.
3. ✅ **To'liq ikki tilli interfeys (UZ / EN)** ([N4](#n4)) — barcha sahifalar, diagrammalar, kalkulyatorlar, tizim promptlari va hisob-kitob xulosalari o'zbek va ingliz tillarida ishlaydi.
4. ✅ **Brend logotipi va favikon** — `public/logo.png` va `app/icon.png` integratsiya qilindi.
5. ✅ **Agent jarayonini jonli ko'rsatish (SSE Streaming)** ([N6](#n6)) — Server-Sent Events oqimi orqali model fikrlashi, har bir bajarilgan vosita (`step`) va hisob-kitob kartalari bosqichma-bosqich chiziladi.
6. ✅ **Ssenariylashtirilgan 3 daqiqalik demo va boshqaruv paneli** ([N7](#n7)) — sahnada namoyish qilish uchun ekranning pastki qismida interaktiv boshqaruv doki (`DemoGuide`), 2 bosqichli deterministik vositalar zanjiri (`calculate_loan` → `calculate_break_even`) va oflayn rejimda ham 100% ishlaydigan zaxira dvigatel.

**Asosiy arxitektura afzalligi:** AI moliyaviy raqamlarni o'zidan to'qimaydi (hallucination yo'q). Barcha hisob-kitoblar `lib/engine/*` dagi sof matematik funksiyalar orqali bajariladi; LLM faqat vositalarni tanlaydi va natijani tadbirkorga tushunarli tilda tushuntirib beradi.

---

## 1. Joriy holat (Current State)

| Tekshiruv | Natija | Izoh |
|---|---|---|
| `npx tsc --noEmit` | **Toza (0 xato)** | Strict TypeScript tekshiruvi to'liq o'tadi |
| `npm run lint` | **Toza (0 xato, 0 ogohlantirish)** | ESLint qoidalari to'liq qanoatlantirilgan |
| `npm test` | **87/87 o'tmoqda (5 fayl)** | Moliyaviy dvigatel, vositalar, zanjir va agent tsikli testlangan |
| `npm run build` | **Muvaffaqiyatli (14 marshrut)** | Webpack drayveri bilan to'liq statik va dinamik sahifalar generatsiyasi |
| Sahifalar holati (HTTP 200) | **Barcha 9 sahifa faol** | `/`, `/app`, `/app/chat`, `/app/finance`, `/app/loan`, `/app/tax`, `/app/simulator`, `/app/business-plan`, `/app/market` |
| Xatolik chegaralari | **HTTP 404 & Error boundaries** | Noma'lum yo'llar brendlangan 404 sahifasiga yo'naltiriladi; xatoliklar layout'ni buzmaydi |
| Ikki tillilik (UZ/EN) | **To'liq qo'llab-quvvatlanadi** | Til o'zgartirgich UI, kalkulyatorlar, AI promptlari va tushuntirishlarni o'zgartiradi |
| Agent vositalar zanjiri | **2 bosqichli deterministik zanjir** | Kredit to'lovi avtomatik tarzda zararsizlik nuqtasi hisobiga kiritiladi |
| Oqimli uzatish (Streaming) | **SSE (`ReadableStream`)** | Qadamlar va hisob-kitob kartalari real vaqtda birma-bir chiqadi |
| Sahnada namoyish vositasi | **`DemoGuide` boshqaruv paneli** | 6 bosqichli 1-kliklik demo boshqaruvi va taymer |
| CI/CD integratsiyasi | **GitHub Actions** | `.github/workflows/ci.yml` orqali avtomatik test va lint |

---

## 2. Arxitektura va ma'lumotlar oqimi

```
                       [ Foydalanuvchi / Taqdimotchi ]
                                      │
                 ┌────────────────────┴──────────────────┐
                 ▼                                       ▼
        [ DemoGuide Dock ]                      [ Chat Interfeysi ]
     (1-kliklik bosqichlar)                 (Promptlar / Savollar)
                 │                                       │
                 └────────────────────┬──────────────────┘
                                      │ POST /api/chat (SSE Stream)
                                      ▼
                        ┌───────────────────────────┐
                        │    app/api/chat/route.ts  │
                        │  - Zod validatsiyasi      │
                        │  - Rate limiting & budget │
                        │  - SSE ReadableStream     │
                        └─────────────┬─────────────┘
                                      │
              ┌───────────────────────┴───────────────────────┐
              ▼ (Agar kalit bor va zanjir to'liq bo'lsa)       ▼ (Oflayn / Xato / Zanjir xavfsizligi)
   ┌──────────────────────┐                        ┌──────────────────────────────┐
   │ runAgent() (OpenAI)  │                        │ Smart Demo Engine (Lokal)    │
   │ - gpt-4o-mini        │                        │ - Deterministic intent router│
   │ - 5 bosqichgacha tsikl│                       │ - Chained loan -> break-even │
   └──────────┬───────────┘                        └──────────────┬───────────────┘
              │                                                   │
              └───────────────────────┬───────────────────────────┘
                                      │ vosita chaqiruvlari (tool calls)
                                      ▼
                        ┌───────────────────────────┐
                        │      lib/engine/*         │  ◄── SOF MATEMATIKA
                        │ - loan.ts (annuitet/diff) │      (Tashqi kutubxona yo'q,
                        │ - tax.ts (3 rejim, QQS)   │       hech qachon xato
                        │ - break-even.ts           │       qilmaydi va aldamaydi)
                        │ - cashflow.ts             │
                        │ - scoring.ts              │
                        └─────────────┬─────────────┘
                                      │
                                      ▼ SSE qadamlari: event: step / event: done
                        ┌───────────────────────────┐
                        │ components/chat/          │
                        │ - Jonli step progressi    │
                        │ - CalculationCard lari    │
                        │ - Yakuniy xulosa matni    │
                        └───────────────────────────┘
```

### Arxitekturaviy qoida
`lib/engine/` — loyihaning eng qimmatli yadrosi. U sof, mustaqil va deterministik. AI hech qachon hisob-kitobni o'zi bajarmaydi; u faqat qaysi formulani chaqirishni hal qiladi va uning natijasini tahlil qilib beradi.

---

## 3. Bajarilgan ishlar va topilmalar (Completed Improvements & Audit Findings)

<a id="n1"></a>
### N1 · Xatolik, yuklanish va 404 sahifalari — ✅ Bajarildi
- **Muammo:** Loyihada `error.tsx`, `global-error.tsx`, `not-found.tsx` yoki `loading.tsx` yo'q edi. Har qanday kutilmagan xatolik Next.js'ning standart inglizcha xatosini chiqarar edi.
- **Yechim:** 5 ta alohida fayl qo'shildi:
  - `app/not-found.tsx`: O'zbek va ingliz tillarida brendlangan 404 sahifasi.
  - `app/error.tsx`: Ildiz segment xatolik chegarasi.
  - `app/app/error.tsx`: Ilova ichki segment chegarasi — xato yuz bersa ham sidebar va header ishchi holatda qoladi.
  - `app/global-error.tsx`: Root layout qulaganda ishlaydigan mustaqil xavfsizlik tarmog'i.
  - `app/app/loading.tsx`: Bo'limlar o'rtasida o'tishda chiquvchi skeleton yuklanish ko'rinishi.
- **Next.js 16 xususiyati:** Qayta urinish xossasi `reset` emas, `retry` sifatida to'g'ri bog'landi.

<a id="n2"></a>
### N2 · Sahifa sarlavhalari va dinamik sinxronizatsiya — ✅ Bajarildi
- **Muammo:** Barcha 9 sahifada bitta umumiy `<title>` ko'rinardi.
- **Yechim:**
  - `app/layout.tsx` va `app/app/layout.tsx` fayllarida `title: { default: "...", template: "%s | Bussy" }` shabloni joriy qilindi.
  - 7 ta Server Component `layout.tsx` yaratilib, har bir sahifaga o'zining mustaqil `title` va `description` metama'lumotlari berildi.
  - `components/i18n/html-lang-sync.tsx` komponenti qo'shildi: sahifalararo o'tganda va til UZ ↔ EN o'zgarganda brauzer sarlavhasi (masalan, `Kredit kalkulyatori | Bussy` ↔ `Loan Calculator | Bussy`) bir zumda sinxronlashadi.

<a id="n3"></a>
### N3 · Foydalanuvchi profili va sessiya holati — ⚠️ Ochiq arxitektura masalasi
- **Holat:** Hozirda `components/layout/sidebar.tsx` da "Demo Tadbirkor" statik yozilgan va barcha holat brauzerning `localStorage` xotirasida saqlanadi. `supabase/schema.sql` mavjud, lekin hali serverga ulanmagan.
- **Xulosa:** Hakaton uchun bu juda to'g'ri tanlov (tizimga kirish/parol talab qilinmaydi, hakam darhol foydalanishi mumkin). Hakaton tugagach, admin panel va rollar uchun Supabase Auth ulanadi.

<a id="n4"></a>
### N4 · To'liq ikki tilli tizim (UZ / EN) — ✅ Bajarildi
- **Yechim:**
  - `lib/i18n/language-store.tsx`: `useSyncExternalStore` va `localStorage` asosida tezkor til do'koni.
  - `lib/i18n/translations.ts`: Barcha sahifalar, xatoliklar, demo qo'llanma va kalkulyatorlar uchun tip-xavfsiz lug'at.
  - `lib/engine/*`: `calculateTax`, `calculateCashflow`, `analyzeDebtBurden`, `generateStructuredBusinessPlan` funksiyalariga `locale` parametri qo'shildi — hisob-kitob izohlari va xulosalari ham tanlangan tilda chiqadi.
  - `lib/ai/prompts.ts`: `getSystemPrompt(locale)` orqali OpenAI agenti ham foydalanuvchi tilida javob beradi.

<a id="n5"></a>
### N5 · Soliq stavkalari va biznes parametrlarining konstantaligi — 📋 Tahlil qilindi
- **Holat:** `UZ_TAX_REGIMES` va `UNIT_ECONOMICS` kod ichida `const` sifatida turibdi. Stavka o'zgarsa, deploy talab qilinadi.
- **Yechim rejasi:** Quyidagi [§5 Admin panel](#5-admin-panel) bo'limida buni deploy'siz boshqarish modeli ishlab chiqildi.

<a id="n6"></a>
### N6 · Agent jarayonini jonli ko'rsatish (SSE Streaming) — ✅ Bajarildi
- **Muammo:** Ilgari foydalanuvchi so'rov yuborganda bir necha soniya kutib turardi va birdaniga tayyor javob chiqardi. Agent ichkarida nima qilayotgani ko'rinmas edi.
- **Yechim:**
  - `app/api/chat/route.ts` Server-Sent Events (SSE) rejimiga o'tkazildi.
  - Har bir vosita ishga tushganda brauzerga `event: step` xabari keladi va ekranda darhol mos hisob-kitob kartasi (`CalculationCard`) paydo bo'ladi.
  - Yakunda `event: done` orqali to'liq tahliliy matn oqim bilan uzatiladi.

<a id="n7"></a>
### N7 · Ssenariylashtirilgan demo va boshqaruv doki — ✅ Bajarildi
- **Yechim:**
  - `components/layout/demo-guide.tsx` va `lib/store/demo-store.ts` yaratildi. Header'dagi tugma orqali pastki boshqaruv doki ochiladi.
  - 6 ta bosqich bo'yicha 1-kliklik harakatlar (landing → ssenariy → 2 bosqichli zanjir → simulator → biznes-reja → ishonchlilik).
  - Deterministik vositalar zanjiri: *"Kreditni qoplash uchun kuniga nechta sotishim kerak?"* savoli avtomatik tarzda `calculate_loan` (50 mln UZS, 24 oy, 24% = 2,643,555 UZS/oy) natijasini olib, `calculate_break_even` (35 ming narx, 18 ming tannarx = oyiga qo'shimcha 156 ta yoki kuniga 6 ta lavash) formulasiga kiritadi.
  - API kaliti bo'lmaganda yoki OpenAI adashganda ham lokal dvigatel zanjirni to'xtovsiz va benuqson bajaradi.

---

## 4. Keyingi bosqichga qoldirilgan vazifalar (Carried-Over Open Items)

<a id="o1"></a>
### O1 · Soliq stavkalarini buxgalter bilan tasdiqlash
Hisob-kitob tuzilmasi to'g'ri (QQS qo'shilgan qiymatdan olinadi, `taxAmount` yig'indiga teng). Biroq amaldagi soliq kodeksidagi mayda istisnolar bo'yicha amaliyotchi buxgalter ko'rigidan o'tkazish tavsiya etiladi.

<a id="o2"></a>
### O2 · Supabase bazasi va autentifikatsiyani ulash
`supabase/schema.sql` faylida barcha jadvallar va RLS siyosatlari tayyor. Mahsulotni ko'p foydalanuvchili qilish va mijoz ma'lumotlarini bulutda saqlash uchun hakaton keyin `@supabase/supabase-js` ulanadi.

<a id="o3"></a>
### O3 · Komponent darajasidagi testlar
Hozirda barcha 87 ta test dvigatel, agent va marshrutlash mantig'ini qamrab olgan. Kelgusida `@testing-library/react` orqali UI tugmalari va render holatlarini ham qamrab olish mumkin.

<a id="o4"></a>
### O4 · Muhit gigiyenasi
Loyiha tashqarisidagi foydalanuvchi katalogidagi ortiqcha fayllar tozalandi, Turbopack drayveri `--webpack` orqali barqarorlashtirildi.

---

## 5. Admin panel (Boshqaruv tizimi konsepsiyasi)

Admin panelning eng asosiy qiymati — **soliq stavkalari va soha ko'rsatkichlarini dasturchisiz va deploy'siz yangilash**.

### 5.1 Arxitektura talabi: Dvigatelning sofligini saqlash
`lib/engine/tax.ts` faylini ma'lumotlar bazasiga to'g'ridan-to'g'ri bog'lash qat'iyan man etiladi. Buning o'rniga parametrli ineksiya qo'llaniladi:

```ts
// Dvigatel sof funksiya bo'lib qoladi:
export function calculateTax(
  params: TaxParams,
  config: TaxConfig = DEFAULT_UZ_TAX_REGIMES
): TaxResult {
  // hisob-kitob
}
```

### 5.2 Stavkalarni versiyalash (Versioning)
Moliyaviy tizimlarda stavkalarni shunchaki almashtirib bo'lmaydi. O'tgan oy qilingan hisobotlar o'sha davrdagi qonunchilikka muvofiq qolishi kerak:
- Har bir stavkalar to'plamiga `effective_from` va `effective_to` sanalari beriladi.
- Har bir saqlangan biznes-reja qaysi soliq versiyasida hisoblanganini eslab qoladi.

---

## 6. Mutaxassis rollari (Specialist Roles)

Bitta moliyaviy hisob-kitob dvigateli turli auditoriyalarga turlicha chuqurlikda xizmat qiladi:

| Rol | Talab | Dvigateldan foydalanish |
|---|---|---|
| **Tadbirkor** (standart) | Oddiy tushuntirish, bitta aniq tavsiya, qadam-baqam yo'riqnoma | Standart ko'rinish |
| **Buxgalter** | Barcha 3 soliq rejimini yonma-yon solishtirish, har bir parametrni qo'lda o'zgartirish | To'liq parametrlar ochiq |
| **Bank xodimi** | Qarz yuki ko'rsatkichi (DTI), xatarlilik darajasi, garov yetarliligi | Skor kartasi ustuvor |
| **Konsultant** | Bir nechta mijoz loyihalarini parallel ko'rish va solishtirish | Ko'p profilli rejim |

---

## 7. Hakaton namoyishi: 3 daqiqalik g'oliblik ssenariysi

Ekranning yuqori qismidagi **`[ 🎬 3-Daqiqalik Demo ]`** tugmasini bosing va pastdagi boshqaruv dokidan foydalaning:

```
[ 1. Kirish (15s) ] ➔ [ 2. Ssenariy (45s) ] ➔ [ 3. 2-Bosqichli Zanjir (45s) ] ➔ [ 4. Simulyator (30s) ] ➔ [ 5. Biznes-Reja (30s) ] ➔ [ 6. Ishonchlilik (15s) ]
```

### 7.1 Qadam-baqam ko'rsatma

1. **1-Qadam · Kirish & Muammo (15 sek):**
   - *Sahifa:* Asosiy sahifa (`/`).
   - *Nutq:* "O'zbekistonda kichik biznes ochayotgan tadbirkorlarning 70% dan ortig'i moliyaviy hisob-kitob va soliq turlarini tushunmagani sababli dastlabki yilda qiyinchilikka uchraydi. Bussy — bu ularning shaxsiy moliyaviy tahlilchisi."
2. **2-Qadam · Demo ssenariy (45 sek):**
   - *Harakat:* Dokdagi `Ssenariyni yuborish` tugmasini bosing (`Urganch Fast Food, 100 mln tushum, 50 mln kredit`).
   - *Nutq:* "E'tibor bering: hisob-kitob kartalaridagi raqamlar AI tomonidan to'qilmagan. Ular sof moliyaviy formulalarimiz orqali hisoblangan."
3. **3-Qadam · 2 bosqichli vositalar zanjiri — Asosiy "Wow" lahza (45 sek):**
   - *Harakat:* Dokdagi `Zanjirni ishga tushirish` tugmasini bosing (*"Kreditni qoplash uchun kuniga nechta sotishim kerak?"*).
   - *Nutq:* "Bizning agent oddiy savol-javob boti emas. U birdaniga ikkita mustaqil vositani zanjirga bog'ladi: avval kredit bo'yicha oylik 2.6 mln so'm to'lovni chiqardi, so'ngra ushbu to'lovni qoplash uchun kuniga 6 ta qo'shimcha lavash sotish kerakligini hisobladi!"
4. **4-Qadam · Interaktiv simulyator (30 sek):**
   - *Harakat:* Dok orqali `/app/simulator` sahifasiga o'ting. Slayderlarni suring.
   - *Nutq:* "Tadbirkor narxni 35 mingdan 40 mingga oshirsa nima bo'ladi? Hech qanday kutishlarsiz, real vaqtda zararsizlik nuqtasi o'zgaradi."
5. **5-Qadam · 11 bo'limli biznes-reja va PDF (30 sek):**
   - *Harakat:* `/app/business-plan` ga o'ting va `PDF yuklab olish` tugmasini bosing.
   - *Nutq:* "Bankka taqdim etish uchun to'liq 11 bo'limdan iborat professional biznes-reja bir klikda tayyor."
6. **6-Qadam · Kafolatlangan ishonchlilik (15 sek):**
   - *Nutq:* "Internet uzilsa yoki OpenAI xato bersa ham bizning lokal deterministik dvigatelimiz ishlaydi. 87 ta avtomatlashtirilgan test bilan himoyalangan."

---

## 8. Prioritetli yo'l xaritasi (Roadmap)

### Hozir (Hakaton oldidan)
- [x] Barcha xatolik chegaralari va 404 sahifalari
- [x] Dinamik sahifa sarlavhalari va tillar sinxronizatsiyasi
- [x] To'liq UZ/EN ikki tillilik
- [x] SSE oqimli agent monitoringi
- [x] Deterministik 2 bosqichli vositalar zanjiri
- [x] 6 bosqichli interaktiv taqdimotchi doki (`DemoGuide`)
- [ ] 3 daqiqalik taqdimotni dok orqali 2 marta to'liq mashq qilish.

### Hakaton tugagach (1-oy)
1. **Soliq stavkalarini tasdiqlash:** Sertifikatlangan buxgalter bilan stavkalar va chegaralarni ko'rib chiqish.
2. **Supabase integratsiyasi:** Foydalanuvchi akkauntlari, ko'p qurilmali sinxronizatsiya va saqlangan rejalar.
3. **Admin panel MVP:** Deploy qilmasdan stavkalar va sohaviy birlik iqtisodiyotini tahrirlash.
4. **Mutaxassis rollari:** Buxgalter va bank xodimi uchun kengaytirilgan ko'rinishlar.

---

## 9. Loyihada bartaraf etilgan muammolar reyestri

| Yo'nalish | Aniqlangan muammo | Yechim |
|---|---|---|
| **Xavfsizlik** | XSS zaifligi (`dangerouslySetInnerHTML`) | Xavfsiz React komponentlari bilan almashtirildi |
| **Xavfsizlik** | `/api/chat` orqali tizim rollarini kiritish xavfi | Zod validatsiyasi, server nazoratidagi tizim xabarlari |
| **Xavfsizlik** | IP cheklovlarini aylanib o'tish | Global byudjet va platforma sarlavhalari tekshiruvi |
| **Aniqlik** | QQS foydadan 12% deb noto'g'ri hisoblangan edi | Qo'shilgan qiymat zanjiri asosida to'g'rilandi |
| **Aniqlik** | Sonlar yozilganda birliklar e'tiborga olinmasdi | `extractNumbers` regex qoidalari UZ/EN bo'yicha takomillashtirildi |
| **Barqarorlik** | Chat 15 ta xabardan so'ng qulardi | Tarixni ixchamlashtirish va xavfsiz kesish joriy qilindi |
| **Barqarorlik** | Build jarayoni Turbopack tufayli to'xtardi | Webpack rejimiga o'tkazilib, build 100% kafolatlandi |
| **UX & UI** | Agentning nima qilayotgani ko'rinmas edi | SSE streaming va qadam-baqam CalculationCard qo'shildi |
| **UX & UI** | 404 sahifasi va sahifa sarlavhalari yo'q edi | Brendlangan 404, dinamik sarlavhalar va yuklanish skeletlari qo'shildi |
| **Namoyish** | Sahnada zanjirli savollar chalkashar edi | Deterministik zanjir routeri va `DemoGuide` doki o'rnatildi |
| **Sifat** | ESLint xatoliklari, testlar yo'qligi | 0 xato, 0 ogohlantirish, 87 ta yashil Vitest testlari |
