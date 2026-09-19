"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  BarChart3,
  CreditCard,
  FileText,
  Receipt,
  TrendingUp,
  Sliders,
  Sparkles,
  RefreshCw,
  Home,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBusiness } from "@/lib/store/business-store";
import { useLanguage } from "@/lib/i18n/language-store";
import { LanguageToggle } from "@/components/i18n/language-toggle";

export const NAV_ITEMS = [
  { key: "dashboard" as const, href: "/app", icon: Home },
  { key: "chat" as const, href: "/app/chat", icon: MessageSquare, badge: "AI" },
  { key: "finance" as const, href: "/app/finance", icon: BarChart3 },
  { key: "loan" as const, href: "/app/loan", icon: CreditCard },
  { key: "simulator" as const, href: "/app/simulator", icon: Sliders, badge: "WOW" },
  { key: "businessPlan" as const, href: "/app/business-plan", icon: FileText },
  { key: "tax" as const, href: "/app/tax", icon: Receipt },
  { key: "market" as const, href: "/app/market", icon: TrendingUp },
];

export function Sidebar({ onCloseMobile }: { onCloseMobile?: () => void }) {
  const pathname = usePathname();
  const { business, resetToDemo } = useBusiness();
  const { t } = useLanguage();

  return (
    <aside className="flex h-full w-64 flex-col justify-between border-r border-slate-200/80 bg-white text-slate-800">
      <div className="flex flex-col">
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-100">
          <Link href="/app" className="flex items-center gap-2 group" onClick={onCloseMobile}>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-md shadow-slate-900/10 group-hover:bg-emerald-600 transition-colors">
              <Sparkles className="h-5 w-5 text-emerald-400 group-hover:text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-slate-950 flex items-center gap-1.5 font-mono">
                bussy
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </span>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                {t.sidebar.brandSubtitle}
              </span>
            </div>
          </Link>
        </div>

        {/* Demo Business Indicator Badge */}
        <div className="mx-4 my-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate">{business.name}</div>
              <div className="text-[10px] text-slate-500 truncate">{business.location} • {t.common.demoMode}</div>
            </div>
          </div>
          <button
            onClick={resetToDemo}
            title={t.sidebar.resetDemo}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1 px-3 py-2">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={cn(
                  "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 group",
                  isActive
                    ? "bg-slate-900 text-white font-semibold shadow-xs"
                    : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      "h-4 w-4 transition-colors",
                      isActive ? "text-emerald-400" : "text-slate-400 group-hover:text-slate-700"
                    )}
                  />
                  <span>{t.sidebar.nav[item.key]}</span>
                </div>
                {item.badge && (
                  <span
                    className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider",
                      isActive
                        ? "bg-emerald-500/30 text-emerald-300"
                        : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile & Trust */}
      <div className="p-4 border-t border-slate-100 space-y-3">
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{t.sidebar.guaranteeBadge}</span>
        </div>
        <LanguageToggle className="w-full" />
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
              DT
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-900">{t.sidebar.demoUser}</span>
              <span className="text-[10px] text-slate-400">{t.sidebar.demoEmail}</span>
            </div>
          </div>
          <Link
            href="/"
            className="text-[11px] font-medium text-slate-400 hover:text-emerald-600 transition-colors"
          >
            {t.sidebar.logout}
          </Link>
        </div>
      </div>
    </aside>
  );
}
