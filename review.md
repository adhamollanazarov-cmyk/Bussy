# Bussy — Code Review & Product Roadmap

**Review date:** 2026-09-19 · branch `main`
**Scope:** 7 212 lines of TS/TSX across `app/`, `components/`, `lib/`, plus `supabase/schema.sql`
**Stack:** Next.js 16.3.5 (App Router) · React 19.2.8 · Tailwind v4 · TypeScript 5 · Recharts 3 · Zod 4 · Vitest 5

> **No code was changed in this pass.** This document is a review plus answers to three product
> questions: an admin panel ([§5](#5-admin-panel)), specialist roles such as accountants
> ([§6](#6-specialist-roles)), and what to improve before showing this to hackathon judges
> ([§7](#7-hackathon-readiness)).

---

## Qisqacha xulosa

Kod holati yaxshi: 82 ta test o'tadi, `tsc` va ESLint toza, build ishlaydi, agent tsikli
ishlamoqda. Bu ko'rikda **5 ta yangi kamchilik** topildi — hech biri kritik emas, lekin
uchtasi aynan hakaton namoyishi uchun muhim. Ikkitasi endi tuzatildi:

- ~~**Xatolik sahifasi yo'q**~~ ✅ **Tuzatildi** ([N1](#n1)) — endi brendlangan 404, xatolik
  chegaralari va yuklanish skeleti bor.
- **Barcha 9 sahifada bitta sarlavha** — faqat ildiz layout'da `metadata` bor.
- ~~**Faqat o'zbek tili**~~ ✅ **Tuzatildi** ([N4](#n4)) — endi to'liq o'zbek/ingliz tugmasi bor,
  interfeys ham, moliyaviy hisob-kitoblar matni ham (soliq, kredit, biznes-reja) ikkala tilda.

Uch savolga javob: **admin panel** — eng qimmatlisi soliq stavkalarini deploy'siz tahrirlash
(bu O1 muammosini hal qiladi); **mutaxassis rejimlari** — bitta dvigatel, turli chuqurlik,
hakaton uchun arzon va ta'sirli; **hakaton** — 3 daqiqalik ssenariy va 5 ta arzon yaxshilanish
[§7](#7-hackathon-readiness) da.

---

## 1. Current state

| Check | Result |
|---|---|
| `npx tsc --noEmit` | clean |
| `npm run lint` | 0 errors, 0 warnings |
| `npm run build` | passes (13 routes) |
| `npm test` | 82 passing (5 files) |
| All 9 page routes | HTTP 200 |
| Unmatched routes | HTTP 404 + branded page ([N1](#n1)) |
| Thrown render error | Caught by boundary, navigation stays usable ([N1](#n1)) |
| Language | Full uz/en toggle, UI + engine text, verified in a browser ([N4](#n4)) |
| Agent chaining | 2-step tool chain verified via mocked OpenAI |
| CI | `.github/workflows/ci.yml` |

---

## 2. Architecture

```
app/app/chat/page.tsx ──── trims history to last 20 messages
        │  POST { userMessage, messages[] }
        ▼
app/api/chat/route.ts      Zod validation · tiered rate limit · 30s timeouts
        │
        ├── OPENAI_API_KEY? ──► runAgent()  — up to 5 tool-calling rounds
        │                          └─► lib/ai/run-tool.ts ─► lib/engine/*
        └── otherwise ────────► lib/ai/demo-engine.ts (ordered intent rules)
                                   └─► lib/engine/*
        ▼
components/chat/chat-message.tsx ─► one CalculationCard per agent step
```

`lib/engine/` is the backbone: pure, dependency-free, and the only place arithmetic happens. The
agent orchestrates; it never computes. **Every recommendation below is designed to preserve that
property** — it is the project's main technical asset.

---

## 3. New findings

None is critical. Three matter specifically for the hackathon demo.

<a id="n1"></a>
### N1 · No error, loading or 404 pages — ✅ **Fixed**

`app/` had no `error.tsx`, `global-error.tsx`, `not-found.tsx` or `loading.tsx`. Any uncaught
render error showed a bare "Application error" in production, and a mistyped URL got Next's
default English 404 in an otherwise fully Uzbek product.

**Five files added:**

| File | Role |
|---|---|
| `app/not-found.tsx` | Branded Uzbek 404 with routes back into the app |
| `app/error.tsx` | Root segment boundary (landing page) |
| `app/app/error.tsx` | App-section boundary — **sidebar and header stay usable** |
| `app/global-error.tsx` | Last resort if the root layout itself fails |
| `app/app/loading.tsx` | Skeleton between app sections |

**API note for this Next.js version:** the error-boundary prop is **`retry`**, not `reset` as in
earlier versions. This matters because the prop type is declared locally, so TypeScript would
*not* catch the old name — the button would simply be `undefined` and throw on click. Verified by
clicking it in a browser: no `is not a function` error.

`global-error.tsx` replaces the root layout entirely, so Tailwind and fonts don't reach it — all
its styling is inline and it imports nothing.

**Verified:** `/yoq-sahifa`, `/app/mavjud-emas`, `/app/loan/xxx` all return HTTP 404 with the
branded page; a deliberately throwing route rendered the app boundary with navigation intact and
the error digest shown for reporting. The temporary probe route was removed afterwards.

<a id="n2"></a>
### N2 · All nine pages share one `<title>`

Only `app/layout.tsx` exports `metadata`. Every page — dashboard, chat, loan, tax, simulator,
business plan, market — renders the same title and description.

Two costs: a judge who opens several tabs sees nine identical ones, and there is no per-page SEO.
Each page needs ~4 lines of `export const metadata`.

<a id="n3"></a>
### N3 · The user identity is fake, and it blocks the role questions

`components/layout/sidebar.tsx` hardcodes "Demo Tadbirkor" / "demo@bussy.uz", and the "Chiqish"
(log out) link simply navigates to `/`. There is no session to end.

This is honest enough for a demo, but it is the concrete blocker for both the admin panel and
specialist roles: **there is no user, so there is no role.** `supabase/schema.sql` has a `users`
table but **no `role` column** — the only `role` in the schema is the chat-message role
(`'user' | 'assistant' | 'system' | 'tool'`), which is a different concept entirely.

Any work in [§5](#5-admin-panel) or [§6](#6-specialist-roles) starts here.

<a id="n4"></a>
### N4 · Single language, hardcoded — ✅ **Fixed** (full uz/en toggle)

`app/layout.tsx` set `lang="uz"` and every string in the codebase was Uzbek literal text. §7.2
originally recommended the cheap option (a printed English summary, or English labels on key
numbers only) and explicitly advised against full i18n before the deadline. **The user asked for
the full toggle anyway, accepting the larger scope.**

**What was built:**

| Layer | Approach |
|---|---|
| Language store | `lib/i18n/language-store.tsx` — same `useSyncExternalStore` + localStorage pattern as `business-store.tsx` (`bussy_locale` key), so it needed no new architecture |
| Dictionary | `lib/i18n/translations.ts` — one `Record<Locale, …>` per page/namespace, both languages type-checked against the same shape |
| UI chrome | Sidebar, header, landing page, dashboard, all 7 calculator pages, chat UI, 404/error boundaries, chart legends and axes — every static string replaced with `t.<namespace>.<key>` |
| Engine layer | `calculateTax`, `calculateCashflow`, `analyzeDebtBurden`, `analyzeBusinessIdea`, `generateStructuredBusinessPlan`, `resolveUnitEconomics` all take an optional `locale` (default `"uz"`) and return **localized labels, verdicts, assumptions and disclaimers** — not just localized UI around untranslated numbers |
| Chat / AI | `detectIntent` and `extractNumbers` in `lib/ai/demo-engine.ts` now also match English keywords and units, so English-language questions route correctly through the local fallback engine; `lib/ai/prompts.ts` exports `getSystemPrompt(locale)` so the real OpenAI path answers in the requested language too |
| `<html lang>` | Static `"uz"` on first paint (SSR), synced client-side by `components/i18n/html-lang-sync.tsx` when the user switches |

**Why default parameters were safe:** every engine function's `locale` parameter defaults to
`"uz"` and every existing call site was left unchanged unless it needed to become locale-aware.
All 82 pre-existing tests pass unmodified — they exercise the default Uzbek behavior, which is
byte-for-byte the same as before.

**Deliberately out of scope:** `formatMoney`/`formatCompactMoney` (`lib/utils.ts`) always append
`so'm` — 204 call sites use them. So'm was treated as the currency's actual name (like leaving
"₽" in an English UI for a Russian service) rather than translatable UI text, so it was not
threaded through every call site. The demo business's seeded data (`business.name`,
`targetCustomer`, etc. in `lib/store/business-store.tsx`) also stays in Uzbek in English mode —
it's user-entered data, not app copy, the same way a real user's own business name wouldn't be
auto-translated.

**Verified in a browser (Playwright):** toggled uz → en on the landing page, confirmed `<html
lang>` updates and persists across navigation via `localStorage`; dashboard, loan, tax, business
plan, simulator and market pages full screenshots in English; chat demo-scenario prompt answered
entirely in English on the real OpenAI path (`getSystemPrompt("en")`); 404 page renders translated
in English; toggling back to `uz` restores Uzbek immediately. `npm run build`, `tsc`, ESLint and
all 82 tests pass.

<a id="n5"></a>
### N5 · Tax rates and business assumptions are compile-time constants

`UZ_TAX_REGIMES` in `lib/engine/tax.ts` and `UNIT_ECONOMICS` in `lib/engine/assumptions.ts` are
`const` objects baked into the bundle. Changing a tax rate, or adding a business type such as a
beauty salon, requires a developer, a code change and a deploy.

Uzbek tax rates change yearly. This is a maintenance problem today and the strongest argument for
an admin panel — see [§5](#5-admin-panel), where it turns the permanently-open [O1](#o1) into a
routine operational task.

---

## 4. Carried-over open items

<a id="o1"></a>
**O1 · Tax rates need professional sign-off.** The *structure* is correct (VAT from value added;
`taxAmount` derived from breakdown lines so they can't disagree), and the 60% input-VAT assumption
is now a user-editable field rather than a hidden constant. But the rates themselves and that
default are not something code review can settle. **An accountant should review all three regimes
before real users rely on them.** See [§5](#5-admin-panel) for how to stop this recurring annually.

<a id="o2"></a>
**O2 · `supabase/schema.sql` is unwired — a product decision.** RLS policies, `auth.users`
reference, triggers and indexes are in place, but nothing imports it and `@supabase/supabase-js`
isn't installed. All state lives in `localStorage`: no cross-device persistence, no accounts.
This is now the gating decision for [§5](#5-admin-panel) and most of [§6](#6-specialist-roles).

<a id="o3"></a>
**O3 · No component-level tests.** Engine, tool dispatcher, conversation handling and the agent
loop are covered. React components are not — `useSeededState` and multi-step card rendering were
verified in a browser, so they can regress silently. Needs `@testing-library/react` + `jsdom`.

<a id="o4"></a>
**O4 · Environment hygiene, outside the repo.** `.venv/` in the project root (gitignored, harmless
but misplaced), and the stray `package.json`/`node_modules` in `C:\Users\LENOVO` that cause
Turbopack workspace-root warnings.

---

## 5. Admin panel

**Short answer: yes, and there's one feature that justifies it on its own.**

### 5.1 Why — the strongest case is tax-rate management

Right now, when Uzbekistan changes a tax rate, the sequence is: accountant notices → tells a
developer → developer edits `lib/engine/tax.ts` → code review → deploy. That is slow, and it puts
a developer in the path of a decision only an accountant can make.

An admin panel where a verified accountant edits rates directly **converts [O1](#o1) from a
permanent open risk into a routine operational task.** That is the feature to build first — not
user management, not analytics.

The same applies to `UNIT_ECONOMICS`: adding "go'zallik saloni" as a business type with its own
average cheque currently requires a deploy.

### 5.2 How — without breaking the engine

The critical constraint: `lib/engine/*` must stay pure. Do **not** make `calculateTax` fetch from
a database. Instead, pass configuration in:

```ts
// hozir
calculateTax({ regime, revenue, expenses })          // UZ_TAX_REGIMES ni ichidan oladi

// taklif
calculateTax({ regime, revenue, expenses }, config)  // config tashqaridan beriladi
// config default qiymati = UZ_TAX_REGIMES, shunda mavjud chaqiruvlar buzilmaydi
```

The route and pages load the config (from DB, cached) and pass it down. The engine stays a pure
function, all 82 tests keep working, and rates become data instead of code.

**Rates need versioning, not just editing.** A tax calculation made in January under old rates
must remain reproducible. Store `effective_from` / `effective_to` per rate set, and record which
version produced each saved calculation. For a financial tool this is not optional — it's what
makes past reports defensible.

### 5.3 Scope, in priority order

| Feature | Value | Effort |
|---|---|---|
| Tax rate editor with versioning | **Very high** — solves [O1](#o1) | Medium |
| Business-type / unit-economics editor | High — new verticals without deploys | Low |
| Usage analytics (popular questions, tools used) | Medium — product direction | Low |
| User and role management | Medium — needed for [§6](#6-specialist-roles) | Medium |
| Conversation review (quality control of AI answers) | High for a financial product | Medium |

### 5.4 What blocks it

Authentication. An admin panel without auth is worse than none — anyone could change the tax rates
the whole product relies on. So [O2](#o2) must be decided first: Supabase Auth is the natural
choice since the schema is already written for it.

Minimum viable route: `app/admin/` route group, server-side role check on every request,
`role = 'admin'` column on `users`, RLS policies extended so only admins can write the rates table.

> **Не начинайте это перед хакатоном.** Auth + admin + миграция ставок — это неделя минимум,
> и в процессе приложение будет нестабильным. See [§7.4](#74-what-not-to-do-before-the-demo).

---

## 6. Specialist roles

**Short answer: yes, and it's cheaper than it sounds — because the engine already serves every
role. What changes is depth, defaults and language, not the maths.**

### 6.1 Which roles are worth having

| Role | What they need that's different | Reuses today's engine? |
|---|---|---|
| **Tadbirkor** (current default) | Plain explanations, one recommendation, "what do I do next" | — |
| **Buxgalter** (accountant) | All three tax regimes side by side, every assumption exposed and overridable, export to Excel, no beginner explanations | Fully |
| **Bank / kredit mutaxassisi** | Debt-burden focus, risk scoring against bank thresholds, standardised one-page client summary | Fully |
| **Konsultant** | Several client businesses, switching between them, comparison | Needs multi-profile store |

The first three are essentially **presentation layers over the same calculations**. Only the
consultant role requires real architectural change — the store holds exactly one business today
(`BusinessState` in `lib/store/business-store.tsx`), and multi-client means turning that into a
collection with a selector.

### 6.2 What actually changes per role

Concretely, in existing files:

1. **System prompt** → `lib/ai/prompts.ts` becomes `getSystemPrompt(role)`. An accountant doesn't
   need "break-even nima" explained; an entrepreneur does. Same tools, different register and
   depth.
2. **Visible navigation** → `NAV_ITEMS` in `components/layout/sidebar.tsx` filtered by role. A loan
   officer doesn't need the business-plan generator.
3. **Defaults and disclaimers** → an accountant should see the raw `assumptions[]` and be able to
   override every one; an entrepreneur gets a summary and a warning.
4. **Depth of output** → the tax page already computes all three regimes; an accountant view could
   show them side by side rather than one at a time. That's a UI change, not an engine change.

### 6.3 The cheap version, worth doing for the hackathon

A **role switcher that changes only the system prompt and the visible depth** demonstrates the
whole idea convincingly and costs roughly a day:

- add `role` to `BusinessState` (client-side only, no auth needed);
- three prompt variants in `prompts.ts`;
- filter `NAV_ITEMS`;
- a selector in the sidebar.

No database, no auth, no migration. And it makes a strong point to judges: *one calculation
engine, three professional audiences.* That is a product story, not a feature list.

### 6.4 One caution specific to this domain

A "buxgalter rejimi" implies professional-grade output. Do not ship that label while [O1](#o1) is
open — an accountant will check the rates within a minute, and being wrong in front of a
professional costs more credibility than not having the mode at all. Either get the rates
reviewed first, or label it "Buxgalter uchun kengaytirilgan ko'rinish (demo)".

---

## 7. Hackathon readiness

The product demos well already — the fallback engine means it cannot hard-fail, the UI is
polished, and the agent is a genuine differentiator. The improvements below are ordered by
impact-per-hour.

### 7.1 Do these first — cheap, high impact

| # | Improvement | Why | Effort |
|---|---|---|---|
| ~~1~~ | ~~**Error + 404 pages** ([N1](#n1))~~ | ✅ **Done** — boundaries added and verified in a browser | — |
| ~~2~~ | ~~**Language access for judges** ([N4](#n4))~~ | ✅ **Done** — full uz/en toggle, verified in a browser | — |
| 3 | **Per-page titles** ([N2](#n2)) | Nine identical tabs looks unfinished | ~30 min |
| 4 | **Show agent progress** | A 5-round chain takes 10–15 s behind one spinner. Judges read that as "slow". The `steps[]` data already exists — render each step as it lands | 2–3 h |
| 5 | **Scripted demo path** | See 7.3. Costs nothing and is the single biggest determinant of how the demo lands | — |

### 7.2 The language question — ✅ resolved ([N4](#n4))

This section originally weighed three options, cheapest first — a printed English summary,
English labels on key metrics only, or a full toggle — and recommended against the full toggle
before the deadline (a day or more of work). **The user asked for the full toggle anyway; see
[N4](#n4) for what was built and verified.** The three-minute demo script in [§7.3](#73-a-three-minute-demo-script)
can now be run in either language by clicking the UZ/EN switch in the sidebar or header.

### 7.3 A three-minute demo script

The order matters — it builds from "nice calculator" to "this is different".

1. **Landing → "Bussy bilan boshlash"** (15 s). Establish the audience: small businesses in
   Uzbekistan, in their own language.
2. **Chat → the demo scenario prompt** (45 s). Urganch, 100 mln + 50 mln credit. Point at the
   result card: *these numbers came from formulas, not from the model.* This is the core claim.
3. **Chat → a chaining question** (45 s): *"Kreditni qoplash uchun kuniga nechta sotishim kerak?"*
   Point at the two step badges. **This is the "wow" moment** — the agent decided to run two
   calculations in sequence. Most hackathon AI demos are a single prompt and a single answer.
4. **What-if simulator** (30 s). Move the price slider, watch break-even move live. Visual, instant,
   no waiting.
5. **Business plan → PDF** (30 s). A concrete artefact the user walks away with.
6. **Close on reliability** (15 s): pull the API key and show it still works. Deterministic engine,
   no hard failure. Judges remember demos that don't break.

### 7.4 What *not* to do before the demo

- **Don't start auth / Supabase / the admin panel.** It's a week of work and leaves the app
  unstable in the middle.
- **Don't add new calculation modules.** Breadth is not what's missing; the existing ones are
  deeper than most hackathon projects.
- **Don't label anything "buxgalter rejimi"** until the rates are reviewed ([§6.4](#64-one-caution-specific-to-this-domain)).

### 7.5 Points worth making to judges explicitly

These are real strengths that are invisible unless stated:

- **"The AI does not invent numbers."** Every figure comes from a pure function in `lib/engine/`;
  the model only decides which calculation to run and explains the result. This is the opposite of
  most LLM demos, and it is the right architecture for financial advice. The step badges make it
  visible on screen.
- **It degrades gracefully.** Three independent fallbacks — agent exhausts, API fails, or no key at
  all — and the deterministic engine answers. The demo cannot die on stage.
- **It's tested.** 82 tests over the financial engine and the agent loop, running in CI. Unusual
  for a hackathon project and easy to show.
- **It's honest about uncertainty.** Every analysis returns its assumptions and the UI renders
  them; the chat asks for figures rather than inventing them. For a product people make borrowing
  decisions on, that judgement is worth more than another feature.

---

## 8. Prioritised roadmap

**Before the hackathon (≈1 day):** ~~[N1](#n1) error pages~~ ✅ done, ~~[N4](#n4) language
toggle~~ ✅ done → [N2](#n2) page titles → agent step streaming → rehearse
[§7.3](#73-a-three-minute-demo-script) in both languages. Optionally the cheap role switcher
([§6.3](#63-the-cheap-version-worth-doing-for-the-hackathon)) if there's a spare day — it's a
strong story.

**Right after:** get the tax rates reviewed by an accountant ([O1](#o1)). Everything professional
depends on it.

**Then, in order:** decide Supabase + auth ([O2](#o2)) → admin panel starting with the versioned
tax-rate editor ([§5](#5-admin-panel)) → real roles on top of auth ([§6](#6-specialist-roles)) →
component tests ([O3](#o3)).

---

## 9. Resolved in earlier passes

Condensed; all verified by tests or runtime checks.

| Area | What was wrong | Resolution |
|---|---|---|
| Security | XSS via unescaped `dangerouslySetInnerHTML` | Renders React nodes; none remains |
| Security | `/api/chat` an open proxy; client could inject a `system` role | Zod validation, server-owned system message, caps, tiered rate limit, timeouts |
| Security | Rate limit bypassable via `X-Forwarded-For` | Platform headers trusted first; global AI budget |
| Security | Supabase schema had no RLS | Policies on all six tables |
| Correctness | Tax breakdown didn't sum to its own total | Total derived from breakdown lines; test per regime |
| Correctness | VAT modelled as 12% of *profit* | Computed from value added ([O1](#o1) for the rates) |
| Correctness | Plain-digit amounts silently replaced with defaults | Parser fixed; asks instead of fabricating |
| Correctness | Assumptions duplicated across 5 files, contradictory (60/40 vs 55/45) | `lib/engine/assumptions.ts` as single source |
| Correctness | Hardcoded `941` break-even, `2 650 000` loan payment | Computed from the engine |
| Reliability | Chat died permanently after ~15 exchanges | Truncates instead of rejecting; 199 msgs → 200 OK |
| Reliability | `npm run build` failed (Turbopack + lightningcss) | Pinned to `--webpack`; upstream issue |
| Routing | 2 of 7 quick-prompts wrong; tax engine unreachable from chat | Tax branch + `calculate_tax` tool |
| Routing | Follow-up button routed to loan calc instead of debt-burden | Ordered intent rules, most-specific-first |
| UX | Break-even chart marker never rendered | Numeric X axis; verified visually |
| UX | "Demo holatiga qaytarish" left edited fields untouched | Store revision counter |
| UX | Four `setTimeout` stubs presented as AI analysis | Removed |
| UX | UI guaranteed accuracy against its own safety rule | Copy softened |
| Feature | Single-round tool calling, no chaining | `runAgent()` — up to 5 rounds, bounded, transparent |
| Quality | 15 ESLint errors / 131 warnings; no tests; no CI | 0/0; 82 tests; CI workflow |

Dependency changes across all passes: `@types/node` `^20` → `^24`, `vitest` added as a dev
dependency. No runtime dependencies were added.
