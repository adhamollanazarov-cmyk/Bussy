"use client";

import React, { createContext, useCallback, useContext, useSyncExternalStore } from "react";
import { z } from "zod";
import { BusinessPlanData } from "@/lib/engine/types";

export interface BusinessState {
  name: string;
  type: string;
  location: string;
  initialCapital: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  potentialLoan: number;
  loanRate: number;
  loanMonths: number;
  employees: number;
  targetCustomer: string;
  isDemo: boolean;
}

export const DEFAULT_DEMO_BUSINESS: BusinessState = {
  name: "Fast Food Urganch",
  type: "Fast Food",
  location: "Urganch",
  initialCapital: 100_000_000,
  monthlyRevenue: 45_000_000,
  monthlyExpenses: 28_000_000,
  potentialLoan: 50_000_000,
  loanRate: 24,
  loanMonths: 24,
  employees: 4,
  targetCustomer: "Yoshlar, talabalar va shahar aholisi",
  isDemo: true,
};

/**
 * Saqlangan ma'lumot tekshiriladi va standart qiymatlar ustiga qo'yiladi.
 * Ilgari JSON.parse natijasi to'g'ridan-to'g'ri state ga yozilardi — sxema
 * o'zgarganda eski yozuvlardagi yo'q maydonlar `undefined` bo'lib qolardi.
 */
const BusinessSchema = z
  .object({
    name: z.string(),
    type: z.string(),
    location: z.string(),
    initialCapital: z.number(),
    monthlyRevenue: z.number(),
    monthlyExpenses: z.number(),
    potentialLoan: z.number(),
    loanRate: z.number(),
    loanMonths: z.number(),
    employees: z.number(),
    targetCustomer: z.string(),
    isDemo: z.boolean(),
  })
  .partial();

const STORAGE_KEY_BUSINESS = "bussy_business_data";
const STORAGE_KEY_PLAN = "bussy_saved_plan";

/* ============================================================
   TASHQI STORE
   ------------------------------------------------------------
   `useSyncExternalStore` ishlatiladi: server snapshot sifatida demo
   qiymatlar, klientda esa localStorage. Bu SSR mos kelmasligini ham,
   effekt ichida setState chaqirishni ham oldini oladi.
   ============================================================ */

let businessState: BusinessState = DEFAULT_DEMO_BUSINESS;
let planState: BusinessPlanData | null = null;
let loadedFromStorage = false;
/**
 * Har bir ANIQ yozuvda (updateBusiness / resetToDemo) oshadi.
 * `useSeededState` shu raqamga qarab foydalanuvchi tahririni bekor qiladi —
 * aks holda "Demo holatiga qaytarish" tugmasi tahrirlangan maydonni tiklamaydi.
 */
let storeRevision = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function loadFromStorage() {
  if (loadedFromStorage || typeof window === "undefined") return;
  loadedFromStorage = true;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY_BUSINESS);
    if (stored) {
      const parsed = BusinessSchema.safeParse(JSON.parse(stored));
      if (parsed.success) {
        // Standart qiymatlar ustiga qo'yiladi — yetishmayotgan maydonlar saqlanadi.
        businessState = { ...DEFAULT_DEMO_BUSINESS, ...parsed.data };
      }
    }
  } catch (e) {
    console.warn("Bussy: biznes ma'lumotini o'qib bo'lmadi", e);
  }

  try {
    const storedPlan = window.localStorage.getItem(STORAGE_KEY_PLAN);
    if (storedPlan) planState = JSON.parse(storedPlan) as BusinessPlanData;
  } catch (e) {
    console.warn("Bussy: saqlangan rejani o'qib bo'lmadi", e);
  }
}

/**
 * Boshqa tab'da o'zgarsa ham yangilanadi.
 * Faqat BIR MARTA o'rnatiladi: store'ga har bir obuna (har bir forma maydoni
 * ham obuna bo'ladi) alohida listener qo'shsa, ular yig'ilib ketardi.
 */
let storageListenerAttached = false;

function attachStorageListener() {
  if (storageListenerAttached || typeof window === "undefined") return;
  storageListenerAttached = true;

  window.addEventListener("storage", (event: StorageEvent) => {
    if (event.key === STORAGE_KEY_BUSINESS || event.key === STORAGE_KEY_PLAN) {
      loadedFromStorage = false;
      loadFromStorage();
      storeRevision += 1;
      emit();
    }
  });
}

