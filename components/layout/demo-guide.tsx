"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
  Minimize2,
  Maximize2,
  Clock,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  Check,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-store";
import { useDemoGuide } from "@/lib/store/demo-store";
import { Button } from "@/components/ui/button";

export function DemoGuide() {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const {
    isOpen,
    isMinimized,
    currentStep,
    visitedSteps,
    showReliabilityModal,
    close,
    toggleMinimize,
    setStep,
    nextStep,
    prevStep,
    setReliabilityModal,
  } = useDemoGuide();

  if (!isOpen) return null;

  const guide = t.demoGuide;
  const currentStepData = guide.steps[currentStep - 1] || guide.steps[0];

  const handleStepAction = () => {
    if (currentStep === 6) {
      setReliabilityModal(true);
      return;
    }

    if (currentStep === 2) {
      if (pathname === "/app/chat") {
        window.dispatchEvent(
          new CustomEvent("bussy:send-chat-prompt", {
            detail: {
              prompt:
                locale === "en"
                  ? "I want to start a fast food business in Urganch with 100M UZS. I can also get a 50M UZS loan. Build me a financial plan."
                  : "Urganchda 100 mln so‘m bilan fast food biznes boshlamoqchiman. Yana 50 mln so‘m kredit olishim mumkin. Menga moliyaviy reja tuzib ber.",
            },
          })
        );
      } else {
        router.push("/app/chat?demo=scenario");
      }
      return;
    }

    if (currentStep === 3) {
      if (pathname === "/app/chat") {
        window.dispatchEvent(
          new CustomEvent("bussy:send-chat-prompt", {
            detail: {
              prompt:
                locale === "en"
                  ? "How many units do I need to sell per day to cover the loan?"
                  : "Kreditni qoplash uchun kuniga nechta sotishim kerak?",
            },
          })
        );
      } else {
        router.push("/app/chat?demo=chain");
      }
      return;
    }

    router.push(currentStepData.href);
  };

  // Minimized floating pill mode
  if (isMinimized) {
    return (
      <aside aria-label="Demo Controller" className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-emerald-300 bg-white/95 px-3.5 py-2 shadow-xl backdrop-blur-md animate-fade-in print:hidden">
        <button
          onClick={() => toggleMinimize()}
          className="flex items-center gap-2 text-xs font-semibold text-slate-800 hover:text-emerald-700 transition-colors"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
          </span>
          <span>{guide.triggerButtonShort}</span>
          <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-mono font-bold text-emerald-700 border border-emerald-200/80">
            {currentStep}/6
          </span>
        </button>

        <div className="h-3 w-px bg-slate-200 mx-0.5" />

        <button
          onClick={() => toggleMinimize()}
          className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100"
          title={guide.expand}
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => close()}
          className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100"
          title={guide.close}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </aside>
    );
  }

  // Expanded presentation dock
  return (
    <>
      <aside aria-label="Demo Controller Dock" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[96%] max-w-4xl rounded-2xl border border-slate-200/90 bg-white/95 p-4 sm:p-5 shadow-2xl backdrop-blur-lg animate-fade-in print:hidden">
        {/* Dock Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 leading-none">
                {guide.title}
              </h2>
              <p className="text-[11px] text-slate-500 hidden sm:block mt-0.5">
                {guide.subtitle}
              </p>
            </div>
          </div>

          {/* Quick Step Indicators */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {guide.steps.map((s) => {
              const isActive = s.num === currentStep;
              const isVisited = visitedSteps.includes(s.num);
              return (
                <button
                  key={s.num}
                  onClick={() => setStep(s.num)}
                  title={`${s.num}. ${s.title}`}
                  className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400/40"
                      : isVisited
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {isVisited && !isActive ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    s.num
                  )}
                </button>
              );
            })}
          </div>

          {/* Dock Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => toggleMinimize()}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              title={guide.minimize}
            >
              <Minimize2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => close()}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              title={guide.close}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Current Step Content */}
        <div className="pt-3.5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[11px] font-bold text-white uppercase tracking-wider">
                  {guide.stepOf
                    .replace("{current}", String(currentStep))
                    .replace("{total}", "6")}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200/70">
                  <Clock className="h-3 w-3" />
                  <span>{currentStepData.targetTime}</span>
                </span>
                <span className="text-xs text-slate-400 font-mono hidden md:inline">
                  {currentStepData.route}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-950 mt-1">
                {currentStepData.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600">
                {currentStepData.desc}
              </p>
            </div>

            {/* Action Trigger Button */}
            <div className="shrink-0 pt-1 sm:pt-0">
              <Button
                variant="emerald"
                size="sm"
                onClick={handleStepAction}
                className="w-full sm:w-auto shadow-xs font-semibold"
              >
                <span>{currentStepData.actionLabel}</span>
                <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>

          {/* Judges Highlight Box */}
          <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200/70 bg-emerald-50/50 p-2.5 sm:p-3 text-xs text-emerald-950">
            <Sparkles className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-emerald-900 block text-[11px] uppercase tracking-wider">
                {guide.wowMomentBadge}
              </span>
              <p className="text-emerald-900 leading-relaxed">
                {currentStepData.highlight}
              </p>
            </div>
          </div>

          {/* Step Navigation Controls */}
          <div className="flex items-center justify-between pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              <span>{guide.previousStep}</span>
            </Button>

            <div className="text-[11px] font-medium text-slate-500">
              {currentStep < 6
                ? `${t.common.loading.replace("…", "")}: ${guide.steps[currentStep].title}`
                : "🎉 Demo yakunlandi!"}
            </div>

            <Button
              variant={currentStep === 6 ? "outline" : "primary"}
              size="sm"
              onClick={nextStep}
              disabled={currentStep === 6}
              className="text-xs"
            >
              <span>{guide.nextStep}</span>
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Step 6 Reliability Modal */}
      {showReliabilityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in print:hidden">
          <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-950">
                    {guide.reliabilityModal.title}
                  </h3>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {guide.reliabilityModal.badge}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setReliabilityModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-slate-700">
              <div className="rounded-xl border border-slate-200/70 bg-slate-50/50 p-3">
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                  {guide.reliabilityModal.point1Title}
                </h4>
                <p className="text-slate-600 text-xs mt-1">
                  {guide.reliabilityModal.point1Desc}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200/70 bg-slate-50/50 p-3">
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                  {guide.reliabilityModal.point2Title}
                </h4>
                <p className="text-slate-600 text-xs mt-1">
                  {guide.reliabilityModal.point2Desc}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200/70 bg-slate-50/50 p-3">
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                  {guide.reliabilityModal.point3Title}
                </h4>
                <p className="text-slate-600 text-xs mt-1">
                  {guide.reliabilityModal.point3Desc}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setReliabilityModal(false)}
              >
                {guide.reliabilityModal.close}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
