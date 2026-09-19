"use client";

import React, { useState, useRef, useEffect } from "react";
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
import { ChatMessage, MessageItem } from "@/components/chat/chat-message";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/language-store";

const QUICK_PROMPT_ICONS = [Zap, CreditCard, BarChart3, FileText, Receipt, TrendingUp, Lightbulb];

/**
 * Serverga yuboriladigan suhbat tarixi chegarasi.
 *
 * Server ham qisqartiradi, lekin ortiqcha trafik yubormaslik uchun
 * mijozda ham kesamiz. Ilgari butun tarix yuborilar va ~15 ta savol-javobdan
 * keyin har bir so'rov 400 xatosi bilan qaytardi.
 */
const MAX_HISTORY_MESSAGES = 20;

export default function ChatPage() {
  const { t, locale } = useLanguage();
  const INITIAL_QUICK_PROMPTS = t.chat.quickPrompts.map((item, idx) => ({
    ...item,
    icon: QUICK_PROMPT_ICONS[idx],
    highlight: idx === 0,
  }));

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState<string>(t.chat.loadingGeneral);
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
          messages: messages
            .concat(userMessage)
            .slice(-MAX_HISTORY_MESSAGES)
            .map((m) => ({
              role: m.role,
              content: m.content,
            })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Server aniq sababni qaytaradi (masalan, tezlik chekloviga yetildi)
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: typeof data?.error === "string" ? data.error : t.chat.genericError,
          },
        ]);
        return;
      }

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
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

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
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-emerald-400 shadow-sm">
            <Sparkles className="h-5 w-5" />
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
            <div className="h-14 w-14 rounded-3xl bg-slate-900 text-emerald-400 flex items-center justify-center mb-4 shadow-lg shadow-slate-900/10">
              <Sparkles className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">{t.chat.emptyTitle}</h2>
            <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">{t.chat.emptyDesc}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
              {INITIAL_QUICK_PROMPTS.map((item, idx) => {
                const Icon = item.icon;
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
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-emerald-400">
                  <Sparkles className="h-4 w-4 animate-spin" />
                </div>
                <div className="flex flex-col space-y-1">
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 shadow-2xs">
                    <Cpu className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
                    <span>{loadingText}</span>
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
