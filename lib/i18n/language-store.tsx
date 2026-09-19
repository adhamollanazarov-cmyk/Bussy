"use client";

import React, { createContext, useCallback, useContext, useSyncExternalStore } from "react";
import { DEFAULT_LOCALE, Locale, translations } from "./translations";

const STORAGE_KEY_LOCALE = "bussy_locale";

/* ============================================================
   TASHQI STORE
   ------------------------------------------------------------
   `lib/store/business-store.tsx` bilan bir xil naqsh: server snapshot
   sifatida standart til (uz), klientda esa localStorage'dagi tanlov.
   ============================================================ */

let localeState: Locale = DEFAULT_LOCALE;
let loadedFromStorage = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function isLocale(value: unknown): value is Locale {
  return value === "uz" || value === "en";
}

function loadFromStorage() {
  if (loadedFromStorage || typeof window === "undefined") return;
  loadedFromStorage = true;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY_LOCALE);
    if (isLocale(stored)) localeState = stored;
  } catch (e) {
    console.warn("Bussy: tilni o'qib bo'lmadi", e);
  }
}

let storageListenerAttached = false;

function attachStorageListener() {
  if (storageListenerAttached || typeof window === "undefined") return;
  storageListenerAttached = true;

  window.addEventListener("storage", (event: StorageEvent) => {
    if (event.key === STORAGE_KEY_LOCALE) {
      loadedFromStorage = false;
      loadFromStorage();
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

function getSnapshot(): Locale {
  return localeState;
}

function getServerSnapshot(): Locale {
  return DEFAULT_LOCALE;
}

function persist(locale: Locale) {
  try {
    window.localStorage.setItem(STORAGE_KEY_LOCALE, locale);
  } catch (e) {
    console.warn("Bussy: tilni saqlab bo'lmadi", e);
  }
}

/* ============================================================
   CONTEXT
   ============================================================ */

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** Joriy tilga mos tarjimalar daraxti — masalan `t.sidebar.nav.dashboard`. */
  t: (typeof translations)[Locale];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setLocale = useCallback((next: Locale) => {
    localeState = next;
    persist(next);
    emit();
  }, []);

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t: translations[locale] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

/** Reaktiv bo'lmagan joylarda (masalan API chaqiruvida) joriy tilni olish. */
export function getCurrentLocale(): Locale {
  loadFromStorage();
  return localeState;
}
