"use client";

import { useSyncExternalStore } from "react";

export interface DemoGuideState {
  isOpen: boolean;
  isMinimized: boolean;
  currentStep: number;
  visitedSteps: number[];
  showReliabilityModal: boolean;
}

const STORAGE_KEY = "bussy_demo_guide_state";

let state: DemoGuideState = {
  isOpen: false,
  isMinimized: false,
  currentStep: 1,
  visitedSteps: [1],
  showReliabilityModal: false,
};

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function save() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        isOpen: state.isOpen,
        isMinimized: state.isMinimized,
        currentStep: state.currentStep,
        visitedSteps: state.visitedSteps,
      })
    );
  } catch {
    // ignore
  }
}

let loaded = false;
function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = {
        ...state,
        ...parsed,
        showReliabilityModal: false,
      };
    }
  } catch {
    // ignore
  }
}

export const demoStore = {
  getSnapshot(): DemoGuideState {
    load();
    return state;
  },
  subscribe(listener: () => void) {
    load();
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  open(step?: number) {
    const nextStep = step && step >= 1 && step <= 6 ? step : state.currentStep;
    const visited = Array.from(new Set([...state.visitedSteps, nextStep]));
    state = {
      ...state,
      isOpen: true,
      isMinimized: false,
      currentStep: nextStep,
      visitedSteps: visited,
    };
    save();
    emit();
  },
  close() {
    state = { ...state, isOpen: false, showReliabilityModal: false };
    save();
    emit();
  },
  toggleMinimize() {
    state = { ...state, isMinimized: !state.isMinimized };
    save();
    emit();
  },
  setStep(step: number) {
    if (step < 1 || step > 6) return;
    const visited = Array.from(new Set([...state.visitedSteps, step]));
    state = {
      ...state,
      isOpen: true,
      currentStep: step,
      visitedSteps: visited,
      showReliabilityModal: false,
    };
    save();
    emit();
  },
  nextStep() {
    if (state.currentStep < 6) {
      demoStore.setStep(state.currentStep + 1);
    }
  },
  prevStep() {
    if (state.currentStep > 1) {
      demoStore.setStep(state.currentStep - 1);
    }
  },
  setReliabilityModal(show: boolean) {
    state = { ...state, showReliabilityModal: show };
    emit();
  },
};

export function useDemoGuide() {
  const snapshot = useSyncExternalStore(
    demoStore.subscribe,
    demoStore.getSnapshot,
    () => ({
      isOpen: false,
      isMinimized: false,
      currentStep: 1,
      visitedSteps: [1],
      showReliabilityModal: false,
    })
  );

  return {
    ...snapshot,
    open: demoStore.open,
    close: demoStore.close,
    toggleMinimize: demoStore.toggleMinimize,
    setStep: demoStore.setStep,
    nextStep: demoStore.nextStep,
    prevStep: demoStore.prevStep,
    setReliabilityModal: demoStore.setReliabilityModal,
  };
}