function subscribe(listener: () => void) {
  loadFromStorage();
  attachStorageListener();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getBusinessSnapshot(): BusinessState {
  return businessState;
}

function getRevisionSnapshot(): number {
  return storeRevision;
}

function getRevisionServerSnapshot(): number {
  return 0;
}

function getBusinessServerSnapshot(): BusinessState {
  return DEFAULT_DEMO_BUSINESS;
}

function getPlanSnapshot(): BusinessPlanData | null {
  return planState;
}

function getPlanServerSnapshot(): BusinessPlanData | null {
  return null;
}

function persist(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("Bussy: saqlab bo'lmadi", e);
  }
}

/* ============================================================
   CONTEXT
   ============================================================ */

interface BusinessContextType {
  business: BusinessState;
  updateBusiness: (updates: Partial<BusinessState>) => void;
  resetToDemo: () => void;
  savedBusinessPlan: BusinessPlanData | null;
  saveBusinessPlan: (plan: BusinessPlanData) => void;
  /** Klientda localStorage o'qilganidan keyin `true`. */
  hydrated: boolean;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const business = useSyncExternalStore(
    subscribe,
    getBusinessSnapshot,
    getBusinessServerSnapshot
  );
  const savedBusinessPlan = useSyncExternalStore(
    subscribe,
    getPlanSnapshot,
    getPlanServerSnapshot
  );
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  const updateBusiness = useCallback((updates: Partial<BusinessState>) => {
    businessState = { ...businessState, ...updates, isDemo: false };
    storeRevision += 1;
    persist(STORAGE_KEY_BUSINESS, businessState);
    emit();
  }, []);

  const resetToDemo = useCallback(() => {
    businessState = DEFAULT_DEMO_BUSINESS;
    storeRevision += 1;
    persist(STORAGE_KEY_BUSINESS, businessState);
    emit();
  }, []);

  const saveBusinessPlan = useCallback((plan: BusinessPlanData) => {
    planState = plan;
    persist(STORAGE_KEY_PLAN, plan);
    emit();
  }, []);

  return (
    <BusinessContext.Provider
      value={{
        business,
        updateBusiness,
        resetToDemo,
        savedBusinessPlan,
        saveBusinessPlan,
        hydrated,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error("useBusiness must be used within a BusinessProvider");
  }
  return context;
}

/**
 * Store'dan kelgan qiymat bilan boshlanadigan, lekin foydalanuvchi
 * tahrirlagach mustaqil bo'lib qoladigan local state.
 *
 * Ikkita muammoni hal qiladi:
 *  1. localStorage hydration'dan keyin yuklanadi, useState esa faqat birinchi
 *     render'dagi qiymatni oladi — saqlangan ma'lumot formaga tushmasdi.
 *  2. Foydalanuvchi maydonni tahrirlagach, u boshqa store yangilanishlarini
 *     qabul qilmay qo'yardi — "Demo holatiga qaytarish" ishlamayotgandek
 *     ko'rinardi. Endi ANIQ yozuv (updateBusiness/resetToDemo) tahrirni bekor
 *     qiladi: foydalanuvchining aniq harakati local tahrirdan ustun turadi.
 */
export function useSeededState<T>(seed: T) {
  const revision = useSyncExternalStore(
    subscribe,
    getRevisionSnapshot,
    getRevisionServerSnapshot
  );

  const [value, setValue] = React.useState<T>(seed);
  const [prevSeed, setPrevSeed] = React.useState<T>(seed);
  const [prevRevision, setPrevRevision] = React.useState(revision);
  const [touched, setTouched] = React.useState(false);

  // React'ning rasmiy "tashqi qiymat o'zgarganda state'ni moslash" naqshi
  // (effekt emas — render vaqtida).
  if (prevRevision !== revision) {
    // Store'ga aniq yozildi: tahrirni unutamiz va yangi qiymatni olamiz.
    setPrevRevision(revision);
    setPrevSeed(seed);
    setTouched(false);
    setValue(seed);
  } else if (!Object.is(prevSeed, seed)) {
    // Oddiy hydration: faqat foydalanuvchi hali tegmagan bo'lsa yangilaymiz.
    setPrevSeed(seed);
    if (!touched) setValue(seed);
  }

  const set = useCallback((next: React.SetStateAction<T>) => {
    setTouched(true);
    setValue(next);
  }, []);

  return [value, set] as const;
}
