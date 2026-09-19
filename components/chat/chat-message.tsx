"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, User, ArrowRight, Cpu } from "lucide-react";
import { CalculationCard } from "./calculation-card";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/language-store";

/** Agent bajargan bitta hisoblash qadami. */
export interface AgentStep {
  tool: string;
  result: unknown;
}

export interface MessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Moslik uchun: oxirgi chaqirilgan vosita. */
  toolCalled?: string;
  toolResult?: unknown;
  /** Agent tsiklidagi barcha qadamlar (ko'p bosqichli hisob). */
  steps?: AgentStep[];
  quickActions?: { label: string; href?: string; prompt?: string }[];
  timestamp?: string;
}

/**
 * `**qalin**` va `*kursiv*` matnni React tugunlariga aylantiradi.
 *
 * Ilgari bu yerda dangerouslySetInnerHTML ishlatilar va matn umuman
 * ekranlanmasdi — ya'ni model (yoki foydalanuvchi) qaytargan HTML
 * brauzerda bajarilardi (XSS). React tugunlari bilan bunday xavf yo'q.
 */
function renderInline(text: string): React.ReactNode[] {
  // Avval qalin (**), keyin kursiv (*) — tartib muhim, aks holda ** ham
  // kursiv deb o'qiladi va ekranda yalang'och yulduzchalar qoladi.
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={i} className="text-slate-900 font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <em key={i} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

interface ChatMessageProps {
  message: MessageItem;
  onSelectPrompt?: (prompt: string) => void;
}

export function ChatMessage({ message, onSelectPrompt }: ChatMessageProps) {
  const { t } = useLanguage();
  const isAssistant = message.role === "assistant";
  const toolLabel = (name: string) => t.chatMessage.toolLabels[name] || name;

  // Agent bir nechta qadam bajargan bo'lishi mumkin. Eski javoblar uchun
  // bitta toolCalled/toolResult juftligini qadamga aylantiramiz.
  const steps: AgentStep[] =
    message.steps && message.steps.length > 0
      ? message.steps
      : message.toolCalled && message.toolResult != null
      ? [{ tool: message.toolCalled, result: message.toolResult }]
      : [];

  // Oddiy markdown paragraf va ro'yxat formatlash yordamchisi
  const renderFormattedContent = (content: string) => {
    const lines = content.split("\n");
    return lines.map((line, idx) => {
      if (line.startsWith("### ")) {
        return (
          <h4 key={idx} className="font-bold text-slate-900 text-sm mt-3 mb-1.5 flex items-center gap-1.5">
            {renderInline(line.replace("### ", ""))}
          </h4>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h3 key={idx} className="font-bold text-slate-950 text-base mt-4 mb-2">
            {renderInline(line.replace("## ", ""))}
          </h3>
        );
      }
      if (line.startsWith("> ")) {
        return (
          <blockquote
            key={idx}
            className="border-l-4 border-emerald-500 bg-emerald-50/60 pl-3 py-1.5 my-2 rounded-r-lg text-slate-700 text-xs leading-relaxed"
          >
            {renderInline(line.replace(/^>\s*/, ""))}
          </blockquote>
        );
      }
      if (line.startsWith("- ") || line.startsWith("* ") || line.startsWith("• ")) {
        const clean = line.replace(/^[-*•]\s+/, "");
        return (
          <li key={idx} className="ml-4 list-disc text-xs text-slate-700 my-0.5 leading-relaxed">
            {renderInline(clean)}
          </li>
        );
      }
      if (/^\d+\.\s/.test(line)) {
        return (
          <div key={idx} className="text-xs text-slate-700 my-1 leading-relaxed pl-1">
            {renderInline(line)}
          </div>
        );
      }
      if (!line.trim()) {
        return <div key={idx} className="h-1.5" />;
      }
      return (
        <p key={idx} className="text-xs sm:text-sm text-slate-700 leading-relaxed my-1">
          {renderInline(line)}
        </p>
      );
    });
  };

  return (
    <div
      className={cn(
        "flex w-full gap-3 py-4",
        isAssistant ? "justify-start" : "justify-end"
      )}
    >
      {isAssistant && (
        <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-xl bg-slate-900 text-emerald-400 shadow-sm">
          <Sparkles className="h-4 w-4" />
        </div>
      )}

      <div
        className={cn(
          "flex max-w-2xl flex-col space-y-2",
          isAssistant ? "items-start" : "items-end"
        )}
      >
        {/* Agent qaysi hisoblarni bajargani */}
        {isAssistant && steps.length > 0 && (
          <div className="inline-flex flex-wrap items-center gap-1.5 mb-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 border border-slate-200/60">
              <Cpu className="h-3 w-3 text-emerald-600" />
              <span>
                {steps.length > 1
                  ? t.chatMessage.stepsSummaryMulti.replace("{count}", String(steps.length))
                  : t.chatMessage.stepsSummarySingle}
              </span>
            </span>
            {steps.map((s, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-800 border border-emerald-200/70"
              >
                {steps.length > 1 && <span className="opacity-60">{i + 1}.</span>}
                {toolLabel(s.tool)}
              </span>
            ))}
          </div>
        )}

        <div
          className={cn(
            "rounded-2xl px-4 py-3.5 shadow-xs transition-all",
            isAssistant
              ? "border border-slate-200/80 bg-white text-slate-800"
              : "bg-slate-900 text-white"
          )}
        >
          {isAssistant ? (
            <div className="space-y-1">{renderFormattedContent(message.content)}</div>
          ) : (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          )}

          {/* Embedded Calculation Card if any */}
          {isAssistant &&
            steps.map((s, i) => (
              <CalculationCard key={i} toolCalled={s.tool} result={s.result} />
            ))}
        </div>

        {/* Quick Follow-up Action Buttons */}
        {isAssistant && message.quickActions && message.quickActions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {message.quickActions.map((action, idx) => {
              if (action.href) {
                return (
                  <Link
                    key={idx}
                    href={action.href}
                    className="inline-flex items-center gap-1 rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-emerald-300 hover:text-emerald-700 transition-all shadow-2xs"
                  >
                    <span>{action.label}</span>
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                  </Link>
                );
              }
              return (
                <button
                  key={idx}
                  onClick={() => action.prompt && onSelectPrompt && onSelectPrompt(action.prompt)}
                  className="inline-flex items-center gap-1 rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-emerald-300 hover:text-emerald-700 transition-all shadow-2xs cursor-pointer"
                >
                  <span>{action.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {!isAssistant && (
        <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-xl bg-slate-200 text-slate-700">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
