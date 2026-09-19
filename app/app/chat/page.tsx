"use client";

import React, { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  Send,
  Sparkles,
  Zap,
  FileText,
  CreditCard,
  BarChart3,
  Receipt,
  TrendingUp,
  Lightbulb,
  ArrowRight,
  Cpu,
} from "lucide-react";
import { ChatMessage, MessageItem, AgentStep } from "@/components/chat/chat-message";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/language-store";

const QUICK_PROMPT_ICONS = [
  Zap,
  Sparkles,
  CreditCard,
  BarChart3,
  FileText,
  Receipt,
  TrendingUp,
  Lightbulb,
];

/**
 * Serverga yuboriladigan suhbat tarixi chegarasi.
 *
 * Server ham qisqartiradi, lekin ortiqcha trafik yubormaslik uchun
 * mijozda ham kesamiz. Ilgari butun tarix yuborilar va ~15 ta savol-javobdan
 * keyin har bir so'rov 400 xatosi bilan qaytardi.
 */
const MAX_HISTORY_MESSAGES = 20;

function ChatContent() {
  const { t, locale } = useLanguage();
  const INITIAL_QUICK_PROMPTS = t.chat.quickPrompts.map((item, idx) => ({
    ...item,
    icon: QUICK_PROMPT_ICONS[idx] || Sparkles,
    highlight: idx === 0,
  }));

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState<string>(t.chat.loadingGeneral);
  const [activeSteps, setActiveSteps] = useState<AgentStep[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || loading) return;

    const userMessage: MessageItem = {
      id: Date.now().toString(),
      role: "user",
      content: query,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setLoading(true);
    setActiveSteps([]);

    // UX dinamik loading matnlari
    const lower = query.toLowerCase();
    if (
      lower.includes("kredit") ||
      lower.includes("hisob") ||
      lower.includes("loan") ||
      lower.includes("calculat")
    ) {
      setLoadingText(t.chat.loadingCalc);
    } else {
      setLoadingText(t.chat.loadingGeneral);
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: query,
          locale,
          stream: true,
          messages: messages
            .concat(userMessage)
            .slice(-MAX_HISTORY_MESSAGES)
            .map((m) => ({
              role: m.role,
              content: m.content,
            })),
        }),
      });

      if (!res.ok) {
        let errText = t.chat.genericError;
        try {
          const errData = await res.json();
          if (typeof errData?.error === "string") errText = errData.error;
        } catch {
          // ignore
        }
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: errText,
          },
        ]);
        return;
      }

      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("text/event-stream") && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";

          for (const block of parts) {
            const trimmed = block.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payloadStr = trimmed.replace(/^data:\s*/, "");
            try {
              const evt = JSON.parse(payloadStr);
              if (evt.type === "status") {
                setLoadingText(evt.message);
              } else if (evt.type === "step" && evt.step) {
                setActiveSteps((prev) => [...prev, evt.step]);
                const toolName = t.chatMessage.toolLabels[evt.step.tool] || evt.step.tool;
                setLoadingText(
                  `${toolName} ${locale === "en" ? "completed, continuing..." : "hisoblandi, davom etmoqda..."}`
                );
              } else if (evt.type === "done" && evt.message) {
                const msg = evt.message;
                const assistantMessage: MessageItem = {
                  id: (Date.now() + 1).toString(),
                  role: "assistant",
                  content: msg.content || t.chat.noResponse,
                  toolCalled: msg.toolCalled,
                  toolResult: msg.toolResult,
                  steps: msg.steps,
                  quickActions: msg.quickActions,
                };
                setMessages((prev) => [...prev, assistantMessage]);
                setActiveSteps([]);
              } else if (evt.type === "error") {
                setMessages((prev) => [
                  ...prev,
                  {
                    id: (Date.now() + 1).toString(),
                    role: "assistant",
                    content: evt.error || t.chat.genericError,
                  },
                ]);
                setActiveSteps([]);
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      } else {
        const data = await res.json();
        const assistantMessage: MessageItem = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.content || t.chat.noResponse,
          toolCalled: data.toolCalled,
          toolResult: data.toolResult,
          steps: data.steps,
          quickActions: data.quickActions,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: t.chat.fallbackNotice,
        },
      ]);
    } finally {
      setLoading(false);
      setActiveSteps([]);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const sendRef = useRef(handleSendMessage);
  useEffect(() => {
    sendRef.current = handleSendMessage;
  });

  // Demo yo'riqnomasidan yuborilgan custom hodisalarni tinglash
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ prompt?: string }>;
      if (customEvent.detail?.prompt) {
        sendRef.current(customEvent.detail.prompt);
      }
    };
    window.addEventListener("bussy:send-chat-prompt", handler);
    return () => window.removeEventListener("bussy:send-chat-prompt", handler);
  }, []);

  // URL dagi ?demo=scenario yoki ?demo=chain parametrlarini avtomatik ishga tushirish
  const searchParams = useSearchParams();
  const triggeredRef = useRef<string | null>(null);

  useEffect(() => {
    const demo = searchParams.get("demo");
    const promptParam = searchParams.get("prompt");
    const key = `${demo || ""}:${promptParam || ""}:${locale}`;
    if (triggeredRef.current === key) return;

    if (demo === "scenario") {
      triggeredRef.current = key;
      sendRef.current(
        locale === "en"
          ? "I want to start a fast food business in Urganch with 100M UZS. I can also get a 50M UZS loan. Build me a financial plan."
          : "Urganchda 100 mln so‘m bilan fast food biznes boshlamoqchiman. Yana 50 mln so‘m kredit olishim mumkin. Menga moliyaviy reja tuzib ber."
      );
    } else if (demo === "chain") {
      triggeredRef.current = key;
      sendRef.current(
        locale === "en"
          ? "How many units do I need to sell per day to cover the loan?"
          : "Kreditni qoplash uchun kuniga nechta sotishim kerak?"
      );
    } else if (promptParam) {
      triggeredRef.current = key;
      sendRef.current(promptParam);
    }
  }, [searchParams, locale]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-[calc(100vh-6.5rem)] flex-col rounded-3xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl overflow-hidden bg-white border border-slate-200/80 shadow-xs">
            <Image
              src="/logo.png"
              alt="Bussy AI"
              width={40}
              height={40}
              className="h-full w-full object-contain p-1"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900">Bussy AI</h1>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                {t.chat.badge}
              </span>
            </div>
            <p className="text-xs text-slate-500">{t.chat.subtitle}</p>
          </div>
        </div>

        {/* Demo Fast trigger button */}
        <Button
          variant="emerald"
          size="sm"
          onClick={() => handleSendMessage(t.chat.quickPrompts[0].prompt)}
          className="hidden sm:inline-flex text-xs"
        >
          <Zap className="h-3.5 w-3.5" />
          <span>{t.chat.demoScenarioCta}</span>
        </Button>
      </div>

      {/* Messages / Empty State Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center max-w-xl mx-auto py-6">
            <div className="relative h-16 w-16 rounded-3xl overflow-hidden bg-white border border-slate-200/80 flex items-center justify-center mb-4 shadow-lg shadow-slate-900/5">
              <Image
                src="/logo.png"
                alt="Bussy AI"
                width={64}
                height={64}
                className="h-full w-full object-contain p-2"
              />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">{t.chat.emptyTitle}</h2>
            <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">{t.chat.emptyDesc}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
              {INITIAL_QUICK_PROMPTS.map((item, idx) => {
                const Icon = item.icon || Sparkles;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(item.prompt)}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all duration-150 cursor-pointer ${
                      item.highlight
                        ? "border-emerald-300 bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-950 font-medium col-span-1 sm:col-span-2 shadow-2xs"
                        : "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-800 text-xs"
                    }`}
                  >
                    <div
                      className={`h-7 w-7 rounded-xl flex items-center justify-center shrink-0 ${
                        item.highlight
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs leading-snug flex-1">{item.label}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onSelectPrompt={(p) => handleSendMessage(p)}
              />
            ))}

            {loading && (
              <div className="flex w-full gap-3 py-4 justify-start animate-fade-in">
                <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl overflow-hidden bg-white border border-slate-200 shadow-2xs">
                  <Image
                    src="/logo.png"
                    alt="Bussy AI"
                    width={32}
                    height={32}
                    className="h-full w-full object-contain p-0.5 animate-pulse"
                  />
                </div>
                <div className="flex max-w-2xl flex-col space-y-2">
                  <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 shadow-xs space-y-3">
                    {/* Header with live status and pulse */}
                    <div className="flex items-center justify-between gap-2 border-b border-emerald-100/70 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          {activeSteps.length > 0
                            ? t.chat.stepChainRunning.replace("{count}", String(activeSteps.length))
                            : t.chat.agentThinking}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-semibold text-emerald-800 border border-emerald-200/80 shadow-2xs">
                        <Cpu className="h-3 w-3 text-emerald-600 animate-spin" />
                        <span>AI Pipeline</span>
                      </span>
                    </div>

                    {/* Step pills as they land */}
                    {activeSteps.length > 0 && (
                      <div className="space-y-1.5">
                        {activeSteps.map((step, idx) => {
                          const label = t.chatMessage.toolLabels[step.tool] || step.tool;
                          return (
                            <div
                              key={idx}
                              className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs text-slate-700 border border-slate-200/70 shadow-2xs animate-fade-in"
                            >
                              <div className="flex items-center gap-2">
                                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                                  ✓
                                </span>
                                <span className="font-semibold text-slate-900">{label}</span>
                              </div>
                              <span className="text-[10px] font-mono text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                {t.chat.stepDone}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Current step running */}
                    <div className="flex items-center gap-2 text-xs text-emerald-900 pt-0.5">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-600 animate-spin shrink-0" />
                      <span className="italic font-medium">{loadingText}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-100 bg-white p-3 sm:p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative flex items-center"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder={t.chat.inputPlaceholder}
            className="w-full rounded-2xl border border-slate-200/90 bg-slate-50/70 py-3.5 pl-4 pr-14 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
          />
          <div className="absolute right-2">
            <Button
              type="submit"
              size="sm"
              variant="primary"
              disabled={!inputValue.trim() || loading}
              className="h-9 w-9 rounded-xl p-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 px-1">
          <span>{t.chat.footerHint}</span>
          <span className="hidden sm:inline">{t.chat.footerEnterHint}</span>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100vh-6.5rem)] items-center justify-center rounded-3xl border border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-600">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            <span>Yuklanmoqda...</span>
          </div>
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
