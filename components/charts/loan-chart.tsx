"use client";

import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { LoanScheduleItem } from "@/lib/engine/types";
import { formatCompactMoney, formatMoney, toNumber } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/language-store";

interface LoanChartProps {
  schedule: LoanScheduleItem[];
}

export function LoanChart({ schedule }: LoanChartProps) {
  const { t, locale } = useLanguage();
  if (!schedule || schedule.length === 0) return null;

  // Har 2-3 oyda bir nuqtani olib grafikni ixcham ko'rsatish
  const step = schedule.length > 24 ? 3 : 1;
  const data = schedule
    .filter((_, idx) => idx % step === 0 || idx === schedule.length - 1)
    .map((item) => ({
      name: locale === "en" ? `M${item.month}` : `${item.month}-oy`,
      principal: item.principal,
      interest: item.interest,
      remainingBalance: item.remainingBalance,
    }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="colorPrincipal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorInterest" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0F172A" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#0F172A" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
          <YAxis
            stroke="#94A3B8"
            fontSize={11}
            tickLine={false}
            tickFormatter={(val) => formatCompactMoney(val)}
          />
          <Tooltip
            formatter={(value) => [formatMoney(toNumber(value)), ""]}
            contentStyle={{
              backgroundColor: "#FFFFFF",
              borderRadius: "12px",
              border: "1px solid #E2E8F0",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              fontSize: "12px",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
          <Area
            type="monotone"
            dataKey="principal"
            name={t.charts.principal}
            stackId="1"
            stroke="#10B981"
            fill="url(#colorPrincipal)"
          />
          <Area
            type="monotone"
            dataKey="interest"
            name={t.charts.interestPayment}
            stackId="1"
            stroke="#F59E0B"
            fill="url(#colorInterest)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
